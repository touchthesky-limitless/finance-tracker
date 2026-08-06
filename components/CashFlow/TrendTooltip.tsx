/**
 * TrendTooltip – Custom tooltip for the CashFlowTrendChart.
 */
"use client";

import { formatSignedCurrency } from "@/utils/formatters";
import type { CashFlowPeriod } from "./types";

type TrendTooltipProps = {
	active?: boolean;
	payload?: ReadonlyArray<{ payload?: CashFlowPeriod }>;
};

export function TrendTooltip({ active, payload }: TrendTooltipProps) {
	const period = payload?.[0]?.payload;
	if (!active || !period) return null;

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
