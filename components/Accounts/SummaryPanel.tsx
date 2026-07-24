"use client";

import { useState } from "react";
import {
	Download,
	Sparkles,
} from "lucide-react";

import type {
	AccountRecord,
	SummaryMode,
} from "@/components/Accounts/types";
import { formatSignedCurrency } from "@/utils/formatters";

export function SummaryPanel({
	accounts,
	summary,
	mode,
	onModeChange,
}: {
	accounts: AccountRecord[];
	summary: { assets: number; liabilities: number; netWorth: number };
	mode: SummaryMode;
	onModeChange: (mode: SummaryMode) => void;
}) {
	const assetAccounts = accounts.filter((account) => !account.isLiability);
	const liabilityAccounts = accounts.filter((account) => account.isLiability);
	const [showInsight, setShowInsight] = useState(false);

	const renderRows = (
		rows: AccountRecord[],
		total: number,
		color: string,
	) => {
		const groupTotals = new Map<string, number>();

		for (const account of rows) {
			groupTotals.set(
				account.group,
				(groupTotals.get(account.group) ?? 0) + Math.abs(account.balance),
			);
		}

		return [...groupTotals.entries()].map(([label, value]) => (
			<div key={label} className="flex items-center justify-between text-sm">
				<span className="flex items-center gap-2">
					<span className={`size-2 rounded-full ${color}`} />
					{label}
				</span>
				<strong>
					{mode === "totals"
						? formatSignedCurrency(value)
						: `${total > 0 ? Math.round((value / total) * 100) : 0}%`}
				</strong>
			</div>
		));
	};

	const downloadCsv = () => {
		const lines = [
			["Name", "Type", "Group", "Balance"],
			...accounts.map((account) => [
				account.name,
				account.type,
				account.group,
				String(account.balance),
			]),
		];

		const csv = lines
			.map((line) =>
				line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","),
			)
			.join("\n");
		const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement("a");
		anchor.href = url;
		anchor.download = "accounts-summary.csv";
		anchor.click();
		URL.revokeObjectURL(url);
	};

	return (
		<aside className="relative self-start overflow-visible rounded-2xl border border-gray-200 bg-white xl:sticky xl:top-4 dark:border-white/5 dark:bg-[#222]">
			<div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-white/5">
				<div className="relative">
					<button
						type="button"
						onMouseEnter={() => setShowInsight(true)}
						onMouseLeave={() => setShowInsight(false)}
						onFocus={() => setShowInsight(true)}
						onBlur={() => setShowInsight(false)}
						className="flex items-center gap-2 text-base font-semibold"
					>
						Summary <Sparkles size={16} className="text-orange-500" />
					</button>

					{showInsight && (
						<div className="absolute -left-4 bottom-[calc(100%+16px)] z-50 w-80 rounded-2xl border border-white/5 bg-[#111] p-4 shadow-2xl">
							<div className="flex items-center gap-2 font-semibold text-orange-500">
								<Sparkles size={16} />
								AI Insights
							</div>
							<div className="mt-3 border-t border-white/10 pt-3 text-sm font-semibold">
								Understand insights about your assets & liabilities
							</div>
							<div className="absolute -bottom-2 left-40 size-4 rotate-45 bg-[#111]" />
						</div>
					)}
				</div>

				<div className="flex rounded-full border border-gray-200 bg-gray-100 p-1 text-xs dark:border-white/5 dark:bg-[#2b2b2b]">
					<button
						type="button"
						onClick={() => onModeChange("totals")}
						className={`rounded-full px-3 py-1.5 font-medium transition-colors ${
							mode === "totals"
								? "bg-white text-gray-900 shadow-sm dark:bg-[#353535] dark:text-white dark:shadow-none"
								: "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
						}`}
					>
						Totals
					</button>

					<button
						type="button"
						onClick={() => onModeChange("percent")}
						className={`rounded-full px-3 py-1.5 font-medium transition-colors ${
							mode === "percent"
								? "bg-white text-gray-900 shadow-sm dark:bg-[#353535] dark:text-white dark:shadow-none"
								: "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
						}`}
					>
						Percent
					</button>
				</div>
			</div>

			<div className="border-b border-gray-200 p-5 dark:border-white/5">
				<div className="flex items-center justify-between">
					<strong>Assets</strong>
					<strong className="text-gray-500 dark:text-zinc-400">
						{formatSignedCurrency(summary.assets)}
					</strong>
				</div>
				<div className="my-4 h-3 overflow-hidden rounded-sm bg-zinc-800">
					<div className="h-full w-full rounded-sm bg-emerald-500/80" />
				</div>
				<div className="space-y-4">
					{renderRows(assetAccounts, summary.assets, "bg-emerald-500")}
				</div>
			</div>

			<div className="border-b border-gray-200 p-5 dark:border-white/5">
				<div className="flex items-center justify-between">
					<strong>Liabilities</strong>
					<strong className="text-gray-500 dark:text-zinc-400">
						{formatSignedCurrency(summary.liabilities)}
					</strong>
				</div>
				<div className="my-4 h-3 overflow-hidden rounded-sm bg-zinc-800">
					<div className="h-full w-full rounded-sm bg-red-500" />
				</div>
				<div className="space-y-4">
					{renderRows(liabilityAccounts, summary.liabilities, "bg-red-500")}
				</div>
			</div>

			<button
				type="button"
				onClick={downloadCsv}
				className="flex w-full items-center justify-center gap-2 px-5 py-5 text-sm font-semibold text-cyan-400 transition hover:bg-white/[0.03]"
			>
				<Download size={15} />
				Download CSV
			</button>
		</aside>
	);
}
