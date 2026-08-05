"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
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

// ----- Types -----
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

// ----- Constants for select options (moved outside) -----
const NOTES_OPTIONS: SelectOption[] = [
	{ value: "replace", label: "Replace notes" },
	{ value: "clear", label: "Clear notes" },
];

const TAGS_OPTIONS: SelectOption[] = [
	{ value: "add", label: "Add tags" },
	{ value: "replace", label: "Replace tags" },
	{ value: "clear", label: "Clear tags" },
];

const HIDDEN_OPTIONS: SelectOption[] = [
	{ value: "hide", label: "Hide transactions" },
	{ value: "show", label: "Show transactions" },
];

const REVIEW_OPTIONS: SelectOption[] = [
	{ value: "reviewed", label: "Mark as reviewed" },
	{ value: "needs-review", label: "Mark as needs review" },
];

// ----- Helper functions -----
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

// ----- Subcomponents -----
function AccountSummary({
	accounts,
}: {
	accounts: Array<{ id: string | null; name: string }>;
}) {
	return (
		<div className="flex items-center gap-4">
			<div className="flex shrink-0 -space-x-3">
				{accounts.slice(0, 4).map((account, index) => (
					<div
						key={account.id ?? account.name}
						className="grid size-11 place-items-center rounded-full border-2 border-white bg-[#1379bc] text-sm font-black text-white shadow-sm dark:border-[#191918]"
						style={{ zIndex: accounts.length - index }}
					>
						{getAccountInitial(account.name)}
					</div>
				))}
			</div>

			<div className="min-w-0">
				<p className="text-lg font-semibold text-gray-900 dark:text-white">
					{accounts.length} account{accounts.length === 1 ? "" : "s"} selected
				</p>
				<p className="mt-1 truncate text-sm text-gray-500 dark:text-[#aaa9a4]">
					{accounts.map((account) => account.name).join(", ")}
				</p>
			</div>
		</div>
	);
}

