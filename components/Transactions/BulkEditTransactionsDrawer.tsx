"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
	AlertCircle,
	ChevronDown,
	Info,
	Loader2,
	Trash2,
	X,
} from "lucide-react";

import { CategorySelector } from "@/components/CategorySelector";
import { CATEGORY_HIERARCHY } from "@/constants";
import { type Transaction, useBudgetStore } from "@/store/useBudgetStore";
import {
	MerchantSelect,
	type MerchantSelection,
} from "@/components/Merchants/MerchantSelect";

type RecurringChoice = "" | "mark";
type NotesChoice = "" | "replace" | "clear";
type TagsChoice = "" | "add" | "replace" | "clear";
type HiddenChoice = "" | "hide" | "show";
type ReviewChoice = "" | "reviewed" | "needs-review";

interface BulkEditTransactionsDrawerProps {
	transactions: Transaction[];
	isOpen: boolean;
	onClose: () => void;
	onSaved?: (count: number) => void;
	onDeleted?: (count: number) => void;
}

interface SelectOption {
	value: string;
	label: string;
}

function normalize(value?: string | null): string {
	return value?.trim().toLowerCase().replace(/\s+/g, " ") ?? "";
}

function getTransactionLabel(count: number): string {
	return count === 1 ? "transaction" : "transactions";
}

function getAccountInitial(name: string): string {
	return name.trim().charAt(0).toUpperCase() || "?";
}

function getUniqueAccountSummaries(transactions: Transaction[]) {
	const accountByKey = new Map<
		string,
		{
			id: string | null;
			name: string;
		}
	>();

	for (const transaction of transactions) {
		const name = transaction.account?.trim() || "Unknown account";
		const key = transaction.account_id || normalize(name);

		if (!accountByKey.has(key)) {
			accountByKey.set(key, {
				id: transaction.account_id ?? null,
				name,
			});
		}
	}

	return Array.from(accountByKey.values());
}

function parseTags(value: string): string[] {
	const seen = new Set<string>();
	const result: string[] = [];

	for (const rawTag of value.split(",")) {
		const tag = rawTag.trim();
		const normalizedTag = normalize(tag);

		if (!tag || seen.has(normalizedTag)) {
			continue;
		}

		seen.add(normalizedTag);
		result.push(tag);
	}

	return result;
}

