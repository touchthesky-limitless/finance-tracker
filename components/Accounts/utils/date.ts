import {
	DATE_RANGE_OPTIONS,
	DEFAULT_QUERY,
} from "@/components/Accounts/constants";
import type {
	ChartType,
	DateRange,
	Timeframe,
} from "@/components/Accounts/types";

export function getDateCutoff(range: DateRange): Date | null {
	const now = new Date();

	if (range === "ALL") {
		return null;
	}

	if (range === "YTD") {
		return new Date(now.getFullYear(), 0, 1);
	}

	const cutoff = new Date(now);

	if (range === "1M") cutoff.setMonth(cutoff.getMonth() - 1);
	if (range === "3M") cutoff.setMonth(cutoff.getMonth() - 3);
	if (range === "6M") cutoff.setMonth(cutoff.getMonth() - 6);
	if (range === "1Y") cutoff.setFullYear(cutoff.getFullYear() - 1);

	return cutoff;
}

export function normalizeDateRange(value: string | null): DateRange {
	return DATE_RANGE_OPTIONS.some((option) => option.value === value)
		? (value as DateRange)
		: DEFAULT_QUERY.dateRange;
}

export function normalizeChartType(value: string | null): ChartType {
	return value === "breakdown" ? "breakdown" : "performance";
}

export function normalizeTimeframe(value: string | null): Timeframe {
	return value === "year" ? "year" : "month";
}
