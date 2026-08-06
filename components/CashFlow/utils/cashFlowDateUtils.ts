/**
 * cashFlowDateUtils – Date/period handling for cash flow periods.
 * Includes parsing, boundaries, shifting, formatting, and building period arrays.
 */
import type {
	CashFlowFilters,
	CashFlowPeriod,
	CashFlowTimeframe,
} from "../types";
import type { Transaction } from "@/store/useBudgetStore";
import { transactionMatchesCashFlowFilters } from "./cashFlowFilterUtils";

export function parseUtcDate(value: string | null | undefined): Date | null {
	if (!value) return null;
	const clean = value.slice(0, 10);
	const date = new Date(`${clean}T00:00:00.000Z`);
	return Number.isNaN(date.getTime()) ? null : date;
}

export function toDateParam(date: Date): string {
	return date.toISOString().slice(0, 10);
}

export function startOfPeriod(date: Date, timeframe: CashFlowTimeframe): Date {
	const year = date.getUTCFullYear();
	const month = date.getUTCMonth();
	if (timeframe === "year") return new Date(Date.UTC(year, 0, 1));
	if (timeframe === "quarter")
		return new Date(Date.UTC(year, Math.floor(month / 3) * 3, 1));
	return new Date(Date.UTC(year, month, 1));
}

export function endOfPeriod(date: Date, timeframe: CashFlowTimeframe): Date {
	const start = startOfPeriod(date, timeframe);
	if (timeframe === "year")
		return new Date(
			Date.UTC(start.getUTCFullYear() + 1, 0, 0, 23, 59, 59, 999),
		);
	if (timeframe === "quarter")
		return new Date(
			Date.UTC(
				start.getUTCFullYear(),
				start.getUTCMonth() + 3,
				0,
				23,
				59,
				59,
				999,
			),
		);
	return new Date(
		Date.UTC(
			start.getUTCFullYear(),
			start.getUTCMonth() + 1,
			0,
			23,
			59,
			59,
			999,
		),
	);
}

export function shiftPeriod(
	date: Date,
	timeframe: CashFlowTimeframe,
	offset: number,
): Date {
	const start = startOfPeriod(date, timeframe);
	if (timeframe === "year")
		return new Date(Date.UTC(start.getUTCFullYear() + offset, 0, 1));
	if (timeframe === "quarter")
		return new Date(
			Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + offset * 3, 1),
		);
	return new Date(
		Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + offset, 1),
	);
}

export function formatPeriodTitle(
	date: Date,
	timeframe: CashFlowTimeframe,
): string {
	const start = startOfPeriod(date, timeframe);
	if (timeframe === "year") return String(start.getUTCFullYear());
	if (timeframe === "quarter") {
		const end = endOfPeriod(start, timeframe);
		const first = new Intl.DateTimeFormat("en-US", {
			month: "long",
			timeZone: "UTC",
		}).format(start);
		const last = new Intl.DateTimeFormat("en-US", {
			month: "long",
			timeZone: "UTC",
		}).format(end);
		return `${first} – ${last} ${start.getUTCFullYear()}`;
	}
	return new Intl.DateTimeFormat("en-US", {
		month: "long",
		year: "numeric",
		timeZone: "UTC",
	}).format(start);
}

function getPeriodLabels(
	date: Date,
	timeframe: CashFlowTimeframe,
): { label: string; shortLabel: string } {
	if (timeframe === "year") {
		const year = String(date.getUTCFullYear());
		return { label: year, shortLabel: year };
	}
	if (timeframe === "quarter") {
		const q = Math.floor(date.getUTCMonth() / 3) + 1;
		const first = new Intl.DateTimeFormat("en-US", {
			month: "long",
			timeZone: "UTC",
		}).format(date);
		const last = new Intl.DateTimeFormat("en-US", {
			month: "long",
			timeZone: "UTC",
		}).format(endOfPeriod(date, timeframe));
		return {
			label: `${first} – ${last} ${date.getUTCFullYear()}`,
			shortLabel: `Q${q}`,
		};
	}
	return {
		label: new Intl.DateTimeFormat("en-US", {
			month: "long",
			year: "numeric",
			timeZone: "UTC",
		}).format(date),
		shortLabel: new Intl.DateTimeFormat("en-US", {
			month: "short",
			timeZone: "UTC",
		}).format(date),
	};
}

export function buildCashFlowPeriods(
	transactions: Transaction[],
	anchorDate: Date,
	timeframe: CashFlowTimeframe,
	filters: CashFlowFilters,
): CashFlowPeriod[] {
	const startOffset = timeframe === "year" ? -2 : -5;
	const endOffset = timeframe === "year" ? 0 : 3;
	const now = new Date();
	const periods: CashFlowPeriod[] = [];

	for (let offset = startOffset; offset <= endOffset; offset++) {
		const start = startOfPeriod(
			shiftPeriod(anchorDate, timeframe, offset),
			timeframe,
		);
		const end = endOfPeriod(start, timeframe);
		let income = 0,
			expenses = 0;

		for (const tx of transactions) {
			if (!transactionMatchesCashFlowFilters(tx, filters)) continue;
			const txDate = parseUtcDate(tx.date);
			if (!txDate || txDate < start || txDate > end) continue;
			const amount = Number(tx.amount) || 0;
			if (amount > 0) income += amount;
			if (amount < 0) expenses += Math.abs(amount);
		}

		const savings = income - expenses;
		const labels = getPeriodLabels(start, timeframe);
		periods.push({
			key: toDateParam(start),
			label: labels.label,
			shortLabel: labels.shortLabel,
			start,
			end,
			income,
			expenses,
			savings,
			savingsRate: income > 0 ? Math.max(0, (savings / income) * 100) : 0,
			forecast: start.getTime() > now.getTime(),
		});
	}
	return periods;
}

export function getSelectedPeriod(
	periods: CashFlowPeriod[],
	date: Date,
): CashFlowPeriod {
	const ts = date.getTime();
	const match = periods.find(
		(p) => ts >= p.start.getTime() && ts <= p.end.getTime(),
	);
	if (match) return match;
	const fallback = periods[Math.floor(periods.length / 2)] ?? periods[0];
	if (!fallback) throw new Error("Cash flow periods cannot be empty.");
	return fallback;
}

export function daysBetween(first: Date, second: Date): number {
	const DAY_MS = 86_400_000;
	return Math.round((second.getTime() - first.getTime()) / DAY_MS);
}
