import type {
	Transaction,
} from "@/store/useBudgetStore";

export type AccountTimeframe = "30d" | "90d" | "1y" | "all";

export type AccountAmountMode =
	| "none"
	| "greater-than"
	| "less-than"
	| "equal-to"
	| "between";

export interface AccountCategoryOption {
	value: string;
	label: string;
	iconName?: string;
	colorKey?: string;
}

export interface BalancePoint {
	date: string;
	label: string;
	balance: number;
}

export interface AccountTransactionFilters {
	search: string;
	categoryIds: string[];
	merchantIds: string[];
	amountMode: AccountAmountMode;
	amountValue: string;
	amountMaxValue: string;
	tag: string;
	startDate: string;
	endDate: string;
}

export const EMPTY_ACCOUNT_TRANSACTION_FILTERS: AccountTransactionFilters = {
	search: "",
	categoryIds: [],
	merchantIds: [],
	amountMode: "none",
	amountValue: "",
	amountMaxValue: "",
	tag: "",
	startDate: "",
	endDate: "",
};

export const ACCOUNT_FILTER_QUERY_KEYS = [
	"search",
	"category",
	"categoryNames",
	"categories",
	"merchant",
	"merchants",
	"amountMode",
	"amountValue",
	"amountMaxValue",
	"tag",
	"startDate",
	"endDate",
] as const;

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const chartDateFormatter = new Intl.DateTimeFormat("en-US", {
	month: "short",
	day: "numeric",
	timeZone: "UTC",
});

export const ACCOUNT_TIMEFRAME_OPTIONS: ReadonlyArray<{
	value: AccountTimeframe;
	label: string;
}> = [
	{ value: "30d", label: "Last 30 days" },
	{ value: "90d", label: "Last 90 days" },
	{ value: "1y", label: "Last year" },
	{ value: "all", label: "All time" },
];

function normalizeText(value: string): string {
	return value.trim().toLowerCase();
}

function uniqueSorted(values: string[]): string[] {
	return [...new Set(
		values
			.map((value) => value.trim())
			.filter(Boolean),
	)].sort((first, second) => {
		return first.localeCompare(second);
	});
}

function parseAmount(value: string): number | null {
	const normalized = value.replaceAll(",", "").trim();

	if (!normalized) {
		return null;
	}

	const parsed = Number(normalized);

	return Number.isFinite(parsed) ? Math.abs(parsed) : null;
}

export function normalizeAccountTransactionFilters(
	filters: AccountTransactionFilters,
): AccountTransactionFilters {
	const amountMode = filters.amountMode;
	const amountValue =
		amountMode === "none" ? "" : filters.amountValue.trim();
	const amountMaxValue =
		amountMode === "between"
			? filters.amountMaxValue.trim()
			: "";

	return {
		search: filters.search.trim(),
		categoryIds: uniqueSorted(filters.categoryIds),
		merchantIds: uniqueSorted(filters.merchantIds),
		amountMode,
		amountValue,
		amountMaxValue,
		tag: filters.tag.trim(),
		startDate: filters.startDate.trim(),
		endDate: filters.endDate.trim(),
	};
}

export function accountTransactionFiltersEqual(
	first: AccountTransactionFilters,
	second: AccountTransactionFilters,
): boolean {
	return (
		JSON.stringify(normalizeAccountTransactionFilters(first)) ===
		JSON.stringify(normalizeAccountTransactionFilters(second))
	);
}

export function isAccountAmountFilterValid(
	filters: AccountTransactionFilters,
): boolean {
	if (filters.amountMode === "none") {
		return true;
	}

	const firstValue = parseAmount(filters.amountValue);

	if (firstValue === null) {
		return false;
	}

	if (filters.amountMode !== "between") {
		return true;
	}

	return parseAmount(filters.amountMaxValue) !== null;
}

export function hasAccountTransactionFilters(
	filters: AccountTransactionFilters,
): boolean {
	const normalized = normalizeAccountTransactionFilters(filters);

	return Boolean(
		normalized.search ||
			normalized.categoryIds.length > 0 ||
			normalized.merchantIds.length > 0 ||
			(
				normalized.amountMode !== "none" &&
				isAccountAmountFilterValid(normalized)
			) ||
			normalized.tag ||
			normalized.startDate ||
			normalized.endDate,
	);
}

export function normalizeAccountTimeframe(
	value: string | null,
): AccountTimeframe {
	return ACCOUNT_TIMEFRAME_OPTIONS.some((option) => {
		return option.value === value;
	})
		? (value as AccountTimeframe)
		: "all";
}

