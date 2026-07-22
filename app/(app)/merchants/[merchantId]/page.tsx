"use client";

import { useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, Pencil } from "lucide-react";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import type { SortingState } from "@tanstack/react-table";

import EditTransactionModal from "@/components/Budget/EditTransactionModal";
import { DataTable } from "@/components/Transactions/DataTable";
import { useUnifiedCategories } from "@/hooks/useUnifiedCategories";
import {
	getTransactionMerchantId,
	normalizeMerchantName,
	useUnifiedMerchants,
} from "@/hooks/useUnifiedMerchants";
import { useBudgetStore, type Transaction } from "@/store/useBudgetStore";
import { formatCurrency } from "@/utils/formatters";
import { useMerchantOptions } from "@/hooks/useMerchantOptions";

interface ChartData {
	period: string;
	amount: number;
	isActive: boolean;
}

interface SummaryStats {
	count: number;
	totalAmount: number;
	largest: number;
	average: number;
}

const TIMEFRAME_OPTIONS = [
	{ label: "Monthly", value: "month" },
	{ label: "Quarterly", value: "quarter" },
	{ label: "Yearly", value: "year" },
] as const;

const monthFormatter = new Intl.DateTimeFormat("en-US", {
	month: "short",
	timeZone: "UTC",
});

function getTransactionYear(dateValue: string): number | null {
	const date = new Date(dateValue);

	if (Number.isNaN(date.getTime())) {
		return null;
	}

	return date.getUTCFullYear();
}

function normalizeName(value: string | null | undefined): string {
	return value?.trim().toLowerCase() ?? "";
}

function getMerchantTransactions(
	transactions: Transaction[],
	merchantId: string,
	merchantName?: string,
): Transaction[] {
	if (!merchantId) {
		return [];
	}

	const normalizedMerchantName = merchantName
		? normalizeMerchantName(merchantName)
		: "";

	return transactions.filter((transaction) => {
		if (getTransactionMerchantId(transaction) === merchantId) {
			return true;
		}

		return (
			normalizedMerchantName.length > 0 &&
			normalizeMerchantName(transaction.merchant) === normalizedMerchantName
		);
	});
}

function getTransactionsForYear(
	transactions: Transaction[],
	year: number,
): Transaction[] {
	return transactions.filter((transaction) => {
		return getTransactionYear(transaction.date) === year;
	});
}

function buildChartData(
	transactions: Transaction[],
	activeTimeframe: string,
	activeYear: number,
): ChartData[] {
	if (activeTimeframe === "month") {
		const totals = new Array<number>(12).fill(0);

		for (const transaction of transactions) {
			const date = new Date(transaction.date);

			if (
				Number.isNaN(date.getTime()) ||
				date.getUTCFullYear() !== activeYear
			) {
				continue;
			}

			totals[date.getUTCMonth()] += Math.abs(Number(transaction.amount) || 0);
		}

		const currentDate = new Date();
		const currentMonth =
			currentDate.getFullYear() === activeYear ? currentDate.getMonth() : -1;

		return totals.map((amount, monthIndex) => {
			return {
				period: monthFormatter.format(
					new Date(Date.UTC(activeYear, monthIndex, 1)),
				),
				amount,
				isActive: monthIndex === currentMonth,
			};
		});
	}

	if (activeTimeframe === "quarter") {
		const totals = new Array<number>(4).fill(0);

		for (const transaction of transactions) {
			const date = new Date(transaction.date);

			if (
				Number.isNaN(date.getTime()) ||
				date.getUTCFullYear() !== activeYear
			) {
				continue;
			}

			const quarterIndex = Math.floor(date.getUTCMonth() / 3);

			totals[quarterIndex] += Math.abs(Number(transaction.amount) || 0);
		}

		const currentDate = new Date();
		const currentQuarter =
			currentDate.getFullYear() === activeYear
				? Math.floor(currentDate.getMonth() / 3)
				: -1;

		return totals.map((amount, quarterIndex) => {
			return {
				period: `Q${quarterIndex + 1}`,
				amount,
				isActive: quarterIndex === currentQuarter,
			};
		});
	}

	return [activeYear - 2, activeYear - 1, activeYear].map((year) => {
		let amount = 0;

		for (const transaction of transactions) {
			if (getTransactionYear(transaction.date) === year) {
				amount += Math.abs(Number(transaction.amount) || 0);
			}
		}

		return {
			period: String(year),
			amount,
			isActive: year === activeYear,
		};
	});
}

function buildSummaryStats(transactions: Transaction[]): SummaryStats {
	let totalAmount = 0;
	let largest = 0;

	for (const transaction of transactions) {
		const amount = Math.abs(Number(transaction.amount) || 0);

		totalAmount += amount;
		largest = Math.max(largest, amount);
	}

	const count = transactions.length;

	return {
		count,
		totalAmount,
		largest,
		average: count > 0 ? totalAmount / count : 0,
	};
}

