/**
 * @file useTransactionForm.ts
 * @description Custom hook that manages all state and persistence logic for a single transaction edit form.
 * Handles loading, saving, validation, splitting, deletion, and merchant/tag updates.
 */
import { useCallback, useMemo, useRef, useState } from "react";
import { useBudgetStore, Transaction } from "@/store/useBudgetStore";
import { getInitialDisplayAmount } from "@/utils/formatters";

type TransactionDirection = "debit" | "credit";
type SaveStatus = "idle" | "saving" | "saved" | "error";

function normalize(value: string): string {
	return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function cloneTransaction(transaction: Transaction): Transaction {
	return {
		...transaction,
		tags: [...(transaction.tags ?? [])],
	};
}

export function useTransactionForm(initialTransaction: Transaction) {
	const updateTransaction = useBudgetStore((state) => state.updateTransaction);
	const deleteTransaction = useBudgetStore((state) => state.deleteTransaction);
	const createTransaction = useBudgetStore((state) => state.createTransaction);
	const addCustomMerchant = useBudgetStore((state) => state.addCustomMerchant);
	const addCustomTag = useBudgetStore((state) => state.addCustomTag);
	const merchants = useBudgetStore((state) => state.merchants);
	const accounts = useBudgetStore((state) => state.accounts);
	const customTags = useBudgetStore((state) => state.customTags);
	const transactions = useBudgetStore((state) => state.transactions);

	const [editedData, setEditedData] = useState<Transaction>(() =>
		cloneTransaction(initialTransaction),
	);
	const [savedData, setSavedData] = useState<Transaction>(() =>
		cloneTransaction(initialTransaction),
	);
	const [direction, setDirection] = useState<TransactionDirection>(
		initialTransaction.amount >= 0 ? "credit" : "debit",
	);
	const [displayAmount, setDisplayAmount] = useState(() =>
		getInitialDisplayAmount(Math.abs(initialTransaction.amount)),
	);
	const [tagQuery, setTagQuery] = useState("");
	const [tagOpen, setTagOpen] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);
	const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
	const [isActionPending, setIsActionPending] = useState(false);

	const saveStatusTimerRef = useRef<number | null>(null);

	const showSavedStatus = useCallback(() => {
		setSaveStatus("saved");
		if (saveStatusTimerRef.current) {
			window.clearTimeout(saveStatusTimerRef.current);
		}
		saveStatusTimerRef.current = window.setTimeout(() => {
			setSaveStatus("idle");
		}, 1800);
	}, []);

	const persistUpdates = useCallback(
		async (updates: Partial<Transaction>) => {
			if (Object.keys(updates).length === 0) return;
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
			let resolvedMerchantId = merchantId ?? null;
			// check if merchant exists by exact name
			const exactMerchant = merchants.find(
				(m) => normalize(m.name) === normalize(cleanName),
			);
			resolvedMerchantId = exactMerchant?.id ?? resolvedMerchantId;

			try {
				if (!resolvedMerchantId) {
					const created = await addCustomMerchant(cleanName);
					resolvedMerchantId = created.id;
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
			merchants,
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

	const toggleTag = useCallback(
		async (tagName: string) => {
			const cleanTag = tagName.trim();
			if (!cleanTag) return;
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
				// rollback handled in persistUpdates
			}
		},
		[editedData.tags, persistUpdates],
	);

	const createAndAddTag = useCallback(async () => {
		const cleanTag = tagQuery.trim();
		if (!cleanTag) return;
		addCustomTag(cleanTag);
		await toggleTag(cleanTag);
		setTagQuery("");
		setTagOpen(false);
	}, [addCustomTag, tagQuery, toggleTag]);

	const handleMarkReviewed = useCallback(async () => {
		if (!editedData.needs_review || isActionPending) return;
		setEditedData((current) => ({ ...current, needs_review: false }));
		try {
			await persistUpdates({ needs_review: false });
		} catch {
			// rollback handled
		}
	}, [editedData.needs_review, isActionPending, persistUpdates]);

	const handleToggleHidden = useCallback(async () => {
		if (isActionPending) return;
		const previousHidden = Boolean(editedData.is_hidden);
		const nextHidden = !previousHidden;
		setIsActionPending(true);
		setSaveError(null);
		setEditedData((current) => ({ ...current, is_hidden: nextHidden }));
		setSavedData((current) => ({ ...current, is_hidden: nextHidden }));
		try {
			await updateTransaction(editedData.id, { is_hidden: nextHidden });
		} catch (error) {
			setEditedData((current) => ({ ...current, is_hidden: previousHidden }));
			setSavedData((current) => ({ ...current, is_hidden: previousHidden }));
			setSaveError(
				error instanceof Error
					? error.message
					: "Failed to update transaction visibility.",
			);
		} finally {
			setIsActionPending(false);
		}
	}, [editedData.id, editedData.is_hidden, isActionPending, updateTransaction]);

	const handleSplitTransaction = useCallback(
		async (splitAmount: string): Promise<void> => {
			if (isActionPending) return;
			const firstAmount = Number(splitAmount.replace(/,/g, ""));
			const totalAmount = Math.abs(Number(editedData.amount));
			const secondAmount = totalAmount - firstAmount;
			if (
				!Number.isFinite(firstAmount) ||
				firstAmount <= 0 ||
				secondAmount <= 0
			) {
				throw new Error("Enter a split amount above $0 and below the total.");
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
				throw error;
			} finally {
				setIsActionPending(false);
			}
		},
		[
			createTransaction,
			deleteTransaction,
			editedData,
			isActionPending,
			persistUpdates,
		],
	);

	const handleDelete = useCallback(async (): Promise<void> => {
		if (isActionPending) return;
		setIsActionPending(true);
		setSaveError(null);
		try {
			await deleteTransaction(editedData.id);
		} catch (error) {
			setSaveError(
				error instanceof Error
					? error.message
					: "Failed to delete transaction.",
			);
			throw error;
		} finally {
			setIsActionPending(false);
		}
	}, [deleteTransaction, editedData.id, isActionPending]);

	const selectedMerchant = useMemo(() => {
		if (editedData.merchant_id) {
			const byId = merchants.find((m) => m.id === editedData.merchant_id);
			if (byId) return byId;
		}
		return merchants.find(
			(m) => normalize(m.name) === normalize(editedData.merchant),
		);
	}, [editedData.merchant, editedData.merchant_id, merchants]);

	const merchantTransactionCount = useMemo(() => {
		const normalizedMerchantName = normalize(editedData.merchant);
		if (!normalizedMerchantName) return 0;

		const merchantId = selectedMerchant?.id ?? null;

		return transactions.reduce((count, item) => {
			const matchesMerchantId =
				Boolean(merchantId && item.merchant_id) &&
				item.merchant_id === merchantId;

			const matchesMerchantName =
				normalize(item.merchant) === normalizedMerchantName;

			return matchesMerchantId || (!item.merchant_id && matchesMerchantName)
				? count + 1
				: count;
		}, 0);
	}, [editedData.merchant, selectedMerchant, transactions]);

	const availableTags = useMemo(() => {
		const selected = new Set((editedData.tags ?? []).map((t) => normalize(t)));
		const query = normalize(tagQuery);
		return customTags
			.filter((tag) => {
				const normalizedTag = normalize(tag);
				return (
					!selected.has(normalizedTag) &&
					(!query || normalizedTag.includes(query))
				);
			})
			.slice(0, 10);
	}, [customTags, editedData.tags, tagQuery]);

	const selectedAccount = useMemo(() => {
		return accounts.find((a) => a.id === editedData.account_id);
	}, [accounts, editedData.account_id]);

	return {
		// State
		editedData,
		savedData,
		direction,
		displayAmount,
		tagQuery,
		tagOpen,
		saveError,
		saveStatus,
		isActionPending,
		selectedMerchant,
		merchantTransactionCount,
		availableTags,
		selectedAccount,
		isTransactionHidden: Boolean(editedData.is_hidden),

		// Setters
		setEditedData,
		setDirection,
		setDisplayAmount,
		setTagQuery,
		setTagOpen,
		setSaveError,

		// Actions
		persistUpdates,
		commitMerchant,
		commitPendingTextFields,
		toggleTag,
		createAndAddTag,
		handleMarkReviewed,
		handleToggleHidden,
		handleSplitTransaction,
		handleDelete,
		requestClose: commitPendingTextFields, // aliased for drawer close
	};
}
