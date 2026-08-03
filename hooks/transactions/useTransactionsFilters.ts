/**
 * @file useTransactionsFilters.ts
 * @description Applies all active filters (search, date range, advanced filters, view mode)
 * to the transaction list. Also detects whether any filters are currently active.
 *
 * @param transactions - The raw transaction array from the store.
 * @param searchQuery - The text search query.
 * @param dateRange - The start/end date range.
 * @param filters - The advanced filter object (categories, merchants, amount, etc.).
 * @param confirmedRecurringMerchants - Set of merchant names marked as recurring.
 * @param currentView - "all" or "review".
 * @returns { filteredTransactions, hasActiveFilters }
 */
import { useMemo } from "react";
import { Transaction } from "@/store/useBudgetStore";
import {
	TransactionFilters,
	matchesTransactionFilters,
	hasTransactionFilters,
} from "@/components/Transactions/transactionFilters";
import { TransactionDateRange } from "@/components/Transactions/TopToolbar";

export function useTransactionsFilters(
	transactions: Transaction[],
	searchQuery: string,
	dateRange: TransactionDateRange,
	filters: TransactionFilters,
	confirmedRecurringMerchants: Set<string>,
	currentView: "all" | "review",
) {
	const filteredTransactions = useMemo(() => {
		const normalizedSearch = searchQuery.trim().toLowerCase();

		let filtered = transactions.filter((tx) => {
			// Search
			if (normalizedSearch) {
				const searchable = [
					tx.merchant,
					tx.category,
					tx.description,
					tx.account,
					tx.note,
					String(tx.amount),
					String(Math.abs(tx.amount)),
					...(tx.tags ?? []),
				];
				const matches = searchable.some((v) =>
					String(v ?? "")
						.toLowerCase()
						.includes(normalizedSearch),
				);
				if (!matches) return false;
			}

			// Date range
			if (dateRange.startDate && tx.date < dateRange.startDate) return false;
			if (dateRange.endDate && tx.date > dateRange.endDate) return false;

			// Advanced filters
			if (!matchesTransactionFilters(tx, filters, confirmedRecurringMerchants))
				return false;

			return true;
		});

		if (currentView === "review") {
			filtered = filtered.filter(
				(tx) => tx.needs_review || tx.category === "Uncategorized",
			);
		}

		return filtered;
	}, [
		transactions,
		searchQuery,
		dateRange,
		filters,
		confirmedRecurringMerchants,
		currentView,
	]);

	const hasActiveFilters = useMemo(() => {
		const hasSearch = Boolean(searchQuery.trim());
		const hasDate = Boolean(dateRange.startDate || dateRange.endDate);
		const hasTxFilters = hasTransactionFilters(filters);
		return hasSearch || hasDate || hasTxFilters || currentView !== "all";
	}, [searchQuery, dateRange, filters, currentView]);

	return { filteredTransactions, hasActiveFilters };
}
