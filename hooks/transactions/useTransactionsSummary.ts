/**
 * @file useTransactionsSummary.ts
 * @description Computes summary statistics for the full transaction list.
 * Calculates totals, averages, largest amounts, and date ranges.
 * Used by the SummarySidebar component.
 *
 * @param transactions - The complete (unfiltered) array of transactions.
 * @returns An object containing total count, largest amounts, avg, income/spending totals, and first/last dates.
 */
import { useMemo } from "react";
import { Transaction } from "@/store/useBudgetStore";

export function useTransactionsSummary(transactions: Transaction[]) {
	return useMemo(() => {
		let largestTransaction = 0,
			largestExpense = 0,
			totalIncome = 0,
			totalSpending = 0;
		let firstDate = "",
			lastDate = "";

		for (const tx of transactions) {
			const abs = Math.abs(tx.amount);
			if (abs > largestTransaction) largestTransaction = abs;
			if (tx.amount < 0 && abs > largestExpense) largestExpense = abs;
			if (tx.amount > 0) totalIncome += tx.amount;
			else totalSpending += abs;
			if (!firstDate || tx.date < firstDate) firstDate = tx.date;
			if (!lastDate || tx.date > lastDate) lastDate = tx.date;
		}

		const avgTx = transactions.length
			? (totalIncome + totalSpending) / transactions.length
			: 0;
		const formatDate = (d: string) => {
			if (!d) return "N/A";
			try {
				return new Intl.DateTimeFormat("en-US", {
					month: "short",
					day: "numeric",
					year: "numeric",
				}).format(new Date(d));
			} catch {
				return d;
			}
		};

		return {
			total: transactions.length,
			largestTx: largestTransaction,
			largestEx: largestExpense,
			avgTx,
			totalIncome,
			totalSpending,
			firstDate: formatDate(firstDate),
			lastDate: formatDate(lastDate),
		};
	}, [transactions]);
}
