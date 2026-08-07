/**
 * Core utility functions used throughout the recurring module.
 * Includes normalization, frequency inference, filter matching, etc.
 */

import type {
	RecurringFilters,
	RecurringOccurrence,
	RecurringRecord,
	RecurringSortState,
	RecurringType,
} from "../types/recurringTypes";
import { getNextOccurrenceDate } from "./occurrenceUtils";
import { getFrequencyLabel } from "./frequencyUtils";
import type { RecurringCandidate, AllRecurringGroupMode } from "../types";

// Re-export sub-module utilities
export * from "./frequencyUtils";
export * from "./dateUtils";
export * from "./candidateUtils";
export * from "./occurrenceUtils";

const TYPE_LABELS: Record<RecurringType, string> = {
	"income": "Income",
	"expense": "Expense",
	"credit-card": "Credit card",
};

export function getTypeLabel(value: RecurringType): string {
	return TYPE_LABELS[value];
}

export function normalize(value: string | null | undefined): string {
	return value?.trim().toLocaleLowerCase().replace(/\s+/g, " ") ?? "";
}

export function countRecurringFilters(filters: RecurringFilters): number {
	return (
		filters.types.length +
		filters.accountIds.length +
		filters.categoryIds.length +
		filters.frequencies.length
	);
}

export function matchesRecurringFilters(
	record: RecurringRecord,
	filters: RecurringFilters,
): boolean {
	if (filters.types.length > 0 && !filters.types.includes(record.type))
		return false;
	if (
		filters.accountIds.length > 0 &&
		(!record.accountId || !filters.accountIds.includes(record.accountId))
	)
		return false;
	if (
		filters.categoryIds.length > 0 &&
		(!record.categoryId || !filters.categoryIds.includes(record.categoryId))
	)
		return false;
	if (
		filters.frequencies.length > 0 &&
		!filters.frequencies.includes(record.frequency)
	)
		return false;
	return true;
}

export function median(values: number[]): number {
	if (values.length === 0) return 30;
	const sorted = [...values].sort((a, b) => a - b);
	const middle = Math.floor(sorted.length / 2);
	return sorted.length % 2 === 0
		? (sorted[middle - 1] + sorted[middle]) / 2
		: sorted[middle];
}

export function getRecordGroupLabel(
	record: RecurringRecord,
	mode: AllRecurringGroupMode,
): string {
	if (mode === "status")
		return record.status === "active" ? "Active" : "Canceled";
	if (mode === "category") return record.categoryName || "Uncategorized";
	return getFrequencyLabel(record.frequency);
}

export function sortRecords(
	records: RecurringRecord[],
	sort: RecurringSortState,
): RecurringRecord[] {
	const direction = sort.direction === "asc" ? 1 : -1;
	return [...records].sort((first, second) => {
		let comparison = 0;
		if (sort.key === "date") {
			comparison =
				getNextOccurrenceDate(first).getTime() -
				getNextOccurrenceDate(second).getTime();
		}
		if (sort.key === "account") {
			comparison = compareRecurringText(first.accountName, second.accountName);
		}
		if (sort.key === "category") {
			comparison = compareRecurringText(
				first.categoryName,
				second.categoryName,
			);
		}
		if (sort.key === "amount") {
			comparison =
				recurringAmount(first.amount) - recurringAmount(second.amount);
		}
		return (
			comparison * direction ||
			compareRecurringText(first.merchantName, second.merchantName)
		);
	});
}

export function sortOccurrences(
	occurrences: RecurringOccurrence[],
	sort: RecurringSortState,
): RecurringOccurrence[] {
	const direction = sort.direction === "asc" ? 1 : -1;
	return [...occurrences].sort((first, second) => {
		let comparison = 0;
		if (sort.key === "date") {
			comparison = first.date.getTime() - second.date.getTime();
		}
		if (sort.key === "account") {
			comparison = compareRecurringText(
				first.record.accountName,
				second.record.accountName,
			);
		}
		if (sort.key === "category") {
			comparison = compareRecurringText(
				first.record.categoryName,
				second.record.categoryName,
			);
		}
		if (sort.key === "amount") {
			comparison =
				recurringAmount(first.record.amount) -
				recurringAmount(second.record.amount);
		}
		return (
			comparison * direction ||
			compareRecurringText(
				first.record.merchantName,
				second.record.merchantName,
			)
		);
	});
}

function compareRecurringText(
	first: string | null | undefined,
	second: string | null | undefined,
): number {
	return String(first ?? "").localeCompare(String(second ?? ""), "en-US", {
		numeric: true,
		sensitivity: "base",
	});
}

function recurringAmount(value: number | null | undefined): number {
	return Number.isFinite(value) ? Number(value) : 0;
}

export function createRecordFromCandidate(
	candidate: RecurringCandidate,
): RecurringRecord {
	const now = new Date().toISOString();
	return {
		id: crypto.randomUUID(),
		sourceKey: candidate.key,
		merchantId: candidate.merchantId,
		merchantName: candidate.merchantName,
		logoUrl: candidate.logoUrl,
		amount: candidate.suggestedAmount,
		type: candidate.suggestedType,
		frequency: candidate.suggestedFrequency,
		startingDate: candidate.suggestedStartingDate,
		status: "active",
		accountId: candidate.suggestedAccountId,
		accountName: candidate.suggestedAccountName,
		categoryId: candidate.suggestedCategoryId,
		categoryName: candidate.suggestedCategoryName,
		createdAt: now,
		updatedAt: now,
	};
}
