"use client";

import {
	createElement,
	useMemo,
	useState,
	useSyncExternalStore,
	type ComponentProps,
	type MouseEvent as ReactMouseEvent,
	type ReactNode,
} from "react";
import type { LucideProps } from "lucide-react";
import {
	Layer,
	Rectangle,
	ResponsiveContainer,
	Sankey,
	Tooltip,
	useChartWidth,
} from "recharts";

import { findParentCategory } from "@/constants";
import { getIconForCategory } from "@/lib/utils";
import { getCategoryHex } from "@/constants/categories";
import type {
	ChartTransactionSelection,
	ReportCategoryRow,
} from "@/components/Reports/types";
import { formatMoney } from "@/utils/formatters";

type ResolvedCategoryIconProps = {
	label: string;
} & Omit<LucideProps, "ref">;

const CATEGORY_ICON_CACHE = new Map<
	string,
	ReturnType<typeof getIconForCategory>
>();

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

function subscribeToDocumentBody(): () => void {
	return () => {};
}

function getDocumentBodySnapshot(): HTMLElement | null {
	return typeof document === "undefined" ? null : document.body;
}

function getServerDocumentBodySnapshot(): null {
	return null;
}

type CashFlowNodeKind =
	| "income-category"
	| "income-total"
	| "net-income"
	| "deficit"
	| "expense-group"
	| "expense-category";

interface CashFlowNodeData {
	nodeIndex: number;
	name: string;
	label: string;
	icon: string;
	color: string;
	kind: CashFlowNodeKind;
	displayValue: number;
	percentage: number;
	selectionKey: string;
	transactionIds: string[];
	hidden?: boolean;
}

interface CashFlowLinkData {
	source: number;
	target: number;
	value: number;
	color: string;
	selectionKey: string;
	label: string;
	transactionIds: string[];
	hidden?: boolean;
}

interface CashFlowSankeyData {
	nodes: CashFlowNodeData[];
	links: CashFlowLinkData[];
}

interface ComputedCashFlowNode extends CashFlowNodeData {
	depth?: number;
	value?: number;
}

type ComputedCashFlowLink = Omit<CashFlowLinkData, "source" | "target"> & {
	source?: ComputedCashFlowNode;
	target?: ComputedCashFlowNode;
};

type RendererProps<T> = T extends (props: infer Props) => ReactNode
	? Props
	: never;

type RechartsSankeyNodeProps = RendererProps<
	NonNullable<ComponentProps<typeof Sankey>["node"]>
>;

type RechartsSankeyLinkProps = RendererProps<
	NonNullable<ComponentProps<typeof Sankey>["link"]>
>;

interface SankeyTooltipEntry {
	name?: string;
	value?: number | string;
	payload?: {
		payload?: ComputedCashFlowNode | ComputedCashFlowLink;
	};
}

interface SankeyTooltipProps {
	active?: boolean;
	payload?: SankeyTooltipEntry[];
}

interface ActiveSankeyElement {
	type: "node" | "link";
	index: number;
}

const MAX_INCOME_CATEGORIES = 8;
const MAX_EXPENSE_CATEGORIES = 20;

function uniqueIds(rows: ReportCategoryRow[]): string[] {
	return [...new Set(rows.flatMap((row) => row.transactionIds))];
}

function addNode(
	nodes: CashFlowNodeData[],
	node: Omit<CashFlowNodeData, "nodeIndex">,
): number {
	const index = nodes.length;
	nodes.push({ ...node, nodeIndex: index });
	return index;
}

function collapseRows(
	rows: ReportCategoryRow[],
	maximumRows: number,
	fallbackLabel: string,
): ReportCategoryRow[] {
	const positiveRows = rows.filter((row) => row.value > 0);

	if (positiveRows.length <= maximumRows) return positiveRows;

	const visibleRows = positiveRows.slice(0, maximumRows - 1);
	const hiddenRows = positiveRows.slice(maximumRows - 1);
	const hiddenValue = hiddenRows.reduce((sum, row) => sum + row.value, 0);
	const sourceTotal = positiveRows.reduce((sum, row) => sum + row.value, 0);

	return [
		...visibleRows,
		{
			key: `${fallbackLabel}:collapsed`,
			label: fallbackLabel,
			icon: "",
			value: hiddenValue,
			color: "#A52D79",
			percentage: sourceTotal > 0 ? (hiddenValue / sourceTotal) * 100 : 0,
			transactionIds: uniqueIds(hiddenRows),
		},
	];
}

function getExpenseGroup(label: string): string {
	const parent = findParentCategory(label)?.trim();
	return !parent || parent === "Uncategorized" ? "Other" : parent;
}

