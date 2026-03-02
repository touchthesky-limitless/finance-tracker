"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
	Plus,
	Filter,
	Upload,
	Trash2,
	X,
	ChevronLeft,
	ChevronRight,
} from "lucide-react";
import { useBudgetStore } from "@/hooks/useBudgetStore";
import { formatDateLong } from "@/utils/formatters";
import CsvUploader from "@/components/CsvUploader";
import { Transaction } from "@/store/createBudgetStore";
import ClearDataModal from "@/components/ClearDataModal";
import { TransactionRow } from "@/components/Transactions/TransactionRow";
import { SortableHeader } from "@/components/Transactions/SortableHeader";
import dynamic from "next/dynamic";
import { SearchInput } from "@/components/ui/SearchInput";
import { useSearchState } from "@/hooks/useSearchState";
import { CategorySelector } from "@/components/CategorySelector";

const EditTransactionModal = dynamic(
	() => import("@/components/Budget/EditTransactionModal"),
	{
		ssr: false,
		loading: () => (
			<div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" />
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
	const useStore = useBudgetStore();
	const transactions = useStore((state) => state.transactions);
	const updateTransaction = useStore((state) => state.updateTransaction);

	const [selectedTransaction, setSelectedTransaction] =
		useState<Transaction | null>(null);

	// --- State ---
	const [searchQuery, setSearchQuery] = useState("");
	const [showClearModal, setShowClearModal] = useState(false);
	const [showUploader, setShowUploader] = useState(false);
	const [sortPriority, setSortPriority] = useState<SortConfig[]>([
		{ key: "date", direction: "desc" },
	]);
	const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
	const [, setIsEditModalOpen] = useState(false);
	const setToast = useStore((state) => state.setToast);

	// --- PAGINATION STATE ---
	const [currentPage, setCurrentPage] = useState(1);

	const mainSearch = useSearchState(setSearchQuery);

	const handleRuleSaved = (count: number, snapshot: Transaction[]) => {
		setToast({ count, snapshot });
		setSelectedTransaction(null);
	};

	// --- 1. Base Filter & Sort ---
	const filteredAndSorted = useMemo(() => {
		const filtered = transactions.filter((t) => {
			const matchesSearch = t.description
				.toLowerCase()
				.includes(searchQuery.toLowerCase());
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

	// --- 2. Auto-Reset Page on Filter Change ---
	// Instead of useEffect, we use derived state pattern to avoid cascading renders
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

	// --- 3. Slice for Pagination ---
	const totalPages = Math.max(
		1,
		Math.ceil(filteredAndSorted.length / ITEMS_PER_PAGE),
	);
	const paginatedTransactions = useMemo(() => {
		const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
		return filteredAndSorted.slice(startIndex, startIndex + ITEMS_PER_PAGE);
	}, [filteredAndSorted, currentPage]);

	// Calculate the 5 visible page numbers for the pagination UI
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

	// --- 4. Group only the active page ---
	const filteredAndGrouped = useMemo(() => {
		const groups: Record<string, typeof transactions> = {};
		paginatedTransactions.forEach((t) => {
			const dateKey = formatDateLong(t.date);
			if (!groups[dateKey]) groups[dateKey] = [];
			groups[dateKey].push(t);
		});
		return groups;
	}, [paginatedTransactions]);

	// --- Handlers ---
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
			description: "",
			amount: 0,
			category: "Uncategorized",
			date: new Date().toISOString().split("T")[0],
			account: "",
			needsReview: false,
			needsSubcat: false,
		};

		setSelectedTransaction(blankTx);
		setIsEditModalOpen(true);
	};

	const handleRowClick = React.useCallback((t: Transaction) => {
		setSelectedTransaction(t);
	}, []);

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
		<div className="flex flex-col h-full bg-white dark:bg-[#0d0d0d] text-slate-900 dark:text-gray-300 transition-colors">
			{/* 1. Action Bar */}
			<div className="p-4 md:p-6 border-b border-gray-800 flex flex-wrap items-center justify-between gap-4 bg-[#F8F9FB] dark:bg-[#0d0d0d]/80 backdrop-blur-md sticky top-0 z-30">
				<div className="flex items-center gap-3">
					<h2 className="text-xl font-bold text-gray-900 dark:text-white">
						Transactions
					</h2>
					<span className="text-xs bg-gray-300 dark:bg-gray-800 px-2 py-0.5 rounded-full text-gray-400">
						{transactions.length} total
					</span>
				</div>

				<div className="flex items-center gap-2">
					<button className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 transition-colors border border-transparent hover:border-gray-700">
						<Filter size={18} />
					</button>
					<div className="relative">
						<SearchInput
							ref={mainSearch.inputRef}
							searchIconClassName="text-gray-500"
							inputClassName="dark:bg-gray-900 border border-gray-400 dark:border-gray-800 rounded-lg py-1.5 pl-9 pr-4 text-sm focus:ring-1 focus:ring-orange-500 outline-none w-40 md:w-64"
							value={searchQuery}
							onClear={mainSearch.handleClear}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="Search transactions..."
						/>
					</div>
					<button
						className="flex items-center gap-2 px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-medium transition-colors"
						onClick={handleAddTransaction}
					>
						<Plus size={16} />
						<span className="hidden sm:inline">Add</span>
					</button>
					<button
						className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-medium transition-colors border border-gray-700"
						onClick={() => setShowUploader(true)}
					>
						<Upload size={16} />
						<span className="hidden sm:inline">Import</span>
					</button>
					<button
						onClick={() => setShowClearModal(true)}
						className="p-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-all shadow-lg shadow-red-600/20"
						title="Clear all data"
					>
						<Trash2 size={18} />
					</button>
				</div>
			</div>

			{/* 2. Data Table & Pagination Wrapper */}
			<div className="flex-1 overflow-auto px-4 md:px-6 pb-8 min-h-150 flex flex-col justify-between">
				<table className="w-full border-collapse">
					<thead className="sticky top-0 bg-[#F8F9FB] dark:bg-[#0d0d0d] z-20">
						<tr className="text-[10px] font-bold text-gray-500 uppercase tracking-widest text-left border-b border-gray-800">
							<SortableHeader
								label="Name"
								activeKey="name"
								sortPriority={sortPriority}
								onClick={handleSort}
							/>
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
											className="text-orange-500 hover:text-orange-400"
										>
											<X size={12} />
										</button>
									)}
								</div>
							</th>
							<SortableHeader
								label="Amount"
								activeKey="amount"
								sortPriority={sortPriority}
								onClick={handleSort}
								align="right"
							/>
							<SortableHeader
								label="Account"
								activeKey="account"
								sortPriority={sortPriority}
								onClick={handleSort}
							/>
							<th className="py-4 px-2 w-32">Tags</th>
							<th className="py-4 px-2 w-32">Status</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-gray-800/40 text-sm">
						{paginatedTransactions.length === 0 ? (
							<tr>
								<td
									colSpan={6}
									className="py-12 text-center text-gray-500 italic"
								>
									No transactions found.
								</td>
							</tr>
						) : (
							Object.entries(filteredAndGrouped).map(([date, items]) => (
								<React.Fragment key={date}>
									<tr className="sticky top-11.25 z-10 bg-[#F8F9FB] dark:bg-[#121212]/95 backdrop-blur-sm border-y border-gray-800/50">
										<td
											colSpan={6}
											className="py-2 px-2 text-[11px] font-bold text-orange-400/80 uppercase"
										>
											{date}
										</td>
									</tr>
									{items.map((t) => (
										<TransactionRow
											key={t.id}
											transaction={t}
											onRowClick={handleRowClick}
										/>
									))}
								</React.Fragment>
							))
						)}
					</tbody>
				</table>

				{/* 3. Pagination Controls (Now INSIDE the table container) */}
				{totalPages > 1 && (
					<div className="pt-6 mt-auto border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
						<span className="text-xs text-gray-500 font-medium hidden sm:inline-block">
							Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
							{Math.min(currentPage * ITEMS_PER_PAGE, filteredAndSorted.length)}{" "}
							of {filteredAndSorted.length}
						</span>

						<div className="flex items-center gap-1 sm:gap-2 w-full sm:w-auto justify-center sm:justify-end">
							<button
								onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
								disabled={currentPage === 1}
								className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
							>
								<ChevronLeft size={16} />
							</button>

							<div className="flex items-center gap-1">
								{visiblePages.map((page) => (
									<button
										key={page}
										onClick={() => setCurrentPage(page)}
										className={`min-w-[32px] h-8 px-1 rounded-lg text-xs font-bold transition-all flex items-center justify-center
                                            ${
																							currentPage === page
																								? "bg-orange-600 text-white shadow-md scale-105"
																								: "text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10"
																						}`}
									>
										{page}
									</button>
								))}
							</div>

							<button
								onClick={() =>
									setCurrentPage((p) => Math.min(totalPages, p + 1))
								}
								disabled={currentPage === totalPages}
								className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
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
					<div
						className="absolute inset-0 bg-black/80 backdrop-blur-md"
						onClick={() => setShowUploader(false)}
					/>
					<div className="relative bg-[#F8F9FB] dark:bg-[#1a1a1a] border border-gray-800 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden">
						<div className="p-6 border-b border-gray-800 flex justify-between items-center">
							<h3 className="text-lg font-bold text-gray-500 dark:text-white">
								Import CSV Statement
							</h3>
							<button
								onClick={() => setShowUploader(false)}
								className="text-gray-500 hover:text-gray-700"
							>
								✕
							</button>
						</div>
						<div className="p-8">
							<CsvUploader onComplete={() => setShowUploader(false)} />
						</div>
					</div>
				</div>
			)}

			{showClearModal && (
				<ClearDataModal
					isOpen={showClearModal}
					onClose={() => setShowClearModal(false)}
				/>
			)}

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
		</div>
	);
}
