"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	ReferenceDot,
	ReferenceLine,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

import { DATE_RANGE_OPTIONS } from "@/components/Accounts/constants";
import { Dropdown } from "@/components/Accounts/controls/ChartDropdown";
import {
	getNetWorthChartDomain,
	formatNetWorthXAxisTick,
	NetWorthBreakdownTooltip,
	NetWorthPerformanceTooltip,
	PERFORMANCE_TOOLTIP_EDGE_PADDING,
	PERFORMANCE_TOOLTIP_HEIGHT,
	PERFORMANCE_TOOLTIP_MINIMUM_TOP,
	PERFORMANCE_TOOLTIP_POINT_GAP,
	PERFORMANCE_TOOLTIP_WIDTH,
	type PerformanceTooltipState,
	type RechartsPerformancePoint,
} from "@/components/Accounts/chart/NetWorthTooltip";
import type {
	ChartPoint,
	ChartType,
	DateRange,
	Timeframe,
} from "@/components/Accounts/types";
import {
	compactCurrency,
	formatCurrency,
	formatSignedCurrency,
} from "@/utils/formatters";
import { getColorForGroup } from "@/components/Accounts/utils/account";

interface NetWorthChartProps {
	chartType: ChartType;
	dateRange: DateRange;
	timeframe: Timeframe;
	points: ChartPoint[];
	summary?: { assets: number; liabilities: number; net: number };
	onChartTypeChange: (value: ChartType) => void;
	onDateRangeChange: (value: DateRange) => void;
	onTimeframeChange?: (value: Timeframe) => void;
	breakdownGroups: {
		assets: { group: string; amount: number }[];
		liabilities: { group: string; amount: number }[];
	};
	chartHeight?: number | string;
	className?: string;
}

type BreakdownDataPoint = {
	label: string;
	[key: string]: number | string;
};

