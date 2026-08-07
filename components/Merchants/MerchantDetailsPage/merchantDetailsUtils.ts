/**
 * Utility functions for the Merchant Details page.
 */
import type { CashFlowTimeframe } from "@/components/CashFlow/types";
import {
	parseUtcDate,
	startOfPeriod,
	endOfPeriod,
	shiftPeriod,
	toDateParam,
	formatPeriodTitle,
} from "@/components/CashFlow/cashFlowUtils";
import { normalizeMerchantName } from "@/hooks/useUnifiedMerchants";
import { useBudgetStore, type Transaction } from "@/store/useBudgetStore";
import type { MerchantChartPeriod } from "./MerchantTrendChart";

/**
 * Normalizes a string for comparison (trim, lowercase, collapse spaces).
 */
export function normalize(value: string | null | undefined): string {
	return value?.trim().toLowerCase() ?? "";
}

/**
 * Parses an enum value from a URL parameter, falling back to a default.
 */
export function parseEnum<T extends string>(
	value: string | null,
	allowed: readonly T[],
	fallback: T,
): T {
	return allowed.includes(value as T) ? (value as T) : fallback;
}

/**
 * Splits a comma-separated string into an array of non-empty trimmed strings.
 */
export function readCsv(value: string | null): string[] {
	if (!value) return [];
	return value
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);
}

/**
 * Returns the latest transaction date from an array of transactions.
 */
export function getLatestTransactionDate(
	transactions: Transaction[],
): Date | null {
	let latest: Date | null = null;
	for (const transaction of transactions) {
		const date = parseUtcDate(transaction.date);
		if (date && (!latest || date > latest)) {
			latest = date;
		}
	}
	return latest;
}

/**
 * Returns a short label for a date period (e.g., "Q1", "Jan", "2025").
 */
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
 * Builds an array of chart periods with aggregated amounts from transactions.
 */
export function buildMerchantChartPeriods(
	transactions: Transaction[],
	selectedDate: Date,
	timeframe: CashFlowTimeframe,
): MerchantChartPeriod[] {
	const periodCount = timeframe === "year" ? 7 : 9;
	const latestTransactionDate = getLatestTransactionDate(transactions);
	const latestStart = startOfPeriod(
		latestTransactionDate ?? selectedDate,
		timeframe,
	);
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
	for (const transaction of transactions) {
		const date = parseUtcDate(transaction.date);
		if (!date) continue;
		const key = toDateParam(startOfPeriod(date, timeframe));
		const amount = Math.abs(Number(transaction.amount) || 0);
		amountByKey.set(key, (amountByKey.get(key) ?? 0) + amount);
	}

	const periods: MerchantChartPeriod[] = [];
	for (let index = 0; index < periodCount; index += 1) {
		const start = shiftPeriod(chartEnd, timeframe, index - periodCount + 1);
		const key = toDateParam(start);
		const previous = periods[periods.length - 1];
		const year = start.getUTCFullYear();
		periods.push({
			key,
			label: formatPeriodTitle(start, timeframe),
			shortLabel: getPeriodShortLabel(start, timeframe),
			start,
			end: endOfPeriod(start, timeframe),
			amount: amountByKey.get(key) ?? 0,
			year,
			showYearMarker: !previous || previous.year !== year,
		});
	}
	return periods;
}

/**
 * Checks if a transaction belongs to a given merchant (by ID or normalized name).
 */
export function transactionMatchesMerchant(
	transaction: Transaction,
	merchantId: string,
	merchantName: string,
): boolean {
	// Use the merchant_id field if available
	if (transaction.merchant_id === merchantId) return true;
	// Fallback to normalized name comparison
	return (
		normalizeMerchantName(transaction.merchant) ===
		normalizeMerchantName(merchantName)
	);
}

/**
 * Updates the recurring merchant state in the global store.
 */
export function setMerchantRecurringState(
	oldName: string,
	nextName: string,
	enabled: boolean,
): void {
	useBudgetStore.setState((state) => {
		const oldKey = normalizeMerchantName(oldName);
		const nextKey = normalizeMerchantName(nextName);
		const remaining = state.confirmedRecurringMerchants.filter((name) => {
			const key = normalizeMerchantName(name);
			return key !== oldKey && key !== nextKey;
		});
		return {
			confirmedRecurringMerchants: enabled
				? [...remaining, nextName]
				: remaining,
		};
	});
}
