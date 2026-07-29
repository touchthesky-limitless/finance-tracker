import { useMemo } from "react";
import { useBudgetStore } from "@/store/useBudgetStore";
import { getDateCutoff } from "@/components/Accounts/utils/date";
import type {
	ChartPoint,
	DateRange,
	Timeframe,
} from "@/components/Accounts/types";

interface UseNetWorthHistoryOptions {
	dateRange: DateRange;
	timeframe: Timeframe;
	currentNetWorth: number; // Pass the current net worth explicitly
	accountIds?: string[];
}

export function useNetWorthHistory({
	dateRange,
	timeframe,
	currentNetWorth,
	accountIds,
}: UseNetWorthHistoryOptions) {
	const transactions = useBudgetStore((state) => state.transactions);

	const points = useMemo<ChartPoint[]>(() => {
		const cutoff = getDateCutoff(dateRange) as Date;
		const selectedIds =
			accountIds && accountIds.length > 0 ? new Set(accountIds) : null;

		// Filter and sort transactions
		const sorted = [...transactions]
			.filter((tx) => {
				if (selectedIds) {
					const id = tx.account_id?.trim() || tx.account;
					if (!selectedIds.has(id)) return false;
				}
				const date = new Date(tx.date);
				return date >= cutoff;
			})
			.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

		// Aggregate daily net changes
		const daily = new Map<string, number>();
		for (const tx of sorted) {
			const date = new Date(tx.date);
			const key = date.toISOString().slice(0, 10);
			daily.set(key, (daily.get(key) || 0) + (tx.amount || 0));
		}

		// Calculate total change over the period
		let totalChange = 0;
		for (const val of daily.values()) {
			totalChange += val;
		}

		// Start with current net worth, and go backward
		let running = currentNetWorth - totalChange;
		const points: ChartPoint[] = [];
		const dates = Array.from(daily.keys()).sort();

		for (const key of dates) {
			running += daily.get(key) || 0;
			const date = new Date(`${key}T12:00:00`);
			points.push({
				date,
				value: running,
				label:
					timeframe === "year"
						? String(date.getFullYear())
						: date.toLocaleDateString("en-US", {
								month: "short",
								day: "numeric",
							}),
			});
		}

		// Fallback if no transactions exist in the range
		if (points.length === 0) {
			const now = new Date();
			points.push({
				date: now,
				value: currentNetWorth,
				label: now.toLocaleDateString("en-US", {
					month: "short",
					day: "numeric",
				}),
			});
		}

		return points;
	}, [transactions, currentNetWorth, dateRange, timeframe, accountIds]);

	return { points };
}
