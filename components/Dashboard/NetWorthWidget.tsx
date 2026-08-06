/**
 * Net worth chart widget. Renders the NetWorthChart component with
 * configurable chart type, date range, and timeframe.
 */
"use client";

import { useState } from "react";
import { GripVertical } from "lucide-react";
import { NetWorthChart } from "@/components/Accounts/chart/NetWorthChart";
import { useNetWorthHistory } from "@/hooks/useNetWorthHistory";
import { ChartType, DateRange, Timeframe } from "@/components/Accounts/types";

interface NetWorthWidgetProps {
	summary: { assets: number; liabilities: number; net: number };
	breakdownGroups: {
		assets: { group: string; amount: number }[];
		liabilities: { group: string; amount: number }[];
	};
}

export function NetWorthWidget({
	summary,
	breakdownGroups,
}: NetWorthWidgetProps) {
	const [chartType, setChartType] = useState<ChartType>("performance");
	const [dateRange, setDateRange] = useState<DateRange>("1M");
	const [timeframe, setTimeframe] = useState<Timeframe>("month");

	const { points } = useNetWorthHistory({
		dateRange,
		timeframe,
		currentNetWorth: summary.net,
	});

	return (
		<div className="flex h-82 w-full flex-col rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/5 dark:bg-[#232322] p-5 sm:h-80 md:h-96 lg:h-96">
			<div className="flex shrink-0 items-center">
				<GripVertical className="text-gray-300 dark:text-gray-600" size={18} />
			</div>

			<div className="flex h-72 w-full flex-col sm:h-80 md:h-96 lg:h-96">
				<NetWorthChart
					key={dateRange}
					chartType={chartType}
					dateRange={dateRange}
					timeframe={timeframe}
					points={points}
					summary={summary}
					breakdownGroups={breakdownGroups}
					onChartTypeChange={setChartType}
					onDateRangeChange={setDateRange}
					onTimeframeChange={setTimeframe}
					chartHeight="100%"
					className="h-full w-full border-none bg-transparent p-0 shadow-none"
					showChartTypeSelector={false}
				/>
			</div>
		</div>
	);
}
