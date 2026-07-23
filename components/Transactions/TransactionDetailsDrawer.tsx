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
import { useRouter } from "next/navigation";
import {
	AlertCircle,
	Check,
	Copy,
	Ellipsis,
	Eye,
	EyeOff,
	Loader2,
	Pencil,
	Plus,
	Repeat2,
	Split,
	Tag,
	Trash2,
	X,
	Zap,
} from "lucide-react";

import { CategorySelector } from "@/components/CategorySelector";
import { MerchantSelect } from "@/components/Merchants/MerchantSelect";
import { type Transaction, useBudgetStore } from "@/store/useBudgetStore";
import {
	formatCurrency,
	getInitialDisplayAmount,
	parseAmountInput,
} from "@/utils/formatters";

interface TransactionDetailsDrawerProps {
	transaction: Transaction;
	isOpen: boolean;
	onClose: () => void;
	onDeleted: (count: number) => void;
	onDuplicate: (transaction: Transaction) => void | Promise<void>;
	onCreateRule: (transaction: Transaction) => void;
}

type TransactionDirection = "debit" | "credit";
type SaveStatus = "idle" | "saving" | "saved" | "error";

function normalize(value: string): string {
	return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function getMerchantInitial(name: string): string {
	return name.trim().charAt(0).toUpperCase() || "?";
}

function cloneTransaction(transaction: Transaction): Transaction {
	return {
		...transaction,
		tags: [...(transaction.tags ?? [])],
	};
}

export default function TransactionDetailsDrawer({
	transaction,
	isOpen,
	onClose,
	onDeleted,
	onDuplicate,
	onCreateRule,
}: TransactionDetailsDrawerProps) {
	const router = useRouter();
	const transactions = useBudgetStore((state) => state.transactions);
	const accounts = useBudgetStore((state) => state.accounts);
	const merchants = useBudgetStore((state) => state.merchants);
	const customTags = useBudgetStore((state) => state.customTags);
	const updateTransaction = useBudgetStore((state) => state.updateTransaction);
	const deleteTransaction = useBudgetStore((state) => state.deleteTransaction);
	const createTransaction = useBudgetStore((state) => state.createTransaction);
	const confirmRecurring = useBudgetStore((state) => state.confirmRecurring);
	const fetchAccounts = useBudgetStore((state) => state.fetchAccounts);
	const fetchMerchants = useBudgetStore((state) => state.fetchMerchants);
	const addCustomMerchant = useBudgetStore((state) => state.addCustomMerchant);
	const addCustomTag = useBudgetStore((state) => state.addCustomTag);

	const [editedData, setEditedData] = useState<Transaction>(() => {
		return cloneTransaction(transaction);
	});

	const [savedData, setSavedData] = useState<Transaction>(() => {
		return cloneTransaction(transaction);
	});

	const isTransactionHidden = Boolean(editedData.is_hidden);

	const [direction, setDirection] = useState<TransactionDirection>(
		transaction.amount >= 0 ? "credit" : "debit",
	);
	const [displayAmount, setDisplayAmount] = useState(() => {
		return getInitialDisplayAmount(Math.abs(transaction.amount));
	});

	const [tagQuery, setTagQuery] = useState("");

	const [tagOpen, setTagOpen] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);
	const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [showSplitDialog, setShowSplitDialog] = useState(false);
	const [splitAmount, setSplitAmount] = useState(() => {
		return getInitialDisplayAmount(Math.abs(transaction.amount) / 2);
	});
	const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

	const [isActionPending, setIsActionPending] = useState(false);

	const moreMenuRef = useRef<HTMLDivElement>(null);
	const saveStatusTimerRef = useRef<number | null>(null);

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

	useEffect(() => {
		if (!isMoreMenuOpen) {
			return;
		}

		const handlePointerDown = (event: PointerEvent) => {
			const target = event.target;

			if (
				target instanceof Node &&
				moreMenuRef.current &&
				!moreMenuRef.current.contains(target)
			) {
				setIsMoreMenuOpen(false);
			}
		};

		document.addEventListener("pointerdown", handlePointerDown);
		return () => document.removeEventListener("pointerdown", handlePointerDown);
	}, [isMoreMenuOpen]);

	useEffect(() => {
		return () => {
			if (saveStatusTimerRef.current !== null) {
				window.clearTimeout(saveStatusTimerRef.current);
			}
		};
	}, []);

	const selectedMerchant = useMemo(() => {
		if (editedData.merchant_id) {
			const byId = merchants.find((merchant) => {
				return merchant.id === editedData.merchant_id;
			});

			if (byId) {
				return byId;
			}
		}

		return merchants.find((merchant) => {
			return normalize(merchant.name) === normalize(editedData.merchant);
		});
	}, [editedData.merchant, editedData.merchant_id, merchants]);

	const editedMerchantName = editedData.merchant;

	const selectedMerchantId = selectedMerchant?.id ?? null;

	const merchantTransactionCount = useMemo(() => {
		const normalizedMerchantName = normalize(editedMerchantName);

		if (!normalizedMerchantName) {
			return 0;
		}

		return transactions.reduce((count, item) => {
			const matchesMerchantId =
				Boolean(selectedMerchantId && item.merchant_id) &&
				item.merchant_id === selectedMerchantId;

			const matchesMerchantName =
				normalize(item.merchant) === normalizedMerchantName;

			return matchesMerchantId || (!item.merchant_id && matchesMerchantName)
				? count + 1
				: count;
		}, 0);
	}, [editedMerchantName, selectedMerchantId, transactions]);

	const exactMerchant = useMemo(() => {
		const query = normalize(editedData.merchant);

		if (!query) {
			return undefined;
		}

		return merchants.find((merchant) => {
			return normalize(merchant.name) === query;
		});
	}, [editedData.merchant, merchants]);

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

	const selectedAccountId =
		selectedAccount?.id ?? editedData.account_id ?? null;
	const selectedAccountName = selectedAccount?.name ?? editedData.account;

	const showSavedStatus = useCallback(() => {
		setSaveStatus("saved");

		if (saveStatusTimerRef.current !== null) {
			window.clearTimeout(saveStatusTimerRef.current);
		}

		saveStatusTimerRef.current = window.setTimeout(() => {
			setSaveStatus("idle");
		}, 1800);
	}, []);

	const persistUpdates = useCallback(
		async (updates: Partial<Transaction>) => {
			if (Object.keys(updates).length === 0) {
				return;
			}

			const rollbackValues: Partial<Transaction> = {};

			for (const key of Object.keys(updates) as Array<
				Extract<keyof Transaction, string>
			>) {
				(rollbackValues as Record<string, unknown>)[key] = savedData[key];
			}

			setSaveStatus("saving");
			setSaveError(null);

			try {
				await updateTransaction(editedData.id, updates);
				setSavedData((current) => ({ ...current, ...updates }));
				showSavedStatus();
			} catch (error) {
				setEditedData((current) => ({ ...current, ...rollbackValues }));

				if (typeof rollbackValues.amount === "number") {
					setDisplayAmount(
						getInitialDisplayAmount(Math.abs(rollbackValues.amount)),
					);
					setDirection(rollbackValues.amount >= 0 ? "credit" : "debit");
				}
				setSaveStatus("error");
				setSaveError(
					error instanceof Error
						? error.message
						: "Failed to save the transaction.",
				);
				throw error;
			}
		},
		[editedData.id, savedData, showSavedStatus, updateTransaction],
	);

	const commitMerchant = useCallback(
		async (name: string, merchantId?: string | null) => {
			const cleanName = name.trim();

			if (!cleanName) {
				setSaveError("Merchant is required.");
				return;
			}

			let resolvedMerchantId = merchantId ?? exactMerchant?.id ?? null;

			try {
				if (!resolvedMerchantId) {
					const createdMerchant = await addCustomMerchant(cleanName);
					resolvedMerchantId = createdMerchant.id;
				}

				setEditedData((current) => ({
					...current,
					merchant: cleanName,
					merchant_id: resolvedMerchantId,
				}));

				if (
					normalize(savedData.merchant) !== normalize(cleanName) ||
					savedData.merchant_id !== resolvedMerchantId
				) {
					await persistUpdates({
						merchant: cleanName,
						merchant_id: resolvedMerchantId,
					});
				}
			} catch (error) {
				setSaveError(
					error instanceof Error ? error.message : "Failed to update merchant.",
				);
			}
		},
		[
			addCustomMerchant,
			exactMerchant?.id,
			persistUpdates,
			savedData.merchant,
			savedData.merchant_id,
		],
	);

	const commitPendingTextFields = useCallback(async () => {
		const updates: Partial<Transaction> = {};
		const absoluteAmount = Math.abs(Number(editedData.amount) || 0);
		const signedAmount =
			direction === "debit" ? -absoluteAmount : absoluteAmount;

		if (signedAmount !== Number(savedData.amount)) {
			updates.amount = signedAmount;
		}

		const description = editedData.description?.trim() ?? "";
		if (description !== (savedData.description ?? "")) {
			updates.description = description;
		}

		const note = editedData.note?.trim() ?? "";
		if (note !== (savedData.note ?? "")) {
			updates.note = note;
		}

		if (
			normalize(editedData.merchant) !== normalize(savedData.merchant) ||
			editedData.merchant_id !== savedData.merchant_id
		) {
			await commitMerchant(editedData.merchant, editedData.merchant_id);
		}

		if (Object.keys(updates).length > 0) {
			setEditedData((current) => ({ ...current, ...updates }));
			await persistUpdates(updates);
		}
	}, [
		commitMerchant,
		direction,
		editedData.amount,
		editedData.description,
		editedData.merchant,
		editedData.merchant_id,
		editedData.note,
		persistUpdates,
		savedData.amount,
		savedData.description,
		savedData.merchant,
		savedData.merchant_id,
		savedData.note,
	]);

	const requestClose = useCallback(async () => {
		if (isActionPending || saveStatus === "saving") {
			return;
		}

		try {
			await commitPendingTextFields();
			onClose();
		} catch {
			// Keep the drawer open so the save error remains visible.
		}
	}, [commitPendingTextFields, isActionPending, onClose, saveStatus]);

	const toggleTag = useCallback(
		async (tagName: string) => {
			const cleanTag = tagName.trim();
			if (!cleanTag) {
				return;
			}

			const currentTags = editedData.tags ?? [];
			const exists = currentTags.some(
				(tag) => normalize(tag) === normalize(cleanTag),
			);
			const nextTags = exists
				? currentTags.filter((tag) => normalize(tag) !== normalize(cleanTag))
				: [...currentTags, cleanTag];

			setEditedData((current) => ({ ...current, tags: nextTags }));

			try {
				await persistUpdates({ tags: nextTags });
			} catch {
				// persistUpdates handles rollback and error messaging.
			}
		},
		[editedData.tags, persistUpdates],
	);

	const createAndAddTag = useCallback(async () => {
		const cleanTag = tagQuery.trim();
		if (!cleanTag) {
			return;
		}

		addCustomTag(cleanTag);
		await toggleTag(cleanTag);
		setTagQuery("");
		setTagOpen(false);
	}, [addCustomTag, tagQuery, toggleTag]);

	const handleMarkReviewed = useCallback(async () => {
		if (!editedData.needs_review || isActionPending) {
			return;
		}

		setEditedData((current) => ({ ...current, needs_review: false }));
		try {
			await persistUpdates({ needs_review: false });
		} catch {
			// persistUpdates handles rollback.
		}
	}, [editedData.needs_review, isActionPending, persistUpdates]);

	const handleToggleHidden = useCallback(async () => {
		if (isActionPending) {
			return;
		}

		const previousHidden = Boolean(editedData.is_hidden);
		const nextHidden = !previousHidden;

		setIsActionPending(true);
		setSaveError(null);

		setEditedData((current) => ({
			...current,
			is_hidden: nextHidden,
		}));

		setSavedData((current) => ({
			...current,
			is_hidden: nextHidden,
		}));

		try {
			await updateTransaction(editedData.id, {
				is_hidden: nextHidden,
			});
		} catch (error) {
			setEditedData((current) => ({
				...current,
				is_hidden: previousHidden,
			}));

			setSavedData((current) => ({
				...current,
				is_hidden: previousHidden,
			}));

			setSaveError(
				error instanceof Error
					? error.message
					: "Failed to update transaction visibility.",
			);
		} finally {
			setIsActionPending(false);
		}
	}, [editedData.id, editedData.is_hidden, isActionPending, updateTransaction]);

	const handleOpenAccount = useCallback(async () => {
		if (!selectedAccountId) {
			setSaveError("Select an account before opening account details.");
			return;
		}

		try {
			await commitPendingTextFields();
			router.push(`/accounts/details/${encodeURIComponent(selectedAccountId)}`);
		} catch {
			// Keep the drawer open so the save error remains visible.
		}
	}, [commitPendingTextFields, router, selectedAccountId]);

	const handleDuplicateTransaction = useCallback(async () => {
		if (isActionPending) {
			return;
		}

		const absoluteAmount = Math.abs(Number(editedData.amount) || 0);
		const duplicateSource: Transaction = {
			...editedData,
			merchant: editedData.merchant.trim(),
			description: editedData.description?.trim() ?? "",
			note: editedData.note?.trim() ?? "",
			amount: direction === "debit" ? -absoluteAmount : absoluteAmount,
			account: selectedAccountName,
			account_id: selectedAccountId,
			tags: [...(editedData.tags ?? [])],
		};

		setIsActionPending(true);
		setSaveError(null);

		try {
			await commitPendingTextFields();
			setIsMoreMenuOpen(false);
			await onDuplicate(duplicateSource);
		} catch (error) {
			setSaveError(
				error instanceof Error
					? error.message
					: "Failed to prepare the duplicate transaction.",
			);
		} finally {
			setIsActionPending(false);
		}
	}, [
		commitPendingTextFields,
		direction,
		editedData,
		isActionPending,
		onDuplicate,
		selectedAccountId,
		selectedAccountName,
	]);

	const handleEditMerchantDetails = useCallback(() => {
		const merchantId = selectedMerchant?.id ?? editedData.merchant_id;

		if (!merchantId) {
			setSaveError("Select a saved merchant before opening merchant details.");
			setIsMoreMenuOpen(false);
			return;
		}

		setIsMoreMenuOpen(false);
		router.push(`/merchants/${encodeURIComponent(merchantId)}`);
	}, [editedData.merchant_id, router, selectedMerchant?.id]);

	const handleSplitTransaction = useCallback(async () => {
		if (isActionPending) {
			return;
		}

		const firstAmount = Number(splitAmount.replace(/,/g, ""));
		const totalAmount = Math.abs(Number(editedData.amount));
		const secondAmount = totalAmount - firstAmount;

		if (
			!Number.isFinite(firstAmount) ||
			firstAmount <= 0 ||
			secondAmount <= 0
		) {
			setSaveError("Enter a split amount above $0 and below the total.");
			return;
		}

		const sign = Number(editedData.amount) < 0 ? -1 : 1;
		let createdSplit: Transaction | null = null;

		setIsActionPending(true);
		setSaveError(null);

		try {
			createdSplit = await createTransaction({
				...editedData,
				id: crypto.randomUUID(),
				amount: sign * secondAmount,
				created_at: undefined,
				user_id: undefined,
			});

			const firstSignedAmount = sign * firstAmount;
			setEditedData((current) => ({ ...current, amount: firstSignedAmount }));
			setDisplayAmount(getInitialDisplayAmount(firstAmount));
			setDirection(firstSignedAmount >= 0 ? "credit" : "debit");
			await persistUpdates({ amount: firstSignedAmount });
			setShowSplitDialog(false);
			setIsMoreMenuOpen(false);
		} catch (error) {
			if (createdSplit) {
				try {
					await deleteTransaction(createdSplit.id);
				} catch (rollbackError) {
					console.error(
						"Failed to roll back split transaction:",
						rollbackError,
					);
				}
			}

			setSaveError(
				error instanceof Error ? error.message : "Failed to split transaction.",
			);
		} finally {
			setIsActionPending(false);
		}
	}, [
		createTransaction,
		deleteTransaction,
		editedData,
		isActionPending,
		persistUpdates,
		splitAmount,
	]);

	const handleDelete = useCallback(async () => {
		if (isActionPending) {
			return;
		}

		setIsActionPending(true);
		setSaveError(null);

		try {
			await deleteTransaction(editedData.id);

			setShowDeleteConfirm(false);

			onDeleted(1);
			onClose();
		} catch (error) {
			setSaveError(
				error instanceof Error
					? error.message
					: "Failed to delete transaction.",
			);
		} finally {
			setIsActionPending(false);
		}
	}, [deleteTransaction, editedData.id, isActionPending, onClose, onDeleted]);

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

			if (showSplitDialog) {
				setShowSplitDialog(false);
				return;
			}

			if (isMoreMenuOpen || tagOpen) {
				setIsMoreMenuOpen(false);
				setTagOpen(false);
				return;
			}

			void requestClose();
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [
		isOpen,
		isMoreMenuOpen,
		requestClose,
		showDeleteConfirm,
		showSplitDialog,
		tagOpen,
	]);

	if (!isOpen || typeof document === "undefined") {
		return null;
	}

	return createPortal(
		<div className="fixed inset-0 z-[100]" role="presentation">
			<button
				type="button"
				aria-label="Close transaction drawer"
				className="absolute inset-0 bg-black/35 backdrop-blur-[1px]"
				onClick={() => void requestClose()}
			/>

			<section
				role="dialog"
				aria-modal="true"
				aria-labelledby="transaction-drawer-title"
				className="absolute inset-y-0 right-0 flex h-dvh w-full max-w-[720px] animate-in flex-col overflow-hidden border-l border-black/10 bg-white text-gray-900 shadow-[-24px_0_70px_rgba(0,0,0,0.20)] slide-in-from-right duration-300 dark:border-white/10 dark:bg-[#171717] dark:text-white"
			>
				<h2 id="transaction-drawer-title" className="sr-only">
					Edit {editedData.merchant} transaction
				</h2>

				<header className="relative flex min-h-17 shrink-0 items-center justify-between border-b border-gray-200 px-4 dark:border-white/10 sm:px-6">
					<div className="flex min-w-0 items-center gap-2.5">
						<button
							type="button"
							onClick={() => void handleMarkReviewed()}
							disabled={!editedData.needs_review || isActionPending}
							className="inline-flex h-11 items-center gap-2 rounded-full border border-gray-200 px-4 text-sm font-semibold transition-colors hover:bg-gray-50 disabled:cursor-default disabled:opacity-60 dark:border-white/10 dark:hover:bg-white/5"
						>
							<Check size={17} strokeWidth={2.4} />
							{editedData.needs_review ? "Mark as reviewed" : "Reviewed"}
						</button>

						<button
							type="button"
							onClick={() => void handleToggleHidden()}
							disabled={isActionPending}
							className="grid size-11 place-items-center rounded-full border border-gray-200 text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/10 dark:text-gray-200 dark:hover:bg-white/5"
							aria-label={
								isTransactionHidden ? "Show transaction" : "Hide transaction"
							}
							title={
								isTransactionHidden ? "Show transaction" : "Hide transaction"
							}
						>
							{isTransactionHidden ? <EyeOff size={19} /> : <Eye size={19} />}
						</button>
					</div>

					<div className="flex items-center gap-1 sm:gap-2">
						<div className="hidden min-w-16 items-center justify-end text-xs text-gray-400 sm:flex">
							{saveStatus === "saving" && (
								<span className="inline-flex items-center gap-1.5">
									<Loader2 size={13} className="animate-spin" />
									Saving
								</span>
							)}
							{saveStatus === "saved" && "Saved"}
						</div>

						<div ref={moreMenuRef} className="relative">
							<button
								type="button"
								onClick={() => setIsMoreMenuOpen((current) => !current)}
								className={`grid size-11 place-items-center rounded-full text-gray-800 transition-all hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-white/10 ${
									isMoreMenuOpen
										? "bg-gray-100 shadow-[0_8px_24px_rgba(0,0,0,0.15)] dark:bg-white/10"
										: ""
								}`}
								aria-label="More transaction actions"
								aria-expanded={isMoreMenuOpen}
							>
								<Ellipsis size={24} />
							</button>

							{isMoreMenuOpen && (
								<div className="absolute right-0 top-[calc(100%+10px)] z-50 w-[min(360px,calc(100vw-24px))] rounded-2xl border border-gray-200 bg-white p-2.5 shadow-[0_18px_50px_rgba(0,0,0,0.18)] dark:border-white/10 dark:bg-[#242424]">
									<DrawerMenuButton
										icon={<Pencil size={18} />}
										label="Edit merchant details"
										onClick={handleEditMerchantDetails}
										highlighted
									/>
									<DrawerMenuButton
										icon={<Repeat2 size={18} />}
										label="Mark merchant as recurring"
										onClick={() => {
											confirmRecurring(editedData.merchant);
											setIsMoreMenuOpen(false);
										}}
									/>
									<DrawerMenuButton
										icon={<Split size={18} />}
										label="Split transaction"
										onClick={() => {
											setShowSplitDialog(true);
											setIsMoreMenuOpen(false);
										}}
									/>
									<DrawerMenuButton
										icon={<Zap size={18} />}
										label="Create rule from transaction"
										onClick={() => {
											setIsMoreMenuOpen(false);
											onCreateRule(editedData);
										}}
									/>
									<DrawerMenuButton
										icon={<Copy size={18} />}
										label="Duplicate transaction"
										onClick={() => {
											void handleDuplicateTransaction();
										}}
									/>
									<DrawerMenuButton
										icon={<Trash2 size={18} />}
										label="Delete transaction"
										onClick={() => {
											setShowDeleteConfirm(true);
											setIsMoreMenuOpen(false);
										}}
										danger
									/>
								</div>
							)}
						</div>

						<button
							type="button"
							onClick={() => void requestClose()}
							className="grid size-11 place-items-center rounded-full text-gray-900 transition-colors hover:bg-gray-100 dark:text-white dark:hover:bg-white/10"
							aria-label="Close"
						>
							<X size={24} />
						</button>
					</div>
				</header>

				<div className="min-h-0 flex-1 overflow-y-auto px-5 pb-16 pt-6 sm:px-7">
					<div className="mb-6 flex items-start justify-between gap-5">
						<div className="grid size-20 shrink-0 place-items-center rounded-full bg-[#ff4f9a] text-4xl font-black text-white shadow-sm">
							{getMerchantInitial(editedData.merchant)}
						</div>

						<div className="min-w-0 text-right">
							<p className="truncate text-3xl font-semibold tracking-tight">
								{formatCurrency(Number(editedData.amount))}
							</p>
							<button
								type="button"
								onClick={() => {
									void handleOpenAccount();
								}}
								disabled={!selectedAccountId}
								className="mt-2 block max-w-full truncate text-base font-medium text-cyan-600 hover:underline disabled:cursor-default disabled:text-gray-500 disabled:no-underline dark:text-cyan-400 dark:disabled:text-gray-400"
							>
								{selectedAccountName || "No account"}
							</button>
						</div>
					</div>

					<div className="space-y-5">
						<DrawerField label="Merchant">
							<div
								onBlurCapture={() => {
									window.setTimeout(() => {
										void commitMerchant(
											editedData.merchant,
											editedData.merchant_id,
										);
									}, 0);
								}}
							>
								<MerchantSelect
									value={
										editedData.merchant.trim()
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

										void commitMerchant(merchant.name, merchant.id);
									}}
									placeholder="Search merchants or enter a new one"
									inputClassName="h-15 text-xl font-semibold"
								/>
							</div>

							{selectedMerchant?.id && (
								<button
									type="button"
									onClick={() => {
										router.push(
											`/merchants/${encodeURIComponent(selectedMerchant.id)}`,
										);
									}}
									className="mt-2 text-sm font-semibold text-cyan-600 hover:underline dark:text-cyan-400"
								>
									View {merchantTransactionCount} transaction
									{merchantTransactionCount === 1 ? "" : "s"}
								</button>
							)}
						</DrawerField>

						<DrawerField label="Amount">
							<div className="grid grid-cols-[1fr_auto] gap-2">
								<div className="relative">
									<span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
										$
									</span>
									<input
										type="text"
										inputMode="decimal"
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
										onBlur={() => void commitPendingTextFields()}
										className="h-13 w-full rounded-xl border border-gray-200 bg-white pl-8 pr-4 text-[15px] outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 dark:border-white/10 dark:bg-white/[0.03]"
									/>
								</div>
								<button
									type="button"
									onClick={() => {
										const nextDirection =
											direction === "debit" ? "credit" : "debit";
										const amount = Math.abs(Number(editedData.amount) || 0);
										setDirection(nextDirection);
										setEditedData((current) => ({
											...current,
											amount: nextDirection === "debit" ? -amount : amount,
										}));
									}}
									className="h-13 rounded-xl border border-gray-200 px-4 text-sm font-semibold hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5"
								>
									{direction === "debit" ? "Expense" : "Income"}
								</button>
							</div>
						</DrawerField>

						<DrawerField label="Original statement">
							<input
								type="text"
								value={editedData.description ?? ""}
								onChange={(event) => {
									setEditedData((current) => ({
										...current,
										description: event.target.value,
									}));
								}}
								onBlur={() => void commitPendingTextFields()}
								className="h-13 w-full rounded-xl border border-gray-200 bg-white px-4 text-[15px] outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 dark:border-white/10 dark:bg-white/[0.03]"
							/>
						</DrawerField>

						<DrawerField label="Date">
							<input
								type="date"
								value={editedData.date}
								onChange={(event) => {
									const date = event.target.value;
									setEditedData((current) => ({ ...current, date }));
									void persistUpdates({ date });
								}}
								className="h-13 w-full rounded-xl border border-gray-200 bg-white px-4 text-[15px] outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 dark:border-white/10 dark:bg-white/[0.03]"
							/>
						</DrawerField>

						<DrawerField label="Category">
							<div className="rounded-xl border border-gray-200 bg-white px-1 dark:border-white/10 dark:bg-white/[0.03]">
								<CategorySelector
									currentCategory={editedData.category || "Uncategorized"}
									variant="form"
									showChevron
									onSelect={(category) => {
										setEditedData((current) => ({ ...current, category }));
										void persistUpdates({ category });
									}}
								/>
							</div>
						</DrawerField>

						<DrawerField label="Account">
							<select
								value={editedData.account_id ?? ""}
								onChange={(event) => {
									const account = accounts.find(
										(item) => item.id === event.target.value,
									);
									if (!account) {
										return;
									}
									const updates = {
										account_id: account.id,
										account: account.name,
									};
									setEditedData((current) => ({ ...current, ...updates }));
									void persistUpdates(updates);
								}}
								className="h-13 w-full rounded-xl border border-gray-200 bg-white px-4 text-[15px] outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 dark:border-white/10 dark:bg-[#1c1c1c]"
							>
								<option value="">Select account</option>
								{accounts.map((account) => (
									<option key={account.id} value={account.id}>
										{account.name}
									</option>
								))}
							</select>
						</DrawerField>

						<DrawerField label="Notes">
							<textarea
								value={editedData.note ?? ""}
								onChange={(event) => {
									setEditedData((current) => ({
										...current,
										note: event.target.value,
									}));
								}}
								onBlur={() => void commitPendingTextFields()}
								placeholder="Add notes to this transaction…"
								className="min-h-24 w-full resize-y rounded-xl border border-gray-200 bg-white px-4 py-3 text-[15px] outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 dark:border-white/10 dark:bg-white/[0.03]"
							/>
						</DrawerField>

						<DrawerField label="Tags">
							<div className="space-y-2 rounded-xl border border-gray-200 bg-white p-3 dark:border-white/10 dark:bg-white/[0.03]">
								{(editedData.tags ?? []).length > 0 && (
									<div className="flex flex-wrap gap-2">
										{(editedData.tags ?? []).map((tag) => (
											<button
												type="button"
												key={tag}
												onClick={() => void toggleTag(tag)}
												className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/15"
											>
												<Tag size={13} />
												{tag}
												<X size={12} />
											</button>
										))}
									</div>
								)}

								<input
									type="text"
									value={tagQuery}
									placeholder="Search tags…"
									onFocus={() => setTagOpen(true)}
									onChange={(event) => {
										setTagQuery(event.target.value);
										setTagOpen(true);
									}}
									onKeyDown={(event) => {
										if (event.key === "Enter" && tagQuery.trim()) {
											event.preventDefault();
											void createAndAddTag();
										}
									}}
									className="h-10 w-full bg-transparent px-1 text-sm outline-none"
								/>

								{tagOpen && (availableTags.length > 0 || tagQuery.trim()) && (
									<div className="max-h-48 overflow-y-auto border-t border-gray-100 pt-2 dark:border-white/10">
										{availableTags.map((tag) => (
											<button
												type="button"
												key={tag}
												onClick={() => {
													void toggleTag(tag);
													setTagQuery("");
												}}
												className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-white/5"
											>
												<Tag size={15} />
												{tag}
											</button>
										))}

										{tagQuery.trim() && (
											<button
												type="button"
												onClick={() => void createAndAddTag()}
												className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-500/10"
											>
												<Plus size={15} />
												Create “{tagQuery.trim()}”
											</button>
										)}
									</div>
								)}
							</div>
						</DrawerField>

						<button
							type="button"
							onClick={() => setShowDeleteConfirm(true)}
							className="h-12 w-full rounded-xl border border-gray-200 text-sm font-semibold text-red-600 transition hover:bg-red-50 dark:border-white/10 dark:text-red-400 dark:hover:bg-red-500/10"
						>
							Delete transaction
						</button>
					</div>

					{saveError && (
						<div className="mt-5 flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
							<AlertCircle size={18} className="mt-0.5 shrink-0" />
							<span>{saveError}</span>
						</div>
					)}
				</div>

				{showDeleteConfirm && (
					<ConfirmationOverlay
						title="Delete transaction?"
						description="This permanently removes the transaction."
						confirmLabel="Delete transaction"
						danger
						pending={isActionPending}
						onCancel={() => setShowDeleteConfirm(false)}
						onConfirm={() => void handleDelete()}
					/>
				)}

				{showSplitDialog && (
					<div className="absolute inset-0 z-50 grid place-items-center bg-white/75 p-5 backdrop-blur-sm dark:bg-black/65">
						<div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-[#242424]">
							<h3 className="text-lg font-semibold">Split transaction</h3>
							<p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
								Enter the amount to keep on this transaction. The remainder
								becomes a second transaction.
							</p>
							<div className="relative mt-4">
								<span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
									$
								</span>
								<input
									type="text"
									inputMode="decimal"
									value={splitAmount}
									onChange={(event) => {
										const { displayString } = parseAmountInput(
											event.target.value,
										);
										setSplitAmount(displayString);
									}}
									className="h-12 w-full rounded-xl border border-gray-200 bg-white pl-8 pr-4 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 dark:border-white/10 dark:bg-white/5"
								/>
							</div>
							<div className="mt-5 flex justify-end gap-3">
								<button
									type="button"
									onClick={() => setShowSplitDialog(false)}
									className="h-10 rounded-xl border border-gray-200 px-4 text-sm font-semibold hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5"
								>
									Cancel
								</button>
								<button
									type="button"
									disabled={isActionPending}
									onClick={() => void handleSplitTransaction()}
									className="inline-flex h-10 items-center gap-2 rounded-xl bg-orange-600 px-4 text-sm font-semibold text-white hover:bg-orange-500 disabled:opacity-60"
								>
									{isActionPending && (
										<Loader2 size={15} className="animate-spin" />
									)}
									Split
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

function DrawerField({
	label,
	children,
}: {
	label: string;
	children: ReactNode;
}) {
	return (
		<div>
			<label className="mb-2 block text-sm font-semibold">{label}</label>
			{children}
		</div>
	);
}

function DrawerMenuButton({
	icon,
	label,
	onClick,
	highlighted = false,
	danger = false,
}: {
	icon: ReactNode;
	label: string;
	onClick: () => void;
	highlighted?: boolean;
	danger?: boolean;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-[15px] transition-colors ${
				danger
					? "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
					: highlighted
						? "bg-gray-100 text-gray-950 hover:bg-gray-200 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
						: "text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-white/10"
			}`}
		>
			<span className="shrink-0">{icon}</span>
			<span>{label}</span>
		</button>
	);
}

function ConfirmationOverlay({
	title,
	description,
	confirmLabel,
	danger,
	pending,
	onCancel,
	onConfirm,
}: {
	title: string;
	description: string;
	confirmLabel: string;
	danger?: boolean;
	pending: boolean;
	onCancel: () => void;
	onConfirm: () => void;
}) {
	return (
		<div className="absolute inset-0 z-50 grid place-items-center bg-white/75 p-5 backdrop-blur-sm dark:bg-black/65">
			<div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-[#242424]">
				<h3 className="text-lg font-semibold">{title}</h3>
				<p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
					{description}
				</p>
				<div className="mt-5 flex justify-end gap-3">
					<button
						type="button"
						onClick={onCancel}
						disabled={pending}
						className="h-10 rounded-xl border border-gray-200 px-4 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50 dark:border-white/10 dark:hover:bg-white/5"
					>
						Cancel
					</button>
					<button
						type="button"
						onClick={onConfirm}
						disabled={pending}
						className={`inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-white disabled:opacity-60 ${
							danger
								? "bg-red-600 hover:bg-red-500"
								: "bg-orange-600 hover:bg-orange-500"
						}`}
					>
						{pending && <Loader2 size={15} className="animate-spin" />}
						{confirmLabel}
					</button>
				</div>
			</div>
		</div>
	);
}
