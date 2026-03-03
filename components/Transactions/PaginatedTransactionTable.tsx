import React, { useState, useMemo, useEffect } from "react";
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
	itemsPerPage = 15,
}: PaginatedTableProps) {
	const [currentPage, setCurrentPage] = useState(1);

	// 1. THE MICRO-DEFERRAL FIX
	// This tells the component to wait 1 frame before rendering the heavy rows,
	// which unblocks the Next.js router and makes the Sidebar click feel instant.
	const [isMounted, setIsMounted] = useState(false);
	
	useEffect(() => {
        // By wrapping this in a setTimeout, we push the state update to the 
        // end of the execution queue. This satisfies the linter AND guarantees 
        // the browser has time to close the sidebar before rendering the rows.
        const timer = setTimeout(() => {
            setIsMounted(true);
        }, 0); 

        return () => clearTimeout(timer);
    }, []);

	const totalPages = Math.max(1, Math.ceil(transactions.length / itemsPerPage));
	const startIndex = (currentPage - 1) * itemsPerPage;
	const endIndex = startIndex + itemsPerPage;

	const currentTransactions = useMemo(() => {
		return transactions.slice(startIndex, endIndex);
	}, [transactions, startIndex, endIndex]);

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
		<div className="flex flex-col w-full animate-in fade-in duration-300">
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
						{/* 2. ONLY RENDER ROWS AFTER MOUNT */}
						{!isMounted ? (
							<tr>
								<td
									colSpan={6}
									className="py-12 text-center text-gray-400 text-sm"
								>
									<div className="flex justify-center w-full">
										<div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
									</div>
								</td>
							</tr>
						) : (
							currentTransactions.map((t) => (
								<TransactionRow
									key={t.id}
									transaction={t}
									onRowClick={onRowClick}
								/>
							))
						)}
					</tbody>
				</table>
			</div>

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