export function NetWorthChart({
	chartType,
	dateRange,
	timeframe,
	points,
	summary,
	onChartTypeChange,
	onDateRangeChange,
	onTimeframeChange,
	breakdownGroups,
	chartHeight = 280,
	className = "",
}: NetWorthChartProps) {
	const [chartMenuOpen, setChartMenuOpen] = useState(false);
	const [rangeMenuOpen, setRangeMenuOpen] = useState(false);
	const [performanceTooltip, setPerformanceTooltip] =
		useState<PerformanceTooltipState | null>(null);
	const tooltipHideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
		null,
	);
	const chartContainerRef = useRef<HTMLDivElement | null>(null);
	const performanceTooltipCardRef = useRef<HTMLDivElement | null>(null);
	const isPerformanceTooltipHoveredRef = useRef(false);

	const clearTooltipHideTimeout = (): void => {
		if (tooltipHideTimeoutRef.current) {
			clearTimeout(tooltipHideTimeoutRef.current);
			tooltipHideTimeoutRef.current = null;
		}
	};

	const clearPerformanceTooltip = (): void => {
		clearTooltipHideTimeout();
		isPerformanceTooltipHoveredRef.current = false;
		setPerformanceTooltip(null);
	};

	const performanceTooltipPosition = performanceTooltip?.position;
	const isPerformanceTooltipVisible = Boolean(performanceTooltip);

	useEffect(() => {
		if (!isPerformanceTooltipVisible) {
			return;
		}

		const isInsideElement = (
			element: HTMLElement | null,
			clientX: number,
			clientY: number,
		): boolean => {
			if (!element) {
				return false;
			}

			const bounds = element.getBoundingClientRect();

			return (
				clientX >= bounds.left &&
				clientX <= bounds.right &&
				clientY >= bounds.top &&
				clientY <= bounds.bottom
			);
		};

		const dismissTooltip = (): void => {
			if (tooltipHideTimeoutRef.current) {
				clearTimeout(tooltipHideTimeoutRef.current);
				tooltipHideTimeoutRef.current = null;
			}

			isPerformanceTooltipHoveredRef.current = false;
			setPerformanceTooltip(null);
		};

		const handleDocumentPointerMove = (event: PointerEvent): void => {
			const isInsideChart = isInsideElement(
				chartContainerRef.current,
				event.clientX,
				event.clientY,
			);
			const isInsideTooltip = isInsideElement(
				performanceTooltipCardRef.current,
				event.clientX,
				event.clientY,
			);

			if (!isInsideChart && !isInsideTooltip) {
				dismissTooltip();
			}
		};

		const handleWindowBlur = (): void => {
			dismissTooltip();
		};

		document.addEventListener("pointermove", handleDocumentPointerMove, {
			passive: true,
		});
		window.addEventListener("blur", handleWindowBlur);

		return () => {
			document.removeEventListener("pointermove", handleDocumentPointerMove);
			window.removeEventListener("blur", handleWindowBlur);
		};
	}, [isPerformanceTooltipVisible]);

	const performanceData: RechartsPerformancePoint[] = points.map((point) => {
		return {
			...point,
			timestamp: point.date.getTime(),
		};
	});

	const performanceValues = performanceData.map((point) => {
		return point.value;
	});
	const performanceDomain = getNetWorthChartDomain([
		Math.min(...performanceValues, 0),
		Math.max(...performanceValues, 0),
	]);

	const breakdownData = useMemo(() => {
		const data: BreakdownDataPoint = {
			label:
				timeframe === "year"
					? "Yearly"
					: timeframe === "quarter"
						? "Quarterly"
						: "Monthly",
		};
		for (const item of breakdownGroups.assets) {
			data[`asset_${item.group}`] = item.amount;
		}
		for (const item of breakdownGroups.liabilities) {
			data[`liability_${item.group}`] = -item.amount;
		}
		return [data];
	}, [breakdownGroups, timeframe]);

	const breakdownValues = [
		summary?.assets ?? 0,
		-(summary?.liabilities ?? 0),
		summary?.net ?? 0,
	];
	const breakdownDomain = getNetWorthChartDomain([
		Math.min(...breakdownValues, 0),
		Math.max(...breakdownValues, 0),
	]);

	const isFlexible = chartHeight === "100%";

	// Compute change and percentage from points – remove unused percentChange
	const { change, isPositive, formattedPercent } = useMemo(() => {
		const first = points[0];
		const last = points[points.length - 1];
		const change = last.value - first.value;
		const percent = first.value !== 0 ? (change / first.value) * 100 : 0;
		const isPos = change >= 0;
		const absPercent = Math.abs(percent);
		const formatted = absPercent.toLocaleString("en-US", {
			minimumFractionDigits: 1,
			maximumFractionDigits: 1,
		});
		return { change, isPositive: isPos, formattedPercent: formatted };
	}, [points]);

	const lastPoint = points[points.length - 1];

	return (
		<section
			className={`relative rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5 dark:border-white/5 dark:bg-[#222] flex flex-col ${className}`}
		>
			{/* Header: Compact on mobile, normal on desktop */}
			<div className="shrink-0">
				<div className="flex flex-col md:flex-row justify-between gap-2 md:gap-4">
					<div>
						<div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.17em] text-gray-500 dark:text-zinc-400">
							Net Worth
							<span className="flex size-3.5 items-center justify-center rounded-full border border-gray-400 text-[8px] dark:border-zinc-500">
								i
							</span>
						</div>

						<div className="flex flex-wrap items-baseline gap-1.5 mt-1">
							{/* Primary: Current Net Worth */}
							<strong className="text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight">
								{formatCurrency(lastPoint.value)}
							</strong>

							{/* Secondary: Change and percentage */}
							<span
								className={`text-xs sm:text-sm font-semibold ${
									isPositive
										? "text-emerald-500 dark:text-emerald-400"
										: "text-red-500 dark:text-red-400"
								}`}
							>
								{isPositive ? "↗" : "↘"}{" "}
								{formatSignedCurrency(Math.abs(change))}
								<span className="ml-1">
									({isPositive ? "+" : "-"}
									{formattedPercent}%)
								</span>
							</span>

							<span className="text-xs sm:text-sm font-medium text-gray-500 dark:text-zinc-400">
								{chartType === "breakdown"
									? timeframe === "year"
										? "This year"
										: timeframe === "quarter"
											? "This quarter"
											: "This month"
									: `${
											DATE_RANGE_OPTIONS.find(
												(option) => option.value === dateRange,
											)?.label
										} change`}
							</span>
						</div>
					</div>

					{/* Dropdowns: Side-by-side on mobile */}
					<div className="flex flex-row flex-wrap gap-2 w-full md:w-auto mt-1 md:mt-0">
						<Dropdown
							key={chartType}
							label={chartType === "performance" ? "Performance" : "Breakdown"}
							open={chartMenuOpen}
							onOpenChange={(open) => {
								setChartMenuOpen(open);
								if (open) setRangeMenuOpen(false);
							}}
							options={[
								{ value: "performance", label: "Performance" },
								{ value: "breakdown", label: "Breakdown" },
							]}
							value={chartType}
							onChange={(value) => {
								onChartTypeChange(value as ChartType);
								setChartMenuOpen(false);
							}}
							className="flex-1 min-w-[90px] sm:w-52"
						/>

						{chartType === "breakdown" ? (
							<Dropdown
								key={timeframe}
								label={
									timeframe === "year"
										? "Yearly"
										: timeframe === "quarter"
											? "Quarterly"
											: "Monthly"
								}
								open={rangeMenuOpen}
								onOpenChange={(open) => {
									setRangeMenuOpen(open);
									if (open) setChartMenuOpen(false);
								}}
								options={[
									{ value: "month", label: "Monthly" },
									{ value: "quarter", label: "Quarterly" },
									{ value: "year", label: "Yearly" },
								]}
								value={timeframe}
								onChange={(value) => {
									if (onTimeframeChange) {
										onTimeframeChange(value as Timeframe);
									}
									setRangeMenuOpen(false);
								}}
								className="flex-1 min-w-[80px] sm:w-40"
							/>
						) : (
							<Dropdown
								key={dateRange}
								label={
									DATE_RANGE_OPTIONS.find(
										(option) => option.value === dateRange,
									)?.label ?? "1 month"
								}
								open={rangeMenuOpen}
								onOpenChange={(open) => {
									setRangeMenuOpen(open);
									if (open) setChartMenuOpen(false);
								}}
								options={DATE_RANGE_OPTIONS}
								value={dateRange}
								onChange={(value) => {
									onDateRangeChange(value as DateRange);
									setRangeMenuOpen(false);
								}}
								className="flex-1 min-w-[80px] sm:w-40"
							/>
						)}
					</div>
				</div>
			</div>

			{/* Chart: Fills remaining space */}
			<div
				ref={chartContainerRef}
				onPointerLeave={clearPerformanceTooltip}
				className="relative w-full"
				style={isFlexible ? { flex: 1, minHeight: 0 } : { height: chartHeight }}
			>
				{chartType === "performance" ? (
					<ResponsiveContainer width="100%" height="100%">
						<AreaChart
							data={performanceData}
							margin={{ top: 10, right: 0, bottom: 0, left: 0 }}
							onMouseMove={(state) => {
								if (isPerformanceTooltipHoveredRef.current) return;

								const pointIndex = Number(state.activeTooltipIndex);
								const coordinate = state.activeCoordinate;
								const point = performanceData[pointIndex];

								if (
									!point ||
									!coordinate ||
									typeof coordinate.x !== "number" ||
									typeof coordinate.y !== "number"
								) {
									return;
								}

								const chartWidth = chartContainerRef.current?.clientWidth ?? 0;
								const screenWidth = window.innerWidth;
								const maxLeft = Math.min(
									chartWidth -
										PERFORMANCE_TOOLTIP_WIDTH -
										PERFORMANCE_TOOLTIP_EDGE_PADDING,
									screenWidth -
										PERFORMANCE_TOOLTIP_WIDTH -
										PERFORMANCE_TOOLTIP_EDGE_PADDING,
								);
								const desiredLeft =
									coordinate.x - PERFORMANCE_TOOLTIP_WIDTH / 2;
								const clampedLeft =
									chartWidth > 0
										? Math.min(
												Math.max(desiredLeft, PERFORMANCE_TOOLTIP_EDGE_PADDING),
												maxLeft,
											)
										: desiredLeft;
								const clampedTop = Math.max(
									PERFORMANCE_TOOLTIP_MINIMUM_TOP,
									coordinate.y -
										PERFORMANCE_TOOLTIP_HEIGHT -
										PERFORMANCE_TOOLTIP_POINT_GAP,
								);

								clearTooltipHideTimeout();
								setPerformanceTooltip({
									point,
									coordinate: { x: coordinate.x, y: coordinate.y },
									position: { x: clampedLeft, y: clampedTop },
								});
							}}
						>
							<defs>
								<linearGradient
									id="activePointVerticalGradient"
									x1="0"
									y1="0"
									x2="0"
									y2="1"
								>
									<stop offset="0%" stopColor="#08b7df" stopOpacity={0.95} />
									<stop offset="100%" stopColor="#08b7df" stopOpacity={0.06} />
								</linearGradient>
								<linearGradient
									id="netWorthAreaGradient"
									x1="0"
									y1="0"
									x2="0"
									y2="1"
								>
									<stop offset="0%" stopColor="#08b7df" stopOpacity={0.27} />
									<stop offset="100%" stopColor="#08b7df" stopOpacity={0.05} />
								</linearGradient>
							</defs>

							<CartesianGrid
								vertical={false}
								stroke="rgba(148, 163, 184, 0.24)"
							/>

							<XAxis
								type="number"
								dataKey="timestamp"
								domain={["dataMin", "dataMax"]}
								scale="time"
								tickCount={7}
								minTickGap={42}
								tickLine={false}
								axisLine={false}
								tickMargin={14}
								tick={{ fill: "#878787", fontSize: 11 }}
								tickFormatter={(timestamp: number) =>
									formatNetWorthXAxisTick(timestamp, dateRange, timeframe)
								}
							/>

							<YAxis
								width={72}
								tickCount={5}
								tickLine={false}
								axisLine={false}
								tick={{ fill: "#8a8a8a", fontSize: 12 }}
								tickFormatter={compactCurrency}
								domain={performanceDomain}
							/>

							<Tooltip
								active={Boolean(performanceTooltip)}
								position={performanceTooltipPosition}
								content={
									<NetWorthPerformanceTooltip
										ref={performanceTooltipCardRef}
										activePoint={performanceTooltip?.point ?? null}
										startPoint={performanceData[0] ?? null}
									/>
								}
								cursor={false}
								allowEscapeViewBox={{ x: true, y: true }}
								isAnimationActive={false}
								wrapperStyle={{
									width: PERFORMANCE_TOOLTIP_WIDTH,
									height: PERFORMANCE_TOOLTIP_HEIGHT,
									outline: "none",
									pointerEvents: "auto",
									transition: "none",
									zIndex: 40,
								}}
							/>

							<Area
								type="linear"
								dataKey="value"
								name="Net Worth"
								stroke="#08b7df"
								strokeWidth={3}
								fill="url(#netWorthAreaGradient)"
								fillOpacity={1}
								baseValue="dataMin"
								connectNulls
								isAnimationActive={false}
								dot={false}
								activeDot={{
									r: 6,
									fill: "#08b7df",
									stroke: "#ffffff",
									strokeWidth: 3,
								}}
							/>

							{performanceTooltip && (
								<>
									<ReferenceLine
										segment={[
											{
												x: performanceTooltip.point.timestamp,
												y: performanceTooltip.point.value,
											},
											{
												x: performanceTooltip.point.timestamp,
												y: performanceDomain[0],
											},
										]}
										stroke="url(#activePointVerticalGradient)"
										strokeWidth={4}
									/>
									<ReferenceDot
										x={performanceTooltip.point.timestamp}
										y={performanceTooltip.point.value}
										r={8}
										fill="#08b7df"
										stroke="#ffffff"
										strokeWidth={4}
									/>
								</>
							)}
						</AreaChart>
					</ResponsiveContainer>
				) : (
					<ResponsiveContainer width="100%" height="100%">
						<BarChart
							data={breakdownData}
							stackOffset="sign"
							barCategoryGap="58%"
							margin={{ top: 10, right: 0, bottom: 0, left: 0 }}
						>
							<CartesianGrid
								vertical={false}
								stroke="rgba(148, 163, 184, 0.24)"
							/>
							<XAxis
								dataKey="label"
								tickLine={false}
								axisLine={false}
								tickMargin={14}
								tick={{ fill: "#878787", fontSize: 11 }}
							/>
							<YAxis
								width={72}
								tickCount={5}
								tickLine={false}
								axisLine={false}
								tick={{ fill: "#8a8a8a", fontSize: 12 }}
								tickFormatter={compactCurrency}
								domain={breakdownDomain}
							/>
							<ReferenceLine y={0} stroke="rgba(148, 163, 184, 0.36)" />

							<Tooltip
								content={({ active, payload }) => {
									const label = payload?.[0]?.payload?.label;
									return (
										<NetWorthBreakdownTooltip
											active={active}
											label={label}
											breakdownGroups={breakdownGroups}
										/>
									);
								}}
								cursor={{ fill: "rgba(255,255,255,0.025)" }}
								offset={18}
								allowEscapeViewBox={{ x: true, y: true }}
								isAnimationActive={false}
								wrapperStyle={{ outline: "none", zIndex: 40 }}
							/>

							{breakdownGroups.assets.map((item) => (
								<Bar
									key={`asset_${item.group}`}
									dataKey={`asset_${item.group}`}
									stackId="net-worth"
									fill={getColorForGroup(item.group)}
									barSize={58}
									radius={[0, 0, 0, 0]}
									isAnimationActive={false}
								/>
							))}
							{breakdownGroups.liabilities.map((item) => (
								<Bar
									key={`liability_${item.group}`}
									dataKey={`liability_${item.group}`}
									stackId="net-worth"
									fill={getColorForGroup(item.group)}
									barSize={58}
									radius={[0, 0, 0, 0]}
									isAnimationActive={false}
								/>
							))}
						</BarChart>
					</ResponsiveContainer>
				)}
			</div>
		</section>
	);
}
