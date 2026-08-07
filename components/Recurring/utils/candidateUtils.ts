/**
 * Candidate detection and evaluation logic.
 */
/**
 * Candidate detection and evaluation logic.
 */
import type { MerchantListItem } from "@/components/Merchants/types";
import type {
	Account,
	CustomCategory,
	Transaction,
} from "@/store/useBudgetStore";
import type {
	RecurringCandidate,
	RecurringFrequency,
	RecurringType,
} from "../types/recurringTypes";
import {
	normalize,
	median,
	parseDate,
	toDateInputValue,
} from "./recurringUtils";
import {
	getRepresentativeTransactionsByMonth,
	inferFrequency,
} from "./occurrenceUtils";

// ----------------------------------------------------------------------
// Helper functions (originally inside the big recurringUtils.ts)
// ----------------------------------------------------------------------

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

function canonicalizeMerchantName(value: string | null | undefined): string {
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

	if (/\bt\s*mobile\b/.test(merchant)) return "t-mobile";
	if (/\bat\s*&?\s*t\b/.test(merchant)) return "at&t";
	if (/\bverizon\b/.test(merchant)) return "verizon";
	if (/\bxfinity\b|\bcomcast\b/.test(merchant)) return "xfinity";
	if (/\bspectrum\b/.test(merchant)) return "spectrum";
	if (/\bla\s*fitness\b/.test(merchant)) return "la fitness";
	if (/\bin\s*n\s*out\b/.test(merchant)) return "in n out";
	return merchant;
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

// ----------------------------------------------------------------------
// Candidate building (already present)
// ----------------------------------------------------------------------

export function candidateFromMerchant(
	merchant: MerchantListItem,
	transactions: Transaction[],
	defaultType: RecurringType,
	accounts: Account[] = [],
	categories: CustomCategory[] = [],
): RecurringCandidate {
	const merchantTransactions = transactions
		.filter((transaction) =>
			transactionMatchesMerchantProfile(transaction, merchant),
		)
		.sort((first, second) => second.date.localeCompare(first.date));
	const recent = merchantTransactions.slice(0, 24);
	const latest = recent[0];
	const representativeTransactions =
		getRepresentativeTransactionsByMonth(recent);
	const amountTransactions =
		representativeTransactions.length > 0 ? representativeTransactions : recent;
	const amounts = amountTransactions.map((transaction) =>
		Math.abs(transaction.amount),
	);
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

// ----------------------------------------------------------------------
// Recurring detection evaluation and candidate building (full)
// ----------------------------------------------------------------------

// Patterns used in evaluation
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

// Common intervals for cadence scoring
const COMMON_RECURRING_INTERVALS: ReadonlyArray<{
	days: number;
	frequency: RecurringFrequency;
}> = [
	{ days: 7, frequency: "weekly" },
	{ days: 14, frequency: "every-2-weeks" },
	{ days: 28, frequency: "every-4-weeks" },
	{ days: 30, frequency: "monthly" },
	{ days: 31, frequency: "monthly" },
	{ days: 60, frequency: "every-2-months" },
	{ days: 90, frequency: "every-3-months" },
	{ days: 120, frequency: "every-4-months" },
	{ days: 180, frequency: "every-6-months" },
	{ days: 365, frequency: "yearly" },
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

function getIntervalTolerance(intervalDays: number): number {
	if (intervalDays <= 14) return 3;
	if (intervalDays <= 31) return 7;
	return Math.max(9, Math.round(intervalDays * 0.16));
}

function getCadenceScore(transactions: Transaction[]): number {
	const gaps = getDayGaps(transactions);
	if (gaps.length === 0) return 0;
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
		return { activeMonthCount: 0, coverageScore: 0 };
	}
	const monthSerials = [
		...new Set(
			transactions.map((transaction) =>
				getMonthSerial(parseDate(transaction.date)),
			),
		),
	].sort((a, b) => a - b);
	const firstMonth = monthSerials[0];
	const lastMonth = monthSerials[monthSerials.length - 1];
	const monthSpan = Math.max(1, lastMonth - firstMonth + 1);
	return {
		activeMonthCount: monthSerials.length,
		coverageScore: monthSerials.length / monthSpan,
	};
}

function getDayOfMonthConsistencyScore(transactions: Transaction[]): number {
	if (transactions.length < 2) return 0;
	const days = transactions.map((t) => parseDate(t.date).getUTCDate());
	const typicalDay = median(days);
	let consistentCount = 0;
	for (const day of days) {
		if (Math.abs(day - typicalDay) <= 7) consistentCount += 1;
	}
	return consistentCount / days.length;
}

function getAmountConsistencyScore(transactions: Transaction[]): number {
	if (transactions.length < 2) return 0;
	const amounts = transactions.map((t) => Math.abs(t.amount));
	const typicalAmount = median(amounts);
	if (typicalAmount <= 0) return 0;
	const deviations = amounts.map((amount) => Math.abs(amount - typicalAmount));
	const medianDeviation = median(deviations);
	const deviationRatio = medianDeviation / typicalAmount;
	return clampScore(1 - deviationRatio / 0.5);
}

function getMonthlyDensityScore(
	transactions: Transaction[],
	activeMonthCount: number,
): number {
	if (activeMonthCount === 0) return 0;
	const transactionsPerActiveMonth = transactions.length / activeMonthCount;
	if (transactionsPerActiveMonth <= 1.25) return 1;
	if (transactionsPerActiveMonth <= 2) return 0.7;
	if (transactionsPerActiveMonth <= 3) return 0.35;
	return 0.1;
}

function getAccountConsistencyScore(transactions: Transaction[]): number {
	if (transactions.length === 0) return 0;
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
		...transactions.map((t) => parseDate(t.date).getTime()),
	);
	const ageDays = (now.getTime() - latestTimestamp) / 86_400_000;
	if (ageDays <= 45) return 1;
	if (ageDays <= 90) return 0.75;
	if (ageDays <= 180) return 0.4;
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
		transactions.filter((t) => isDiningCategory(t.category)).length >=
			Math.ceil(transactions.length * 0.5);
	const mostlyVariableSpend =
		transactions.length > 0 &&
		transactions.filter((t) => isVariableSpendCategory(t.category)).length >=
			Math.ceil(transactions.length * 0.6);

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

// Additional helpers for candidate building
function getDayGaps(transactions: Transaction[]): number[] {
	const timestamps = transactions
		.map((t) => parseDate(t.date).getTime())
		.sort((a, b) => a - b);
	const gaps: number[] = [];
	for (let i = 1; i < timestamps.length; i++) {
		const gap = Math.round((timestamps[i] - timestamps[i - 1]) / 86_400_000);
		if (gap > 0) gaps.push(gap);
	}
	return gaps;
}

function getMonthSerial(date: Date): number {
	return date.getUTCFullYear() * 12 + date.getUTCMonth();
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

// Main candidate builder from transactions
export function buildRecurringCandidates(
	transactions: Transaction[],
	merchantItems: MerchantListItem[],
	knownSourceKeys: ReadonlySet<string>,
	dismissedKeys: ReadonlySet<string>,
	accounts: Account[],
	categories: CustomCategory[],
): RecurringCandidate[] {
	const merchantById = new Map(
		merchantItems.map((merchant) => [merchant.id, merchant]),
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
		if (transaction.amount >= 0) continue;
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
		const sorted = [...group].sort((a, b) => b.date.localeCompare(a.date));
		const latest = sorted[0];
		if (!latest) continue;
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
		if (!evaluation.eligibleForReview) continue;
		const candidate = candidateFromMerchant(
			resolvedMerchant,
			transactions,
			"expense",
			accounts,
			categories,
		);
		const sourceKeyAliases = [candidate.key, `merchant:${canonicalName}`];
		if (
			sourceKeyAliases.some(
				(key) => knownSourceKeys.has(key) || dismissedKeys.has(key),
			)
		) {
			continue;
		}
		scoredCandidates.push({ candidate, confidence: evaluation.confidence });
	}

	return scoredCandidates
		.sort((a, b) => {
			return (
				b.confidence - a.confidence ||
				b.candidate.transactions.length - a.candidate.transactions.length ||
				a.candidate.merchantName.localeCompare(
					b.candidate.merchantName,
					"en-US",
					{
						sensitivity: "base",
					},
				)
			);
		})
		.slice(0, 12)
		.map((item) => item.candidate);
}

// Predicted bill candidate builder
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
		{ candidate: RecurringCandidate; confidence: number }
	>();

	for (const bill of predictedBills) {
		const canonicalName = canonicalizeMerchantName(bill.merchant);
		if (!canonicalName) continue;
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
			sourceKeyAliases.some(
				(key) => knownSourceKeys.has(key) || hiddenSourceKeys.has(key),
			)
		) {
			continue;
		}
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
		.sort((a, b) => {
			return (
				b.confidence - a.confidence ||
				b.candidate.transactions.length - a.candidate.transactions.length
			);
		})
		.map((item) => item.candidate);
}
