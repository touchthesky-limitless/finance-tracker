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

	if (range === "1M") {
		return new Date(now.getFullYear(), now.getMonth(), 1);
	}
	if (range === "3M") cutoff.setMonth(cutoff.getMonth() - 3);
	if (range === "6M") cutoff.setMonth(cutoff.getMonth() - 6);
	if (range === "1Y") cutoff.setFullYear(cutoff.getFullYear() - 1);
	console.log("Cutoff date for:", cutoff);
	return cutoff;
}

export function normalizeDateRange(value: string | null): DateRange {
	return DATE_RANGE_OPTIONS.some(
		(option: { value: string }) => option.value === value,
	)
		? (value as DateRange)
		: DEFAULT_QUERY.dateRange;
}

// ✅ FIXED: Returns "performance" or "breakdown" to match the component
export function normalizeChartType(value: string | null): ChartType {
	return value === "breakdown" ? "breakdown" : "performance";
}

// ✅ FIXED: Handles "quarter" correctly
export function normalizeTimeframe(value: string | null): Timeframe {
	if (value === "year") return "year";
	if (value === "quarter") return "quarter";
	return "month";
}
