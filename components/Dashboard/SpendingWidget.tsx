/**
 * Displays a cumulative spending chart comparing current period against a previous one.
 * Supports week, month, month‑over‑last‑year, month‑average, and year views.
 */
"use client";

import { useMemo, useState } from "react";
import * as Select from "@radix-ui/react-select";
import { ChevronDown } from "lucide-react";
import {
	Area,
	AreaChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { Transaction } from "@/store/useBudgetStore";
import {
	formatCurrency,
	formatTooltipValue,
	formatYAxis,
} from "@/utils/formatters";
import { getReportSummary } from "@/components/Reports/reportUtils";
import {
	SpendingPeriod,
	getDateRangesForPeriod,
	computeAverageMonthData,
} from "@/utils/dashboard";
import { WidgetShell } from "./WidgetShell";
import React from "react";

const SelectItem = React.forwardRef<
	HTMLDivElement,
	Select.SelectItemProps & { children: React.ReactNode }
>(({ children, ...props }, forwardedRef) => {
	return (
		<Select.Item
			{...props}
			ref={forwardedRef}
			className="relative flex w-full cursor-default select-none items-center rounded-md px-3 py-2 text-sm font-medium outline-none hover:bg-gray-100 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 dark:text-gray-200 dark:hover:bg-white/10"
		>
			<Select.ItemText>{children}</Select.ItemText>
		</Select.Item>
	);
});
SelectItem.displayName = "SelectItem";

export function SpendingWidget({
	transactions,
}: {
	transactions: Transaction[];
}) {
	const [period, setPeriod] = useState<SpendingPeriod>("month");

	const ranges = useMemo(() => getDateRangesForPeriod(period), [period]);

	const currentTxs = useMemo(
		() =>
			transactions.filter((tx) => {
				const d = new Date(tx.date);
				return (
					d >= ranges.currentStart && d <= ranges.currentEnd && tx.amount < 0
				);
			}),
		[transactions, ranges],
	);

	const previousTxs = useMemo(() => {
		if (period === "month_average") return [];
		return transactions.filter((tx) => {
			const d = new Date(tx.date);
			return (
				d >= ranges.previousStart && d <= ranges.previousEnd && tx.amount < 0
			);
		});
	}, [transactions, ranges, period]);

	const currentSummary = useMemo(
		() => getReportSummary(currentTxs),
		[currentTxs],
	);

	const chartData = useMemo(() => {
		if (period === "year") {
			const currentMonthData = new Map<string, number>();
			let cum = 0;
			const sortedCurrent = [...currentTxs].sort(
				(a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
			);
			for (const tx of sortedCurrent) {
				const monthLabel = new Date(tx.date).toLocaleDateString("en-US", {
					month: "short",
				});
				cum += Math.abs(tx.amount);
				currentMonthData.set(monthLabel, cum);
			}

			const previousMonthData = new Map<string, number>();
			cum = 0;
			const sortedPrevious = [...previousTxs].sort(
				(a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
			);
			for (const tx of sortedPrevious) {
				const monthLabel = new Date(tx.date).toLocaleDateString("en-US", {
					month: "short",
				});
				cum += Math.abs(tx.amount);
				previousMonthData.set(monthLabel, cum);
			}

			const allMonths = new Set([
				...currentMonthData.keys(),
				...previousMonthData.keys(),
			]);
			const sortedMonths = Array.from(allMonths).sort((a, b) => {
				const months = [
					"Jan",
					"Feb",
					"Mar",
					"Apr",
					"May",
					"Jun",
					"Jul",
					"Aug",
					"Sep",
					"Oct",
					"Nov",
					"Dec",
				];
				return months.indexOf(a) - months.indexOf(b);
			});

			return sortedMonths.map((month) => ({
				day: month,
				current: currentMonthData.get(month) || 0,
				previous: previousMonthData.get(month) || 0,
			}));
		}

		const currentMap = new Map<number, number>();
		let cumulative = 0;
		const sortedCurrent = [...currentTxs].sort(
			(a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
		);
		for (const tx of sortedCurrent) {
			const day = new Date(tx.date).getDate();
			cumulative += Math.abs(tx.amount);
			currentMap.set(day, cumulative);
		}

		const previousMap = new Map<number, number>();
		if (period !== "month_average") {
			cumulative = 0;
			const sortedPrevious = [...previousTxs].sort(
				(a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
			);
			for (const tx of sortedPrevious) {
				const day = new Date(tx.date).getDate();
				cumulative += Math.abs(tx.amount);
				previousMap.set(day, cumulative);
			}
		}

		if (period === "month_average") {
			const averageMap = computeAverageMonthData(transactions);
			const allDays = new Set([...currentMap.keys(), ...averageMap.keys()]);
			const sortedDays = Array.from(allDays).sort((a, b) => a - b);
			return sortedDays.map((day) => ({
				day: `Day ${day}`,
				current: currentMap.get(day) || 0,
				previous: averageMap.get(day) || 0,
			}));
		}

		const daysInCurrentPeriod =
			period === "week" ? 7 : new Date(ranges.currentEnd).getDate();
		const data = [];
		for (let day = 1; day <= daysInCurrentPeriod; day++) {
			data.push({
				day: `Day ${day}`,
				current: currentMap.get(day) || 0,
				previous: previousMap.get(day) || 0,
			});
		}
		return data;
	}, [currentTxs, previousTxs, period, ranges, transactions]);

	return (
		<WidgetShell
			title="Spending"
			subtitle={`${formatCurrency(currentSummary.totalExpenses)} this ${
				period === "year" ? "year" : "month"
			}`}
			dropdown={
				<Select.Root
					value={period}
					onValueChange={(value) => setPeriod(value as SpendingPeriod)}
				>
					<Select.Trigger className="inline-flex w-full max-w-[160px] items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium outline-none ring-offset-white transition-colors hover:bg-gray-100 focus:ring-2 focus:ring-[#FF5A35] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:max-w-full sm:text-sm dark:border-white/10 dark:bg-[#2a2a2a] dark:hover:bg-[#333] dark:focus:ring-offset-[#1B1B1B]">
						<Select.Value placeholder="Select period" />
						<Select.Icon className="ml-2">
							<ChevronDown
								size={16}
								className="text-gray-500 dark:text-gray-400"
							/>
						</Select.Icon>
					</Select.Trigger>

					<Select.Portal>
						<Select.Content
							className="z-[1000] w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-md dark:border-white/10 dark:bg-[#2a2a2a]"
							position="popper"
							sideOffset={4}
						>
							<Select.Viewport className="p-1">
								<SelectItem value="week">This week vs. last week</SelectItem>
								<SelectItem value="month">This month vs. last month</SelectItem>
								<SelectItem value="month_last_year">
									This month vs. last year
								</SelectItem>
								<SelectItem value="month_average">
									This month vs. average month
								</SelectItem>
								<SelectItem value="year">This year vs. last year</SelectItem>
							</Select.Viewport>
						</Select.Content>
					</Select.Portal>
				</Select.Root>
			}
		>
			<div className="h-[140px] w-full">
				<ResponsiveContainer width="100%" height="100%">
					<AreaChart
						data={chartData}
						margin={{ top: 10, right: 0, bottom: 0, left: 0 }}
					>
						<CartesianGrid
							strokeDasharray="3 3"
							vertical={false}
							stroke="#f0f0f0"
						/>
						<XAxis
							dataKey="day"
							axisLine={false}
							tickLine={false}
							tick={{ fontSize: 10, fill: "#999" }}
						/>
						<YAxis
							axisLine={false}
							tickLine={false}
							tick={{ fontSize: 10, fill: "#999" }}
							tickFormatter={formatYAxis}
							width={40}
						/>
						<Tooltip
							wrapperStyle={{ fontSize: 12 }}
							formatter={formatTooltipValue}
						/>
						<Area
							type="monotone"
							dataKey="previous"
							stroke="#888"
							strokeWidth={2}
							fill="#888"
							fillOpacity={0.0}
						/>
						<Area
							type="monotone"
							dataKey="current"
							stroke="#FF6B2C"
							strokeWidth={2}
							fill="#FF6B2C"
							fillOpacity={0.15}
						/>
					</AreaChart>
				</ResponsiveContainer>
			</div>
			<div className="mt-2 flex items-center justify-center gap-6 text-[11px] font-medium text-gray-500 dark:text-gray-400">
				<div className="flex items-center gap-1.5">
					<span className="h-0.5 w-5 rounded-full bg-gray-400" /> Previous
					period
				</div>
				<div className="flex items-center gap-1.5">
					<span className="h-0.5 w-5 rounded-full bg-[#FF6B2C]" /> This period
				</div>
			</div>
		</WidgetShell>
	);
}
