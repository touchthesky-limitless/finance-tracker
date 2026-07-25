"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
	BarChart3,
	ChevronDown,
	Download,
	LayoutList,
	PieChart,
} from "lucide-react";
import type {
	BreakdownChartType,
	ReportGrouping,
	ReportInterval,
	ReportTab,
	ReportView,
	TrendChartType,
} from "@/components/Reports/types";

function SelectMenu<TValue extends string>({
	label,
	value,
	items,
	onChange,
}: {
	label: string;
	value: TValue;
	items: ReadonlyArray<{ value: TValue; label: string }>;
	onChange: (value: TValue) => void;
}) {
	return (
		<DropdownMenu.Root modal={false}>
			<DropdownMenu.Trigger asChild>
				<button className="flex h-11 items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-900 shadow-sm outline-none hover:bg-gray-50 data-[state=open]:border-cyan-500 dark:border-white/10 dark:bg-[#202020] dark:text-white dark:hover:bg-[#282828]">
					{label}
					<ChevronDown size={16} />
				</button>
			</DropdownMenu.Trigger>
			<DropdownMenu.Portal>
				<DropdownMenu.Content
					align="end"
					sideOffset={8}
					className="z-[120] min-w-48 rounded-xl border border-gray-200 bg-white p-1.5 shadow-2xl dark:border-white/10 dark:bg-[#202020]"
				>
					<DropdownMenu.RadioGroup value={value} onValueChange={(next) => onChange(next as TValue)}>
						{items.map((item) => (
							<DropdownMenu.RadioItem
								key={item.value}
								value={item.value}
								className="cursor-default rounded-lg px-3 py-2.5 text-sm text-gray-800 outline-none data-[highlighted]:bg-cyan-50 data-[state=checked]:bg-cyan-100 data-[state=checked]:text-cyan-700 dark:text-gray-200 dark:data-[highlighted]:bg-white/5 dark:data-[state=checked]:bg-cyan-500/15 dark:data-[state=checked]:text-cyan-300"
							>
								{item.label}
							</DropdownMenu.RadioItem>
						))}
					</DropdownMenu.RadioGroup>
				</DropdownMenu.Content>
			</DropdownMenu.Portal>
		</DropdownMenu.Root>
	);
}

export function ReportControls({
	tab,
	view,
	onViewChange,
	grouping,
	onGroupingChange,
	interval,
	onIntervalChange,
	breakdownChart,
	onBreakdownChartChange,
	trendChart,
	onTrendChartChange,
	showInterval,
}: {
	tab: ReportTab;
	view: ReportView;
	onViewChange: (value: ReportView) => void;
	grouping: ReportGrouping;
	onGroupingChange: (value: ReportGrouping) => void;
	interval: ReportInterval;
	onIntervalChange: (value: ReportInterval) => void;
	breakdownChart: BreakdownChartType;
	onBreakdownChartChange: (value: BreakdownChartType) => void;
	trendChart: TrendChartType;
	onTrendChartChange: (value: TrendChartType) => void;
	showInterval: boolean;
}) {
	return (
		<div className="flex flex-col gap-4 border-b border-gray-200 px-5 py-5 lg:flex-row lg:items-center lg:justify-between dark:border-white/5">
			<div className="flex items-center gap-2">
				{(["breakdown", "trends"] as const).map((item) => (
					<button
						key={item}
						type="button"
						onClick={() => onViewChange(item)}
						className={`rounded-full px-5 py-2.5 text-sm font-semibold capitalize transition-colors ${
							view === item
								? "bg-[#ebe8e5] text-gray-950 dark:bg-white/10 dark:text-white"
								: "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
						}`}
					>
						{item}
					</button>
				))}
			</div>

			<div className="flex flex-wrap items-center gap-3">
				{showInterval && (
					<SelectMenu
						label={interval === "monthly" ? "Monthly" : interval === "quarterly" ? "Quarterly" : "Yearly"}
						value={interval}
						onChange={onIntervalChange}
						items={[
							{ value: "monthly", label: "Monthly" },
							{ value: "quarterly", label: "Quarterly" },
							{ value: "yearly", label: "Yearly" },
						]}
					/>
				)}
				<SelectMenu
					label={
						grouping === "category"
							? tab === "cash-flow"
								? "By category & group"
								: "By category"
							: grouping === "group"
								? "By group"
								: grouping === "merchant"
									? "By merchant"
									: "By fixed / flexible"
					}
					value={grouping}
					onChange={onGroupingChange}
					items={[
						{ value: "category", label: "By category" },
						{ value: "group", label: "By group" },
						{ value: "merchant", label: "By merchant" },
						{ value: "fixed-flexible", label: "By fixed / flexible" },
					]}
				/>

				<div className="h-7 w-px bg-gray-300 dark:bg-white/10" />

				<div className="flex overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#202020]">
					{view === "breakdown" ? (
						<>
							<button
								type="button"
								onClick={() => onBreakdownChartChange("pie")}
								className={`flex h-11 items-center gap-2 px-4 text-sm font-semibold ${breakdownChart === "pie" ? "bg-[#f0eeec] text-gray-950 dark:bg-white/10 dark:text-white" : "text-gray-700 dark:text-gray-300"}`}
							>
								<PieChart size={18} /> Pie
							</button>
							<button
								type="button"
								onClick={() => onBreakdownChartChange("bars")}
								className={`flex h-11 items-center gap-2 border-l border-gray-200 px-4 text-sm font-semibold dark:border-white/10 ${breakdownChart === "bars" ? "bg-[#f0eeec] text-gray-950 dark:bg-white/10 dark:text-white" : "text-gray-700 dark:text-gray-300"}`}
							>
								<LayoutList size={18} /> Bars
							</button>
						</>
					) : (
						<>
							<button
								type="button"
								onClick={() => onTrendChartChange("grouped")}
								className={`flex h-11 items-center gap-2 px-4 text-sm font-semibold ${trendChart === "grouped" ? "bg-[#f0eeec] text-gray-950 dark:bg-white/10 dark:text-white" : "text-gray-700 dark:text-gray-300"}`}
							>
								<BarChart3 size={18} /> Grouped
							</button>
							<button
								type="button"
								onClick={() => onTrendChartChange("stacked")}
								className={`flex h-11 items-center gap-2 border-l border-gray-200 px-4 text-sm font-semibold dark:border-white/10 ${trendChart === "stacked" ? "bg-[#f0eeec] text-gray-950 dark:bg-white/10 dark:text-white" : "text-gray-700 dark:text-gray-300"}`}
							>
								<BarChart3 size={18} /> Stacked
							</button>
						</>
					)}
				</div>

				<div className="h-7 w-px bg-gray-300 dark:bg-white/10" />
				<button type="button" aria-label="Download report" className="grid size-11 place-items-center rounded-xl border border-gray-200 bg-white shadow-sm hover:bg-gray-50 dark:border-white/10 dark:bg-[#202020] dark:hover:bg-[#282828]">
					<Download size={18} />
				</button>
			</div>
		</div>
	);
}
