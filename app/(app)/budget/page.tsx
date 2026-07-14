"use client";

import { useRouter } from "next/navigation";
import { useState, ReactNode, ElementType, useMemo, memo } from "react";
import {
	Download,
	MoreHorizontal,
	Home,
	AlertCircle,
	ArrowRight,
	Calendar,
	ChevronDown,
	ChevronLeft,
} from "lucide-react";
import { useBudgetData } from "@/hooks/useBudgetData";

// ==========================================
// STATIC HELPERS
// ==========================================
const formatCurrency = (num: number) => {
	if (isNaN(num) || num === undefined) {
		return "$0.00";
	}
	const sign = num < 0 ? "-" : "";
	const absNum = Math.abs(num);
	return `${sign}$${absNum.toLocaleString("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})}`;
};

const formatCompact = (num: number) => {
	if (isNaN(num) || num === undefined) {
		return "$0k";
	}
	const sign = num < 0 ? "-" : "";
	const absNum = Math.abs(num);
	return `${sign}$${(absNum / 1000).toFixed(1)}k`;
};

const formatYAxis = (num: number) => {
	if (num === 0) {
		return "0";
	}
	const sign = num < 0 ? "-" : "";
	const absNum = Math.abs(num);

	if (absNum >= 1000) {
		return `${sign}$${Math.round(absNum / 1000)}k`;
	}
	return `${sign}$${Math.round(absNum)}`;
};

// ==========================================
// GLOBAL CONSTANTS
// ==========================================
const CURRENT_YEAR = new Date().getFullYear();
const DEFAULT_YEAR_FILTER = `Year ${CURRENT_YEAR}`;

const YEARS: number[] = [];
for (let i = 0; i < 3; i++) {
	YEARS.push(CURRENT_YEAR - 2 + i);
}

const TIME_PRESETS = {
	TODAY: "Today",
	THIS_WEEK: "This Week",
	THIS_MONTH: "This Month",
	THIS_YEAR: "This Year",
	LAST_MONTH: "Last Month",
	LAST_12_MONTHS: "Last 12 Months",
} as const;

