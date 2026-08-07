/**
 * Recurring module type definitions.
 */
import type { Transaction } from "@/store/useBudgetStore";

export type RecurringType = "income" | "expense" | "credit-card";

export type RecurringFrequency =
	| "weekly"
	| "every-2-weeks"
	| "every-4-weeks"
	| "twice-monthly-first-fifteenth"
	| "twice-monthly-fifteenth-last"
	| "monthly"
	| "every-2-months"
	| "every-3-months"
	| "every-4-months"
	| "every-6-months"
	| "yearly";

export type RecurringStatus = "active" | "canceled";
export type RecurringOccurrenceStatus = "complete" | "upcoming" | "overdue";
export type RecurringSortKey = "date" | "account" | "category" | "amount";
export type SortDirection = "asc" | "desc";
export type AllRecurringGroupMode = "status" | "category" | "frequency";

export interface RecurringRecord {
	id: string;
	sourceKey: string;
	merchantId: string | null;
	merchantName: string;
	logoUrl: string | null;
	amount: number;
	type: RecurringType;
	frequency: RecurringFrequency;
	startingDate: string;
	status: RecurringStatus;
	accountId: string | null;
	accountName: string;
	categoryId: string | null;
	categoryName: string;
	createdAt: string;
	updatedAt: string;
}

export interface RecurringCandidate {
	key: string;
	merchantId: string | null;
	merchantName: string;
	logoUrl: string | null;
	transactions: Transaction[];
	suggestedAmount: number;
	suggestedType: RecurringType;
	suggestedFrequency: RecurringFrequency;
	suggestedStartingDate: string;
	suggestedAccountId: string | null;
	suggestedAccountName: string;
	suggestedCategoryId: string | null;
	suggestedCategoryName: string;
}

export interface RecurringOccurrence {
	id: string;
	record: RecurringRecord;
	date: Date;
	status: RecurringOccurrenceStatus;
	matchedTransactionId: string | null;
}

export interface RecurringFilters {
	types: RecurringType[];
	accountIds: string[];
	categoryIds: string[];
	frequencies: RecurringFrequency[];
}

export const EMPTY_RECURRING_FILTERS: RecurringFilters = {
	types: [],
	accountIds: [],
	categoryIds: [],
	frequencies: [],
};

export interface RecurringSortState {
	key: RecurringSortKey;
	direction: SortDirection;
}
