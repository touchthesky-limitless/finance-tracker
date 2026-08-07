// src/components/Recurring/utils/occurrenceUtils.ts
/**
 * Generates monthly occurrences and matches transactions.
 */
import type { Transaction } from "@/store/useBudgetStore";
import type {
	RecurringOccurrence,
	RecurringRecord,
	RecurringFrequency,
} from "../types/recurringTypes";
import { parseDate, toDateInputValue } from "./dateUtils";
import { normalize, median } from "./recurringUtils";

// Helper functions (originally in recurringUtils)
function monthDifference(start: Date, target: Date): number {
	return (
		(target.getUTCFullYear() - start.getUTCFullYear()) * 12 +
		target.getUTCMonth() -
		start.getUTCMonth()
	);
}

function clampDay(year: number, month: number, day: number): number {
	return Math.min(day, new Date(Date.UTC(year, month + 1, 0)).getUTCDate());
}

function monthlyDates(
	record: RecurringRecord,
	month: Date,
	intervalMonths: number,
): Date[] {
	const start = parseDate(record.startingDate);
	const difference = monthDifference(start, month);
	if (difference < 0 || difference % intervalMonths !== 0) return [];
	const day = clampDay(
		month.getUTCFullYear(),
		month.getUTCMonth(),
		start.getUTCDate(),
	);
	return [
		new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), day, 12)),
	];
}

function datesForRecordInMonth(record: RecurringRecord, month: Date): Date[] {
	const start = parseDate(record.startingDate);
	const year = month.getUTCFullYear();
	const monthIndex = month.getUTCMonth();
	const first = new Date(Date.UTC(year, monthIndex, 1, 12));
	const last = new Date(Date.UTC(year, monthIndex + 1, 0, 12));

	if (record.frequency === "twice-monthly-first-fifteenth") {
		return [1, 15]
			.map((day) => new Date(Date.UTC(year, monthIndex, day, 12)))
			.filter((date) => date >= start);
	}
	if (record.frequency === "twice-monthly-fifteenth-last") {
		return [
			new Date(Date.UTC(year, monthIndex, 15, 12)),
			new Date(Date.UTC(year, monthIndex + 1, 0, 12)),
		].filter((date) => date >= start);
	}
	if (record.frequency === "monthly") return monthlyDates(record, month, 1);
	if (record.frequency === "every-2-months")
		return monthlyDates(record, month, 2);
	if (record.frequency === "every-3-months")
		return monthlyDates(record, month, 3);
	if (record.frequency === "every-4-months")
		return monthlyDates(record, month, 4);
	if (record.frequency === "every-6-months")
		return monthlyDates(record, month, 6);
	if (record.frequency === "yearly") {
		if (monthIndex !== start.getUTCMonth() || year < start.getUTCFullYear())
			return [];
		return monthlyDates(record, month, 12);
	}

	const intervalDays =
		record.frequency === "weekly"
			? 7
			: record.frequency === "every-2-weeks"
				? 14
				: 28;
	const dates: Date[] = [];
	let cursor = new Date(start);
	if (cursor < first) {
		const elapsedDays = Math.floor(
			(first.getTime() - cursor.getTime()) / 86_400_000,
		);
		const jumps = Math.floor(elapsedDays / intervalDays);
		cursor = new Date(cursor.getTime() + jumps * intervalDays * 86_400_000);
		while (cursor < first)
			cursor = new Date(cursor.getTime() + intervalDays * 86_400_000);
	}
	while (cursor <= last) {
		dates.push(new Date(cursor));
		cursor = new Date(cursor.getTime() + intervalDays * 86_400_000);
	}
	return dates;
}

