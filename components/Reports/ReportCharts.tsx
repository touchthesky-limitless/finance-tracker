"use client";

import { createElement, useMemo, useState } from "react";
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent } from "react";
import type { LucideProps } from "lucide-react";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	ComposedChart,
	Legend,
	Line,
	Pie,
	PieChart,
	ReferenceLine,
	ResponsiveContainer,
	Sector,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import type {
	BreakdownChartType,
	ChartTransactionSelection,
	ReportCategoryRow,
	ReportMonthRow,
	ReportTab,
	TrendChartType,
} from "@/components/Reports/types";
import { formatMoney } from "@/utils/formatters";
import { getIconForCategory } from "@/lib/categoryIcons";
import { getCategoryHex } from "@/constants/categories";

type ResolvedCategoryIconProps = {
	label: string;
} & Omit<LucideProps, "ref">;

type TooltipScalar = number | string;

interface CurrencyTooltipEntry {
	color?: string;
	dataKey?: number | string;
	name?: number | string;
	value?: TooltipScalar | readonly TooltipScalar[];
}

interface CurrencyTooltipProps {
	active?: boolean;
	label?: number | string;
	payload?: readonly CurrencyTooltipEntry[];
}

interface DonutTooltipEntry {
	payload?: ReportCategoryRow;
}

interface DonutTooltipProps {
	active?: boolean;
	payload?: readonly DonutTooltipEntry[];
}

interface DonutShapeData {
	cx: number;
	cy: number;
	endAngle: number;
	fill: string;
	index: number;
	innerRadius: number;
	outerRadius: number;
	startAngle: number;
}

interface DonutSectorProps extends DonutShapeData {
	isActive: boolean;
	opacity: number;
}

interface CategoryAxisTickProps {
	activeKey: string | null;
	onSelect: (row: ReportCategoryRow) => void;
	payload?: {
		value?: unknown;
	};
	rows: ReportCategoryRow[];
	x?: number;
	y?: number;
}

interface TrendChartDatum {
	expenseTransactionIds: string[];
	expenses: number;
	income: number;
	incomeTransactionIds: string[];
	label: string;
	net: number;
	transactionIds: string[];
	transactionIdsByLabel: Record<string, string[]>;
	[key: string]: unknown;
}

const CATEGORY_ICON_CACHE = new Map<
	string,
	ReturnType<typeof getIconForCategory>
>();

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readNumber(value: unknown, fallback = 0): number {
	const parsedValue = Number(value);

	return Number.isFinite(parsedValue) ? parsedValue : fallback;
}

function readString(value: unknown, fallback = ""): string {
	return typeof value === "string" ? value : fallback;
}

function resolveCategoryIcon(
	label: string,
): ReturnType<typeof getIconForCategory> {
	const normalizedLabel = label.trim().toLocaleLowerCase();
	const cachedIcon = CATEGORY_ICON_CACHE.get(normalizedLabel);

	if (cachedIcon) {
		return cachedIcon;
	}

	const resolvedIcon = getIconForCategory(label);

	CATEGORY_ICON_CACHE.set(normalizedLabel, resolvedIcon);

	return resolvedIcon;
}

function ResolvedCategoryIcon({
	label,
	...iconProps
}: ResolvedCategoryIconProps) {
	return createElement(resolveCategoryIcon(label), iconProps);
}

function CategoryIcon({
	label,
	size = 16,
	className = "",
}: {
	label: string;
	size?: number;
	className?: string;
}) {
	return (
		<ResolvedCategoryIcon
			label={label}
			size={size}
			className={className}
			aria-hidden="true"
		/>
	);
}

function readTooltipNumber(value: CurrencyTooltipEntry["value"]): number {
	if (Array.isArray(value)) {
		return readNumber(value[0]);
	}

	return readNumber(value);
}

