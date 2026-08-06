/**
 * Custom hook that aggregates and memoizes dashboard data from the global store.
 * Provides current month transactions, net worth summary, breakdown groups,
 * investment stub, and the full transaction list.
 */
import { useMemo } from "react";
import { useBudgetStore } from "@/store/useBudgetStore";
import { getDateCutoff } from "@/components/Accounts/utils/date";
import { classifyAccount } from "@/components/Accounts/utils/account";
import { ChartPoint } from "@/components/Accounts/types";

export const useDashboardData = () => {
	const transactions = useBudgetStore((state) => state.transactions);
	const accounts = useBudgetStore((state) => state.accounts);
	const investmentsData = {
		total: 366,
		tickers: [{ name: "VTI", price: 365.99, change: 0.22 }],
	};

	const now = useMemo(() => new Date(), []);
	const startOfMonth = useMemo(() => getDateCutoff("1M") as Date, []);
	const startOfLastMonth = useMemo(
		() => new Date(now.getFullYear(), now.getMonth() - 1, 1),
		[now],
	);

	const currentMonthTxs = useMemo(
		() =>
			transactions.filter((tx) => {
				const d = new Date(tx.date);
				return d >= startOfMonth && d <= now;
			}),
		[transactions, now, startOfMonth],
	);

	const lastMonthTxs = useMemo(
		() =>
			transactions.filter((tx) => {
				const d = new Date(tx.date);
				return d >= startOfLastMonth && d < startOfMonth;
			}),
		[transactions, startOfLastMonth, startOfMonth],
	);

	const summary = useMemo(() => {
		let assets = 0,
			liabilities = 0;
		const processed = new Set<string>();

		for (const account of accounts) {
			const balance = account.current_balance || 0;
			const isLiability =
				account.account_type === "Liability" ||
				["Credit Card", "Mortgage", "Loan", "Other Liability"].includes(
					account.account_subtype || "",
				);
			if (isLiability) liabilities += Math.abs(balance);
			else assets += balance;
			processed.add(account.id);
		}

		for (const tx of transactions) {
			const name = tx.account?.trim();
			if (!name) continue;
			const id = tx.account_id?.trim() || name;
			if (processed.has(id)) continue;
			const amount = Number(tx.amount) || 0;
			const classification = classifyAccount(name, amount);
			if (classification.isLiability) liabilities += Math.abs(amount);
			else assets += amount;
			processed.add(id);
		}

		return { assets, liabilities, net: assets - liabilities };
	}, [accounts, transactions]);

	const netWorthPoints = useMemo<ChartPoint[]>(() => {
		const dailyChanges = new Map<string, number>();
		for (const tx of currentMonthTxs) {
			const date = tx.date.slice(0, 10);
			dailyChanges.set(date, (dailyChanges.get(date) || 0) + (tx.amount || 0));
		}
		const sortedDates = Array.from(dailyChanges.keys()).sort();
		let running = summary.net;
		const points: ChartPoint[] = [];
		for (let i = sortedDates.length - 1; i >= 0; i--) {
			const dateStr = sortedDates[i];
			running -= dailyChanges.get(dateStr) || 0;
			const dateObj = new Date(dateStr + "T00:00:00");
			const label = dateObj.toLocaleDateString("en-US", {
				month: "short",
				day: "numeric",
			});
			points.push({ date: dateObj, value: running, label });
		}
		points.reverse();
		if (points.length === 0) {
			const now = new Date();
			const label = now.toLocaleDateString("en-US", {
				month: "short",
				day: "numeric",
			});
			points.push({ date: now, value: summary.net, label });
		}
		return points;
	}, [currentMonthTxs, summary.net]);

	const breakdownGroups = useMemo(() => {
		const assetsMap = new Map<string, number>();
		const liabilitiesMap = new Map<string, number>();
		for (const account of accounts) {
			const amount = Math.abs(account.current_balance || 0);
			const group = account.account_subtype || "Other";
			const isLiability = account.account_type === "Liability";
			if (isLiability)
				liabilitiesMap.set(group, (liabilitiesMap.get(group) || 0) + amount);
			else assetsMap.set(group, (assetsMap.get(group) || 0) + amount);
		}
		const assets = Array.from(assetsMap.entries()).map(([group, amount]) => ({
			group,
			amount,
		}));
		const liabilities = Array.from(liabilitiesMap.entries()).map(
			([group, amount]) => ({ group, amount }),
		);
		assets.sort((a, b) => b.amount - a.amount);
		liabilities.sort((a, b) => b.amount - a.amount);
		return { assets, liabilities };
	}, [accounts]);

	return {
		currentMonthTxs,
		lastMonthTxs,
		investmentsData,
		summary,
		netWorthPoints,
		breakdownGroups,
		transactions,
	};
};
