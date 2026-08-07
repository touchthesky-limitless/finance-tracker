/**
 * useCategoryTransactions - Hook that filters transactions by category and applies filters.
 */

import { useMemo } from "react";
import type { Transaction } from "@/store/useBudgetStore";
import { normalizeCategoryName } from "@/components/Categories/utils";
import { transactionMatchesCashFlowFilters } from "@/components/CashFlow/cashFlowUtils";
import type { CashFlowFilters } from "@/components/CashFlow/types";

export function useCategoryTransactions(
	transactions: Transaction[],
	categoryName: string | null,
	filters: CashFlowFilters,
) {
	const categoryTxs = useMemo(() => {
		if (!categoryName) return [];
		const norm = normalizeCategoryName(categoryName);
		return transactions.filter(
			(tx) => normalizeCategoryName(tx.category) === norm,
		);
	}, [transactions, categoryName]);

	const filtered = useMemo(
		() =>
			categoryTxs.filter((tx) =>
				transactionMatchesCashFlowFilters(tx, filters),
			),
		[categoryTxs, filters],
	);

	return { categoryTxs, filtered };
}
