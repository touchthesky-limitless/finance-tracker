"use client";

import React, { ElementType, ReactNode, useSyncExternalStore } from "react";
import {
	Plus,
	Download,
	MoreHorizontal,
	Wallet,
	PiggyBank,
	CreditCard,
	TrendingDown,
	Landmark,
	Receipt,
	Home,
	Utensils,
	Car,
	Activity,
} from "lucide-react";

import { Shimmer } from "@/components/ui/Shimmer";

function subscribeToClient(): () => void {
	return () => {};
}

function getClientSnapshot(): boolean {
	return true;
}

function getServerSnapshot(): boolean {
	return false;
}

function StatisticsPageSkeleton() {
	return (
		<div
			role="status"
			aria-label="Loading statistics and analysis"
			aria-live="polite"
			className="min-h-screen bg-[#F4F6F8] p-4 font-sans text-slate-800 md:p-8 dark:bg-[#0a0a0a] dark:text-slate-200"
		>
			<span className="sr-only">Loading statistics and analysis…</span>

			<div
				aria-hidden="true"
				className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center"
			>
				<Shimmer className="h-8 w-64 rounded-lg" />
				<div className="flex items-center gap-3">
					<Shimmer className="h-10 w-40 rounded-xl" />
					<Shimmer className="h-10 w-32 rounded-xl" />
				</div>
			</div>

			<div
				aria-hidden="true"
				className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-12"
			>
				<StatisticsCardSkeleton
					className="lg:col-span-2 xl:col-span-5"
					variant="gauge"
				/>
				<StatisticsCardSkeleton
					className="lg:col-span-1 xl:col-span-4"
					variant="bars"
				/>
				<StatisticsCardSkeleton
					className="lg:col-span-1 xl:col-span-3"
					variant="rows"
				/>
			</div>

			<div
				aria-hidden="true"
				className="grid grid-cols-1 gap-6 lg:grid-cols-3 xl:grid-cols-12"
			>
				<StatisticsCardSkeleton
					className="lg:col-span-2 xl:col-span-8"
					variant="chart"
				/>
				<StatisticsCardSkeleton
					className="lg:col-span-1 xl:col-span-4"
					variant="donut"
				/>
			</div>
		</div>
	);
}

function StatisticsCardSkeleton({
	className,
	variant,
}: {
	className: string;
	variant: "gauge" | "bars" | "rows" | "chart" | "donut";
}) {
	return (
		<div
			className={`rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800/80 dark:bg-[#121212] ${className}`}
		>
			<div className="mb-6 flex items-center justify-between">
				<Shimmer className="h-5 w-40 rounded-md" />
				<Shimmer className="size-7 rounded-full" />
			</div>

			{variant === "gauge" && (
				<div className="flex flex-col items-center gap-8 sm:flex-row">
					<Shimmer className="h-28 w-48 shrink-0 rounded-t-full" />
					<div className="w-full space-y-4">
						{Array.from({ length: 4 }, (_, index) => (
							<div key={index} className="flex items-center gap-3">
								<Shimmer className="size-8 rounded-lg" />
								<Shimmer className="h-3 w-32 rounded-md" />
								<Shimmer className="ml-auto h-4 w-16 rounded-md" />
							</div>
						))}
					</div>
				</div>
			)}

			{variant === "bars" && (
				<>
					<div className="mb-6 grid grid-cols-2 gap-4">
						<Shimmer className="h-16 w-full rounded-xl" />
						<Shimmer className="h-16 w-full rounded-xl" />
					</div>
					<div className="flex h-40 items-end justify-between gap-3">
						{[45, 70, 58, 88, 76].map((height, index) => (
							<Shimmer
								key={index}
								className="min-w-0 flex-1 rounded-t-md"
								style={{ height: `${height}%` }}
							/>
						))}
					</div>
				</>
			)}

			{variant === "rows" && (
				<div className="space-y-4">
					{Array.from({ length: 4 }, (_, index) => (
						<div key={index} className="flex items-center gap-3">
							<Shimmer className="size-10 rounded-xl" />
							<div className="min-w-0 flex-1 space-y-2">
								<Shimmer className="h-4 w-28 rounded-md" />
								<Shimmer className="h-3 w-16 rounded-md" />
							</div>
							<Shimmer className="h-4 w-20 rounded-md" />
						</div>
					))}
				</div>
			)}

			{variant === "chart" && (
				<>
					<div className="mb-8 flex gap-6">
						<Shimmer className="h-4 w-24 rounded-md" />
						<Shimmer className="h-4 w-24 rounded-md" />
					</div>
					<div className="relative h-48 overflow-hidden rounded-xl border-b border-gray-100 dark:border-gray-800/50">
						<Shimmer className="absolute bottom-4 left-0 h-3 w-full -rotate-3 rounded-full" />
						<Shimmer className="absolute bottom-12 left-0 h-3 w-full rotate-2 rounded-full" />
					</div>
					<div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
						{Array.from({ length: 3 }, (_, index) => (
							<Shimmer key={index} className="h-20 w-full rounded-xl" />
						))}
					</div>
				</>
			)}

			{variant === "donut" && (
				<div className="flex flex-col items-center">
					<Shimmer className="mb-8 size-48 rounded-full" />
					<div className="grid w-full grid-cols-2 gap-3">
						{Array.from({ length: 4 }, (_, index) => (
							<Shimmer key={index} className="h-24 w-full rounded-xl" />
						))}
					</div>
				</div>
			)}
		</div>
	);
}

