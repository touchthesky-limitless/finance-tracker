/**
 * @file TransactionsPageClient.tsx
 * @description The main client-side orchestration component for the Transactions page.
 * All heavy logic is extracted into custom hooks, keeping this file focused on composition.
 * Features: table with sorting/visibility, filters, selection, summary, bulk edit, CSV upload,
 * transaction details drawer, add/duplicate transaction, rule suggestion toast, and RuleModal.
 */
"use client";

import {
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";
import dynamic from "next/dynamic";
import { X } from "lucide-react";

// Store
import {
	type Merchant,
	type Transaction,
	useBudgetStore,
} from "@/store/useBudgetStore";
import { useTransactionToastStore } from "@/store/useTransactionToastStore";
import { useTransactionDrawer } from "@/store/useTransactionDrawer";

// Components
import { DataTable } from "@/components/Transactions/DataTable";
import { UndoToast } from "@/components/ui/UndoToast";
import CsvUploader from "@/components/CsvUploader";
import {
	TopToolbar,
	TransactionDateRange,
} from "@/components/Transactions/TopToolbar";
import { TableToolbar } from "@/components/Transactions/TableToolbar";
import { SummarySidebar } from "@/components/Transactions/SummarySidebar";
import {
	EMPTY_TRANSACTION_FILTERS,
	TransactionFilters,
} from "@/components/Transactions/transactionFilters";
import type { RuleModalSeed } from "@/components/Transactions/RuleModal";

import type { TransactionRule } from "@/lib/rules/ruleEngine";

import BulkEditTransactionsDrawer from "@/components/Transactions/BulkEditTransactionsDrawer";
import { MerchantRuleToast } from "@/components/Transactions/MerchantRuleToast";

// Hooks & Utils
import { useTransactionsSorting } from "@/hooks/transactions/useTransactionsSorting";
import { useTransactionsColumnVisibility } from "@/hooks/transactions/useTransactionsColumnVisibility";
import { useTransactionsSelection } from "@/hooks/transactions/useTransactionsSelection";
import { useTransactionsData } from "@/hooks/transactions/useTransactionsData";
import { useTransactionsSummary } from "@/hooks/transactions/useTransactionsSummary";
import { useTransactionsFilters } from "@/hooks/transactions/useTransactionsFilters";
import {
	createBlankTransaction,
	normalizeMerchantName,
} from "@/utils/transactionUtils";
import { useMerchantOptions } from "@/hooks/useMerchantOptions";

// Lazy-loaded modals
const AddTransactionModal = dynamic(
	() => import("@/components/Budget/AddTransactionModal"),
	{ ssr: false },
);
const TransactionDetailsDrawer = dynamic(
	() => import("@/components/Transactions/TransactionDetailsDrawer"),
	{ ssr: false },
);
const RuleModal = dynamic(
	() => import("@/components/Transactions/RuleModal").then((m) => m.RuleModal),
	{ ssr: false },
);

interface TransactionsPageClientProps {
	initialTransactionId?: string;
}

export default function TransactionsPageClient({
	initialTransactionId,
}: TransactionsPageClientProps) {

	// ---- Global stores ----
	const transactions = useBudgetStore((state) => state.transactions);
	const updateTransaction = useBudgetStore((state) => state.updateTransaction);
	const setToast = useBudgetStore((state) => state.setToast);
	const toast = useBudgetStore((state) => state.toast);
	const customTags = useBudgetStore((state) => state.customTags);
	const merchants = useBudgetStore((state) => state.merchants);
	const accounts = useBudgetStore((state) => state.accounts);
	const saveRule = useBudgetStore((state) => state.saveRule);
	const deleteRule = useBudgetStore((state) => state.deleteRule);
	const confirmedRecurringMerchants = useBudgetStore(
		(state) => state.confirmedRecurringMerchants,
	);
	const reportDeletedTransactions = useTransactionToastStore(
		(state) => state.reportDeletedTransactions,
	);
	const selectedTransactionId = useTransactionDrawer(
		(state) => state.selectedTransactionId,
	);
	const openDrawer = useTransactionDrawer((state) => state.openDrawer);
	const closeDrawer = useTransactionDrawer((state) => state.closeDrawer);
	const onBack = useTransactionDrawer((state) => state.onBack);

	// ---- Local state (not yet extracted) ----
	const [searchQuery, setSearchQuery] = useState("");
	const [dateRange, setDateRange] = useState<TransactionDateRange>({
		startDate: "",
		endDate: "",
	});
	const [transactionFilters, setTransactionFilters] =
		useState<TransactionFilters>(EMPTY_TRANSACTION_FILTERS);
	const [currentView, setCurrentView] = useState<"all" | "review">("all");
	const [isSummaryVisible, setIsSummaryVisible] = useState(false);
	const [showUploader, setShowUploader] = useState(false);
	const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
	const [addTransactionState, setAddTransactionState] = useState<{
		mode: "new" | "duplicate";
		transaction: Transaction;
	} | null>(null);

	// ---- Rule suggestion state ----
	const [transactionRuleSuggestion, setTransactionRuleSuggestion] = useState<{
		type: "merchant" | "category";
		transaction: Transaction;
		merchant?: Pick<Merchant, "id" | "name">;
		category?: string;
	} | null>(null);
	const [ruleModalState, setRuleModalState] = useState<{
		rule?: TransactionRule | null;
		seed?: RuleModalSeed | null;
	} | null>(null);

	// ---- Custom hooks ----
	const [sorting, setSorting] = useTransactionsSorting();
	const [columnVisibility, setColumnVisibility] =
		useTransactionsColumnVisibility();
	const {
		selectedIds,
		setSelectedIds,
		isEditMode,
		setIsEditMode,
		handleSelectRow,
	} = useTransactionsSelection();
	const {
		isLoading: isDataLoading,
		filterData,
		getSubcategoryId,
	} = useTransactionsData();
	const summaryStats = useTransactionsSummary(transactions);
	const merchantItems = useMerchantOptions();

	// ---- Derived data ----
	const normalizedRecurringMerchants = useMemo(
		() =>
			new Set(confirmedRecurringMerchants.map((m) => m.trim().toLowerCase())),
		[confirmedRecurringMerchants],
	);

	const { filteredTransactions, hasActiveFilters } = useTransactionsFilters(
		transactions,
		searchQuery,
		dateRange,
		transactionFilters,
		normalizedRecurringMerchants,
		currentView,
	);

	const selectedTransactions = useMemo(() => {
		const selectedIdSet = new Set(selectedIds);
		return transactions.filter((tx) => selectedIdSet.has(tx.id));
	}, [selectedIds, transactions]);

	const selectedTransaction = useMemo(() => {
		if (!selectedTransactionId) return null;
		return transactions.find((tx) => tx.id === selectedTransactionId) ?? null;
	}, [selectedTransactionId, transactions]);

	const ruleCategoryNames = useMemo(() => {
		return filterData.categories
			.filter((option) => !option.isParent)
			.map((option) => option.value);
	}, [filterData.categories]);

	// ---- Deep‑link support ----
	useEffect(() => {
		if (initialTransactionId) {
			openDrawer(initialTransactionId);
		}
	}, [initialTransactionId, openDrawer]);

	// ---- Handlers ----
	const handleRowClick = useCallback(
		(transaction: Transaction) => openDrawer(transaction.id),
		[openDrawer],
	);

	const handleOpenBulkEdit = useCallback(() => {
		if (selectedIds.length === 0) return;
		setIsBulkEditOpen(true);
	}, [selectedIds.length]);

	const handleDeleted = useCallback(
		(count: number) => {
			reportDeletedTransactions(count);
			closeDrawer();
		},
		[closeDrawer, reportDeletedTransactions],
	);

	const handleDuplicate = useCallback(
		(transaction: Transaction) => {
			setAddTransactionState({
				mode: "duplicate",
				transaction: {
					...transaction,
					id: crypto.randomUUID(),
					created_at: undefined,
					user_id: undefined,
					is_hidden: false,
					tags: [...(transaction.tags ?? [])],
				},
			});
			closeDrawer();
		},
		[closeDrawer],
	);

	const handleCreateRule = useCallback(
		(transaction: Transaction) => {
			setRuleModalState({
				seed: { sourceTransaction: transaction },
			});
			closeDrawer();
		},
		[closeDrawer],
	);

	const handleClearAll = useCallback(() => {
		setSearchQuery("");
		setCurrentView("all");
		setSorting([{ id: "date", desc: true }]);
		setColumnVisibility({});
		setDateRange({ startDate: "", endDate: "" });
		setTransactionFilters(EMPTY_TRANSACTION_FILTERS);
	}, [setSorting, setColumnVisibility]);

	const openAddTransaction = useCallback(() => {
		setAddTransactionState({
			mode: "new",
			transaction: createBlankTransaction(),
		});
	}, []);

	// ---- Merchant & Category changes with rule suggestion ----
	const handleMerchantChange = useCallback(
		async (transactionId: string, merchant: Pick<Merchant, "id" | "name">) => {
			const original = transactions.find((tx) => tx.id === transactionId);
			if (!original) return;
			const isSame = original.merchant_id
				? original.merchant_id === merchant.id
				: normalizeMerchantName(original.merchant) ===
					normalizeMerchantName(merchant.name);
			if (isSame) return;
			await updateTransaction(transactionId, {
				merchant: merchant.name,
				merchant_id: merchant.id,
			});
			setTransactionRuleSuggestion({
				type: "merchant",
				transaction: original,
				merchant,
			});
		},
		[transactions, updateTransaction],
	);

	const handleCategoryChange = useCallback(
		async (transactionId: string, newCategory: string) => {
			const original = transactions.find((tx) => tx.id === transactionId);
			if (!original) return;
			if (original.category.trim() === newCategory.trim()) return;
			await updateTransaction(transactionId, { category: newCategory });
			setTransactionRuleSuggestion({
				type: "category",
				transaction: original,
				category: newCategory,
			});
		},
		[transactions, updateTransaction],
	);


console.log('Page: isDataLoading =', isDataLoading);

	return (
		<div className="flex flex-col h-screen font-sans bg-gray-50 dark:bg-[#121212] text-gray-900 dark:text-gray-200 transition-colors duration-200">
			<TopToolbar
				searchQuery={searchQuery}
				setSearchQuery={setSearchQuery}
				dateRange={dateRange}
				setDateRange={setDateRange}
				setShowUploader={setShowUploader}
				onAddTransaction={openAddTransaction}
				isSummaryVisible={isSummaryVisible}
				setIsSummaryVisible={setIsSummaryVisible}
				hasActiveFilters={hasActiveFilters}
				onClearAll={handleClearAll}
				filters={transactionFilters}
				filterData={filterData}
				onFiltersChange={setTransactionFilters}
				showAddTransaction
			/>

			<div className="flex flex-1 min-h-0 overflow-hidden md:gap-6 flex-col md:flex-row-reverse">
				<SummarySidebar
					isVisible={isSummaryVisible}
					stats={summaryStats}
					className="w-full md:w-80 shrink-0"
				/>

				<div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#191919] border border-gray-200 dark:border-white/5 shadow-sm overflow-hidden transition-colors duration-200">
					<TableToolbar
						isEditMode={isEditMode}
						setIsEditMode={setIsEditMode}
						selectedIds={selectedIds}
						setSelectedIds={setSelectedIds}
						visibleTransactionIds={filteredTransactions.map((tx) => tx.id)}
						currentView={currentView}
						setCurrentView={setCurrentView}
						filteredLength={filteredTransactions.length}
						sorting={sorting}
						setSorting={setSorting}
						columnVisibility={columnVisibility}
						setColumnVisibility={setColumnVisibility}
						onEditMultiple={handleOpenBulkEdit}
						showAddTransaction={false}
					/>

					<div className="flex-1 overflow-hidden relative">
						<DataTable
							isLoading={isDataLoading}
							transactions={filteredTransactions}
							selectedIds={selectedIds}
							merchantItems={merchantItems}
							onSelectRow={handleSelectRow}
							onRowClick={handleRowClick}
							onMerchantChange={handleMerchantChange}
							columnVisibility={columnVisibility}
							isEditMode={isEditMode}
							currentView={currentView}
							sorting={sorting}
							onCategoryChange={handleCategoryChange}
							getCategoryId={getSubcategoryId}
							navigationSource="transactions"
						/>
					</div>
				</div>
			</div>

			{/* CSV Uploader */}
			{showUploader && (
				<div className="fixed inset-0 z-100 flex items-center justify-center p-4">
					<button
						type="button"
						aria-label="Close CSV uploader"
						className="absolute inset-0 bg-black/60 backdrop-blur-md transform-gpu"
						onClick={() => setShowUploader(false)}
					/>
					<div className="relative bg-white dark:bg-[#121212] border border-gray-200 dark:border-white/10 w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden">
						<div className="p-6 border-b border-gray-200 dark:border-white/5 flex justify-between items-center">
							<h3 className="text-lg font-black tracking-tight text-gray-900 dark:text-white">
								Import CSV Statement
							</h3>
							<button
								type="button"
								aria-label="Close CSV uploader"
								onClick={() => setShowUploader(false)}
								className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors"
							>
								<X size={20} />
							</button>
						</div>
						<div className="p-8">
							<CsvUploader onComplete={() => setShowUploader(false)} />
						</div>
					</div>
				</div>
			)}

			{/* Transaction Details Drawer */}
			{selectedTransaction && (
				<TransactionDetailsDrawer
					key={selectedTransaction.id}
					transaction={selectedTransaction}
					isOpen={!!selectedTransactionId}
					onClose={closeDrawer}
					onBack={onBack}
					onDeleted={handleDeleted}
					onDuplicate={handleDuplicate}
					onCreateRule={handleCreateRule}
				/>
			)}

			{/* Add / Duplicate Transaction Modal */}
			{addTransactionState && (
				<AddTransactionModal
					key={`${addTransactionState.mode}:${addTransactionState.transaction.id}`}
					initialTransaction={addTransactionState.transaction}
					isOpen
					allowDuplicate={addTransactionState.mode === "duplicate"}
					onClose={() => setAddTransactionState(null)}
					onCreated={() => setAddTransactionState(null)}
				/>
			)}

			{/* Rule Suggestion Toast */}
			{transactionRuleSuggestion && (
				<MerchantRuleToast
					key={[
						transactionRuleSuggestion.type,
						transactionRuleSuggestion.transaction.id,
						transactionRuleSuggestion.type === "merchant"
							? transactionRuleSuggestion.merchant?.id
							: transactionRuleSuggestion.category,
					].join(":")}
					show
					variant={transactionRuleSuggestion.type}
					updatedValue={
						transactionRuleSuggestion.type === "merchant"
							? transactionRuleSuggestion.merchant!.name
							: transactionRuleSuggestion.category!
					}
					onDismiss={() => setTransactionRuleSuggestion(null)}
					onCreateRule={() => {
						if (transactionRuleSuggestion.type === "merchant") {
							setRuleModalState({
								seed: {
									sourceTransaction: transactionRuleSuggestion.transaction,
									renameMerchant: transactionRuleSuggestion.merchant!,
								},
							});
						} else {
							setRuleModalState({
								seed: {
									sourceTransaction: transactionRuleSuggestion.transaction,
									updateCategory: transactionRuleSuggestion.category!,
								},
							});
						}
						setTransactionRuleSuggestion(null);
					}}
				/>
			)}

			{/* Rule Modal */}
			{ruleModalState && (
				<RuleModal
					key={
						ruleModalState.rule?.id ??
						[
							"new",
							ruleModalState.seed?.sourceTransaction?.id ?? "",
							ruleModalState.seed?.renameMerchant?.id ?? "",
							ruleModalState.seed?.updateCategory ?? "",
						].join(":")
					}
					isOpen
					initialRule={ruleModalState.rule ?? null}
					seed={ruleModalState.seed ?? null}
					transactions={transactions}
					accounts={accounts}
					merchants={merchants}
					categories={ruleCategoryNames}
					tags={customTags}
					onClose={() => setRuleModalState(null)}
					onSave={async (rule, options) => {
						const result = await saveRule(rule, options.applyToExisting);
						if (result.count > 0) {
							setToast({
								count: result.count,
								snapshot: result.snapshot,
							});
						}
					}}
					onDelete={async (rule) => {
						await deleteRule(rule.id);
					}}
				/>
			)}

			{/* Undo Toast for bulk updates */}
			{toast && (
				<UndoToast
					show={true}
					message={`Updated ${toast.count} transactions`}
					onUndo={() => {
						useBudgetStore.getState().undoBulkUpdate(toast.snapshot);
						setToast(null);
					}}
					onClose={() => setToast(null)}
				/>
			)}

			{/* Bulk Edit Drawer */}
			{isBulkEditOpen && (
				<BulkEditTransactionsDrawer
					key={selectedIds.slice().sort().join(":")}
					transactions={selectedTransactions}
					isOpen
					onClose={() => {
						setIsBulkEditOpen(false);
					}}
					onSaved={() => {
						setIsBulkEditOpen(false);
						setSelectedIds([]);
						setIsEditMode(false);
					}}
					onDeleted={(count) => {
						reportDeletedTransactions(count);
						setIsBulkEditOpen(false);
						setSelectedIds([]);
						setIsEditMode(false);
					}}
				/>
			)}
		</div>
	);
}