export default function OverviewPage() {
	const [timeFilter, setTimeFilter] = useState(DEFAULT_YEAR_FILTER);
	const FALL_BACK_DATE = TIME_PRESETS.THIS_MONTH;

	const {
		stats,
		categoryData,
		monthlyData,
		maxMonthlyValue,
		topMerchants,
		largestPurchases,
		predictedBills,
	} = useBudgetData(timeFilter);

	// --- MEMOIZED CALCULATIONS ---
	const activeYear = useMemo(() => {
		const match = timeFilter.match(/\d{4}/);
		if (match) {
			return parseInt(match[0]);
		}
		return CURRENT_YEAR;
	}, [timeFilter]);

	const budgetMetrics = useMemo(() => {
		let remaining = 0;
		let spent = 0;

		if (stats.income > 0) {
			remaining = Math.min(
				Math.round((Math.max(stats.remaining, 0) / stats.income) * 100),
				100,
			);
			spent = Math.min(Math.round((stats.expenses / stats.income) * 100), 100);
		}

		return { remaining, spent };
	}, [stats.income, stats.remaining, stats.expenses]);

	const yAxisLabels = useMemo(() => {
		const topScale = Math.ceil((maxMonthlyValue || 1000) / 1000) * 1000;
		return [
			formatYAxis(topScale),
			formatYAxis(topScale * 0.66),
			formatYAxis(topScale * 0.33),
			"0",
		];
	}, [maxMonthlyValue]);

	// --- RENDER PREPARATION ---
	const yAxisLabelElements = [];
	for (let i = 0; i < yAxisLabels.length; i++) {
		yAxisLabelElements.push(<span key={i}>{yAxisLabels[i]}</span>);
	}

	const chartBarElements = [];
	for (let i = 0; i < monthlyData.length; i++) {
		const d = monthlyData[i];
		const isYearlyView = monthlyData.length <= 12;
		const isActive = isYearlyView && timeFilter.includes(d.label);

		chartBarElements.push(
			<div
				key={i}
				onClick={() => {
					if (isYearlyView) {
						const newFilter = `${d.label} ${activeYear}`;
						setTimeFilter(newFilter);
					}
				}}
				className={`relative flex-1 transition-all duration-300 group rounded-t-sm
                    ${isYearlyView ? "cursor-pointer" : "cursor-default"}
                    ${
											isActive
												? "bg-orange-600 shadow-[0_0_15px_rgba(234,88,12,0.3)]"
												: "bg-orange-100 dark:bg-orange-500/20 hover:bg-orange-400 dark:hover:bg-orange-500/40"
										}`}
				style={{ height: `${d.height}%` }}
			>
				<div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[10px] font-bold py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none shadow-lg">
					{isYearlyView ? d.label : `Day ${d.label}`}: {formatCurrency(d.value)}
				</div>
				{isActive && (
					<div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-1 h-1 bg-orange-600 rounded-full" />
				)}
			</div>,
		);
	}

	const xAxisLabelElements = [];
	for (let i = 0; i < monthlyData.length; i++) {
		const d = monthlyData[i];
		const isDaily = monthlyData.length > 12;
		let shouldShowLabel = true;

		if (isDaily) {
			if (i % 5 !== 0 && i !== monthlyData.length - 1) {
				shouldShowLabel = false;
			}
		}

		xAxisLabelElements.push(
			<span
				key={i}
				className={`flex-1 text-center ${!shouldShowLabel && isDaily ? "invisible" : ""}`}
			>
				{d.label}
			</span>,
		);
	}

	const yearToggleElements = [];
	for (let i = 0; i < YEARS.length; i++) {
		const year = YEARS[i];
		yearToggleElements.push(
			<button
				key={year}
				onClick={() => {
					const newYearFilter = `Year ${year}`;
					setTimeFilter(newYearFilter);
				}}
				className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${
					activeYear === year
						? "bg-white dark:bg-[#121212] text-orange-600 dark:text-orange-500 shadow-sm"
						: "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
				}`}
			>
				{year}
			</button>,
		);
	}

	const topCategoriesElements = [];
	let catLimit = categoryData.length;
	if (catLimit > 5) {
		catLimit = 5;
	}
	for (let i = 0; i < catLimit; i++) {
		const cat = categoryData[i];
		topCategoriesElements.push(
			<BudgetProgress
				key={cat.name}
				icon={cat.icon || Home}
				name={cat.name}
				spent={cat.value}
				limit={cat.value + 200}
				color={cat.color}
			/>,
		);
	}

	const topMerchantElements = [];
	let merchLimit = topMerchants.length;
	if (merchLimit > 5) {
		merchLimit = 5;
	}
	for (let i = 0; i < merchLimit; i++) {
		const m = topMerchants[i];
		topMerchantElements.push(
			<div
				key={m.name}
				className="flex items-start justify-between group gap-4"
			>
				<div className="flex items-start gap-3 min-w-0 flex-1">
					<div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-500 group-hover:bg-orange-100 dark:group-hover:bg-orange-500/20 group-hover:text-orange-600 transition-colors shrink-0">
						{m.name.charAt(0)}
					</div>
					<div className="min-w-0 pt-0.5">
						<p className="text-sm font-bold text-gray-900 dark:text-white truncate leading-none mb-1">
							{m.name}
						</p>
						<p className="text-[10px] text-gray-500 font-medium leading-none">
							{m.count} transactions
						</p>
					</div>
				</div>
				<span className="text-sm md:text-base font-black text-gray-900 dark:text-white whitespace-nowrap shrink-0">
					{formatCurrency(m.total)}
				</span>
			</div>,
		);
	}

	const largestPurchasesElements = [];
	let purchLimit = largestPurchases.length;
	if (purchLimit > 5) {
		purchLimit = 5;
	}
	for (let i = 0; i < purchLimit; i++) {
		const t = largestPurchases[i];
		const amountVal = -Math.abs(t.amount);

		largestPurchasesElements.push(
			<div key={i} className="flex flex-col gap-1">
				<div className="flex justify-between items-center gap-2">
					<span className="text-sm font-bold text-gray-900 dark:text-white truncate">
						{t.merchant}
					</span>
					<span className="text-sm font-black text-gray-700 dark:text-gray-400 shrink-0">
						{formatCurrency(amountVal)}
					</span>
				</div>
				<span className="text-[10px] text-gray-500 font-medium italic">
					{new Date(t.date).toLocaleDateString("en-US", {
						month: "short",
						day: "numeric",
					})}
				</span>
			</div>,
		);
	}

	const predictedBillsElements = [];
	for (let i = 0; i < predictedBills.length; i++) {
		const bill = predictedBills[i];
		predictedBillsElements.push(
			<ActionRow
				key={i}
				day={bill.dueDate.getDate().toString().padStart(2, "0")}
				month={bill.dueDate.toLocaleDateString("en-US", { month: "short" })}
				title={bill.merchant}
				subtitle={`Estimated based on ${bill.frequency} history`}
				amount={formatCurrency(bill.amount)}
				status="upcoming"
			/>,
		);
	}

	return (
		<div className="flex flex-col min-h-screen">
			<header className="sticky top-0 z-30 w-full bg-white/80 dark:bg-[#050505]/80 backdrop-blur-md transform-gpu border-b border-gray-200/50 dark:border-white/5">
				<div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 py-6 px-4 md:px-8">
					<div className="max-w-2xl">
						<h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tighter mb-2 uppercase">
							Financial <span className="text-orange-600">Dashboard</span>
						</h1>
						<p className="text-sm font-medium text-gray-500 dark:text-gray-400">
							You have{" "}
							<strong className="text-gray-900 dark:text-white font-black">
								{formatCurrency(stats.remaining)}
							</strong>{" "}
							safe to spend before your next payday.
						</p>
					</div>

					<div className="flex flex-wrap items-center gap-3 shrink-0">
						<DateRangeDropdown
							onApply={(val) => {
								let selectedDate = val;
								if (!selectedDate) {
									selectedDate = FALL_BACK_DATE;
								}
								setTimeFilter(selectedDate);
							}}
						/>
						<button className="flex items-center gap-2 px-6 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-orange-600/20 active:scale-95">
							<Download size={16} strokeWidth={2.5} />
							<span className="hidden sm:inline">Export</span>
						</button>
					</div>
				</div>
			</header>

			<main className="flex-1 w-full max-w-[1600px] mx-auto px-4 md:px-8 py-8 pb-24">
				{/* --- TOP ROW: Hero Summary --- */}
				<div className="bg-white dark:bg-[#121212] border border-gray-100 dark:border-gray-800/80 rounded-3xl p-6 shadow-sm mb-6 flex flex-col xl:flex-row items-center gap-8 relative z-10">
					{/* Left Side (Donut Chart) */}
					<div className="flex items-center justify-center sm:justify-start gap-6 w-full xl:w-[35%] xl:border-r border-gray-100 dark:border-gray-800 xl:pr-8 shrink-0">
						<div
							className="relative w-28 h-28 shrink-0 rounded-full flex items-center justify-center drop-shadow-sm"
							style={{
								background: `conic-gradient(#10b981 0% ${budgetMetrics.remaining}%, #8b5cf6 ${budgetMetrics.remaining}% ${budgetMetrics.remaining + budgetMetrics.spent}%, #f59e0b ${budgetMetrics.remaining + budgetMetrics.spent}% 100%)`,
							}}
						>
							<div className="w-20 h-20 bg-white dark:bg-[#121212] rounded-full flex flex-col items-center justify-center shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]">
								<span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
									Income
								</span>
								<span className="text-sm font-black text-gray-900 dark:text-white">
									{formatCompact(stats.income)}
								</span>
							</div>
						</div>
						<div className="flex flex-col gap-3 w-full min-w-0">
							<DonutLegend
								color="bg-green-500"
								label="Remaining"
								value={`${budgetMetrics.remaining}%`}
								amount={formatCurrency(stats.remaining)}
							/>
							<DonutLegend
								color="bg-purple-500"
								label="Spent"
								value={`${budgetMetrics.spent}%`}
								amount={formatCurrency(stats.expenses)}
							/>
							<DonutLegend
								color="bg-orange-500"
								label="Debt/Bills"
								value="0%"
								amount="$0.00"
							/>
						</div>
					</div>

					{/* Right Side (Sparklines) */}
					<div className="w-full xl:w-[65%] grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 xl:gap-8">
						<SparklineStat
							title="Total Spent"
							amount={formatCurrency(stats.expenses)}
							trend="Active"
							isPositive={true}
							sparklineColor="#8b5cf6"
							path="M0 10 C 20 10, 30 20, 50 15 C 70 10, 80 25, 100 20"
						/>
						<SparklineStat
							title="Total Debt"
							amount="$12,340.00"
							trend="+0.8%"
							isPositive={false}
							sparklineColor="#f59e0b"
							path="M0 5 C 20 5, 40 15, 60 10 C 80 5, 90 15, 100 20"
						/>
						<SparklineStat
							title="Net Worth"
							amount="$142,500.00"
							trend="+2.4%"
							isPositive={true}
							sparklineColor="#10b981"
							path="M0 25 Q 15 20, 30 25 T 70 15 T 100 5"
						/>
					</div>
				</div>

				{/* --- MIDDLE ROW --- */}
				<div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6 relative z-10">
					{/* DYNAMIC SPENDING CHART */}
					<Card
						className="xl:col-span-2 flex flex-col"
						title="Spending Trends"
						action={
							<div className="flex items-center gap-3">
								{monthlyData.length > 12 && (
									<button
										onClick={() => {
											const resetFilter = `Year ${activeYear}`;
											setTimeFilter(resetFilter);
										}}
										className="flex items-center gap-1 text-[10px] font-bold text-orange-600 hover:text-orange-700 bg-orange-50 dark:bg-orange-500/10 px-2 py-1 rounded-md transition-all active:scale-95"
									>
										<ChevronLeft size={12} />
										Back to {activeYear}
									</button>
								)}

								{monthlyData.length <= 12 && (
									<div className="flex bg-gray-100 dark:bg-[#0d0d0d] p-1 rounded-lg border border-transparent dark:border-white/5">
										{yearToggleElements}
									</div>
								)}
							</div>
						}
					>
						<div className="flex items-center justify-between mt-4 mb-8">
							<div className="flex flex-col overflow-hidden">
								<span className="text-3xl md:text-4xl xl:text-5xl font-bold text-gray-900 dark:text-white tracking-tight truncate">
									{formatCurrency(stats.expenses).split(".")[0]}
									<span className="text-gray-400 text-xl md:text-2xl xl:text-3xl">
										.{formatCurrency(stats.expenses).split(".")[1]}
									</span>
								</span>
								<span className="text-sm text-gray-500 font-medium mt-1 truncate">
									{monthlyData.length <= 12
										? `Total spent in ${activeYear}`
										: `Daily spending for ${timeFilter}`}
								</span>
							</div>
						</div>

						<div className="flex h-48 w-full mb-2">
							<div className="flex flex-col justify-between text-[10px] font-bold text-gray-400 text-right pr-3 pb-1 w-10 shrink-0 mt-0.5">
								{yAxisLabelElements}
							</div>
							<div className="relative flex-1 flex items-end gap-1 sm:gap-2 px-1 border-b border-gray-100 dark:border-gray-800/50">
								<div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-1">
									<div className="w-full border-t border-gray-100 dark:border-gray-800/30 h-0 mt-2"></div>
									<div className="w-full border-t border-gray-100 dark:border-gray-800/30 h-0"></div>
									<div className="w-full border-t border-gray-100 dark:border-gray-800/30 h-0"></div>
									<div className="w-full h-0"></div>
								</div>
								{chartBarElements}
							</div>
						</div>
						{/* --- X-AXIS LABELS --- */}
						<div className="flex justify-between text-[10px] sm:text-xs text-gray-400 font-bold tracking-wider pl-12 pr-2 mt-2">
							{xAxisLabelElements}
						</div>
					</Card>

					<Card className="xl:col-span-1 flex flex-col" title="Top Budgets">
						<div className="flex-1 flex flex-col gap-5 mt-4">
							{categoryData.length > 0 ? (
								topCategoriesElements
							) : (
								<div className="text-sm text-gray-500 italic mt-4 text-center">
									No transactions found.
								</div>
							)}
							{stats.unreviewedCount > 0 && (
								<div className="mt-2 p-3 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-xl flex gap-3 cursor-pointer">
									<AlertCircle
										size={16}
										className="text-red-500 shrink-0 mt-0.5"
									/>
									<div>
										<h4 className="text-xs font-bold text-red-700 dark:text-red-400">
											Action Required
										</h4>
										<p className="text-[10px] text-red-600 dark:text-red-300 mt-0.5">
											{stats.unreviewedCount} transactions need review.
										</p>
									</div>
								</div>
							)}
						</div>
					</Card>
				</div>

				{/* --- BOTTOM ROW: SPENDING INTELLIGENCE --- */}
				<div className="grid grid-cols-1 xl:grid-cols-2 gap-6 relative z-10">
					<Card title="Merchant Insights">
						<div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mt-4">
							<div className="min-w-0">
								<p className="text-[10px] font-black text-gray-400 tracking-widest mb-4">
									Top Merchants
								</p>
								<div className="flex flex-col gap-4">{topMerchantElements}</div>
							</div>
							<div className="pt-8 xl:pt-0 border-t xl:border-t-0 xl:border-l border-gray-100 dark:border-gray-800 xl:pl-8 min-w-0">
								<p className="text-[10px] font-black text-gray-400 tracking-widest mb-4">
									Largest Hits
								</p>
								<div className="flex flex-col gap-4">
									{largestPurchasesElements}
								</div>
							</div>
						</div>
					</Card>

					<Card title="Predicted Bills & Subscriptions">
						<div className="flex flex-col gap-1 mt-4">
							{predictedBills.length > 0 ? (
								predictedBillsElements
							) : (
								<div className="py-12 text-center">
									<p className="text-sm text-gray-400 italic">
										No recurring patterns detected yet.
									</p>
								</div>
							)}
						</div>
						<button className="mt-5 text-xs font-bold text-gray-400 hover:text-orange-600 flex items-center gap-1 w-fit transition-colors">
							View Subscription Manager <ArrowRight size={14} />
						</button>
					</Card>
				</div>
			</main>
		</div>
	);
}

