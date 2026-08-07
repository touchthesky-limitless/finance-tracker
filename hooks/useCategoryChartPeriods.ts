/**
 * useCategoryChartPeriods - Hook that builds chart periods for a category.
 */

import { useMemo } from "react";
import type { Transaction } from "@/store/useBudgetStore";
import type { CashFlowTimeframe } from "@/components/CashFlow/types";
import { buildCategoryChartPeriods } from "@/components/Categories/utils";

export function useCategoryChartPeriods(
	transactions: Transaction[],
	selectedDate: Date,
	timeframe: CashFlowTimeframe,
) {
	return useMemo(
		() => buildCategoryChartPeriods(transactions, selectedDate, timeframe),
		[transactions, selectedDate, timeframe],
	);
}
