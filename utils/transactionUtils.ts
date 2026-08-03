/**
 * @file transactionUtils.ts
 * @description Domain-specific helper functions for the Transaction model.
 * Provides a factory for new transactions and standardised string normalisation
 * used for matching categories, merchants, and search queries.
 */
import { Transaction } from "@/store/useBudgetStore";

export function createBlankTransaction(): Transaction {
	return {
		id: crypto.randomUUID(),
		date: new Date().toISOString().slice(0, 10),
		merchant: "",
		merchant_id: null,
		description: "",
		amount: 0,
		category: "Uncategorized",
		account: "",
		account_id: null,
		needs_review: true,
		needs_subcat: true,
		tags: [],
		note: "",
	};
}

export function normalizeCategoryName(name: string): string {
	return name.trim().toLowerCase();
}

export function normalizeMerchantName(name: string): string {
	return name.trim().toLocaleLowerCase();
}
