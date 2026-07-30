"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
	Settings2,
	Sparkles,
	GripVertical,
	Receipt,
	X,
	ChevronDown,
	Check,
	Hourglass,
	FlagTriangleRight,
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";

import { Transaction, useBudgetStore, Account } from "@/store/useBudgetStore";
import {
	formatCurrency,
	formatTooltipValue,
	formatYAxis,
} from "@/utils/formatters";
import type {
	ChartPoint,
	ChartType,
	DateRange,
	Timeframe,
} from "@/components/Accounts/types";
import { NetWorthChart } from "@/components/Accounts/chart/NetWorthChart";
import { getDateCutoff } from "@/components/Accounts/utils/date";
import {
	Area,
	AreaChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { useNetWorthHistory } from "@/hooks/useNetWorthHistory";
import { classifyAccount } from "@/components/Accounts/utils/account";
import { getReportSummary } from "@/components/Reports/reportUtils";
// --- Goals ---
import { useGoalsData } from "@/hooks/useGoalsData";
import { GoalImage } from "@/components/Goals/GoalImage";
import { AccountLogo, ProgressBar } from "@/components/Goals/GoalsUI";
import { formatGoalDate, getGoalProgress } from "@/lib/goals/formatters";
import type { GoalAccountView, SavingsGoal } from "@/lib/goals/types";
import Link from "next/link";
import * as Select from "@radix-ui/react-select";
import React from "react";
import { DataTable } from "@/components/Transactions/DataTable";
import { SortingState } from "@tanstack/react-table";
import { useTransactionDrawer } from "@/store/useTransactionDrawer";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { MOBILE_BREAKPOINT } from "@/config/breakpoints";
import { useRouter } from "next/navigation";
// --- Recurring ---
import { useRecurringStore } from "@/store/useRecurringStore";
import { getOccurrencesForMonth } from "@/components/Recurring/recurringUtils";
import { formatDateShort } from "@/utils/formatters";
import { CategoryGlyph } from "@/components/Categories/CategoryGlyph";
import { appendNavigationSource } from "@/lib/navigation/breadcrumb";
import type { RecurringOccurrence } from "@/components/Recurring/types";
import { MerchantLogo } from "@/components/Merchants/MerchantLogo";
import { getCategoryTheme } from "@/constants/categories";
// --- Stock ---
import { StockData } from "@/lib/types";
import FinancialCard from "@/components/Stocks/FinancialCard";
import Image from "next/image";
import { createClient } from "@/lib/supabase";
// --- Top Categories ---
import { getIconForCategory } from "@/lib/categoryIcons";
import { CategoryDetailDrawer } from "@/components/Categories/CategoryDetailDrawer";

// -----------------------------------------------------------------------------
// 1. HELPER LOGIC (Data Aggregation from Store)
// -----------------------------------------------------------------------------
const useDashboardData = () => {
	const transactions = useBudgetStore((state) => state.transactions);
	const accounts = useBudgetStore((state) => state.accounts);
	const investmentsData = {
		total: 366,
		tickers: [{ name: "VTI", price: 365.99, change: 0.22 }],
	};

	// Memoize dates to keep them stable
	const now = useMemo(() => new Date(), []);
	const startOfMonth = useMemo(() => getDateCutoff("1M") as Date, []);
	const startOfLastMonth = useMemo(
		() => new Date(now.getFullYear(), now.getMonth() - 1, 1),
		[now],
	);

	const currentMonthTxs = useMemo(() => {
		return transactions.filter((tx) => {
			const d = new Date(tx.date);
			return d >= startOfMonth && d <= now;
		});
	}, [transactions, now, startOfMonth]);

	const lastMonthTxs = useMemo(() => {
		return transactions.filter((tx) => {
			const d = new Date(tx.date);
			return d >= startOfLastMonth && d < startOfMonth;
		});
	}, [transactions, startOfLastMonth, startOfMonth]);

	// ✅ Compute summary from all accounts (same as visibleAccounts when no filters)
	const summary = useMemo(() => {
		let assets = 0,
			liabilities = 0;
		const processed = new Set<string>();

		// 1. Start with store accounts (these hold the true current balances)
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

		// 2. Add accounts derived from transactions, but ONLY if they don't already exist
		for (const tx of transactions) {
			const name = tx.account?.trim();
			if (!name) continue;
			const id = tx.account_id?.trim() || name;
			if (processed.has(id)) continue; // already accounted for

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
		transactions, // expose all transactions for spending widget
	};
};

// -----------------------------------------------------------------------------
// 2. REUSABLE UI COMPONENTS
// -----------------------------------------------------------------------------

function CustomizeDashboardModal() {
	const [open, setOpen] = useState(false);
	const [widgets, setWidgets] = useState([
		{ id: "recap", label: "Weekly Recap", active: true },
		{ id: "budget", label: "Budget", active: true },
		{ id: "spending", label: "Spending trend", active: true },
		{ id: "transactions", label: "Transactions", active: true },
		{ id: "networth", label: "Net worth", active: true },
		{ id: "recurring", label: "Recurring transactions", active: true },
		{ id: "investments", label: "Investments", active: true },
		{ id: "advice", label: "Advice", active: false },
		{ id: "credit_score", label: "Credit score", active: false },
		{ id: "getting_started", label: "Getting started guide", active: false },
	]);

	const toggleWidget = (id: string) => {
		setWidgets((prev) =>
			prev.map((w) => (w.id === id ? { ...w, active: !w.active } : w)),
		);
	};

	return (
		<Dialog.Root open={open} onOpenChange={setOpen}>
			<Dialog.Trigger asChild>
				<button className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
					<Settings2 size={14} />
					Customize
				</button>
			</Dialog.Trigger>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 z-[999] bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
				<Dialog.Content className="fixed left-1/2 top-1/2 z-[1000] w-full max-w-3xl -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl outline-none dark:bg-[#1B1B1B]">
					<div className="flex items-center justify-between">
						<div>
							<h2 className="text-lg font-bold text-gray-900 dark:text-white">
								Customize dashboard
							</h2>
							<p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
								Select the widgets you want to see on your dashboard
							</p>
						</div>
						<Dialog.Close asChild>
							<button className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-white/5">
								<svg
									width="24"
									height="24"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<path d="M18 6L6 18" />
									<path d="M6 6l12 12" />
								</svg>
							</button>
						</Dialog.Close>
					</div>

					<div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
						{widgets.map((w) => (
							<div
								key={w.id}
								className="flex items-center gap-4 rounded-xl border border-gray-200 bg-gray-50/50 p-4 dark:border-white/5 dark:bg-white/5"
							>
								<GripVertical
									className="text-gray-400 dark:text-gray-500"
									size={18}
								/>
								<span className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-200">
									{w.label}
								</span>
								<button
									type="button"
									role="switch"
									aria-checked={w.active}
									onClick={() => toggleWidget(w.id)}
									className={`relative h-6 w-11 rounded-full transition-colors ${
										w.active ? "bg-[#FF5A35]" : "bg-gray-300 dark:bg-gray-600"
									}`}
								>
									<span
										className={`absolute top-[3px] block size-[18px] rounded-full bg-white transition-all ${
											w.active ? "right-[3px]" : "left-[3px]"
										}`}
									/>
								</button>
							</div>
						))}
					</div>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}

// The generic wrapper for every widget
function WidgetShell({
	title,
	subtitle,
	dropdown,
	className = "",
	children,
}: {
	title: string;
	subtitle?: string | React.ReactNode;
	dropdown?: React.ReactNode;
	className?: string;
	children: React.ReactNode;
}) {
	const isMobile = useMediaQuery(MOBILE_BREAKPOINT);
	return (
		<div
			className={`rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/5 dark:bg-[#232322] ${isMobile ? "p-4" : "p-5"} ${className}`}
		>
			<div className="mb-4 flex items-center justify-between">
				<div className="flex items-center gap-2">
					<GripVertical
						className="text-gray-300 dark:text-gray-600"
						size={18}
					/>
					<h3
						className={`font-bold text-gray-900 dark:text-white ${isMobile ? "text-[15px]" : "text-[17px]"}`}
					>
						{title}
						{subtitle && (
							<span
								className={`ml-2 text-sm font-medium text-gray-500 dark:text-gray-400 ${isMobile ? "text-xs" : "text-sm"}`}
							>
								{subtitle}
							</span>
						)}
					</h3>
					<Sparkles size={16} className="text-orange-400" />
				</div>
				{dropdown && <div className="shrink-0">{dropdown}</div>}
			</div>
			{children}
		</div>
	);
}

// -----------------------------------------------------------------------------
// 3. SPECIFIC WIDGETS
// -----------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function BudgetWidget({ txs: _txs }: { txs: Transaction[] }) {
	const isMobile = useMediaQuery(MOBILE_BREAKPOINT);
	// Mock computed values for the image rendering
	const planned = 310;
	const fixedSpent = 18621;
	const flexSpent = 491;
	const flexPlanned = 1180;
	const nonMonthlyPlanned = 1450;
	const nonMonthlySpent = 0;

	return (
		<WidgetShell
			title="Budget"
			subtitle="July 2026"
			dropdown={
				<select
					className={`rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-sm font-medium outline-none dark:border-white/10 dark:bg-[#2a2a2a] ${isMobile ? "w-full" : "w-auto"}`}
				>
					<option>Expenses</option>
					<option>Summary</option>
				</select>
			}
		>
			<div className="space-y-5">
				<div>
					<div className="mb-1 flex items-center justify-between text-sm">
						<span className="font-medium text-gray-900 dark:text-white">
							Fixed
						</span>
						<span className="text-gray-500 dark:text-gray-400">
							${planned.toLocaleString()} planned
						</span>
					</div>
					<div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
						<div className="h-full w-full bg-red-500/80 rounded-full" />
					</div>
					<div className="mt-1 flex items-center justify-between text-sm">
						<span className="font-bold text-gray-900 dark:text-white">
							${fixedSpent.toLocaleString()} spent
						</span>
						<span className="font-bold text-red-500 dark:text-red-400">
							${(planned - fixedSpent).toLocaleString()} remaining
						</span>
					</div>
				</div>

				<div>
					<div className="mb-1 flex items-center justify-between text-sm">
						<span className="font-medium text-gray-900 dark:text-white">
							Flexible
						</span>
						<span className="text-gray-500 dark:text-gray-400">
							${flexPlanned.toLocaleString()} planned
						</span>
					</div>
					<div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
						<div className="h-full w-[42%] bg-emerald-500/80 rounded-full" />
					</div>
					<div className="mt-1 flex items-center justify-between text-sm">
						<span className="font-bold text-gray-900 dark:text-white">
							${flexSpent.toLocaleString()} spent
						</span>
						<span className="font-bold text-emerald-500 dark:text-emerald-400">
							${(flexPlanned - flexSpent).toLocaleString()} remaining
						</span>
					</div>
				</div>

				<div>
					<div className="mb-1 flex items-center justify-between text-sm">
						<span className="font-medium text-gray-900 dark:text-white">
							Non-Monthly
						</span>
						<span className="text-gray-500 dark:text-gray-400">
							${nonMonthlyPlanned.toLocaleString()} planned
						</span>
					</div>
					<div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-white/10" />
					<div className="mt-1 flex items-center justify-between text-sm">
						<span className="font-bold text-gray-900 dark:text-white">
							${nonMonthlySpent.toLocaleString()} spent
						</span>
						<span className="font-bold text-emerald-500 dark:text-emerald-400">
							${nonMonthlyPlanned.toLocaleString()} remaining
						</span>
					</div>
				</div>
			</div>
		</WidgetShell>
	);
}

// Extended period types
type SpendingPeriod =
	| "week"
	| "month"
	| "month_last_year"
	| "month_average"
	| "year";

function getDateRangesForPeriod(period: SpendingPeriod): {
	currentStart: Date;
	currentEnd: Date;
	previousStart: Date;
	previousEnd: Date;
} {
	const now = new Date();
	let currentStart: Date, previousStart: Date, previousEnd: Date;

	if (period === "week") {
		// Start of current week (Monday)
		const dayOfWeek = now.getDay(); // 0=Sunday
		const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
		currentStart = new Date(now);
		currentStart.setDate(now.getDate() - diff);
		currentStart.setHours(0, 0, 0, 0);

		previousStart = new Date(currentStart);
		previousStart.setDate(currentStart.getDate() - 7);
		previousEnd = new Date(currentStart);
		previousEnd.setDate(currentStart.getDate() - 1);
		previousEnd.setHours(23, 59, 59, 999);
	} else if (
		period === "month" ||
		period === "month_last_year" ||
		period === "month_average"
	) {
		currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
		// For month_last_year, previous is same month last year
		if (period === "month_last_year") {
			previousStart = new Date(now.getFullYear() - 1, now.getMonth(), 1);
			previousEnd = new Date(now.getFullYear() - 1, now.getMonth() + 1, 0);
		} else {
			// For month and month_average, previous is last month
			previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
			previousEnd = new Date(now.getFullYear(), now.getMonth(), 0);
		}
	} else {
		// year
		currentStart = new Date(now.getFullYear(), 0, 1);
		previousStart = new Date(now.getFullYear() - 1, 0, 1);
		previousEnd = new Date(now.getFullYear() - 1, 11, 31);
	}

	return {
		currentStart,
		currentEnd: now,
		previousStart,
		previousEnd,
	};
}

// Compute average month spending from the last 12 months (excluding current month)
function computeAverageMonthData(
	transactions: Transaction[],
): Map<number, number> {
	const now = new Date();
	const averages = new Map<number, { total: number; count: number }>();

	for (let i = 1; i <= 12; i++) {
		const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
		const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

		const monthTxs = transactions.filter((tx) => {
			const d = new Date(tx.date);
			return d >= monthStart && d <= monthEnd && tx.amount < 0;
		});

		const dailyCumulative = new Map<number, number>();
		let cumulative = 0;
		const sorted = monthTxs.sort(
			(a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
		);
		for (const tx of sorted) {
			const day = new Date(tx.date).getDate();
			cumulative += Math.abs(tx.amount);
			dailyCumulative.set(day, cumulative);
		}

		const daysInMonth = monthEnd.getDate();
		for (let day = 1; day <= daysInMonth; day++) {
			const val = dailyCumulative.get(day) || 0;
			const entry = averages.get(day) || { total: 0, count: 0 };
			entry.total += val;
			entry.count += 1;
			averages.set(day, entry);
		}
	}

	const result = new Map<number, number>();
	for (const [day, entry] of averages) {
		result.set(day, entry.total / entry.count);
	}
	return result;
}

const SelectItem = React.forwardRef<
	HTMLDivElement,
	Select.SelectItemProps & { children: React.ReactNode }
>(({ children, ...props }, forwardedRef) => {
	return (
		<Select.Item
			{...props}
			ref={forwardedRef}
			className="relative flex w-full cursor-default select-none items-center rounded-md px-3 py-2 text-sm font-medium outline-none hover:bg-gray-100 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 dark:text-gray-200 dark:hover:bg-white/10"
		>
			<Select.ItemText>{children}</Select.ItemText>
		</Select.Item>
	);
});
SelectItem.displayName = "SelectItem";

// UPDATED: Now supports more periods and X-axis uses "Day 1", "Day 2", etc.
function SpendingWidget({ transactions }: { transactions: Transaction[] }) {
	const [period, setPeriod] = useState<SpendingPeriod>("month");

	// Compute date ranges based on selected period
	const ranges = useMemo(() => getDateRangesForPeriod(period), [period]);

	// Filter transactions for current and previous periods (spending only)
	const currentTxs = useMemo(() => {
		return transactions.filter((tx) => {
			const d = new Date(tx.date);
			return (
				d >= ranges.currentStart && d <= ranges.currentEnd && tx.amount < 0
			);
		});
	}, [transactions, ranges]);

	const previousTxs = useMemo(() => {
		// For "month_average", we don't have a single previous period; we'll handle separately
		if (period === "month_average") return [];
		return transactions.filter((tx) => {
			const d = new Date(tx.date);
			return (
				d >= ranges.previousStart && d <= ranges.previousEnd && tx.amount < 0
			);
		});
	}, [transactions, ranges, period]);

	// Use getReportSummary to compute totals (consistent with Reports page)
	const currentSummary = useMemo(
		() => getReportSummary(currentTxs),
		[currentTxs],
	);

	// Compute chart data
	const chartData = useMemo(() => {
		if (period === "year") {
			// For year, show cumulative spending by month
			const currentMonthData = new Map<string, number>();
			let cum = 0;
			const sortedCurrent = [...currentTxs].sort(
				(a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
			);
			for (const tx of sortedCurrent) {
				const monthLabel = new Date(tx.date).toLocaleDateString("en-US", {
					month: "short",
				});
				cum += Math.abs(tx.amount);
				currentMonthData.set(monthLabel, cum);
			}

			const previousMonthData = new Map<string, number>();
			cum = 0;
			const sortedPrevious = [...previousTxs].sort(
				(a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
			);
			for (const tx of sortedPrevious) {
				const monthLabel = new Date(tx.date).toLocaleDateString("en-US", {
					month: "short",
				});
				cum += Math.abs(tx.amount);
				previousMonthData.set(monthLabel, cum);
			}

			// Get all month keys
			const allMonths = new Set([
				...currentMonthData.keys(),
				...previousMonthData.keys(),
			]);
			const sortedMonths = Array.from(allMonths).sort((a, b) => {
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
				return months.indexOf(a) - months.indexOf(b);
			});

			return sortedMonths.map((month) => ({
				day: month,
				current: currentMonthData.get(month) || 0,
				previous: previousMonthData.get(month) || 0,
			}));
		}

		// For week, month, month_last_year, month_average: use day numbers
		// Build cumulative maps for current period
		const currentMap = new Map<number, number>();
		let cumulative = 0;
		const sortedCurrent = [...currentTxs].sort(
			(a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
		);
		for (const tx of sortedCurrent) {
			const day = new Date(tx.date).getDate();
			cumulative += Math.abs(tx.amount);
			currentMap.set(day, cumulative);
		}

		// Build cumulative maps for previous period (if not month_average)
		const previousMap = new Map<number, number>();
		if (period !== "month_average") {
			cumulative = 0;
			const sortedPrevious = [...previousTxs].sort(
				(a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
			);
			for (const tx of sortedPrevious) {
				const day = new Date(tx.date).getDate();
				cumulative += Math.abs(tx.amount);
				previousMap.set(day, cumulative);
			}
		}

		// For month_average, compute average month data
		if (period === "month_average") {
			const averageMap = computeAverageMonthData(transactions);
			// Merge current and average
			const allDays = new Set([...currentMap.keys(), ...averageMap.keys()]);
			const sortedDays = Array.from(allDays).sort((a, b) => a - b);
			return sortedDays.map((day) => ({
				day: `Day ${day}`,
				current: currentMap.get(day) || 0,
				previous: averageMap.get(day) || 0,
			}));
		}

		// For week and month: use days from 1 to max day in current period
		const daysInCurrentPeriod =
			period === "week" ? 7 : new Date(ranges.currentEnd).getDate();
		const data = [];
		for (let day = 1; day <= daysInCurrentPeriod; day++) {
			data.push({
				day: `Day ${day}`,
				current: currentMap.get(day) || 0,
				previous: previousMap.get(day) || 0,
			});
		}
		return data;
	}, [currentTxs, previousTxs, period, ranges, transactions]);

	return (
		<WidgetShell
			title="Spending"
			subtitle={`${formatCurrency(currentSummary.totalExpenses)} this ${period === "year" ? "year" : "month"}`}
			dropdown={
				<Select.Root
					value={period}
					onValueChange={(value) => setPeriod(value as SpendingPeriod)}
				>
					<Select.Trigger className="inline-flex w-full max-w-[160px] items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium outline-none ring-offset-white transition-colors hover:bg-gray-100 focus:ring-2 focus:ring-[#FF5A35] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:max-w-full sm:text-sm dark:border-white/10 dark:bg-[#2a2a2a] dark:hover:bg-[#333] dark:focus:ring-offset-[#1B1B1B]">
						<Select.Value placeholder="Select period" />
						<Select.Icon className="ml-2">
							<ChevronDown
								size={16}
								className="text-gray-500 dark:text-gray-400"
							/>
						</Select.Icon>
					</Select.Trigger>

					<Select.Portal>
						<Select.Content
							className="z-[1000] w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-md dark:border-white/10 dark:bg-[#2a2a2a]"
							position="popper"
							sideOffset={4}
						>
							<Select.Viewport className="p-1">
								<SelectItem value="week">This week vs. last week</SelectItem>
								<SelectItem value="month">This month vs. last month</SelectItem>
								<SelectItem value="month_last_year">
									This month vs. last year
								</SelectItem>
								<SelectItem value="month_average">
									This month vs. average month
								</SelectItem>
								<SelectItem value="year">This year vs. last year</SelectItem>
							</Select.Viewport>
						</Select.Content>
					</Select.Portal>
				</Select.Root>
			}
		>
			<div className="h-[140px] w-full">
				<ResponsiveContainer width="100%" height="100%">
					<AreaChart
						data={chartData}
						margin={{ top: 10, right: 0, bottom: 0, left: 0 }}
					>
						<CartesianGrid
							strokeDasharray="3 3"
							vertical={false}
							stroke="#f0f0f0"
						/>
						<XAxis
							dataKey="day"
							axisLine={false}
							tickLine={false}
							tick={{ fontSize: 10, fill: "#999" }}
						/>
						<YAxis
							axisLine={false}
							tickLine={false}
							tick={{ fontSize: 10, fill: "#999" }}
							tickFormatter={formatYAxis}
							width={40}
						/>
						<Tooltip
							wrapperStyle={{ fontSize: 12 }}
							formatter={formatTooltipValue}
						/>
						<Area
							type="monotone"
							dataKey="previous"
							stroke="#888"
							strokeWidth={2}
							fill="#888"
							fillOpacity={0.0}
						/>
						<Area
							type="monotone"
							dataKey="current"
							stroke="#FF6B2C"
							strokeWidth={2}
							fill="#FF6B2C"
							fillOpacity={0.15}
						/>
					</AreaChart>
				</ResponsiveContainer>
			</div>
			<div className="mt-2 flex items-center justify-center gap-6 text-[11px] font-medium text-gray-500 dark:text-gray-400">
				<div className="flex items-center gap-1.5">
					<span className="h-0.5 w-5 bg-gray-400 rounded-full" /> Previous
					period
				</div>
				<div className="flex items-center gap-1.5">
					<span className="h-0.5 w-5 bg-[#FF6B2C] rounded-full" /> This period
				</div>
			</div>
		</WidgetShell>
	);
}

function NetWorthWidget({
	summary,
	breakdownGroups,
}: {
	summary: { assets: number; liabilities: number; net: number };
	breakdownGroups: {
		assets: { group: string; amount: number }[];
		liabilities: { group: string; amount: number }[];
	};
}) {
	const [chartType, setChartType] = useState<ChartType>("performance");
	const [dateRange, setDateRange] = useState<DateRange>("1M");
	const [timeframe, setTimeframe] = useState<Timeframe>("month");

	const { points } = useNetWorthHistory({
		dateRange,
		timeframe,
		currentNetWorth: summary.net,
	});

	return (
		<div className="h-72 sm:h-80 md:h-96 lg:h-96 w-full flex flex-col">
			<NetWorthChart
				key={dateRange}
				chartType={chartType}
				dateRange={dateRange}
				timeframe={timeframe}
				points={points}
				summary={summary}
				breakdownGroups={breakdownGroups}
				onChartTypeChange={setChartType}
				onDateRangeChange={setDateRange}
				onTimeframeChange={setTimeframe}
				chartHeight="100%"
				className="flex-1 min-h-0"
			/>
		</div>
	);
}

function TransactionsWidget({ transactions }: { transactions: Transaction[] }) {
	const isMobile = useMediaQuery(MOBILE_BREAKPOINT);
	const [sorting] = useState<SortingState>([{ id: "date", desc: true }]);
	const top5 = useMemo(() => transactions.slice(0, 5), [transactions]);
	const openDrawer = useTransactionDrawer((state) => state.openDrawer);
	const customCategories = useBudgetStore((state) => state.customCategories);

	const getCategoryId = useCallback(
		(categoryName: string) => {
			const normalized = categoryName.trim().toLowerCase();
			const found = customCategories.find(
				(cat) => cat.name.trim().toLowerCase() === normalized,
			);
			return found?.id;
		},
		[customCategories],
	);

	return (
		<WidgetShell
			title="Transactions"
			subtitle="Most recent"
			className="!p-2 overflow-hidden"
			dropdown={
				<select className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-sm font-medium outline-none dark:border-white/10 dark:bg-[#2a2a2a]">
					<option>All transactions</option>
					<option>Needs Review</option>
				</select>
			}
		>
			{/* Wrapper with a fixed height allows the DataTable to virtualize properly */}
			<div
				className={`w-full overflow-hidden ${isMobile ? "h-[290px]" : "h-[300px]"}`}
			>
				<DataTable
					transactions={top5}
					selectedIds={[]}
					onSelectRow={() => {}}
					onRowClick={(transaction) => openDrawer(transaction.id)}
					columnVisibility={{
						account: false, // Hides the Account column
					}}
					isEditMode={false}
					currentView="all"
					sorting={sorting}
					// Hide the extra navigation arrows to match the exact image layout
					isMerchantNavigationEnabled={true}
					getCategoryId={getCategoryId}
					isCategoryView
					disableDateGrouping={true}
					// columnWidths={{ merchant: 22, category: 280, amount: 80 }}
				/>
			</div>
		</WidgetShell>
	);
}

function RecurringWidget() {
	const router = useRouter();
	const [period, setPeriod] = useState<"month" | "week" | "two-weeks">(
		"two-weeks",
	);

	const records = useRecurringStore((state) => state.records);
	const transactions = useBudgetStore((state) => state.transactions);
	const fetchRecurringData = useRecurringStore(
		(state) => state.fetchRecurringData,
	);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const load = async () => {
			try {
				await fetchRecurringData();
			} catch (error) {
				console.error("Failed to load recurring data:", error);
			} finally {
				setIsLoading(false);
			}
		};
		load();
	}, [fetchRecurringData]);

	const occurrences = useMemo(() => {
		if (isLoading || records.length === 0) return [];

		const now = new Date();
		now.setHours(0, 0, 0, 0);

		let startDate: Date;
		let endDate: Date;
		let allGenerated: RecurringOccurrence[] = [];

		if (period === "month") {
			startDate = new Date(now.getFullYear(), now.getMonth(), 1);
			endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
			allGenerated = getOccurrencesForMonth(records, startDate, transactions);
		} else if (period === "week") {
			const dayOfWeek = now.getDay();
			const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
			startDate = new Date(now);
			startDate.setDate(now.getDate() - diff);
			endDate = new Date(startDate);
			endDate.setDate(startDate.getDate() + 6);
			endDate.setHours(23, 59, 59, 999);
			allGenerated = getOccurrencesForMonth(records, startDate, transactions);
		} else {
			startDate = new Date(now);
			endDate = new Date(now);
			endDate.setDate(now.getDate() + 13);
			endDate.setHours(23, 59, 59, 999);

			const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
			const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
			allGenerated = [
				...getOccurrencesForMonth(records, currentMonthStart, transactions),
				...getOccurrencesForMonth(records, nextMonthStart, transactions),
			];
		}

		return allGenerated.filter((occ) => {
			const d = new Date(occ.date);
			return d >= startDate && d <= endDate;
		});
	}, [records, transactions, period, isLoading]);

	const totalDue = useMemo(
		() =>
			occurrences.reduce((sum, occ) => sum + Math.abs(occ.record.amount), 0),
		[occurrences],
	);

	const upcoming = useMemo(() => occurrences.slice(0, 5), [occurrences]);
	const showSeeRecurring = upcoming.length === 0;

	const formatFrequency = (freq: string) =>
		freq.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

	return (
		<WidgetShell
			title="Recurring"
			subtitle={
				<>
					<span className="text-red-500 dark:text-red-400">
						{formatCurrency(totalDue)}
					</span>
					<span className="text-gray-500 dark:text-gray-400">
						{" "}
						remaining due
					</span>
				</>
			}
			dropdown={
				<select
					className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-sm font-medium outline-none dark:border-white/10 dark:bg-[#2a2a2a]"
					value={period}
					onChange={(e) =>
						setPeriod(e.target.value as "month" | "week" | "two-weeks")
					}
				>
					<option value="two-weeks">Next two weeks</option>
					<option value="week">This week</option>
					<option value="month">This month</option>
				</select>
			}
		>
			{isLoading ? (
				<div className="flex items-center justify-center py-8 text-sm text-gray-500">
					Loading recurring…
				</div>
			) : upcoming.length > 0 ? (
				<div className="space-y-4">
					{upcoming.map((occ) => {
						const record = occ.record;

						const date = new Date(occ.date);
						const now = new Date();
						const diffDays = Math.ceil(
							(date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
						);
						const formattedDate = formatDateShort(
							date.toISOString().slice(0, 10),
						);

						const theme = getCategoryTheme(
							record.categoryName || "Uncategorized",
						);
						const categoryColor = theme.text;

						return (
							<div
								key={occ.id}
								className="flex items-center justify-between border-b border-gray-100 pb-3 last:border-0 dark:border-white/5"
							>
								<div className="min-w-0 flex-1 pr-4">
									<div className="flex items-center gap-2">
										<button
											type="button"
											onClick={() => {
												if (record.merchantId) {
													router.push(
														appendNavigationSource(
															`/merchants/${encodeURIComponent(record.merchantId)}`,
															"dashboard",
														),
													);
												}
											}}
											disabled={!record.merchantId}
											className="shrink-0 disabled:cursor-default ${categoryColor}"
										>
											<MerchantLogo
												name={record.merchantName}
												logoUrl={record.logoUrl}
												size="sm"
											/>
										</button>
										<div className="min-w-0 flex flex-col">
											<button
												type="button"
												onClick={() => {
													if (record.merchantId) {
														router.push(
															appendNavigationSource(
																`/merchants/${encodeURIComponent(record.merchantId)}`,
																"dashboard",
															),
														);
													}
												}}
												disabled={!record.merchantId}
												className="truncate text-left text-sm font-medium text-gray-900 transition-colors hover:text-cyan-600 focus-visible:text-cyan-600 disabled:cursor-default dark:text-white dark:hover:text-cyan-400 dark:focus-visible:text-cyan-400"
											>
												{record.merchantName}
											</button>
											<div className="flex items-center gap-1.5 text-[10px] text-gray-500 dark:text-gray-400 ">
												<button
													type="button"
													onClick={() => {
														if (record.categoryId) {
															router.push(
																appendNavigationSource(
																	`/categories/${encodeURIComponent(record.categoryId)}`,
																	"dashboard",
																),
															);
														}
													}}
													disabled={!record.categoryId}
													className={`flex items-center gap-1 hover:underline focus:underline disabled:cursor-default ${categoryColor}`}
												>
													<CategoryGlyph
														name={record.categoryName}
														size={12}
														colorClass={categoryColor}
													/>
													{record.categoryName || "Uncategorized"}
												</button>
												<span>•</span>
												<span>{formatFrequency(record.frequency)}</span>
											</div>
										</div>
									</div>
								</div>

								<div className="flex flex-col items-end shrink-0 text-right">
									<span className="text-sm font-bold text-gray-900 dark:text-white">
										{formatCurrency(Math.abs(record.amount))}
									</span>
									<div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400">
										<span>{formattedDate}</span>
										<span>
											(
											{diffDays < 0
												? `${Math.abs(diffDays)} days ago`
												: diffDays === 0
													? "Today"
													: `in ${diffDays} days`}
											)
										</span>
										<span className="shrink-0">
											{diffDays < 0 && (
												<Check size={12} className={categoryColor} />
											)}
											{diffDays === 0 && (
												<FlagTriangleRight
													size={12}
													className={categoryColor}
												/>
											)}
											{diffDays > 0 && (
												<Hourglass size={12} className={categoryColor} />
											)}
										</span>
									</div>
								</div>
							</div>
						);
					})}
				</div>
			) : (
				<div className="flex flex-col items-center justify-center py-6 text-center">
					<div className="flex size-12 items-center justify-center rounded-full bg-orange-100 text-orange-500 dark:bg-orange-500/20">
						<Receipt size={22} />
					</div>
					<h4 className="mt-3 text-base font-bold text-gray-900 dark:text-white">
						No upcoming bills
					</h4>
					<p className="mt-1 max-w-[240px] text-sm text-gray-500 dark:text-gray-400">
						You’re all set for this period!
					</p>
				</div>
			)}

			{showSeeRecurring && (
				<button
					onClick={() => router.push("/recurring")}
					className="mt-4 w-full rounded-lg bg-[#FF5A35] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#E04825]"
				>
					See recurring →
				</button>
			)}
		</WidgetShell>
	);
}

// Full list of available symbols (must match the API's FULL_WATCHLIST)
const AVAILABLE_SYMBOLS = [
	"VTI",
	"MSFT",
	"NVDA",
	"MU",
	"SNDK",
	"VXUS",
	"MSTR",
	"QQQM",
	"TSLA",
	"META",
	"GOOG",
	"AAPL",
];

const STORAGE_KEY = "dashboard-widget-stock-symbols";
const MAX_STOCKS = 5; // maximum number of stocks to show on dashboard
const supabase = createClient();

function InvestmentsWidget() {
	const isMobile = useMediaQuery(MOBILE_BREAKPOINT);
	const router = useRouter();
	const [stocks, setStocks] = useState<StockData[]>([]);
	const [loading, setLoading] = useState(true);

	// State to hold the full map of stock data (with logos) for the settings modal
	const [allStocksMap, setAllStocksMap] = useState<Record<string, StockData>>(
		{},
	);

	// Settings state
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [selectedSymbols, setSelectedSymbols] = useState<string[]>([]);
	const [tempSelected, setTempSelected] = useState<string[]>([]);
	const [userId, setUserId] = useState<string | null>(null);

	// Fetch current user ID and load preferences
	useEffect(() => {
		const loadUserAndPreferences = async () => {
			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (!user) return;
			setUserId(user.id);

			// Try to load from Supabase first
			const { data, error } = await supabase
				.from("user_preferences")
				.select("dashboard_stock_symbols")
				.eq("user_id", user.id)
				.maybeSingle();

			if (!error && data && data?.dashboard_stock_symbols?.length > 0) {
				const symbols = data.dashboard_stock_symbols.filter((sym: string) =>
					AVAILABLE_SYMBOLS.includes(sym),
				);
				if (symbols.length > 0) {
					setSelectedSymbols(symbols);
					localStorage.setItem(STORAGE_KEY, JSON.stringify(symbols));
					return;
				}
			}

			// Fallback to localStorage
			try {
				const stored = localStorage.getItem(STORAGE_KEY);
				if (stored) {
					const parsed = JSON.parse(stored);
					const filtered = parsed.filter((sym: string) =>
						AVAILABLE_SYMBOLS.includes(sym),
					);
					if (filtered.length > 0) {
						setSelectedSymbols(filtered);
						return;
					}
				}
			} catch (e) {
				console.error("Failed to read stock widget settings", e);
			}

			// Default to first 3
			setSelectedSymbols(AVAILABLE_SYMBOLS.slice(0, 3));
		};
		loadUserAndPreferences();
	}, []);

	// Fetch the full watchlist to get logos for the settings modal (runs once)
	useEffect(() => {
		const fetchAllStocks = async () => {
			try {
				const res = await fetch("/api/stocks"); // fetches all 12 stocks
				const data = await res.json();
				const map: Record<string, StockData> = {};
				data.forEach((stock: StockData) => {
					if (stock.symbol) map[stock.symbol] = stock;
				});
				setAllStocksMap(map);
			} catch (err) {
				console.error("Failed to fetch full stock list for settings", err);
			}
		};
		fetchAllStocks();
	}, []);

	// Fetch stocks for dashboard when selectedSymbols changes
	useEffect(() => {
		let isMounted = true;
		const loadStocks = async () => {
			if (selectedSymbols.length === 0) {
				if (isMounted) {
					setStocks([]);
					setLoading(false);
				}
				return;
			}
			if (isMounted) setLoading(true);
			try {
				const res = await fetch(
					`/api/stocks?symbols=${selectedSymbols.join(",")}`,
				);
				const data = await res.json();
				if (isMounted) setStocks(data);
			} catch (err) {
				console.error("Failed to load stocks", err);
			} finally {
				if (isMounted) setLoading(false);
			}
		};
		loadStocks();
		return () => {
			isMounted = false;
		};
	}, [selectedSymbols]);

	const handleOpenSettings = useCallback(() => {
		setTempSelected(selectedSymbols);
		setSettingsOpen(true);
	}, [selectedSymbols]);

	const handleSaveSettings = useCallback(async () => {
		// Save to localStorage
		localStorage.setItem(STORAGE_KEY, JSON.stringify(tempSelected));
		// Save to Supabase if user is logged in
		if (userId) {
			const { error } = await supabase
				.from("user_preferences")
				.upsert(
					{ user_id: userId, dashboard_stock_symbols: tempSelected },
					{ onConflict: "user_id" },
				);
			if (error) {
				console.error("Failed to save stock preferences to Supabase", error);
			}
		}
		setSelectedSymbols(tempSelected);
		setSettingsOpen(false);
	}, [tempSelected, userId]);

	const toggleSymbol = useCallback((symbol: string) => {
		setTempSelected((prev) => {
			if (prev.includes(symbol)) {
				return prev.filter((s) => s !== symbol);
			}
			if (prev.length >= MAX_STOCKS) return prev;
			return [...prev, symbol];
		});
	}, []);

	return (
		<>
			<WidgetShell
				title="Stocks"
				subtitle={
					<>
						<span className="text-emerald-500 dark:text-emerald-400">↗</span>
						<span className="text-gray-500 dark:text-gray-400"> Today</span>
					</>
				}
				dropdown={
					<div className="flex items-center gap-2">
						<button
							onClick={handleOpenSettings}
							className="text-gray-500 transition-colors hover:text-gray-900 dark:hover:text-white"
						>
							<Settings2 size={16} />
						</button>
						<button
							onClick={() => router.push("/stocks")}
							className="text-xs pl-3 font-medium text-[#FF5A35] hover:underline"
						>
							View all →
						</button>
					</div>
				}
			>
				{loading ? (
					<div className="flex items-center justify-center py-6 text-sm text-gray-500">
						Loading stocks…
					</div>
				) : stocks.length === 0 ? (
					<div className="flex items-center justify-center py-6 text-sm text-gray-500">
						No stocks selected. Click the gear to choose.
					</div>
				) : (
					<div className={`space-y-${isMobile ? 2 : 3}`}>
						{stocks.map((stock) => (
							<FinancialCard
								key={stock.symbol}
								symbol={stock.symbol}
								name={stock.name || "Unknown Company"}
								price={stock.price ?? 0}
								change={stock.change ?? 0}
								changePercent={stock.changePercent ?? 0}
								viewMode="list"
								currency="USD"
								marketCap={stock.marketCap}
								logo={stock.logo}
							/>
						))}
					</div>
				)}
			</WidgetShell>

			{/* Settings Modal with actual logos */}
			<Dialog.Root open={settingsOpen} onOpenChange={setSettingsOpen}>
				<Dialog.Portal>
					<Dialog.Overlay className="fixed inset-0 z-[999] bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
					<Dialog.Content className="fixed left-1/2 top-1/2 z-[1000] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl outline-none dark:bg-[#1B1B1B]">
						<div className="flex items-center justify-between">
							<Dialog.Title className="text-lg font-bold text-gray-900 dark:text-white">
								Stock widget settings
							</Dialog.Title>
							<Dialog.Close asChild>
								<button className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-white/5">
									<X size={20} className="text-gray-500 dark:text-zinc-400" />
								</button>
							</Dialog.Close>
						</div>

						<p className="mt-4 text-sm text-gray-500 dark:text-zinc-400">
							Select up to {MAX_STOCKS} stocks to display on your dashboard.
						</p>

						<div className="mt-5 max-h-[400px] space-y-2 overflow-y-auto">
							{AVAILABLE_SYMBOLS.map((symbol) => {
								const stock = allStocksMap[symbol];
								const isSelected = tempSelected.includes(symbol);
								return (
									<div
										key={symbol}
										className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50/50 p-4 dark:border-white/5 dark:bg-white/5"
									>
										{/* Left side: Logo + Symbol */}
										<div className="flex items-center gap-3">
											{stock?.logo ? (
												<Image
													src={stock.logo}
													alt={stock.name || symbol}
													width={24}
													height={24}
													className="rounded-full shrink-0"
												/>
											) : (
												<div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-black/5 text-orange-600 dark:bg-white/5">
													<span className="text-sm font-black">
														{symbol[0]}
													</span>
												</div>
											)}
											<span className="text-sm font-medium text-gray-900 dark:text-white">
												{symbol}
											</span>
										</div>

										{/* Right side: Toggle switch */}
										<button
											type="button"
											role="switch"
											aria-checked={isSelected}
											onClick={() => toggleSymbol(symbol)}
											className={`relative h-6 w-11 rounded-full transition-colors ${
												isSelected
													? "bg-[#FF5A35]"
													: "bg-gray-300 dark:bg-gray-600"
											}`}
										>
											<span
												className={`absolute top-[3px] block size-[18px] rounded-full bg-white transition-all ${
													isSelected ? "right-[3px]" : "left-[3px]"
												}`}
											/>
										</button>
									</div>
								);
							})}
						</div>

						<div className="mt-6 flex justify-end gap-3 border-t border-gray-200 pt-6 dark:border-white/10">
							<button
								onClick={() => setSettingsOpen(false)}
								className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium transition hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5"
							>
								Cancel
							</button>
							<button
								onClick={handleSaveSettings}
								className="rounded-lg bg-[#FF5A35] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#E04825]"
							>
								Save
							</button>
						</div>
					</Dialog.Content>
				</Dialog.Portal>
			</Dialog.Root>
		</>
	);
}

// -----------------------------------------------------------------------------
// 4. GOALS WIDGET
// -----------------------------------------------------------------------------

const GOAL_WIDGET_STORAGE_KEY = "dashboard-widget-goal-ids";

function GoalsWidget({
	goals,
	savingsAccounts,
}: {
	goals: SavingsGoal[];
	savingsAccounts: Account[];
}) {
	const isMobile = useMediaQuery(MOBILE_BREAKPOINT);
	const [isSettingsOpen, setIsSettingsOpen] = useState(false);
	const [tempSelectedIds, setTempSelectedIds] = useState<string[]>([]);

	const [widgetGoalIds, setWidgetGoalIds] = useState<string[]>(() => {
		try {
			const stored = localStorage.getItem(GOAL_WIDGET_STORAGE_KEY);
			if (stored) {
				const parsed = JSON.parse(stored);
				return parsed;
			}
		} catch (e) {
			console.error("Failed to read goal widget settings", e);
		}
		// Default: first 5 goals
		return goals.slice(0, 5).map((g) => g.id);
	});

	// Filter visible goals based on selection
	const visibleGoals = useMemo(() => {
		if (widgetGoalIds.length === 0) return [];
		return goals.filter((g) => widgetGoalIds.includes(g.id));
	}, [goals, widgetGoalIds]);

	const totalSaved = useMemo(
		() => visibleGoals.reduce((sum, g) => sum + g.saved, 0),
		[visibleGoals],
	);

	// Settings Handlers
	const handleOpenSettings = () => {
		setTempSelectedIds(widgetGoalIds);
		setIsSettingsOpen(true);
	};

	const handleSaveSettings = () => {
		setWidgetGoalIds(tempSelectedIds);
		localStorage.setItem(
			GOAL_WIDGET_STORAGE_KEY,
			JSON.stringify(tempSelectedIds),
		);
		setIsSettingsOpen(false);
	};

	const toggleGoalSelection = (id: string) => {
		setTempSelectedIds((prev) => {
			if (prev.includes(id)) {
				return prev.filter((gid) => gid !== id);
			}
			if (prev.length >= 5) return prev; // Max 5 goals limit
			return [...prev, id];
		});
	};

	return (
		<>
			<WidgetShell
				title="Goals"
				subtitle={
					<>
						<span className="text-emerald-500 dark:text-emerald-400">
							↗ {formatCurrency(totalSaved)}
						</span>
						<span className="text-gray-500 dark:text-gray-400">
							{" "}
							this month
						</span>
					</>
				}
				dropdown={
					<button
						onClick={handleOpenSettings}
						className="text-gray-500 transition-colors hover:text-gray-900 dark:hover:text-white"
					>
						<Settings2 size={16} />
					</button>
				}
				className="min-h-[200px]"
			>
				{visibleGoals.length > 0 ? (
					<div className={`space-y-${isMobile ? 2 : 3}`}>
						{visibleGoals.map((goal) => {
							const progress = getGoalProgress(goal);
							const linkedAccount = savingsAccounts.find((acc) =>
								goal.linkedAccountIds?.includes(acc.id),
							);
							return (
								<Link
									key={goal.id}
									href={`/goals/savings/${encodeURIComponent(goal.id)}`}
									className={`flex flex-col gap-${isMobile ? 1 : 2} rounded-lg p-${isMobile ? 2 : 3} transition-colors hover:bg-gray-50 dark:hover:bg-white/5`}
								>
									<div className="flex items-start justify-between">
										<div className="flex min-w-0 flex-1 items-center gap-3">
											<GoalImage
												src={goal.imageUrl}
												alt={goal.name}
												className={`shrink-0 rounded-md object-cover ${isMobile ? "size-10" : "size-12"}`}
											/>
											<div className="min-w-0">
												<div className="flex items-center gap-2">
													<p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
														{goal.name}
													</p>
													{linkedAccount && (
														<AccountLogo
															account={
																linkedAccount as unknown as GoalAccountView
															}
															size={isMobile ? 16 : 20}
														/>
													)}
												</div>
												<div className="mt-1 flex items-center gap-2 text-[11px] text-gray-500 dark:text-zinc-400">
													{goal.status && (
														<span className="rounded-full bg-amber-100 px-1.5 py-0.5 font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
															{goal.status}
														</span>
													)}
													{formatGoalDate(goal)}
												</div>
											</div>
										</div>
										<div className="shrink-0 text-right">
											<p className="text-sm font-medium text-gray-900 dark:text-white">
												{formatCurrency(goal.saved)}
											</p>
											<p className="text-[11px] text-gray-500 dark:text-zinc-400">
												{Math.round(progress)}% of{" "}
												{formatCurrency(goal.targetAmount)}
											</p>
										</div>
									</div>
									<ProgressBar value={progress} className="h-1.5" />
								</Link>
							);
						})}
					</div>
				) : (
					<div className="flex h-32 flex-col items-center justify-center text-center text-sm text-gray-500 dark:text-zinc-400">
						<p>All goals are hidden.</p>
						<p>
							Turn on at least one of your goals to see them in this widget.
						</p>
						<button
							onClick={handleOpenSettings}
							className="inline-flex min-h-11 mt-5 items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-5 font-semibold text-gray-950 shadow-sm transition hover:bg-gray-50 dark:border-white/15 dark:bg-[#232322] dark:text-white dark:hover:bg-white/10"
						>
							Open widget settings
						</button>
					</div>
				)}
			</WidgetShell>

			{/* Settings Modal */}
			<Dialog.Root open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
				<Dialog.Portal>
					<Dialog.Overlay className="fixed inset-0 z-[999] bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
					<Dialog.Content className="fixed left-1/2 top-1/2 z-[1000] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl outline-none dark:bg-[#1B1B1B]">
						<div className="flex items-center justify-between">
							<Dialog.Title className="text-lg font-bold text-gray-900 dark:text-white">
								Goal widget settings
							</Dialog.Title>
							<Dialog.Close asChild>
								<button className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-white/5">
									<X size={20} className="text-gray-500 dark:text-zinc-400" />
								</button>
							</Dialog.Close>
						</div>

						<p className="mt-4 text-sm text-gray-500 dark:text-zinc-400">
							Select up to 5 goals you&apos;d like to see on your dashboard.
						</p>

						<div className="mt-5 max-h-[400px] space-y-2 overflow-y-auto">
							{goals.length > 0 ? (
								goals.map((goal) => {
									const isSelected = tempSelectedIds.includes(goal.id);
									return (
										<div
											key={goal.id}
											className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50/50 p-4 dark:border-white/5 dark:bg-white/5"
										>
											<div className="flex items-center gap-3">
												<GoalImage
													src={goal.imageUrl}
													alt={goal.name}
													className="size-10 shrink-0 rounded-md object-cover"
												/>
												<span className="text-sm font-medium text-gray-900 dark:text-white">
													{goal.name}
												</span>
											</div>
											<button
												type="button"
												role="switch"
												aria-checked={isSelected}
												onClick={() => toggleGoalSelection(goal.id)}
												className={`relative h-6 w-11 rounded-full transition-colors ${
													isSelected
														? "bg-[#FF5A35]"
														: "bg-gray-300 dark:bg-gray-600"
												}`}
											>
												<span
													className={`absolute top-[3px] block size-[18px] rounded-full bg-white transition-all ${
														isSelected ? "right-[3px]" : "left-[3px]"
													}`}
												/>
											</button>
										</div>
									);
								})
							) : (
								<p className="py-6 text-center text-sm text-gray-500 dark:text-zinc-400">
									No savings goals found.
								</p>
							)}
						</div>

						<div className="mt-6 flex justify-end gap-3 border-t border-gray-200 pt-6 dark:border-white/10">
							<button
								onClick={() => setIsSettingsOpen(false)}
								className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium transition hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5"
							>
								Cancel
							</button>
							<button
								onClick={handleSaveSettings}
								className="rounded-lg bg-[#FF5A35] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#E04825]"
							>
								Save
							</button>
						</div>
					</Dialog.Content>
				</Dialog.Portal>
			</Dialog.Root>
		</>
	);
}

function TopCategoriesWidget() {
  const transactions = useBudgetStore((state) => state.transactions);
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categoryData = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const monthTxs = transactions.filter((tx) => {
      const d = new Date(tx.date);
      return d >= startOfMonth && d <= endOfMonth && tx.amount < 0;
    });

    const totals = new Map<string, { amount: number; ids: string[] }>();
    for (const tx of monthTxs) {
      const category = tx.category || "Uncategorized";
      const entry = totals.get(category) || { amount: 0, ids: [] };
      entry.amount += Math.abs(tx.amount);
      entry.ids.push(tx.id);
      totals.set(category, entry);
    }

    const totalSpent = Array.from(totals.values()).reduce((sum, v) => sum + v.amount, 0);

    const rows = Array.from(totals.entries())
      .map(([label, { amount, ids }]) => ({
        label,
        amount,
        transactionIds: ids,
        color: getCategoryTheme(label).text,
        icon: getIconForCategory(label),
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    return { rows, totalSpent };
  }, [transactions]);

  if (categoryData.rows.length === 0) {
    return (
      <WidgetShell
        title="Top categories"
        subtitle="No spending this month"
        className="min-h-[200px]"
      >
        <div className="flex h-32 flex-col items-center justify-center text-sm text-gray-500 dark:text-gray-400">
          <p>No transactions found this month.</p>
        </div>
      </WidgetShell>
    );
  }

  return (
    <>
      <WidgetShell
        title="Top categories"
        subtitle={
          <span className="text-gray-500 dark:text-gray-400">
            {categoryData.rows.length} categories
          </span>
        }
        dropdown={
          <button
            onClick={() => router.push("/reports")}
            className="text-xs font-medium text-[#FF5A35] hover:underline"
          >
            View all →
          </button>
        }
        className="min-h-[200px]"
      >
        <div className="space-y-3">
          {categoryData.rows.map((row) => {
            const percentage = categoryData.totalSpent > 0
              ? (row.amount / categoryData.totalSpent) * 100
              : 0;

            return (
              <button
                key={row.label}
                type="button"
                onClick={() => setSelectedCategory(row.label)}
                className="flex w-full items-center gap-3 rounded-lg p-2 transition-colors hover:bg-gray-50 dark:hover:bg-white/5"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-white/5">
                  <row.icon size={16} className={row.color} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="truncate text-sm font-medium text-gray-900 dark:text-white">
                      {row.label}
                    </span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatCurrency(row.amount)}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full rounded-full bg-gray-200 dark:bg-white/10">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${Math.min(percentage, 100)}%`, backgroundColor: row.color }}
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </WidgetShell>

      <CategoryDetailDrawer
        category={selectedCategory!}
        transactions={transactions}
        isOpen={!!selectedCategory}
        onClose={() => setSelectedCategory(null)}
      />
    </>
  );
}

// -----------------------------------------------------------------------------
// 4. MAIN PAGE COMPONENT
// -----------------------------------------------------------------------------

export default function DashboardPageClient() {
	const {
		currentMonthTxs,

		summary,
		breakdownGroups,
		transactions, // get all transactions
	} = useDashboardData();

	const { goals, savingsAccounts, isLoading: isLoadingGoals } = useGoalsData();

	return (
		<div className="min-h-screen bg-gray-50 p-4 text-gray-900 md:p-6 lg:p-8 dark:bg-[#0d0d0d] dark:text-[#f5f5f5]">
			{/* Top Header */}
			<div className="mb-6 flex items-center justify-between">
				<h1 className="text-2xl font-bold text-gray-900 dark:text-white">
					Good evening, User!
				</h1>
				<CustomizeDashboardModal />
			</div>

			{/* Dashboard Grid */}
			<div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
				<div className="h-px bg-transparent md:hidden" />{" "}
				{/* Spacer for mobile */}
				{/* Left Column (First Column) */}
				<div className="space-y-5">
					<BudgetWidget txs={currentMonthTxs} />
					<NetWorthWidget summary={summary} breakdownGroups={breakdownGroups} />
					<RecurringWidget />
				</div>
				{/* Right Column (Second Column) */}
				<div className="space-y-5">
					<SpendingWidget transactions={transactions} />
					<TopCategoriesWidget />
					<TransactionsWidget transactions={currentMonthTxs} />

					<InvestmentsWidget />
					{!isLoadingGoals && (
						<GoalsWidget
							goals={goals}
							savingsAccounts={savingsAccounts as unknown as Account[]}
						/>
					)}
				</div>
			</div>
		</div>
	);
}