export default function MerchantBreakdownPage() {
	const params = useParams<{ merchantId: string }>();
	const router = useRouter();
	const searchParams = useSearchParams();

	const merchantId = params.merchantId
		? decodeURIComponent(params.merchantId)
		: "";

	const activeTimeframe = searchParams.get("timeframe") || "year";
	const activeDateString =
		searchParams.get("date") || `${new Date().getFullYear()}-01-01`;

	const parsedYear = Number.parseInt(activeDateString.substring(0, 4), 10);
	const activeYear = Number.isFinite(parsedYear)
		? parsedYear
		: new Date().getFullYear();

	const transactions = useBudgetStore((state) => {
		return state.transactions;
	});

	const updateTransaction = useBudgetStore((state) => {
		return state.updateTransaction;
	});

	const [selectedTransaction, setSelectedTransaction] =
		useState<Transaction | null>(null);
	const [selectedIds, setSelectedIds] = useState<string[]>([]);
	const [sorting] = useState<SortingState>([{ id: "date", desc: true }]);

	const { allUnifiedCategories } = useUnifiedCategories("Expense", "All");
	const categoryIdByName = new Map<string, string>();

	for (const category of allUnifiedCategories) {
		if (category.id) {
			categoryIdByName.set(normalizeName(category.name), category.id);
		}
	}

	const getCategoryId = (categoryName: string): string | undefined => {
		return categoryIdByName.get(normalizeName(categoryName));
	};

	const { getMerchantById, getMerchantId } = useUnifiedMerchants();
	const merchant = getMerchantById(merchantId);
	const merchantName = merchant?.name || "Unknown Merchant";
	const merchantItems = useMerchantOptions();

	const merchantTransactions = getMerchantTransactions(
		transactions,
		merchantId,
		merchant?.name,
	);
	const visibleTransactions = getTransactionsForYear(
		merchantTransactions,
		activeYear,
	);
	const chartData = buildChartData(
		merchantTransactions,
		activeTimeframe,
		activeYear,
	);
	const summaryStats = buildSummaryStats(visibleTransactions);
	const merchantInitial = merchantName.charAt(0).toUpperCase() || "?";

	return (
		<div className="flex h-screen flex-col bg-gray-50 font-sans text-gray-900 transition-colors duration-200 dark:bg-[#121212] dark:text-gray-200">
			<div className="z-30 flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 pt-5 pb-4 transition-colors duration-200 dark:border-white/5 dark:bg-[#191919]">
				<div className="flex items-center gap-3">
					<button
						type="button"
						onClick={() => {
							router.back();
						}}
						className="flex items-center gap-1 text-[15px] font-medium text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
					>
						Transactions
						<ChevronRight size={16} />
					</button>

					<div className="ml-2 flex items-center gap-3">
						<div
							aria-hidden="true"
							className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-base font-black text-[#FF5A35] dark:bg-white"
						>
							{merchantInitial}
						</div>

						<h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
							{merchantName}
						</h1>
					</div>
				</div>

				<div className="flex items-center gap-4">
					<div className="flex rounded-xl border border-gray-200 bg-gray-200/50 p-1 transition-colors dark:border-white/5 dark:bg-[#191919]">
						{TIMEFRAME_OPTIONS.map((option) => {
							const isActive = option.value === activeTimeframe;

							return (
								<button
									key={option.value}
									type="button"
									onClick={() => {
										const nextParams = new URLSearchParams(
											searchParams.toString(),
										);

										nextParams.set("timeframe", option.value);

										router.push(`?${nextParams.toString()}`);
									}}
									className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-all ${
										isActive
											? "border border-gray-200 bg-white text-gray-900 shadow-sm dark:border-transparent dark:bg-[#2A2A2A] dark:text-white"
											: "text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-200"
									}`}
								>
									{option.label}
								</button>
							);
						})}
					</div>

					<button
						type="button"
						className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-white/10 dark:bg-[#191919] dark:text-white dark:hover:bg-white/5"
					>
						<Pencil size={14} />
						Edit merchant
					</button>

					<button
						type="button"
						className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-white/10 dark:bg-[#191919] dark:text-white dark:hover:bg-white/5"
					>
						Filters
						<ChevronRight size={14} className="rotate-90 text-gray-400" />
					</button>
				</div>
			</div>

			<div className="flex min-h-0 w-full flex-1 flex-col gap-6 overflow-y-auto p-6">
				<div className="flex h-90 w-full shrink-0 flex-col rounded-2xl border border-gray-200 bg-white p-8 shadow-sm transition-colors dark:border-white/5 dark:bg-[#1C1C1C] dark:shadow-lg">
					<ResponsiveContainer width="100%" height="100%">
						<BarChart
							data={chartData}
							margin={{
								top: 20,
								right: 0,
								left: -20,
								bottom: 0,
							}}
							barSize={120}
						>
							<CartesianGrid
								strokeDasharray="3 3"
								vertical={false}
								stroke="#555555"
								opacity={0.3}
							/>

							<XAxis
								dataKey="period"
								axisLine={false}
								tickLine={false}
								tick={{
									fill: "#888888",
									fontSize: 13,
									fontWeight: 500,
								}}
								dy={16}
							/>

							<YAxis
								axisLine={false}
								tickLine={false}
								tick={{
									fill: "#888888",
									fontSize: 13,
								}}
								tickFormatter={(value) => {
									return `$${value}`;
								}}
							/>

							<Tooltip
								cursor={{ fill: "transparent" }}
								content={({ active, payload }) => {
									if (!active || !payload || payload.length === 0) {
										return null;
									}

									const value = Number(payload[0].value);

									return (
										<div className="flex flex-col gap-1 rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-white/10 dark:bg-[#232323]">
											<span className="text-sm font-bold text-gray-900 dark:text-white">
												{formatCurrency(value)}
											</span>

											<span className="text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
												Total
											</span>
										</div>
									);
								}}
							/>

							<Bar dataKey="amount" radius={[4, 4, 0, 0]}>
								{chartData.map((entry) => {
									return (
										<Cell
											key={entry.period}
											fill={entry.isActive ? "#EF4444" : "#9CA3AF"}
										/>
									);
								})}
							</Bar>
						</BarChart>
					</ResponsiveContainer>
				</div>

				<h2 className="shrink-0 text-3xl font-bold tracking-tight text-gray-900 transition-colors dark:text-white">
					{activeYear}
				</h2>

				<div className="grid shrink-0 grid-cols-1 items-start gap-6 lg:grid-cols-3">
					<div className="flex h-150 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-colors lg:col-span-2 dark:border-white/5 dark:bg-[#1C1C1C] dark:shadow-lg">
						<div className="shrink-0 border-b border-gray-200 bg-gray-50 px-6 py-5 transition-colors dark:border-white/5 dark:bg-[#232323]">
							<h3 className="text-lg font-bold text-gray-900 dark:text-white">
								Transactions
							</h3>
						</div>

						<div className="relative min-h-0 flex-1">
							{visibleTransactions.length > 0 ? (
								<DataTable
									transactions={visibleTransactions}
									selectedIds={selectedIds}
									merchantItems={merchantItems}
									onSelectRow={(id, event) => {
										event.stopPropagation();

										setSelectedIds((previous) => {
											return previous.includes(id)
												? previous.filter((selectedId) => {
														return selectedId !== id;
													})
												: [...previous, id];
										});
									}}
									onRowClick={setSelectedTransaction}
									columnVisibility={{
										select: false,
										amount: true,
									}}
									isEditMode={false}
									currentView="all"
									sorting={sorting}
									isCategoryView
									getCategoryId={getCategoryId}
									isMerchantNavigationEnabled={false}
									getMerchantId={getMerchantId}
									onCategoryChange={(id, newCategory) => {
										void updateTransaction(id, {
											category: newCategory,
										});
									}}
								/>
							) : (
								<div className="flex h-full items-center justify-center p-8 text-center text-gray-500">
									No transactions found for {activeYear}.
								</div>
							)}
						</div>
					</div>

					<div className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-colors dark:border-white/5 dark:bg-[#1C1C1C] dark:shadow-lg">
						<div className="border-b border-gray-200 bg-gray-50 px-6 py-5 transition-colors dark:border-white/5 dark:bg-[#232323]">
							<h3 className="text-lg font-bold text-gray-900 dark:text-white">
								Summary
							</h3>
						</div>

						<div className="flex flex-col gap-6 p-6">
							<div className="flex items-center justify-between">
								<span className="text-[15px] font-medium text-gray-500 dark:text-gray-400">
									Total Transactions
								</span>
								<span className="text-[15px] font-medium text-gray-900 dark:text-white">
									{summaryStats.count}
								</span>
							</div>

							<div className="flex items-center justify-between">
								<span className="text-[15px] font-medium text-gray-500 dark:text-gray-400">
									Average Transaction
								</span>
								<span className="text-[15px] font-medium text-gray-900 dark:text-white">
									{formatCurrency(summaryStats.average)}
								</span>
							</div>

							<div className="flex items-center justify-between">
								<span className="text-[15px] font-medium text-gray-500 dark:text-gray-400">
									Largest Transaction
								</span>
								<span className="text-[15px] font-medium text-gray-900 dark:text-white">
									{formatCurrency(summaryStats.largest)}
								</span>
							</div>

							<div className="my-2 h-px w-full bg-gray-200 transition-colors dark:bg-white/5" />

							<div className="flex items-center justify-between">
								<span className="text-[15px] font-medium text-gray-500 dark:text-gray-400">
									Total Amount
								</span>
								<span className="text-[15px] font-medium text-gray-900 dark:text-white">
									{formatCurrency(summaryStats.totalAmount)}
								</span>
							</div>
						</div>
					</div>
				</div>
			</div>

			{selectedTransaction && (
				<EditTransactionModal
					key={selectedTransaction.id}
					transaction={selectedTransaction}
					isOpen
					onClose={() => {
						setSelectedTransaction(null);
					}}
					onUpdate={updateTransaction}
					onRuleSaved={() => {
						setSelectedTransaction(null);
					}}
				/>
			)}
		</div>
	);
}
