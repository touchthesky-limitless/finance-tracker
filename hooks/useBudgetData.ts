"use client";

import { useMemo } from "react";
import { useBudgetStore } from "@/store/useBudgetStore";
import { ICON_MAP } from "@/constants/icons";
import { CategoryData } from "@/types/budget";
import { COLORS_HEX } from "@/data/categories";
import { getCategoryTheme } from "@/constants/categories";

export function useBudgetData(timeFilter: string) {
	const transactions = useBudgetStore((state) => state.transactions);
	const confirmedMerchants = useBudgetStore(
		(state) => state.confirmedRecurringMerchants,
	);

	// --- 1. UNIFIED PARSER ---
	// Extract Month and Year from strings like "Jan 2026", "Year 2025", or "This Month"
	const filterContext = useMemo(() => {
		const now = new Date();
		const monthMap: Record<string, number> = {
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

		// Split "Dec 2025" -> ["Dec", "2025"]
		const parts = timeFilter.split(" ");

		// Detect year (either from "Jan 2026" or "Year 2026")
		// Default to current year if not found
		// 1. Detect Year: Look at the last part of the string
		const lastPartAsYear = parseInt(parts[parts.length - 1]);
		// If the string is a preset like "This Month", parseInt will return NaN.
		// In that case, we default to the actual current year (2026).
		const selectedYear = isNaN(lastPartAsYear)
			? now.getFullYear()
			: lastPartAsYear;

		// 2. Detect Month: Look at the first part of the string
		const isSpecificMonth = monthMap[parts[0]] !== undefined;
		const selectedMonth = isSpecificMonth ? monthMap[parts[0]] : null;

		return {
			isSpecificMonth,
			selectedMonth,
			selectedYear,
			now,
		};
	}, [timeFilter]);

	// --- 2. FILTER TRANSACTIONS ---
	const filteredTransactions = useMemo(() => {
		// 1. START THE CLOCK
		// const start = performance.now();
		// console.log("🚀 DATA ENGINE CHECKING...");

		// 2. Safety Gate
		if (!transactions || transactions.length === 0) {
			// const end = performance.now();
			// console.log(`%c ⚡ Engine (Empty State): ${(end - start).toFixed(3)}ms`, "color: #6b7280;");
			return [];
		}

		if (!timeFilter) {
			console.warn("⚠️ Data Engine Aborted: No timeFilter provided.");
			return [];
		}

		// console.log(`✅ Processing ${transactions.length} transactions...`);

		const { isSpecificMonth, selectedMonth, selectedYear, now } = filterContext;

		// STEP 1: PRE-CALCULATE BOUNDARIES
		const currentYear = now.getFullYear();
		const currentMonth = now.getMonth();
		const currentDate = now.getDate();

		const lastM = new Date(currentYear, currentMonth - 1, 1);
		const twelveMonthsAgo = new Date(
			currentYear,
			currentMonth - 12,
			currentDate,
		);

		const dayOfWeek = now.getDay();
		const diffToMonday = currentDate - (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
		const monday = new Date(currentYear, currentMonth, diffToMonday);
		const sunday = new Date(monday);
		sunday.setDate(monday.getDate() + 6);
		sunday.setHours(23, 59, 59, 999);

		let targetYear = currentYear;
		if (timeFilter.startsWith("Year")) {
			targetYear = parseInt(timeFilter.split(" ").pop() || String(currentYear));
		}

		// STEP 2: FILTER TRANSACTIONS
		const result = transactions.filter((t) => {
			if (!t.date) return false;

			const txDate = new Date(t.date);
			if (isNaN(txDate.getTime())) return false;

			const txYear = txDate.getFullYear();
			const txMonth = txDate.getMonth();
			const txDay = txDate.getDate();

			if (isSpecificMonth)
				return txMonth === selectedMonth && txYear === selectedYear;
			if (timeFilter === "This Month")
				return txMonth === currentMonth && txYear === currentYear;
			if (timeFilter === "Last Month")
				return txMonth === lastM.getMonth() && txYear === lastM.getFullYear();
			if (timeFilter.startsWith("Year")) return txYear === targetYear;
			if (timeFilter === "This Year") return txYear === currentYear;
			if (timeFilter === "Last 12 Months") return txDate >= twelveMonthsAgo;
			if (timeFilter.startsWith("Today"))
				return (
					txYear === currentYear &&
					txMonth === currentMonth &&
					txDay === currentDate
				);
			if (timeFilter.startsWith("This Week")) {
				const txMidnight = new Date(txYear, txMonth, txDay);
				return txMidnight >= monday && txMidnight <= sunday;
			}

			return true;
		});

		// 3. LOG THE SUCCESSFUL RUN (Outside the filter loop)
		// const end = performance.now();
		// console.log(
		//     `%c ⚡ Engine Speed: ${(end - start).toFixed(3)}ms`,
		//     "color: #f97316; font-weight: bold; font-size: 12px;"
		// );

		return result;
	}, [transactions, timeFilter, filterContext]);

	// --- 3. DERIVED STATS ---
	const stats = useMemo(() => {
		let income = 0;
		let expenses = 0;
		let unreviewedCount = 0;

		filteredTransactions.forEach((t) => {
			if (t.needs_review) unreviewedCount++;
			if (t.amount > 0) income += t.amount;
			else expenses += Math.abs(t.amount);
		});

		const uncategorizedCount = filteredTransactions.filter(
			(t) => !t.category || t.category === "Uncategorized",
		).length;

		return {
			income,
			expenses,
			remaining: income - expenses,
			savings: income - expenses,
			unreviewedCount,
			totalTransactions: filteredTransactions.length,
			uncategorizedCount,
		};
	}, [filteredTransactions]);

	// --- 4. MONTHLY / DAILY DATA (For Bar Chart) ---
	const monthlyData = useMemo(() => {
		const { isSpecificMonth, selectedMonth, selectedYear } = filterContext;

		if (isSpecificMonth && selectedMonth !== null) {
			// --- DAILY VIEW ---
			const daysInMonth = new Date(
				selectedYear,
				selectedMonth + 1,
				0,
			).getDate();
			const days = Array.from({ length: daysInMonth }, (_, i) => ({
				label: (i + 1).toString(),
				value: 0,
				height: 0,
			}));

			filteredTransactions.forEach((t) => {
				if (t.amount < 0) {
					const d = new Date(t.date).getDate();
					if (days[d - 1]) days[d - 1].value += Math.abs(t.amount);
				}
			});

			const max = Math.max(...days.map((d) => d.value), 1);
			return days.map((d) => ({
				...d,
				height: Math.max((d.value / max) * 100, 2),
			}));
		} else {
			// --- MONTHLY VIEW ---
			const months = [
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
			];
			const data = months.map((m) => ({ label: m, value: 0, height: 0 }));

			filteredTransactions.forEach((t) => {
				if (t.amount < 0) {
					const mIdx = new Date(t.date).getMonth();
					data[mIdx].value += Math.abs(t.amount);
				}
			});

			const max = Math.max(...data.map((d) => d.value), 1);
			return data.map((d) => ({
				...d,
				height: Math.max((d.value / max) * 100, 2),
			}));
		}
	}, [filteredTransactions, filterContext]);

	// --- 5. CATEGORY GROUPING ---
	const categoryData = useMemo<CategoryData[]>(() => {
		const groups: Record<string, number> = {};
		filteredTransactions
			.filter((t) => t.amount < 0)
			.forEach((t) => {
				const cat = t.category || "Uncategorized";
				groups[cat] = (groups[cat] || 0) + Math.abs(t.amount);
			});

		return Object.entries(groups)
			.sort(([, a], [, b]) => b - a)
			.map(([name, amount], i) => {
				const theme = getCategoryTheme(name);
				return {
					name,
					value: Number(amount.toFixed(2)),
					percent:
						stats.expenses > 0
							? Math.round((amount / stats.expenses) * 100)
							: 0,
					color: theme.bg,
					textColor: theme.text,
					fill: COLORS_HEX[i % COLORS_HEX.length],
					icon: ICON_MAP[name] || ICON_MAP["Uncategorized"],
				};
			});
	}, [filteredTransactions, stats.expenses]);

	// --- NEW: MERCHANT AGGREGATION ---
	const topMerchants = useMemo(() => {
		const map: Record<string, { count: number; total: number }> = {};

		filteredTransactions
			.filter((t) => t.amount < 0)
			.forEach((t) => {
				// Clean merchant: Remove "SQ *" or "TST*" and take the first word
				const cleanName =
					t.merchant
						.replace(/^(SQ\s\*|TST\s\*|PY\s\*|Check\s#\d+\s-\s)/i, "") // Clean prefix
						.split(" ") // Split into words
						.filter((word) => word.length > 0) // Remove empty spaces
						.slice(0, 2) // Take first two words
						.join(" ") || // Join them back
					"Unknown";

				if (!map[cleanName]) map[cleanName] = { count: 0, total: 0 };
				map[cleanName].count++;
				map[cleanName].total += Math.abs(t.amount);
			});

		return Object.entries(map)
			.sort(([, a], [, b]) => b.total - a.total)
			.map(([name, data]) => ({
				name,
				count: data.count,
				total: Number(data.total.toFixed(2)),
			}));
	}, [filteredTransactions]);

	// --- NEW: LARGEST PURCHASES ---
	const largestPurchases = useMemo(() => {
		return [...filteredTransactions] // Spread to avoid mutating original array
			.filter((t) => t.amount < 0)
			.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
			.slice(0, 10); // Usually only need the top 5-10 for UI
	}, [filteredTransactions]);

	const predictedBills = useMemo(() => {
		const merchants: Record<
			string,
			{ dates: number[]; amounts: number[]; category: string }
		> = {};

		transactions.forEach((t) => {
			// Exclude internal payments/transfers
			const isPayment = /PAYMENT|TRANSFER|PMT/i.test(t.merchant);
			if (t.amount < 0 && !isPayment) {
				const name = t.merchant
					.replace(/^(SQ\s\*|TST\s\*|PY\s\*|PAYMENT\s\*)/i, "")
					.split(" ")
					.slice(0, 2)
					.join(" ");

				if (!merchants[name]) {
					merchants[name] = { dates: [], amounts: [], category: t.category };
				}
				merchants[name].dates.push(new Date(t.date).getTime());
				merchants[name].amounts.push(Math.abs(t.amount));
			}
		});

		return Object.entries(merchants)
			.filter(([name, data]) => {
				// 1. Manual Confirmation always wins
				const isManuallyConfirmed = confirmedMerchants.some(
					(m) => m.toLowerCase() === name.toLowerCase(),
				);
				if (isManuallyConfirmed) return true;

				// 2. Must happen at least twice
				if (data.dates.length < 2) return false;

				const catLower = (data.category || "").toLowerCase();

				// 3. Block everyday variable spending
				const variableCategories = [
					"shopping",
					"transportation",
					"groceries",
					"food & drink",
					"gas",
					"dining",
					"restaurants",
					"general",
				];
				if (variableCategories.includes(catLower)) return false;

				// 🌟 THE VIP PASS: Insurance, Utilities, and Housing are automatically trusted
				const isKnownBillCat =
					catLower.includes("insurance") ||
					catLower.includes("utilit") ||
					catLower.includes("housing");

				// 4. Amount Stability
				const maxAmt = Math.max(...data.amounts);
				const minAmt = Math.min(...data.amounts);
				const diff = maxAmt - minAmt;

				// If it's a VIP bill, ignore variance (allows for $15 Renters + $120 Auto)
				const isStableAmount =
					isKnownBillCat || diff <= 10 || diff <= maxAmt * 0.5;

				// 5. Frequency Check (Count unique months)
				const uniqueMonths = new Set(
					data.dates.map((d) => {
						const dateObj = new Date(d);
						return `${dateObj.getFullYear()}-${dateObj.getMonth()}`;
					}),
				).size;

				// If it's a VIP bill, allow it even if 4 policies hit in the exact same month!
				const isSpacedOut = isKnownBillCat || uniqueMonths >= 2;

				return isStableAmount && isSpacedOut;
			})
			.map(([name, data]) => {
				const lastDate = new Date(Math.max(...data.dates));
				const dayOfMonth = lastDate.getDate();

				// Sum split bills accurately
				const uniqueMonths = new Set(
					data.dates.map((d) => {
						const dateObj = new Date(d);
						return `${dateObj.getFullYear()}-${dateObj.getMonth()}`;
					}),
				).size;
				const totalAmount = data.amounts.reduce((a, b) => a + b, 0);
				const avgMonthlyAmount = totalAmount / Math.max(1, uniqueMonths);

				const now = new Date();
				const nextDate = new Date(
					now.getFullYear(),
					now.getMonth(),
					dayOfMonth,
				);
				if (nextDate <= now) {
					nextDate.setMonth(nextDate.getMonth() + 1);
				}

				// ✅ EXACTLY AS REQUESTED: Only Entertainment (and its subcategories) are Subscriptions.
				const catLower = (data.category || "").toLowerCase();
				const isEntertainment =
					catLower.includes("entertainment") ||
					catLower === "music" ||
					catLower === "movies & tv" ||
					catLower === "streaming" ||
					catLower === "games";

				return {
					id: name,
					merchant: name,
					amount: avgMonthlyAmount,
					category: data.category || "Uncategorized",
					dueDate: nextDate,
					dayOfMonth,
					frequency: data.dates.length >= 12 ? "Yearly" : "Monthly",
					// The rest go to Upcoming Recurring Bills
					type: isEntertainment ? "subscription" : "bill",
				};
			})
			.filter((bill) => bill.dueDate > new Date())
			.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
	}, [transactions, confirmedMerchants]);

	const potentialSubscriptions = useMemo(() => {
		const identifiedNames = new Set(
			predictedBills.map((b) => b.merchant.toLowerCase()),
		);

		return transactions
			.filter((t) => {
				const name = t.merchant.toLowerCase();
				const amount = Math.abs(t.amount);

				if (identifiedNames.has(name) || t.amount >= 0) return false;
				if (/PAYMENT|TRANSFER|PMT|DEP/i.test(t.merchant)) return false;

				const catLower = (t.category || "").toLowerCase();

				// ✅ STRICTLY SUBSCRIPTIONS ONLY:
				// Reject anything categorized as housing, utilities, or insurance from the detector.
				if (
					catLower.includes("insurance") ||
					catLower.includes("utilit") ||
					catLower.includes("housing")
				) {
					return false;
				}

				// Detection Fingerprints (Looking for digital services only)
				const hasSubKeyword =
					/PRO|PLUS|PREMIUM|MONTHLY|ANNUAL|SUBS|MEMBERSHIP/i.test(t.merchant);
				const isCommonPricePoint = [
					9.99, 12.99, 14.99, 15.99, 19.99, 29.99, 99.0,
				].includes(amount);
				const isLikelyService =
					/CLAUDE|OPENAI|NETFLIX|SPOTIFY|ADOBE|YOUTUBE|APPLE|GOOGLE|AMAZON|HULU|DISNEY/i.test(
						t.merchant,
					);

				return hasSubKeyword || (isCommonPricePoint && isLikelyService);
			})
			.filter((v, i, a) => a.findIndex((t) => t.merchant === v.merchant) === i)
			.slice(0, 4);
	}, [transactions, predictedBills]);

	return {
		stats,
		categoryData,
		monthlyData,
		maxMonthlyValue: Math.max(...monthlyData.map((d) => d.value), 0),
		topMerchants,
		largestPurchases,
		filteredTransactions,
		yearTabs: ["This Month", "Last Month", "Last 12 Months"],
		predictedBills,
		potentialSubscriptions,
	};
}
