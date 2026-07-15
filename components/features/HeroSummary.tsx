import { memo } from "react";
import { DonutLegend } from "@/components/ui/DonutLegend";
import { SparklineStat } from "@/components/ui/SparklineStat";
import { formatCurrency, formatCompact } from "@/utils/formatters";

interface HeroSummaryProps {
	stats: {
		income: number;
		remaining: number;
		expenses: number;
	};
	budgetMetrics: {
		remaining: number;
		spent: number;
	};
}

export const HeroSummary = memo(function HeroSummary({
	stats,
	budgetMetrics,
}: HeroSummaryProps) {
	return (
		<div className="bg-white dark:bg-[#121212] border border-gray-100 dark:border-gray-800/80 rounded-3xl p-6 shadow-sm mb-6 flex flex-col @4xl:flex-row items-center gap-8 relative z-10">
			<div className="flex items-center gap-6 w-full @4xl:w-[35%] @4xl:border-r border-gray-100 dark:border-gray-800 @4xl:pr-8 shrink-0">
				<div
					className="relative w-28 h-28 shrink-0 rounded-full flex items-center justify-center drop-shadow-sm"
					style={{
						background: `conic-gradient(#10b981 0% ${budgetMetrics.remaining}%, #8b5cf6 ${budgetMetrics.remaining}% ${budgetMetrics.remaining + budgetMetrics.spent}%, #f59e0b ${budgetMetrics.remaining + budgetMetrics.spent}% 100%)`,
					}}
				>
					<div className="w-20 h-20 bg-white dark:bg-[#121212] rounded-full flex flex-col items-center justify-center shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]">
						<span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
							Income
						</span>
						<span className="text-sm font-black text-gray-900 dark:text-white">
							{formatCompact(stats.income)}
						</span>
					</div>
				</div>
				<div className="flex flex-col gap-3 w-full min-w-0">
					<DonutLegend
						color="bg-green-500"
						label="Remaining"
						value={`${budgetMetrics.remaining}%`}
						amount={formatCurrency(stats.remaining)}
					/>
					<DonutLegend
						color="bg-purple-500"
						label="Spent"
						value={`${budgetMetrics.spent}%`}
						amount={formatCurrency(stats.expenses)}
					/>
					<DonutLegend
						color="bg-orange-500"
						label="Debt/Bills"
						value="0%"
						amount="$0.00"
					/>
				</div>
			</div>

			<div className="w-full @4xl:w-[65%] grid grid-cols-1 @2xl:grid-cols-3 gap-6 @4xl:gap-8">
				<SparklineStat
					title="Total Spent"
					amount={formatCurrency(stats.expenses)}
					trend="Active"
					isPositive={true}
					sparklineColor="#8b5cf6"
					path="M0 10 C 20 10, 30 20, 50 15 C 70 10, 80 25, 100 20"
				/>
				<SparklineStat
					title="Total Debt"
					amount="$12,340.00"
					trend="+0.8%"
					isPositive={false}
					sparklineColor="#f59e0b"
					path="M0 5 C 20 5, 40 15, 60 10 C 80 5, 90 15, 100 20"
				/>
				<SparklineStat
					title="Net Worth"
					amount="$142,500.00"
					trend="+2.4%"
					isPositive={true}
					sparklineColor="#10b981"
					path="M0 25 Q 15 20, 30 25 T 70 15 T 100 5"
				/>
			</div>
		</div>
	);
});