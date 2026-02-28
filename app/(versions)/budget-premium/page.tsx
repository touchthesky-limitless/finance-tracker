"use client";

import { useState, useMemo, useCallback } from "react";
import {
	ArrowDown,
	Edit3,
	ChevronRight,
	Plus,
	Minus,
	CreditCard,
	PiggyBank,
	Trash2,
} from "lucide-react";
import { Transaction } from "@/store/createBudgetStore";
import {
	PieChart,
	Pie,
	PieSectorDataItem,
	Sector,
	ResponsiveContainer,
} from "recharts";
import { formatMoney } from "@/utils/formatters";
import { useBudgetData } from "@/hooks/useBudgetData";
import CsvUploader from "@/components/CsvUploader";
import ClearDataModal from "@/components/ClearDataModal";
import TransactionDetailsModal from "@/components/Budget/TransactionDetailsModal";
import CategoryDetailsModal from "@/components/Budget/CategoryDetailsModal";
import SidebarList from "@/components/Budget/SidebarList";
import SummaryRow from "@/components/Budget/SummaryRow";
import { useBudgetStore } from "@/hooks/useBudgetStore";

export default function BudgetPage() {
	// Get the versioned hook (This will automatically point to "premium")
	const useStore = useBudgetStore();

	// USE SELECTORS instead of destructuring for reactive updates
	const transactions = useStore((state) => state.transactions);
	const updateTransaction = useStore((state) => state.updateTransaction);

	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

	// State
	const [timeFilter, setTimeFilter] = useState("This Month");
	const [showAllMerchants, setShowAllMerchants] = useState(false);
	const [showAllPurchases, setShowAllPurchases] = useState(false);

	// Pie Chart State
	const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);
	const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
	const [selectedTransaction, setSelectedTransaction] =
		useState<Transaction | null>(null);

	const {
		stats,
		yearTabs,
		filteredTransactions,
		largestPurchases,
		categoryData,
		topMerchants,
		monthlyData,
		maxMonthlyValue,
	} = useBudgetData(timeFilter);

	const uncategorizedCount = categoryData.find(
		(c) => c.name === "Uncategorized",
	)
		? filteredTransactions.filter(
				(t) => !t.category || t.category === "Uncategorized",
			).length
		: 0;

	const onPieEnter = useCallback(
		(_: PieSectorDataItem, index: number) => setActiveIndex(index),
		[],
	);
	const onPieLeave = useCallback(() => setActiveIndex(undefined), []);
	const onPieClick = useCallback(
		(data: PieSectorDataItem) => setSelectedCategory(data.name ?? null),
		[],
	);

	const handleCategorizeClick = () =>
		alert("This would open a bulk categorization wizard.");

	const handleCategoryUpdate = (txId: string, newCategory: string) => {
		updateTransaction(txId, { category: newCategory });
	};

	// const selectedCategoryTransactions = useMemo(() => {
	// 	if (!selectedCategory) return [];
	// 	return filteredTransactions.filter(
	// 		(t) =>
	// 			(t.category || "Uncategorized") === selectedCategory && t.amount < 0,
	// 	);
	// }, [filteredTransactions, selectedCategory]);

	const selectedCategoryTransactions = useMemo(() => {
		if (!selectedCategory) return [];

		// We filter from the most up-to-date source
		return filteredTransactions.filter(
			(t) =>
				(t.category || "Uncategorized") === selectedCategory && t.amount < 0,
		);
		// Add 'transactions' here to ensure that any edit to ANY transaction
		// triggers a re-calculation of this filtered list.
	}, [filteredTransactions, selectedCategory]);

	const selectedCategoryColor =
		categoryData.find((c) => c.name === selectedCategory)?.color ||
		"bg-gray-500";

	const maxAxis =
		maxMonthlyValue > 0 ? Math.ceil(maxMonthlyValue / 100) * 100 : 1000;
	const midAxis = maxAxis / 2;

	return (
		<div className="min-h-screen bg-[#F8F9FB] dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100 p-6 md:p-8 font-sans transition-colors">
			<div className="max-w-375 mx-auto space-y-6">
				{/* HEADER */}
				<header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
					<h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
						Spending
					</h1>
					<div className="bg-white dark:bg-gray-900 rounded-full p-1.5 flex shadow-sm border border-gray-100 dark:border-gray-800 self-start sm:self-auto overflow-x-auto">
						{yearTabs.map((tab) => (
							<button
								key={tab}
								onClick={() => setTimeFilter(tab)}
								className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
									timeFilter === tab
										? "bg-gray-50 dark:bg-gray-800 text-black dark:text-white shadow-sm border border-gray-200 dark:border-gray-700"
										: "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
								}`}
							>
								{tab}
							</button>
						))}
					</div>
				</header>

				{/* TOP BAR CHART */}
				<div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 relative">
					<div className="h-40 flex items-end gap-4 w-full relative pt-6">
						{/* DYNAMIC Y-AXIS LABELS */}
						<div className="hidden md:flex flex-col justify-between h-full text-[10px] text-gray-400 font-medium pb-6 absolute left-0 top-0 bottom-0">
							<span>{formatMoney(maxAxis)}</span>
							<span>{formatMoney(midAxis)}</span>
							<span>$0</span>
						</div>

						<div className="flex-1 ml-0 md:ml-8 flex items-end justify-between h-full border-b border-gray-100 dark:border-gray-800 pb-2 px-2">
							{monthlyData.map((d, i) => {
								const barHeight = maxAxis > 0 ? (d.value / maxAxis) * 100 : 0;
								const displayHeight = d.value > 0 ? Math.max(barHeight, 2) : 0;

								return (
									<div
										key={i}
										className="flex-1 flex flex-col items-center gap-2 group h-full"
									>
										<div className="w-full h-full flex items-end justify-center relative px-1">
											{/* VALUE ON TOP (Visible Always) */}
											{d.value > 0 && (
												<span
													className="absolute text-[9px] font-bold text-gray-400 dark:text-gray-500 mb-1 transition-all"
													style={{ bottom: `${displayHeight}%` }}
												>
													{/* Shorten logic: $1200 -> $1.2k */}
													{d.value >= 1000
														? `$${(d.value / 1000).toFixed(1)}k`
														: `$${Math.round(d.value)}`}
												</span>
											)}

											<div
												className="w-full max-w-6 bg-[#5686F5] dark:bg-[#3b82f6] rounded-t-sm hover:opacity-80 transition-all relative"
												style={{ height: `${displayHeight}%` }}
											>
												{/* Tooltip (Detailed on Hover) */}
												<div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 dark:bg-white text-white dark:text-black text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none shadow-lg">
													{formatMoney(d.value)}
												</div>
											</div>
										</div>
										<span className="text-[10px] font-medium text-gray-400 dark:text-gray-500">
											{d.label}
										</span>
									</div>
								);
							})}
						</div>
					</div>
				</div>

				{/* MAIN GRID */}
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					{/* LEFT COLUMN (2/3) */}
					<div className="lg:col-span-2 space-y-6">
						{/* SPENDING BREAKDOWN */}
						<div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
							<div className="flex justify-between items-center mb-6">
								<h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
									Spending Breakdown
								</h2>
								<div className="flex items-center gap-2 cursor-pointer">
									<span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
										Include bills
									</span>
									<div className="w-9 h-5 bg-[#10B981] rounded-full relative shadow-inner">
										<div className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm" />
									</div>
								</div>
							</div>
							<div className="relative h-75 w-full flex items-center justify-center mb-6">
								<ResponsiveContainer width="100%" height="100%">
									<PieChart>
										<Pie
											data={categoryData}
											cx="50%"
											cy="50%"
											innerRadius={80}
											outerRadius={105}
											startAngle={90} // Starts at the top
											endAngle={-270} // Rotates clockwise
											dataKey="value"
											onClick={onPieClick}
											onMouseEnter={onPieEnter}
											onMouseLeave={onPieLeave}
											stroke="none"
											cursor="pointer"
											shape={(props: PieSectorDataItem & { index: number }) => {
												const isActive = props.index === activeIndex;
												return (
													<Sector
														{...props}
														outerRadius={
															isActive
																? props.outerRadius! + 10
																: props.outerRadius
														}
													/>
												);
											}}
										/>
									</PieChart>
								</ResponsiveContainer>

								{/* DYNAMIC CENTER TEXT */}
								<div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 transition-all duration-300">
									{activeIndex !== undefined && categoryData[activeIndex] ? (
										/* HOVER STATE: Show Category Name and Amount */
										<>
											<span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide animate-in fade-in duration-200">
												{categoryData[activeIndex].name}
											</span>
											<span className="text-2xl font-bold text-gray-900 dark:text-white mt-1 animate-in slide-in-from-bottom-1 duration-200">
												{formatMoney(categoryData[activeIndex].value)}
											</span>
										</>
									) : (
										/* DEFAULT STATE: Show Total Spend */
										<>
											<span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
												Total Spend
											</span>
											<span className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
												{formatMoney(stats.expenses)}
											</span>
										</>
									)}
								</div>

								{activeIndex === undefined && (
									<div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 transition-opacity duration-300">
										<span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
											Total Spend
										</span>
										<span className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
											{formatMoney(stats.expenses)}
										</span>
									</div>
								)}
							</div>
							<div>
								<div className="flex items-center text-[11px] font-bold text-gray-400 pb-3 border-b border-gray-100 dark:border-gray-800">
									<div className="flex-1 pl-2">Category</div>
									<div className="w-24 text-right">% Spend</div>
									<div className="w-24 text-right mr-4">Change</div>
									<div className="w-28 text-right pr-2">Amount</div>
								</div>
								<div className="divide-y divide-gray-50 dark:divide-gray-800/50">
									{categoryData.map((cat, i) => (
										<div
											key={i}
											onMouseEnter={() => setActiveIndex(i)}
											onMouseLeave={() => setActiveIndex(undefined)}
											onClick={() => setSelectedCategory(cat.name)}
											className={`flex items-center py-4 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors -mx-2 px-2 rounded-lg cursor-pointer group ${activeIndex === i ? "bg-gray-50 dark:bg-gray-800/30" : ""}`}
										>
											<div className="flex-1 flex items-center gap-3">
												<div
													className={`w-8 h-8 rounded-full bg-opacity-10 dark:bg-opacity-20 flex items-center justify-center`}
													style={{ backgroundColor: cat.fill + "20" }}
												>
													<cat.icon size={14} style={{ color: cat.fill }} />
												</div>
												<span className="text-sm font-medium text-gray-700 dark:text-gray-200">
													{cat.name}
												</span>
											</div>
											<div className="w-24 text-right text-sm text-gray-500 dark:text-gray-400">
												{cat.percent}% of spend
											</div>
											<div className="w-24 flex justify-end items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400 mr-4">
												<ArrowDown size={12} />
												<span>--%</span>
											</div>
											<div className="w-28 text-right text-sm font-bold text-gray-900 dark:text-white pr-2">
												{formatMoney(cat.value)}
											</div>
										</div>
									))}
								</div>
							</div>
						</div>

						{/* NON-SPENDING */}
						<div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
							<h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">
								Non-Spending
							</h3>
							<div className="space-y-4">
								{["Internal Transfers", "Ignored"].map((label, idx) => (
									<div
										key={idx}
										className="flex justify-between items-center group"
									>
										<div className="flex items-center gap-3">
											<div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 dark:text-gray-500">
												<CreditCard size={14} />
											</div>
											<span className="text-sm font-medium text-gray-700 dark:text-gray-300">
												{label}
											</span>
										</div>
										<span className="text-sm font-bold text-gray-900 dark:text-white">
											$0
										</span>
									</div>
								))}
							</div>
						</div>
					</div>

					{/* RIGHT COLUMN (1/3) */}
					<div className="space-y-6">
						{/* SIDEBAR WIDGETS (Categorize, Summary, Frequent, Largest) */}
						<div
							onClick={handleCategorizeClick}
							className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800 cursor-pointer hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800 transition-all group"
						>
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-3">
									<div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 transition-colors">
										<Edit3
											size={14}
											className="text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400"
										/>
									</div>
									<span className="text-sm font-semibold text-gray-900 dark:text-white">
										Update {uncategorizedCount > 0 ? uncategorizedCount : ""}{" "}
										transactions
									</span>
								</div>
								<ChevronRight
									size={16}
									className="text-gray-400 group-hover:text-blue-500 transition-colors"
								/>
							</div>
						</div>

						{/* SUMMARY */}
						<div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 space-y-6">
							<div className="flex justify-between items-center">
								<h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
									Summary
								</h3>
								<span className="text-[10px] text-gray-400">
									Jan 1 - Dec 31, {timeFilter}
								</span>
							</div>
							<SummaryRow
								label="Income"
								value={formatMoney(stats.income)}
								icon={Plus}
								iconColor="text-green-500"
								valueColor="text-green-600"
								transactions={transactions}
								/>
							<SummaryRow
								label="Spending"
								value={formatMoney(stats.expenses)}
								icon={Minus}
								iconColor="text-gray-500"
								transactions={transactions}
							/>
							<div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
								<div className="flex gap-3">
									<div className="w-6 h-6 rounded-full border border-orange-300 dark:border-orange-700 flex items-center justify-center text-orange-500 dark:text-orange-400">
										<PiggyBank size={12} />
									</div>
									<div>
										<p className="text-sm font-semibold text-gray-900 dark:text-white">
											Left for Savings
										</p>
										<p className="text-[10px] text-gray-400 max-w-30 leading-tight">
											Net flow
										</p>
									</div>
								</div>
								<span
									className={`text-sm font-bold ${stats.savings >= 0 ? "text-green-600 dark:text-green-400" : "text-orange-500 dark:text-orange-400"}`}
								>
									{stats.savings >= 0 ? "+" : ""}
									{formatMoney(stats.savings)}
								</span>
							</div>
						</div>

						{/* FREQUENT & LARGEST LISTS */}
						<SidebarList
							title="Frequent Spend"
							items={topMerchants}
							showAll={showAllMerchants}
							onToggle={() => setShowAllMerchants(!showAllMerchants)}
						/>
						<SidebarList
							title="Largest Purchases"
							items={largestPurchases}
							showAll={showAllPurchases}
							onToggle={() => setShowAllPurchases(!showAllPurchases)}
							isPurchaseList
						/>

						<div className="flex items-center gap-2 pt-2 opacity-60 hover:opacity-100 transition-opacity">
							<div className="flex-1">
								<CsvUploader />
							</div>
							<button
								onClick={() => setIsDeleteModalOpen(true)}
								className="p-2.5 bg-white dark:bg-gray-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors"
							>
								<Trash2 size={16} />
							</button>
						</div>
					</div>
				</div>

				{/* MODALS */}
				<CategoryDetailsModal
					isOpen={!!selectedCategory}
					onClose={() => setSelectedCategory(null)}
					category={selectedCategory || ""}
					transactions={selectedCategoryTransactions}
					color={selectedCategoryColor}
					onUpdateCategory={handleCategoryUpdate}
					onTransactionClick={setSelectedTransaction}
				/>
				{selectedTransaction && (
					<TransactionDetailsModal
						transaction={selectedTransaction}
						isOpen={!!selectedTransaction}
						onClose={() => setSelectedTransaction(null)}
						onUpdateCategory={handleCategoryUpdate}
					/>
				)}
				<ClearDataModal
					isOpen={isDeleteModalOpen}
					onClose={() => setIsDeleteModalOpen(false)}
				/>
			</div>
		</div>
	);
}