function buildCashFlowSankeyData(
	incomeRows: ReportCategoryRow[],
	expenseRows: ReportCategoryRow[],
): CashFlowSankeyData {
	const visibleIncomeRows = collapseRows(
		incomeRows,
		MAX_INCOME_CATEGORIES,
		"Other Income",
	);
	const visibleExpenseRows = collapseRows(
		expenseRows,
		MAX_EXPENSE_CATEGORIES,
		"Everything else",
	);
	const totalIncome = incomeRows.reduce(
		(sum, row) => sum + Math.max(0, row.value),
		0,
	);
	const totalExpenses = expenseRows.reduce(
		(sum, row) => sum + Math.max(0, row.value),
		0,
	);
	const netIncome = Math.max(totalIncome - totalExpenses, 0);
	const deficit = Math.max(totalExpenses - totalIncome, 0);
	const percentageBase = Math.max(totalIncome + deficit, 1);
	const allIncomeIds = uniqueIds(incomeRows);
	const allExpenseIds = uniqueIds(expenseRows);
	const allIds = [...new Set([...allIncomeIds, ...allExpenseIds])];
	const nodes: CashFlowNodeData[] = [];
	const links: CashFlowLinkData[] = [];
	const incomeCategoryIndexes: Array<{
		index: number;
		row: ReportCategoryRow;
	}> = [];
	const incomeColor = getCategoryHex("Income");

	for (const row of visibleIncomeRows) {
		incomeCategoryIndexes.push({
			row,
			index: addNode(nodes, {
				name: row.label,
				label: row.label,
				icon: row.icon,
				color: incomeColor,
				kind: "income-category",
				displayValue: row.value,
				percentage: totalIncome > 0 ? (row.value / totalIncome) * 100 : 0,
				selectionKey: `income-category:${row.key}`,
				transactionIds: row.transactionIds,
			}),
		});
	}

	let deficitIndex: number | null = null;
	if (deficit > 0) {
		deficitIndex = addNode(nodes, {
			name: "Cash-flow deficit",
			label: "Cash-flow deficit",
			icon: "",
			color: "transparent",
			kind: "deficit",
			displayValue: deficit,
			percentage: (deficit / percentageBase) * 100,
			selectionKey: "deficit",
			transactionIds: allIds,
			hidden: true,
		});
	}

	const incomeIndex = addNode(nodes, {
		name: "Income",
		label: "Income",
		icon: "",
		color: incomeColor,
		kind: "income-total",
		displayValue: totalIncome,
		percentage: totalIncome > 0 ? 100 : 0,
		selectionKey: "income-total",
		transactionIds: allIncomeIds,
	});

	for (const item of incomeCategoryIndexes) {
		links.push({
			source: item.index,
			target: incomeIndex,
			value: item.row.value,
			color: incomeColor,
			selectionKey: `income-link:${item.row.key}`,
			label: item.row.label,
			transactionIds: item.row.transactionIds,
		});
	}

	if (deficitIndex !== null) {
		links.push({
			source: deficitIndex,
			target: incomeIndex,
			value: deficit,
			color: "transparent",
			selectionKey: "deficit-link",
			label: "Cash-flow deficit",
			transactionIds: allIds,
			hidden: true,
		});
	}

	if (netIncome > 0) {
		const netIncomeIndex = addNode(nodes, {
			name: "Net Income",
			label: "Net Income",
			icon: "",
			color: "#32A86F",
			kind: "net-income",
			displayValue: netIncome,
			percentage: totalIncome > 0 ? (netIncome / totalIncome) * 100 : 0,
			selectionKey: "net-income",
			transactionIds: allIds,
		});
		links.push({
			source: incomeIndex,
			target: netIncomeIndex,
			value: netIncome,
			color: "#32A86F",
			selectionKey: "net-income-link",
			label: "Net Income",
			transactionIds: allIds,
		});
	}

	const groupedExpenses = new Map<string, ReportCategoryRow[]>();
	for (const row of visibleExpenseRows) {
		const group = getExpenseGroup(row.label);
		groupedExpenses.set(group, [...(groupedExpenses.get(group) ?? []), row]);
	}

	const groupedExpenseEntries = [...groupedExpenses.entries()].sort(
		(first, second) => {
			const firstValue = first[1].reduce((sum, row) => {
				return sum + row.value;
			}, 0);
			const secondValue = second[1].reduce((sum, row) => {
				return sum + row.value;
			}, 0);

			return secondValue - firstValue;
		},
	);

	for (const [group, groupRows] of groupedExpenseEntries) {
		const groupValue = groupRows.reduce((sum, row) => sum + row.value, 0);
		const groupColor = getCategoryHex(group) ?? "#A52D79";
		const groupIds = uniqueIds(groupRows);
		const groupIndex = addNode(nodes, {
			name: group,
			label: group,
			icon: "",
			color: groupColor,
			kind: "expense-group",
			displayValue: groupValue,
			percentage: percentageBase > 0 ? (groupValue / percentageBase) * 100 : 0,
			selectionKey: `expense-group:${group}`,
			transactionIds: groupIds,
		});

		links.push({
			source: incomeIndex,
			target: groupIndex,
			value: groupValue,
			color: groupColor,
			selectionKey: `expense-group-link:${group}`,
			label: group,
			transactionIds: groupIds,
		});

		for (const row of groupRows) {
			const categoryIndex = addNode(nodes, {
				name: row.label,
				label: row.label,
				icon: row.icon,
				color: groupColor,
				kind: "expense-category",
				displayValue: row.value,
				percentage: percentageBase > 0 ? (row.value / percentageBase) * 100 : 0,
				selectionKey: `expense-category:${row.key}`,
				transactionIds: row.transactionIds,
			});
			links.push({
				source: groupIndex,
				target: categoryIndex,
				value: row.value,
				color: groupColor,
				selectionKey: `expense-category-link:${row.key}`,
				label: row.label,
				transactionIds: row.transactionIds,
			});
		}
	}

	return { nodes, links };
}

