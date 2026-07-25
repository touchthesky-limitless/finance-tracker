import type { MerchantListItem } from "@/components/Merchants/types";
import type {
	AllRecurringGroupMode,
	RecurringCandidate,
	RecurringFilters,
	RecurringFrequency,
	RecurringOccurrence,
	RecurringRecord,
	RecurringSortState,
	RecurringType,
} from "@/components/Recurring/types";
import type {
	Account,
	CustomCategory,
	Transaction,
} from "@/store/useBudgetStore";

export const RECURRING_FREQUENCIES: ReadonlyArray<RecurringFrequency> = [
	"weekly",
	"every-2-weeks",
	"every-4-weeks",
	"twice-monthly-first-fifteenth",
	"twice-monthly-fifteenth-last",
	"monthly",
	"every-2-months",
	"every-3-months",
	"every-4-months",
	"every-6-months",
	"yearly",
];

const FREQUENCY_LABELS: Record<RecurringFrequency, string> = {
	"weekly": "Every week",
	"every-2-weeks": "Every 2 weeks",
	"every-4-weeks": "Every 4 weeks",
	"twice-monthly-first-fifteenth": "Twice a month (1st & 15th)",
	"twice-monthly-fifteenth-last": "Twice a month (15th & last day)",
	"monthly": "Every month",
	"every-2-months": "Every 2 months",
	"every-3-months": "Every 3 months",
	"every-4-months": "Every 4 months",
	"every-6-months": "Every 6 months",
	"yearly": "Every year",
};

const TYPE_LABELS: Record<RecurringType, string> = {
	"income": "Income",
	"expense": "Expense",
	"credit-card": "Credit card",
};

export function normalize(value: string | null | undefined): string {
	return value?.trim().toLocaleLowerCase().replace(/\s+/g, " ") ?? "";
}

export function formatMonthTitle(month: Date): string {
	return new Intl.DateTimeFormat("en-US", {
		month: "long",
		year: "numeric",
		timeZone: "UTC",
	}).format(month);
}

export function formatLongDate(value: Date | string): string {
	const date = value instanceof Date ? value : parseDate(value);
	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
		timeZone: "UTC",
	}).format(date);
}

export function formatShortDate(value: Date | string): string {
	const date = value instanceof Date ? value : parseDate(value);
	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		timeZone: "UTC",
	}).format(date);
}

export function toDateInputValue(date: Date): string {
	return date.toISOString().slice(0, 10);
}

export function parseDate(value: string): Date {
	const timestamp = Date.parse(`${value.slice(0, 10)}T12:00:00.000Z`);
	return Number.isFinite(timestamp) ? new Date(timestamp) : new Date();
}

export function getFrequencyLabel(value: RecurringFrequency): string {
	return FREQUENCY_LABELS[value];
}

export function getTypeLabel(value: RecurringType): string {
	return TYPE_LABELS[value];
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
	if (filters.types.length > 0 && !filters.types.includes(record.type)) {
		return false;
	}
	if (
		filters.accountIds.length > 0 &&
		(!record.accountId || !filters.accountIds.includes(record.accountId))
	) {
		return false;
	}
	if (
		filters.categoryIds.length > 0 &&
		(!record.categoryId || !filters.categoryIds.includes(record.categoryId))
	) {
		return false;
	}
	if (
		filters.frequencies.length > 0 &&
		!filters.frequencies.includes(record.frequency)
	) {
		return false;
	}
	return true;
}

function median(values: number[]): number {
	if (values.length === 0) {
		return 30;
	}
	const sorted = [...values].sort((a, b) => a - b);
	const middle = Math.floor(sorted.length / 2);
	return sorted.length % 2 === 0
		? (sorted[middle - 1] + sorted[middle]) / 2
		: sorted[middle];
}

export function inferFrequency(
	transactions: Transaction[],
): RecurringFrequency {
	const dates = transactions
		.map((transaction) => parseDate(transaction.date).getTime())
		.sort((a, b) => a - b);
	const gaps: number[] = [];
	for (let index = 1; index < dates.length; index += 1) {
		gaps.push(Math.round((dates[index] - dates[index - 1]) / 86_400_000));
	}
	const gap = median(gaps);
	if (gap <= 10) return "weekly";
	if (gap <= 20) return "every-2-weeks";
	if (gap <= 35) return "monthly";
	if (gap <= 75) return "every-2-months";
	if (gap <= 110) return "every-3-months";
	if (gap <= 150) return "every-4-months";
	if (gap <= 230) return "every-6-months";
	return "yearly";
}

function getCategoryByName(
	categories: CustomCategory[],
	name: string,
): CustomCategory | undefined {
	const key = normalize(name);
	return categories.find((category) => normalize(category.name) === key);
}

