import { forwardRef } from "react";
import { ChevronRight, Sparkles } from "lucide-react";

import type { ChartPoint } from "@/components/Accounts/types";
import { formatSignedCurrency } from "@/utils/formatters";

export interface RechartsPerformancePoint extends ChartPoint {
	timestamp: number;
}

export const PERFORMANCE_TOOLTIP_WIDTH = 378;
export const PERFORMANCE_TOOLTIP_HEIGHT = 174;
export const PERFORMANCE_TOOLTIP_POINT_GAP = 16; // ✅ Changed from 62 to 16 to sit neatly on top
export const PERFORMANCE_TOOLTIP_EDGE_PADDING = 12;
export const PERFORMANCE_TOOLTIP_MINIMUM_TOP = -116;

interface PerformanceTooltipCardProps {
	activePoint: RechartsPerformancePoint | null;
	startPoint: RechartsPerformancePoint | null;
}

export interface PerformanceTooltipState {
	point: RechartsPerformancePoint;
	coordinate: {
		x: number;
		y: number;
	};
	position: {
		x: number;
		y: number;
	};
}
export interface RechartsBreakdownPoint {
	label: string;
	assets: number;
	liabilities: number;
	netWorth: number;
}

export interface BreakdownTooltipProps {
	active?: boolean;
	label?: string;
	breakdownGroups?: {
		assets: { group: string; amount: number }[];
		liabilities: { group: string; amount: number }[];
	};
}

export function getNetWorthChartDomain(
	domain: readonly [number, number],
): [number, number] {
	const [dataMinimum, dataMaximum] = domain;
	const minimum = Math.min(dataMinimum, 0);
	const maximum = Math.max(dataMaximum, 0);
	const span = Math.max(maximum - minimum, 1);
	const padding = span * 0.08;

	return [minimum - padding, maximum + padding];
}

export function formatNetWorthXAxisTick(
	timestamp: number,
	dateRange: string,
	timeframe: string,
): string {
	const date = new Date(timestamp);
	if (timeframe === "year" || dateRange === "1Y" || dateRange === "ALL") {
		return date.toLocaleDateString("en-US", {
			month: "short",
			year: "2-digit",
		});
	}
	if (dateRange === "YTD" || dateRange === "6M") {
		return date.toLocaleDateString("en-US", {
			month: "short",
		});
	}
	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
	});
}

export const NetWorthPerformanceTooltip = forwardRef<
	HTMLDivElement,
	PerformanceTooltipCardProps
>(({ activePoint, startPoint }, ref) => {
	if (!activePoint || !startPoint) return null;

	const change = activePoint.value - startPoint.value;
	const changePercent =
		startPoint.value !== 0 ? (change / startPoint.value) * 100 : 0;
	const isPositive = change >= 0;

	const startDate = startPoint.date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
	const endDate = activePoint.date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
	const dateLabel =
		startDate === endDate ? endDate : `${startDate} - ${endDate}`;

	return (
		<div
			ref={ref}
			data-net-worth-performance-tooltip="true"
			style={{
				width: PERFORMANCE_TOOLTIP_WIDTH,
				height: PERFORMANCE_TOOLTIP_HEIGHT,
			}}
			className="pointer-events-auto max-w-[calc(100vw-24px)] overflow-hidden rounded-[18px] border border-white/[0.04] bg-[#111111] text-white shadow-[0_24px_70px_rgba(0,0,0,0.58)]"
		>
			<div className="flex h-[51px] items-center border-b border-white/10 px-[21px] text-[16px] font-bold leading-none">
				{dateLabel}
			</div>
			<div className="flex h-[55px] items-center justify-between gap-5 px-[21px]">
				<span className="text-[17px] font-bold leading-none tracking-[-0.015em]">
					{formatSignedCurrency(activePoint.value)}
				</span>
				<span
					className={`whitespace-nowrap text-[16px] font-bold leading-none ${
						isPositive ? "text-[#27d990]" : "text-[#ff8589]"
					}`}
				>
					{isPositive ? "+" : "-"}
					{formatSignedCurrency(Math.abs(change))}{" "}
					<span className="ml-1">
						({changePercent > 0 ? "+" : ""}
						{changePercent.toFixed(2)}%)
					</span>
				</span>
			</div>
			<button
				type="button"
				className="mx-[21px] mb-[21px] flex h-12 w-[calc(100%-42px)] items-center justify-between rounded-[16px] bg-[#3b190d] px-4 text-left text-[16px] font-bold text-[#ff6b2c] transition-colors hover:bg-[#48200f]"
			>
				<span className="flex items-center gap-2">
					<Sparkles size={17} strokeWidth={2.2} />
					Explain this change
				</span>
				<ChevronRight size={18} strokeWidth={2.2} />
			</button>
		</div>
	);
});
NetWorthPerformanceTooltip.displayName = "NetWorthPerformanceTooltip";

export function NetWorthBreakdownTooltip({
	active,
	label,
	breakdownGroups,
}: BreakdownTooltipProps) {
	if (!active || !breakdownGroups) return null;

	const totalAssets = breakdownGroups.assets.reduce(
		(sum, item) => sum + item.amount,
		0,
	);
	const totalLiabilities = breakdownGroups.liabilities.reduce(
		(sum, item) => sum + item.amount,
		0,
	);
	const netWorth = totalAssets - totalLiabilities;

	return (
		<div className="pointer-events-none min-w-72 overflow-hidden rounded-2xl border border-white/[0.05] bg-[#111111] text-white shadow-[0_24px_70px_rgba(0,0,0,0.55)]">
			<div className="border-b border-white/10 px-5 py-4 text-base font-bold">
				{label}
			</div>
			<div className="space-y-3 px-5 py-4 text-sm">
				{breakdownGroups.assets.map((item) => (
					<div
						key={item.group}
						className="flex items-center justify-between gap-6"
					>
						<span className="flex items-center gap-2 font-semibold">
							<span className="size-2.5 rounded-full bg-emerald-500" />
							{item.group}
						</span>
						<strong>{formatSignedCurrency(item.amount)}</strong>
					</div>
				))}
				{breakdownGroups.liabilities.map((item) => (
					<div
						key={item.group}
						className="flex items-center justify-between gap-6"
					>
						<span className="flex items-center gap-2 font-semibold">
							<span className="size-2.5 rounded-full bg-red-500" />
							{item.group}
						</span>
						<strong>{formatSignedCurrency(item.amount)}</strong>
					</div>
				))}
				<div className="flex items-center justify-between gap-6 border-t border-white/10 pt-3">
					<span className="font-semibold">Net Worth</span>
					<strong>{formatSignedCurrency(netWorth)}</strong>
				</div>
			</div>
		</div>
	);
}