function canonicalizeMerchantName(value: string | null | undefined): string {
	// Same as in candidateUtils; we can reuse it by importing from there, but for simplicity we duplicate.
	const merchant = normalize(value)
		.replace(/[^a-z0-9&]+/g, " ")
		.replace(
			/\b(autopay|auto\s*pay|payment|pmt|bill\s*pay|recurring|online|mobile\s*app|debit|purchase|pos)\b/gi,
			" ",
		)
		.replace(/\b(?:store|location|loc)\s*#?\s*\d+\b/g, " ")
		.replace(/\b\d{5,}\b/g, " ")
		.replace(/\s+/g, " ")
		.trim();
	// ... same as above
	return merchant;
}

function transactionMatchesRecurringMerchant(
	record: RecurringRecord,
	transaction: Transaction,
): boolean {
	if (
		record.merchantId &&
		transaction.merchant_id &&
		record.merchantId === transaction.merchant_id
	) {
		return true;
	}
	const recordMerchantName = canonicalizeMerchantName(record.merchantName);
	const transactionMerchantName = canonicalizeMerchantName(
		transaction.merchant,
	);
	return Boolean(
		recordMerchantName &&
		transactionMerchantName &&
		recordMerchantName === transactionMerchantName,
	);
}

function getRecurringTransactionMatchScore(
	record: RecurringRecord,
	transaction: Transaction,
	expectedDate: Date,
): number {
	const transactionDate = parseDate(transaction.date);
	const dayDistance =
		Math.abs(transactionDate.getTime() - expectedDate.getTime()) / 86_400_000;
	const expectedAmount = Math.max(0.01, record.amount);
	const amountDistanceRatio =
		Math.abs(Math.abs(transaction.amount) - record.amount) / expectedAmount;
	return dayDistance + Math.min(7, amountDistanceRatio * 4);
}

function findMatchingTransaction(
	record: RecurringRecord,
	date: Date,
	transactions: Transaction[],
	excludedTransactionIds: ReadonlySet<string> = new Set(),
): Transaction | null {
	let best: Transaction | null = null;
	let bestScore = Number.POSITIVE_INFINITY;
	for (const transaction of transactions) {
		if (
			excludedTransactionIds.has(transaction.id) ||
			!transactionMatchesRecurringMerchant(record, transaction)
		) {
			continue;
		}
		const transactionDate = parseDate(transaction.date);
		const dayDistance =
			Math.abs(transactionDate.getTime() - date.getTime()) / 86_400_000;
		if (dayDistance > 10) continue;
		const matchScore = getRecurringTransactionMatchScore(
			record,
			transaction,
			date,
		);
		if (matchScore < bestScore) {
			best = transaction;
			bestScore = matchScore;
		}
	}
	return best;
}

function getBestMatchingTransactionForMonth(
	record: RecurringRecord,
	month: Date,
	transactions: Transaction[],
	excludedTransactionIds: ReadonlySet<string>,
): Transaction | null {
	const year = month.getUTCFullYear();
	const monthIndex = month.getUTCMonth();
	const expectedDay = parseDate(record.startingDate).getUTCDate();
	const expectedDate = new Date(
		Date.UTC(
			year,
			monthIndex,
			Math.min(
				expectedDay,
				new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate(),
			),
			12,
		),
	);
	let best: Transaction | null = null;
	let bestScore = Number.POSITIVE_INFINITY;
	for (const transaction of transactions) {
		if (
			excludedTransactionIds.has(transaction.id) ||
			!transactionMatchesRecurringMerchant(record, transaction)
		) {
			continue;
		}
		const transactionDate = parseDate(transaction.date);
		if (
			transactionDate.getUTCFullYear() !== year ||
			transactionDate.getUTCMonth() !== monthIndex
		)
			continue;
		const matchScore = getRecurringTransactionMatchScore(
			record,
			transaction,
			expectedDate,
		);
		if (matchScore < bestScore) {
			best = transaction;
			bestScore = matchScore;
		}
	}
	return best;
}

export function getOccurrencesForMonth(
	records: RecurringRecord[],
	month: Date,
	transactions: Transaction[],
	now = new Date(),
): RecurringOccurrence[] {
	const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 12);
	const occurrences: RecurringOccurrence[] = [];

	for (const record of records) {
		if (record.status !== "active") continue;

		const matchedTransactionIds = new Set<string>();
		for (const date of datesForRecordInMonth(record, month)) {
			const matchingTransaction = findMatchingTransaction(
				record,
				date,
				transactions,
				matchedTransactionIds,
			);
			if (matchingTransaction) {
				matchedTransactionIds.add(matchingTransaction.id);
			}
			const status = matchingTransaction
				? "complete"
				: date.getTime() < today
					? "overdue"
					: "upcoming";
			occurrences.push({
				id: `${record.id}:` + toDateInputValue(date),
				record,
				date,
				status,
				matchedTransactionId: matchingTransaction?.id ?? null,
			});
		}

		/*
		 * A confirmed recurring record may have been created from a
		 * future prediction. Its startingDate can therefore be after
		 * a real transaction that already occurred in the selected
		 * month.
		 *
		 * Add those unmatched real transactions as completed
		 * occurrences. This lets confirmed merchants appear under
		 * Monthly -> Complete without manufacturing an unsaved
		 * recurring record.
		 */
		const unmatchedMonthlyTransaction = getBestMatchingTransactionForMonth(
			record,
			month,
			transactions,
			matchedTransactionIds,
		);
		if (unmatchedMonthlyTransaction) {
			const transactionDate = parseDate(unmatchedMonthlyTransaction.date);
			matchedTransactionIds.add(unmatchedMonthlyTransaction.id);
			occurrences.push({
				id: `${record.id}:transaction:` + unmatchedMonthlyTransaction.id,
				record,
				date: transactionDate,
				status: "complete",
				matchedTransactionId: unmatchedMonthlyTransaction.id,
			});
		}
	}

	return occurrences.sort((first, second) => {
		return (
			first.date.getTime() - second.date.getTime() ||
			first.record.merchantName.localeCompare(
				second.record.merchantName,
				"en-US",
				{ sensitivity: "base" },
			)
		);
	});
}

