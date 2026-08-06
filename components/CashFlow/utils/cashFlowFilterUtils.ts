/**
 * cashFlowFilterUtils – Filter matching logic for transactions.
 */
import type { Transaction } from "@/store/useBudgetStore";
import type { CashFlowFilters } from "../types";

export function transactionMatchesCashFlowFilters(
	transaction: Transaction,
	filters: CashFlowFilters,
): boolean {
	if (filters.accountIds.length > 0) {
		const accountId = transaction.account_id ?? "";
		if (!filters.accountIds.includes(accountId)) return false;
	}

	if (filters.tags.length > 0) {
		const txTags = new Set(
			(transaction.tags ?? []).map((t) => t.trim().toLowerCase()),
		);
		if (!filters.tags.every((tag) => txTags.has(tag.trim().toLowerCase())))
			return false;
	}

	const isHidden = Boolean(transaction.is_hidden);
	if (filters.hidden === "visible" && isHidden) return false;
	if (filters.hidden === "hidden" && !isHidden) return false;

	return true;
}
