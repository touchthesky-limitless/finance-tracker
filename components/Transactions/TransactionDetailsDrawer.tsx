"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";

import { useBudgetStore } from "@/store/useBudgetStore";
import { useTransactionForm } from "@/hooks/transactions/useTransactionForm";
import { useDrawerKeydown } from "@/hooks/transactions/useDrawerKeydown";
import { formatCurrency, getInitialDisplayAmount } from "@/utils/formatters";

import { TransactionDrawerHeader } from "@/components/Transactions/Drawer/TransactionDrawerHeader";
import { TransactionDrawerForm } from "@/components/Transactions/Drawer/TransactionDrawerForm";
import { TransactionDrawerSplitDialog } from "@/components/Transactions/Drawer/TransactionDrawerSplitDialog";
import { ConfirmationOverlay } from "@/components/Transactions/Drawer/DrawerHelpers";
import { type Transaction } from "@/store/useBudgetStore";

interface TransactionDetailsDrawerProps {
	transaction: Transaction;
	isOpen: boolean;
	onClose: () => void;
	onDeleted: (count: number) => void;
	onDuplicate: (transaction: Transaction) => void | Promise<void>;
	onCreateRule: (transaction: Transaction) => void;
	onBack?: () => void;
}

export default function TransactionDetailsDrawer({
	transaction,
	isOpen,
	onClose,
	onDeleted,
	onDuplicate,
	onCreateRule,
	onBack,
}: TransactionDetailsDrawerProps) {
	const router = useRouter();
	const accounts = useBudgetStore((state) => state.accounts);
	const merchants = useBudgetStore((state) => state.merchants);

	const form = useTransactionForm(transaction);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [showSplitDialog, setShowSplitDialog] = useState(false);
	const [splitAmount, setSplitAmount] = useState(() =>
		getInitialDisplayAmount(Math.abs(transaction.amount) / 2),
	);

	useDrawerKeydown({
		isOpen,
		showDeleteConfirm,
		setShowDeleteConfirm,
		showSplitDialog,
		setShowSplitDialog,
		isMoreMenuOpen: false,
		setIsMoreMenuOpen: () => {},
		tagOpen: form.tagOpen,
		setTagOpen: form.setTagOpen,
		onClose: () =>
			form
				.requestClose()
				.then(onClose)
				.catch(() => {}),
	});

	const handleRequestClose = useCallback(() => {
		if (form.isActionPending || form.saveStatus === "saving") return;
		form
			.requestClose()
			.then(onClose)
			.catch(() => {});
	}, [form, onClose]);

const bodyOverflowSet = useRef(false);

useEffect(() => {
  if (!isOpen) return;

  // If StrictMode runs this twice, we skip the second one
  if (bodyOverflowSet.current) return;
  bodyOverflowSet.current = true;

  const previousOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";

  return () => {
    document.body.style.overflow = previousOverflow;
    bodyOverflowSet.current = false; // Reset only when actually closed
  };
}, [isOpen]);

	if (!isOpen || typeof document === "undefined") return null;

	return createPortal(
		<div className="fixed inset-0 z-[100]" role="presentation">
			<button
				onClick={handleRequestClose}
				className="absolute inset-0 bg-black/35 backdrop-blur-[1px] dark:bg-black/70"
			/>

			<section className="absolute inset-y-0 right-0 flex h-dvh w-full max-w-[720px] animate-in flex-col overflow-hidden border-l border-black/10 bg-white text-gray-900 shadow-[-24px_0_70px_rgba(0,0,0,0.20)] slide-in-from-right duration-300 dark:border-white/10 dark:bg-[#171717] dark:text-white">
				<TransactionDrawerHeader
					onBack={onBack}
					needsReview={form.editedData.needs_review}
					isActionPending={form.isActionPending}
					isHidden={form.isTransactionHidden}
					onMarkReviewed={form.handleMarkReviewed}
					onToggleHidden={form.handleToggleHidden}
					onClose={handleRequestClose}
					onCreateRule={() => onCreateRule(form.editedData)}
					onEditMerchant={() => {
						const id = form.selectedMerchant?.id;
						if (!id) {
							form.setSaveError("Select a saved merchant.");
							return;
						}
						router.push(`/merchants/${encodeURIComponent(id)}`);
					}}
					onMarkRecurring={() =>
						useBudgetStore
							.getState()
							.confirmRecurring(form.editedData.merchant.trim())
					}
					onSplit={() => setShowSplitDialog(true)}
					onDuplicate={() => {
						form.commitPendingTextFields().then(() => {
							const abs = Math.abs(Number(form.editedData.amount) || 0);
							const dup = {
								...form.editedData,
								id: crypto.randomUUID(),
								amount: form.direction === "debit" ? -abs : abs,
							};
							onDuplicate(dup);
						});
					}}
					onDelete={() => setShowDeleteConfirm(true)}
					saveStatus={form.saveStatus}
				/>

				{/* ✅ Restored Avatar and Amount Section */}
				<div className="px-5 pt-6 pb-2 sm:px-7">
					<div className="mb-6 flex items-start justify-between gap-5">
						<div className="grid size-20 shrink-0 place-items-center rounded-full bg-[#ff4f9a] text-4xl font-black text-white shadow-sm">
							{form.editedData.merchant.trim().charAt(0).toUpperCase() || "?"}
						</div>

						<div className="min-w-0 text-right">
							<p className="truncate text-3xl font-semibold tracking-tight">
								{formatCurrency(Number(form.editedData.amount))}
							</p>
							<button
								type="button"
								onClick={() => {
									const accountId = form.selectedAccount?.id;
									if (accountId) {
										router.push(
											`/accounts/details/${encodeURIComponent(accountId)}`,
										);
									}
								}}
								disabled={!form.selectedAccount?.id}
								className="mt-2 block max-w-full truncate text-base font-medium text-cyan-600 hover:underline disabled:cursor-default disabled:text-gray-500 disabled:no-underline dark:text-cyan-400 dark:disabled:text-gray-400"
							>
								{form.selectedAccount?.name ||
									form.editedData.account ||
									"No account"}
							</button>
						</div>
					</div>
				</div>

				<div className="min-h-0 flex-1 overflow-y-auto px-5 pb-16 pt-6 sm:px-7">
					<TransactionDrawerForm
						editedData={form.editedData}
						direction={form.direction}
						displayAmount={form.displayAmount}
						tagQuery={form.tagQuery}
						tagOpen={form.tagOpen}
						selectedAccountName={
							form.selectedAccount?.name ?? form.editedData.account
						}
						// ✅ Restored Merchant view link props
						selectedMerchantId={form.selectedMerchant?.id ?? null}
						merchantTransactionCount={form.merchantTransactionCount}
						onViewMerchant={() => {
							if (form.selectedMerchant) {
								router.push(
									`/merchants/${encodeURIComponent(form.selectedMerchant.id)}`,
								);
							}
						}}
						availableTags={form.availableTags}
						accounts={accounts}
						merchants={merchants}
						onMerchantChange={(m) => {
							form.setEditedData((d) => ({
								...d,
								merchant: m.name,
								merchant_id: m.id,
							}));
							form.commitMerchant(m.name, m.id);
						}}
						onMerchantInputChange={(n) => {
							const match = merchants.find(
								(m) => m.name.toLowerCase() === n.trim().toLowerCase(),
							);
							form.setEditedData((d) => ({
								...d,
								merchant: n,
								merchant_id: match?.id ?? null,
							}));
						}}
						onAmountChange={(display, num) => {
							form.setDisplayAmount(display);
							form.setEditedData((d) => ({
								...d,
								amount:
									form.direction === "debit" ? -Math.abs(num) : Math.abs(num),
							}));
						}}
						onDirectionToggle={() => {
							const amt = Math.abs(Number(form.editedData.amount) || 0);
							const next = form.direction === "debit" ? "credit" : "debit";
							form.setDirection(next);
							form.setEditedData((d) => ({
								...d,
								amount: next === "debit" ? -amt : amt,
							}));
						}}
						onFieldUpdate={(u) => {
							form.setEditedData((d) => ({ ...d, ...u }));
							if (u.date) form.persistUpdates(u);
						}}
						onTagToggle={form.toggleTag}
						onCreateTag={form.createAndAddTag}
						onTagQueryChange={form.setTagQuery}
						onTagOpenToggle={form.setTagOpen}
						onCommit={form.commitPendingTextFields}
					/>

					{/* ✅ Restored Delete transaction button */}
					<button
						type="button"
						onClick={() => setShowDeleteConfirm(true)}
						className="mt-6 h-12 w-full rounded-xl border border-gray-200 text-sm font-semibold text-red-600 transition hover:bg-red-50 dark:border-white/10 dark:text-red-400 dark:hover:bg-red-500/10"
					>
						Delete transaction
					</button>

					{form.saveError && (
						<div className="mt-5 flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
							<AlertCircle size={18} className="mt-0.5 shrink-0" />
							<span>{form.saveError}</span>
						</div>
					)}
				</div>
			</section>

			<TransactionDrawerSplitDialog
				isOpen={showSplitDialog}
				amount={splitAmount}
				isPending={form.isActionPending}
				onAmountChange={setSplitAmount}
				onCancel={() => setShowSplitDialog(false)}
				onConfirm={() =>
					form
						.handleSplitTransaction(splitAmount)
						.then(() => setShowSplitDialog(false))
						.catch((e) => form.setSaveError(e.message))
				}
			/>

			{showDeleteConfirm && (
				<ConfirmationOverlay
					title="Delete transaction?"
					description="This permanently removes the transaction."
					confirmLabel="Delete transaction"
					danger
					pending={form.isActionPending}
					onCancel={() => setShowDeleteConfirm(false)}
					onConfirm={() =>
						form.handleDelete().then(() => {
							setShowDeleteConfirm(false);
							onDeleted(1);
							onClose();
						})
					}
				/>
			)}
		</div>,
		document.body,
	);
}