// ==========================================
// DATE RANGE DROPDOWN COMPONENT
// ==========================================
interface DateRangeDropdownProps {
	compact?: boolean;
	onApply?: (month: string | null) => void;
}

const DateRangeDropdown = memo(function DateRangeDropdown({
	compact = false,
	onApply,
}: DateRangeDropdownProps) {
	const [isOpen, setIsOpen] = useState(false);

	const [tempYear, setTempYear] = useState<number>(CURRENT_YEAR);
	const [tempMonth, setTempMonth] = useState<string | null>(null);
	const [activePreset, setActivePreset] = useState<string>(
		TIME_PRESETS.THIS_YEAR,
	);

	const presets = Object.values(TIME_PRESETS);
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

	const handlePresetClick = (preset: string) => {
		setActivePreset(preset);
		setTempMonth(null);
		setIsOpen(false);

		let filterValue = preset;

		if (preset === TIME_PRESETS.TODAY || preset === TIME_PRESETS.THIS_WEEK) {
			filterValue = `${preset}:${CURRENT_YEAR}`;
		} else if (preset === TIME_PRESETS.THIS_YEAR) {
			filterValue = DEFAULT_YEAR_FILTER;
		}

		if (onApply) {
			onApply(filterValue);
		}
	};

	const handleMonthSelect = (month: string) => {
		setTempMonth(month);
		setActivePreset("");
	};

	const handleApply = () => {
		setIsOpen(false);
		if (onApply) {
			const filterValue = tempMonth
				? `${tempMonth} ${tempYear}`
				: `Year ${tempYear}`;
			onApply(filterValue);
		}
	};

	const presetElements = [];
	for (let i = 0; i < presets.length; i++) {
		const p = presets[i];
		presetElements.push(
			<button
				key={p}
				onClick={() => handlePresetClick(p)}
				className={`text-left px-3 py-2 text-xs font-semibold rounded-lg transition-colors
                    ${activePreset === p ? "bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400" : "text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800"}
                `}
			>
				{p}
			</button>,
		);
	}

	const yearOptionsElements = [];
	for (let i = 0; i < YEARS.length; i++) {
		const year = YEARS[i];
		yearOptionsElements.push(
			<button
				key={year}
				onClick={() => {
					setTempYear(year);
					setActivePreset("");
				}}
				className={`px-2.5 py-1 rounded-md text-[10px] font-black transition-all ${tempYear === year ? "bg-orange-500 text-white shadow-sm" : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"}`}
			>
				{year}
			</button>,
		);
	}

	const monthGridElements = [];
	for (let i = 0; i < months.length; i++) {
		const m = months[i];
		monthGridElements.push(
			<button
				key={m}
				onClick={() => handleMonthSelect(m)}
				className={`py-2 rounded-xl text-xs font-semibold transition-all border
                    ${
											tempMonth === m
												? "bg-orange-500 border-orange-500 text-white shadow-md"
												: "bg-white dark:bg-[#1a1a1a] border-gray-100 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
										}
                `}
			>
				{m}
			</button>,
		);
	}

	return (
		<div className="relative">
			<button
				onClick={() => setIsOpen(!isOpen)}
				className={`flex items-center gap-2 bg-white dark:bg-[#121212] border transition-all shadow-sm
                    ${compact ? "px-3 py-1.5 rounded-lg text-xs font-medium" : "px-4 py-2.5 rounded-xl text-sm font-semibold"}
                    ${isOpen ? "border-orange-500 text-orange-600 dark:text-orange-500" : "border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1a1a1a]"}
                `}
			>
				<Calendar
					size={compact ? 14 : 16}
					className={isOpen ? "text-orange-500" : "text-gray-500"}
				/>
				<span>
					{tempMonth
						? `${tempMonth} ${tempYear}`
						: activePreset || `Year ${tempYear}`}
				</span>
				<ChevronDown
					size={compact ? 14 : 16}
					className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
				/>
			</button>

			{isOpen && (
				<>
					<div
						className="fixed inset-0 z-40"
						onClick={() => setIsOpen(false)}
					/>
					<div className="absolute right-0 mt-2 w-80 bg-white dark:bg-[#121212] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl z-50 flex flex-col sm:flex-row overflow-hidden animate-in fade-in slide-in-from-top-2">
						{/* --- LEFT: PRESETS --- */}
						<div className="w-full sm:w-1/3 bg-gray-50 dark:bg-[#0d0d0d] border-b sm:border-b-0 sm:border-r border-gray-200 dark:border-gray-800 p-2 flex flex-col gap-1">
							<p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-3 pt-2 pb-1">
								Presets
							</p>
							{presetElements}
						</div>

						{/* --- RIGHT: DYNAMIC SELECTOR --- */}
						<div className="w-full sm:w-2/3 p-4">
							<div className="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-gray-800 pb-3">
								<span className="text-[10px] font-bold text-gray-400 uppercase">
									Custom Year
								</span>
								<div className="flex gap-1.5">{yearOptionsElements}</div>
							</div>
							<div className="grid grid-cols-3 gap-2">{monthGridElements}</div>

							<div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
								<button
									onClick={() => {
										setTempMonth(null);
										setTempYear(CURRENT_YEAR);
									}}
									className="text-[10px] font-bold text-gray-400 hover:text-red-500"
								>
									Reset
								</button>
								<button
									onClick={handleApply}
									className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-bold rounded-lg hover:opacity-90 transition-opacity"
								>
									Apply Filter
								</button>
							</div>
						</div>
					</div>
				</>
			)}
		</div>
	);
});

