"use client";

import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
	AlertCircle,
	CircleMinus,
	CirclePlus,
	Loader2,
	Plus,
	Tag,
	X,
} from "lucide-react";

import { CategorySelector } from "@/components/CategorySelector";
import { type Transaction, useBudgetStore } from "@/store/useBudgetStore";
import { getInitialDisplayAmount, parseAmountInput } from "@/utils/formatters";
import { MerchantSelect } from "@/components/Merchants/MerchantSelect";

interface AddTransactionModalProps {
	initialTransaction: Transaction;
	isOpen: boolean;
	allowDuplicate?: boolean;
	onClose: () => void;
	onCreated?: (transaction: Transaction) => void;
}

type TransactionDirection = "debit" | "credit";

function normalize(value: string): string {
	return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function getComparableTransaction(transaction: Transaction) {
	return {
		date: transaction.date,
		merchant: transaction.merchant.trim(),
		merchant_id: transaction.merchant_id ?? null,
		description: transaction.description ?? "",
		note: transaction.note ?? "",
		amount: Number(transaction.amount),
		category: transaction.category,
		account: transaction.account,
		account_id: transaction.account_id ?? null,
		needs_review: transaction.needs_review,
		needs_subcat: transaction.needs_subcat,
		tags: [...(transaction.tags ?? [])].sort(),
	};
}

export default function AddTransactionModal({
	initialTransaction,
	isOpen,
	allowDuplicate = false,
	onClose,
	onCreated,
}: AddTransactionModalProps) {
	const accounts = useBudgetStore((state) => state.accounts);
	const merchants = useBudgetStore((state) => state.merchants);
	const customTags = useBudgetStore((state) => state.customTags);
	const createTransaction = useBudgetStore((state) => state.createTransaction);
	const fetchAccounts = useBudgetStore((state) => state.fetchAccounts);
	const fetchMerchants = useBudgetStore((state) => state.fetchMerchants);
	const addCustomMerchant = useBudgetStore((state) => state.addCustomMerchant);
	const addCustomTag = useBudgetStore((state) => state.addCustomTag);

	const [editedData, setEditedData] = useState<Transaction>(() => ({
		...initialTransaction,
		tags: [...(initialTransaction.tags ?? [])],
	}));
	const [initialSnapshot] = useState<Transaction>(() => ({
		...initialTransaction,
		tags: [...(initialTransaction.tags ?? [])],
	}));
	const [direction, setDirection] = useState<TransactionDirection>(
		initialTransaction.amount >= 0 ? "credit" : "debit",
	);
	const [displayAmount, setDisplayAmount] = useState(() => {
		return getInitialDisplayAmount(Math.abs(initialTransaction.amount));
	});
	const [tagQuery, setTagQuery] = useState("");
	const [tagOpen, setTagOpen] = useState(false);
	const [attemptedSave, setAttemptedSave] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);
	const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

	const tagInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (!isOpen) {
			return;
		}

		void Promise.all([fetchAccounts(), fetchMerchants()]);
	}, [fetchAccounts, fetchMerchants, isOpen]);

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

	const availableTags = useMemo(() => {
		const selected = new Set(
			(editedData.tags ?? []).map((tagName) => normalize(tagName)),
		);
		const query = normalize(tagQuery);

		return customTags
			.filter((tagName) => {
				const normalizedTag = normalize(tagName);
				return (
					!selected.has(normalizedTag) &&
					(!query || normalizedTag.includes(query))
				);
			})
			.slice(0, 10);
	}, [customTags, editedData.tags, tagQuery]);

	const selectedAccount = useMemo(() => {
		return accounts.find((account) => account.id === editedData.account_id);
	}, [accounts, editedData.account_id]);

	const numericAmount = Math.abs(Number(editedData.amount) || 0);

	const validation = useMemo(() => {
		return {
			amount: numericAmount > 0 ? null : "Enter an amount greater than $0.",
			merchant: editedData.merchant.trim()
				? null
				: "Enter or select a merchant.",
			date: editedData.date ? null : "Select a transaction date.",
			account: editedData.account_id ? null : "Select an account.",
		};
	}, [
		editedData.account_id,
		editedData.date,
		editedData.merchant,
		numericAmount,
	]);

	const hasValidationErrors = Object.values(validation).some(Boolean);

	const hasUnsavedChanges = useMemo(() => {
		return (
			JSON.stringify(getComparableTransaction(editedData)) !==
			JSON.stringify(getComparableTransaction(initialSnapshot))
		);
	}, [editedData, initialSnapshot]);

	const toggleTag = useCallback((tagName: string) => {
		const cleanTag = tagName.trim();

		if (!cleanTag) {
			return;
		}

		setEditedData((current) => {
			const tags = current.tags ?? [];
			const exists = tags.some((tag) => normalize(tag) === normalize(cleanTag));

			return {
				...current,
				tags: exists
					? tags.filter((tag) => normalize(tag) !== normalize(cleanTag))
					: [...tags, cleanTag],
			};
		});
	}, []);

	const createTag = useCallback(() => {
		const cleanTag = tagQuery.trim();

		if (!cleanTag) {
			return;
		}

		addCustomTag(cleanTag);
		toggleTag(cleanTag);
		setTagQuery("");
		setTagOpen(false);
	}, [addCustomTag, tagQuery, toggleTag]);

	const requestClose = useCallback(() => {
		if (isSaving) {
			return;
		}

		if (hasUnsavedChanges) {
			setShowDiscardConfirm(true);
			return;
		}

		onClose();
	}, [hasUnsavedChanges, isSaving, onClose]);

	const selectedAccountName = selectedAccount?.name;

	const handleSave = useCallback(async () => {
		setAttemptedSave(true);
		setSaveError(null);

		if (hasValidationErrors || isSaving) {
			return;
		}

		setIsSaving(true);

		try {
			const cleanMerchant = editedData.merchant.trim();
			const normalizedMerchant = normalize(cleanMerchant);
			const matchingMerchant = merchants.find((merchant) => {
				return normalize(merchant.name) === normalizedMerchant;
			});

			let merchantId = editedData.merchant_id?.trim() || matchingMerchant?.id;

			if (!merchantId) {
				const createdMerchant = await addCustomMerchant(cleanMerchant);
				merchantId = createdMerchant.id;
			}

			const absoluteAmount = Math.abs(Number(editedData.amount));

			const preparedTransaction: Transaction = {
				...editedData,
				merchant: cleanMerchant,
				merchant_id: merchantId,
				description: editedData.description?.trim() ?? "",
				note: editedData.note?.trim() ?? "",
				tags: (editedData.tags ?? []).map((tag) => tag.trim()).filter(Boolean),
				account: selectedAccountName ?? editedData.account.trim(),
				amount: direction === "debit" ? -absoluteAmount : absoluteAmount,
				category: editedData.category || "Uncategorized",
				is_hidden: false,
			};

			const createdTransaction = await createTransaction(preparedTransaction);

			onCreated?.(createdTransaction);
			onClose();
		} catch (error) {
			console.error("Failed to create transaction:", error);

			setSaveError(
				error instanceof Error
					? error.message
					: "Failed to create the transaction. Please try again.",
			);
		} finally {
			setIsSaving(false);
		}
	}, [
		addCustomMerchant,
		createTransaction,
		direction,
		editedData,
		hasValidationErrors,
		isSaving,
		merchants,
		onClose,
		onCreated,
		selectedAccountName,
	]);

	useEffect(() => {
		if (!isOpen) {
			return;
		}

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				if (showDiscardConfirm) {
					setShowDiscardConfirm(false);
					return;
				}

				if (tagOpen) {
					setTagOpen(false);
					return;
				}

				requestClose();
				return;
			}

			if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
				event.preventDefault();
				void handleSave();
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [handleSave, isOpen, requestClose, showDiscardConfirm, tagOpen]);

	if (!isOpen || typeof document === "undefined") {
		return null;
	}

	return createPortal(
		<div
			className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-6"
			role="presentation"
		>
			<button
				type="button"
				aria-label="Close add transaction dialog"
				className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
				onClick={requestClose}
			/>

			<section
				role="dialog"
				aria-modal="true"
				aria-labelledby="add-transaction-title"
				className="relative flex max-h-[92dvh] w-full max-w-[720px] flex-col overflow-hidden rounded-2xl border border-black/10 bg-white text-gray-900 shadow-[0_24px_80px_rgba(0,0,0,0.25)] dark:border-white/10 dark:bg-[#171717] dark:text-white"
			>
				<header className="flex shrink-0 items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-white/10 sm:px-7">
					<div>
						<h2
							id="add-transaction-title"
							className="text-xl font-semibold tracking-tight"
						>
							{allowDuplicate ? "Duplicate transaction" : "Add transaction"}
						</h2>
						<p className="mt-0.5 hidden text-xs text-gray-500 dark:text-gray-400 sm:block">
							Use Ctrl/⌘ + Enter to submit
						</p>
					</div>

					<button
						type="button"
						onClick={requestClose}
						className="grid size-10 place-items-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white"
						aria-label="Close"
					>
						<X size={21} />
					</button>
				</header>

				<form
					className="flex min-h-0 flex-1 flex-col"
					onSubmit={(event) => {
						event.preventDefault();
						void handleSave();
					}}
				>
					<div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
						<div className="space-y-5">
							<div
								className="grid grid-cols-2 rounded-xl bg-gray-100 p-1 dark:bg-white/5"
								aria-label="Transaction type"
							>
								<DirectionButton
									active={direction === "debit"}
									label="Debit"
									icon={<CircleMinus size={18} />}
									onClick={() => {
										setDirection("debit");
										setEditedData((current) => ({
											...current,
											amount: -Math.abs(Number(current.amount) || 0),
										}));
									}}
								/>
								<DirectionButton
									active={direction === "credit"}
									label="Credit"
									icon={<CirclePlus size={18} />}
									onClick={() => {
										setDirection("credit");
										setEditedData((current) => ({
											...current,
											amount: Math.abs(Number(current.amount) || 0),
										}));
									}}
								/>
							</div>

							<FieldGroup
								label="Amount"
								error={attemptedSave ? validation.amount : null}
							>
								<div className="relative">
									<span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-gray-400">
										$
									</span>
									<input
										type="text"
										inputMode="decimal"
										autoComplete="off"
										placeholder="0.00"
										value={displayAmount}
										onChange={(event) => {
											const { displayString, numericValue } = parseAmountInput(
												event.target.value,
											);
											setDisplayAmount(displayString);
											setEditedData((current) => ({
												...current,
												amount:
													direction === "debit"
														? -Math.abs(numericValue)
														: Math.abs(numericValue),
											}));
										}}
										className="h-14 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-4 text-xl font-semibold outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 dark:border-white/10 dark:bg-white/[0.03]"
									/>
								</div>
							</FieldGroup>

							<FieldGroup
								label="Merchant"
								error={attemptedSave ? validation.merchant : null}
							>
								<MerchantSelect
									value={
										editedData.merchant
											? {
													id: editedData.merchant_id ?? "",
													name: editedData.merchant,
												}
											: null
									}
									onInputChange={(name) => {
										const matchingMerchant = merchants.find((merchant) => {
											return normalize(merchant.name) === normalize(name);
										});

										setEditedData((current) => ({
											...current,
											merchant: name,
											merchant_id: matchingMerchant?.id ?? null,
										}));
									}}
									onChange={(merchant) => {
										setEditedData((current) => ({
											...current,
											merchant: merchant.name,
											merchant_id: merchant.id,
										}));
									}}
									placeholder="Search merchants or enter a new one"
								/>
							</FieldGroup>

							<FieldGroup label="Original statement" hint="Optional">
								<input
									type="text"
									value={editedData.description ?? ""}
									onChange={(event) => {
										setEditedData((current) => ({
											...current,
											description: event.target.value,
										}));
									}}
									className="h-13 w-full rounded-xl border border-gray-200 bg-white px-4 text-[15px] outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 dark:border-white/10 dark:bg-white/[0.03]"
								/>
							</FieldGroup>

							<div className="grid gap-5 sm:grid-cols-2">
								<FieldGroup
									label="Date"
									error={attemptedSave ? validation.date : null}
								>
									<input
										type="date"
										value={editedData.date}
										onChange={(event) => {
											setEditedData((current) => ({
												...current,
												date: event.target.value,
											}));
										}}
										className="h-13 w-full rounded-xl border border-gray-200 bg-white px-4 text-[15px] outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 dark:border-white/10 dark:bg-white/[0.03]"
									/>
								</FieldGroup>

								<FieldGroup
									label="Account"
									error={attemptedSave ? validation.account : null}
								>
									<select
										value={editedData.account_id ?? ""}
										onChange={(event) => {
											const account = accounts.find(
												(item) => item.id === event.target.value,
											);
											setEditedData((current) => ({
												...current,
												account_id: account?.id ?? null,
												account: account?.name ?? "",
											}));
										}}
										className="h-13 w-full rounded-xl border border-gray-200 bg-white px-4 text-[15px] outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 dark:border-white/10 dark:bg-[#1c1c1c]"
									>
										<option value="">Select account</option>
										{accounts.map((account) => (
											<option key={account.id} value={account.id}>
												{account.name}
											</option>
										))}
									</select>
								</FieldGroup>
							</div>

							<FieldGroup label="Category">
								<div className="rounded-xl border border-gray-200 bg-white px-1 dark:border-white/10 dark:bg-white/[0.03]">
									<CategorySelector
										currentCategory={editedData.category || "Uncategorized"}
										variant="form"
										showChevron
										onSelect={(category) => {
											setEditedData((current) => ({
												...current,
												category,
											}));
										}}
									/>
								</div>
							</FieldGroup>

							<FieldGroup label="Notes" hint="Optional">
								<textarea
									value={editedData.note ?? ""}
									onChange={(event) => {
										setEditedData((current) => ({
											...current,
											note: event.target.value,
										}));
									}}
									placeholder="Add notes to this transaction…"
									className="min-h-24 w-full resize-y rounded-xl border border-gray-200 bg-white px-4 py-3 text-[15px] outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 dark:border-white/10 dark:bg-white/[0.03]"
								/>
							</FieldGroup>

							<FieldGroup label="Tags" hint="Optional">
								<div className="space-y-2">
									{(editedData.tags ?? []).length > 0 && (
										<div className="flex flex-wrap gap-2">
											{(editedData.tags ?? []).map((tag) => (
												<button
													type="button"
													key={tag}
													onClick={() => toggleTag(tag)}
													className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/15"
												>
													<Tag size={13} />
													{tag}
													<X size={12} />
												</button>
											))}
										</div>
									)}

									<div className="relative">
										<input
											ref={tagInputRef}
											type="text"
											value={tagQuery}
											placeholder="Search tags…"
											onFocus={() => setTagOpen(true)}
											onBlur={() => {
												window.setTimeout(() => setTagOpen(false), 120);
											}}
											onChange={(event) => {
												setTagQuery(event.target.value);
												setTagOpen(true);
											}}
											onKeyDown={(event) => {
												if (event.key === "Enter" && tagQuery.trim()) {
													event.preventDefault();
													createTag();
												}
											}}
											className="h-13 w-full rounded-xl border border-gray-200 bg-white px-4 text-[15px] outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 dark:border-white/10 dark:bg-white/[0.03]"
										/>

										{tagOpen &&
											(availableTags.length > 0 || tagQuery.trim()) && (
												<div className="absolute left-0 right-0 top-[calc(100%+6px)] z-40 max-h-56 overflow-y-auto rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl dark:border-white/10 dark:bg-[#202020]">
													{availableTags.map((tag) => (
														<button
															type="button"
															key={tag}
															onMouseDown={(event) => {
																event.preventDefault();
																toggleTag(tag);
																setTagQuery("");
															}}
															className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-white/5"
														>
															<Tag size={15} />
															{tag}
														</button>
													))}

													{tagQuery.trim() && (
														<button
															type="button"
															onMouseDown={(event) => {
																event.preventDefault();
																createTag();
															}}
															className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-500/10"
														>
															<Plus size={15} />
															Create “{tagQuery.trim()}”
														</button>
													)}
												</div>
											)}
									</div>
								</div>
							</FieldGroup>

							<label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 px-4 py-3 dark:border-white/10">
								<input
									type="checkbox"
									checked={editedData.needs_review}
									onChange={(event) => {
										setEditedData((current) => ({
											...current,
											needs_review: event.target.checked,
										}));
									}}
									className="mt-0.5 size-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
								/>
								<span>
									<span className="block text-sm font-medium">
										Needs review
									</span>
									<span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">
										Keep this transaction in the review queue.
									</span>
								</span>
							</label>
						</div>
					</div>

					{saveError && (
						<div className="mx-5 mb-3 flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300 sm:mx-7">
							<AlertCircle size={18} className="mt-0.5 shrink-0" />
							<span>{saveError}</span>
						</div>
					)}

					<footer className="flex shrink-0 items-center justify-end gap-3 border-t border-gray-200 bg-white px-5 py-4 dark:border-white/10 dark:bg-[#171717] sm:px-7">
						<button
							type="button"
							onClick={requestClose}
							disabled={isSaving}
							className="h-11 rounded-xl border border-gray-200 px-5 text-sm font-semibold transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:hover:bg-white/5"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={isSaving}
							className="inline-flex h-11 min-w-40 items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
						>
							{isSaving && <Loader2 size={17} className="animate-spin" />}
							{isSaving
								? "Saving…"
								: allowDuplicate
									? "Duplicate transaction"
									: "Add transaction"}
						</button>
					</footer>
				</form>

				{showDiscardConfirm && (
					<div className="absolute inset-0 z-50 grid place-items-center bg-white/70 p-5 backdrop-blur-sm dark:bg-black/60">
						<div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-[#202020]">
							<h3 className="text-lg font-semibold">Discard transaction?</h3>
							<p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
								Your unsaved transaction will be lost.
							</p>
							<div className="mt-5 flex justify-end gap-3">
								<button
									type="button"
									onClick={() => setShowDiscardConfirm(false)}
									className="h-10 rounded-xl border border-gray-200 px-4 text-sm font-semibold hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5"
								>
									Keep editing
								</button>
								<button
									type="button"
									onClick={onClose}
									className="h-10 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-500"
								>
									Discard
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

function DirectionButton({
	active,
	label,
	icon,
	onClick,
}: {
	active: boolean;
	label: string;
	icon: ReactNode;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={`flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition ${
				active
					? "bg-white text-gray-950 shadow-sm dark:bg-white/10 dark:text-white"
					: "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
			}`}
		>
			{icon}
			{label}
		</button>
	);
}

function FieldGroup({
	label,
	hint,
	error,
	children,
}: {
	label: string;
	hint?: string;
	error?: string | null;
	children: ReactNode;
}) {
	return (
		<div>
			<div className="mb-2 flex items-center justify-between gap-3">
				<label className="text-sm font-semibold">{label}</label>
				{hint && (
					<span className="text-xs text-gray-400 dark:text-gray-500">
						{hint}
					</span>
				)}
			</div>
			{children}
			{error && (
				<p className="mt-2 flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
					<AlertCircle size={13} />
					{error}
				</p>
			)}
		</div>
	);
}
