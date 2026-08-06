/**
 * Utility functions shared across dashboard components.
 * Includes date‑range helpers, average calculations, and array equality.
 */
import { Transaction } from "@/store/useBudgetStore";

export type SpendingPeriod =
	| "week"
	| "month"
	| "month_last_year"
	| "month_average"
	| "year";

export function getDateRangesForPeriod(period: SpendingPeriod): {
	currentStart: Date;
	currentEnd: Date;
	previousStart: Date;
	previousEnd: Date;
} {
	const now = new Date();
	let currentStart: Date, previousStart: Date, previousEnd: Date;

	if (period === "week") {
		const dayOfWeek = now.getDay();
		const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
		currentStart = new Date(now);
		currentStart.setDate(now.getDate() - diff);
		currentStart.setHours(0, 0, 0, 0);

		previousStart = new Date(currentStart);
		previousStart.setDate(currentStart.getDate() - 7);
		previousEnd = new Date(currentStart);
		previousEnd.setDate(currentStart.getDate() - 1);
		previousEnd.setHours(23, 59, 59, 999);
	} else if (
		period === "month" ||
		period === "month_last_year" ||
		period === "month_average"
	) {
		currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
		if (period === "month_last_year") {
			previousStart = new Date(now.getFullYear() - 1, now.getMonth(), 1);
			previousEnd = new Date(now.getFullYear() - 1, now.getMonth() + 1, 0);
		} else {
			previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
			previousEnd = new Date(now.getFullYear(), now.getMonth(), 0);
		}
	} else {
		currentStart = new Date(now.getFullYear(), 0, 1);
		previousStart = new Date(now.getFullYear() - 1, 0, 1);
		previousEnd = new Date(now.getFullYear() - 1, 11, 31);
	}

	return {
		currentStart,
		currentEnd: now,
		previousStart,
		previousEnd,
	};
}

export function computeAverageMonthData(
	transactions: Transaction[],
): Map<number, number> {
	const now = new Date();
	const averages = new Map<number, { total: number; count: number }>();

	for (let i = 1; i <= 12; i++) {
		const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
		const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

		const monthTxs = transactions.filter((tx) => {
			const d = new Date(tx.date);
			return d >= monthStart && d <= monthEnd && tx.amount < 0;
		});

		const dailyCumulative = new Map<number, number>();
		let cumulative = 0;
		const sorted = monthTxs.sort(
			(a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
		);
		for (const tx of sorted) {
			const day = new Date(tx.date).getDate();
			cumulative += Math.abs(tx.amount);
			dailyCumulative.set(day, cumulative);
		}

		const daysInMonth = monthEnd.getDate();
		for (let day = 1; day <= daysInMonth; day++) {
			const val = dailyCumulative.get(day) || 0;
			const entry = averages.get(day) || { total: 0, count: 0 };
			entry.total += val;
			entry.count += 1;
			averages.set(day, entry);
		}
	}

	const result = new Map<number, number>();
	for (const [day, entry] of averages) {
		result.set(day, entry.total / entry.count);
	}
	return result;
}

export function arraysEqual<T>(a: T[], b: T[]): boolean {
	return a.length === b.length && a.every((v, i) => v === b[i]);
}