// ==========================================
// TYPED SUB-COMPONENTS
// ==========================================
interface CardProps {
	title: string;
	children: ReactNode;
	className?: string;
	action?: ReactNode;
}

const Card = memo(function Card({
	title,
	children,
	className = "",
	action,
}: CardProps) {
	return (
		<div
			className={`bg-white dark:bg-[#121212] border border-gray-100 dark:border-gray-800/80 rounded-3xl p-6 shadow-sm min-w-0 ${className}`}
		>
			<div className="flex items-center justify-between mb-2">
				<div className="flex items-center gap-2 text-gray-900 dark:text-white font-bold truncate">
					<span className="w-1 h-4 bg-orange-500 rounded-full shrink-0"></span>
					<span className="truncate">{title}</span>
				</div>
				{action || (
					<button
						type="button"
						aria-label="More"
						className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 border border-gray-100 dark:border-gray-800 rounded-full shrink-0"
					>
						<MoreHorizontal size={16} />
					</button>
				)}
			</div>
			{children}
		</div>
	);
});

interface DonutLegendProps {
	color: string;
	label: string;
	value: string;
	amount: string;
}

const DonutLegend = memo(function DonutLegend({
	color,
	label,
	value,
	amount,
}: DonutLegendProps) {
	return (
		<div className="flex items-center justify-between text-sm gap-2">
			<div className="flex items-center gap-2 truncate">
				<div className={`w-2.5 h-2.5 rounded-full shrink-0 ${color}`}></div>
				<span className="text-gray-500 dark:text-gray-400 font-medium truncate">
					{label}
				</span>
				<span className="text-[10px] font-bold text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded shrink-0">
					{value}
				</span>
			</div>
			<span className="font-bold text-gray-900 dark:text-white shrink-0">
				{amount}
			</span>
		</div>
	);
});

