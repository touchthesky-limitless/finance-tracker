import { memo } from "react";
import { ChevronLeft } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { formatCurrency, formatYAxis, YEARS } from "@/utils/formatters";

interface MonthlyDataPoint {
	label: string;
	value: number;
	height: number;
}

interface SpendingChartProps {
	stats: { expenses: number };
	monthlyData: MonthlyDataPoint[];
	activeYear: number;
	timeFilter: string;
	maxMonthlyValue: number;
	onFilterChange: (filter: string) => void;
}

export const SpendingChart = memo(function SpendingChart({
	stats,
	monthlyData,
	activeYear,
	timeFilter,
	maxMonthlyValue,
	onFilterChange,
}: SpendingChartProps) {
	const topScale = Math.ceil((maxMonthlyValue || 1000) / 1000) * 1000;
	const yAxisLabels = [
		formatYAxis(topScale),
		formatYAxis(topScale * 0.66),
		formatYAxis(topScale * 0.33),
		"0",
	];

	const yAxisLabelElements = [];
	for (let i = 0; i < yAxisLabels.length; i++) {
		yAxisLabelElements.push(<span key={i}>{yAxisLabels[i]}</span>);
	}

	const chartBarElements = [];
	for (let i = 0; i < monthlyData.length; i++) {
		const d = monthlyData[i];
		const isYearlyView = monthlyData.length <= 12;
		const isActive = isYearlyView && timeFilter.includes(d.label);

		chartBarElements.push(
			<div
				key={i}
				onClick={() => {
					if (isYearlyView) {
						const newFilter = `${d.label} ${activeYear}`;
						onFilterChange(newFilter);
					}
				}}
				className={`relative flex-1 transition-all duration-300 group rounded-t-sm
                    ${isYearlyView ? "cursor-pointer" : "cursor-default"}
                    ${
											isActive
												? "bg-orange-600 shadow-[0_0_15px_rgba(234,88,12,0.3)]"
												: "bg-orange-100 dark:bg-orange-500/20 hover:bg-orange-400 dark:hover:bg-orange-500/40"
										}`}
				style={{ height: `${d.height}%` }}
			>
				<div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[10px] font-bold py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none shadow-lg">
					{isYearlyView ? d.label : `Day ${d.label}`}: {formatCurrency(d.value)}
				</div>
				{isActive && (
					<div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-1 h-1 bg-orange-600 rounded-full" />
				)}
			</div>,
		);
	}

	const xAxisLabelElements = [];
	for (let i = 0; i < monthlyData.length; i++) {
		const d = monthlyData[i];
		const isDaily = monthlyData.length > 12;
		let shouldShowLabel = true;

		if (isDaily) {
			if (i % 5 !== 0 && i !== monthlyData.length - 1) {
				shouldShowLabel = false;
			}
		}

		xAxisLabelElements.push(
			<span
				key={i}
				className={`flex-1 text-center ${!shouldShowLabel && isDaily ? "invisible" : ""}`}
			>
				{d.label}
			</span>,
		);
	}

	const yearToggleElements = [];
	for (let i = 0; i < YEARS.length; i++) {
		const year = YEARS[i];
		yearToggleElements.push(
			<button
				key={year}
				onClick={() => {
					const newYearFilter = `Year ${year}`;
					onFilterChange(newYearFilter);
				}}
				className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${
					activeYear === year
						? "bg-white dark:bg-[#121212] text-orange-600 dark:text-orange-500 shadow-sm"
						: "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
				}`}
			>
				{year}
			</button>,
		);
	}

	return (
		<Card
			className="@5xl:col-span-2 flex flex-col"
			title="Spending Trends"
			action={
				<div className="flex items-center gap-3">
					{monthlyData.length > 12 && (
						<button
							onClick={() => {
								const resetFilter = `Year ${activeYear}`;
								onFilterChange(resetFilter);
							}}
							className="flex items-center gap-1 text-[10px] font-bold text-orange-600 hover:text-orange-700 bg-orange-50 dark:bg-orange-500/10 px-2 py-1 rounded-md transition-all active:scale-95"
						>
							<ChevronLeft size={12} />
							Back to {activeYear}
						</button>
					)}

					{monthlyData.length <= 12 && (
						<div className="flex bg-gray-100 dark:bg-[#0d0d0d] p-1 rounded-lg border border-transparent dark:border-white/5">
							{yearToggleElements}
						</div>
					)}
				</div>
			}
		>
			<div className="flex items-center justify-between mt-4 mb-8">
				<div className="flex flex-col overflow-hidden">
					<span className="text-3xl @2xl:text-4xl @4xl:text-5xl font-bold text-gray-900 dark:text-white tracking-tight truncate">
						{formatCurrency(stats.expenses).split(".")[0]}
						<span className="text-gray-400 text-xl @2xl:text-2xl @4xl:text-3xl">
							.{formatCurrency(stats.expenses).split(".")[1]}
						</span>
					</span>
					<span className="text-sm text-gray-500 font-medium mt-1 truncate">
						{monthlyData.length <= 12
							? `Total spent in ${activeYear}`
							: `Daily spending for ${timeFilter}`}
					</span>
				</div>
			</div>

			<div className="flex h-48 w-full mb-2">
				<div className="flex flex-col justify-between text-[10px] font-bold text-gray-400 text-right pr-3 pb-1 w-10 shrink-0 mt-0.5">
					{yAxisLabelElements}
				</div>
				<div className="relative flex-1 flex items-end gap-1 sm:gap-2 px-1 border-b border-gray-100 dark:border-gray-800/50">
					<div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-1">
						<div className="w-full border-t border-gray-100 dark:border-gray-800/30 h-0 mt-2"></div>
						<div className="w-full border-t border-gray-100 dark:border-gray-800/30 h-0"></div>
						<div className="w-full border-t border-gray-100 dark:border-gray-800/30 h-0"></div>
						<div className="w-full h-0"></div>
					</div>
					{chartBarElements}
				</div>
			</div>
			<div className="flex justify-between text-[10px] sm:text-xs text-gray-400 font-bold tracking-wider pl-12 pr-2 mt-2">
				{xAxisLabelElements}
			</div>
		</Card>
	);
});