function CurrencyTooltip({ active, payload, label }: CurrencyTooltipProps) {
	if (!active || !payload?.length) {
		return null;
	}

	const visible = payload.filter((item) => {
		return readTooltipNumber(item.value) !== 0;
	});

	const total = visible.reduce((sum, item) => {
		return sum + Math.abs(readTooltipNumber(item.value));
	}, 0);

	return (
		<div className="min-w-80 overflow-hidden rounded-2xl border border-white/5 bg-[#222] text-white shadow-2xl">
			<div className="border-b border-white/10 px-5 py-4 text-base font-bold">
				{String(label ?? "")}
			</div>

			<div className="divide-y divide-white/5">
				{visible.map((item, index) => {
					const itemValue = Math.abs(readTooltipNumber(item.value));
					const itemKey = item.dataKey ?? item.name ?? index;
					const markerStyle: CSSProperties = {
						backgroundColor:
							getCategoryHex(String(item.name ?? "")) ?? "#8a8a8a",
					};

					return (
						<div
							key={String(itemKey)}
							className="flex items-center justify-between gap-8 px-5 py-3"
						>
							<div className="flex min-w-0 items-center gap-3">
								<span
									className="size-3 shrink-0 rounded-full"
									style={markerStyle}
								/>

								<span className="truncate text-sm font-semibold">
									{String(item.name ?? "")}
								</span>
							</div>

							<strong className="text-sm">{formatMoney(itemValue)}</strong>
						</div>
					);
				})}
			</div>

			<div className="flex items-center justify-between border-t border-white/10 px-5 py-4 font-bold">
				<span>Total</span>
				<span>{formatMoney(total)}</span>
			</div>
		</div>
	);
}

function DonutTooltip({ active, payload }: DonutTooltipProps) {
	const row = payload?.[0]?.payload;
	const categoryName = row?.label || "Uncategorized";
	const groupColor = getCategoryHex(categoryName) ?? "#A52D79";

	if (!active || !row) {
		return null;
	}

	return (
		<div className="min-w-[200px] max-w-[280px] rounded-xl border border-white/10 bg-[#111] px-4 py-3 text-white shadow-2xl z-50">
			<div className="flex items-start gap-3">
				<span
					className="mt-1 size-3 shrink-0 rounded-full"
					style={{ backgroundColor: groupColor }}
				/>
				<div className="min-w-0 flex-1">
					<p className="truncate text-sm font-semibold leading-snug">
						<span className="mr-1.5 inline-flex align-[-2px]">
							<CategoryIcon label={row.label} size={14} />
						</span>
						{row.label}
					</p>
					<p className="mt-1 text-sm font-bold text-gray-200">
						{formatMoney(row.value)} ({row.percentage.toFixed(1)}%)
					</p>
				</div>
			</div>
		</div>
	);
}
function DonutLegend({
	rows,
	activeKey,
	onHover,
	onSelect,
}: {
	rows: ReportCategoryRow[];
	activeKey: string | null;
	onHover: (key: string | null) => void;
	onSelect: (row: ReportCategoryRow) => void;
}) {
	const visibleRows = useMemo(() => {
		const topRows = rows.slice(0, 11);
		const activeRow = rows.find((row) => {
			return row.key === activeKey;
		});

		if (
			!activeRow ||
			topRows.some((row) => {
				return row.key === activeRow.key;
			})
		) {
			return topRows;
		}

		return [...topRows.slice(0, 10), activeRow];
	}, [activeKey, rows]);

	return (
		<div className="grid min-w-0 flex-1 grid-cols-1 gap-x-4 gap-y-2 md:grid-cols-2 xl:grid-cols-3">
			{visibleRows.map((row) => {
				const isActive = activeKey === row.key;
				const categoryName = row?.label || "Uncategorized";
				const groupColor = getCategoryHex(categoryName) ?? "#A52D79";

				return (
					<button
						key={row.key}
						type="button"
						onMouseEnter={() => {
							onHover(row.key);
						}}
						onMouseLeave={() => {
							onHover(null);
						}}
						onFocus={() => {
							onHover(row.key);
						}}
						onBlur={() => {
							onHover(null);
						}}
						onClick={() => {
							onSelect(row);
						}}
						className={`flex min-w-0 items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors ${
							isActive
								? "bg-gray-100 dark:bg-white/5"
								: "hover:bg-gray-50 dark:hover:bg-white/[0.035]"
						}`}
					>
						<span
							className="mt-1.5 size-3 shrink-0 rounded-full"
							style={{
								backgroundColor: groupColor,
							}}
						/>

						<div className="min-w-0">
							<p className="truncate text-sm font-medium text-gray-800 dark:text-gray-200">
								<span className="mr-1.5 inline-flex align-[-2px]">
									<CategoryIcon label={row.label} size={15} />
								</span>

								{row.label}
							</p>

							<p className="mt-1 text-sm font-semibold text-gray-950 dark:text-white">
								{formatMoney(row.value)} ({row.percentage.toFixed(1)}
								%)
							</p>
						</div>
					</button>
				);
			})}
		</div>
	);
}