function getAccountByTransaction(
	accounts: Account[],
	transaction: Transaction | undefined,
): Account | undefined {
	if (!transaction) return undefined;
	return accounts.find((account) => {
		return transaction.account_id
			? account.id === transaction.account_id
			: normalize(account.name) === normalize(transaction.account);
	});
}

export function candidateFromMerchant(
	merchant: MerchantListItem,
	transactions: Transaction[],
	defaultType: RecurringType,
	accounts: Account[] = [],
	categories: CustomCategory[] = [],
): RecurringCandidate {
	const merchantTransactions = transactions
		.filter((transaction) => {
			return transaction.merchant_id
				? transaction.merchant_id === merchant.id
				: normalize(transaction.merchant) === normalize(merchant.name);
		})
		.sort((first, second) => second.date.localeCompare(first.date));
	const recent = merchantTransactions.slice(0, 12);
	const latest = recent[0];
	const amounts = recent.map((transaction) => Math.abs(transaction.amount));
	const averageAmount =
		amounts.reduce((sum, amount) => sum + amount, 0) /
		Math.max(1, amounts.length);
	const account = getAccountByTransaction(accounts, latest);
	const category = getCategoryByName(categories, latest?.category ?? "");

	return {
		key: `merchant:${merchant.id || normalize(merchant.name)}`,
		merchantId: merchant.id || null,
		merchantName: merchant.name,
		logoUrl: merchant.logoUrl ?? null,
		transactions: recent,
		suggestedAmount: Number(averageAmount.toFixed(2)),
		suggestedType: latest && latest.amount > 0 ? "income" : defaultType,
		suggestedFrequency: inferFrequency(recent),
		suggestedStartingDate:
			latest?.date.slice(0, 10) ?? toDateInputValue(new Date()),
		suggestedAccountId: account?.id ?? latest?.account_id ?? null,
		suggestedAccountName: account?.name ?? latest?.account ?? "",
		suggestedCategoryId: category?.id ?? null,
		suggestedCategoryName:
			category?.name ?? latest?.category ?? "Uncategorized",
	};
}

export function buildRecurringCandidates(
	transactions: Transaction[],
	merchantItems: MerchantListItem[],
	knownSourceKeys: ReadonlySet<string>,
	dismissedKeys: ReadonlySet<string>,
	accounts: Account[],
	categories: CustomCategory[],
): RecurringCandidate[] {
	const transactionsByMerchant = new Map<string, Transaction[]>();
	for (const transaction of transactions) {
		if (transaction.amount >= 0) continue;
		const key = transaction.merchant_id
			? `id:${transaction.merchant_id}`
			: `name:${normalize(transaction.merchant)}`;
		const list = transactionsByMerchant.get(key) ?? [];
		list.push(transaction);
		transactionsByMerchant.set(key, list);
	}

	const merchantById = new Map(
		merchantItems.map((merchant) => [merchant.id, merchant]),
	);
	const merchantByName = new Map(
		merchantItems.map((merchant) => [normalize(merchant.name), merchant]),
	);
	const candidates: RecurringCandidate[] = [];

	for (const group of transactionsByMerchant.values()) {
		if (group.length < 3) continue;
		const sorted = [...group].sort((a, b) => b.date.localeCompare(a.date));
		const recent = sorted.slice(0, 12);
		const amounts = recent.map((transaction) => Math.abs(transaction.amount));
		const min = Math.min(...amounts);
		const max = Math.max(...amounts);
		const stable = max - min <= Math.max(5, max * 0.2);
		if (!stable) continue;
		const latest = recent[0];
		const merchant = latest.merchant_id
			? merchantById.get(latest.merchant_id)
			: merchantByName.get(normalize(latest.merchant));
		const fallback: MerchantListItem = {
			id: latest.merchant_id ?? `legacy:${normalize(latest.merchant)}`,
			name: latest.merchant,
			logoUrl: null,
			transactionCount: group.length,
		};
		const candidate = candidateFromMerchant(
			merchant ?? fallback,
			transactions,
			"expense",
			accounts,
			categories,
		);
		if (
			knownSourceKeys.has(candidate.key) ||
			dismissedKeys.has(candidate.key)
		) {
			continue;
		}
		candidates.push(candidate);
	}

	return candidates
		.sort((first, second) => {
			return second.transactions.length - first.transactions.length;
		})
		.slice(0, 12);
}

interface LegacyPredictedBill {
	id: string;
	merchant: string;
	amount: number;
	category: string;
	dueDate: Date;
	dayOfMonth: number;
	frequency: string;
	type: string;
}