interface SparklineStatProps {
	title: string;
	amount: string;
	trend: string;
	isPositive: boolean;
	sparklineColor: string;
	path: string;
}

const SparklineStat = memo(function SparklineStat({
	title,
	amount,
	trend,
	isPositive,
	sparklineColor,
	path,
}: SparklineStatProps) {
	const gradId = `grad-${title.replace(/\s/g, "")}`;

	return (
		<div className="flex flex-col min-w-0">
			<div className="flex justify-between items-start mb-1 gap-2">
				<p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate">
					{title}
				</p>
				<span
					className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
						isPositive
							? "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400"
							: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400"
					}`}
				>
					{trend}
				</span>
			</div>
			<h3 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white truncate">
				{amount}
			</h3>

			<svg
				viewBox="0 0 100 30"
				className="w-full h-8 mt-3 shrink-0"
				preserveAspectRatio="none"
			>
				<defs>
					<linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
						<stop offset="0%" stopColor={sparklineColor} stopOpacity="0.25" />
						<stop offset="100%" stopColor={sparklineColor} stopOpacity="0" />
					</linearGradient>
				</defs>
				<path d={`${path} L 100 30 L 0 30 Z`} fill={`url(#${gradId})`} />
				<path
					d={path}
					fill="none"
					stroke={sparklineColor}
					strokeWidth="2.5"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
			</svg>
		</div>
	);
});