function formatPercentage(value: number): string {
	if (value >= 99.995) return "100%";
	if (value < 0.005) return "0%";
	return `${value.toFixed(2)}%`;
}

function truncateLabel(value: string, maximumLength: number): string {
	if (value.length <= maximumLength) {
		return value;
	}

	return `${value.slice(0, Math.max(1, maximumLength - 1))}…`;
}

function CashFlowTooltip({ active, payload }: SankeyTooltipProps) {
	const entry = payload?.[0];
	const sankeyPayload = entry?.payload?.payload;
	if (!active || !entry || !sankeyPayload) return null;

	const isLink = "source" in sankeyPayload && "target" in sankeyPayload;
	const value = Math.abs(Number(entry.value) || 0);
	if (isLink) {
		const link = sankeyPayload as ComputedCashFlowLink;
		return (
			<div className="min-w-64 overflow-hidden rounded-xl border border-white/10 bg-[#222] text-white shadow-2xl">
				<div className="border-b border-white/10 px-4 py-3 text-sm font-bold">
					{link.source?.label ?? "Source"} →{" "}
					{link.target?.label ?? "Destination"}
				</div>
				<div className="flex items-center justify-between gap-8 px-4 py-3">
					<span className="text-sm text-zinc-400">Flow</span>
					<strong className="text-sm">{formatMoney(value)}</strong>
				</div>
			</div>
		);
	}

	const node = sankeyPayload as ComputedCashFlowNode;

	return (
		<div className="min-w-64 overflow-hidden rounded-xl border border-white/10 bg-[#222] text-white shadow-2xl">
			<div className="flex items-center gap-2 border-b border-white/10 px-4 py-3 text-sm font-bold">
				{node.kind === "income-category" || node.kind === "expense-category" ? (
					<ResolvedCategoryIcon
						label={node.label}
						size={15}
						aria-hidden="true"
					/>
				) : null}
				<span>{node.label}</span>
			</div>
			<div className="space-y-2 px-4 py-3 text-sm">
				<div className="flex items-center justify-between gap-8">
					<span className="text-zinc-400">Amount</span>
					<strong>{formatMoney(node.displayValue)}</strong>
				</div>
				<div className="flex items-center justify-between gap-8">
					<span className="text-zinc-400">Share of cash flow</span>
					<strong>{formatPercentage(node.percentage)}</strong>
				</div>
				<p className="pt-1 text-xs text-zinc-400">
					Click to filter the transaction table.
				</p>
			</div>
		</div>
	);
}

function ResolvedSankeyCategoryIcon({
	label,
	x,
	y,
	color,
}: {
	label: string;
	x: number;
	y: number;
	color: string;
}) {
	return (
		<ResolvedCategoryIcon
			label={label}
			x={x}
			y={y}
			width={13}
			height={13}
			color={color}
			strokeWidth={2}
			aria-hidden="true"
		/>
	);
}

