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
	const monthlyRepresentatives =
		getRepresentativeTransactionsByMonth(transactions);
	const frequencyTransactions =
		monthlyRepresentatives.length >= 2 ? monthlyRepresentatives : transactions;
	const dates = frequencyTransactions
		.map((transaction) => {
			return parseDate(transaction.date).getTime();
		})
		.sort((first, second) => {
			return first - second;
		});
	const gaps: number[] = [];

	for (let index = 1; index < dates.length; index += 1) {
		gaps.push(Math.round((dates[index] - dates[index - 1]) / 86_400_000));
	}

	const gap = median(gaps);

	if (gap <= 10) {
		return "weekly";
	}

	if (gap <= 20) {
		return "every-2-weeks";
	}

	if (gap <= 45) {
		return "monthly";
	}

	if (gap <= 75) {
		return "every-2-months";
	}

	if (gap <= 110) {
		return "every-3-months";
	}

	if (gap <= 150) {
		return "every-4-months";
	}

	if (gap <= 230) {
		return "every-6-months";
	}

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

const VARIABLE_DINING_CATEGORY_PATTERN =
	/\b(restaurants?|dining|fast\s*food|food\s*(?:&|and)\s*dining|caf(?:e|é)s?|coffee|bars?|pubs?|takeout|food\s*delivery)\b/i;

const VARIABLE_SPEND_CATEGORY_PATTERN =
	/\b(groceries|grocery|gas|fuel|shopping|clothing|electronics|general\s*merchandise|home\s*improvement)\b/i;

const FIXED_OBLIGATION_CATEGORY_PATTERN =
	/\b(bills?|utilities?|phone|mobile|wireless|internet|telecom|cellular|insurance|rent|mortgage|loan|subscription|membership|fitness|gym|software|streaming|cloud|hosting|storage)\b/i;

const STRONG_RECURRING_MERCHANT_PATTERN =
	/\b(t[\s-]*mobile|verizon|at[\s&-]*t|spectrum|xfinity|comcast|netflix|spotify|hulu|disney\s*plus|youtube\s*(?:premium|tv)|adobe|dropbox|icloud|openai|anthropic|planet\s*fitness|la\s*fitness)\b/i;

const RECURRING_DESCRIPTOR_PATTERN =
	/\b(subscription|membership|member|monthly|annual|autopay|auto\s*pay|fitness|gym|insurance|utilities?|internet|wireless|mobile|phone|telecom|cellular|rent|mortgage|loan|streaming|software|cloud|storage|hosting)\b/i;

const GENERIC_PAYMENT_PATTERN =
	/\b(payment|transfer|pmt|deposit|withdrawal|cash\s*advance)\b/i;

const MERCHANT_NOISE_PATTERN =
	/\b(autopay|auto\s*pay|payment|pmt|bill\s*pay|recurring|online|mobile\s*app|debit|purchase|pos)\b/gi;

const COMMON_RECURRING_INTERVALS: ReadonlyArray<{
	days: number;
	frequency: RecurringFrequency;
}> = [
	{
		days: 7,
		frequency: "weekly",
	},
	{
		days: 14,
		frequency: "every-2-weeks",
	},
	{
		days: 28,
		frequency: "every-4-weeks",
	},
	{
		days: 30,
		frequency: "monthly",
	},
	{
		days: 31,
		frequency: "monthly",
	},
	{
		days: 60,
		frequency: "every-2-months",
	},
	{
		days: 90,
		frequency: "every-3-months",
	},
	{
		days: 120,
		frequency: "every-4-months",
	},
	{
		days: 180,
		frequency: "every-6-months",
	},
	{
		days: 365,
		frequency: "yearly",
	},
];

interface RecurringDetectionEvaluation {
	confidence: number;
	eligibleForReview: boolean;
	isStrongObligation: boolean;
	cadenceScore: number;
	monthCoverageScore: number;
	amountConsistencyScore: number;
	activeMonthCount: number;
	representativeTransactions: Transaction[];
}

function clampScore(value: number): number {
	return Math.max(0, Math.min(1, value));
}

function normalizeCategoryText(value: string | null | undefined): string {
	return normalize(value).replace(/[_/|:>-]+/g, " ");
}

