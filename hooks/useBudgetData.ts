"use client";

import { useMemo } from "react";
import { useBudgetStore } from "@/store/useBudgetStore";
import { ICON_MAP } from "@/constants/icons";
import type { CategoryData } from "@/types/budget";
import { COLORS_HEX } from "@/data/categories";
import { getCategoryTheme } from "@/constants/categories";

const MONTHS = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec",
] as const;

const MONTH_INDEX: Readonly<Record<string, number>> = {
	Jan: 0,
	Feb: 1,
	Mar: 2,
	Apr: 3,
	May: 4,
	Jun: 5,
	Jul: 6,
	Aug: 7,
	Sep: 8,
	Oct: 9,
	Nov: 10,
	Dec: 11,
};

const YEAR_TABS = ["This Month", "Last Month", "Last 12 Months"];

const TOP_MERCHANT_PREFIX = /^(SQ\s\*|TST\s\*|PY\s\*|Check\s#\d+\s-\s)/i;
const RECURRING_MERCHANT_PREFIX = /^(SQ\s\*|TST\s\*|PY\s\*|PAYMENT\s\*)/i;
const PAYMENT_MERCHANT = /PAYMENT|TRANSFER|PMT/i;
const PAYMENT_OR_DEPOSIT_MERCHANT = /PAYMENT|TRANSFER|PMT|DEP/i;
const SUBSCRIPTION_KEYWORD = /PRO|PLUS|PREMIUM|MONTHLY|ANNUAL|SUBS|MEMBERSHIP/i;
const LIKELY_SERVICE =
	/CLAUDE|OPENAI|NETFLIX|SPOTIFY|ADOBE|YOUTUBE|APPLE|GOOGLE|AMAZON|HULU|DISNEY/i;

const VARIABLE_CATEGORIES = new Set([
	"shopping",
	"transportation",
	"groceries",
	"food & drink",
	"gas",
	"dining",
	"restaurants",
	"general",
]);

const COMMON_SUBSCRIPTION_PRICES = new Set([
	9.99, 12.99, 14.99, 15.99, 19.99, 29.99, 99,
]);

type FilterMode =
	| "specific-month"
	| "this-month"
	| "last-month"
	| "year"
	| "this-year"
	| "last-12-months"
	| "today"
	| "this-week"
	| "all";

function takeFirstTwoWords(value: string): string {
	return value.trim().split(/\s+/).slice(0, 2).join(" ");
}

function cleanTopMerchant(merchant: string): string {
	return (
		takeFirstTwoWords(merchant.replace(TOP_MERCHANT_PREFIX, "")) || "Unknown"
	);
}

function cleanRecurringMerchant(merchant: string): string {
	return takeFirstTwoWords(merchant.replace(RECURRING_MERCHANT_PREFIX, ""));
}

function isKnownBillCategory(category: string): boolean {
	return (
		category.includes("insurance") ||
		category.includes("utilit") ||
		category.includes("housing")
	);
}

function isEntertainmentCategory(category: string): boolean {
	return (
		category.includes("entertainment") ||
		category === "music" ||
		category === "movies & tv" ||
		category === "streaming" ||
		category === "games"
	);
}

export function useBudgetData(timeFilter: string) {
	const transactions = useBudgetStore(function (state) {
		return state.transactions;
	});

	const confirmedMerchants = useBudgetStore(function (state) {
		return state.confirmedRecurringMerchants;
	});

	type Transaction = NonNullable<typeof transactions>[number];
	type ParsedTransaction = {
		transaction: Transaction;
		timestamp: number;
		dayKey: number;
		year: number;
		month: number;
		day: number;
	};

	const parsedTransactions = useMemo<ParsedTransaction[]>(
		function () {
			if (!transactions?.length) return [];

			const parsed: ParsedTransaction[] = [];

			for (let i = 0; i < transactions.length; i++) {
				const transaction = transactions[i];
				if (!transaction.date) continue;

				const date = new Date(transaction.date);
				const timestamp = date.getTime();
				if (!Number.isFinite(timestamp)) continue;

				const year = date.getFullYear();
				const month = date.getMonth();
				const day = date.getDate();

				parsed.push({
					transaction,
					timestamp,
					dayKey: year * 10_000 + (month + 1) * 100 + day,
					year,
					month,
					day,
				});
			}

			return parsed;
		},
		[transactions],
	);

	const filterContext = useMemo(
		function () {
			const now = new Date();
			const currentYear = now.getFullYear();
			const currentMonth = now.getMonth();
			const currentDay = now.getDate();
			const normalizedFilter = timeFilter.trim();
			const parts = normalizedFilter.split(/\s+/);

			const parsedYear = Number.parseInt(parts[parts.length - 1] ?? "", 10);
			const selectedYear = Number.isNaN(parsedYear) ? currentYear : parsedYear;
			const selectedMonth = MONTH_INDEX[parts[0]] ?? null;
			const isSpecificMonth = selectedMonth !== null;

			let mode: FilterMode = "all";
			if (isSpecificMonth) mode = "specific-month";
			else if (normalizedFilter === "This Month") mode = "this-month";
			else if (normalizedFilter === "Last Month") mode = "last-month";
			else if (normalizedFilter.startsWith("Year")) mode = "year";
			else if (normalizedFilter === "This Year") mode = "this-year";
			else if (normalizedFilter === "Last 12 Months") mode = "last-12-months";
			else if (normalizedFilter.startsWith("Today")) mode = "today";
			else if (normalizedFilter.startsWith("This Week")) mode = "this-week";

			const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);
			const twelveMonthsAgoTimestamp = new Date(
				currentYear,
				currentMonth - 12,
				currentDay,
			).getTime();

			const dayOfWeek = now.getDay();
			const diffToMonday = currentDay - (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
			const weekStartTimestamp = new Date(
				currentYear,
				currentMonth,
				diffToMonday,
			).getTime();
			const weekStartDate = new Date(weekStartTimestamp);
			const weekEndDate = new Date(weekStartTimestamp);
			weekEndDate.setDate(weekEndDate.getDate() + 6);

			const weekStartKey =
				weekStartDate.getFullYear() * 10_000 +
				(weekStartDate.getMonth() + 1) * 100 +
				weekStartDate.getDate();
			const weekEndKey =
				weekEndDate.getFullYear() * 10_000 +
				(weekEndDate.getMonth() + 1) * 100 +
				weekEndDate.getDate();

			return {
				mode,
				isSpecificMonth,
				selectedMonth,
				selectedYear,
				currentYear,
				currentMonth,
				currentDay,
				lastMonth: lastMonthDate.getMonth(),
				lastMonthYear: lastMonthDate.getFullYear(),
				twelveMonthsAgoTimestamp,
				weekStartKey,
				weekEndKey,
			};
		},
		[timeFilter],
	);

	const filteredResult = useMemo(
		function () {
			if (!timeFilter || parsedTransactions.length === 0) {
				return {
					rows: [] as ParsedTransaction[],
					transactions: [] as Transaction[],
				};
			}

			const rows: ParsedTransaction[] = [];
			const filtered: Transaction[] = [];
			const context = filterContext;

			for (let i = 0; i < parsedTransactions.length; i++) {
				const row = parsedTransactions[i];
				let include = false;

				switch (context.mode) {
					case "specific-month":
						include =
							row.month === context.selectedMonth &&
							row.year === context.selectedYear;
						break;
					case "this-month":
						include =
							row.month === context.currentMonth &&
							row.year === context.currentYear;
						break;
					case "last-month":
						include =
							row.month === context.lastMonth &&
							row.year === context.lastMonthYear;
						break;
					case "year":
						include = row.year === context.selectedYear;
						break;
					case "this-year":
						include = row.year === context.currentYear;
						break;
					case "last-12-months":
						include = row.timestamp >= context.twelveMonthsAgoTimestamp;
						break;
					case "today":
						include =
							row.year === context.currentYear &&
							row.month === context.currentMonth &&
							row.day === context.currentDay;
						break;
					case "this-week":
						include =
							row.dayKey >= context.weekStartKey &&
							row.dayKey <= context.weekEndKey;
						break;
					case "all":
						include = true;
				}

				if (include) {
					rows.push(row);
					filtered.push(row.transaction);
				}
			}

			return { rows, transactions: filtered };
		},
		[filterContext, parsedTransactions, timeFilter],
	);

	const filteredTransactions = filteredResult.transactions;

	const dashboardData = useMemo(
		function () {
			let income = 0;
			let expenses = 0;
			let unreviewedCount = 0;
			let uncategorizedCount = 0;

			const isDailyView =
				filterContext.isSpecificMonth && filterContext.selectedMonth !== null;
			const bucketCount = isDailyView
				? new Date(
						filterContext.selectedYear,
						filterContext.selectedMonth! + 1,
						0,
					).getDate()
				: 12;

			const chartValues = new Array<number>(bucketCount).fill(0);
			const categoryTotals = new Map<string, number>();
			const merchantTotals = new Map<
				string,
				{ count: number; total: number }
			>();
			const topPurchases: Array<{ transaction: Transaction; amount: number }> =
				[];

			for (let i = 0; i < filteredResult.rows.length; i++) {
				const row = filteredResult.rows[i];
				const transaction = row.transaction;
				const amount = transaction.amount;

				if (transaction.needs_review) unreviewedCount++;
				if (!transaction.category || transaction.category === "Uncategorized") {
					uncategorizedCount++;
				}

				if (amount > 0) {
					income += amount;
					continue;
				}

				const absoluteAmount = Math.abs(amount);
				expenses += absoluteAmount;

				if (amount < 0) {
					const chartIndex = isDailyView ? row.day - 1 : row.month;
					if (chartValues[chartIndex] !== undefined) {
						chartValues[chartIndex] += absoluteAmount;
					}

					const category = transaction.category || "Uncategorized";
					categoryTotals.set(
						category,
						(categoryTotals.get(category) ?? 0) + absoluteAmount,
					);

					const merchant = cleanTopMerchant(transaction.merchant);
					const merchantData = merchantTotals.get(merchant);

					if (merchantData) {
						merchantData.count++;
						merchantData.total += absoluteAmount;
					} else {
						merchantTotals.set(merchant, { count: 1, total: absoluteAmount });
					}

					let insertAt = 0;
					while (
						insertAt < topPurchases.length &&
						topPurchases[insertAt].amount >= absoluteAmount
					) {
						insertAt++;
					}
					if (insertAt < 10) {
						topPurchases.splice(insertAt, 0, {
							transaction,
							amount: absoluteAmount,
						});
						if (topPurchases.length > 10) topPurchases.pop();
					}
				}
			}

			const remaining = income - expenses;
			const stats = {
				income,
				expenses,
				remaining,
				savings: remaining,
				unreviewedCount,
				totalTransactions: filteredTransactions.length,
				uncategorizedCount,
			};

			const maxMonthlyValue = Math.max(...chartValues, 0);
			const chartScale = Math.max(maxMonthlyValue, 1);

			const monthlyData = chartValues.map(function (value, index) {
				return {
					label: isDailyView ? String(index + 1) : MONTHS[index],
					value,
					height: Math.max((value / chartScale) * 100, 2),
				};
			});

			const categoryData: CategoryData[] = Array.from(categoryTotals.entries())
				.sort(function ([, a], [, b]) {
					return b - a;
				})
				.map(function ([name, amount], index) {
					const theme = getCategoryTheme(name);
					return {
						name,
						value: Number(amount.toFixed(2)),
						percent: expenses > 0 ? Math.round((amount / expenses) * 100) : 0,
						color: theme.bg,
						textColor: theme.text,
						fill: COLORS_HEX[index % COLORS_HEX.length],
						icon: ICON_MAP[name] || ICON_MAP.Uncategorized,
					};
				});

			const topMerchants = Array.from(merchantTotals.entries())
				.sort(function ([, a], [, b]) {
					return b.total - a.total;
				})
				.map(function ([name, data]) {
					return {
						name,
						count: data.count,
						total: Number(data.total.toFixed(2)),
					};
				});

			return {
				stats,
				monthlyData,
				maxMonthlyValue,
				categoryData,
				topMerchants,
				largestPurchases: topPurchases.map(function (item) {
					return item.transaction;
				}),
			};
		},
		[filterContext, filteredResult.rows, filteredTransactions.length],
	);

	const predictedBills = useMemo(
		function () {
			type MerchantAggregate = {
				count: number;
				totalAmount: number;
				minAmount: number;
				maxAmount: number;
				lastTimestamp: number;
				category: string | null | undefined;
				uniqueMonths: Set<number>;
			};

			const merchantAggregates = new Map<string, MerchantAggregate>();
			const confirmedMerchantSet = new Set(
				confirmedMerchants.map(function (merchant) {
					return merchant.toLowerCase();
				}),
			);

			for (let i = 0; i < parsedTransactions.length; i++) {
				const row = parsedTransactions[i];
				const transaction = row.transaction;

				if (
					transaction.amount >= 0 ||
					PAYMENT_MERCHANT.test(transaction.merchant)
				) {
					continue;
				}

				const name = cleanRecurringMerchant(transaction.merchant);
				const amount = Math.abs(transaction.amount);
				const monthKey = row.year * 12 + row.month;
				const existing = merchantAggregates.get(name);

				if (existing) {
					existing.count++;
					existing.totalAmount += amount;
					existing.minAmount = Math.min(existing.minAmount, amount);
					existing.maxAmount = Math.max(existing.maxAmount, amount);
					existing.lastTimestamp = Math.max(
						existing.lastTimestamp,
						row.timestamp,
					);
					existing.uniqueMonths.add(monthKey);
				} else {
					merchantAggregates.set(name, {
						count: 1,
						totalAmount: amount,
						minAmount: amount,
						maxAmount: amount,
						lastTimestamp: row.timestamp,
						category: transaction.category,
						uniqueMonths: new Set([monthKey]),
					});
				}
			}

			const now = new Date();
			const nowTimestamp = now.getTime();
			const bills = [];

			const merchantEntries = Array.from(merchantAggregates.entries());
			for (let i = 0; i < merchantEntries.length; i++) {
				const [name, data] = merchantEntries[i];
				const manuallyConfirmed = confirmedMerchantSet.has(name.toLowerCase());
				const categoryLower = (data.category || "").toLowerCase();
				const knownBillCategory = isKnownBillCategory(categoryLower);

				if (!manuallyConfirmed) {
					if (data.count < 2 || VARIABLE_CATEGORIES.has(categoryLower))
						continue;

					const amountDifference = data.maxAmount - data.minAmount;
					const stableAmount =
						knownBillCategory ||
						amountDifference <= 10 ||
						amountDifference <= data.maxAmount * 0.5;
					const spacedOut = knownBillCategory || data.uniqueMonths.size >= 2;

					if (!stableAmount || !spacedOut) continue;
				}

				const lastDate = new Date(data.lastTimestamp);
				const dayOfMonth = lastDate.getDate();
				const nextDate = new Date(
					now.getFullYear(),
					now.getMonth(),
					dayOfMonth,
				);

				if (nextDate.getTime() <= nowTimestamp) {
					nextDate.setMonth(nextDate.getMonth() + 1);
				}

				bills.push({
					id: name,
					merchant: name,
					amount: data.totalAmount / Math.max(1, data.uniqueMonths.size),
					category: data.category || "Uncategorized",
					dueDate: nextDate,
					dayOfMonth,
					frequency: data.count >= 12 ? "Yearly" : "Monthly",
					type: isEntertainmentCategory(categoryLower)
						? "subscription"
						: "bill",
				});
			}

			return bills.sort(function (a, b) {
				return a.dueDate.getTime() - b.dueDate.getTime();
			});
		},
		[confirmedMerchants, parsedTransactions],
	);

	const potentialSubscriptions = useMemo(
		function () {
			const identifiedNames = new Set(
				predictedBills.map(function (bill) {
					return bill.merchant.toLowerCase();
				}),
			);

			const seenMerchants = new Set<string>();
			const matches: Transaction[] = [];

			if (!transactions) return matches;

			for (let i = 0; i < transactions.length; i++) {
				const transaction = transactions[i];
				const merchant = transaction.merchant;
				const merchantLower = merchant.toLowerCase();
				const amount = Math.abs(transaction.amount);

				if (identifiedNames.has(merchantLower) || transaction.amount >= 0)
					continue;
				if (PAYMENT_OR_DEPOSIT_MERCHANT.test(merchant)) continue;

				const categoryLower = (transaction.category || "").toLowerCase();
				if (isKnownBillCategory(categoryLower)) continue;

				const isPotentialSubscription =
					SUBSCRIPTION_KEYWORD.test(merchant) ||
					(COMMON_SUBSCRIPTION_PRICES.has(amount) &&
						LIKELY_SERVICE.test(merchant));

				if (!isPotentialSubscription || seenMerchants.has(merchant)) continue;

				seenMerchants.add(merchant);
				matches.push(transaction);

				if (matches.length === 4) break;
			}

			return matches;
		},
		[predictedBills, transactions],
	);

	return useMemo(
		function () {
			return {
				stats: dashboardData.stats,
				categoryData: dashboardData.categoryData,
				monthlyData: dashboardData.monthlyData,
				maxMonthlyValue: dashboardData.maxMonthlyValue,
				topMerchants: dashboardData.topMerchants,
				largestPurchases: dashboardData.largestPurchases,
				filteredTransactions,
				yearTabs: YEAR_TABS,
				predictedBills,
				potentialSubscriptions,
			};
		},
		[
			dashboardData,
			filteredTransactions,
			potentialSubscriptions,
			predictedBills,
		],
	);
}
