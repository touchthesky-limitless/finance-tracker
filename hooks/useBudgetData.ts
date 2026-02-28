"use client";

import { useMemo } from "react";
import { useBudgetStore } from "@/hooks/useBudgetStore";
import { ICON_MAP } from "@/constants/icons";
import { CategoryData, Merchant } from "@/types/budget";
import { COLORS_HEX, COLORS_TW, TEXT_TW } from "@/data/categories";
import { CATEGORY_HIERARCHY, getCategoryTheme } from "@/constants/categories";

/**
 * The single source of truth for processed budget data.
 * @param timeFilter - "This Month", "Last Month", "Last 12 Months", or a Year string "2026"
 */
export function useBudgetData(timeFilter: string) {
	// 1. Pull raw transactions from store
	const useStore = useBudgetStore();
	const transactions = useStore((state) => state.transactions);

	// 2. Filter Transactions based on the time selection
	const filteredTransactions = useMemo(() => {
		const now = new Date();
		const currentMonth = now.getMonth();
		const currentYear = now.getFullYear();

		const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);
		const lastMonthVal = lastMonthDate.getMonth();
		const lastMonthYear = lastMonthDate.getFullYear();

		return transactions.filter((t) => {
			const txDate = new Date(t.date);
			if (isNaN(txDate.getTime())) return false;

			const txMonth = txDate.getMonth();
			const txYear = txDate.getFullYear();

			// Filter logic
			if (timeFilter === "This Month") {
				return txMonth === currentMonth && txYear === currentYear;
			}
			if (timeFilter === "Last Month") {
				return txMonth === lastMonthVal && txYear === lastMonthYear;
			}
			if (timeFilter === "Last 12 Months") {
				const twelveMonthsAgo = new Date();
				twelveMonthsAgo.setMonth(now.getMonth() - 12);
				return txDate >= twelveMonthsAgo;
			}

			// Year filter (e.g., "2025")
			const filterYear = parseInt(timeFilter, 10);
			if (!isNaN(filterYear)) {
				return txYear === filterYear;
			}

			return true; // Default to all if filter doesn't match
		});
	}, [transactions, timeFilter]);

	// 3. Derived Statistics (Totals)
	const stats = useMemo(() => {
		let income = 0;
		let expenses = 0;
		let unreviewedCount = 0;

		filteredTransactions.forEach((t) => {
			if (t.needsReview) unreviewedCount++;

			if (t.amount > 0) {
				income += t.amount;
			} else {
				expenses += Math.abs(t.amount);
			}
		});

		return {
			income,
			expenses,
			remaining: income - expenses,
			savings: income - expenses,
			unreviewedCount,
			totalTransactions: filteredTransactions.length,
		};
	}, [filteredTransactions]);

	// 4. Category Grouping (for Pie Charts and Budget Bars)
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
					value: Number(amount.toFixed(2)), // Fixed rounding issue
					percent:
						stats.expenses > 0
							? Math.round((amount / stats.expenses) * 100)
							: 0,

					// --- NEW COLOR LOGIC ---
					color: theme.bg, // Used for bg-color in progress bars
					textColor: theme.text, // Used for text-color in legends

					// Fallback fill for charts if they don't support Tailwind classes
					fill: COLORS_HEX[i % COLORS_HEX.length],

					icon: ICON_MAP[name] || ICON_MAP["Uncategorized"],
				};
			});
	}, [filteredTransactions, stats.expenses]);

	// 5. Merchant Aggregation
	const topMerchants = useMemo<Merchant[]>(() => {
		const map: Record<string, { count: number; total: number }> = {};

		filteredTransactions
			.filter((t) => t.amount < 0)
			.forEach((t) => {
				const name = t.description.split(" ")[0] || "Unknown";
				if (!map[name]) map[name] = { count: 0, total: 0 };
				map[name].count++;
				map[name].total += Math.abs(t.amount);
			});

		return Object.entries(map)
			.sort(([, a], [, b]) => b.total - a.total)
			.map(([name, data]) => ({ name, ...data }));
	}, [filteredTransactions]);

	const largestPurchases = useMemo(
		() =>
			filteredTransactions
				.filter((t) => t.amount < 0)
				.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount)),
		[filteredTransactions],
	);

	// 6. Monthly Trend Data (for Bar Charts)
	const monthlyData = useMemo(() => {
		const months = Array(12).fill(0);

		// If filtering by a specific year, use that year's months
		// If "Last 12 Months", this logic would need to be more dynamic
		filteredTransactions
			.filter((t) => t.amount < 0)
			.forEach((t) => {
				const d = new Date(t.date);
				if (!isNaN(d.getTime())) months[d.getMonth()] += Math.abs(t.amount);
			});

		const max = Math.max(...months, 1);
		return months.map((val, i) => ({
			label: new Date(0, i)
				.toLocaleString("default", { month: "short" })
				.toUpperCase(),
			value: val,
			height: (val / max) * 100,
		}));
	}, [filteredTransactions]);

	return {
		filteredTransactions,
		stats,
		categoryData,
		topMerchants,
		largestPurchases,
		monthlyData,
		maxMonthlyValue: Math.max(...monthlyData.map((d) => d.value), 0),
		// Helper to generate tabs in UI
		yearTabs: ["This Month", "Last Month", "Last 12 Months"],
	};
}