function getTimeframeStart(timeframe: AccountTimeframe): number {
	const now = Date.now();

	if (timeframe === "30d") {
		return now - 30 * DAY_IN_MS;
	}

	if (timeframe === "90d") {
		return now - 90 * DAY_IN_MS;
	}

	if (timeframe === "1y") {
		return now - 365 * DAY_IN_MS;
	}

	return Number.NEGATIVE_INFINITY;
}

export function buildBalanceData(
	transactions: Transaction[],
	timeframe: AccountTimeframe,
): BalancePoint[] {
	const timeframeStart = getTimeframeStart(timeframe);
	const sortedTransactions = [...transactions].sort((first, second) => {
		return new Date(first.date).getTime() - new Date(second.date).getTime();
	});

	let runningBalance = 0;
	const balanceByDate = new Map<string, number>();

	for (const transaction of sortedTransactions) {
		const timestamp = new Date(transaction.date).getTime();

		if (Number.isNaN(timestamp)) {
			continue;
		}

		runningBalance += Number(transaction.amount) || 0;

		if (timestamp >= timeframeStart) {
			const date = new Date(timestamp).toISOString().slice(0, 10);
			balanceByDate.set(date, runningBalance);
		}
	}

	const today = new Date().toISOString().slice(0, 10);

	if (balanceByDate.size === 0) {
		return [
			{
				date: today,
				label: chartDateFormatter.format(
					new Date(`${today}T00:00:00.000Z`),
				),
				balance: runningBalance,
			},
		];
	}

	balanceByDate.set(today, runningBalance);

	return Array.from(balanceByDate.entries()).map(([date, balance]) => {
		return {
			date,
			label: chartDateFormatter.format(
				new Date(`${date}T00:00:00.000Z`),
			),
			balance,
		};
	});
}

function readIdList(
	searchParams: URLSearchParams,
	key: "categories" | "merchants",
): string[] {
	const values = searchParams
		.getAll(key)
		.flatMap((value) => value.split(","))
		.map((value) => value.trim())
		.filter(Boolean);

	return uniqueSorted(values);
}

export function readAccountTransactionFilters(
	searchParams: URLSearchParams,
): AccountTransactionFilters {
	const amountModeValue = searchParams.get("amountMode");
	const amountMode: AccountAmountMode = (
		[
			"none",
			"greater-than",
			"less-than",
			"equal-to",
			"between",
		] as const
	).includes(amountModeValue as AccountAmountMode)
		? (amountModeValue as AccountAmountMode)
		: "none";

	return normalizeAccountTransactionFilters({
		search: searchParams.get("search") ?? "",
		categoryIds: readIdList(searchParams, "categories"),
		merchantIds: readIdList(
			searchParams,
			"merchants",
		),
		amountMode,
		amountValue: searchParams.get("amountValue") ?? "",
		amountMaxValue: searchParams.get("amountMaxValue") ?? "",
		tag: searchParams.get("tag") ?? "",
		startDate: searchParams.get("startDate") ?? "",
		endDate: searchParams.get("endDate") ?? "",
	});
}

export function writeAccountTransactionFiltersToSearchParams(
	searchParams: URLSearchParams,
	filters: AccountTransactionFilters,
): void {
	for (const key of ACCOUNT_FILTER_QUERY_KEYS) {
		searchParams.delete(key);
	}

	const normalized = normalizeAccountTransactionFilters(filters);

	if (normalized.search) {
		searchParams.set("search", normalized.search);
	}

	for (const categoryId of normalized.categoryIds) {
		searchParams.append("categories", categoryId);
	}

	for (const merchantId of normalized.merchantIds) {
		searchParams.append("merchants", merchantId);
	}

	if (
		normalized.amountMode !== "none" &&
		isAccountAmountFilterValid(normalized)
	) {
		searchParams.set("amountMode", normalized.amountMode);
		searchParams.set("amountValue", normalized.amountValue);

		if (normalized.amountMode === "between") {
			searchParams.set(
				"amountMaxValue",
				normalized.amountMaxValue,
			);
		}
	}

	if (normalized.tag) {
		searchParams.set("tag", normalized.tag);
	}

	if (normalized.startDate) {
		searchParams.set("startDate", normalized.startDate);
	}

	if (normalized.endDate) {
		searchParams.set("endDate", normalized.endDate);
	}

	searchParams.sort();
}

export interface AccountTransactionFilterResolution {
	categoryNameById: ReadonlyMap<string, string>;
	merchantNameById: ReadonlyMap<string, string>;
}

