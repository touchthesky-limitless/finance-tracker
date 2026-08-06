/**
 * Utility functions and constants shared across the Category Group Details page.
 * Includes normalization, enum parsing, CSV reading, date handling, and period building.
 */

import {
	parseUtcDate,
	startOfPeriod,
	endOfPeriod,
	shiftPeriod,
	toDateParam,
	formatPeriodTitle,
} from "@/components/CashFlow/cashFlowUtils";
import type { CashFlowTimeframe } from "@/components/CashFlow/types";
import type { Transaction } from "@/store/useBudgetStore";
import { findParentCategory } from "@/constants";
import type { GroupChartPeriod } from "@/components/CategoryGroups";

export const DEFAULT_SORTING = [{ id: "date", desc: true }];
export const HIDDEN_MODES = ["visible", "hidden", "all"] as const;
export const GROUP_TABLE_COLUMNS = [
	{ id: "merchant", label: "Merchant" },
	{ id: "category", label: "Category" },
	{ id: "account", label: "Account" },
	{ id: "amount", label: "Amount" },
] as const;

export function normalize(value: string | null | undefined): string {
	return value?.trim().toLowerCase() ?? "";
}

export function parseEnum<T extends string>(
	value: string | null,
	allowed: readonly T[],
	fallback: T,
): T {
	return allowed.includes(value as T) ? (value as T) : fallback;
}

export function readCsv(value: string | null): string[] {
	if (!value) return [];
	return value
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);
}

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

export function getGroupPeriodShortLabel(
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

export function buildGroupChartPeriods(
	transactions: Transaction[],
	selectedDate: Date,
	timeframe: CashFlowTimeframe,
): GroupChartPeriod[] {
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

	const periods: GroupChartPeriod[] = [];
	for (let index = 0; index < periodCount; index += 1) {
		const start = shiftPeriod(chartEnd, timeframe, index - periodCount + 1);
		const key = toDateParam(start);
		const previous = periods[periods.length - 1];
		const year = start.getUTCFullYear();
		periods.push({
			key,
			label: formatPeriodTitle(start, timeframe),
			shortLabel: getGroupPeriodShortLabel(start, timeframe),
			start,
			end: endOfPeriod(start, timeframe),
			amount: amountByKey.get(key) ?? 0,
			year,
			showYearMarker: !previous || previous.year !== year,
		});
	}
	return periods;
}

export function transactionMatchesGroup(
	transaction: Transaction,
	groupName: string,
	childCategoryNames: ReadonlySet<string>,
): boolean {
	const categoryName = normalize(transaction.category);
	if (!categoryName) return false;
	if (childCategoryNames.has(categoryName)) return true;
	if (categoryName === normalize(groupName)) return true;
	return (
		normalize(findParentCategory(transaction.category)) === normalize(groupName)
	);
}
