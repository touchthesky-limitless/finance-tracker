import type { Transaction } from "@/store/useBudgetStore";
import type { MerchantListItem } from "@/components/Merchants/types";

export type AmountFilterMode =
	| "none"
	| "greater-than"
	| "less-than"
	| "equal-to"
	| "between";

export type TransactionTypeFilter = "all" | "debits" | "credits";
export type TriStateFilter = "any" | "yes" | "no";

export interface TransactionFilters {
	categoryNames: string[];
	merchantNames: string[];
	accountNames: string[];
	tags: string[];
	goalIds: string[];
	amountMode: AmountFilterMode;
	amountValue: string;
	amountMaxValue: string;
	transactionType: TransactionTypeFilter;
	needsReview: TriStateFilter;
	recurring: TriStateFilter;
	attachments: TriStateFilter;
	split: TriStateFilter;
}

export interface TransactionFilterOption {
	value: string;
	label: string;
	group?: string;
	count?: number;
	secondaryLabel?: string;
	disabled?: boolean;
	isParent?: boolean;
	iconName?: string;
	colorKey?: string;

	merchant?: MerchantListItem;
}

export interface TransactionFilterData {
	categories: TransactionFilterOption[];
	merchants: TransactionFilterOption[];
	accounts: TransactionFilterOption[];
	tags: TransactionFilterOption[];
	goals: TransactionFilterOption[];
}

export const EMPTY_TRANSACTION_FILTERS: TransactionFilters = {
	categoryNames: [],
	merchantNames: [],
	accountNames: [],
	tags: [],
	goalIds: [],
	amountMode: "none",
	amountValue: "",
	amountMaxValue: "",
	transactionType: "all",
	needsReview: "any",
	recurring: "any",
	attachments: "any",
	split: "any",
};

function normalize(value: string | null | undefined): string {
	return String(value ?? "")
		.trim()
		.toLowerCase();
}

function uniqueSorted(values: string[]): string[] {
	return [...new Set(values)].sort((first, second) => {
		return first.localeCompare(second);
	});
}

export function normalizeTransactionFilters(
	filters: TransactionFilters,
): TransactionFilters {
	return {
		...filters,
		categoryNames: uniqueSorted(filters.categoryNames),
		merchantNames: uniqueSorted(filters.merchantNames),
		accountNames: uniqueSorted(filters.accountNames),
		tags: uniqueSorted(filters.tags),
		goalIds: uniqueSorted(filters.goalIds),
		amountValue: filters.amountValue.trim(),
		amountMaxValue: filters.amountMaxValue.trim(),
	};
}

export function transactionFiltersEqual(
	first: TransactionFilters,
	second: TransactionFilters,
): boolean {
	return (
		JSON.stringify(normalizeTransactionFilters(first)) ===
		JSON.stringify(normalizeTransactionFilters(second))
	);
}

export function countActiveTransactionFilters(
	filters: TransactionFilters,
): number {
	let count =
		filters.categoryNames.length +
		filters.merchantNames.length +
		filters.accountNames.length +
		filters.tags.length +
		filters.goalIds.length;

	if (filters.amountMode !== "none") {
		count += 1;
	}

	if (filters.transactionType !== "all") {
		count += 1;
	}

	if (filters.needsReview !== "any") {
		count += 1;
	}

	if (filters.recurring !== "any") {
		count += 1;
	}

	if (filters.attachments !== "any") {
		count += 1;
	}

	if (filters.split !== "any") {
		count += 1;
	}

	return count;
}

export function hasTransactionFilters(filters: TransactionFilters): boolean {
	return countActiveTransactionFilters(filters) > 0;
}

interface ExtendedTransaction extends Transaction {
	merchant_id?: string | null;
	goal_id?: string | null;
	recurring?: boolean;
	is_recurring?: boolean;
	has_attachments?: boolean;
	attachment_count?: number;
	attachments?: unknown[];
	is_split?: boolean;
	split_parent_id?: string | null;
}

function matchesSelectedValue(
	value: string | null | undefined,
	selectedValues: string[],
): boolean {
	if (selectedValues.length === 0) {
		return true;
	}

	const normalizedValue = normalize(value);

	return selectedValues.some((selectedValue) => {
		return normalize(selectedValue) === normalizedValue;
	});
}

