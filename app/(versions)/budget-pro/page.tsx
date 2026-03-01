"use client";

import { useState, ReactNode, ElementType, useMemo } from "react";
import {
	Download,
	MoreHorizontal,
	Landmark,
	TrendingUp,
	CreditCard,
	Home,
	PiggyBank,
	AlertCircle,
	ArrowRight,
	Calendar,
	ChevronDown,
	ChevronLeft,
} from "lucide-react";
import { useBudgetData } from "@/hooks/useBudgetData";

export default function OverviewPage() {
	const [timeFilter, setTimeFilter] = useState("Year 2026");
	const FALL_BACK_DATE = "This Month";

	const {
		stats,
		categoryData,
		monthlyData,
		maxMonthlyValue,
		topMerchants,
		largestPurchases,
		predictedBills,
	} = useBudgetData(timeFilter);

	// --- HELPERS ---
	const formatCurrency = (num: number) => {
		if (isNaN(num) || num === undefined) return "$0.00";
		return `$${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
	};

	const formatCompact = (num: number) => {
		if (isNaN(num) || num === undefined) return "$0k";
		return `$${(num / 1000).toFixed(1)}k`;
	};

	const formatYAxis = (num: number) => {
		if (num === 0) return "0";
		if (num >= 1000) return `$${Math.round(num / 1000)}k`;
		return `$${Math.round(num)}`;
	};

	// Inside your OverviewPage component
	// Update this at the top of your OverviewPage component
	const activeYear = useMemo(() => {
		// Look for a 4-digit number in the timeFilter string (e.g., "Year 2025" or "Jan 2025")
		const match = timeFilter.match(/\d{4}/);
		if (match) return parseInt(match[0]);

		// Fallback: If it's a preset like "This Month", use the actual current year
		return new Date().getFullYear();
	}, [timeFilter]);

	// --- CALCULATIONS ---
	const remainingPct =
		stats.income > 0
			? Math.min(
					Math.round((Math.max(stats.remaining, 0) / stats.income) * 100),
					100,
				)
			: 0;
	const spentPct =
		stats.income > 0 ? Math.round((stats.expenses / stats.income) * 100) : 0;
	const renderSpent = Math.min(spentPct, 100);

	const yAxisLabels = useMemo(() => {
		const topScale = Math.ceil((maxMonthlyValue || 1000) / 1000) * 1000;
		return [
			formatYAxis(topScale),
			formatYAxis(topScale * 0.66),
			formatYAxis(topScale * 0.33),
			"0",
		];
	}, [maxMonthlyValue]);

	return (
		<div className="relative w-full">
			{/* --- STICKY HEADER --- 
			    We use sticky top-0 with a backdrop blur. 
			    -mx-4 and px-4 ensure the background spans the full width of the container padding. 
			*/}
			<header className="sticky top-0 z-100 w-full bg-[#F4F6F8]/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-800/50 mb-8">
				<div className="max-w-400 mx-auto flex flex-col lg:flex-row lg:items-end justify-between gap-6 py-6 px-4 md:px-8">
					<div className="max-w-2xl">
						<h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white tracking-tight mb-2">
							Financial Overview
						</h1>
						<p className="text-sm text-gray-500 dark:text-gray-400">
							You have{" "}
							<strong className="text-gray-900 dark:text-white font-medium">
								{formatCurrency(stats.remaining)}
							</strong>{" "}
							safe to spend before your next payday.
						</p>
					</div>

					<div className="flex flex-wrap items-center gap-3 shrink-0">
						<DateRangeDropdown
							onApply={(val) => {
								const selectedDate = val || FALL_BACK_DATE;
								// 1. Update the Master Filter for the whole page
								setTimeFilter(selectedDate);
							}}
						/>
						<button className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-orange-600/20">
							<Download size={16} />
							<span className="hidden sm:inline">Export</span>
						</button>
					</div>
				</div>
			</header>

			{/* --- CONTENT WRAPPER --- */}
			<main className="max-w-400 mx-auto px-4 md:px-8 pb-24">
				{/* --- TOP ROW: Hero Summary --- */}
				<div className="bg-white dark:bg-[#121212] border border-gray-100 dark:border-gray-800/80 rounded-3xl p-6 shadow-sm mb-6 flex flex-col lg:flex-row items-center gap-8 relative z-10">
					<div className="flex items-center gap-6 w-full lg:w-[35%] lg:border-r border-gray-100 dark:border-gray-800 lg:pr-8 shrink-0">
						<div
							className="relative w-28 h-28 shrink-0 rounded-full flex items-center justify-center drop-shadow-sm"
							style={{
								background: `conic-gradient(#10b981 0% ${remainingPct}%, #8b5cf6 ${remainingPct}% ${remainingPct + renderSpent}%, #f59e0b ${remainingPct + renderSpent}% 100%)`,
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
						<div className="flex flex-col gap-3 w-full">
							<DonutLegend
								color="bg-green-500"
								label="Remaining"
								value={`${remainingPct}%`}
								amount={formatCurrency(stats.remaining)}
							/>
							<DonutLegend
								color="bg-purple-500"
								label="Spent"
								value={`${spentPct}%`}
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

					<div className="w-full lg:w-[65%] grid grid-cols-1 sm:grid-cols-3 gap-6 lg:gap-8">
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
							amount="$12,340"
							trend="+0.8%"
							isPositive={false}
							sparklineColor="#f59e0b"
							path="M0 5 C 20 5, 40 15, 60 10 C 80 5, 90 15, 100 20"
						/>
						<SparklineStat
							title="Net Worth"
							amount="$142,500"
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
								{/* Reset / Drill-up Button */}
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

								{/* Year Toggler (Only show if not drilled down) */}
								{monthlyData.length <= 12 && (
									<div className="flex bg-[#121212]-100 dark:bg-[#121212]-800 p-1 rounded-lg">
										{[2024, 2025, 2026].map((y) => (
											<button
												key={y}
												onClick={() => {
													const newYearFilter = `Year ${y}`;
													setTimeFilter(newYearFilter);
												}}
												className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${
													activeYear === y
														? "bg-white dark:bg-[#121212] text-orange-600 dark:text-orange-500 shadow-sm"
														: "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
												}`}
											>
												{y}
											</button>
										))}
									</div>
								)}
							</div>
						}
					>
						<div className="flex items-center justify-between mt-4 mb-8">
							<div className="flex flex-col">
								<span className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
									{formatCurrency(stats.expenses).split(".")[0]}
									<span className="text-gray-400 text-2xl">
										.{formatCurrency(stats.expenses).split(".")[1]}
									</span>
								</span>
								<span className="text-sm text-gray-500 font-medium mt-1">
									{/* Dynamic Subtitle based on data length */}
									{monthlyData.length <= 12
										? `Total spent in ${activeYear}`
										: `Daily spending for ${timeFilter}`}
								</span>
							</div>
						</div>

						<div className="flex h-48 w-full mb-2">
							<div className="flex flex-col justify-between text-[10px] font-bold text-gray-400 text-right pr-3 pb-1 w-10 shrink-0 mt-0.5">
								{yAxisLabels.map((label, idx) => (
									<span key={idx}>{label}</span>
								))}
							</div>
							<div className="relative flex-1 flex items-end gap-1 sm:gap-2 px-1 border-b border-gray-100 dark:border-gray-800/50">
								<div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-1">
									<div className="w-full border-t border-gray-100 dark:border-gray-800/30 h-0 mt-2"></div>
									<div className="w-full border-t border-gray-100 dark:border-gray-800/30 h-0"></div>
									<div className="w-full border-t border-gray-100 dark:border-gray-800/30 h-0"></div>
									<div className="w-full h-0"></div>
								</div>
								{monthlyData.map((d, i) => {
									// 1. Check if we are in Yearly view (12 bars) or Daily view (28-31 bars)
									const isYearlyView = monthlyData.length <= 12;
									// Check if active (only highlight specific month in year view)
									const isActive = isYearlyView && timeFilter.includes(d.label);
									return (
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
											{/* Tooltip */}
											<div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[10px] font-bold py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none shadow-lg">
												{isYearlyView ? d.label : `Day ${d.label}`}:{" "}
												{formatCurrency(d.value)}
											</div>

											{/* Active Indicator (Dot) */}
											{isActive && (
												<div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-1 h-1 bg-orange-600 rounded-full" />
											)}
										</div>
									);
								})}
							</div>
						</div>
						{/* --- X-AXIS LABELS --- */}
						<div className="flex justify-between text-[10px] sm:text-xs text-gray-400 font-bold tracking-wider pl-12 pr-2 mt-2">
							{monthlyData.map((d, i) => {
								// Handle label density for Daily view vs Monthly view
								const isDaily = monthlyData.length > 12;
								const shouldShowLabel = isDaily
									? i % 5 === 0 || i === monthlyData.length - 1
									: true;

								return (
									<span
										key={i}
										className={`flex-1 text-center ${!shouldShowLabel && isDaily ? "invisible" : ""}`}
									>
										{d.label}
									</span>
								);
							})}
						</div>
					</Card>

					<Card className="xl:col-span-1 flex flex-col" title="Top Budgets">
						<div className="flex-1 flex flex-col gap-5 mt-4">
							{categoryData.length > 0 ? (
								categoryData
									.slice(0, 5)
									.map((cat) => (
										<BudgetProgress
											key={cat.name}
											icon={cat.icon || Home}
											name={cat.name}
											spent={cat.value}
											limit={cat.value + 200}
											color={cat.color}
										/>
									))
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
					{/* COLUMN 1: TOP MERCHANTS & LARGEST HITS */}
					<Card title="Merchant Insights">
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mt-4">
							{/* Top Merchants List */}
							<div>
								<p className="text-[10px] font-black text-gray-400 tracking-widest mb-4">
									Top Merchants
								</p>
								<div className="flex flex-col gap-4">
									{topMerchants.slice(0, 5).map((m) => (
										<div
											key={m.name}
											className="flex items-start justify-between group gap-4" // Changed items-center to items-start
										>
											{/* Left side: Icon + Name Info */}
											<div className="flex items-start gap-3 min-w-0 flex-1">
												{/* Icon wrapper */}
												<div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-500 group-hover:bg-orange-100 dark:group-hover:bg-orange-500/20 group-hover:text-orange-600 transition-colors shrink-0">
													{m.name.charAt(0)}
												</div>

												{/* Text wrapper */}
												<div className="min-w-0 pt-0.5">
													{" "}
													{/* Added slight padding to align with icon top */}
													<p className="text-sm font-bold text-gray-900 dark:text-white truncate leading-none mb-1">
														{m.name}
													</p>
													<p className="text-[10px] text-gray-500 font-medium leading-none">
														{m.count} transactions
													</p>
												</div>
											</div>

											{/* Right side: Currency aligned to the top name */}
											<span className="text-sm font-black text-gray-900 dark:text-white whitespace-nowrap ">
												{formatCurrency(m.total)}
											</span>
										</div>
									))}
								</div>
							</div>

							{/* Largest Hits List */}
							<div className="border-l border-gray-100 dark:border-gray-800 pl-8">
								<p className="text-[10px] font-black text-gray-400 tracking-widest mb-4">
									Largest Hits
								</p>
								<div className="flex flex-col gap-4">
									{largestPurchases.slice(0, 5).map((t, i) => (
										<div key={i} className="flex flex-col gap-1">
											<div className="flex justify-between items-center">
												<span className="text-sm font-bold text-gray-900 dark:text-white truncate max-w-[100px]">
													{t.description}
												</span>
												<span className="text-sm font-black text-white-600 dark:text-white-400">
													-{formatCurrency(Math.abs(t.amount))}
												</span>
											</div>
											<span className="text-[10px] text-gray-500 font-medium italic">
												{new Date(t.date).toLocaleDateString("en-US", {
													month: "short",
													day: "numeric",
												})}
											</span>
										</div>
									))}
								</div>
							</div>
						</div>
					</Card>

					{/* COLUMN 2: UPCOMING ACTIONS (PREDICTED) */}
					<Card title="Predicted Bills & Subscriptions">
						<div className="flex flex-col gap-1 mt-4">
							{predictedBills.length > 0 ? (
								predictedBills.map((bill, i) => (
									<ActionRow
										key={i}
										day={bill.dueDate.getDate().toString().padStart(2, "0")}
										month={bill.dueDate.toLocaleDateString("en-US", {
											month: "short",
										})}
										title={bill.name}
										subtitle={`Estimated based on ${bill.frequency} history`}
										amount={formatCurrency(bill.avgAmount)}
										status="upcoming"
									/>
								))
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

function DateRangeDropdown({
	compact = false,
	onApply,
}: DateRangeDropdownProps) {
	const [isOpen, setIsOpen] = useState(false);

	// Track both Month and Year locally until "Apply" is clicked
	const [tempYear, setTempYear] = useState(new Date().getFullYear());
	const [tempMonth, setTempMonth] = useState<string | null>(null);
	const [activePreset, setActivePreset] = useState("This Year");

	const presets = [
		"Today",
		"This Week",
		"This Month",
		"Last Month",
		"Last 12 Months",
		"Year to Date",
	];
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
	const years = [2024, 2025, 2026];

	const handlePresetClick = (preset: string) => {
		setActivePreset(preset);
		setTempMonth(null);
		setIsOpen(false);

		let filterValue = preset;

		// If the user clicks "This Year", send "Year 2026" to the hook
		if (preset === "This Year") {
			filterValue = `Year ${new Date().getFullYear()}`;
		}

		if (onApply) onApply(filterValue);
	};

	const handleMonthSelect = (month: string) => {
		setTempMonth(month);
		setActivePreset(""); // Clear preset highlight because we are being specific
	};

	const handleApply = () => {
		setIsOpen(false);
		if (onApply) {
			// If a month is selected, send "Jan 2026", else send "Year 2026"
			const filterValue = tempMonth
				? `${tempMonth} ${tempYear}`
				: `Year ${tempYear}`;
			onApply(filterValue);
		}
	};

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
					<div className="absolute right-0 mt-2 w-[320px] sm:w-120 bg-white dark:bg-[#121212] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl z-50 flex flex-col sm:flex-row overflow-hidden animate-in fade-in slide-in-from-top-2">
						{/* --- LEFT: PRESETS --- */}
						<div className="w-full sm:w-1/3 bg-gray-50 dark:bg-[#0d0d0d] border-b sm:border-b-0 sm:border-r border-gray-200 dark:border-gray-800 p-2 flex flex-col gap-1">
							<p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-3 pt-2 pb-1">
								Presets
							</p>
							{presets.map((p) => (
								<button
									key={p}
									onClick={() => handlePresetClick(p)}
									className={`text-left px-3 py-2 text-xs font-semibold rounded-lg transition-colors
                                        ${activePreset === p ? "bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400" : "text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800"}
                                    `}
								>
									{p}
								</button>
							))}
						</div>

						{/* --- RIGHT: DYNAMIC SELECTOR --- */}
						<div className="w-full sm:w-2/3 p-4">
							{/* YEAR PICKER */}
							<div className="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-gray-800 pb-3">
								<span className="text-[10px] font-bold text-gray-400 uppercase">
									Custom Year
								</span>
								<div className="flex gap-1.5">
									{years.map((y) => (
										<button
											key={y}
											onClick={() => {
												setTempYear(y);
												setActivePreset("");
											}}
											className={`px-2.5 py-1 rounded-md text-[10px] font-black transition-all ${tempYear === y ? "bg-orange-500 text-white shadow-sm" : "bg-gray-100 dark:bg-gray-800 text-gray-500"}`}
										>
											{y}
										</button>
									))}
								</div>
							</div>

							{/* MONTH GRID */}
							<div className="grid grid-cols-3 gap-2">
								{months.map((m) => (
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
									</button>
								))}
							</div>

							<div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
								<button
									onClick={() => {
										setTempMonth(null);
										setTempYear(2026);
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
}

// ==========================================
// TYPED SUB-COMPONENTS
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
					<span className="w-1 h-4 bg-orange-500 rounded-full"></span>
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

interface DonutLegendProps {
	color: string;
	label: string;
	value: string;
	amount: string;
}

function DonutLegend({ color, label, value, amount }: DonutLegendProps) {
	return (
		<div className="flex items-center justify-between text-sm">
			<div className="flex items-center gap-2">
				<div className={`w-2.5 h-2.5 rounded-full ${color}`}></div>
				<span className="text-gray-500 dark:text-gray-400 font-medium">
					{label}
				</span>
				<span className="text-[10px] font-bold text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
					{value}
				</span>
			</div>
			<span className="font-bold text-gray-900 dark:text-white">{amount}</span>
		</div>
	);
}

interface SparklineStatProps {
	title: string;
	amount: string;
	trend: string;
	isPositive: boolean;
	sparklineColor: string;
	path: string;
}

function SparklineStat({
	title,
	amount,
	trend,
	isPositive,
	sparklineColor,
	path,
}: SparklineStatProps) {
	const gradId = `grad-${title.replace(/\s/g, "")}`;

	return (
		<div className="flex flex-col">
			<div className="flex justify-between items-start mb-1">
				<p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
					{title}
				</p>
				<span
					className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
						isPositive
							? "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400"
							: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400"
					}`}
				>
					{trend}
				</span>
			</div>
			<h3 className="text-2xl font-black text-gray-900 dark:text-white">
				{amount}
			</h3>

			<svg
				viewBox="0 0 100 30"
				className="w-full h-8 mt-3"
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
}

interface BudgetProgressProps {
	icon: ElementType;
	name: string;
	spent: number;
	limit: number;
	color: string;
}

function BudgetProgress({
	icon: Icon,
	name,
	spent,
	limit,
	color,
}: BudgetProgressProps) {
	const percentage = Math.min((spent / limit) * 100, 100);
	const isWarning = percentage > 90;

	return (
		<div>
			<div className="flex justify-between items-center mb-2">
				<div className="flex items-center gap-2">
					<div className={`p-1.5 rounded-md text-white shadow-sm ${color}`}>
						<Icon size={12} />
					</div>
					<span className="text-sm font-bold text-gray-900 dark:text-white">
						{name}
					</span>
				</div>
				<div className="text-xs">
					<span className="font-bold text-gray-900 dark:text-white">
						${spent}
					</span>
					<span className="text-gray-400 font-medium">
						{" "}
						/ ${Number(limit.toFixed(2))}
					</span>
				</div>
			</div>
			<div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
				<div
					className={`h-full rounded-full transition-all duration-500 ${isWarning ? "bg-red-500" : color}`}
					style={{ width: `${percentage}%` }}
				></div>
			</div>
		</div>
	);
}

interface AccountBoxProps {
	icon: ElementType;
	bg: string;
	type: string;
	name: string;
	balance: string;
	isDebt?: boolean;
}

function AccountBox({
	icon: Icon,
	bg,
	type,
	name,
	balance,
	isDebt = false,
}: AccountBoxProps) {
	return (
		<div className="p-4 border border-gray-100 dark:border-gray-800 rounded-2xl hover:border-orange-500/30 transition-colors cursor-pointer group">
			<div className="flex items-center gap-3 mb-4">
				<div
					className={`w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-sm ${bg}`}
				>
					<Icon size={14} />
				</div>
				<div>
					<p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
						{type}
					</p>
					<h4 className="text-sm font-bold text-gray-900 dark:text-white">
						{name}
					</h4>
				</div>
			</div>
			<div
				className={`text-lg font-bold ${isDebt ? "text-gray-900 dark:text-white" : "text-green-600 dark:text-green-400"}`}
			>
				{balance}
			</div>
		</div>
	);
}

interface ActionRowProps {
	day: string;
	month: string;
	title: string;
	subtitle: string;
	amount: string;
	status: "upcoming" | "alert";
}

function ActionRow({
	day,
	month,
	title,
	subtitle,
	amount,
	status,
}: ActionRowProps) {
	return (
		<div className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-[#1a1a1a] rounded-xl cursor-pointer group transition-colors">
			<div className="flex items-center gap-4">
				<div
					className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl border ${status === "alert" ? "bg-red-50 border-red-100 dark:bg-red-500/10 dark:border-red-500/20 text-red-600" : "bg-white border-gray-200 dark:bg-[#121212] dark:border-gray-800 text-gray-900 dark:text-white"}`}
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
				<div>
					<h4 className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-orange-500 transition-colors">
						{title}
					</h4>
					<p className="text-xs text-gray-500 font-medium mt-0.5">{subtitle}</p>
				</div>
			</div>
			<div
				className={`text-sm font-bold ${status === "alert" ? "text-orange-500" : "text-gray-900 dark:text-white"}`}
			>
				{amount}
			</div>
		</div>
	);
}
