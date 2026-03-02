import React, { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Transaction } from "@/store/useBudgetStore";
import { TransactionRow } from "@/components/Transactions/TransactionRow";

interface PaginatedTableProps {
	transactions: Transaction[];
	onRowClick: (transaction: Transaction) => void;
	itemsPerPage?: number;
}

export function PaginatedTransactionTable({
	transactions,
	onRowClick,
	itemsPerPage = 15, // Default to 15 rows per page
}: PaginatedTableProps) {
	const [currentPage, setCurrentPage] = useState(1);

	// 2. Calculate Pagination Math
	const totalPages = Math.max(1, Math.ceil(transactions.length / itemsPerPage));
	const startIndex = (currentPage - 1) * itemsPerPage;
	const endIndex = startIndex + itemsPerPage;

	// 3. Slice the array for the current page
	const currentTransactions = useMemo(() => {
		return transactions.slice(startIndex, endIndex);
	}, [transactions, startIndex, endIndex]);

	// --- HANDLERS ---
	const goToNextPage = () => {
		if (currentPage < totalPages) setCurrentPage((p) => p + 1);
	};

	const goToPrevPage = () => {
		if (currentPage > 1) setCurrentPage((p) => p - 1);
	};

	if (transactions.length === 0) {
		return (
			<div className="py-12 text-center text-gray-500 italic text-sm">
				No transactions found for this period.
			</div>
		);
	}

	return (
		<div className="flex flex-col w-full">
			{/* TABLE */}
			<div className="w-full overflow-x-auto">
				<table className="w-full text-left border-collapse">
					<thead>
						<tr className="border-b border-gray-200 dark:border-gray-800 text-[10px] uppercase tracking-wider text-gray-400">
							<th className="py-3 px-2 font-bold">Description</th>
							<th className="py-3 px-2 font-bold">Category</th>
							<th className="py-3 px-2 font-bold text-right">Amount</th>
							<th className="py-3 px-2 font-bold">Account</th>
							<th className="py-3 px-2 font-bold">Tags</th>
							<th className="py-3 px-2 font-bold">Status</th>
						</tr>
					</thead>
					<tbody>
						{currentTransactions.map((t) => (
							<TransactionRow
								key={t.id}
								transaction={t}
								onRowClick={onRowClick}
							/>
						))}
					</tbody>
				</table>
			</div>

			{/* PAGINATION CONTROLS */}
			{totalPages > 1 && (
				<div className="flex items-center justify-between py-4 px-2 mt-2 border-t border-gray-100 dark:border-gray-800/50">
					<span className="text-xs text-gray-500 font-medium">
						Showing {startIndex + 1} to{" "}
						{Math.min(endIndex, transactions.length)} of {transactions.length}
					</span>

					<div className="flex items-center gap-2">
						<button
							onClick={goToPrevPage}
							disabled={currentPage === 1}
							className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
						>
							<ChevronLeft size={16} />
						</button>

						<span className="text-xs font-bold text-gray-900 dark:text-white min-w-15 text-center">
							Page {currentPage} of {totalPages}
						</span>

						<button
							onClick={goToNextPage}
							disabled={currentPage === totalPages}
							className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
						>
							<ChevronRight size={16} />
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