function matchesTriState(value: boolean, filter: TriStateFilter): boolean {
	if (filter === "any") {
		return true;
	}

	return filter === "yes" ? value : !value;
}

function parseAmount(value: string): number | null {
	const normalizedValue = value.replaceAll(",", "").trim();

	if (!normalizedValue) {
		return null;
	}

	const parsedValue = Number(normalizedValue);

	return Number.isFinite(parsedValue) ? Math.abs(parsedValue) : null;
}

function matchesAmount(amount: number, filters: TransactionFilters): boolean {
	if (filters.amountMode === "none") {
		return true;
	}

	const amountValue = Math.abs(amount);
	const firstValue = parseAmount(filters.amountValue);

	if (firstValue === null) {
		return true;
	}

	if (filters.amountMode === "greater-than") {
		return amountValue > firstValue;
	}

	if (filters.amountMode === "less-than") {
		return amountValue < firstValue;
	}

	if (filters.amountMode === "equal-to") {
		return Math.abs(amountValue - firstValue) < 0.005;
	}

	const secondValue = parseAmount(filters.amountMaxValue);

	if (secondValue === null) {
		return true;
	}

	const minimum = Math.min(firstValue, secondValue);
	const maximum = Math.max(firstValue, secondValue);

	return amountValue >= minimum && amountValue <= maximum;
}

function getRecurringState(
	transaction: ExtendedTransaction,
	confirmedRecurringMerchants: ReadonlySet<string>,
): boolean {
	if (typeof transaction.is_recurring === "boolean") {
		return transaction.is_recurring;
	}

	if (typeof transaction.recurring === "boolean") {
		return transaction.recurring;
	}

	return confirmedRecurringMerchants.has(normalize(transaction.merchant));
}

function getAttachmentState(transaction: ExtendedTransaction): boolean {
	if (typeof transaction.has_attachments === "boolean") {
		return transaction.has_attachments;
	}

	if (typeof transaction.attachment_count === "number") {
		return transaction.attachment_count > 0;
	}

	return (
		Array.isArray(transaction.attachments) && transaction.attachments.length > 0
	);
}

function getSplitState(transaction: ExtendedTransaction): boolean {
	if (typeof transaction.is_split === "boolean") {
		return transaction.is_split;
	}

	return Boolean(transaction.split_parent_id);
}

export function matchesTransactionFilters(
	transaction: Transaction,
	filters: TransactionFilters,
	confirmedRecurringMerchants: ReadonlySet<string>,
): boolean {
	const extendedTransaction = transaction as ExtendedTransaction;

	if (!matchesSelectedValue(transaction.category, filters.categoryNames)) {
		return false;
	}

	if (!matchesSelectedValue(transaction.merchant, filters.merchantNames)) {
		return false;
	}

	if (!matchesSelectedValue(transaction.account, filters.accountNames)) {
		return false;
	}

	if (filters.tags.length > 0) {
		const transactionTags = new Set(
			(transaction.tags ?? []).map((tag) => {
				return normalize(tag);
			}),
		);

		const hasSelectedTag = filters.tags.some((tag) => {
			return transactionTags.has(normalize(tag));
		});

		if (!hasSelectedTag) {
			return false;
		}
	}

	if (
		filters.goalIds.length > 0 &&
		!filters.goalIds.includes(extendedTransaction.goal_id ?? "")
	) {
		return false;
	}

	if (!matchesAmount(transaction.amount, filters)) {
		return false;
	}

	if (filters.transactionType === "debits" && transaction.amount >= 0) {
		return false;
	}

	if (filters.transactionType === "credits" && transaction.amount <= 0) {
		return false;
	}

	if (!matchesTriState(transaction.needs_review, filters.needsReview)) {
		return false;
	}

	if (
		!matchesTriState(
			getRecurringState(extendedTransaction, confirmedRecurringMerchants),
			filters.recurring,
		)
	) {
		return false;
	}

	if (
		!matchesTriState(
			getAttachmentState(extendedTransaction),
			filters.attachments,
		)
	) {
		return false;
	}

	if (!matchesTriState(getSplitState(extendedTransaction), filters.split)) {
		return false;
	}

	return true;
}
