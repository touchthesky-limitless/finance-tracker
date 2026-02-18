"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Plus, Search, Filter, Upload, Trash2 } from "lucide-react";
import { useBudgetStore } from "@/hooks/useBudgetStore";
import { formatDateLong } from "@/utils/formatters";
import CsvUploader from "@/components/CsvUploader";
import { Transaction } from "@/store/createBudgetStore";
import ClearDataModal from "@/components/ClearDataModal";
import { TransactionRow } from "@/components/Transactions/TransactionRow";
import { SortableHeader } from "@/components/Transactions/SortableHeader";
import dynamic from "next/dynamic";

// --- Types for Sorting ---
type SortKey = "date" | "category" | "name" | "amount" | "account";

interface SortConfig {
	key: SortKey;
	direction: "asc" | "desc";
}

export default function TransactionsPage() {
	const useStore = useBudgetStore();
	const transactions = useStore((state) => state.transactions);
	const updateTransaction = useStore((state) => state.updateTransaction);

	const [selectedTransaction, setSelectedTransaction] =
		useState<Transaction | null>(null);

	// --- State ---
	const [searchQuery, setSearchQuery] = useState("");
	// const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
	const [showClearModal, setShowClearModal] = useState(false);
	const [showUploader, setShowUploader] = useState(false);
	const [sortPriority, setSortPriority] = useState<SortConfig[]>([
		{ key: "date", direction: "desc" },
	]);
	// const [toast, setToast] = useState<{ message: string; count: number } | null>(null);
	// const [toast, setToast] = useState<{
	// 	count: number;
	// 	snapshot: Transaction[];
	// } | null>(null);
	const [, setIsEditModalOpen] = useState(false);
	const setToast = useStore((state) => state.setToast);

	const handleRuleSaved = (count: number, snapshot: Transaction[]) => {
		// Set the state
		setToast({ count, snapshot });

		// Close the modal
		setSelectedTransaction(null);
	};

	// --- Sort & Filter Logic ---
	const filteredAndGrouped = useMemo(() => {
		// 1. Filter by search
		const filtered = transactions.filter((t) =>
			t.description.toLowerCase().includes(searchQuery.toLowerCase()),
		);

		// 2. Multi-column Sort
		const sorted = [...filtered].sort((a, b) => {
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

		// 3. Group by Date
		const groups: Record<string, typeof transactions> = {};
		sorted.forEach((t) => {
			const dateKey = formatDateLong(t.date);
			if (!groups[dateKey]) groups[dateKey] = [];
			groups[dateKey].push(t);
		});
		return groups;
	}, [transactions, searchQuery, sortPriority]);

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
			date: new Date().toISOString().split("T")[0], // YYYY-MM-DD
			account: "",
			needsReview: false,
			needsSubcat: false,
		};

		setSelectedTransaction(blankTx);
		setIsEditModalOpen(true);
	};

	const EditTransactionModal = dynamic(
		() => import("@/components/Budget/EditTransactionModal"),
		{
			ssr: false, // This disables server-side rendering
		},
	);

	useEffect(() => {
		const handleBeforeUnload = (e: BeforeUnloadEvent) => {
			e.preventDefault();
			e.returnValue = ""; // This will trigger a "Do you want to leave this site?" popup
		};
		window.addEventListener("beforeunload", handleBeforeUnload);
		return () => window.removeEventListener("beforeunload", handleBeforeUnload);
	}, []);

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

				{/* Grouped Search and Actions */}
				<div className="flex items-center gap-2">
					{/* Filter Trigger */}
					<button className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 transition-colors border border-transparent hover:border-gray-700">
						<Filter size={18} />
					</button>
					<div className="relative">
						<Search
							className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
							size={14}
						/>
						<input
							type="text"
							placeholder="Search..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="bg-[#F8F9FB] dark:bg-gray-900 border border-gray-400 dark:border-gray-800 rounded-lg py-1.5 pl-9 pr-4 text-sm focus:ring-1 focus:ring-orange-500 outline-none w-40 md:w-64"
						/>
					</div>

					{/* Add manually */}
					<button
						className="flex items-center gap-2 px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-medium transition-colors"
						onClick={handleAddTransaction}
					>
						<Plus size={16} />
						<span className="hidden sm:inline">Add</span>
					</button>

					{/* Import data */}
					<button
						className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-medium transition-colors border border-gray-700"
						onClick={() => setShowUploader(true)}
					>
						<Upload size={16} />
						<span className="hidden sm:inline">Import</span>
					</button>

					{/* TRASH ICON - Let's make it bright red to find it */}
					<button
						onClick={() => {
							setShowClearModal(true);
						}}
						className="p-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-all shadow-lg shadow-red-600/20"
						title="Clear all data"
					>
						<Trash2 size={18} />
					</button>
				</div>
			</div>

			{/* 2. Data Table */}
			<div className="flex-1 overflow-auto px-4 md:px-6">
				<table className="w-full border-collapse">
					<thead className="sticky top-0 bg-[#F8F9FB] dark:bg-[#0d0d0d] z-20">
						<tr className="text-[10px] font-bold text-gray-500 uppercase tracking-widest text-left border-b border-gray-800">
							<SortableHeader
								label="Name"
								activeKey="name"
								sortPriority={sortPriority}
								onClick={handleSort}
							/>
							<SortableHeader
								label="Category"
								activeKey="category"
								sortPriority={sortPriority}
								onClick={handleSort}
							/>
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
							<th className="py-4 px-2">Description</th>
							<th className="py-4 px-2 w-10"></th>
						</tr>
					</thead>
					<tbody className="divide-y divide-gray-800/40 text-sm">
						{Object.entries(filteredAndGrouped).map(([date, items]) => (
							<React.Fragment key={date}>
								<tr className="sticky top-11.25 z-10 bg-[#F8F9FB] dark:bg-[#121212]/95 backdrop-blur-sm border-y border-gray-800/50">
									<td
										colSpan={7}
										className="py-2 px-2 text-[11px] font-bold text-orange-400/80 uppercase"
									>
										{date}
									</td>
								</tr>
								{items.map((t) => (
									<TransactionRow
										key={t.id}
										transaction={t}
										onRowClick={() => setSelectedTransaction(t)}
									/>
								))}
							</React.Fragment>
						))}
					</tbody>
				</table>
			</div>

			{/* 3. CSV Uploader Modal */}
			{showUploader && (
				<div className="fixed inset-0 z-100 flex items-center justify-center p-4">
					<div
						className="absolute inset-0 bg-black/80 backdrop-blur-md"
						onClick={() => setShowUploader(false)}
					/>
					<div className="relative bg-[#1a1a1a] border border-gray-800 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden">
						<div className="p-6 border-b border-gray-800 flex justify-between items-center">
							<h3 className="text-lg font-bold text-white">
								Import CSV Statement
							</h3>
							<button
								onClick={() => setShowUploader(false)}
								className="text-gray-500 hover:text-white"
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
			{/*Clear Modal */}
			{showClearModal && (
				<ClearDataModal
					isOpen={showClearModal}
					onClose={() => setShowClearModal(false)}
				/>
			)}

			{/* Edit Transaction Modal */}
			{selectedTransaction && (
				<EditTransactionModal
					key={selectedTransaction.id} // Prevents the 'cascading render' error
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
