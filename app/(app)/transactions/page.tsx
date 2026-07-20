"use client";

import React, { useMemo, useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { VisibilityState, SortingState } from "@tanstack/react-table";
import { Trash2, X } from "lucide-react";

import { useBudgetStore, Transaction } from "@/store/useBudgetStore";
import { DataTable } from "@/components/Transactions/DataTable";
import { UndoToast } from "@/components/ui/UndoToast";
import ClearDataModal from "@/components/ClearDataModal";
import CsvUploader from "@/components/CsvUploader";
import { TopToolbar } from "@/components/Transactions/TopToolbar";
import { TableToolbar } from "@/components/Transactions/TableToolbar";
import { SummarySidebar } from "@/components/Transactions/SummarySidebar";
import { useUnifiedCategories } from "@/hooks/useUnifiedCategories";

const EditTransactionModal = dynamic(
	() => {
		return import("@/components/Budget/EditTransactionModal");
	},
	{ ssr: false },
);

export default function TransactionsPage() {
	// --- Store Selectors ---
	const transactions = useBudgetStore((state) => {
		return state.transactions;
	});
	const updateTransaction = useBudgetStore((state) => {
		return state.updateTransaction;
	});
	const bulkDeleteTransactions = useBudgetStore((state) => {
		return state.bulkDeleteTransactions;
	});
	const setToast = useBudgetStore((state) => {
		return state.setToast;
	});
	const toast = useBudgetStore((state) => {
		return state.toast;
	});

	// --- Core State ---
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedIds, setSelectedIds] = useState<string[]>([]);
	const [selectedTransaction, setSelectedTransaction] =
		useState<Transaction | null>(null);
	const [currentView, setCurrentView] = useState<"all" | "review">("all");
	const [isEditMode, setIsEditMode] = useState(false);
	const [isSummaryVisible, setIsSummaryVisible] = useState(false);
	const [showClearModal, setShowClearModal] = useState(false);
	const [showUploader, setShowUploader] = useState(false);
	const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
	const [, setDeleteToast] = useState<{
		count: number;
		snapshot: Transaction[];
	} | null>(null);

	// --- Hydration & Lazy Init State ---
	const [isMounted, setIsMounted] = useState(false);

	useEffect(() => {
		// eslint-disable-next-line
		setIsMounted(true);
	}, []);

	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
		() => {
			if (typeof window !== "undefined") {
				const saved = window.localStorage.getItem("monarch_cols");
				if (saved) {
					return JSON.parse(saved);
				}
			}
			return {};
		},
	);

	const [sorting, setSorting] = useState<SortingState>(() => {
		if (typeof window !== "undefined") {
			const saved = window.localStorage.getItem("monarch_sort");
			if (saved) {
				return JSON.parse(saved);
			}
		}
		return [{ id: "date", desc: true }];
	});

	const { allUnifiedCategories } = useUnifiedCategories("Expense", "All");

	// --- Side Effects ---
	useEffect(() => {
		if (isMounted) {
			window.localStorage.setItem("monarch_sort", JSON.stringify(sorting));
		}
	}, [sorting, isMounted]);

	useEffect(() => {
		if (isMounted) {
			window.localStorage.setItem(
				"monarch_cols",
				JSON.stringify(columnVisibility),
			);
		}
	}, [columnVisibility, isMounted]);

	useEffect(() => {
		const handleEsc = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				setIsEditMode(false);
				setSelectedIds([]);
			}
		};
		window.addEventListener("keydown", handleEsc);
		return () => {
			window.removeEventListener("keydown", handleEsc);
		};
	}, []);

	// --- Derived State & Computations ---
	// const filteredTransactions = useMemo(() => {
	// 	let filtered = transactions.filter((t) => {
	// 		return (
	// 			!searchQuery ||
	// 			t.merchant?.toLowerCase().includes(searchQuery.toLowerCase())
	// 		);
	// 	});

	// 	if (currentView === "review") {
	// 		filtered = filtered.filter((t) => {
	// 			return t.needs_review || t.category === "Uncategorized";
	// 		});
	// 	}

	// 	const sortDef = sorting[0];
	// 	if (sortDef) {
	// 		return [...filtered].sort((a, b) => {
	// 			const aVal = a[sortDef.id as keyof Transaction] ?? "";
	// 			const bVal = b[sortDef.id as keyof Transaction] ?? "";

	// 			if (sortDef.id === "amount") {
	// 				return sortDef.desc
	// 					? Math.abs(Number(bVal)) - Math.abs(Number(aVal))
	// 					: Math.abs(Number(aVal)) - Math.abs(Number(bVal));
	// 			}
	// 			if (sortDef.id === "date") {
	// 				return sortDef.desc
	// 					? new Date(bVal as string).getTime() -
	// 							new Date(aVal as string).getTime()
	// 					: new Date(aVal as string).getTime() -
	// 							new Date(bVal as string).getTime();
	// 			}
	// 			return (
	// 				String(aVal).localeCompare(String(bVal)) * (sortDef.desc ? -1 : 1)
	// 			);
	// 		});
	// 	}

	// 	return filtered;
	// }, [transactions, searchQuery, currentView, sorting]);

	const filteredTransactions = useMemo(() => {
		let filtered = transactions.filter((t) => {
			return (
				!searchQuery ||
				t.merchant?.toLowerCase().includes(searchQuery.toLowerCase())
			);
		});

		if (currentView === "review") {
			filtered = filtered.filter((t) => {
				return t.needs_review || t.category === "Uncategorized";
			});
		}

		// Return ONLY the filtered data. Let the DataTable handle the sorting!
		return filtered;
	}, [transactions, searchQuery, currentView]);

	const summaryStats = useMemo(() => {
		let largestTransaction = 0;
		let largestExpense = 0;
		transactions.forEach((t) => {
			if (Math.abs(t.amount) > largestTransaction) {
				largestTransaction = Math.abs(t.amount);
			}
			if (t.amount < 0 && Math.abs(t.amount) > largestExpense) {
				largestExpense = Math.abs(t.amount);
			}
		});
		return {
			total: transactions.length,
			largestTx: largestTransaction,
			largestEx: largestExpense,
		};
	}, [transactions]);

	// --- Handlers ---
	const handleSelectRow = useCallback((id: string, e: React.MouseEvent) => {
		e.stopPropagation();
		setSelectedIds((prev) => {
			if (prev.includes(id)) {
				return prev.filter((i) => {
					return i !== id;
				});
			}
			return [...prev, id];
		});
	}, []);

	const handleBulkDelete = async () => {
		const snapshotBackup = transactions.filter((t) => {
			return selectedIds.includes(t.id);
		});
		await bulkDeleteTransactions(selectedIds);
		setDeleteToast({ count: selectedIds.length, snapshot: snapshotBackup });
		setSelectedIds([]);
		setShowBulkDeleteConfirm(false);
	};

	const handleCategoryChange = useCallback(
		(id: string, newCategory: string) => {
			const transaction = transactions.find((t) => {
				return t.id === id;
			});

			if (transaction) {
				updateTransaction(transaction.id, {
					...transaction,
					category: newCategory,
				});
			}
		},
		[transactions, updateTransaction],
	);

	const handleAddTransaction = useCallback(() => {
		setSelectedTransaction({
			id: crypto.randomUUID(),
			merchant: "",
			amount: 0,
			category: "Uncategorized",
			date: new Date().toISOString().split("T")[0],
			account: "",
			needs_review: false,
			needs_subcat: false,
		});
	}, []);

	// 1. Calculate if ANY filter, sort, or view modification is active
	const isSortModified =
		sorting.length > 0 &&
		(sorting[0].id !== "date" || sorting[0].desc !== true);

	const isColumnsModified = Object.values(columnVisibility).some(
		(isVisible) => {
			return isVisible === false;
		},
	);

	const hasActiveFilters =
		!!searchQuery ||
		isSortModified ||
		isColumnsModified ||
		currentView !== "all";

	// 2. Create the handler to wipe everything back to default
	const handleClearAll = () => {
		setSearchQuery("");
		setCurrentView("all");
		setSorting([{ id: "date", desc: true }]);
		setColumnVisibility({});
	};

	// --- Render Guards ---
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

			{/* MAIN CONTENT AREA */}
			<div className="flex flex-1 min-h-0 overflow-hidden p-6 gap-6">
				{/* LEFT CARD (Table + Toolbar) */}
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

					{/* MAIN TABLE */}
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
							getCategoryId={(name) => {
								const found = allUnifiedCategories.find((c) => {
									return c.name === name;
								});
								return found?.id ?? "unknown";
							}}
						/>
					</div>
				</div>

				<SummarySidebar isVisible={isSummaryVisible} stats={summaryStats} />
			</div>

			{/* Modals & Popovers (Kept at the Page level for stacking context) */}
			{showUploader && (
				<div className="fixed inset-0 z-100 flex items-center justify-center p-4">
					<div
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
			{showClearModal && (
				<ClearDataModal
					isOpen={showClearModal}
					onClose={() => {
						setShowClearModal(false);
					}}
				/>
			)}

			{selectedTransaction && (
				<EditTransactionModal
					key={selectedTransaction.id}
					transaction={selectedTransaction}
					isOpen={!!selectedTransaction}
					onClose={() => {
						setSelectedTransaction(null);
					}}
					onUpdate={updateTransaction}
					onRuleSaved={(count, snapshot) => {
						setToast({ count, snapshot });
						setSelectedTransaction(null);
					}}
				/>
			)}

			{toast && (
				<UndoToast
					show={!!toast}
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

			{showBulkDeleteConfirm && (
				<div className="fixed inset-0 z-100 flex items-center justify-center p-4">
					<div
						className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
						onClick={() => {
							setShowBulkDeleteConfirm(false);
						}}
					/>
					<div className="relative bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-white/10 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
						<div className="p-6 text-center">
							<div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
								<Trash2 className="text-red-500" size={28} strokeWidth={2.5} />
							</div>
							<h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">
								Delete {selectedIds.length} Transactions?
							</h3>
							<p className="text-sm text-gray-500 dark:text-gray-400 mb-8 px-2">
								This action cannot be undone. These transactions will be
								permanently removed from your budget.
							</p>
							<div className="flex gap-3">
								<button
									onClick={() => {
										setShowBulkDeleteConfirm(false);
									}}
									className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-900 dark:text-white font-bold rounded-xl transition-all"
								>
									Cancel
								</button>
								<button
									onClick={handleBulkDelete}
									className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-600/20"
								>
									Yes, Delete
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
