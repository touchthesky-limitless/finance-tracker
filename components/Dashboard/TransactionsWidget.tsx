/**
 * Shows the five most recent transactions in a compact table.
 * Clicking a row opens the transaction detail drawer.
 */
"use client";

import { useState, useMemo, useCallback } from "react";
import { Transaction, useBudgetStore } from "@/store/useBudgetStore";
import { useTransactionDrawer } from "@/store/useTransactionDrawer";
import { DataTable } from "@/components/Transactions/DataTable";
import { SortingState } from "@tanstack/react-table";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { MOBILE_BREAKPOINT } from "@/config/breakpoints";
import { WidgetShell } from "./WidgetShell";

export function TransactionsWidget({
	transactions,
}: {
	transactions: Transaction[];
}) {
	const isMobile = useMediaQuery(MOBILE_BREAKPOINT);
	const [sorting] = useState<SortingState>([{ id: "date", desc: true }]);
	const top5 = useMemo(() => transactions.slice(0, 5), [transactions]);
	const openDrawer = useTransactionDrawer((state) => state.openDrawer);
	const customCategories = useBudgetStore((state) => state.customCategories);

	const getCategoryId = useCallback(
		(categoryName: string) => {
			const normalized = categoryName.trim().toLowerCase();
			const found = customCategories.find(
				(cat) => cat.name.trim().toLowerCase() === normalized,
			);
			return found?.id;
		},
		[customCategories],
	);

	return (
		<WidgetShell
			title="Transactions"
			subtitle="Most recent"
			className="!p-2 overflow-hidden"
			dropdown={
				<select className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-sm font-medium outline-none dark:border-white/10 dark:bg-[#2a2a2a]">
					<option>All transactions</option>
					<option>Needs Review</option>
				</select>
			}
		>
			<div
				className={`w-full overflow-hidden ${isMobile ? "h-[290px]" : "h-[300px]"}`}
			>
				<DataTable
					transactions={top5}
					selectedIds={[]}
					onSelectRow={() => {}}
					onRowClick={(transaction) => openDrawer(transaction.id)}
					columnVisibility={{ account: false }}
					isEditMode={false}
					currentView="all"
					sorting={sorting}
					isMerchantNavigationEnabled={true}
					getCategoryId={getCategoryId}
					isCategoryView
					disableDateGrouping={true}
				/>
			</div>
		</WidgetShell>
	);
}
