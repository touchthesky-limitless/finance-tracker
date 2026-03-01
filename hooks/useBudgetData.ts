"use client";

import { useMemo } from "react";
import { useBudgetStore } from "@/hooks/useBudgetStore";
import { ICON_MAP } from "@/constants/icons";
import { CategoryData, Merchant } from "@/types/budget";
import { COLORS_HEX } from "@/data/categories";
import { getCategoryTheme } from "@/constants/categories";

export function useBudgetData(timeFilter: string) {
	const useStore = useBudgetStore();
	const transactions = useStore((state) => state.transactions);

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
		const { isSpecificMonth, selectedMonth, selectedYear, now } = filterContext;

		return transactions.filter((t) => {
			const txDate = new Date(t.date);
			if (isNaN(txDate.getTime())) return false;

			const txMonth = txDate.getMonth();
			const txYear = txDate.getFullYear();

			// Case A: Specific Month + Year (Jan 2026)
			if (isSpecificMonth) {
				return txMonth === selectedMonth && txYear === selectedYear;
			}

			// Case B: Preset "This Month"
			if (timeFilter === "This Month") {
				return txMonth === now.getMonth() && txYear === now.getFullYear();
			}

			// Case C: Preset "Last Month"
			if (timeFilter === "Last Month") {
				const lastM = new Date(now.getFullYear(), now.getMonth() - 1, 1);
				return txMonth === lastM.getMonth() && txYear === lastM.getFullYear();
			}

			// Case D: Full Year (Year 2026)
			// 1. Handle "Year 2025", "Year 2026", etc.
			if (timeFilter.startsWith("Year")) {
				const parts = timeFilter.split(" ");
				const selectedYear = parseInt(parts[parts.length - 1]);
				return txYear === selectedYear;
			}
			// 2. Handle "This Year" (System Default)
			if (timeFilter === "This Year") {
				return txYear === new Date().getFullYear();
			}

			// Case E: Last 12 Months
			if (timeFilter === "Last 12 Months") {
				const twelveMonthsAgo = new Date();
				twelveMonthsAgo.setMonth(now.getMonth() - 12);
				return txDate >= twelveMonthsAgo;
			}

			return true;
		});
	}, [transactions, timeFilter, filterContext]);

	// --- 3. DERIVED STATS ---
	const stats = useMemo(() => {
		let income = 0;
		let expenses = 0;
		let unreviewedCount = 0;

		filteredTransactions.forEach((t) => {
			if (t.needsReview) unreviewedCount++;
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
				// Clean description: Remove "SQ *" or "TST*" and take the first word
				const cleanName =
					t.description
						.replace(/^(SQ\s\*|TST\s\*|PY\s\*)/i, "")
						.split(" ")[0] || "Unknown";

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

	return {
		stats,
		categoryData,
		monthlyData,
		maxMonthlyValue: Math.max(...monthlyData.map((d) => d.value), 0),
		topMerchants,
		largestPurchases,
		filteredTransactions,
		yearTabs: ["This Month", "Last Month", "Last 12 Months"],
	};
}
