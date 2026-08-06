/**
 * Summary sidebar for the Category Group Details page.
 * Displays aggregate statistics (count, largest, average, totals, first/last dates)
 * and a CSV download button.
 */

import { getReportSummary } from "@/components/Reports/reportUtils";
import { formatMoney } from "@/utils/formatters";
import type { Transaction } from "@/store/useBudgetStore";

interface GroupTransactionSummaryProps {
	transactions: Transaction[];
}

export function GroupTransactionSummary({
	transactions,
}: GroupTransactionSummaryProps) {
	const summary = getReportSummary(transactions);

	const downloadCsv = () => {
		const escapeValue = (value: unknown): string =>
			`"${String(value ?? "").replaceAll('"', '""')}"`;
		const rows = [
			["Date", "Merchant", "Category", "Account", "Amount"],
			...transactions.map((t) => [
				t.date,
				t.merchant,
				t.category,
				t.account,
				t.amount,
			]),
		];
		const csv = rows.map((row) => row.map(escapeValue).join(",")).join("\n");
		const url = URL.createObjectURL(
			new Blob([csv], { type: "text/csv;charset=utf-8" }),
		);
		const anchor = document.createElement("a");
		anchor.href = url;
		anchor.download = "category-group-transactions.csv";
		anchor.click();
		URL.revokeObjectURL(url);
	};

	return (
		<aside className="h-fit overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/5 dark:bg-[#1b1b1b]">
			<h2 className="border-b border-gray-200 px-5 py-4 text-lg font-bold dark:border-white/5">
				Summary
			</h2>
			<dl className="space-y-4 px-5 py-5 text-sm">
				{[
					["Total transactions", String(transactions.length)],
					["Largest transaction", formatMoney(summary.largestTransaction)],
					["Average transaction", formatMoney(summary.averageTransaction)],
					["Total income", formatMoney(summary.totalIncome)],
					["Total spending", formatMoney(summary.totalExpenses)],
					["First transaction", summary.firstTransaction?.date ?? "—"],
					["Last transaction", summary.lastTransaction?.date ?? "—"],
				].map(([label, value]) => (
					<div key={label} className="flex items-center justify-between gap-6">
						<dt className="text-gray-500 dark:text-zinc-400">{label}</dt>
						<dd className="text-right font-semibold text-gray-900 dark:text-white">
							{value}
						</dd>
					</div>
				))}
			</dl>
			<button
				type="button"
				onClick={downloadCsv}
				disabled={transactions.length === 0}
				className="w-full border-t border-gray-200 py-4 text-sm font-semibold text-cyan-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/5 dark:text-cyan-400 dark:hover:bg-white/5"
			>
				Download CSV
			</button>
		</aside>
	);
}