function CashFlowNode({
	x,
	y,
	width,
	height,
	index,
	payload: rechartsPayload,
	activeElement,
	relatedNodeIndexes,
	onSelectTransactions,
}: RechartsSankeyNodeProps & {
	activeElement: ActiveSankeyElement | null;
	relatedNodeIndexes: ReadonlySet<number>;
	onSelectTransactions: (selection: ChartTransactionSelection) => void;
}) {
	const chartWidth = useChartWidth() ?? 0;
	const payload = rechartsPayload as unknown as ComputedCashFlowNode;

	if (payload.hidden) {
		return null;
	}
	const compact = chartWidth > 0 && chartWidth < 860;
	const estimatedLabelWidth = compact ? 108 : 170;
	const wouldOverflowRight =
		chartWidth > 0 && x + width + estimatedLabelWidth > chartWidth - 8;
	const labelsOnLeft =
		wouldOverflowRight ||
		payload.kind === "net-income" ||
		payload.kind === "expense-group" ||
		payload.kind === "expense-category";
	const labelGap = compact ? 6 : 10;
	const labelX = labelsOnLeft ? x - labelGap : x + width + labelGap;
	const textAnchor = labelsOnLeft ? "end" : "start";
	const visibleLabel = truncateLabel(payload.label, compact ? 15 : 24);
	const isRelated =
		activeElement === null ||
		(activeElement.type === "node" && activeElement.index === index) ||
		relatedNodeIndexes.has(index);
	const opacity = isRelated ? 1 : 0.18;
	const visibleHeight = Math.max(height, 3);
	const labelY = y + visibleHeight / 2;

	const handleClick = (event: ReactMouseEvent<SVGGElement>) => {
		event.stopPropagation();
		onSelectTransactions({
			key: payload.selectionKey,
			label: payload.label,
			transactionIds: payload.transactionIds,
		});
	};

	return (
		<Layer
			className="cursor-pointer transition-opacity"
			opacity={opacity}
			onClick={handleClick}
		>
			<Rectangle
				x={x}
				y={y}
				width={width}
				height={visibleHeight}
				fill={payload.color}
				fillOpacity={0.98}
				radius={1}
			/>

			{payload.kind === "income-category" ||
			payload.kind === "expense-category" ? (
				<ResolvedSankeyCategoryIcon
					label={payload.label}
					x={labelsOnLeft ? labelX - (compact ? 118 : 174) : labelX}
					y={labelY - 12}
					color={isRelated ? payload.color : "#777777"}
				/>
			) : null}

			<text
				x={labelX}
				y={labelY - 4}
				textAnchor={textAnchor}
				dominantBaseline="central"
				className="fill-gray-600 text-[10px] sm:text-[11px] dark:fill-zinc-400"
			>
				{payload.icon ? `${payload.icon} ` : ""}
				{visibleLabel}
			</text>
			<text
				x={labelX}
				y={labelY + 11}
				textAnchor={textAnchor}
				dominantBaseline="central"
				className="fill-gray-900 text-[10px] font-semibold sm:text-[11px] dark:fill-white"
			>
				{formatMoney(payload.displayValue)} (
				{formatPercentage(payload.percentage)})
			</text>
		</Layer>
	);
}

function CashFlowLink({
	sourceX,
	targetX,
	sourceY,
	targetY,
	sourceControlX,
	targetControlX,
	linkWidth,
	index,
	payload: rechartsPayload,
	activeElement,
	onSelectTransactions,
}: RechartsSankeyLinkProps & {
	activeElement: ActiveSankeyElement | null;
	onSelectTransactions: (selection: ChartTransactionSelection) => void;
}) {
	const payload = rechartsPayload as unknown as ComputedCashFlowLink;

	if (payload.hidden) {
		return null;
	}

	const activeNodeIndex =
		activeElement?.type === "node" ? activeElement.index : null;
	const isRelated =
		activeElement === null ||
		(activeElement.type === "link" && activeElement.index === index) ||
		(activeNodeIndex !== null &&
			(payload.source?.nodeIndex === activeNodeIndex ||
				payload.target?.nodeIndex === activeNodeIndex));
	const halfWidth = Math.max(linkWidth, 1) / 2;
	const isExactActive =
		activeElement?.type === "link" && activeElement.index === index;
	const opacity = isExactActive ? 0.52 : isRelated ? 0.3 : 0.035;
	const path = [
		`M${sourceX},${sourceY - halfWidth}`,
		`C${sourceControlX},${sourceY - halfWidth} ${targetControlX},${targetY - halfWidth} ${targetX},${targetY - halfWidth}`,
		`L${targetX},${targetY + halfWidth}`,
		`C${targetControlX},${targetY + halfWidth} ${sourceControlX},${sourceY + halfWidth} ${sourceX},${sourceY + halfWidth}`,
		"Z",
	].join(" ");

	return (
		<path
			d={path}
			fill={payload.color ?? "#94A3B8"}
			fillOpacity={opacity}
			className="cursor-pointer transition-opacity duration-150"
			onClick={(event) => {
				event.stopPropagation();
				onSelectTransactions({
					key: payload.selectionKey,
					label: payload.label,
					transactionIds: payload.transactionIds,
				});
			}}
		/>
	);
}

