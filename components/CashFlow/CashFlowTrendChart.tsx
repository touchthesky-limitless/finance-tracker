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

import type { CashFlowPeriod } from "@/components/CashFlow/types";
import { compactCurrency, formatSignedCurrency } from "@/utils/formatters";

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

	const handleHover = (index: number): void => {
		setHoverKey(periods[index]?.key ?? null);
	};

	return (
		<div className="h-[245px] w-full rounded-2xl border border-gray-200 bg-white px-4 pb-2 pt-4 shadow-sm dark:border-white/5 dark:bg-[#232322]">
			<ResponsiveContainer width="100%" height="100%">
				<ComposedChart
					data={periods}
					margin={{ top: 20, right: 12, bottom: 5, left: 4 }}
					onMouseLeave={() => {
						setHoverKey(null);
					}}
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
						tickFormatter={(value) => {
							return compactCurrency(Number(value));
						}}
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
						onMouseEnter={(_, index) => {
							handleHover(index);
						}}
						onClick={(_, index) => {
							const period = periods[index];

							if (period) {
								onSelect(period);
							}
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
									style={{
										transition: "fill-opacity 150ms ease",
									}}
								/>
							);
						})}
					</Bar>

					<Bar
						dataKey={(period: CashFlowPeriod) => {
							return -period.expenses;
						}}
						stackId="cash"
						cursor="pointer"
						onMouseEnter={(_, index) => {
							handleHover(index);
						}}
						onClick={(_, index) => {
							const period = periods[index];

							if (period) {
								onSelect(period);
							}
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
									style={{
										transition: "fill-opacity 150ms ease",
									}}
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

type TrendTooltipProps = {
	active?: boolean;
	payload?: ReadonlyArray<{
		payload?: CashFlowPeriod;
	}>;
};

function TrendTooltip({ active, payload }: TrendTooltipProps) {
	const period = payload?.[0]?.payload;

	if (!active || !period) {
		return null;
	}

	return (
		<div className="min-w-56 overflow-hidden rounded-xl border border-white/10 bg-[#121212] text-white shadow-2xl">
			<div className="border-b border-white/10 px-4 py-3 text-sm font-bold">
				{period.label}
			</div>

			<div className="space-y-2 px-4 py-3 text-sm">
				<TooltipRow
					color="#38ad78"
					label="Income"
					value={formatSignedCurrency(period.income)}
				/>

				<TooltipRow
					color="#eb4d55"
					label="Expenses"
					value={formatSignedCurrency(period.expenses)}
				/>

				<TooltipRow
					color="#fff"
					label="Savings"
					value={formatSignedCurrency(period.savings)}
				/>

				<TooltipRow
					color="#999"
					label="Savings Rate"
					value={`${period.savingsRate.toFixed(0)}%`}
				/>
			</div>
		</div>
	);
}

function TooltipRow({
	color,
	label,
	value,
}: {
	color: string;
	label: string;
	value: string;
}) {
	return (
		<div className="flex items-center gap-2">
			<span
				className="size-2 rounded-full"
				style={{ backgroundColor: color }}
			/>

			<span className="font-semibold">{label}:</span>

			<span className="ml-auto">{value}</span>
		</div>
	);
}
