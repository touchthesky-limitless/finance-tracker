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
	const [isMounted, setIsMounted] = useState(false);

	useEffect(function () {
		const timer = setTimeout(function () {
			setIsMounted(true);
		}, 0);

		return function () {
			clearTimeout(timer);
		};
	}, []);

	const totalPages = Math.max(1, Math.ceil(transactions.length / itemsPerPage));
	const startIndex = (currentPage - 1) * itemsPerPage;
	const endIndex = startIndex + itemsPerPage;

	const currentTransactions = useMemo(
		function () {
			const result = [];
			const limit = Math.min(endIndex, transactions.length);
			for (let i = startIndex; i < limit; i++) {
				result.push(transactions[i]);
			}
			return result;
		},
		[transactions, startIndex, endIndex],
	);

	const goToNextPage = function () {
		setCurrentPage(function (p) {
			return p < totalPages ? p + 1 : p;
		});
	};

	const goToPrevPage = function () {
		setCurrentPage(function (p) {
			return p > 1 ? p - 1 : p;
		});
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
							currentTransactions.map(function (t) {
								return (
									<TransactionRow
										key={t.id}
										transaction={t}
										onRowClick={onRowClick}
									/>
								);
							})
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