function DeleteConfirmationDialog({
	count,
	label,
	isDeleting,
	onConfirm,
	onCancel,
}: {
	count: number;
	label: string;
	isDeleting: boolean;
	onConfirm: () => void;
	onCancel: () => void;
}) {
	return (
		<div className="absolute inset-0 z-50 grid place-items-center bg-black/65 p-5 backdrop-blur-sm dark:bg-black/80">
			<div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-[#272725]">
				<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
					Delete {count} {label}?
				</h3>
				<p className="mt-2 text-sm leading-6 text-gray-500 dark:text-[#aaa9a4]">
					This permanently removes the selected transactions from all
					transaction lists, reports, and budgets.
				</p>

				<div className="mt-5 flex justify-end gap-3">
					<button
						type="button"
						onClick={onCancel}
						disabled={isDeleting}
						className="h-10 rounded-xl border border-gray-200 px-4 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 dark:border-white/10 dark:text-white dark:hover:bg-white/7 disabled:opacity-50"
					>
						Cancel
					</button>
					<button
						type="button"
						onClick={onConfirm}
						disabled={isDeleting}
						className="inline-flex h-10 items-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
					>
						{isDeleting && <Loader2 size={15} className="animate-spin" />}
						Delete
					</button>
				</div>
			</div>
		</div>
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
			<label className="mb-2 flex items-center gap-1.5 text-[15px] font-semibold text-gray-900 dark:text-white">
				<span>{label}</span>
				{labelInfo && (
					<span title={labelInfo} className="text-gray-400 dark:text-[#777671]">
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
				className="h-12 w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 pr-11 text-base text-gray-900 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 disabled:cursor-not-allowed disabled:text-gray-400 dark:border-white/10 dark:bg-[#20201f] dark:text-white dark:disabled:text-[#8b8a85]"
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
				className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-[#aaa9a4]"
			/>
		</div>
	);
}

// ----- Main Component -----
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
	const accountSummaries = useMemo(
		() => getUniqueAccountSummaries(transactions),
		[transactions],
	);

	const commonMerchantName = useMemo(() => {
		const firstMerchant = transactions[0]?.merchant?.trim() ?? "";
		if (!firstMerchant) return null;
		const normalizedFirstMerchant = normalize(firstMerchant);
		const allMatch = transactions.every(
			(t) => normalize(t.merchant) === normalizedFirstMerchant,
		);
		return allMatch ? firstMerchant : null;
	}, [transactions]);

	const recurringMerchantName = merchantSelection?.name ?? commonMerchantName;

	const hasChanges = useMemo(
		() =>
			Boolean(
				merchantSelection ||
				category ||
				date ||
				recurringChoice !== "" ||
				notesChoice !== "" ||
				tagsChoice !== "" ||
				hiddenChoice !== "" ||
				reviewChoice !== "",
			),
		[
			merchantSelection,
			category,
			date,
			recurringChoice,
			notesChoice,
			tagsChoice,
			hiddenChoice,
			reviewChoice,
		],
	);

	// --- Effects ---
	useEffect(() => {
		if (!isOpen) return;
		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => {
			document.body.style.overflow = previousOverflow;
		};
	}, [isOpen]);

	useEffect(() => {
		if (!isOpen) return;
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key !== "Escape" || event.defaultPrevented) return;
			if (showDeleteConfirm) {
				setShowDeleteConfirm(false);
				return;
			}
			if (!isSaving && !isDeleting) {
				onClose();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isDeleting, isOpen, isSaving, onClose, showDeleteConfirm]);

	// --- Handlers (memoized) ---
	const handleSave = useCallback(async () => {
		if (!hasChanges || isSaving || isDeleting || transactionCount === 0) return;

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
	}, [
		hasChanges,
		isSaving,
		isDeleting,
		transactionCount,
		tagValue,
		transactions,
		merchantSelection,
		category,
		date,
		notesChoice,
		noteValue,
		tagsChoice,
		hiddenChoice,
		reviewChoice,
		recurringChoice,
		recurringMerchantName,
		updateTransaction,
		confirmRecurring,
		onSaved,
		onClose,
	]);

	const handleDelete = useCallback(async () => {
		if (isDeleting || isSaving || transactionCount === 0) return;

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
	}, [
		isDeleting,
		isSaving,
		transactionCount,
		transactions,
		bulkDeleteTransactions,
		onDeleted,
		onClose,
	]);

	if (!isOpen || transactionCount === 0 || typeof document === "undefined") {
		return null;
	}

	return createPortal(
		<div className="fixed inset-0 z-[150]" role="presentation">
			<button
				type="button"
				aria-label="Close bulk transaction editor"
				className="absolute inset-0 bg-black/65 backdrop-blur-[1px] dark:bg-black/80"
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
				className="absolute inset-y-0 right-0 flex h-dvh w-full max-w-[680px] animate-in flex-col overflow-hidden border-l border-gray-200 bg-white shadow-[-28px_0_80px_rgba(0,0,0,0.1)] dark:border-white/10 dark:bg-[#20201f] dark:shadow-[-28px_0_80px_rgba(0,0,0,0.4)] slide-in-from-right duration-300"
			>
				<header className="flex min-h-22 shrink-0 items-center justify-between border-b border-gray-200 px-7 dark:border-white/8 dark:bg-[#20201f]">
					<h2
						id="bulk-edit-transactions-title"
						className="text-[26px] font-semibold tracking-tight text-gray-900 dark:text-white"
					>
						Edit {transactionCount} {transactionLabel}
					</h2>

					<button
						type="button"
						onClick={onClose}
						disabled={isSaving || isDeleting}
						className="grid size-11 place-items-center rounded-full text-gray-500 transition hover:bg-gray-100 dark:text-white dark:hover:bg-white/8 disabled:opacity-50"
						aria-label="Close"
					>
						<X size={25} />
					</button>
				</header>

				<div className="min-h-0 flex-1 overflow-y-auto bg-gray-50 dark:bg-[#191918]">
					<div className="border-b border-gray-200 bg-white px-7 py-5 dark:border-white/8 dark:bg-[#191918]">
						<AccountSummary accounts={accountSummaries} />
					</div>

					<div className="space-y-5 px-7 py-6 bg-gray-50 dark:bg-[#191918]">
						{/* Merchant */}
						<div>
							<div className="mb-2 flex items-center justify-between gap-3">
								<label className="text-[15px] font-semibold text-gray-900 dark:text-white">
									Merchant
								</label>
								{merchantSelection && (
									<button
										type="button"
										onClick={() => setMerchantSelection(null)}
										className="text-sm font-semibold text-cyan-600 hover:text-cyan-500 dark:text-cyan-400 dark:hover:text-cyan-300"
									>
										Clear
									</button>
								)}
							</div>
							<MerchantSelect
								value={merchantSelection}
								onChange={setMerchantSelection}
								placeholder="No change"
								inputClassName="border-gray-200 bg-white text-gray-900 dark:border-white/10 dark:bg-[#20201f] dark:text-white"
							/>
						</div>

						{/* Category */}
						<div>
							<div className="mb-2 flex items-center justify-between gap-3">
								<label className="text-[15px] font-semibold text-gray-900 dark:text-white">
									Category
								</label>
								{category && (
									<button
										type="button"
										onClick={() => setCategory("")}
										className="text-sm font-semibold text-cyan-600 hover:text-cyan-500 dark:text-cyan-400 dark:hover:text-cyan-300"
									>
										Clear
									</button>
								)}
							</div>
							<div className="rounded-xl border border-gray-200 bg-white px-1 dark:border-white/10 dark:bg-[#20201f]">
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

						{/* Goals (disabled) */}
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

						{/* Date */}
						<div>
							<label className="mb-2 block text-[15px] font-semibold text-gray-900 dark:text-white">
								Date
							</label>
							<div className="relative">
								<input
									type="date"
									value={date}
									onChange={(event) => setDate(event.target.value)}
									className={`h-12 w-full rounded-xl border border-gray-200 bg-white px-4 pr-11 text-base text-gray-900 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 dark:border-white/10 dark:bg-[#20201f] dark:text-white [color-scheme:dark] ${
										date ? "text-gray-900 dark:text-white" : "text-transparent"
									}`}
								/>
								{!date && (
									<span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-base text-gray-400 dark:text-[#c4c3bf]">
										No change
									</span>
								)}
							</div>
						</div>

						{/* Recurring */}
						<BulkSelectField
							label="Recurring"
							value={recurringChoice}
							onChange={(value) => setRecurringChoice(value as RecurringChoice)}
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

						{/* Notes */}
						<BulkSelectField
							label="Notes"
							value={notesChoice}
							onChange={(value) => setNotesChoice(value as NotesChoice)}
							options={NOTES_OPTIONS}
						/>
						{notesChoice === "replace" && (
							<textarea
								value={noteValue}
								onChange={(event) => setNoteValue(event.target.value)}
								placeholder="Notes applied to every selected transaction"
								className="-mt-2 min-h-24 w-full resize-y rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 dark:border-white/10 dark:bg-[#20201f] dark:text-white dark:placeholder:text-[#777671]"
							/>
						)}

						{/* Tags */}
						<BulkSelectField
							label="Tags"
							value={tagsChoice}
							onChange={(value) => setTagsChoice(value as TagsChoice)}
							options={TAGS_OPTIONS}
						/>
						{(tagsChoice === "add" || tagsChoice === "replace") && (
							<>
								<input
									list="bulk-transaction-tags"
									value={tagValue}
									onChange={(event) => setTagValue(event.target.value)}
									placeholder="Comma-separated tags"
									className="-mt-2 h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 dark:border-white/10 dark:bg-[#20201f] dark:text-white dark:placeholder:text-[#777671]"
								/>
								<datalist id="bulk-transaction-tags">
									{customTags.map((tag) => (
										<option key={tag} value={tag} />
									))}
								</datalist>
							</>
						)}

						{/* Hide / Show */}
						<BulkSelectField
							label="Hide transactions"
							labelInfo="Hidden transactions stay stored but are excluded from normal views."
							value={hiddenChoice}
							onChange={(value) => setHiddenChoice(value as HiddenChoice)}
							options={HIDDEN_OPTIONS}
						/>

						{/* Review status */}
						<BulkSelectField
							label="Review status"
							value={reviewChoice}
							onChange={(value) => setReviewChoice(value as ReviewChoice)}
							options={REVIEW_OPTIONS}
						/>

						{errorMessage && (
							<div className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
								<AlertCircle size={18} className="mt-0.5 shrink-0" />
								<span>{errorMessage}</span>
							</div>
						)}
					</div>
				</div>

				<footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-gray-200 bg-white px-7 py-5 dark:border-white/8 dark:bg-[#20201f]">
					<button
						type="button"
						onClick={() => setShowDeleteConfirm(true)}
						disabled={isSaving || isDeleting}
						className="inline-flex h-12 items-center gap-2 rounded-xl border border-gray-200 px-4 text-sm font-semibold text-red-600 transition hover:bg-red-50 dark:border-white/10 dark:text-red-400 dark:hover:bg-red-500/10 disabled:opacity-50"
					>
						<Trash2 size={17} />
						Delete {transactionCount} {transactionLabel}
					</button>

					<div className="ml-auto flex items-center gap-3">
						<button
							type="button"
							onClick={onClose}
							disabled={isSaving || isDeleting}
							className="h-12 rounded-xl border border-gray-200 px-5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 dark:border-white/10 dark:text-white dark:hover:bg-white/7 disabled:opacity-50"
						>
							Cancel
						</button>

						<button
							type="button"
							onClick={handleSave}
							disabled={!hasChanges || isSaving || isDeleting}
							className="inline-flex h-12 min-w-20 items-center justify-center gap-2 rounded-xl bg-[#ff6538] px-5 text-sm font-semibold text-white transition hover:bg-[#ff744e] disabled:cursor-not-allowed disabled:opacity-45"
						>
							{isSaving && <Loader2 size={16} className="animate-spin" />}
							Save
						</button>
					</div>
				</footer>

				{showDeleteConfirm && (
					<DeleteConfirmationDialog
						count={transactionCount}
						label={transactionLabel}
						isDeleting={isDeleting}
						onConfirm={handleDelete}
						onCancel={() => setShowDeleteConfirm(false)}
					/>
				)}
			</section>
		</div>,
		document.body,
	);
}