function readDonutShapeData(value: unknown): DonutShapeData {
	const source = isRecord(value) ? value : {};

	return {
		cx: readNumber(source.cx),
		cy: readNumber(source.cy),
		endAngle: readNumber(source.endAngle),
		fill: readString(source.fill, "#8a8a8a"),
		index: readNumber(source.index, -1),
		innerRadius: readNumber(source.innerRadius),
		outerRadius: readNumber(source.outerRadius),
		startAngle: readNumber(source.startAngle),
	};
}

function DonutSector({
	cx,
	cy,
	innerRadius,
	outerRadius,
	startAngle,
	endAngle,
	fill,
	isActive,
	opacity,
}: DonutSectorProps) {
	return (
		<Sector
			cx={cx}
			cy={cy}
			innerRadius={innerRadius}
			outerRadius={outerRadius + (isActive ? 11 : 0)}
			startAngle={startAngle}
			endAngle={endAngle}
			fill={fill}
			opacity={opacity}
			stroke="var(--report-chart-surface, #fff)"
			strokeWidth={isActive ? 2 : 1}
		/>
	);
}

function CategoryAxisTick({
	x = 0,
	y = 0,
	payload,
	rows,
	activeKey,
	onSelect,
}: CategoryAxisTickProps) {
	const payloadLabel = String(payload?.value ?? "");
	const row = rows.find((item) => {
		return item.label === payloadLabel;
	});

	if (!row) {
		return null;
	}

	const label =
		row.label.length > 22 ? `${row.label.slice(0, 21)}…` : row.label;
	const isActive = activeKey === row.key;
	const foreground = isActive ? getCategoryHex(row.label) : "#8a8a8a";

	const handleKeyDown = (event: ReactKeyboardEvent<SVGGElement>): void => {
		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			onSelect(row);
		}
	};

	return (
		<g
			transform={`translate(${x},${y})`}
			className="cursor-pointer outline-none"
			onClick={() => {
				onSelect(row);
			}}
			onKeyDown={handleKeyDown}
			role="button"
			tabIndex={0}
			aria-label={`Filter transactions by ${row.label}`}
		>
			<ResolvedCategoryIcon
				label={row.label}
				x={-184}
				y={-8}
				width={16}
				height={16}
				color={foreground}
				strokeWidth={2}
				aria-hidden="true"
			/>

			<text
				x={-162}
				y={0}
				dy="0.35em"
				textAnchor="start"
				fill={foreground}
				fontSize={12}
				fontWeight={isActive ? 700 : 500}
			>
				{label}
			</text>
		</g>
	);
}

function chartRowFromClick<T extends object>(data: unknown): T | null {
	if (!isRecord(data)) {
		return null;
	}

	const candidate = isRecord(data.payload) ? data.payload : data;

	return candidate as T;
}

