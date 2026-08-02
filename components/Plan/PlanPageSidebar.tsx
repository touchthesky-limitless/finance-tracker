"use client";

import { Info } from "lucide-react";
import { formatSignedCurrencyInt } from "@/utils/formatters";
import { SidebarProgressRow } from "./SidebarProgressRow";

interface PlanPageSidebarProps {
	leftToBudget: number;
	sidebarTab: "summary" | "income" | "expenses";
	setSidebarTab: (tab: "summary" | "income" | "expenses") => void;
	sidebarData: {
		income: { planned: number; actual: number };
		expenses: { planned: number; actual: number };
		saveUp: { planned: number; actual: number };
		payDown: { planned: number; actual: number };
	};
	getPlanned: (categoryId: string) => number;
	groupTotals: Record<string, number>;
}

export function PlanPageSidebar({
	leftToBudget,
	sidebarTab,
	setSidebarTab,
	sidebarData,
	getPlanned,
	groupTotals,
}: PlanPageSidebarProps) {
	return (
		<div className="flex w-full flex-col gap-4 lg:w-[340px] lg:sticky lg:top-6 lg:self-start">
			{/* Left to Budget Card */}
			<div className="rounded-2xl bg-red-50 p-5 text-center dark:bg-red-500/10">
				<h2 className="text-3xl font-bold text-red-600 dark:text-red-400">
					{formatSignedCurrencyInt(leftToBudget)}
				</h2>
				<div className="mt-1 flex items-center justify-center gap-1 text-sm font-medium text-red-600 dark:text-red-400">
					Left to budget <Info size={14} />
				</div>
			</div>

			{/* Tabs */}
			<div className="flex rounded-xl bg-white p-1 shadow-sm dark:bg-[#191919]">
				{["Summary", "Income", "Expenses"].map((tab) => (
					<button
						key={tab}
						onClick={() =>
							setSidebarTab(tab.toLowerCase() as typeof sidebarTab)
						}
						className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
							sidebarTab === tab.toLowerCase()
								? "bg-gray-100 text-gray-900 dark:bg-white/10 dark:text-white"
								: "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
						}`}
					>
						{tab}
					</button>
				))}
			</div>

			{/* Content based on tab */}
			<div className="flex flex-col gap-4 rounded-2xl bg-white p-4 shadow-sm dark:bg-[#191919]">
				{sidebarTab === "summary" && (
					<>
						<SidebarProgressRow
							label="Income"
							planned={sidebarData.income.planned}
							actual={sidebarData.income.actual}
							color="green"
							actualLabel="earned"
						/>
						<SidebarProgressRow
							label="Expenses"
							planned={sidebarData.expenses.planned}
							actual={sidebarData.expenses.actual}
							color="red"
							actualLabel="spent"
						/>
						<SidebarProgressRow
							label="Save up"
							planned={sidebarData.saveUp.planned}
							actual={sidebarData.saveUp.actual}
							color="blue"
							actualLabel="contributed"
						/>
						<SidebarProgressRow
							label="Pay down"
							planned={sidebarData.payDown.planned}
							actual={sidebarData.payDown.actual}
							color="blue"
							actualLabel="paid down"
						/>
					</>
				)}
				{sidebarTab === "income" && (
					<SidebarProgressRow
						label="Income"
						planned={sidebarData.income.planned}
						actual={sidebarData.income.actual}
						color="green"
						actualLabel="earned"
					/>
				)}
				{sidebarTab === "expenses" && (
					<>
						<SidebarProgressRow
							label="Fixed"
							planned={getPlanned("Fixed")}
							actual={groupTotals.Fixed || 0}
							color="red"
							actualLabel="spent"
						/>
						<SidebarProgressRow
							label="Flexible"
							planned={getPlanned("Flexible")}
							actual={groupTotals.Flexible || 0}
							color="green"
							actualLabel="spent"
						/>
						<SidebarProgressRow
							label="Non-Monthly"
							planned={getPlanned("Non-Monthly")}
							actual={groupTotals["Non-Monthly"] || 0}
							color="gray"
							actualLabel="spent"
						/>
					</>
				)}
			</div>
		</div>
	);
}
