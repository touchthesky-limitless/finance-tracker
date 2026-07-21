"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { SortingState, VisibilityState } from "@tanstack/react-table";
import { X } from "lucide-react";

import { Transaction, useBudgetStore } from "@/store/useBudgetStore";
import { DataTable } from "@/components/Transactions/DataTable";
import { UndoToast } from "@/components/ui/UndoToast";
import CsvUploader from "@/components/CsvUploader";
import { TopToolbar } from "@/components/Transactions/TopToolbar";
import { TableToolbar } from "@/components/Transactions/TableToolbar";
import { SummarySidebar } from "@/components/Transactions/SummarySidebar";

const DEFAULT_SORTING: SortingState = [
	{
		id: "date",
		desc: true,
	},
];

const EditTransactionModal = dynamic(
	() => {
		return import("@/components/Budget/EditTransactionModal");
	},
	{
		ssr: false,
	},
);

function readLocalStorage<T>(key: string, fallback: T): T {
	if (typeof window === "undefined") {
		return fallback;
	}

	try {
		const storedValue = window.localStorage.getItem(key);

		if (!storedValue) {
			return fallback;
		}

		return JSON.parse(storedValue) as T;
	} catch (error) {
		console.error(`Failed to read localStorage key "${key}":`, error);

		window.localStorage.removeItem(key);

		return fallback;
	}
}

function writeLocalStorage(key: string, value: unknown): void {
	try {
		window.localStorage.setItem(key, JSON.stringify(value));
	} catch (error) {
		console.error(`Failed to write localStorage key "${key}":`, error);
	}
}

function normalizeCategoryName(name: string): string {
	return name.trim().toLowerCase();
}

