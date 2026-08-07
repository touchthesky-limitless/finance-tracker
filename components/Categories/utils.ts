/**
 * Utility functions for category components.
 */

/**
 * Normalizes a category name for comparison.
 */
export function normalizeCategoryName(
	value: string | null | undefined,
): string {
	return value?.trim().toLowerCase() ?? "";
}

/**
 * Parses an enum value from a string, with a fallback.
 */
export function parseEnum<T extends string>(
	value: string | null,
	allowed: readonly T[],
	fallback: T,
): T {
	return allowed.includes(value as T) ? (value as T) : fallback;
}

/**
 * Reads a CSV string into an array of trimmed non-empty strings.
 */
export function readCsv(value: string | null): string[] {
	if (!value) return [];
	return value
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);
}

/**
 * Gets the latest transaction date from an array of transactions.
 */
import type { Transaction } from "@/store/useBudgetStore";
import { parseUtcDate } from "@/components/CashFlow/cashFlowUtils";

export function getLatestTransactionDate(
	transactions: Transaction[],
): Date | null {
	let latest: Date | null = null;
	for (const tx of transactions) {
		const date = parseUtcDate(tx.date);
		if (date && (!latest || date > latest)) {
			latest = date;
		}
	}
	return latest;
}

/**
 * Generates a short label for a period based on timeframe.
 */
import type { CashFlowTimeframe } from "@/components/CashFlow/types";
import {
	startOfPeriod,
	endOfPeriod,
	shiftPeriod,
	toDateParam,
	formatPeriodTitle,
} from "@/components/CashFlow/cashFlowUtils";
import { CategoryChartPeriod } from "./types";

export function getPeriodShortLabel(
	date: Date,
	timeframe: CashFlowTimeframe,
): string {
	if (timeframe === "year") {
		return String(date.getUTCFullYear());
	}
	if (timeframe === "quarter") {
		return `Q${Math.floor(date.getUTCMonth() / 3) + 1}`;
	}
	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		timeZone: "UTC",
	}).format(date);
}

/**
 * Builds the chart periods for a category.
 */
export function buildCategoryChartPeriods(
	transactions: Transaction[],
	selectedDate: Date,
	timeframe: CashFlowTimeframe,
): CategoryChartPeriod[] {
	const periodCount = timeframe === "year" ? 7 : 9;
	const latestDate = getLatestTransactionDate(transactions);
	const latestStart = startOfPeriod(latestDate ?? selectedDate, timeframe);
	const selectedStart = startOfPeriod(selectedDate, timeframe);
	const earliestLatestWindow = shiftPeriod(
		latestStart,
		timeframe,
		-(periodCount - 1),
	);

	let chartEnd = latestStart;
	if (selectedStart < earliestLatestWindow) {
		chartEnd = shiftPeriod(selectedStart, timeframe, periodCount - 2);
	} else if (selectedStart > latestStart) {
		chartEnd = selectedStart;
	}

	const amountByKey = new Map<string, number>();
	for (const tx of transactions) {
		const date = parseUtcDate(tx.date);
		if (!date) continue;
		const key = toDateParam(startOfPeriod(date, timeframe));
		const amount = Math.abs(Number(tx.amount) || 0);
		amountByKey.set(key, (amountByKey.get(key) ?? 0) + amount);
	}

	const periods: CategoryChartPeriod[] = [];
	for (let i = 0; i < periodCount; i++) {
		const start = shiftPeriod(chartEnd, timeframe, i - periodCount + 1);
		const key = toDateParam(start);
		const prev = periods[periods.length - 1];
		const year = start.getUTCFullYear();
		periods.push({
			key,
			label: formatPeriodTitle(start, timeframe),
			shortLabel: getPeriodShortLabel(start, timeframe),
			start,
			end: endOfPeriod(start, timeframe),
			amount: amountByKey.get(key) ?? 0,
			year,
			showYearMarker: !prev || prev.year !== year,
		});
	}
	return periods;
}