export function BreakdownChart({
	rows,
	chartType,
	selectedKey,
	onSelectTransactions,
}: {
	rows: ReportCategoryRow[];
	chartType: BreakdownChartType;
	selectedKey: string | null;
	onSelectTransactions: (selection: ChartTransactionSelection) => void;
}) {
	const [hoveredKey, setHoveredKey] = useState<string | null>(null);
	const total = rows.reduce((sum, row) => sum + row.value, 0);
	const selectRow = (row: ReportCategoryRow) => {
		onSelectTransactions({
			key: row.key,
			label: row.label,
			transactionIds: row.transactionIds,
		});
	};
	const activeKey = hoveredKey ?? selectedKey;
	const activeIndex = rows.findIndex((row) => row.key === activeKey);

	if (chartType === "bars") {
		return (
			<div className="h-[min(760px,70vh)] min-h-[440px] px-4 py-6 sm:px-8">
				<ResponsiveContainer width="100%" height="100%" minWidth={0}>
					<BarChart
						data={rows}
						layout="vertical"
						margin={{ left: 24, right: 80, top: 10, bottom: 20 }}
						onMouseLeave={() => {
							setHoveredKey(null);
						}}
					>
						<CartesianGrid
							horizontal={false}
							strokeDasharray="4 4"
							stroke="rgba(128,128,128,.18)"
						/>
						<XAxis
							type="number"
							tickFormatter={(value) => formatMoney(Number(value))}
							tick={{ fill: "#777", fontSize: 12 }}
						/>
						<YAxis
							type="category"
							dataKey="label"
							width={195}
							tick={
								<CategoryAxisTick
									rows={rows}
									activeKey={activeKey}
									onSelect={selectRow}
								/>
							}
							interval={0}
						/>
						<Tooltip
							content={<CurrencyTooltip />}
							cursor={{ fill: "rgba(0,0,0,.03)" }}
						/>
						<Bar
							dataKey="value"
							radius={[0, 5, 5, 0]}
							className="cursor-pointer"
							onMouseEnter={(data) => {
								const row = chartRowFromClick<ReportCategoryRow>(data);

								if (row) {
									setHoveredKey(row.key);
								}
							}}
							onClick={(data) => {
								const row = chartRowFromClick<ReportCategoryRow>(data);

								if (row) {
									selectRow(row);
								}
							}}
						>
							{rows.map((row) => (
								<Cell
									key={row.key}
									fill={getCategoryHex(row.label)}
									fillOpacity={!activeKey || activeKey === row.key ? 1 : 0.22}
								/>
							))}
						</Bar>
					</BarChart>
				</ResponsiveContainer>
			</div>
		);
	}

	return (
		<div
			className="flex min-h-[500px] flex-col items-center gap-10 px-5 py-8 lg:flex-row lg:px-10"
			onMouseLeave={() => {
				setHoveredKey(null);
			}}
		>
			<div className="relative h-[430px] w-full max-w-[560px] shrink-0">
				<ResponsiveContainer width="100%" height="100%" minWidth={0}>
					<PieChart>
						<Pie
							data={rows}
							dataKey="value"
							nameKey="label"
							innerRadius="68%"
							outerRadius="92%"
							shape={(shapeProps: unknown) => {
								const donutShape = readDonutShapeData(shapeProps);
								const row = rows[donutShape.index];
								const isActive = row?.key === activeKey;

								return (
									<DonutSector
										{...donutShape}
										isActive={isActive}
										opacity={!activeKey || isActive ? 1 : 0.28}
									/>
								);
							}}
							className="cursor-pointer"
							onMouseEnter={(_, index) => {
								setHoveredKey(rows[index]?.key ?? null);
							}}
							onClick={(data) => {
								const row = chartRowFromClick<ReportCategoryRow>(data);

								if (row?.key) {
									setHoveredKey(null);
									selectRow(row);
								}
							}}
						>
							{rows.map((row) => (
								<Cell key={row.key} fill={getCategoryHex(row.label)} />
							))}
						</Pie>
						<Tooltip
							key={activeKey ?? "donut-tooltip"}
							content={<DonutTooltip />}
							defaultIndex={activeIndex >= 0 ? activeIndex : undefined}
							active={activeIndex >= 0 ? true : undefined}
							cursor={false}
							wrapperStyle={{
								zIndex: 9,
								pointerEvents: "none",
							}}
						/>
					</PieChart>
				</ResponsiveContainer>
				<div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
					<div>
						<strong className="text-2xl">{formatMoney(total)}</strong>
						<p className="mt-1 text-sm">Total</p>
					</div>
				</div>
			</div>

			<DonutLegend
				rows={rows}
				activeKey={activeKey}
				onHover={setHoveredKey}
				onSelect={(row) => {
					setHoveredKey(null);
					selectRow(row);
				}}
			/>
		</div>
	);
}

