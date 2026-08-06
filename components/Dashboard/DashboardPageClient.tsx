/**
 * Main dashboard page component.
 * Renders a grid of draggable, customisable widgets fetched from the global store.
 * Uses the DragDropProvider from dnd‑kit to allow reordering.
 */
"use client";

import { useEffect, useMemo } from "react";
import { DragDropProvider } from "@dnd-kit/react";
import { move } from "@dnd-kit/helpers";

import { useDashboardStore } from "@/store/useDashboardStore";
import { useGoalsData } from "@/hooks/useGoalsData";
import { useDashboardData } from "@/hooks/dashboard/useDashboardData";
import { arraysEqual } from "@/utils/dashboard";

// Widgets
import { BudgetWidget } from "@/components/Dashboard/BudgetWidget";
import { SpendingWidget } from "@/components/Dashboard/SpendingWidget";
import { NetWorthWidget } from "@/components/Dashboard/NetWorthWidget";
import { TransactionsWidget } from "@/components/Dashboard/TransactionsWidget";
import { RecurringWidget } from "@/components/Dashboard/RecurringWidget";
import { InvestmentsWidget } from "@/components/Dashboard/InvestmentsWidget";
import { GoalsWidget } from "@/components/Dashboard/GoalsWidget";
import { TopCategoriesWidget } from "@/components/Dashboard/TopCategoriesWidget";
import { CustomizeDashboardModal } from "@/components/Dashboard/CustomizeDashboardModal";
import { SortableWidget } from "@/components/Dashboard/SortableWidget";

export default function DashboardPageClient() {
	const { currentMonthTxs, summary, breakdownGroups, transactions } =
		useDashboardData();

	const { goals, savingsAccounts, isLoading: isLoadingGoals } = useGoalsData();
	const {
		widgets,
		isLoading: dashboardLoading,
		fetchDashboardWidgets,
		updateOrder,
	} = useDashboardStore();

	useEffect(() => {
		fetchDashboardWidgets();
	}, [fetchDashboardWidgets]);

	const visibleWidgets = useMemo(() => {
		const widgetComponents: Record<string, React.ReactNode> = {
			budget: <BudgetWidget txs={currentMonthTxs} />,
			spending: <SpendingWidget transactions={transactions} />,
			networth: (
				<NetWorthWidget summary={summary} breakdownGroups={breakdownGroups} />
			),
			top_categories: <TopCategoriesWidget />,
			recurring: <RecurringWidget />,
			transactions: <TransactionsWidget transactions={currentMonthTxs} />,
			stocks: <InvestmentsWidget />,
			goals: !isLoadingGoals ? (
				<GoalsWidget goals={goals} savingsAccounts={savingsAccounts} />
			) : null,
		};

		return widgets.order
			.filter((id) => !widgets.hidden.includes(id))
			.map((id) => ({ id, component: widgetComponents[id] }))
			.filter(
				(item) => item.component !== undefined && item.component !== null,
			);
	}, [
		widgets.order,
		widgets.hidden,
		currentMonthTxs,
		transactions,
		summary,
		breakdownGroups,
		isLoadingGoals,
		goals,
		savingsAccounts,
	]);

	return (
		<div className="min-h-screen bg-gray-50 p-4 text-gray-900 md:p-6 lg:p-8 dark:bg-[#0d0d0d] dark:text-[#f5f5f5]">
			<div className="mb-6 flex items-center justify-between">
				<h1 className="text-2xl font-bold text-gray-900 dark:text-white">
					Good evening, User!
				</h1>
				<CustomizeDashboardModal />
			</div>

			<div className="mt-4 columns-1 gap-5 md:columns-2">
				{dashboardLoading ? (
					<div className="col-span-2 py-10 text-center text-gray-500">
						Loading your dashboard widgets...
					</div>
				) : (
					<DragDropProvider
						onDragEnd={(event) => {
							const ids = visibleWidgets.map((w) => w.id);
							const newIds = move(ids, event);
							if (!arraysEqual(ids, newIds)) {
								updateOrder(newIds);
							}
						}}
					>
						{visibleWidgets.map((widget, index) => (
							<SortableWidget
								key={widget.id}
								id={widget.id}
								index={index}
								className="mb-5 break-inside-avoid"
							>
								{widget.component}
							</SortableWidget>
						))}
					</DragDropProvider>
				)}
			</div>
		</div>
	);
}
