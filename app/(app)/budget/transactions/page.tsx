"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
    Plus,
    Upload,
    Trash2,
    X,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useBudgetStore } from "@/store/useBudgetStore";
import { formatDateLong } from "@/utils/formatters";
import CsvUploader from "@/components/CsvUploader";
import { Transaction } from "@/store/useBudgetStore";
import ClearDataModal from "@/components/ClearDataModal";
import { TransactionRow } from "@/components/Transactions/TransactionRow";
import { SortableHeader } from "@/components/Transactions/SortableHeader";
import dynamic from "next/dynamic";
import { SearchInput } from "@/components/ui/SearchInput";
import { useSearchState } from "@/hooks/useSearchState";
import { CategorySelector } from "@/components/CategorySelector";
import { UndoToast } from "@/components/ui/UndoToast";

const EditTransactionModal = dynamic(
    () => import("@/components/Budget/EditTransactionModal"),
    {
        ssr: false,
        loading: () => (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm transform-gpu z-50" />
        ),
    },
);

type SortKey = "date" | "category" | "name" | "amount" | "account";

interface SortConfig {
    key: SortKey;
    direction: "asc" | "desc";
}

const ITEMS_PER_PAGE = 12;

export default function TransactionsPage() {
    const searchParams = useSearchParams();
    const categoryQuery = searchParams.get("category");
    const [isMounted, setIsMounted] = useState(false);
    
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsMounted(true);
        }, 0);
        return () => clearTimeout(timer);
    }, []);

    const setToast = useBudgetStore((state) => state.setToast);
    const transactions = useBudgetStore((state) => state.transactions);
    const updateTransaction = useBudgetStore((state) => state.updateTransaction);
    const bulkDeleteTransactions = useBudgetStore(
        (state) => state.bulkDeleteTransactions,
    );
    const undoDelete = useBudgetStore((state) => state.undoDelete);
    const toast = useBudgetStore((state) => state.toast);

    const [selectedTransaction, setSelectedTransaction] =
        useState<Transaction | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [showClearModal, setShowClearModal] = useState(false);
    const [showUploader, setShowUploader] = useState(false);
    const [sortPriority, setSortPriority] = useState<SortConfig[]>([
        { key: "date", direction: "desc" },
    ]);
    const [categoryFilter, setCategoryFilter] = useState<string | null>(categoryQuery);
    const [, setIsEditModalOpen] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

    const [deleteToast, setDeleteToast] = useState<{
        count: number;
        snapshot: Transaction[];
    } | null>(null);

    const { inputRef, handleClear } = useSearchState(setSearchQuery);

    const handleRuleSaved = (count: number, snapshot: Transaction[]) => {
        setToast({ count, snapshot });
        setSelectedTransaction(null);
    };

    const filteredAndSorted = useMemo(() => {
        const filtered = transactions.filter((t) => {
            const merchantName = t.merchant?.toLowerCase() || "";
            const matchesSearch = merchantName.includes(searchQuery.toLowerCase());
            const matchesCategory = !categoryFilter || t.category === categoryFilter;
            return matchesSearch && matchesCategory;
        });

        return [...filtered].sort((a, b) => {
            for (const { key, direction } of sortPriority) {
                const aVal = a[key] ?? "";
                const bVal = b[key] ?? "";

                let comparison = 0;
                if (key === "amount") {
                    comparison = Number(aVal) - Number(bVal);
                } else if (key === "date") {
                    comparison =
                        new Date(aVal as string).getTime() -
                        new Date(bVal as string).getTime();
                } else {
                    comparison = String(aVal).localeCompare(String(bVal));
                }

                if (comparison !== 0) {
                    return direction === "asc" ? comparison : -comparison;
                }
            }
            return 0;
        });
    }, [transactions, searchQuery, sortPriority, categoryFilter]);

    const [prevFilters, setPrevFilters] = useState({
        searchQuery,
        categoryFilter,
        sortPriority,
    });

    if (
        prevFilters.searchQuery !== searchQuery ||
        prevFilters.categoryFilter !== categoryFilter ||
        prevFilters.sortPriority !== sortPriority
    ) {
        setCurrentPage(1);
        setPrevFilters({ searchQuery, categoryFilter, sortPriority });
    }

    const totalPages = Math.max(
        1,
        Math.ceil(filteredAndSorted.length / ITEMS_PER_PAGE),
    );
    const paginatedTransactions = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredAndSorted.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredAndSorted, currentPage]);

    const visiblePages = useMemo(() => {
        if (totalPages <= 5)
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        if (currentPage <= 3) return [1, 2, 3, 4, 5];
        if (currentPage >= totalPages - 2)
            return [
                totalPages - 4,
                totalPages - 3,
                totalPages - 2,
                totalPages - 1,
                totalPages,
            ];
        return [
            currentPage - 2,
            currentPage - 1,
            currentPage,
            currentPage + 1,
            currentPage + 2,
        ];
    }, [currentPage, totalPages]);

    const filteredAndGrouped = useMemo(() => {
        const groups: Record<string, typeof transactions> = {};
        paginatedTransactions.forEach((t) => {
            const dateKey = formatDateLong(t.date);
            if (!groups[dateKey]) groups[dateKey] = [];
            groups[dateKey].push(t);
        });
        return groups;
    }, [paginatedTransactions]);

    const handleSort = (key: SortKey, e: React.MouseEvent) => {
        const isShiftKey = e.shiftKey;
        setSortPriority((prev) => {
            const existing = prev.find((s) => s.key === key);
            const newDirection = existing?.direction === "asc" ? "desc" : "asc";

            if (isShiftKey) {
                const filtered = prev.filter((s) => s.key !== key);
                return [{ key, direction: newDirection }, ...filtered];
            }
            return [{ key, direction: newDirection }];
        });
    };

    const handleAddTransaction = () => {
        const blankTx: Transaction = {
            id: crypto.randomUUID(),
            merchant: "",
            amount: 0,
            category: "Uncategorized",
            date: new Date().toISOString().split("T")[0],
            account: "",
            needs_review: false,
            needs_subcat: false,
        };

        setSelectedTransaction(blankTx);
        setIsEditModalOpen(true);
    };

    const handleRowClick = React.useCallback((t: Transaction) => {
        setSelectedTransaction(t);
    }, []);

    const handleSelectRow = React.useCallback(
        (id: string, e: React.MouseEvent) => {
            e.stopPropagation();
            setSelectedIds((prev) =>
                prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
            );
        },
        [],
    );

    const handleSelectAllVisible = () => {
        const visibleIds = paginatedTransactions.map((t) => t.id);
        const allSelected = visibleIds.every((id) => selectedIds.includes(id));

        if (allSelected) {
            setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
        } else {
            setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
        }
    };

    const handleBulkDelete = async () => {
        const snapshotBackup = transactions.filter((t) =>
            selectedIds.includes(t.id),
        );
        await bulkDeleteTransactions(selectedIds);
        setDeleteToast({ count: selectedIds.length, snapshot: snapshotBackup });
        setSelectedIds([]);
        setShowBulkDeleteConfirm(false);
    };

    useEffect(() => {
        if (!selectedTransaction) return;
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = "";
        };
        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [selectedTransaction]);

    return (
  
        <div className="block md:flex md:flex-col md:h-full bg-transparent text-slate-900 dark:text-gray-300 transition-colors animate-in fade-in duration-300 relative">
            
            {/* 1. RESPONSIVE ACTION BAR */}
            <div className="p-4 md:p-6 border-b border-gray-200/50 dark:border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/80 dark:bg-[#050505]/80 backdrop-blur-md transform-gpu z-30 sticky top-0">
                <div className="flex items-center justify-between w-full md:w-auto">
                    <div className="flex items-center gap-3">
                        <h2 className="text-xl font-black tracking-tight text-gray-900 dark:text-white">
                            Transactions
                        </h2>
                        <span className="text-xs bg-gray-100 dark:bg-white/5 px-2.5 py-1 rounded-full text-gray-500 dark:text-gray-400 font-bold">
                            {transactions.length} total
                        </span>
                    </div>
                    {/* Mobile Only 'Add' Button (Compact) */}
                    <button
                        className="md:hidden flex items-center justify-center p-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl transition-all shadow-lg shadow-orange-600/20 active:scale-95"
                        onClick={handleAddTransaction}
                    >
                        <Plus size={18} strokeWidth={2.5} />
                    </button>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1">
                        <SearchInput
                            ref={inputRef}
                            searchIconClassName="text-gray-400"
                            inputClassName="bg-white dark:bg-[#121212] border border-gray-200 dark:border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm focus:ring-1 focus:ring-orange-500 outline-none w-full md:w-64 transition-all placeholder:text-gray-400"
                            value={searchQuery}
                            onClear={handleClear}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search transactions..."
                        />
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-2">
                        {/* Desktop Only 'Add' Button */}
                        <button
                            className="hidden md:flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-orange-600/20 active:scale-95"
                            onClick={handleAddTransaction}
                        >
                            <Plus size={16} strokeWidth={2.5} />
                            <span>Add</span>
                        </button>
                        <button
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-[#121212] border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-bold transition-all active:scale-95"
                            onClick={() => setShowUploader(true)}
                        >
                            <Upload size={16} />
                            <span>Import</span>
                        </button>
                        <button
                            disabled
                            className="p-2 bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-600 rounded-xl cursor-not-allowed opacity-50 shrink-0"
                            title="Clear all data"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* 2. MAIN CONTENT WRAPPER */}
            {/* CRITICAL FIX: Removed height/overflow constraints on mobile. 'block' stacks it naturally. */}
            <div className="block md:flex md:flex-col md:flex-1 w-full px-4 md:px-6 pb-20 md:pb-8 md:overflow-hidden">
                
                {/* 2A. SCROLLABLE TABLE AREA */}
                {/* CRITICAL FIX: overflow-x-auto handles swipe. md:overflow-auto restores PC vertical scroll */}
                <div className="w-full overflow-x-auto md:overflow-auto md:flex-1 scrollbar-hide pb-4 md:pb-0">
                    <table className="w-full min-w-225 border-collapse table-fixed text-sm [&_th:nth-child(5)]:pl-8 [&_td:nth-child(5)]:pl-8 [&_th:nth-child(4)]:pr-4 [&_td:nth-child(4)]:pr-4">
                        <colgroup>
                            <col className="w-12" />
                            <col className="w-[28%]" /> 
                            <col className="w-[18%]" />
                            <col className="w-[12%]" /> 
                            <col className="w-[18%]" />
                            <col className="w-[12%]" /> 
                            <col className="w-[12%]" /> 
                        </colgroup>

                        <thead className="md:sticky md:top-0 bg-[#F8F9FB] dark:bg-[#050505] z-20">
                            <tr className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest text-left border-b border-gray-200/50 dark:border-white/5">
                                <th className="py-4 px-3">
                                    <div
                                        onClick={handleSelectAllVisible}
                                        className={`w-4 h-4 rounded border flex items-center justify-center transition-all cursor-pointer ${
                                            paginatedTransactions.length > 0 &&
                                            paginatedTransactions.every((t) =>
                                                selectedIds.includes(t.id),
                                            )
                                                ? "bg-orange-600 border-orange-600"
                                                : "border-gray-300 dark:border-gray-600 hover:border-orange-500"
                                        }`}
                                    >
                                        {paginatedTransactions.length > 0 &&
                                            paginatedTransactions.every((t) =>
                                                selectedIds.includes(t.id),
                                            ) && (
                                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                </svg>
                                            )}
                                    </div>
                                </th>
                                <SortableHeader label="Name" activeKey="name" sortPriority={sortPriority} onClick={handleSort} />
                                <th className="py-4 px-2">
                                    <div className="flex items-center gap-2">
                                        <CategorySelector
                                            variant="filter"
                                            currentCategory={categoryFilter || "Category"}
                                            onSelect={(sub) => {
                                                setCategoryFilter(sub === "All" ? null : sub);
                                            }}
                                        />
                                        {categoryFilter && (
                                            <button
                                                onClick={() => setCategoryFilter(null)}
                                                className="text-orange-500 hover:text-orange-400 p-1 bg-orange-50 dark:bg-orange-500/10 rounded-full"
                                            >
                                                <X size={12} strokeWidth={3} />
                                            </button>
                                        )}
                                    </div>
                                </th>
                                <SortableHeader label="Amount" activeKey="amount" sortPriority={sortPriority} onClick={handleSort} align="right" />
                                <SortableHeader label="Account" activeKey="account" sortPriority={sortPriority} onClick={handleSort} />
                                <th className="py-4 px-2">Tags</th>
                                <th className="py-4 px-2">Status</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-100 dark:divide-white/5 text-sm">
                            {!isMounted ? (
                                <tr>
                                    <td colSpan={7} className="py-16">
                                        <div className="flex justify-center w-full">
                                            <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                                        </div>
                                    </td>
                                </tr>
                            ) : paginatedTransactions.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-16 text-center text-gray-500 font-medium">
                                        No transactions found.
                                    </td>
                                </tr>
                            ) : (
                                Object.entries(filteredAndGrouped).map(([date, items]) => (
                                    <React.Fragment key={date}>
                                        <tr className="md:sticky md:top-11 z-10 bg-gray-50/95 dark:bg-[#0a0a0a]/95 backdrop-blur-md transform-gpu border-y border-gray-200/50 dark:border-white/5">
                                            <td colSpan={7} className="py-2.5 px-3 text-[10px] font-black text-orange-600 dark:text-orange-500 uppercase tracking-widest">
                                                {date}
                                            </td>
                                        </tr>
                                        {items.map((t) => (
                                            <TransactionRow
                                                key={t.id}
                                                transaction={t}
                                                onRowClick={handleRowClick}
                                                isSelected={selectedIds.includes(t.id)}
                                                onSelect={handleSelectRow}
                                            />
                                        ))}
                                    </React.Fragment>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* 2B. PAGINATION CONTROLS */}
                {totalPages > 1 && (
                    <div className="pt-4 mt-2 md:shrink-0 border-t border-gray-200/50 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <span className="text-xs text-gray-500 font-medium">
                            Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
                            {Math.min(currentPage * ITEMS_PER_PAGE, filteredAndSorted.length)}{" "}
                            of <span className="font-bold text-gray-900 dark:text-white">{filteredAndSorted.length}</span>
                        </span>

                        <div className="flex items-center gap-1 sm:gap-2">
                            <button
                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#121212] text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                            >
                                <ChevronLeft size={16} />
                            </button>

                            <div className="flex items-center gap-1">
                                {visiblePages.map((page) => (
                                    <button
                                        key={page}
                                        onClick={() => setCurrentPage(page)}
                                        className={`min-w-9 h-9 px-1 rounded-xl text-xs font-bold transition-all flex items-center justify-center ${
                                            currentPage === page
                                                ? "bg-orange-600 text-white shadow-lg shadow-orange-600/20 scale-105"
                                                : "text-gray-600 dark:text-gray-400 bg-white dark:bg-[#121212] border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5"
                                        }`}
                                    >
                                        {page}
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#121212] text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            {showUploader && (
                <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md transform-gpu" onClick={() => setShowUploader(false)} />
                    <div className="relative bg-white dark:bg-[#121212] border border-gray-200 dark:border-white/10 w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden">
                        <div className="p-6 border-b border-gray-200 dark:border-white/5 flex justify-between items-center">
                            <h3 className="text-lg font-black tracking-tight text-gray-900 dark:text-white">Import CSV Statement</h3>
                            <button onClick={() => setShowUploader(false)} className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-8">
                            <CsvUploader onComplete={() => setShowUploader(false)} />
                        </div>
                    </div>
                </div>
            )}

            {showClearModal && <ClearDataModal isOpen={showClearModal} onClose={() => setShowClearModal(false)} />}

            {selectedTransaction && (
                <EditTransactionModal
                    key={selectedTransaction.id}
                    transaction={selectedTransaction}
                    isOpen={!!selectedTransaction}
                    onClose={() => setSelectedTransaction(null)}
                    onUpdate={updateTransaction}
                    onRuleSaved={handleRuleSaved}
                />
            )}

            {/* --- RESPONSIVE BULK ACTION BAR --- */}
            {selectedIds.length > 0 && (
                <div className="fixed bottom-6 w-full px-4 sm:px-0 sm:bottom-8 sm:left-1/2 sm:-translate-x-1/2 sm:w-auto z-50 animate-in slide-in-from-bottom-10 fade-in duration-300 pointer-events-none">
                    <div className="bg-[#111111] border border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.5)] rounded-2xl sm:rounded-full px-4 py-3 sm:px-6 flex items-center gap-4 sm:gap-6 w-max mx-auto max-w-full overflow-x-auto scrollbar-hide pointer-events-auto">
                        <span className="text-white text-sm font-bold whitespace-nowrap">
                            {selectedIds.length} Selected
                        </span>

                        <div className="w-px h-6 bg-white/20 shrink-0" />

                        <button className="text-sm font-medium text-white hover:text-orange-500 transition-colors whitespace-nowrap">
                            Change Category
                        </button>

                        <div className="w-px h-6 bg-white/20 shrink-0" />

                        <button className="text-sm font-medium text-white hover:text-orange-500 transition-colors whitespace-nowrap">
                            Rename
                        </button>

                        <div className="w-px h-6 bg-white/20 shrink-0" />

                        <button
                            onClick={() => setShowBulkDeleteConfirm(true)}
                            className="text-sm font-medium text-red-500 hover:text-red-400 transition-colors whitespace-nowrap"
                        >
                            Delete
                        </button>

                        <div className="w-px h-6 bg-white/20 shrink-0 ml-0 sm:ml-2" />

                        <button
                            onClick={() => setSelectedIds([])}
                            className="text-gray-400 hover:text-white transition-colors p-1 shrink-0"
                        >
                            <X size={16} strokeWidth={3} />
                        </button>
                    </div>
                </div>
            )}

            {/* Bulk Delete Confirmation Modal */}
            {showBulkDeleteConfirm && (
                <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md transform-gpu animate-in fade-in duration-200" onClick={() => setShowBulkDeleteConfirm(false)} />
                    <div className="relative bg-white dark:bg-[#121212] border border-gray-200 dark:border-white/10 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                                <Trash2 className="text-red-600 dark:text-red-500" size={28} strokeWidth={2.5} />
                            </div>
                            <h3 className="text-xl font-black tracking-tight text-gray-900 dark:text-white mb-2">Delete {selectedIds.length} Transactions?</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 px-2">This action cannot be undone. These transactions will be permanently removed from your budget.</p>
                            <div className="flex gap-3">
                                <button onClick={() => setShowBulkDeleteConfirm(false)} className="flex-1 py-3 px-4 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 font-bold rounded-xl transition-all active:scale-95">Cancel</button>
                                <button onClick={handleBulkDelete} className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-600/20 active:scale-95">Yes, Delete</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Toasts */}
            {deleteToast && (
                <UndoToast
                    show={!!deleteToast}
                    message={`Deleted ${deleteToast.count} transactions`}
                    onUndo={() => {
                        undoDelete(deleteToast.snapshot);
                        setDeleteToast(null);
                    }}
                    onClose={() => setDeleteToast(null)}
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
                    onClose={() => setToast(null)}
                />
            )}
        </div>
    );
}