export function TrendsChart({
	rows,
	categories,
	chartType,
	tab,
	selectedKey,
	onSelectTransactions,
}: {
	rows: ReportMonthRow[];
	categories: ReportCategoryRow[];
	chartType: TrendChartType;
	tab: ReportTab;
	selectedKey: string | null;
	onSelectTransactions: (selection: ChartTransactionSelection) => void;
}) {
	const data = rows.map<TrendChartDatum>((row) => {
		return {
			label: row.label,
			income: row.income,
			expenses: row.expenses,
			net: row.net,
			transactionIds: row.transactionIds,
			incomeTransactionIds: row.incomeTransactionIds,
			expenseTransactionIds: row.expenseTransactionIds,
			transactionIdsByLabel: row.transactionIdsByLabel,
			...row.values,
		};
	});
	const visibleCategories = categories.slice(0, 7);
	const average =
		rows.length > 0
			? rows.reduce(
					(sum, row) => sum + (tab === "cash-flow" ? row.net : row.total),
					0,
				) / rows.length
			: 0;

	if (tab === "cash-flow") {
		return (
			<div className="h-[470px] px-4 py-7 sm:px-8">
				<ResponsiveContainer width="100%" height="100%">
					<ComposedChart
						data={data}
						margin={{ left: 20, right: 30, top: 20, bottom: 25 }}
					>
						<CartesianGrid vertical={false} stroke="rgba(128,128,128,.18)" />
						<XAxis dataKey="label" tick={{ fill: "#777", fontSize: 12 }} />
						<YAxis
							tickFormatter={(value) => formatMoney(Number(value))}
							tick={{ fill: "#777", fontSize: 12 }}
							width={95}
						/>
						<Tooltip content={<CurrencyTooltip />} />
						<ReferenceLine y={average} stroke="#222" strokeDasharray="4 4" />
						<Bar
							dataKey="income"
							name="Income"
							fill="#32A86F"
							barSize={28}
							className="cursor-pointer"
							onClick={(data) => {
								const row = chartRowFromClick<TrendChartDatum>(data);

								if (!row) {
									return;
								}

								onSelectTransactions({
									key: `trend:${row.label}:income`,
									label: `${row.label} income`,
									transactionIds: row.incomeTransactionIds,
								});
							}}
						/>
						<Bar
							dataKey="expenses"
							name="Expenses"
							fill="#EC454B"
							barSize={28}
							className="cursor-pointer"
							onClick={(data) => {
								const row = chartRowFromClick<TrendChartDatum>(data);

								if (!row) {
									return;
								}

								onSelectTransactions({
									key: `trend:${row.label}:expenses`,
									label: `${row.label} expenses`,
									transactionIds: row.expenseTransactionIds,
								});
							}}
						/>
						<Line
							dataKey="net"
							name="Net income"
							stroke="#222"
							strokeWidth={4}
							dot={false}
							className="cursor-pointer"
							onClick={(data) => {
								const row = chartRowFromClick<TrendChartDatum>(data);

								if (!row) {
									return;
								}

								onSelectTransactions({
									key: `trend:${row.label}:net`,
									label: `${row.label} net income`,
									transactionIds: row.transactionIds,
								});
							}}
						/>
					</ComposedChart>
				</ResponsiveContainer>
			</div>
		);
	}

	return (
		<div className="h-[520px] px-4 py-7 sm:px-8">
			<ResponsiveContainer width="100%" height="100%">
				<BarChart
					data={data}
					margin={{ left: 20, right: 30, top: 20, bottom: 45 }}
				>
					<CartesianGrid vertical={false} stroke="rgba(128,128,128,.18)" />
					<XAxis dataKey="label" tick={{ fill: "#777", fontSize: 12 }} />
					<YAxis
						tickFormatter={(value) => formatMoney(Number(value))}
						tick={{ fill: "#777", fontSize: 12 }}
						width={95}
					/>
					<Tooltip
						content={<CurrencyTooltip />}
						wrapperStyle={{
							zIndex: 9,
							pointerEvents: "none",
						}}
					/>
					<ReferenceLine y={average} stroke="#222" strokeDasharray="4 4" />
					{visibleCategories.map((category) => (
						<Bar
							key={category.key}
							dataKey={category.label}
							name={category.label}
							fill={getCategoryHex(category.label)}
							fillOpacity={
								!selectedKey || selectedKey.includes(category.label) ? 1 : 0.3
							}
							stackId={chartType === "stacked" ? "total" : undefined}
							barSize={chartType === "stacked" ? 64 : 12}
							className="cursor-pointer"
							onClick={(data) => {
								const row = chartRowFromClick<TrendChartDatum>(data);

								if (!row) {
									return;
								}

								onSelectTransactions({
									key: `trend:${row.label}:${category.label}`,
									label: `${row.label} · ${category.label}`,
									transactionIds:
										row.transactionIdsByLabel[category.label] ?? [],
								});
							}}
						/>
					))}
					<Legend verticalAlign="bottom" wrapperStyle={{ paddingTop: 24 }} />
				</BarChart>
			</ResponsiveContainer>
		</div>
	);
}