function canonicalizeMerchantName(value: string | null | undefined): string {
	const merchant = normalize(value)
		.replace(/[^a-z0-9&]+/g, " ")
		.replace(MERCHANT_NOISE_PATTERN, " ")
		.replace(/\b(?:store|location|loc)\s*#?\s*\d+\b/g, " ")
		.replace(/\b\d{5,}\b/g, " ")
		.replace(/\s+/g, " ")
		.trim();

	if (/\bt\s*mobile\b/.test(merchant)) {
		return "t-mobile";
	}

	if (/\bat\s*&?\s*t\b/.test(merchant)) {
		return "at&t";
	}

	if (/\bverizon\b/.test(merchant)) {
		return "verizon";
	}

	if (/\bxfinity\b|\bcomcast\b/.test(merchant)) {
		return "xfinity";
	}

	if (/\bspectrum\b/.test(merchant)) {
		return "spectrum";
	}

	if (/\bla\s*fitness\b/.test(merchant)) {
		return "la fitness";
	}

	if (/\bin\s*n\s*out\b/.test(merchant)) {
		return "in n out";
	}

	return merchant;
}

function isDiningCategory(value: string | null | undefined): boolean {
	return VARIABLE_DINING_CATEGORY_PATTERN.test(normalizeCategoryText(value));
}

function isVariableSpendCategory(value: string | null | undefined): boolean {
	return VARIABLE_SPEND_CATEGORY_PATTERN.test(normalizeCategoryText(value));
}

function hasStrongRecurringSignal(
	merchantName: string,
	categoryName: string | null | undefined,
): boolean {
	const normalizedCategory = normalizeCategoryText(categoryName);

	return (
		STRONG_RECURRING_MERCHANT_PATTERN.test(merchantName) ||
		RECURRING_DESCRIPTOR_PATTERN.test(merchantName) ||
		FIXED_OBLIGATION_CATEGORY_PATTERN.test(normalizedCategory)
	);
}

function getMonthSerial(date: Date): number {
	return date.getUTCFullYear() * 12 + date.getUTCMonth();
}

function getTransactionMonthKey(transaction: Transaction): string {
	const date = parseDate(transaction.date);

	return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(
		2,
		"0",
	)}`;
}

function getRepresentativeTransactionsByMonth(
	transactions: Transaction[],
): Transaction[] {
	if (transactions.length === 0) {
		return [];
	}

	const amounts = transactions.map((transaction) => {
		return Math.abs(transaction.amount);
	});
	const typicalAmount = median(amounts);
	const transactionsByMonth = new Map<string, Transaction[]>();

	for (const transaction of transactions) {
		const monthKey = getTransactionMonthKey(transaction);
		const monthTransactions = transactionsByMonth.get(monthKey) ?? [];

		monthTransactions.push(transaction);
		transactionsByMonth.set(monthKey, monthTransactions);
	}

	const representatives: Transaction[] = [];

	for (const monthTransactions of transactionsByMonth.values()) {
		const representative = [...monthTransactions].sort((first, second) => {
			const firstAmountDistance = Math.abs(
				Math.abs(first.amount) - typicalAmount,
			);
			const secondAmountDistance = Math.abs(
				Math.abs(second.amount) - typicalAmount,
			);

			return (
				firstAmountDistance - secondAmountDistance ||
				second.date.localeCompare(first.date)
			);
		})[0];

		if (representative) {
			representatives.push(representative);
		}
	}

	return representatives.sort((first, second) => {
		return first.date.localeCompare(second.date);
	});
}

function getDayGaps(transactions: Transaction[]): number[] {
	const timestamps = transactions
		.map((transaction) => {
			return parseDate(transaction.date).getTime();
		})
		.sort((first, second) => {
			return first - second;
		});
	const gaps: number[] = [];

	for (let index = 1; index < timestamps.length; index += 1) {
		const gap = Math.round(
			(timestamps[index] - timestamps[index - 1]) / 86_400_000,
		);

		if (gap > 0) {
			gaps.push(gap);
		}
	}

	return gaps;
}

function getIntervalTolerance(intervalDays: number): number {
	if (intervalDays <= 14) {
		return 3;
	}

	if (intervalDays <= 31) {
		return 7;
	}

	return Math.max(9, Math.round(intervalDays * 0.16));
}

function getCadenceScore(transactions: Transaction[]): number {
	const gaps = getDayGaps(transactions);

	if (gaps.length === 0) {
		return 0;
	}

	let bestScore = 0;

	for (const interval of COMMON_RECURRING_INTERVALS) {
		let totalFit = 0;

		for (const gap of gaps) {
			const multiple = Math.max(
				1,
				Math.min(4, Math.round(gap / interval.days)),
			);
			const expectedGap = interval.days * multiple;
			const distance = Math.abs(gap - expectedGap);
			const tolerance = getIntervalTolerance(interval.days);

			totalFit += clampScore(1 - distance / (tolerance * 2));
		}

		bestScore = Math.max(bestScore, totalFit / gaps.length);
	}

	return bestScore;
}

function getMonthCoverageScore(transactions: Transaction[]): {
	activeMonthCount: number;
	coverageScore: number;
} {
	if (transactions.length === 0) {
		return {
			activeMonthCount: 0,
			coverageScore: 0,
		};
	}

	const monthSerials = [
		...new Set(
			transactions.map((transaction) => {
				return getMonthSerial(parseDate(transaction.date));
			}),
		),
	].sort((first, second) => {
		return first - second;
	});
	const firstMonth = monthSerials[0];
	const lastMonth = monthSerials[monthSerials.length - 1];
	const monthSpan = Math.max(1, lastMonth - firstMonth + 1);

	return {
		activeMonthCount: monthSerials.length,
		coverageScore: monthSerials.length / monthSpan,
	};
}

function getDayOfMonthConsistencyScore(transactions: Transaction[]): number {
	if (transactions.length < 2) {
		return 0;
	}

	const days = transactions.map((transaction) => {
		return parseDate(transaction.date).getUTCDate();
	});
	const typicalDay = median(days);
	let consistentCount = 0;

	for (const day of days) {
		if (Math.abs(day - typicalDay) <= 7) {
			consistentCount += 1;
		}
	}

	return consistentCount / days.length;
}

function getAmountConsistencyScore(transactions: Transaction[]): number {
	if (transactions.length < 2) {
		return 0;
	}

	const amounts = transactions.map((transaction) => {
		return Math.abs(transaction.amount);
	});
	const typicalAmount = median(amounts);

	if (typicalAmount <= 0) {
		return 0;
	}

	const deviations = amounts.map((amount) => {
		return Math.abs(amount - typicalAmount);
	});
	const medianDeviation = median(deviations);
	const deviationRatio = medianDeviation / typicalAmount;

	return clampScore(1 - deviationRatio / 0.5);
}

function getMonthlyDensityScore(
	transactions: Transaction[],
	activeMonthCount: number,
): number {
	if (activeMonthCount === 0) {
		return 0;
	}

	const transactionsPerActiveMonth = transactions.length / activeMonthCount;

	if (transactionsPerActiveMonth <= 1.25) {
		return 1;
	}

	if (transactionsPerActiveMonth <= 2) {
		return 0.7;
	}

	if (transactionsPerActiveMonth <= 3) {
		return 0.35;
	}

	return 0.1;
}

function getAccountConsistencyScore(transactions: Transaction[]): number {
	if (transactions.length === 0) {
		return 0;
	}

	const accountCounts = new Map<string, number>();

	for (const transaction of transactions) {
		const accountKey =
			transaction.account_id ?? normalize(transaction.account) ?? "";

		accountCounts.set(accountKey, (accountCounts.get(accountKey) ?? 0) + 1);
	}

	const largestAccountCount = Math.max(...accountCounts.values());

	return largestAccountCount / transactions.length;
}

function getRecencyScore(
	transactions: Transaction[],
	now = new Date(),
): number {
	const latestTimestamp = Math.max(
		...transactions.map((transaction) => {
			return parseDate(transaction.date).getTime();
		}),
	);
	const ageDays = (now.getTime() - latestTimestamp) / 86_400_000;

	if (ageDays <= 45) {
		return 1;
	}

	if (ageDays <= 90) {
		return 0.75;
	}

	if (ageDays <= 180) {
		return 0.4;
	}

	return 0.1;
}

function evaluateRecurringCandidate({
	merchantName,
	categoryName,
	transactions,
}: {
	merchantName: string;
	categoryName: string | null | undefined;
	transactions: Transaction[];
}): RecurringDetectionEvaluation {
	const cleanMerchant = merchantName.trim();
	const isStrongObligation = hasStrongRecurringSignal(
		cleanMerchant,
		categoryName,
	);
	const mostlyDining =
		transactions.length > 0 &&
		transactions.filter((transaction) => {
			return isDiningCategory(transaction.category);
		}).length >= Math.ceil(transactions.length * 0.5);
	const mostlyVariableSpend =
		transactions.length > 0 &&
		transactions.filter((transaction) => {
			return isVariableSpendCategory(transaction.category);
		}).length >= Math.ceil(transactions.length * 0.6);

	if (
		!cleanMerchant ||
		(GENERIC_PAYMENT_PATTERN.test(cleanMerchant) && !isStrongObligation) ||
		(mostlyDining && !isStrongObligation)
	) {
		return {
			confidence: 0,
			eligibleForReview: false,
			isStrongObligation,
			cadenceScore: 0,
			monthCoverageScore: 0,
			amountConsistencyScore: 0,
			activeMonthCount: 0,
			representativeTransactions: [],
		};
	}

	const representativeTransactions =
		getRepresentativeTransactionsByMonth(transactions);
	const cadenceTransactions =
		representativeTransactions.length >= 2
			? representativeTransactions
			: transactions;
	const cadenceScore = Math.max(
		getCadenceScore(cadenceTransactions),
		getDayOfMonthConsistencyScore(representativeTransactions),
	);
	const { activeMonthCount, coverageScore: monthCoverageScore } =
		getMonthCoverageScore(representativeTransactions);
	const amountConsistencyScore = getAmountConsistencyScore(
		representativeTransactions,
	);
	const monthlyDensityScore = getMonthlyDensityScore(
		transactions,
		activeMonthCount,
	);
	const accountConsistencyScore = getAccountConsistencyScore(transactions);
	const recencyScore = getRecencyScore(transactions);
	const transactionCountScore = clampScore(transactions.length / 6);
	const priorScore = isStrongObligation ? 1 : mostlyVariableSpend ? 0.05 : 0.35;

	let confidence =
		priorScore * 0.28 +
		cadenceScore * 0.27 +
		monthCoverageScore * 0.18 +
		amountConsistencyScore * 0.1 +
		monthlyDensityScore * 0.07 +
		accountConsistencyScore * 0.04 +
		recencyScore * 0.03 +
		transactionCountScore * 0.03;

	if (isStrongObligation && activeMonthCount >= 2) {
		confidence += 0.08;
	}

	if (mostlyVariableSpend && !isStrongObligation) {
		confidence -= 0.18;
	}

	confidence = clampScore(confidence);

	const minimumTransactionCount = isStrongObligation ? 2 : 3;
	const minimumActiveMonthCount = isStrongObligation ? 2 : 3;
	const confidenceThreshold = isStrongObligation ? 0.5 : 0.66;

	return {
		confidence,
		eligibleForReview:
			transactions.length >= minimumTransactionCount &&
			activeMonthCount >= minimumActiveMonthCount &&
			confidence >= confidenceThreshold,
		isStrongObligation,
		cadenceScore,
		monthCoverageScore,
		amountConsistencyScore,
		activeMonthCount,
		representativeTransactions,
	};
}

function getMerchantIdentityKey(
	transaction: Transaction,
	merchantById: ReadonlyMap<string, MerchantListItem>,
): string {
	const merchantProfile = transaction.merchant_id
		? merchantById.get(transaction.merchant_id)
		: undefined;
	const canonicalName = canonicalizeMerchantName(
		merchantProfile?.name ?? transaction.merchant,
	);

	if (canonicalName) {
		return `name:${canonicalName}`;
	}

	if (transaction.merchant_id) {
		return `id:${transaction.merchant_id}`;
	}

	return `transaction:${transaction.id}`;
}

function transactionMatchesMerchantProfile(
	transaction: Transaction,
	merchant: MerchantListItem,
): boolean {
	if (
		transaction.merchant_id &&
		merchant.id &&
		transaction.merchant_id === merchant.id
	) {
		return true;
	}

	const transactionName = canonicalizeMerchantName(transaction.merchant);
	const merchantName = canonicalizeMerchantName(merchant.name);

	return Boolean(
		transactionName && merchantName && transactionName === merchantName,
	);
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
			return transactionMatchesMerchantProfile(transaction, merchant);
		})
		.sort((first, second) => {
			return second.date.localeCompare(first.date);
		});
	const recent = merchantTransactions.slice(0, 24);
	const latest = recent[0];
	const representativeTransactions =
		getRepresentativeTransactionsByMonth(recent);
	const amountTransactions =
		representativeTransactions.length > 0 ? representativeTransactions : recent;
	const amounts = amountTransactions.map((transaction) => {
		return Math.abs(transaction.amount);
	});
	const suggestedAmount = median(amounts);
	const account = getAccountByTransaction(accounts, latest);
	const category = getCategoryByName(categories, latest?.category ?? "");

	return {
		key: `merchant:${merchant.id || canonicalizeMerchantName(merchant.name)}`,
		merchantId: merchant.id || null,
		merchantName: merchant.name,
		logoUrl: merchant.logoUrl ?? null,
		transactions: recent,
		suggestedAmount: Number(suggestedAmount.toFixed(2)),
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
	const merchantById = new Map(
		merchantItems.map((merchant) => {
			return [merchant.id, merchant] as const;
		}),
	);
	const merchantByCanonicalName = new Map<string, MerchantListItem>();

	for (const merchant of merchantItems) {
		const canonicalName = canonicalizeMerchantName(merchant.name);

		if (canonicalName && !merchantByCanonicalName.has(canonicalName)) {
			merchantByCanonicalName.set(canonicalName, merchant);
		}
	}

	const transactionsByMerchant = new Map<string, Transaction[]>();

	for (const transaction of transactions) {
		if (transaction.amount >= 0) {
			continue;
		}

		const identityKey = getMerchantIdentityKey(transaction, merchantById);
		const merchantTransactions = transactionsByMerchant.get(identityKey) ?? [];

		merchantTransactions.push(transaction);
		transactionsByMerchant.set(identityKey, merchantTransactions);
	}

	const scoredCandidates: Array<{
		candidate: RecurringCandidate;
		confidence: number;
	}> = [];

	for (const group of transactionsByMerchant.values()) {
		const sorted = [...group].sort((first, second) => {
			return second.date.localeCompare(first.date);
		});
		const latest = sorted[0];

		if (!latest) {
			continue;
		}

		const canonicalName = canonicalizeMerchantName(latest.merchant);
		const resolvedMerchant = (latest.merchant_id
			? merchantById.get(latest.merchant_id)
			: undefined) ??
			merchantByCanonicalName.get(canonicalName) ?? {
				id: latest.merchant_id ?? `legacy:${canonicalName}`,
				name: latest.merchant,
				logoUrl: null,
				transactionCount: group.length,
			};
		const evaluation = evaluateRecurringCandidate({
			merchantName: resolvedMerchant.name,
			categoryName: latest.category,
			transactions: sorted.slice(0, 24),
		});

		if (!evaluation.eligibleForReview) {
			continue;
		}

		const candidate = candidateFromMerchant(
			resolvedMerchant,
			transactions,
			"expense",
			accounts,
			categories,
		);
		const sourceKeyAliases = [candidate.key, `merchant:${canonicalName}`];

		if (
			sourceKeyAliases.some((sourceKey) => {
				return knownSourceKeys.has(sourceKey) || dismissedKeys.has(sourceKey);
			})
		) {
			continue;
		}

		scoredCandidates.push({
			candidate,
			confidence: evaluation.confidence,
		});
	}

	return scoredCandidates
		.sort((first, second) => {
			return (
				second.confidence - first.confidence ||
				second.candidate.transactions.length -
					first.candidate.transactions.length ||
				first.candidate.merchantName.localeCompare(
					second.candidate.merchantName,
					"en-US",
					{
						sensitivity: "base",
					},
				)
			);
		})
		.slice(0, 12)
		.map((item) => {
			return item.candidate;
		});
}

export interface PredictedRecurringBill {
	id: string;
	merchant: string;
	amount: number;
	category: string;
	dueDate: Date;
	dayOfMonth: number;
	frequency: string;
	type: string;
}

export function buildPredictedBillCandidates(
	predictedBills: PredictedRecurringBill[],
	merchantItems: MerchantListItem[],
	transactions: Transaction[],
	knownSourceKeys: ReadonlySet<string>,
	hiddenSourceKeys: ReadonlySet<string>,
	accounts: Account[],
	categories: CustomCategory[],
): RecurringCandidate[] {
	const merchantByCanonicalName = new Map<string, MerchantListItem>();

	for (const merchant of merchantItems) {
		const canonicalName = canonicalizeMerchantName(merchant.name);

		if (canonicalName && !merchantByCanonicalName.has(canonicalName)) {
			merchantByCanonicalName.set(canonicalName, merchant);
		}
	}

	const candidateByKey = new Map<
		string,
		{
			candidate: RecurringCandidate;
			confidence: number;
		}
	>();

	for (const bill of predictedBills) {
		const canonicalName = canonicalizeMerchantName(bill.merchant);

		if (!canonicalName) {
			continue;
		}

		const merchant = merchantByCanonicalName.get(canonicalName);
		const fallback: MerchantListItem = merchant ?? {
			id: `legacy:${canonicalName}`,
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
		const evaluation = evaluateRecurringCandidate({
			merchantName: bill.merchant,
			categoryName: bill.category || candidate.suggestedCategoryName,
			transactions: candidate.transactions,
		});
		const sourceKeyAliases = [candidate.key, `merchant:${canonicalName}`];

		if (
			sourceKeyAliases.some((sourceKey) => {
				return (
					knownSourceKeys.has(sourceKey) || hiddenSourceKeys.has(sourceKey)
				);
			})
		) {
			continue;
		}

		/*
		 * The upstream prediction is already evidence. Require either
		 * the normal review threshold or a recognized fixed
		 * obligation with transaction history.
		 */
		if (
			!evaluation.eligibleForReview &&
			!(evaluation.isStrongObligation && candidate.transactions.length >= 2)
		) {
			continue;
		}

		const category = getCategoryByName(categories, bill.category);
		const dueDate =
			bill.dueDate instanceof Date && Number.isFinite(bill.dueDate.getTime())
				? bill.dueDate
				: new Date();
		const normalizedType = normalize(bill.type);
		const suggestedType: RecurringType =
			normalizedType === "income"
				? "income"
				: normalizedType === "credit-card"
					? "credit-card"
					: "expense";
		const suggestedFrequency: RecurringFrequency =
			normalize(bill.frequency) === "yearly"
				? "yearly"
				: candidate.transactions.length >= 2
					? inferFrequency(candidate.transactions)
					: "monthly";
		const reviewedCandidate: RecurringCandidate = {
			...candidate,
			suggestedAmount: Number(Math.abs(bill.amount).toFixed(2)),
			suggestedType,
			suggestedFrequency,
			suggestedStartingDate:
				candidate.transactions.length > 0
					? candidate.suggestedStartingDate
					: toDateInputValue(dueDate),
			suggestedCategoryId: category?.id ?? candidate.suggestedCategoryId,
			suggestedCategoryName: bill.category || candidate.suggestedCategoryName,
		};
		const current = candidateByKey.get(candidate.key);

		if (!current || evaluation.confidence > current.confidence) {
			candidateByKey.set(candidate.key, {
				candidate: reviewedCandidate,
				confidence: evaluation.confidence,
			});
		}
	}

	return [...candidateByKey.values()]
		.sort((first, second) => {
			return (
				second.confidence - first.confidence ||
				second.candidate.transactions.length -
					first.candidate.transactions.length
			);
		})
		.map((item) => {
			return item.candidate;
		});
}

/**
 * @deprecated Predictions must stay in the review queue. Confirmed recurring
 * records come only from persistent recurring_data records.
 */
export function mergeLegacyPredictedBills(
	persistedRecords: RecurringRecord[],
	predictedBills: PredictedRecurringBill[],
	merchantItems: MerchantListItem[],
	transactions: Transaction[],
	accounts: Account[],
	categories: CustomCategory[],
	suppressedSourceKeys: ReadonlySet<string>,
): RecurringRecord[] {
	/*
	 * Keep the legacy arguments in the public signature so existing
	 * callers do not need to change. Predictions are intentionally
	 * ignored because only persisted recurring_data records are
	 * confirmed recurring items.
	 */
	void predictedBills;
	void merchantItems;
	void transactions;
	void accounts;
	void categories;
	void suppressedSourceKeys;

	return [...persistedRecords];
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

	/*
	 * Date proximity is primary. Amount proximity breaks ties but is
	 * not a hard rejection because a posted recurring bill may differ
	 * from the expected amount.
	 */
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

		if (dayDistance > 10) {
			continue;
		}

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
		) {
			continue;
		}

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
		if (record.status !== "active") {
			continue;
		}

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
				{
					sensitivity: "base",
				},
			)
		);
	});
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