export default function BulkEditTransactionsDrawer({
	transactions,
	isOpen,
	onClose,
	onSaved,
	onDeleted,
}: BulkEditTransactionsDrawerProps) {
	const customTags = useBudgetStore((state) => state.customTags);
	const updateTransaction = useBudgetStore((state) => state.updateTransaction);
	const bulkDeleteTransactions = useBudgetStore(
		(state) => state.bulkDeleteTransactions,
	);
	const confirmRecurring = useBudgetStore((state) => state.confirmRecurring);

	const [merchantSelection, setMerchantSelection] =
		useState<MerchantSelection | null>(null);
	const [category, setCategory] = useState("");
	const [date, setDate] = useState("");
	const [recurringChoice, setRecurringChoice] = useState<RecurringChoice>("");
	const [notesChoice, setNotesChoice] = useState<NotesChoice>("");
	const [noteValue, setNoteValue] = useState("");
	const [tagsChoice, setTagsChoice] = useState<TagsChoice>("");
	const [tagValue, setTagValue] = useState("");
	const [hiddenChoice, setHiddenChoice] = useState<HiddenChoice>("");
	const [reviewChoice, setReviewChoice] = useState<ReviewChoice>("");
	const [isSaving, setIsSaving] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	const transactionCount = transactions.length;
	const transactionLabel = getTransactionLabel(transactionCount);
	const accountSummaries = getUniqueAccountSummaries(transactions);
	const commonMerchantName = (() => {
		const firstMerchant = transactions[0]?.merchant?.trim() ?? "";

		if (!firstMerchant) {
			return null;
		}

		const normalizedFirstMerchant = normalize(firstMerchant);
		const allMatch = transactions.every((transaction) => {
			return normalize(transaction.merchant) === normalizedFirstMerchant;
		});

		return allMatch ? firstMerchant : null;
	})();
	const recurringMerchantName = merchantSelection?.name ?? commonMerchantName;

	const hasChanges = Boolean(
		merchantSelection ||
		category ||
		date ||
		recurringChoice !== "" ||
		notesChoice !== "" ||
		tagsChoice !== "" ||
		hiddenChoice !== "" ||
		reviewChoice !== "",
	);

	useEffect(() => {
		if (!isOpen) {
			return;
		}

		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";

		return () => {
			document.body.style.overflow = previousOverflow;
		};
	}, [isOpen]);

	useEffect(() => {
		if (!isOpen) {
			return;
		}

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key !== "Escape" || event.defaultPrevented) {
				return;
			}

			if (showDeleteConfirm) {
				setShowDeleteConfirm(false);
				return;
			}

			if (!isSaving && !isDeleting) {
				onClose();
			}
		};

		window.addEventListener("keydown", handleKeyDown);

		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [isDeleting, isOpen, isSaving, onClose, showDeleteConfirm]);

	const handleSave = async () => {
		if (!hasChanges || isSaving || isDeleting || transactionCount === 0) {
			return;
		}

		setIsSaving(true);
		setErrorMessage(null);

		try {
			const parsedTags = parseTags(tagValue);

			await Promise.all(
				transactions.map(async (transaction) => {
					const updates: Partial<Transaction> = {};

					if (merchantSelection) {
						updates.merchant = merchantSelection.name;
						updates.merchant_id = merchantSelection.id;
					}

					if (category) {
						updates.category = category;
						updates.needs_subcat =
							category === "Uncategorized" ||
							Object.prototype.hasOwnProperty.call(
								CATEGORY_HIERARCHY,
								category,
							);
					}

					if (date) {
						updates.date = date;
					}

					if (notesChoice === "replace") {
						updates.note = noteValue.trim();
					} else if (notesChoice === "clear") {
						updates.note = "";
					}

					if (tagsChoice === "replace") {
						updates.tags = parsedTags;
					} else if (tagsChoice === "clear") {
						updates.tags = [];
					} else if (tagsChoice === "add") {
						const mergedTags = parseTags(
							[...(transaction.tags ?? []), ...parsedTags].join(","),
						);
						updates.tags = mergedTags;
					}

					if (hiddenChoice === "hide") {
						updates.is_hidden = true;
					} else if (hiddenChoice === "show") {
						updates.is_hidden = false;
					}

					if (reviewChoice === "reviewed") {
						updates.needs_review = false;
					} else if (reviewChoice === "needs-review") {
						updates.needs_review = true;
					}

					if (Object.keys(updates).length > 0) {
						await updateTransaction(transaction.id, updates);
					}
				}),
			);

			if (recurringChoice === "mark" && recurringMerchantName) {
				confirmRecurring(recurringMerchantName);
			}

			onSaved?.(transactionCount);
			onClose();
		} catch (error) {
			setErrorMessage(
				error instanceof Error
					? error.message
					: "Failed to update the selected transactions.",
			);
		} finally {
			setIsSaving(false);
		}
	};

	const handleDelete = async () => {
		if (isDeleting || isSaving || transactionCount === 0) {
			return;
		}

		setIsDeleting(true);
		setErrorMessage(null);

		try {
			const ids = transactions.map((transaction) => transaction.id);
			await bulkDeleteTransactions(ids);
			setShowDeleteConfirm(false);
			onDeleted?.(transactionCount);
			onClose();
		} catch (error) {
			setErrorMessage(
				error instanceof Error
					? error.message
					: "Failed to delete the selected transactions.",
			);
		} finally {
			setIsDeleting(false);
		}
	};

	if (!isOpen || transactionCount === 0 || typeof document === "undefined") {
		return null;
	}

	return createPortal(
		<div className="fixed inset-0 z-[150]" role="presentation">
			<button
				type="button"
				aria-label="Close bulk transaction editor"
				className="absolute inset-0 bg-black/65 backdrop-blur-[1px]"
				onClick={() => {
					if (!isSaving && !isDeleting) {
						onClose();
					}
				}}
			/>

			<section
				role="dialog"
				aria-modal="true"
				aria-labelledby="bulk-edit-transactions-title"
				className="absolute inset-y-0 right-0 flex h-dvh w-full max-w-[680px] animate-in flex-col overflow-hidden border-l border-white/10 bg-[#20201f] text-white shadow-[-28px_0_80px_rgba(0,0,0,0.4)] slide-in-from-right duration-300"
			>
				<header className="flex min-h-22 shrink-0 items-center justify-between border-b border-white/8 px-7">
					<h2
						id="bulk-edit-transactions-title"
						className="text-[26px] font-semibold tracking-tight"
					>
						Edit {transactionCount} {transactionLabel}
					</h2>

					<button
						type="button"
						onClick={onClose}
						disabled={isSaving || isDeleting}
						className="grid size-11 place-items-center rounded-full text-white transition hover:bg-white/8 disabled:opacity-50"
						aria-label="Close"
					>
						<X size={25} />
					</button>
				</header>

				<div className="min-h-0 flex-1 overflow-y-auto">
					<div className="border-b border-white/8 bg-[#191918] px-7 py-5">
						<div className="flex items-center gap-4">
							<div className="flex shrink-0 -space-x-3">
								{accountSummaries.slice(0, 4).map((account, index) => (
									<div
										key={account.id ?? account.name}
										className="grid size-11 place-items-center rounded-full border-2 border-[#191918] bg-[#1379bc] text-sm font-black text-white shadow-sm"
										style={{ zIndex: accountSummaries.length - index }}
									>
										{getAccountInitial(account.name)}
									</div>
								))}
							</div>

							<div className="min-w-0">
								<p className="text-lg font-semibold">
									{accountSummaries.length} account
									{accountSummaries.length === 1 ? "" : "s"} selected
								</p>
								<p className="mt-1 truncate text-sm text-[#aaa9a4]">
									{accountSummaries.map((account) => account.name).join(", ")}
								</p>
							</div>
						</div>
					</div>

					<div className="space-y-5 px-7 py-6">
						<div>
							<div className="mb-2 flex items-center justify-between gap-3">
								<label className="text-[15px] font-semibold">Merchant</label>

								{merchantSelection && (
									<button
										type="button"
										onClick={() => setMerchantSelection(null)}
										className="text-sm font-semibold text-cyan-400 hover:text-cyan-300"
									>
										Clear
									</button>
								)}
							</div>

							<MerchantSelect
								value={merchantSelection}
								onChange={setMerchantSelection}
								placeholder="No change"
								inputClassName="border-white/10 bg-[#20201f] text-white dark:bg-[#20201f]"
							/>
						</div>

						<div>
							<div className="mb-2 flex items-center justify-between gap-3">
								<label className="text-[15px] font-semibold">Category</label>

								{category && (
									<button
										type="button"
										onClick={() => setCategory("")}
										className="text-sm font-semibold text-cyan-400 hover:text-cyan-300"
									>
										Clear
									</button>
								)}
							</div>

							<div className="rounded-xl border border-white/10 bg-[#20201f] px-1">
								<CategorySelector
									currentCategory={category || "No change"}
									variant="form"
									showChevron
									onSelect={(selectedCategory) => {
										setCategory(
											selectedCategory === "All" ? "" : selectedCategory,
										);
									}}
								/>
							</div>
						</div>

						<BulkSelectField
							label="Link to save up goal"
							value=""
							onChange={() => undefined}
							options={[]}
							disabled
							title="Goal links are not available in the current transaction model."
						/>

						<BulkSelectField
							label="Link to pay down goal"
							labelInfo="Goal links are not available in the current transaction model."
							value=""
							onChange={() => undefined}
							options={[]}
							disabled
							title="Goal links are not available in the current transaction model."
						/>

						<div>
							<label className="mb-2 block text-[15px] font-semibold">
								Date
							</label>
							<div className="relative">
								<input
									type="date"
									value={date}
									onChange={(event) => setDate(event.target.value)}
									className={`h-12 w-full rounded-xl border border-white/10 bg-[#20201f] px-4 pr-11 text-base outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 [color-scheme:dark] ${
										date ? "text-white" : "text-transparent"
									}`}
								/>
								{!date && (
									<span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-base text-[#c4c3bf]">
										No change
									</span>
								)}
							</div>
						</div>

						<BulkSelectField
							label="Recurring"
							value={recurringChoice}
							onChange={(value) => {
								setRecurringChoice(value as RecurringChoice);
							}}
							options={[
								{
									value: "mark",
									label: recurringMerchantName
										? `Mark ${recurringMerchantName} as recurring`
										: "Select one merchant first",
								},
							]}
							disableOptionValue={!recurringMerchantName ? "mark" : undefined}
						/>

						<BulkSelectField
							label="Notes"
							value={notesChoice}
							onChange={(value) => {
								setNotesChoice(value as NotesChoice);
							}}
							options={[
								{ value: "replace", label: "Replace notes" },
								{ value: "clear", label: "Clear notes" },
							]}
						/>

						{notesChoice === "replace" && (
							<textarea
								value={noteValue}
								onChange={(event) => setNoteValue(event.target.value)}
								placeholder="Notes applied to every selected transaction"
								className="-mt-2 min-h-24 w-full resize-y rounded-xl border border-white/10 bg-[#20201f] px-4 py-3 text-sm outline-none transition placeholder:text-[#777671] focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10"
							/>
						)}

						<BulkSelectField
							label="Tags"
							value={tagsChoice}
							onChange={(value) => {
								setTagsChoice(value as TagsChoice);
							}}
							options={[
								{ value: "add", label: "Add tags" },
								{ value: "replace", label: "Replace tags" },
								{ value: "clear", label: "Clear tags" },
							]}
						/>

						{(tagsChoice === "add" || tagsChoice === "replace") && (
							<>
								<input
									list="bulk-transaction-tags"
									value={tagValue}
									onChange={(event) => setTagValue(event.target.value)}
									placeholder="Comma-separated tags"
									className="-mt-2 h-12 w-full rounded-xl border border-white/10 bg-[#20201f] px-4 text-sm outline-none transition placeholder:text-[#777671] focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10"
								/>
								<datalist id="bulk-transaction-tags">
									{customTags.map((tag) => (
										<option key={tag} value={tag} />
									))}
								</datalist>
							</>
						)}

						<BulkSelectField
							label="Hide transactions"
							labelInfo="Hidden transactions stay stored but are excluded from normal views."
							value={hiddenChoice}
							onChange={(value) => {
								setHiddenChoice(value as HiddenChoice);
							}}
							options={[
								{ value: "hide", label: "Hide transactions" },
								{ value: "show", label: "Show transactions" },
							]}
						/>

						<BulkSelectField
							label="Review status"
							value={reviewChoice}
							onChange={(value) => {
								setReviewChoice(value as ReviewChoice);
							}}
							options={[
								{ value: "reviewed", label: "Mark as reviewed" },
								{ value: "needs-review", label: "Mark as needs review" },
							]}
						/>

						{errorMessage && (
							<div className="flex items-start gap-2 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300">
								<AlertCircle size={18} className="mt-0.5 shrink-0" />
								<span>{errorMessage}</span>
							</div>
						)}
					</div>
				</div>

				<footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-white/8 bg-[#20201f] px-7 py-5">
					<button
						type="button"
						onClick={() => setShowDeleteConfirm(true)}
						disabled={isSaving || isDeleting}
						className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/10 px-4 text-sm font-semibold text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
					>
						<Trash2 size={17} />
						Delete {transactionCount} {transactionLabel}
					</button>

					<div className="ml-auto flex items-center gap-3">
						<button
							type="button"
							onClick={onClose}
							disabled={isSaving || isDeleting}
							className="h-12 rounded-xl border border-white/10 px-5 text-sm font-semibold transition hover:bg-white/7 disabled:opacity-50"
						>
							Cancel
						</button>

						<button
							type="button"
							onClick={() => void handleSave()}
							disabled={!hasChanges || isSaving || isDeleting}
							className="inline-flex h-12 min-w-20 items-center justify-center gap-2 rounded-xl bg-[#ff6538] px-5 text-sm font-semibold text-white transition hover:bg-[#ff744e] disabled:cursor-not-allowed disabled:opacity-45"
						>
							{isSaving && <Loader2 size={16} className="animate-spin" />}
							Save
						</button>
					</div>
				</footer>

				{showDeleteConfirm && (
					<div className="absolute inset-0 z-50 grid place-items-center bg-black/65 p-5 backdrop-blur-sm">
						<div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#272725] p-5 shadow-2xl">
							<h3 className="text-lg font-semibold">
								Delete {transactionCount} {transactionLabel}?
							</h3>
							<p className="mt-2 text-sm leading-6 text-[#aaa9a4]">
								This permanently removes the selected transactions from all
								transaction lists, reports, and budgets.
							</p>

							<div className="mt-5 flex justify-end gap-3">
								<button
									type="button"
									onClick={() => setShowDeleteConfirm(false)}
									disabled={isDeleting}
									className="h-10 rounded-xl border border-white/10 px-4 text-sm font-semibold transition hover:bg-white/7 disabled:opacity-50"
								>
									Cancel
								</button>
								<button
									type="button"
									onClick={() => void handleDelete()}
									disabled={isDeleting}
									className="inline-flex h-10 items-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
								>
									{isDeleting && <Loader2 size={15} className="animate-spin" />}
									Delete
								</button>
							</div>
						</div>
					</div>
				)}
			</section>
		</div>,
		document.body,
	);
}

function BulkSelectField({
	label,
	labelInfo,
	value,
	onChange,
	options,
	disabled = false,
	title,
	disableOptionValue,
}: {
	label: string;
	labelInfo?: string;
	value: string;
	onChange: (value: string) => void;
	options: SelectOption[];
	disabled?: boolean;
	title?: string;
	disableOptionValue?: string;
}) {
	return (
		<div>
			<label className="mb-2 flex items-center gap-1.5 text-[15px] font-semibold">
				<span>{label}</span>
				{labelInfo && (
					<span title={labelInfo} className="text-[#777671]">
						<Info size={14} />
					</span>
				)}
			</label>

			<BulkSelect
				value={value}
				onChange={onChange}
				options={options}
				disabled={disabled}
				title={title}
				disableOptionValue={disableOptionValue}
			/>
		</div>
	);
}

function BulkSelect({
	value,
	onChange,
	options,
	disabled = false,
	title,
	disableOptionValue,
}: {
	value: string;
	onChange: (value: string) => void;
	options: SelectOption[];
	disabled?: boolean;
	title?: string;
	disableOptionValue?: string;
}) {
	return (
		<div className="relative" title={title}>
			<select
				value={value}
				onChange={(event) => onChange(event.target.value)}
				disabled={disabled}
				className="h-12 w-full appearance-none rounded-xl border border-white/10 bg-[#20201f] px-4 pr-11 text-base text-white outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 disabled:cursor-not-allowed disabled:text-[#8b8a85]"
			>
				<option value="">No change</option>
				{options.map((option) => (
					<option
						key={option.value}
						value={option.value}
						disabled={option.value === disableOptionValue}
					>
						{option.label}
					</option>
				))}
			</select>
			<ChevronDown
				size={17}
				className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#aaa9a4]"
			/>
		</div>
	);
}
