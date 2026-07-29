"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
	ArrowRight,
	Settings2,
	Sparkles,
	GripVertical,
	Receipt,
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";

import { Transaction, useBudgetStore } from "@/store/useBudgetStore";
import { formatCurrency } from "@/utils/formatters";
import type {
	ChartPoint,
	ChartType,
	DateRange,
	Timeframe,
} from "@/components/Accounts/types";
import { NetWorthChart } from "@/components/Accounts/chart/NetWorthChart";
import { CategoryGlyph } from "@/components/Categories/CategoryGlyph";
import { MerchantLogo } from "@/components/Merchants/MerchantLogo";
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
		investmentsData, // still included but not used in dashboard; kept for potential future use
		summary,
		netWorthPoints, // still included; might be used elsewhere
		breakdownGroups,
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
	return (
		<div
			className={`rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-[#232322] ${className}`}
		>
			<div className="mb-4 flex items-center justify-between">
				<div className="flex items-center gap-2">
					<GripVertical
						className="text-gray-300 dark:text-gray-600"
						size={18}
					/>
					<h3 className="text-[17px] font-bold text-gray-900 dark:text-white">
						{title}
						{subtitle && (
							<span className="ml-2 text-sm font-medium text-gray-500 dark:text-gray-400">
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

function WeeklyRecapWidget() {
	return (
		<WidgetShell
			title="Your Weekly Recap"
			className="cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
		>
			<div className="flex flex-col gap-2">
				<p className="text-[13px] text-gray-500 dark:text-gray-400">
					July 19th–25th
				</p>
				<p className="text-sm font-medium text-gray-800 dark:text-gray-200">
					See how your net worth and spending changed last week, and see
					what&apos;s coming up this week
				</p>
				<ArrowRight size={18} className="ml-auto mt-1 text-gray-400" />
			</div>
		</WidgetShell>
	);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function BudgetWidget({ txs: _txs }: { txs: Transaction[] }) {
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
				<select className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-sm font-medium outline-none dark:border-white/10 dark:bg-[#2a2a2a]">
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

function SpendingWidget({
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
	currentTxs: _currentTxs,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
	lastTxs: _lastTxs,
}: {
	currentTxs: Transaction[];
	lastTxs: Transaction[];
}) {
	// Mock data points for chart lines
	const data = [
		{ day: "Day 1", current: 0, last: 0 },
		{ day: "Day 5", current: 0, last: 180 },
		{ day: "Day 9", current: 0, last: 220 },
		{ day: "Day 13", current: 0, last: 290 },
		{ day: "Day 17", current: 0, last: 320 },
		{ day: "Day 21", current: 500, last: 350 },
		{ day: "Day 25", current: 180, last: 380 },
		{ day: "Day 30", current: 120, last: 390 },
	];

	return (
		<WidgetShell
			title="Spending"
			subtitle={`${formatCurrency(19112.33)} this month`}
			dropdown={
				<select className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-sm font-medium outline-none dark:border-white/10 dark:bg-[#2a2a2a]">
					<option>This month vs. last month</option>
					<option>This week vs. last week</option>
					<option>This month vs. last year</option>
				</select>
			}
		>
			<div className="h-[140px] w-full">
				<ResponsiveContainer width="100%" height="100%">
					<AreaChart
						data={data}
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
							tickFormatter={(v) => `$${v / 1000}k`}
							width={40}
						/>
						<Tooltip wrapperStyle={{ fontSize: 12 }} />
						<Area
							type="monotone"
							dataKey="last"
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
					<span className="h-0.5 w-5 bg-gray-400 rounded-full" /> Last month
				</div>
				<div className="flex items-center gap-1.5">
					<span className="h-0.5 w-5 bg-[#FF6B2C] rounded-full" /> This month
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

	// Pass the correct current net worth
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
	const router = useRouter();
	const top5 = transactions.slice(0, 5);

	return (
		<WidgetShell
			title="Transactions"
			subtitle="Most recent"
			dropdown={
				<select className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-sm font-medium outline-none dark:border-white/10 dark:bg-[#2a2a2a]">
					<option>All transactions</option>
					<option>Needs Review</option>
				</select>
			}
		>
			<div className="space-y-3">
				{top5.map((tx) => (
					<button
						key={tx.id}
						type="button"
						onClick={() => router.push(`/transactions/${tx.id}`)}
						className="flex w-full items-center justify-between rounded-lg p-2 transition-colors hover:bg-gray-50 dark:hover:bg-white/5"
					>
						<div className="flex min-w-0 items-center gap-3">
							<div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-[#2a2a2a]">
								<MerchantLogo name={tx.merchant} size="sm" />
							</div>
							<div className="flex min-w-0 flex-col text-left">
								<span className="truncate text-[15px] font-medium text-gray-900 dark:text-white">
									{tx.merchant || "Unknown"}
								</span>
								<div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
									<CategoryGlyph name={tx.category} size={12} />
									<span className="truncate">{tx.category}</span>
								</div>
							</div>
						</div>
						<div className="shrink-0 text-right">
							<span className="block text-[15px] font-medium text-gray-900 dark:text-white">
								{formatCurrency(tx.amount)}
							</span>
							<ArrowRight size={14} className="ml-auto text-gray-400" />
						</div>
					</button>
				))}
			</div>
		</WidgetShell>
	);
}

function RecurringWidget() {
	return (
		<WidgetShell
			title="Recurring"
			subtitle="$0 remaining due"
			dropdown={
				<select className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-sm font-medium outline-none dark:border-white/10 dark:bg-[#2a2a2a]">
					<option>This month</option>
				</select>
			}
		>
			<div className="flex flex-col items-center justify-center py-8 text-center">
				<div className="flex size-12 items-center justify-center rounded-full bg-orange-100 text-orange-500 dark:bg-orange-500/20">
					<Receipt size={22} />
				</div>
				<h4 className="mt-3 text-base font-bold text-gray-900 dark:text-white">
					Stay on top of your bills
				</h4>
				<p className="mt-1 max-w-[240px] text-sm text-gray-500 dark:text-gray-400">
					Know what&apos;s due and what&apos;s being charged automatically.
				</p>
				<button className="mt-4 rounded-lg bg-[#FF5A35] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#E04825]">
					See recurring →
				</button>
			</div>
		</WidgetShell>
	);
}

function InvestmentsWidget() {
	return (
		<WidgetShell
			title="$366 investments"
			subtitle={<span className="text-emerald-500">↗ $0.81 (0.2%) Today</span>}
		>
			<p className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
				Top movers today
			</p>
			<div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/50 p-3 dark:border-white/5 dark:bg-white/5">
				<div className="flex items-center gap-3">
					<div className="flex size-10 items-center justify-center rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
						VTI
					</div>
					<div className="flex flex-col text-left">
						<span className="text-sm font-bold text-gray-900 dark:text-white">
							VTI
						</span>
						<span className="text-xs text-gray-500 dark:text-gray-400">
							Vanguard Total Stock Market ETF
						</span>
					</div>
				</div>
				<div className="flex flex-col items-end">
					<span className="text-sm font-bold text-gray-900 dark:text-white">
						$365.99
					</span>
					<span className="text-xs font-bold text-emerald-500">↗ 0.22%</span>
				</div>
			</div>
		</WidgetShell>
	);
}

// -----------------------------------------------------------------------------
// 4. MAIN PAGE COMPONENT
// -----------------------------------------------------------------------------

export default function DashboardClient() {
	const { currentMonthTxs, lastMonthTxs, summary, breakdownGroups } =
		useDashboardData();
	// netWorthPoints and investmentsData are not used; we removed them from destructuring
	// allTransactions is also not needed

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
				<WeeklyRecapWidget />
				<div className="h-px bg-transparent md:hidden" />{" "}
				{/* Spacer for mobile */}
				{/* Left Column (First Column) */}
				<div className="space-y-5">
					<BudgetWidget txs={currentMonthTxs} />
					<NetWorthWidget summary={summary} breakdownGroups={breakdownGroups} />
					{/* Savings Goals (mocked for spacing) */}
					<div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-[#232322]">
						<div className="mb-4 flex items-center justify-between">
							<div className="flex items-center gap-2">
								<GripVertical
									className="text-gray-300 dark:text-gray-600"
									size={18}
								/>
								<h3 className="text-[17px] font-bold text-gray-900 dark:text-white">
									Goals
								</h3>
								<span className="text-sm font-medium text-gray-500 dark:text-gray-400">
									$214.47 this month
								</span>
								<Sparkles size={16} className="text-orange-400" />
							</div>
						</div>
						<div className="space-y-4">
							<div className="flex items-center gap-3">
								<div className="size-10 shrink-0 rounded-full bg-gray-200 dark:bg-white/5" />
								<div className="flex-1">
									<div className="flex items-center justify-between text-sm font-semibold">
										<span className="text-gray-900 dark:text-white">
											Wedding
										</span>
										<span className="text-gray-900 dark:text-white">
											$214.47
										</span>
									</div>
									<div className="mt-1 flex items-center gap-2 text-[11px] text-gray-500">
										<span className="rounded bg-red-100 px-1.5 py-0.5 font-bold text-red-600 dark:bg-red-900/30 dark:text-red-400">
											At risk
										</span>
										<span>Jan 2028</span>
									</div>
								</div>
							</div>
							<div className="flex items-center gap-3">
								<div className="size-10 shrink-0 rounded-full bg-gray-200 dark:bg-white/5" />
								<div className="flex-1">
									<div className="flex items-center justify-between text-sm font-semibold">
										<span className="text-gray-900 dark:text-white">Car</span>
										<span className="text-gray-900 dark:text-white">$0.00</span>
									</div>
									<div className="mt-1 text-[11px] text-gray-500">
										No target date
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
				{/* Right Column (Second Column) */}
				<div className="space-y-5">
					<SpendingWidget currentTxs={currentMonthTxs} lastTxs={lastMonthTxs} />
					<TransactionsWidget transactions={currentMonthTxs} />
					<RecurringWidget />
					<InvestmentsWidget />
				</div>
			</div>
		</div>
	);
}
