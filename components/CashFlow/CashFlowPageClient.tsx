"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { CashFlowBreakdownBars } from "@/components/CashFlow/CashFlowBreakdownBars";
import {
	BreakdownTabs,
	ShareMenu,
	TimeframeTabs,
	ViewMenu,
} from "@/components/CashFlow/CashFlowControls";
import { CashFlowFilterMenu } from "@/components/CashFlow/CashFlowFilterMenu";
import { CashFlowSankey } from "@/components/CashFlow/CashFlowSankey";
import { CashFlowTrendChart } from "@/components/CashFlow/CashFlowTrendChart";
import type {
	CashFlowBreakdown,
	CashFlowFilters,
	CashFlowPeriod,
	CashFlowTimeframe,
	CashFlowView,
	SankeyBreakdown,
} from "@/components/CashFlow/types";
import {
	buildBreakdownItems,
	buildCashFlowPeriods,
	buildSankeyData,
	formatPeriodTitle,
	getSelectedPeriod,
	parseUtcDate,
	startOfPeriod,
	toDateParam,
} from "@/components/CashFlow/cashFlowUtils";
import { useMerchantOptions } from "@/hooks/useMerchantOptions";
import { useCategoryGroups } from "@/hooks/useCategoryGroups";
import { useBudgetStore } from "@/store/useBudgetStore";
import { formatMoney } from "@/utils/formatters";
import { MOBILE_BREAKPOINT } from "@/config/breakpoints";
import { useMediaQuery } from "@/hooks/useMediaQuery";

const TIMEFRAMES = ["month", "quarter", "year"] as const;
const VIEWS = ["bar", "sankey"] as const;
const BREAKDOWNS = ["category", "group", "merchant"] as const;
const SANKEY_BREAKDOWNS = ["category", "group", "both"] as const;
const HIDDEN_MODES = ["visible", "hidden", "all"] as const;

function parseEnum<T extends string>(
	value: string | null,
	allowed: readonly T[],
	fallback: T,
): T {
	return allowed.includes(value as T) ? (value as T) : fallback;
}

function readCsv(value: string | null): string[] {
	if (!value) {
		return [];
	}

	return value
		.split(",")
		.map((item) => {
			return item.trim();
		})
		.filter(Boolean);
}