export default function ProDashboardPage() {
	const isClient = useSyncExternalStore(
		subscribeToClient,
		getClientSnapshot,
		getServerSnapshot,
	);

	if (!isClient) {
		return <StatisticsPageSkeleton />;
	}

	return (
		<div className="min-h-screen bg-[#F4F6F8] dark:bg-[#0a0a0a] text-slate-800 dark:text-slate-200 p-4 md:p-8 font-sans">
			{/* --- HEADER --- */}
			<div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
				<div>
					<h1 className="text-2xl font-bold text-gray-900 dark:text-white">
						Statistics & Analysis
					</h1>
				</div>

				<div className="flex flex-wrap items-center gap-3">
					<button className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-purple-600/20">
						<Plus size={16} />
						Add Transaction
					</button>
					<button className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-[#121212] border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-semibold hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors shadow-sm">
						<Download size={16} />
						<span className="hidden sm:inline">Export Data</span>
					</button>
				</div>
			</div>

			{/* --- TOP ROW: IPAD (2 COLS) -> DESKTOP (12 COLS) --- */}
			<div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-12 gap-6 mb-6">
				{/* 1. MONTHLY BUDGET dashboard */}
				{/* Full width on iPad, 5 cols on Desktop */}
				<Card
					className="lg:col-span-2 xl:col-span-5"
					title="June Budget Dashboard"
				>
					<div className="flex flex-col sm:flex-row items-center gap-8 mt-4">
						<div className="relative w-48 h-28 shrink-0">
							<svg
								viewBox="0 0 200 110"
								className="w-full h-full overflow-visible drop-shadow-sm"
							>
								<path
									d="M 20 100 A 80 80 0 0 1 180 100"
									fill="none"
									stroke="currentColor"
									strokeWidth="16"
									strokeLinecap="round"
									className="text-gray-100 dark:text-gray-800/50"
								/>
								<path
									d="M 20 100 A 80 80 0 0 1 120 25"
									fill="none"
									stroke="#8b5cf6"
									strokeWidth="16"
									strokeLinecap="round"
									className="drop-shadow-sm"
								/>
								<path
									d="M 120 25 A 80 80 0 0 1 150 40"
									fill="none"
									stroke="#f59e0b"
									strokeWidth="16"
									strokeLinecap="round"
									className="drop-shadow-sm"
								/>
							</svg>
							<div className="absolute inset-0 flex flex-col items-center justify-end pb-0 text-center">
								<span className="p-1.5 bg-gray-50 dark:bg-gray-800 rounded-full mb-1">
									<Wallet size={14} className="text-gray-400" />
								</span>
								<p className="text-xs text-gray-500 font-medium">
									Safe to Spend
								</p>
								<h3 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
									$1,240
								</h3>
								<div className="text-[10px] font-bold text-green-500 bg-green-50 dark:bg-green-500/10 px-2 py-0.5 rounded-full mt-1">
									On Track
								</div>
							</div>
						</div>

						<div className="flex-1 w-full space-y-4">
							<MiniStat
								icon={TrendingDown}
								label="Total Spent"
								value="$3,450"
							/>
							<MiniStat icon={Receipt} label="Upcoming Bills" value="$820" />
							<MiniStat
								icon={PiggyBank}
								label="Transferred to Savings"
								value="$500"
							/>
							<MiniStat
								icon={Activity}
								label="Active Subscriptions"
								value="$125"
							/>
						</div>
					</div>

					<div className="flex flex-wrap items-center justify-center sm:justify-between gap-4 mt-8 border-t border-gray-100 dark:border-gray-800 pt-4">
						<LegendItem color="bg-purple-500" label="Spent" value="$ 3,450" />
						<LegendItem color="bg-yellow-500" label="Scheduled" value="$ 820" />
						<LegendItem
							color="bg-gray-200 dark:bg-gray-700"
							label="Remaining"
							value="$ 1,240"
						/>
						<LegendItem color="bg-green-500" label="Savings" value="$ 500" />
					</div>
				</Card>

				{/* 2. SAVINGS GOALS */}
				{/* 1 col on iPad, 4 cols on Desktop */}
				<Card
					className="lg:col-span-1 xl:col-span-4"
					title="Savings Projections"
				>
					<div className="flex justify-between mt-2 mb-6">
						<div>
							<p className="text-xs text-gray-500 font-medium">
								Total Saved YTD
							</p>
							<h4 className="text-xl font-bold text-gray-900 dark:text-white">
								$12,450
							</h4>
							<p className="text-[10px] text-green-500 font-bold mt-1">
								+14.2%{" "}
								<span className="text-gray-400 font-normal">vs last year</span>
							</p>
						</div>
						<div>
							<p className="text-xs text-gray-500 font-medium">
								Avg. Monthly Rate
							</p>
							<h4 className="text-xl font-bold text-gray-900 dark:text-white">
								18.5%
							</h4>
							<p className="text-[10px] text-green-500 font-bold mt-1">
								+2.1%{" "}
								<span className="text-gray-400 font-normal">vs last month</span>
							</p>
						</div>
					</div>

					<div className="h-40 flex items-end justify-between gap-2 px-2 mt-4">
						<StackedBar h1="30%" h2="20%" h3="20%" label="JAN" />
						<StackedBar h1="40%" h2="25%" h3="35%" label="FEB" />
						<StackedBar h1="35%" h2="30%" h3="25%" label="MAR" />
						<StackedBar h1="50%" h2="15%" h3="20%" label="APR" />
						<StackedBar h1="45%" h2="25%" h3="30%" label="MAY" />
					</div>
				</Card>

				{/* 3. LINKED ACCOUNTS */}
				{/* 1 col on iPad, 3 cols on Desktop */}
				<Card
					className="lg:col-span-1 xl:col-span-3 flex flex-col"
					title="Linked Accounts"
				>
					<div className="flex-1 flex flex-col gap-4 mt-4">
						<AccountRow
							icon={Landmark}
							bg="bg-blue-600"
							title="Chase Checking"
							subtitle="...4920"
							balance="$4,250.00"
						/>
						<AccountRow
							icon={CreditCard}
							bg="bg-slate-800 dark:bg-slate-700"
							title="Amex Platinum"
							subtitle="...1002"
							balance="-$1,240.50"
							isDebt
						/>
						<AccountRow
							icon={PiggyBank}
							bg="bg-orange-500"
							title="Discover Savings"
							subtitle="...8831"
							balance="$15,300.25"
						/>
						<AccountRow
							icon={TrendingDown}
							bg="bg-emerald-600"
							title="Vanguard 401k"
							subtitle="...5519"
							balance="$42,100.00"
						/>
					</div>
					<button className="mt-6 w-full py-2.5 text-xs font-bold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
						Manage Accounts →
					</button>
				</Card>
			</div>

			{/* --- BOTTOM ROW: IPAD (3 COLS) -> DESKTOP (12 COLS) --- */}
			<div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-12 gap-6">
				{/* 4. CASH FLOW (Line Chart) */}
				{/* 2 cols on iPad, 8 cols on Desktop */}
				<Card
					className="lg:col-span-2 xl:col-span-8 flex flex-col"
					title="Cash Flow Trend"
					action={
						<div className="flex bg-gray-50 dark:bg-[#1a1a1a] p-1 rounded-lg border border-gray-100 dark:border-gray-800 text-[11px] font-medium">
							<button className="px-3 py-1 text-gray-500 hover:text-gray-900 dark:hover:text-white">
								1M
							</button>
							<button className="px-3 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded shadow-sm">
								6M
							</button>
							<button className="px-3 py-1 text-gray-500 hover:text-gray-900 dark:hover:text-white">
								1Y
							</button>
						</div>
					}
				>
					<div className="flex items-center gap-6 mt-2 mb-8">
						<div className="flex items-center gap-2">
							<div className="w-2 h-2 rounded-full bg-green-500"></div>
							<span className="text-xs text-gray-500 font-medium">Income</span>
						</div>
						<div className="flex items-center gap-2">
							<div className="w-2 h-2 rounded-full bg-purple-500"></div>
							<span className="text-xs text-gray-500 font-medium">
								Expenses
							</span>
						</div>
					</div>

					<div className="relative h-48 w-full border-b border-gray-100 dark:border-gray-800/50 mb-4">
						<div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
							{[1, 2, 3, 4].map((i) => (
								<div
									key={i}
									className="w-full border-t border-gray-50 dark:border-gray-800/30 h-0"
								></div>
							))}
						</div>

						<svg
							className="absolute inset-0 w-full h-full"
							preserveAspectRatio="none"
							viewBox="0 0 100 100"
						>
							<defs>
								<linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
									<stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
									<stop offset="100%" stopColor="#10b981" stopOpacity="0" />
								</linearGradient>
							</defs>
							<path
								d="M 0 60 C 20 40, 30 70, 50 30 C 70 -10, 80 50, 100 40 L 100 100 L 0 100 Z"
								fill="url(#greenGrad)"
							/>
							<path
								d="M 0 60 C 20 40, 30 70, 50 30 C 70 -10, 80 50, 100 40"
								fill="none"
								stroke="#10b981"
								strokeWidth="2"
								strokeLinecap="round"
							/>
						</svg>

						<svg
							className="absolute inset-0 w-full h-full"
							preserveAspectRatio="none"
							viewBox="0 0 100 100"
						>
							<defs>
								<linearGradient id="purpleGrad" x1="0" y1="0" x2="0" y2="1">
									<stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.2" />
									<stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
								</linearGradient>
							</defs>
							<path
								d="M 0 80 C 20 90, 40 60, 60 80 C 80 100, 90 60, 100 70 L 100 100 L 0 100 Z"
								fill="url(#purpleGrad)"
							/>
							<path
								d="M 0 80 C 20 90, 40 60, 60 80 C 80 100, 90 60, 100 70"
								fill="none"
								stroke="#8b5cf6"
								strokeWidth="2"
								strokeLinecap="round"
							/>
						</svg>
					</div>

					<div className="flex justify-between text-[10px] text-gray-400 font-bold tracking-wider px-2 mb-8">
						<span>JAN</span>
						<span className="hidden sm:inline">FEB</span>
						<span>MAR</span>
						<span className="hidden sm:inline">APR</span>
						<span>MAY</span>
						<span className="text-gray-900 dark:text-white">JUN</span>
						<span className="hidden sm:inline">JUL</span>
						<span>AUG</span>
						<span className="hidden sm:inline">SEP</span>
						<span>OCT</span>
						<span className="hidden sm:inline">NOV</span>
						<span>DEC</span>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-gray-100 dark:border-gray-800/50">
						<div>
							<p className="text-xs text-gray-500 font-medium">
								Average Monthly Income
							</p>
							<h4 className="text-2xl font-bold text-gray-900 dark:text-white">
								$6,200<span className="text-gray-400 text-lg">.00</span>
							</h4>
							<p className="text-[10px] text-green-500 font-bold mt-1 bg-green-50 dark:bg-green-500/10 inline-block px-2 py-0.5 rounded-full">
								+4.2%{" "}
								<span className="text-gray-400 font-normal">
									vs last 6 months
								</span>
							</p>
						</div>
						<div>
							<p className="text-xs text-gray-500 font-medium">
								Average Monthly Expense
							</p>
							<h4 className="text-2xl font-bold text-gray-900 dark:text-white">
								$4,300<span className="text-gray-400 text-lg">.50</span>
							</h4>
							<p className="text-[10px] text-green-500 font-bold mt-1 bg-green-50 dark:bg-green-500/10 inline-block px-2 py-0.5 rounded-full">
								-2.1%{" "}
								<span className="text-gray-400 font-normal">
									vs last 6 months
								</span>
							</p>
						</div>
						<div className="flex items-center text-xs text-gray-500 leading-relaxed border-t md:border-t-0 md:border-l border-gray-100 dark:border-gray-800 pt-4 md:pt-0 md:pl-6">
							Your cash flow is exceptionally healthy. Dining out expenses
							decreased by 12% this month, keeping your overall spending well
							below your income line.
						</div>
					</div>
				</Card>

				{/* 5. SPENDING BY CATEGORY (Nested Donut) */}
				{/* 1 col on iPad, 4 cols on Desktop */}
				<Card
					className="lg:col-span-1 xl:col-span-4 flex flex-col"
					title="Spending by Category"
				>
					<div className="flex-1 flex flex-col items-center justify-center mt-6">
						<div className="relative w-48 h-48 mb-8">
							<svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
								<circle
									cx="50"
									cy="50"
									r="40"
									fill="none"
									stroke="#8b5cf6"
									strokeWidth="6"
									strokeDasharray="200 251"
									strokeLinecap="round"
								/>
								<circle
									cx="50"
									cy="50"
									r="30"
									fill="none"
									stroke="#10b981"
									strokeWidth="6"
									strokeDasharray="140 188"
									strokeLinecap="round"
								/>
								<circle
									cx="50"
									cy="50"
									r="20"
									fill="none"
									stroke="#f59e0b"
									strokeWidth="6"
									strokeDasharray="80 125"
									strokeLinecap="round"
								/>
								<circle
									cx="50"
									cy="50"
									r="10"
									fill="none"
									stroke="#ec4899"
									strokeWidth="6"
									strokeDasharray="30 62"
									strokeLinecap="round"
								/>
							</svg>
						</div>

						<div className="grid grid-cols-2 gap-3 w-full">
							<ExpenseBox
								label="Housing & Utilities"
								icon={Home}
								value="42%"
								trend="-$50"
								isUp={true}
							/>
							<ExpenseBox
								label="Food & Dining"
								icon={Utensils}
								value="24%"
								trend="+$120"
								isUp={false}
							/>
							<ExpenseBox
								label="Transportation"
								icon={Car}
								value="15%"
								trend="-$15"
								isUp={true}
							/>
							<ExpenseBox
								label="Subscriptions"
								icon={CreditCard}
								value="9%"
								trend="+$12"
								isUp={false}
							/>
						</div>
					</div>
				</Card>
			</div>
		</div>
	);
}

// ==========================================
// SUB-COMPONENTS
// ==========================================
interface CardProps {
	title: string;
	children: ReactNode;
	className?: string;
	action?: ReactNode;
}

function Card({ title, children, className = "", action }: CardProps) {
	return (
		<div
			className={`bg-white dark:bg-[#121212] border border-gray-100 dark:border-gray-800/80 rounded-3xl p-6 shadow-sm ${className}`}
		>
			<div className="flex items-center justify-between mb-2">
				<div className="flex items-center gap-2 text-gray-900 dark:text-white font-bold">
					<span className="w-1 h-4 bg-purple-500 rounded-full"></span>
					{title}
				</div>
				{action || (
					<button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 border border-gray-100 dark:border-gray-800 rounded-full">
						<MoreHorizontal size={16} />
					</button>
				)}
			</div>
			{children}
		</div>
	);
}

interface MiniStatProps {
	icon: ElementType;
	label: string;
	value: string;
}

function MiniStat({ icon: Icon, label, value }: MiniStatProps) {
	return (
		<div className="flex items-center justify-between">
			<div className="flex items-center gap-3">
				<div className="p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800">
					<Icon size={14} className="text-gray-500" />
				</div>
				<p className="text-xs text-gray-500 font-medium">{label}</p>
			</div>
			<p className="text-sm font-bold text-gray-900 dark:text-white">{value}</p>
		</div>
	);
}

interface LegendItemProps {
	color: string;
	label: string;
	value: string;
}

function LegendItem({ color, label, value }: LegendItemProps) {
	return (
		<div className="flex flex-col gap-1">
			<div className="flex items-center gap-1.5">
				<div className={`w-2 h-2 rounded-full ${color}`}></div>
				<span className="text-[10px] text-gray-500 font-medium">{label}</span>
			</div>
			<p className="text-xs font-bold text-gray-900 dark:text-white pl-3.5">
				{value}
			</p>
		</div>
	);
}

interface StackedBarProps {
	h1: string;
	h2: string;
	h3: string;
	label: string;
}

function StackedBar({ h1, h2, h3, label }: StackedBarProps) {
	return (
		<div className="flex flex-col items-center gap-3 w-full">
			<div className="flex flex-col justify-end w-4 sm:w-8 h-32 gap-0.5 group cursor-pointer">
				<div
					className="w-full bg-pink-400 dark:bg-pink-500 rounded-t-sm group-hover:opacity-80 transition-opacity"
					style={{ height: h3 }}
				></div>
				<div
					className="w-full bg-purple-600 dark:bg-purple-500 group-hover:opacity-80 transition-opacity"
					style={{ height: h2 }}
				></div>
				<div
					className="w-full bg-green-500 dark:bg-green-500 rounded-b-sm group-hover:opacity-80 transition-opacity"
					style={{ height: h1 }}
				></div>
			</div>
			<span className="text-[10px] font-bold text-gray-400">{label}</span>
		</div>
	);
}

interface AccountRowProps {
	icon: ElementType;
	bg: string;
	title: string;
	subtitle: string;
	balance: string;
	isDebt?: boolean;
}

function AccountRow({
	icon: Icon,
	bg,
	title,
	subtitle,
	balance,
	isDebt = false,
}: AccountRowProps) {
	return (
		<div className="flex items-center justify-between group">
			<div className="flex items-center gap-3">
				<div
					className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm ${bg}`}
				>
					<Icon size={18} />
				</div>
				<div>
					<h4 className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-purple-500 transition-colors">
						{title}
					</h4>
					<p className="text-[10px] text-gray-500 font-medium mt-0.5">
						{subtitle}
					</p>
				</div>
			</div>
			<div
				className={`text-sm font-bold ${isDebt ? "text-gray-900 dark:text-white" : "text-green-600 dark:text-green-400"}`}
			>
				{balance}
			</div>
		</div>
	);
}

interface ExpenseBoxProps {
	label: string;
	icon: ElementType;
	value: string;
	trend: string;
	isUp: boolean;
}

function ExpenseBox({
	label,
	icon: Icon,
	value,
	trend,
	isUp,
}: ExpenseBoxProps) {
	return (
		<div className="p-3 border border-gray-100 dark:border-gray-800 rounded-xl flex flex-col justify-between h-24 hover:border-purple-500/30 transition-colors cursor-pointer group">
			<div className="flex items-center justify-between">
				<p className="text-[10px] text-gray-500 font-medium leading-tight">
					{label}
				</p>
				<Icon
					size={12}
					className="text-gray-300 dark:text-gray-600 group-hover:text-purple-500 transition-colors"
				/>
			</div>
			<div className="flex items-end justify-between mt-2">
				<h4 className="text-xl font-bold text-gray-900 dark:text-white leading-none">
					{value}
				</h4>
				<div
					className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isUp ? "text-green-500 bg-green-50 dark:bg-green-500/10" : "text-red-500 bg-red-50 dark:bg-red-500/10"}`}
				>
					{trend}
				</div>
			</div>
		</div>
	);
}