export function CashFlowBreakdown({
	incomeRows,
	expenseRows,
	selectedKey,
	onSelectTransactions,
}: {
	incomeRows: ReportCategoryRow[];
	expenseRows: ReportCategoryRow[];
	selectedKey: string | null;
	onSelectTransactions: (selection: ChartTransactionSelection) => void;
}) {
	const [hoveredElement, setHoveredElement] =
		useState<ActiveSankeyElement | null>(null);
	const tooltipPortal = useSyncExternalStore(
		subscribeToDocumentBody,
		getDocumentBodySnapshot,
		getServerDocumentBodySnapshot,
	);
	const sankeyData = useMemo(
		() => buildCashFlowSankeyData(incomeRows, expenseRows),
		[expenseRows, incomeRows],
	);
	const selectedElement = useMemo<ActiveSankeyElement | null>(() => {
		const nodeIndex = sankeyData.nodes.findIndex(
			(node) => node.selectionKey === selectedKey,
		);
		if (nodeIndex >= 0) return { type: "node", index: nodeIndex };
		const linkIndex = sankeyData.links.findIndex(
			(link) => link.selectionKey === selectedKey,
		);
		return linkIndex >= 0 ? { type: "link", index: linkIndex } : null;
	}, [sankeyData.links, sankeyData.nodes, selectedKey]);
	const activeElement = hoveredElement ?? selectedElement;
	const relatedNodeIndexes = useMemo(() => {
		const indexes = new Set<number>();
		if (!activeElement) return indexes;
		if (activeElement.type === "link") {
			const link = sankeyData.links[activeElement.index];
			if (link) {
				indexes.add(link.source);
				indexes.add(link.target);
			}
			return indexes;
		}
		indexes.add(activeElement.index);
		for (const link of sankeyData.links) {
			if (link.source === activeElement.index) indexes.add(link.target);
			if (link.target === activeElement.index) indexes.add(link.source);
		}
		return indexes;
	}, [activeElement, sankeyData.links]);

	if (sankeyData.links.length === 0) {
		return (
			<div className="grid min-h-[520px] place-items-center px-6 text-center">
				<div>
					<p className="text-base font-semibold text-gray-900 dark:text-white">
						No cash-flow data
					</p>
					<p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
						Transactions in the selected range will appear here.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div
			className="relative z-20 h-[clamp(640px,68vh,900px)] min-h-0 w-full overflow-hidden px-3 py-5 sm:px-5"
			onMouseLeave={() => setHoveredElement(null)}
		>
			<ResponsiveContainer
				width="100%"
				height="100%"
				minWidth={0}
				minHeight={0}
				debounce={40}
			>
				<Sankey
					data={sankeyData}
					nameKey="label"
					dataKey="value"
					nodeWidth={14}
					nodePadding={13}
					iterations={96}
					linkCurvature={0.48}
					sort={false}
					verticalAlign="justify"
					margin={{ top: 24, right: 22, bottom: 24, left: 22 }}
					onMouseEnter={(element, type) => {
						const index = Number((element as { index?: number }).index);
						if (
							(type === "node" || type === "link") &&
							Number.isInteger(index)
						) {
							setHoveredElement({ type, index });
						}
					}}
					onMouseLeave={() => setHoveredElement(null)}
					node={(props) => (
						<CashFlowNode
							{...props}
							activeElement={activeElement}
							relatedNodeIndexes={relatedNodeIndexes}
							onSelectTransactions={onSelectTransactions}
						/>
					)}
					link={(props) => (
						<CashFlowLink
							{...props}
							activeElement={activeElement}
							onSelectTransactions={onSelectTransactions}
						/>
					)}
				>
					<Tooltip
						content={<CashFlowTooltip />}
						portal={tooltipPortal}
						isAnimationActive={false}
						allowEscapeViewBox={{
							x: true,
							y: true,
						}}
						wrapperStyle={{
							outline: "none",
							pointerEvents: "none",
							zIndex: 9999,
						}}
					/>
				</Sankey>
			</ResponsiveContainer>
		</div>
	);
}
