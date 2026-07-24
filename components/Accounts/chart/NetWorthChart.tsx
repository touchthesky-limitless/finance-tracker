"use client";

import {
	useRef,
	useState,
} from "react";
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

import {
	DATE_RANGE_OPTIONS,
} from "@/components/Accounts/constants";
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
	type RechartsBreakdownPoint,
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
	formatSignedCurrency,
} from "@/utils/formatters";

export function NetWorthChart({
	chartType,
	dateRange,
	timeframe,
	points,
	summary,
	onChartTypeChange,
	onDateRangeChange,
}: {
	chartType: ChartType;
	dateRange: DateRange;
	timeframe: Timeframe;
	points: ChartPoint[];
	summary: { assets: number; liabilities: number; netWorth: number };
	onChartTypeChange: (value: ChartType) => void;
	onDateRangeChange: (value: DateRange) => void;
}) {
	const [chartMenuOpen, setChartMenuOpen] = useState(false);
	const [rangeMenuOpen, setRangeMenuOpen] = useState(false);
	const [performanceTooltip, setPerformanceTooltip] =
		useState<PerformanceTooltipState | null>(null);
	const tooltipHideTimeoutRef =
		useRef<ReturnType<typeof setTimeout> | null>(null);
	const chartContainerRef = useRef<HTMLDivElement | null>(null);
	const isPerformanceTooltipHoveredRef = useRef(false);

	const clearTooltipHideTimeout = (): void => {
		if (tooltipHideTimeoutRef.current) {
			clearTimeout(tooltipHideTimeoutRef.current);
			tooltipHideTimeoutRef.current = null;
		}
	};

	const hidePerformanceTooltip = (): void => {
		clearTooltipHideTimeout();
		tooltipHideTimeoutRef.current = setTimeout(() => {
			if (!isPerformanceTooltipHoveredRef.current) {
				setPerformanceTooltip(null);
			}
			tooltipHideTimeoutRef.current = null;
		}, 220);
	};

	const clearPerformanceTooltip = (): void => {
		clearTooltipHideTimeout();
		isPerformanceTooltipHoveredRef.current = false;
		setPerformanceTooltip(null);
	};

	const handlePerformanceTooltipMouseEnter = (): void => {
		isPerformanceTooltipHoveredRef.current = true;
		clearTooltipHideTimeout();
	};

	const handlePerformanceTooltipMouseLeave = (): void => {
		isPerformanceTooltipHoveredRef.current = false;
		hidePerformanceTooltip();
	};

	const performanceTooltipPosition = performanceTooltip?.position;

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

	const breakdownData: RechartsBreakdownPoint[] = [
		{
			label:
				timeframe === "year"
					? String(new Date().getFullYear())
					: new Date().toLocaleDateString("en-US", {
							month: "short",
							year: "numeric",
						}),
			assets: summary.assets,
			liabilities: -summary.liabilities,
			netWorth: summary.netWorth,
		},
	];

	const breakdownValues = [
		summary.assets,
		-summary.liabilities,
		summary.netWorth,
	];
	const breakdownDomain = getNetWorthChartDomain([
		Math.min(...breakdownValues, 0),
		Math.max(...breakdownValues, 0),
	]);

	return (
		<section className="relative rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5 dark:border-white/5 dark:bg-[#222]">
			<div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
				<div>
					<div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.17em] text-gray-500 dark:text-zinc-400">
						Net Worth
						<span className="flex size-3.5 items-center justify-center rounded-full border border-gray-400 text-[8px] dark:border-zinc-500">
							i
						</span>
					</div>

					<div className="mt-2 flex flex-wrap items-baseline gap-3">
						<strong className="text-2xl font-semibold tracking-tight sm:text-3xl">
							{formatSignedCurrency(summary.netWorth)}
						</strong>

						<span
							className={`text-sm font-semibold ${
								summary.netWorth >= 0
									? "text-emerald-500 dark:text-emerald-400"
									: "text-red-500 dark:text-red-400"
							}`}
						>
							{summary.netWorth >= 0 ? "↗" : "↘"}{" "}
							{formatSignedCurrency(Math.abs(summary.netWorth))}
						</span>

						<span className="text-sm font-medium text-gray-500 dark:text-zinc-400">
							{chartType === "breakdown"
								? timeframe === "year"
									? "This year"
									: "This month"
								: `${
										DATE_RANGE_OPTIONS.find(
											(option) => option.value === dateRange,
										)?.label
									} change`}
						</span>
					</div>
				</div>

				<div className="flex flex-col gap-3 sm:flex-row">
					<Dropdown
						label={chartType === "performance" ? "Performance" : "Breakdown"}
						open={chartMenuOpen}
						onOpenChange={(open) => {
							setChartMenuOpen(open);

							if (open) {
								setRangeMenuOpen(false);
							}
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
						className="w-full sm:w-52"
					/>

					<Dropdown
						label={
							chartType === "breakdown"
								? timeframe === "year"
									? "Yearly"
									: "Monthly"
								: DATE_RANGE_OPTIONS.find(
										(option) => option.value === dateRange,
									)?.label ?? "1 month"
						}
						open={rangeMenuOpen}
						onOpenChange={(open) => {
							setRangeMenuOpen(open);

							if (open) {
								setChartMenuOpen(false);
							}
						}}
						options={
							chartType === "breakdown"
								? [
										{ value: "YTD", label: "Yearly" },
										{ value: "1M", label: "Monthly" },
									]
								: DATE_RANGE_OPTIONS
						}
						value={dateRange}
						onChange={(value) => {
							onDateRangeChange(value as DateRange);
							setRangeMenuOpen(false);
						}}
						className="w-full sm:w-40"
					/>
				</div>
			</div>

			<div
				ref={chartContainerRef}
				onMouseLeave={clearPerformanceTooltip}
				className="relative mt-5 h-[280px] w-full"
			>
				{chartType === "performance" ? (
					<>
						<ResponsiveContainer width="100%" height="100%">
							<AreaChart
								data={performanceData}
								margin={{
									top: 30,
									right: 18,
									bottom: 8,
									left: 0,
								}}
								onMouseMove={(state) => {
									if (isPerformanceTooltipHoveredRef.current) {
										return;
									}

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

									const chartWidth =
										chartContainerRef.current?.clientWidth ?? 0;
									const desiredLeft =
										coordinate.x - PERFORMANCE_TOOLTIP_WIDTH / 2;
									const maximumLeft = Math.max(
										PERFORMANCE_TOOLTIP_EDGE_PADDING,
										chartWidth -
											PERFORMANCE_TOOLTIP_WIDTH -
											PERFORMANCE_TOOLTIP_EDGE_PADDING,
									);
									const clampedLeft =
										chartWidth > 0
											? Math.min(
													Math.max(
														desiredLeft,
														PERFORMANCE_TOOLTIP_EDGE_PADDING,
													),
													maximumLeft,
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
										coordinate: {
											x: coordinate.x,
											y: coordinate.y,
										},
										position: {
											x: clampedLeft,
											y: clampedTop,
										},
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
									<stop
										offset="0%"
										stopColor="#08b7df"
										stopOpacity={0.95}
									/>
									<stop
										offset="100%"
										stopColor="#08b7df"
										stopOpacity={0.06}
									/>
								</linearGradient>

								<linearGradient
									id="netWorthAreaGradient"
									x1="0"
									y1="0"
									x2="0"
									y2="1"
								>
									<stop
										offset="0%"
										stopColor="#08b7df"
										stopOpacity={0.27}
									/>
									<stop
										offset="100%"
										stopColor="#08b7df"
										stopOpacity={0.05}
									/>
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
								tick={{
									fill: "#878787",
									fontSize: 11,
								}}
								tickFormatter={(timestamp: number) => {
									return formatNetWorthXAxisTick(
										timestamp,
										dateRange,
										timeframe,
									);
								}}
							/>

							<YAxis
								width={72}
								tickCount={5}
								tickLine={false}
								axisLine={false}
								tick={{
									fill: "#8a8a8a",
									fontSize: 12,
								}}
								tickFormatter={compactCurrency}
								domain={performanceDomain}
							/>

							<Tooltip
								active={Boolean(performanceTooltip)}
								position={performanceTooltipPosition}
								content={
									<NetWorthPerformanceTooltip
										activePoint={performanceTooltip?.point ?? null}
										startPoint={performanceData[0] ?? null}
										onMouseEnter={handlePerformanceTooltipMouseEnter}
										onMouseLeave={handlePerformanceTooltipMouseLeave}
									/>
								}
								cursor={false}
								allowEscapeViewBox={{
									x: true,
									y: true,
								}}
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

					</>
				) : (
					<ResponsiveContainer width="100%" height="100%">
						<BarChart
							data={breakdownData}
							stackOffset="sign"
							barCategoryGap="58%"
							margin={{
								top: 30,
								right: 18,
								bottom: 8,
								left: 0,
							}}
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
								tick={{
									fill: "#878787",
									fontSize: 11,
								}}
							/>

							<YAxis
								width={72}
								tickCount={5}
								tickLine={false}
								axisLine={false}
								tick={{
									fill: "#8a8a8a",
									fontSize: 12,
								}}
								tickFormatter={compactCurrency}
								domain={breakdownDomain}
							/>

							<ReferenceLine
								y={0}
								stroke="rgba(148, 163, 184, 0.36)"
							/>

							<Tooltip
								content={<NetWorthBreakdownTooltip />}
								cursor={{
									fill: "rgba(255,255,255,0.025)",
								}}
								offset={18}
								allowEscapeViewBox={{
									x: true,
									y: true,
								}}
								isAnimationActive={false}
								wrapperStyle={{
									outline: "none",
									zIndex: 40,
								}}
							/>

							<Bar
								dataKey="assets"
								name="Assets"
								stackId="net-worth"
								fill="#35aa76"
								barSize={58}
								radius={[5, 5, 0, 0]}
								isAnimationActive={false}
							/>

							<Bar
								dataKey="liabilities"
								name="Liabilities"
								stackId="net-worth"
								fill="#ed4650"
								barSize={58}
								radius={[0, 0, 5, 5]}
								isAnimationActive={false}
							/>
						</BarChart>
					</ResponsiveContainer>
				)}
			</div>
		</section>
	);
}