interface BudgetProgressProps {
	icon: ElementType;
	name: string;
	spent: number;
	limit: number;
	color: string;
}

const BudgetProgress = memo(function BudgetProgress({
	icon: Icon,
	name,
	spent,
	limit,
	color,
}: BudgetProgressProps) {
	const router = useRouter();

	let percentage = 0;
	if (limit > 0) {
		percentage = Math.min((spent / limit) * 100, 100);
	}
	const isWarning = percentage > 90;

	const handleClick = () => {
		router.push(`/budget/transactions?category=${encodeURIComponent(name)}`);
	};

	return (
		<div
			onClick={handleClick}
			className="group cursor-pointer p-2 -m-2 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-all active:scale-[0.98]"
		>
			<div className="flex justify-between items-center mb-2 gap-2">
				<div className="flex items-center gap-2 truncate">
					<div
						className={`p-1.5 rounded-md text-white shadow-sm transition-transform group-hover:scale-110 shrink-0 ${color}`}
					>
						<Icon size={12} />
					</div>
					<span className="text-sm font-black text-gray-900 dark:text-white group-hover:text-orange-500 transition-colors truncate">
						{name}
					</span>
				</div>
				<div className="text-xs shrink-0">
					<span className="font-mono tabular-nums font-bold text-gray-900 dark:text-white">
						{formatCurrency(spent)}
					</span>
					<span className="font-mono tabular-nums text-gray-400 font-medium">
						{" "}
						/ {formatCurrency(limit)}
					</span>
				</div>
			</div>
			<div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden border border-transparent group-hover:border-white/5">
				<div
					className={`h-full rounded-full transition-all duration-700 ease-out ${isWarning ? "bg-red-500" : color}`}
					style={{ width: `${percentage}%` }}
				/>
			</div>
		</div>
	);
});