export default function CashFlowPageClient() {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const searchParamsString = searchParams.toString();
	const isMobile = useMediaQuery(MOBILE_BREAKPOINT);

	const transactions = useBudgetStore((state) => state.transactions);
	const accounts = useBudgetStore((state) => state.accounts);
	const customCategories = useBudgetStore((state) => state.customCategories);
	const categoryPreferences = useBudgetStore(
		(state) => state.categoryPreferences,
	);
	const groupPreferences = useBudgetStore((state) => state.groupPreferences);
	const customTags = useBudgetStore((state) => state.customTags);
	const fetchTransactions = useBudgetStore((state) => state.fetchTransactions);
	const fetchAccounts = useBudgetStore((state) => state.fetchAccounts);
	const fetchCustomCategories = useBudgetStore(
		(state) => state.fetchCustomCategories,
	);
	const fetchCategoryPreferences = useBudgetStore(
		(state) => state.fetchCategoryPreferences,
	);
	const fetchMerchants = useBudgetStore((state) => state.fetchMerchants);
	const merchantItems = useMerchantOptions();
	const { groups: categoryGroups } = useCategoryGroups({
		customCategories,
		categoryPreferences,
		groupPreferences,
	});
	const [, setLoading] = useState(true);
	const [hideIncomeAmounts, setHideIncomeAmounts] = useState(false);
	const [hideExpenseAmounts, setHideExpenseAmounts] = useState(false);
	const [hideSankeyAmounts, setHideSankeyAmounts] = useState(false);

	useEffect(() => {
		let active = true;

		const loadCashFlowData = async (): Promise<void> => {
			try {
				await Promise.all([
					fetchTransactions(),
					fetchAccounts(),
					fetchCustomCategories(),
					fetchCategoryPreferences(),
					fetchMerchants(),
				]);
			} finally {
				if (active) {
					setLoading(false);
				}
			}
		};

		void loadCashFlowData();

		return () => {
			active = false;
		};
	}, [
		fetchAccounts,
		fetchCategoryPreferences,
		fetchCustomCategories,
		fetchMerchants,
		fetchTransactions,
	]);

	const timeframe = parseEnum<CashFlowTimeframe>(
		searchParams.get("timeframe"),
		TIMEFRAMES,
		"year",
	);
	const view = parseEnum<CashFlowView>(
		searchParams.get("view"),
		VIEWS,
		"sankey",
	);
	const breakdown = parseEnum<CashFlowBreakdown>(
		searchParams.get("breakdown") ??
			searchParams.get("incomeBreakdown") ??
			searchParams.get("expenseBreakdown"),
		BREAKDOWNS,
		"merchant",
	);
	const sankeyMode = parseEnum<SankeyBreakdown>(
		searchParams.get("sankey"),
		SANKEY_BREAKDOWNS,
		"category",
	);
	const dateParam = searchParams.get("date");
	const accountsParam = searchParams.get("accounts");
	const tagsParam = searchParams.get("tags");
	const hiddenMode = parseEnum(
		searchParams.get("hidden"),
		HIDDEN_MODES,
		"visible",
	);

	const anchorDate = useMemo(() => {
		return (
			parseUtcDate(dateParam) ??
			new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1))
		);
	}, [dateParam]);

	const filters = useMemo<CashFlowFilters>(() => {
		return {
			accountIds: readCsv(accountsParam),
			tags: readCsv(tagsParam),
			hidden: hiddenMode,
		};
	}, [accountsParam, hiddenMode, tagsParam]);

	const updateUrl = useCallback(
		(updates: Record<string, string | null>) => {
			const next = new URLSearchParams(searchParamsString);

			for (const [key, value] of Object.entries(updates)) {
				if (!value) {
					next.delete(key);
				} else {
					next.set(key, value);
				}
			}

			const query = next.toString();
			router.replace(query ? `${pathname}?${query}` : pathname, {
				scroll: false,
			});
		},
		[pathname, router, searchParamsString],
	);

	const periods = useMemo(() => {
		return buildCashFlowPeriods(transactions, anchorDate, timeframe, filters);
	}, [anchorDate, filters, timeframe, transactions]);

	const selectedPeriod = useMemo(() => {
		return getSelectedPeriod(periods, anchorDate);
	}, [anchorDate, periods]);

	const incomeItems = useMemo(() => {
		return buildBreakdownItems(
			transactions,
			selectedPeriod,
			breakdown,
			"income",
			filters,
			customCategories,
			merchantItems,
			categoryGroups,
			categoryPreferences,
		);
	}, [
		categoryGroups,
		categoryPreferences,
		customCategories,
		filters,
		breakdown,
		merchantItems,
		selectedPeriod,
		transactions,
	]);

	const expenseItems = useMemo(() => {
		return buildBreakdownItems(
			transactions,
			selectedPeriod,
			breakdown,
			"expense",
			filters,
			customCategories,
			merchantItems,
			categoryGroups,
			categoryPreferences,
		);
	}, [
		categoryGroups,
		categoryPreferences,
		customCategories,
		breakdown,
		filters,
		merchantItems,
		selectedPeriod,
		transactions,
	]);

	const expenseCategories = useMemo(() => {
		return buildBreakdownItems(
			transactions,
			selectedPeriod,
			"category",
			"expense",
			filters,
			customCategories,
			merchantItems,
			categoryGroups,
			categoryPreferences,
		);
	}, [
		categoryGroups,
		categoryPreferences,
		customCategories,
		filters,
		merchantItems,
		selectedPeriod,
		transactions,
	]);

	const expenseGroups = useMemo(() => {
		return buildBreakdownItems(
			transactions,
			selectedPeriod,
			"group",
			"expense",
			filters,
			customCategories,
			merchantItems,
			categoryGroups,
			categoryPreferences,
		);
	}, [
		categoryGroups,
		categoryPreferences,
		customCategories,
		filters,
		merchantItems,
		selectedPeriod,
		transactions,
	]);

	const sankeyData = useMemo(() => {
		return buildSankeyData(expenseCategories, expenseGroups, sankeyMode);
	}, [expenseCategories, expenseGroups, sankeyMode]);

	return (
		<div className="min-h-screen space-y-4 bg-gray-50 p-3 text-gray-900 dark:bg-[#171716] dark:text-white">
			<header className="sticky top-0 z-[700] -mx-3 -mt-3 flex min-h-16 flex-wrap items-center gap-4 border-b border-gray-200 bg-gray-50/95 px-5 py-3 backdrop-blur-xl dark:border-white/5 dark:bg-[#171716]/95">
				{!isMobile && <h1 className="text-xl font-bold">Cash Flow</h1>}
				<div className="ml-auto flex flex-wrap items-center justify-end gap-3">
					<TimeframeTabs
						value={timeframe}
						onChange={(value) => {
							updateUrl({
								timeframe: value,
								date: toDateParam(startOfPeriod(anchorDate, value)),
							});
						}}
					/>
					<CashFlowFilterMenu
						filters={filters}
						accounts={accounts}
						tags={customTags}
						onApply={(nextFilters) => {
							updateUrl({
								accounts:
									nextFilters.accountIds.length > 0
										? nextFilters.accountIds.join(",")
										: null,
								tags:
									nextFilters.tags.length > 0
										? nextFilters.tags.join(",")
										: null,
								hidden:
									nextFilters.hidden === "visible" ? null : nextFilters.hidden,
							});
						}}
					/>
				</div>
			</header>

			<CashFlowTrendChart
				periods={periods}
				selectedKey={selectedPeriod.key}
				onSelect={(period: CashFlowPeriod) => {
					updateUrl({ date: period.key });
				}}
			/>

			<section className="flex flex-wrap items-center gap-3">
				<h2 className="text-2xl font-bold">
					{formatPeriodTitle(selectedPeriod.start, timeframe)}
				</h2>
				<div className="ml-auto flex items-center gap-3">
					<span className="text-sm text-gray-500 dark:text-gray-400">View</span>
					<ViewMenu
						value={view}
						onChange={(nextView: CashFlowView) => {
							updateUrl({ view: nextView });
						}}
					/>
				</div>
			</section>

			<div className="grid gap-4 md:grid-cols-4">
				<StatCard
					label="Income"
					value={formatMoney(selectedPeriod.income)}
					tone="income"
				/>
				<StatCard
					label="Expenses"
					value={formatMoney(selectedPeriod.expenses)}
					tone="expense"
				/>
				<StatCard
					label="Total Savings"
					value={formatMoney(selectedPeriod.savings)}
				/>
				<StatCard
					label="Savings Rate"
					value={`${selectedPeriod.savingsRate.toFixed(0)}%`}
				/>
			</div>

			{view === "bar" ? (
				<div className="space-y-4">
					<CashFlowBreakdownBars
						targetId="cash-flow-income-share-target"
						title="Income"
						items={incomeItems}
						breakdown={breakdown}
						tone="income"
						emptyTitle="No income"
						emptyDescription="No matching income for the selected range."
						hideAmounts={hideIncomeAmounts}
						headerActions={
							<>
								<BreakdownTabs
									value={breakdown}
									onChange={(value: CashFlowBreakdown) => {
										updateUrl({
											breakdown: value,
											incomeBreakdown: null,
											expenseBreakdown: null,
										});
									}}
								/>
								<span className="h-6 w-px bg-gray-300 dark:bg-white/15" />
								<ShareMenu
									targetId="cash-flow-income-share-target"
									filename={`cash-flow-income-${selectedPeriod.key}.png`}
									hideAmounts={hideIncomeAmounts}
									onHideAmountsChange={setHideIncomeAmounts}
								/>
							</>
						}
					/>

					<CashFlowBreakdownBars
						targetId="cash-flow-expenses-share-target"
						title="Expenses"
						items={expenseItems}
						breakdown={breakdown}
						tone="expense"
						emptyTitle="No expenses"
						emptyDescription="No matching expenses for the selected range."
						hideAmounts={hideExpenseAmounts}
						headerActions={
							<>
								<BreakdownTabs
									value={breakdown}
									onChange={(value: CashFlowBreakdown) => {
										updateUrl({
											breakdown: value,
											incomeBreakdown: null,
											expenseBreakdown: null,
										});
									}}
								/>
								<span className="h-6 w-px bg-gray-300 dark:bg-white/15" />
								<ShareMenu
									targetId="cash-flow-expenses-share-target"
									filename={`cash-flow-expenses-${selectedPeriod.key}.png`}
									hideAmounts={hideExpenseAmounts}
									onHideAmountsChange={setHideExpenseAmounts}
								/>
							</>
						}
					/>
				</div>
			) : (
				<section
					id="cash-flow-sankey-share-target"
					className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/5 dark:bg-[#232322]"
				>
					<header className="flex flex-wrap items-center gap-3 border-b border-gray-200 px-5 py-3 dark:border-white/5">
						<h3 className="text-lg font-bold">Sankey Diagram</h3>
						<div className="ml-auto flex flex-wrap items-center gap-3">
							<BreakdownTabs
								sankey
								value={sankeyMode}
								onChange={(value: SankeyBreakdown) => {
									updateUrl({ sankey: value });
								}}
							/>
							<span className="h-6 w-px bg-gray-300 dark:bg-white/15" />
							<ShareMenu
								targetId="cash-flow-sankey-share-target"
								filename={`cash-flow-sankey-${selectedPeriod.key}.png`}
								hideAmounts={hideSankeyAmounts}
								onHideAmountsChange={setHideSankeyAmounts}
							/>
						</div>
					</header>

					{sankeyData.links.length > 0 ? (
						<CashFlowSankey
							nodes={sankeyData.nodes}
							links={sankeyData.links}
							hideAmounts={hideSankeyAmounts}
						/>
					) : (
						<div className="grid min-h-80 place-items-center px-5 text-center">
							<div>
								<h4 className="font-bold">No expenses</h4>
								<p className="mt-2 text-gray-500 dark:text-gray-400">
									No matching expenses for the selected range.
								</p>
							</div>
						</div>
					)}
				</section>
			)}
		</div>
	);
}

function StatCard({
	label,
	value,
	tone,
}: {
	label: string;
	value: string;
	tone?: "income" | "expense";
}) {
	return (
		<div className="rounded-2xl border border-gray-200 bg-white px-5 py-7 text-center shadow-sm dark:border-white/5 dark:bg-[#232322]">
			<p
				className={`text-xl font-bold ${
					tone === "income"
						? "text-emerald-500"
						: tone === "expense"
							? "text-red-400"
							: ""
				}`}
			>
				{value}
			</p>
			<p className="mt-3 text-xs font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">
				{label}
			</p>
		</div>
	);
}
