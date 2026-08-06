/**
 * CashFlowTrendChart – Composed bar/line chart showing income, expenses, and savings over time.
 */
"use client";

import { useState } from "react";
import {
	Bar,
	CartesianGrid,
	Cell,
	ComposedChart,
	Line,
	ReferenceLine,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { TrendTooltip } from "./TrendTooltip";
import type { CashFlowPeriod } from "./types";
import { compactCurrency } from "@/utils/formatters";

export function CashFlowTrendChart({
	periods,
	selectedKey,
	onSelect,
}: {
	periods: CashFlowPeriod[];
	selectedKey: string;
	onSelect: (period: CashFlowPeriod) => void;
}) {
	const [hoverKey, setHoverKey] = useState<string | null>(null);

	const handleHover = (index: number) =>
		setHoverKey(periods[index]?.key ?? null);

	return (
		<div className="h-[245px] w-full rounded-2xl border border-gray-200 bg-white px-4 pb-2 pt-4 shadow-sm dark:border-white/5 dark:bg-[#232322]">
			<ResponsiveContainer width="100%" height="100%">
				<ComposedChart
					data={periods}
					margin={{ top: 20, right: 12, bottom: 5, left: 4 }}
					onMouseLeave={() => setHoverKey(null)}
				>
					<CartesianGrid
						vertical={false}
						stroke="currentColor"
						className="text-gray-200 dark:text-white/10"
					/>
					<XAxis
						dataKey="shortLabel"
						axisLine={false}
						tickLine={false}
						tick={{ fill: "#999", fontSize: 12 }}
					/>
					<YAxis
						axisLine={false}
						tickLine={false}
						tick={{ fill: "#999", fontSize: 12 }}
						tickFormatter={(value) => compactCurrency(Number(value))}
						width={56}
					/>
					<ReferenceLine
						y={0}
						stroke="currentColor"
						className="text-gray-300 dark:text-white/15"
					/>

					<Bar
						dataKey="income"
						stackId="cash"
						cursor="pointer"
						onMouseEnter={(_, index) => handleHover(index)}
						onClick={(_, index) => {
							const period = periods[index];
							if (period) onSelect(period);
						}}
					>
						{periods.map((period) => {
							const isActive =
								period.key === selectedKey || period.key === hoverKey;
							return (
								<Cell
									key={`income:${period.key}`}
									fill="#38ad78"
									fillOpacity={isActive ? 0.95 : 0.48}
									style={{ transition: "fill-opacity 150ms ease" }}
								/>
							);
						})}
					</Bar>

					<Bar
						dataKey={(period: CashFlowPeriod) => -period.expenses}
						stackId="cash"
						cursor="pointer"
						onMouseEnter={(_, index) => handleHover(index)}
						onClick={(_, index) => {
							const period = periods[index];
							if (period) onSelect(period);
						}}
					>
						{periods.map((period) => {
							const isActive =
								period.key === selectedKey || period.key === hoverKey;
							return (
								<Cell
									key={`expense:${period.key}`}
									fill="#eb4d55"
									fillOpacity={isActive ? 0.95 : 0.48}
									style={{ transition: "fill-opacity 150ms ease" }}
								/>
							);
						})}
					</Bar>

					<Line
						type="linear"
						dataKey="savings"
						stroke="#fff"
						strokeWidth={3}
						dot={false}
						activeDot={{ r: 5, fill: "#fff" }}
						connectNulls
					/>

					<Tooltip
						cursor={false}
						content={<TrendTooltip />}
						wrapperStyle={{ pointerEvents: "none" }}
					/>
				</ComposedChart>
			</ResponsiveContainer>
		</div>
	);
}
