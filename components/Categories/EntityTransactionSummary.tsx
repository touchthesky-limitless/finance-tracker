/**
 * EntityTransactionSummary - Displays summary stats for a list of transactions.
 */

"use client";

import type { Transaction } from "@/store/useBudgetStore";
import { getReportSummary } from "@/components/Reports/reportUtils";
import { formatMoney } from "@/utils/formatters";

export function EntityTransactionSummary({
	transactions,
	csvFilename,
}: {
	transactions: Transaction[];
	csvFilename: string;
}) {
	const summary = getReportSummary(transactions);

	const downloadCsv = (): void => {
		const escapeValue = (v: unknown): string =>
			`"${String(v ?? "").replaceAll('"', '""')}"`;
		const rows = [
			["Date", "Merchant", "Category", "Account", "Amount"],
			...transactions.map((tx) => [
				tx.date,
				tx.merchant,
				tx.category,
				tx.account,
				tx.amount,
			]),
		];
		const csv = rows.map((row) => row.map(escapeValue).join(",")).join("\n");
		const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = csvFilename;
		a.click();
		URL.revokeObjectURL(url);
	};

	const items: [string, string][] = [
		["Total transactions", String(transactions.length)],
		["Largest transaction", formatMoney(summary.largestTransaction)],
		["Average transaction", formatMoney(summary.averageTransaction)],
		["Total income", formatMoney(summary.totalIncome)],
		["Total spending", formatMoney(summary.totalExpenses)],
		["First transaction", summary.firstTransaction?.date ?? "—"],
		["Last transaction", summary.lastTransaction?.date ?? "—"],
	];

	return (
		<aside className="h-fit overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/5 dark:bg-[#1b1b1b]">
			<h2 className="border-b border-gray-200 px-5 py-4 text-lg font-bold dark:border-white/5">
				Summary
			</h2>
			<dl className="space-y-4 px-5 py-5 text-sm">
				{items.map(([label, value]) => (
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
