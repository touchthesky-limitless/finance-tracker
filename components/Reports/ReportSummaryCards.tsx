import type { ReportSummary } from "@/components/Reports/types";
import { formatMoney } from "@/utils/formatters";

export function ReportSummaryCards({ summary }: { summary: ReportSummary }) {
	const cards = [
		{
			label: "Total income",
			value: formatMoney(summary.totalIncome),
			className: "text-emerald-600 dark:text-emerald-400",
		},
		{
			label: "Total expenses",
			value: formatMoney(summary.totalExpenses),
			className: "text-red-600 dark:text-red-400",
		},
		{
			label: "Total net income",
			value: formatMoney(summary.netIncome),
			className: "text-gray-950 dark:text-white",
		},
		{
			label: "Savings rate",
			value: `${Math.round(summary.savingsRate)}%`,
			className: "text-gray-950 dark:text-white",
		},
	];

	return (
		<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
			{cards.map((card) => (
				<section
					key={card.label}
					className="flex min-h-28 flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white px-5 py-6 text-center shadow-sm dark:border-white/5 dark:bg-[#1b1b1b]"
				>
					<strong className={`text-2xl font-bold tracking-tight ${card.className}`}>
						{card.value}
					</strong>
					<span className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-gray-500 dark:text-zinc-400">
						{card.label}
					</span>
				</section>
			))}
		</div>
	);
}