export default function TransactionsPage() {
	// Store selectors
	const transactions = useBudgetStore((state) => state.transactions);

	const updateTransaction = useBudgetStore((state) => state.updateTransaction);

	const setToast = useBudgetStore((state) => state.setToast);

	const toast = useBudgetStore((state) => state.toast);

	const customCategories = useBudgetStore((state) => state.customCategories);

	const fetchCustomCategories = useBudgetStore(
		(state) => state.fetchCustomCategories,
	);

	// Page state
	const [searchQuery, setSearchQuery] = useState("");

	const [selectedIds, setSelectedIds] = useState<string[]>([]);

	const [selectedTransaction, setSelectedTransaction] =
		useState<Transaction | null>(null);

	const [currentView, setCurrentView] = useState<"all" | "review">("all");

	const [isEditMode, setIsEditMode] = useState(false);

	const [isSummaryVisible, setIsSummaryVisible] = useState(false);

	const [showUploader, setShowUploader] = useState(false);

	const [isMounted, setIsMounted] = useState(false);

	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
		() => {
			return readLocalStorage<VisibilityState>("sort_cols", {});
		},
	);

	const [sorting, setSorting] = useState<SortingState>(() => {
		return readLocalStorage<SortingState>("custom_sort", DEFAULT_SORTING);
	});

	// Mount guard
	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect
		setIsMounted(true);
	}, []);

	// Load system and user-created subcategories
	useEffect(() => {
		void fetchCustomCategories();
	}, [fetchCustomCategories]);

	// Persist sorting
	useEffect(() => {
		if (!isMounted) {
			return;
		}

		writeLocalStorage("custom_sort", sorting);
	}, [sorting, isMounted]);

	// Persist column visibility
	useEffect(() => {
		if (!isMounted) {
			return;
		}

		writeLocalStorage("sort_cols", columnVisibility);
	}, [columnVisibility, isMounted]);

	// Escape exits edit mode
	useEffect(() => {
		const handleEscape = (event: KeyboardEvent) => {
			if (event.key !== "Escape") {
				return;
			}

			setIsEditMode(false);
			setSelectedIds([]);
		};

		window.addEventListener("keydown", handleEscape);

		return () => {
			window.removeEventListener("keydown", handleEscape);
		};
	}, []);

	// Filter visible transactions
	const filteredTransactions = useMemo(() => {
		const normalizedQuery = searchQuery.trim().toLowerCase();

		return transactions.filter((transaction) => {
			if (
				currentView === "review" &&
				!transaction.needs_review &&
				transaction.category !== "Uncategorized"
			) {
				return false;
			}

			if (!normalizedQuery) {
				return true;
			}

			const merchant = transaction.merchant?.toLowerCase() ?? "";

			const category = transaction.category?.toLowerCase() ?? "";
			// Search account
			// const account = transaction.account?.toLowerCase() ?? "";

			return (
				merchant.includes(normalizedQuery) || category.includes(normalizedQuery)
				// || account.includes(normalizedQuery)
			);
		});
	}, [transactions, searchQuery, currentView]);

	// Summary statistics for the complete transaction list
	const summaryStats = useMemo(() => {
		let largestTransaction = 0;
		let largestExpense = 0;

		for (let index = 0; index < transactions.length; index++) {
			const transaction = transactions[index];

			const absoluteAmount = Math.abs(transaction.amount);

			if (absoluteAmount > largestTransaction) {
				largestTransaction = absoluteAmount;
			}

			if (transaction.amount < 0 && absoluteAmount > largestExpense) {
				largestExpense = absoluteAmount;
			}
		}

		return {
			total: transactions.length,
			largestTx: largestTransaction,
			largestEx: largestExpense,
		};
	}, [transactions]);

	// Build category name -> UUID lookup
	const subcategoryIdByName = useMemo(() => {
		const lookup = new Map<string, string>();

		/*
		 * Add system categories first.
		 * In the event of bad duplicate data,
		 * the system category keeps priority.
		 */
		for (let index = 0; index < customCategories.length; index++) {
			const category = customCategories[index];

			if (!category.is_system) {
				continue;
			}

			const key = normalizeCategoryName(category.name);

			lookup.set(key, category.id);
		}

		// Add user-created categories second.
		for (let index = 0; index < customCategories.length; index++) {
			const category = customCategories[index];

			if (category.is_system) {
				continue;
			}

			const key = normalizeCategoryName(category.name);

			const existingId = lookup.get(key);

			if (existingId) {
				console.warn(`Duplicate category name detected: "${category.name}".`);

				continue;
			}

			lookup.set(key, category.id);
		}

		return lookup;
	}, [customCategories]);

	const getSubcategoryId = useCallback(
		(categoryName: string): string | undefined => {
			return subcategoryIdByName.get(normalizeCategoryName(categoryName));
		},
		[subcategoryIdByName],
	);

	// Row selection
	const handleSelectRow = useCallback((id: string, event: React.MouseEvent) => {
		event.stopPropagation();

		setSelectedIds((previousSelectedIds) => {
			if (previousSelectedIds.includes(id)) {
				return previousSelectedIds.filter((selectedId) => {
					return selectedId !== id;
				});
			}

			return [...previousSelectedIds, id];
		});
	}, []);

	// Update only the category field
	const handleCategoryChange = useCallback(
		(id: string, newCategory: string) => {
			void updateTransaction(id, {
				category: newCategory,
			});
		},
		[updateTransaction],
	);

	// Create a blank transaction for the editor
	const handleAddTransaction = useCallback(() => {
		const currentDate = new Date().toISOString().split("T")[0];

		setSelectedTransaction({
			id: crypto.randomUUID(),
			merchant: "",
			amount: 0,
			category: "Uncategorized",
			date: currentDate,
			account: "",
			needs_review: false,
			needs_subcat: false,
		});
	}, []);

	const isDefaultSorting =
		sorting.length === 1 &&
		sorting[0]?.id === "date" &&
		sorting[0]?.desc === true;

	const isSortModified = !isDefaultSorting;

	const isColumnsModified = Object.values(columnVisibility).some(
		(isVisible) => {
			return isVisible === false;
		},
	);

	const hasActiveFilters =
		searchQuery.trim().length > 0 ||
		isSortModified ||
		isColumnsModified ||
		currentView !== "all";

	const handleClearAll = useCallback(() => {
		setSearchQuery("");
		setCurrentView("all");
		setSorting(DEFAULT_SORTING);
		setColumnVisibility({});
	}, []);

	if (!isMounted) {
		return <div className="h-screen bg-gray-50 dark:bg-[#121212]" />;
	}

	return (
		<div className="flex flex-col h-screen font-sans bg-gray-50 dark:bg-[#121212] text-gray-900 dark:text-gray-200 transition-colors duration-200">
			<TopToolbar
				searchQuery={searchQuery}
				setSearchQuery={setSearchQuery}
				setShowUploader={setShowUploader}
				onAddTransaction={handleAddTransaction}
				isSummaryVisible={isSummaryVisible}
				setIsSummaryVisible={setIsSummaryVisible}
				hasActiveFilters={hasActiveFilters}
				onClearAll={handleClearAll}
			/>

			<div className="flex flex-1 min-h-0 overflow-hidden p-6 gap-6">
				<div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#191919] border border-gray-200 dark:border-white/5 rounded-2xl shadow-sm overflow-hidden transition-colors duration-200">
					<TableToolbar
						isEditMode={isEditMode}
						setIsEditMode={setIsEditMode}
						selectedIds={selectedIds}
						setSelectedIds={setSelectedIds}
						currentView={currentView}
						setCurrentView={setCurrentView}
						filteredLength={filteredTransactions.length}
						sorting={sorting}
						setSorting={setSorting}
						columnVisibility={columnVisibility}
						setColumnVisibility={setColumnVisibility}
					/>

					<div className="flex-1 overflow-hidden relative">
						<DataTable
							transactions={filteredTransactions}
							selectedIds={selectedIds}
							onSelectRow={handleSelectRow}
							onRowClick={setSelectedTransaction}
							columnVisibility={columnVisibility}
							isEditMode={isEditMode}
							currentView={currentView}
							sorting={sorting}
							onCategoryChange={handleCategoryChange}
							getCategoryId={getSubcategoryId}
						/>
					</div>
				</div>

				<SummarySidebar isVisible={isSummaryVisible} stats={summaryStats} />
			</div>

			{showUploader && (
				<div className="fixed inset-0 z-100 flex items-center justify-center p-4">
					<button
						type="button"
						aria-label="Close CSV uploader"
						className="absolute inset-0 bg-black/60 backdrop-blur-md transform-gpu"
						onClick={() => {
							setShowUploader(false);
						}}
					/>

					<div className="relative bg-white dark:bg-[#121212] border border-gray-200 dark:border-white/10 w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden">
						<div className="p-6 border-b border-gray-200 dark:border-white/5 flex justify-between items-center">
							<h3 className="text-lg font-black tracking-tight text-gray-900 dark:text-white">
								Import CSV Statement
							</h3>

							<button
								type="button"
								aria-label="Close CSV uploader"
								onClick={() => {
									setShowUploader(false);
								}}
								className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors"
							>
								<X size={20} />
							</button>
						</div>

						<div className="p-8">
							<CsvUploader
								onComplete={() => {
									setShowUploader(false);
								}}
							/>
						</div>
					</div>
				</div>
			)}

			{selectedTransaction && (
				<EditTransactionModal
					key={selectedTransaction.id}
					transaction={selectedTransaction}
					isOpen={selectedTransaction !== null}
					onClose={() => {
						setSelectedTransaction(null);
					}}
					onUpdate={updateTransaction}
					onRuleSaved={(count, snapshot) => {
						setToast({
							count,
							snapshot,
						});

						setSelectedTransaction(null);
					}}
				/>
			)}

			{toast && (
				<UndoToast
					show={true}
					message={`Updated ${toast.count} transactions`}
					onUndo={() => {
						useBudgetStore.getState().undoBulkUpdate(toast.snapshot);

						setToast(null);
					}}
					onClose={() => {
						setToast(null);
					}}
				/>
			)}
		</div>
	);
}