export function matchesAccountTransactionFilters(
	transaction: Transaction,
	filters: AccountTransactionFilters,
	resolution: AccountTransactionFilterResolution,
): boolean {
	const normalizedFilters =
		normalizeAccountTransactionFilters(filters);
	const search = normalizedFilters.search.toLowerCase();

	if (search) {
		const searchableValues = [
			transaction.merchant,
			transaction.description,
			transaction.category,
			transaction.note,
			String(transaction.amount),
			...(transaction.tags ?? []),
		];

		const matchesSearch = searchableValues.some((value) => {
			return String(value ?? "")
				.toLowerCase()
				.includes(search);
		});

		if (!matchesSearch) {
			return false;
		}
	}

	if (normalizedFilters.categoryIds.length > 0) {
		const transactionCategory =
			normalizeText(transaction.category ?? "");
		const matchesCategory =
			normalizedFilters.categoryIds.some((categoryId) => {
				const categoryName =
					resolution.categoryNameById.get(categoryId);

				return Boolean(
					categoryName &&
						normalizeText(categoryName) ===
							transactionCategory,
				);
			});

		if (!matchesCategory) {
			return false;
		}
	}

	if (normalizedFilters.merchantIds.length > 0) {
		const transactionMerchantId =
			transaction.merchant_id?.trim() ?? "";
		const transactionMerchantName =
			normalizeText(transaction.merchant ?? "");
		const matchesMerchant =
			normalizedFilters.merchantIds.some((merchantId) => {
				if (
					transactionMerchantId &&
					transactionMerchantId === merchantId
				) {
					return true;
				}

				const selectedMerchantName =
					resolution.merchantNameById.get(merchantId);

				return Boolean(
					selectedMerchantName &&
						normalizeText(selectedMerchantName) ===
							transactionMerchantName,
				);
			});

		if (!matchesMerchant) {
			return false;
		}
	}

	if (
		normalizedFilters.tag &&
		!(transaction.tags ?? []).some((tag) => {
			return (
				normalizeText(tag) ===
				normalizeText(normalizedFilters.tag)
			);
		})
	) {
		return false;
	}

	const absoluteAmount = Math.abs(Number(transaction.amount) || 0);
	const firstAmount = parseAmount(normalizedFilters.amountValue);
	const secondAmount = parseAmount(normalizedFilters.amountMaxValue);

	if (
		normalizedFilters.amountMode === "greater-than" &&
		firstAmount !== null &&
		absoluteAmount <= firstAmount
	) {
		return false;
	}

	if (
		normalizedFilters.amountMode === "less-than" &&
		firstAmount !== null &&
		absoluteAmount >= firstAmount
	) {
		return false;
	}

	if (
		normalizedFilters.amountMode === "equal-to" &&
		firstAmount !== null &&
		Math.abs(absoluteAmount - firstAmount) >= 0.005
	) {
		return false;
	}

	if (
		normalizedFilters.amountMode === "between" &&
		firstAmount !== null &&
		secondAmount !== null
	) {
		const minimum = Math.min(firstAmount, secondAmount);
		const maximum = Math.max(firstAmount, secondAmount);

		if (absoluteAmount < minimum || absoluteAmount > maximum) {
			return false;
		}
	}

	const transactionDate = transaction.date.slice(0, 10);

	if (
		normalizedFilters.startDate &&
		transactionDate < normalizedFilters.startDate
	) {
		return false;
	}

	if (
		normalizedFilters.endDate &&
		transactionDate > normalizedFilters.endDate
	) {
		return false;
	}

	return true;
}

export function inferInstitution(accountName: string): string {
	const normalizedName = accountName.toLowerCase();

	if (normalizedName.includes("chase")) {
		return "Chase";
	}

	if (
		normalizedName.includes("amex") ||
		normalizedName.includes("american express")
	) {
		return "American Express";
	}

	if (
		normalizedName.includes("capital one") ||
		normalizedName.includes("venture")
	) {
		return "Capital One";
	}

	if (normalizedName.includes("citi")) {
		return "Citi";
	}

	return "Not set";
}

export function inferAccountType(accountName: string): string {
	const normalizedName = accountName.toLowerCase();

	if (
		normalizedName.includes("card") ||
		normalizedName.includes("flex") ||
		normalizedName.includes("sapphire") ||
		normalizedName.includes("amex") ||
		normalizedName.includes("venture")
	) {
		return "Credit Card";
	}

	if (normalizedName.includes("checking")) {
		return "Checking";
	}

	if (normalizedName.includes("saving")) {
		return "Savings";
	}

	return "Account";
}

export function downloadCsv(
	filename: string,
	rows: ReadonlyArray<ReadonlyArray<string | number>>,
): void {
	const csv = rows
		.map((row) => {
			return row
				.map((value) => {
					const escaped = String(value).replaceAll('"', '""');
					return `"${escaped}"`;
				})
				.join(",");
		})
		.join("\n");

	const blob = new Blob([csv], {
		type: "text/csv;charset=utf-8",
	});
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");

	anchor.href = url;
	anchor.download = filename;
	anchor.click();

	URL.revokeObjectURL(url);
}