interface ActionRowProps {
	day: string;
	month: string;
	title: string;
	subtitle: string;
	amount: string;
	status: "upcoming" | "alert";
}

const ActionRow = memo(function ActionRow({
	day,
	month,
	title,
	subtitle,
	amount,
	status,
}: ActionRowProps) {
	return (
		<div className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-[#1a1a1a] rounded-xl cursor-pointer group transition-colors gap-2">
			<div className="flex items-center gap-4 min-w-0">
				<div
					className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl border shrink-0 ${status === "alert" ? "bg-red-50 border-red-100 dark:bg-red-500/10 dark:border-red-500/20 text-red-600" : "bg-white border-gray-200 dark:bg-[#121212] dark:border-gray-800 text-gray-900 dark:text-white"}`}
				>
					{status === "alert" ? (
						<AlertCircle size={20} />
					) : (
						<>
							<span className="text-[10px] font-bold uppercase leading-none mb-0.5">
								{month}
							</span>
							<span className="text-sm font-black leading-none">{day}</span>
						</>
					)}
				</div>
				<div className="truncate">
					<h4 className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-orange-500 transition-colors truncate">
						{title}
					</h4>
					<p className="text-xs text-gray-500 font-medium mt-0.5 truncate">
						{subtitle}
					</p>
				</div>
			</div>
			<div
				className={`text-sm md:text-base font-bold shrink-0 ${status === "alert" ? "text-orange-500" : "text-gray-900 dark:text-white"}`}
			>
				{amount}
			</div>
		</div>
	);
});
