// src/components/CategoryGroupDetails/GroupTrendChart.tsx

/**
 * Trend chart component for the Category Group Details page.
 * Displays a bar chart of group spending over time, with year markers and interactive selection.
 */

import { useMemo, useState } from "react";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	ReferenceLine,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
	type TooltipContentProps,
	type XAxisTickContentProps,
} from "recharts";
import type {
	NameType,
	ValueType,
} from "recharts/types/component/DefaultTooltipContent";
import { compactCurrency, formatMoney } from "@/utils/formatters";
import type { GroupChartPeriod } from "@/components/CategoryGroups";

interface GroupTrendChartProps {
	periods: GroupChartPeriod[];
	selectedKey: string;
	groupName: string;
	onSelect: (period: GroupChartPeriod) => void;
}

export function GroupTrendChart({
	periods,
	selectedKey,
	groupName,
	onSelect,
}: GroupTrendChartProps) {
	const [hoverKey, setHoverKey] = useState<string | null>(null);
	const periodByKey = useMemo(
		() => new Map(periods.map((p) => [p.key, p])),
		[periods],
	);

	return (
		<section className="h-[410px] rounded-2xl border border-gray-200 bg-white px-4 pb-4 pt-3 shadow-sm dark:border-white/5 dark:bg-[#232322]">
			<ResponsiveContainer width="100%" height="100%">
				<BarChart
					data={periods}
					margin={{ top: 48, right: 8, left: 0, bottom: 4 }}
					onMouseLeave={() => setHoverKey(null)}
				>
					<CartesianGrid
						vertical={false}
						stroke="currentColor"
						className="text-gray-200 dark:text-white/10"
					/>
					{periods
						.filter((p) => p.showYearMarker)
						.map((p) => (
							<ReferenceLine
								key={`year:${p.key}`}
								x={p.key}
								stroke="currentColor"
								className="text-gray-200 dark:text-white/10"
								label={{
									value: `${p.year} →`,
									position: "insideTopRight",
									fill: "#999",
									fontSize: 12,
								}}
							/>
						))}
					<XAxis
						dataKey="key"
						axisLine={false}
						tickLine={false}
						tick={(props: XAxisTickContentProps) => {
							const rawValue = props.payload?.value;
							const periodKey =
								typeof rawValue === "string"
									? rawValue
									: String(rawValue ?? "");
							const period = periodByKey.get(periodKey);
							const x = Number(props.x) || 0;
							const y = Number(props.y) || 0;
							return (
								<text
									x={x}
									y={y + 16}
									textAnchor="middle"
									fill="#999"
									fontSize={12}
									fontWeight={600}
								>
									{period?.shortLabel ?? ""}
								</text>
							);
						}}
					/>
					<YAxis
						axisLine={false}
						tickLine={false}
						tick={{ fill: "#999", fontSize: 12 }}
						tickFormatter={(value: number | string) =>
							compactCurrency(Number(value))
						}
						width={64}
					/>
					<Tooltip
						cursor={{ fill: "rgba(255,255,255,0.035)" }}
						content={(props: TooltipContentProps<ValueType, NameType>) => (
							<GroupTrendTooltip {...props} groupName={groupName} />
						)}
					/>
					<Bar
						dataKey="amount"
						cursor="pointer"
						minPointSize={2}
						onMouseEnter={(_entry: unknown, index: number) =>
							setHoverKey(periods[index]?.key ?? null)
						}
						onClick={(_entry: unknown, index: number) => {
							const period = periods[index];
							if (period) onSelect(period);
						}}
					>
						{periods.map((period) => {
							const active =
								period.key === selectedKey || period.key === hoverKey;
							return (
								<Cell
									key={period.key}
									fill="#a4383d"
									fillOpacity={active ? 0.96 : 0.52}
									style={{ transition: "fill-opacity 150ms ease" }}
								/>
							);
						})}
					</Bar>
				</BarChart>
			</ResponsiveContainer>
		</section>
	);
}

function GroupTrendTooltip({
	active,
	payload,
	groupName,
}: TooltipContentProps<ValueType, NameType> & { groupName: string }) {
	const period = payload?.[0]?.payload as GroupChartPeriod | undefined;
	if (!active || !period) return null;
	return (
		<div className="min-w-64 overflow-hidden rounded-xl border border-white/10 bg-[#121212] text-white shadow-2xl">
			<div className="border-b border-white/10 px-4 py-3 text-sm font-bold">
				{period.label}
			</div>
			<div className="flex items-center gap-3 px-4 py-4 text-sm">
				<span className="size-2.5 rounded-full bg-[#ef4b55]" />
				<span className="font-semibold">{groupName}:</span>
				<span className="ml-auto font-bold">{formatMoney(period.amount)}</span>
			</div>
		</div>
	);
}