export function getRepresentativeTransactionsByMonth(
	transactions: Transaction[],
): Transaction[] {
	if (transactions.length === 0) return [];
	const amounts = transactions.map((t) => Math.abs(t.amount));
	const typicalAmount = median(amounts);
	const byMonth = new Map<string, Transaction[]>();
	for (const t of transactions) {
		const monthKey = getTransactionMonthKey(t);
		const monthTransactions = byMonth.get(monthKey) ?? [];
		monthTransactions.push(t);
		byMonth.set(monthKey, monthTransactions);
	}
	const representatives: Transaction[] = [];
	for (const monthTransactions of byMonth.values()) {
		const representative = [...monthTransactions].sort((a, b) => {
			const aDist = Math.abs(Math.abs(a.amount) - typicalAmount);
			const bDist = Math.abs(Math.abs(b.amount) - typicalAmount);
			return aDist - bDist || b.date.localeCompare(a.date);
		})[0];
		if (representative) representatives.push(representative);
	}
	return representatives.sort((a, b) => a.date.localeCompare(b.date));
}

function getTransactionMonthKey(transaction: Transaction): string {
	const date = parseDate(transaction.date);
	return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function inferFrequency(
	transactions: Transaction[],
): RecurringFrequency {
	const monthlyRepresentatives =
		getRepresentativeTransactionsByMonth(transactions);
	const frequencyTransactions =
		monthlyRepresentatives.length >= 2 ? monthlyRepresentatives : transactions;
	const dates = frequencyTransactions
		.map((t) => parseDate(t.date).getTime())
		.sort((a, b) => a - b);
	const gaps: number[] = [];
	for (let i = 1; i < dates.length; i++) {
		gaps.push(Math.round((dates[i] - dates[i - 1]) / 86_400_000));
	}
	const gap = median(gaps);
	if (gap <= 10) return "weekly";
	if (gap <= 20) return "every-2-weeks";
	if (gap <= 45) return "monthly";
	if (gap <= 75) return "every-2-months";
	if (gap <= 110) return "every-3-months";
	if (gap <= 150) return "every-4-months";
	if (gap <= 230) return "every-6-months";
	return "yearly";
}

export function getNextOccurrenceDate(
	record: RecurringRecord,
	now = new Date(),
): Date {
	const startMonth = new Date(
		Date.UTC(now.getFullYear(), now.getMonth(), 1, 12),
	);
	for (let offset = 0; offset < 25; offset++) {
		const month = new Date(
			Date.UTC(
				startMonth.getUTCFullYear(),
				startMonth.getUTCMonth() + offset,
				1,
				12,
			),
		);
		const dates = datesForRecordInMonth(record, month).filter(
			(date) =>
				date.getTime() >=
				Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 12),
		);
		if (dates.length > 0) return dates[0];
	}
	return parseDate(record.startingDate);
}