export function mergeLegacyPredictedBills(
	persistedRecords: RecurringRecord[],
	predictedBills: LegacyPredictedBill[],
	merchantItems: MerchantListItem[],
	transactions: Transaction[],
	accounts: Account[],
	categories: CustomCategory[],
	suppressedSourceKeys: ReadonlySet<string>,
): RecurringRecord[] {
	const recordBySourceKey = new Map(
		persistedRecords.map((record) => [record.sourceKey, record] as const),
	);
	const merchantByName = new Map(
		merchantItems.map((merchant) => [normalize(merchant.name), merchant]),
	);

	for (const bill of predictedBills) {
		const merchant = merchantByName.get(normalize(bill.merchant));
		const sourceKey = `merchant:${merchant?.id || normalize(bill.merchant)}`;
		if (
			recordBySourceKey.has(sourceKey) ||
			suppressedSourceKeys.has(sourceKey)
		) {
			continue;
		}
		const fallback: MerchantListItem = merchant ?? {
			id: `legacy:${normalize(bill.merchant)}`,
			name: bill.merchant,
			logoUrl: null,
			transactionCount: 0,
		};
		const candidate = candidateFromMerchant(
			fallback,
			transactions,
			"expense",
			accounts,
			categories,
		);
		const now = new Date().toISOString();
		recordBySourceKey.set(sourceKey, {
			id: `legacy:${sourceKey}`,
			sourceKey,
			merchantId: candidate.merchantId,
			merchantName: bill.merchant,
			logoUrl: candidate.logoUrl,
			amount: Number(Math.abs(bill.amount).toFixed(2)),
			type: "expense",
			frequency: normalize(bill.frequency) === "yearly" ? "yearly" : "monthly",
			startingDate: candidate.suggestedStartingDate,
			status: "active",
			accountId: candidate.suggestedAccountId,
			accountName: candidate.suggestedAccountName,
			categoryId:
				getCategoryByName(categories, bill.category)?.id ??
				candidate.suggestedCategoryId,
			categoryName: bill.category || candidate.suggestedCategoryName,
			createdAt: now,
			updatedAt: now,
		});
	}

	return [...recordBySourceKey.values()];
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

function findMatchingTransaction(
	record: RecurringRecord,
	date: Date,
	transactions: Transaction[],
): Transaction | null {
	const target = date.getTime();
	let best: Transaction | null = null;
	let bestDistance = Number.POSITIVE_INFINITY;
	for (const transaction of transactions) {
		const merchantMatches = record.merchantId
			? transaction.merchant_id === record.merchantId
			: normalize(transaction.merchant) === normalize(record.merchantName);
		if (!merchantMatches) continue;
		if (
			Math.abs(Math.abs(transaction.amount) - record.amount) >
			Math.max(0.02, record.amount * 0.08)
		)
			continue;
		const distance = Math.abs(parseDate(transaction.date).getTime() - target);
		if (distance <= 5 * 86_400_000 && distance < bestDistance) {
			best = transaction;
			bestDistance = distance;
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
		for (const date of datesForRecordInMonth(record, month)) {
			const matchingTransaction = findMatchingTransaction(
				record,
				date,
				transactions,
			);
			const status = matchingTransaction
				? "complete"
				: date.getTime() < today
					? "overdue"
					: "upcoming";
			occurrences.push({
				id: `${record.id}:${toDateInputValue(date)}`,
				record,
				date,
				status,
				matchedTransactionId: matchingTransaction?.id ?? null,
			});
		}
	}
	return occurrences.sort((a, b) => a.date.getTime() - b.date.getTime());
}

export function getNextOccurrenceDate(
	record: RecurringRecord,
	now = new Date(),
): Date {
	const startMonth = new Date(
		Date.UTC(now.getFullYear(), now.getMonth(), 1, 12),
	);
	for (let offset = 0; offset < 25; offset += 1) {
		const month = new Date(
			Date.UTC(
				startMonth.getUTCFullYear(),
				startMonth.getUTCMonth() + offset,
				1,
				12,
			),
		);
		const dates = datesForRecordInMonth(record, month).filter((date) => {
			return (
				date.getTime() >=
				Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 12)
			);
		});
		if (dates.length > 0) return dates[0];
	}
	return parseDate(record.startingDate);
}

export function formatRelativeDays(date: Date, now = new Date()): string {
	const target = Date.UTC(
		date.getUTCFullYear(),
		date.getUTCMonth(),
		date.getUTCDate(),
	);
	const current = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
	const days = Math.round((target - current) / 86_400_000);
	if (days === 0) return "today";
	if (days > 0) return `${days} ${days === 1 ? "day" : "days"}`;
	const absolute = Math.abs(days);
	return `${absolute} ${absolute === 1 ? "day" : "days"} ago`;
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

export function getRecordGroupLabel(
	record: RecurringRecord,
	mode: AllRecurringGroupMode,
): string {
	if (mode === "status")
		return record.status === "active" ? "Active" : "Canceled";
	if (mode === "category") return record.categoryName || "Uncategorized";
	return getFrequencyLabel(record.frequency);
}
