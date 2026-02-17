import { useMemo } from "react";
import { Transaction } from "@/store/createBudgetStore";
import { CategoryData, Merchant } from "@/types/budget";
import {
	CATEGORY_ICONS,
	COLORS_HEX,
	COLORS_TW,
	TEXT_TW,
} from "@/data/categories";

export function useBudgetData(transactions: Transaction[], timeFilter: string) {
	// 1. Filtered Transactions
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

			// 1. Check for "This Month"
			if (timeFilter === "This Month") {
				return txMonth === currentMonth && txYear === currentYear;
			}

			// 2. Check for "Last Month"
			if (timeFilter === "Last Month") {
				return txMonth === lastMonthVal && txYear === lastMonthYear;
			}

			// 3. Fallback: Check for Year (e.g., "2026", "2025")
			// This is where you add the logic
			const filterYear = parseInt(timeFilter, 10);
			if (!isNaN(filterYear)) {
				return txYear === filterYear;
			}

			return false;
		});
	}, [transactions, timeFilter]);

	// Generate dynamic year tabs
	const yearTabs = useMemo(() => {
		// If no data, default to current and previous year
		if (transactions.length === 0) {
			const currentYear = new Date().getFullYear();
			return [
				"Last Month",
				"This Month",
				currentYear.toString(),
				(currentYear - 1).toString(),
			];
		}

		// Extract unique years from actual transaction dates
		const years = transactions.map((t) => {
			const d = new Date(t.date);
			return isNaN(d.getTime()) ? null : d.getFullYear().toString();
		});

		// Create a unique, sorted list of years
		const uniqueYears = Array.from(new Set(years))
			.filter((y): y is string => y !== null)
			.sort((a, b) => b.localeCompare(a)); // 2026, 2025, etc.

		return ["Last Month", "This Month", ...uniqueYears];
	}, [transactions]);

	// 2. High-level Totals
	const income = useMemo(
		() =>
			filteredTransactions
				.filter((t) => t.amount > 0)
				.reduce((acc, t) => acc + t.amount, 0),
		[filteredTransactions],
	);

	const expenses = useMemo(
		() =>
			filteredTransactions
				.filter((t) => t.amount < 0)
				.reduce((acc, t) => acc + Math.abs(t.amount), 0),
		[filteredTransactions],
	);

	// Savings
	const savings = income - expenses;

	// 3. Category Data (for Pie Chart)
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
			.map(([name, amount], i) => ({
				name,
				value: amount,
				percent: expenses > 0 ? Math.round((amount / expenses) * 100) : 0,
				color: COLORS_TW[i % COLORS_TW.length],
				fill: COLORS_HEX[i % COLORS_HEX.length],
				textColor: TEXT_TW[i % TEXT_TW.length],
				icon: CATEGORY_ICONS[i % CATEGORY_ICONS.length],
			}));
	}, [filteredTransactions, expenses]);

	// 4. Aggregated Merchant Data
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
			.sort(([, a], [, b]) => b.count - a.count)
			.map(([name, data]) => ({ name, ...data }));
	}, [filteredTransactions]);

	// 5. Largest Purchases
	const largestPurchases = useMemo(
		() =>
			filteredTransactions
				.filter((t) => t.amount < 0)
				.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount)),
		[filteredTransactions],
	);

	// 6. Monthly Trend Data
	const monthlyData = useMemo(() => {
		const months = Array(12).fill(0);
		filteredTransactions
			.filter((t) => t.amount < 0)
			.forEach((t) => {
				const d = new Date(t.date);
				if (!isNaN(d.getTime())) months[d.getMonth()] += Math.abs(t.amount);
			});
		const max = Math.max(...months, 1);
		return months.map((val, i) => ({
			label: new Date(0, i).toLocaleString("default", { month: "short" }),
			value: val,
			height: max > 0 ? (val / max) * 100 : 0,
		}));
	}, [filteredTransactions]);

	// Monthly value
	const maxMonthlyValue = useMemo(() => {
		return Math.max(...monthlyData.map((d) => d.value), 0);
	}, [monthlyData]);

	return {
		yearTabs,
		filteredTransactions,
		income,
		expenses,
		savings,
		categoryData,
		topMerchants,
		largestPurchases,
		monthlyData,
		maxMonthlyValue,
	};
}
