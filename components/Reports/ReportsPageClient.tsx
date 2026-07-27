"use client";

import {
	useMemo,
	useRef,
	useState,
	type MouseEvent as ReactMouseEvent,
} from "react";
import { X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { SortingState, VisibilityState } from "@tanstack/react-table";

import { CATEGORY_HIERARCHY, findParentCategory } from "@/constants";
import { DataTable } from "@/components/Transactions/DataTable";
import { TableToolbar } from "@/components/Transactions/TableToolbar";
import {
	EMPTY_TRANSACTION_FILTERS,
	matchesTransactionFilters,
	type TransactionFilterData,
	type TransactionFilterOption,
	type TransactionFilters,
} from "@/components/Transactions/transactionFilters";
import { useMerchantOptions } from "@/hooks/useMerchantOptions";
import { useBudgetStore } from "@/store/useBudgetStore";
import { formatMoney } from "@/utils/formatters";

import { CashFlowBreakdown } from "@/components/Reports/CashFlowBreakdown";
import { BreakdownChart, TrendsChart } from "@/components/Reports/ReportCharts";
import { ReportControls } from "@/components/Reports/ReportControls";
import {
	EMPTY_DATE_RANGE,
	ReportHeader,
} from "@/components/Reports/ReportHeader";
import { ReportSummaryCards } from "@/components/Reports/ReportSummaryCards";
import { useSavedReports } from "@/components/Reports/useSavedReports";
import {
	buildCategoryRows,
	buildMonthlyRows,
	formatDateRangeLabel,
	getReportSummary,
} from "@/components/Reports/reportUtils";
import {
	buildReportUrl,
	readReportUrlState,
} from "@/components/Reports/reportUrlState";
import type {
	BreakdownChartType,
	ReportDateRange,
	ReportGrouping,
	ReportInterval,
	ReportTab,
	ReportView,
	TrendChartType,
	ChartTransactionSelection,
	SavedReport,
	SavedReportConfiguration,
} from "@/components/Reports/types";

const DEFAULT_SORTING: SortingState = [{ id: "date", desc: true }];

function normalize(value: string): string {
	return value.trim().toLowerCase();
}

type ReportAccountLike = {
	name?: string | null;
	type?: string | null;
	account_type?: string | null;
	balance?: number | null;
	current_balance?: number | null;
};

function getAccountHierarchyGroup(
	account: ReportAccountLike | undefined,
	accountName: string,
): string {
	const searchable = [accountName, account?.type, account?.account_type]
		.filter(Boolean)
		.join(" ")
		.toLowerCase();

	if (
		searchable.includes("credit") ||
		searchable.includes("card") ||
		searchable.includes("amex") ||
		searchable.includes("sapphire") ||
		searchable.includes("venture") ||
		searchable.includes("unlimited") ||
		searchable.includes("freedom")
	) {
		return "Liabilities::Credit Cards";
	}

	if (searchable.includes("mortgage")) {
		return "Liabilities::Mortgage";
	}

	if (searchable.includes("loan")) {
		return "Liabilities::Loans";
	}

	if (
		searchable.includes("401") ||
		searchable.includes("ira") ||
		searchable.includes("investment") ||
		searchable.includes("broker") ||
		searchable.includes("stock") ||
		searchable.includes("fidelity") ||
		searchable.includes("vanguard")
	) {
		return "Assets::Investments";
	}

	if (
		searchable.includes("real estate") ||
		searchable.includes("property") ||
		searchable.includes("home")
	) {
		return "Assets::Real Estate";
	}

	if (
		searchable.includes("vehicle") ||
		searchable.includes("car") ||
		searchable.includes("auto")
	) {
		return "Assets::Vehicles";
	}

	if (
		searchable.includes("valuable") ||
		searchable.includes("jewelry") ||
		searchable.includes("collectible")
	) {
		return "Assets::Valuables";
	}

	const balance = account?.current_balance ?? account?.balance ?? 0;

	if (balance < 0) {
		return "Liabilities::Other Liabilities";
	}

	return "Assets::Cash";
}

function ReportsTransactionSummary({
	transactions,
}: {
	transactions: ReturnType<typeof useBudgetStore.getState>["transactions"];
}) {
	const summary = getReportSummary(transactions);
	return (
		<aside className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/5 dark:bg-[#1b1b1b]">
			<h3 className="border-b border-gray-200 px-5 py-4 text-lg font-bold dark:border-white/5">
				Summary
			</h3>
			<dl className="space-y-4 px-5 py-5 text-sm">
				{[
					["Total transactions", String(transactions.length)],
					["Largest transaction", formatMoney(summary.largestTransaction)],
					["Average transaction", formatMoney(summary.averageTransaction)],
					["Total income", formatMoney(summary.totalIncome)],
					["Total spending", formatMoney(summary.totalExpenses)],
					["First transaction", summary.firstTransaction?.date ?? "—"],
					["Last transaction", summary.lastTransaction?.date ?? "—"],
				].map(([label, value]) => (
					<div key={label} className="flex items-center justify-between gap-6">
						<dt className="text-gray-500 dark:text-zinc-400">{label}</dt>
						<dd className="font-semibold text-gray-900 dark:text-white">
							{value}
						</dd>
					</div>
				))}
			</dl>
			<button className="w-full border-t border-gray-200 py-4 text-sm font-semibold text-cyan-600 dark:border-white/5 dark:text-cyan-400">
				Download CSV
			</button>
		</aside>
	);
}

export default function ReportsPageClient() {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const transactionsSectionRef = useRef<HTMLElement | null>(null);
	const transactions = useBudgetStore((state) => state.transactions);
	const accounts = useBudgetStore((state) => state.accounts);
	const customCategories = useBudgetStore((state) => state.customCategories);
	const customTags = useBudgetStore((state) => state.customTags);
	const confirmedRecurringMerchants = useBudgetStore(
		(state) => state.confirmedRecurringMerchants,
	);
	const merchantItems = useMerchantOptions();
	const {
		savedReports,
		isLoading: areSavedReportsLoading,
		isSaving: isSavingReport,
		deletingReportId,
		error: savedReportError,
		saveReport,
		editReport,
		deleteReport,
		clearError: clearSavedReportError,
	} = useSavedReports();

	const [initialUrlState] = useState(() => {
		return readReportUrlState({
			pathname,
			searchParams,
		});
	});

	const [tab, setTab] = useState<ReportTab>(initialUrlState.tab);
	const [view, setView] = useState<ReportView>(initialUrlState.view);
	const [grouping, setGrouping] = useState<ReportGrouping>(
		initialUrlState.grouping,
	);
	const [interval, setInterval] = useState<ReportInterval>(
		initialUrlState.interval,
	);
	const [breakdownChart, setBreakdownChart] = useState<BreakdownChartType>(
		initialUrlState.breakdownChart,
	);
	const [trendChart, setTrendChart] = useState<TrendChartType>(
		initialUrlState.trendChart,
	);
	const [dateRange, setDateRange] = useState<ReportDateRange>(
		initialUrlState.dateRange,
	);
	const [filters, setFilters] = useState<TransactionFilters>(
		initialUrlState.filters,
	);
	const [sorting, setSorting] = useState<SortingState>(DEFAULT_SORTING);
	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
	const [selectedIds, setSelectedIds] = useState<string[]>([]);
	const [isEditMode, setIsEditMode] = useState(false);
	const [currentView, setCurrentView] = useState<"all" | "review">("all");
	const [chartSelection, setChartSelection] =
		useState<ChartTransactionSelection | null>(null);

	const filterData = useMemo<TransactionFilterData>(() => {
		const categoryOptions: TransactionFilterOption[] = [];
		const seenCategories = new Set<string>();

		for (const [parent, children] of Object.entries(CATEGORY_HIERARCHY)) {
			categoryOptions.push({
				value: `__parent__:${parent}`,
				label: parent,
				isParent: true,
			});

			for (const child of children) {
				seenCategories.add(normalize(child));
				categoryOptions.push({
					value: child,
					label: child,
					group: parent,
				});
			}
		}

		for (const category of customCategories) {
			const name = category.name.trim();

			if (!name || seenCategories.has(normalize(name))) {
				continue;
			}

			categoryOptions.push({
				value: name,
				label: name,
				group: category.parent_name?.trim() || findParentCategory(name),
			});
		}

		const accountByName = new Map<string, ReportAccountLike>();
		const accountDisplayNameByKey = new Map<string, string>();
		const accountCountByKey = new Map<string, number>();

		for (const account of accounts) {
			const accountRecord = account as ReportAccountLike;
			const name = accountRecord.name?.trim();

			if (!name) {
				continue;
			}

			const key = normalize(name);

			accountByName.set(key, accountRecord);
			accountDisplayNameByKey.set(key, name);
		}

		const tagNames = new Set<string>(customTags);

		for (const transaction of transactions) {
			const accountName = transaction.account?.trim();

			if (accountName) {
				const key = normalize(accountName);

				accountDisplayNameByKey.set(
					key,
					accountDisplayNameByKey.get(key) ?? accountName,
				);
				accountCountByKey.set(key, (accountCountByKey.get(key) ?? 0) + 1);
			}

			for (const tag of transaction.tags ?? []) {
				if (tag.trim()) {
					tagNames.add(tag.trim());
				}
			}
		}

		const accountOptions = [...accountDisplayNameByKey.entries()]
			.map(([key, name]) => {
				const account = accountByName.get(key);

				return {
					value: name,
					label: name,
					group: getAccountHierarchyGroup(account, name),
					count: accountCountByKey.get(key) ?? 0,
				};
			})
			.sort((first, second) => {
				return (
					String(first.group).localeCompare(String(second.group)) ||
					first.label.localeCompare(second.label)
				);
			});

		const merchantOptions = merchantItems.map((merchant) => {
			return {
				value: merchant.name,
				label: merchant.name,
				count: merchant.transactionCount,
				merchant,
			};
		});

		return {
			categories: categoryOptions,
			merchants: merchantOptions,
			accounts: accountOptions,
			tags: [...tagNames]
				.sort((first, second) => {
					return first.localeCompare(second);
				})
				.map((value) => {
					return {
						value,
						label: value,
					};
				}),
			goals: [],
		};
	}, [accounts, customCategories, customTags, merchantItems, transactions]);

	const recurringMerchantSet = useMemo(() => {
		return new Set(
			confirmedRecurringMerchants.map((merchant) => normalize(merchant)),
		);
	}, [confirmedRecurringMerchants]);

	const merchantNameById = useMemo(() => {
		return new Map(
			merchantItems.map((merchant) => {
				return [merchant.id, merchant.name] as const;
			}),
		);
	}, [merchantItems]);

	const merchantIdByName = useMemo(() => {
		return new Map(
			merchantItems.map((merchant) => {
				return [normalize(merchant.name), merchant.id] as const;
			}),
		);
	}, [merchantItems]);

	const effectiveFilters = useMemo<TransactionFilters>(() => {
		return {
			...filters,
			merchantNames: filters.merchantNames.map((value) => {
				return merchantNameById.get(value) ?? value;
			}),
		};
	}, [filters, merchantNameById]);

	const filteredTransactions = useMemo(() => {
		return transactions.filter((transaction) => {
			const date = transaction.date.slice(0, 10);
			if (dateRange.startDate && date < dateRange.startDate) return false;
			if (dateRange.endDate && date > dateRange.endDate) return false;
			return matchesTransactionFilters(
				transaction,
				effectiveFilters,
				recurringMerchantSet,
			);
		});
	}, [
		dateRange.endDate,
		dateRange.startDate,
		effectiveFilters,
		recurringMerchantSet,
		transactions,
	]);

	const tableTransactions = useMemo(() => {
		if (!chartSelection) return filteredTransactions;
		const selectedIdSet = new Set(chartSelection.transactionIds);
		return filteredTransactions.filter((transaction) =>
			selectedIdSet.has(transaction.id),
		);
	}, [chartSelection, filteredTransactions]);

	const summary = useMemo(
		() => getReportSummary(filteredTransactions),
		[filteredTransactions],
	);
	const incomeRows = useMemo(
		() => buildCategoryRows(filteredTransactions, grouping, "income"),
		[filteredTransactions, grouping],
	);
	const expenseRows = useMemo(
		() => buildCategoryRows(filteredTransactions, grouping, "expense"),
		[filteredTransactions, grouping],
	);
	const activeRows = tab === "income" ? incomeRows : expenseRows;
	const monthlyRows = useMemo(
		() => buildMonthlyRows(filteredTransactions, grouping, interval),
		[filteredTransactions, grouping, interval],
	);
	const chartCategories = tab === "income" ? incomeRows : expenseRows;
	const reportTitle = formatDateRangeLabel(
		dateRange.startDate,
		dateRange.endDate,
	);

	const handleChartSelection = (selection: ChartTransactionSelection): void => {
		const isClearingSelection = chartSelection?.key === selection.key;

		setSelectedIds([]);
		setChartSelection(isClearingSelection ? null : selection);

		if (!isClearingSelection) {
			window.requestAnimationFrame(() => {
				transactionsSectionRef.current?.scrollIntoView({
					behavior: "smooth",
					block: "start",
				});
			});
		}
	};

	const clearChartSelection = () => {
		setChartSelection(null);
		setSelectedIds([]);
	};

	const handleSelectRow = (id: string, event: ReactMouseEvent) => {
		event.stopPropagation();
		setSelectedIds((current) =>
			current.includes(id)
				? current.filter((value) => value !== id)
				: [...current, id],
		);
	};

	const currentReportConfiguration = useMemo<SavedReportConfiguration>(() => {
		return {
			tab,
			dateRange,
			filters: effectiveFilters,
			view,
			grouping,
			interval,
			breakdownChart,
			trendChart,
			includeChartSettings: true,
		};
	}, [
		breakdownChart,
		dateRange,
		effectiveFilters,
		grouping,
		interval,
		tab,
		trendChart,
		view,
	]);

	const replaceReportUrl = (configuration: SavedReportConfiguration): void => {
		router.replace(
			buildReportUrl({
				configuration,
				merchantIdByName,
			}),
			{
				scroll: false,
			},
		);
	};

	const clearAllReportFilters = (): void => {
		setDateRange(EMPTY_DATE_RANGE);
		setFilters(EMPTY_TRANSACTION_FILTERS);
		clearChartSelection();
		replaceReportUrl({
			...currentReportConfiguration,
			dateRange: EMPTY_DATE_RANGE,
			filters: EMPTY_TRANSACTION_FILTERS,
		});
	};

	const handleSaveReport = async (
		name: string,
		includeChartSettings: boolean,
	): Promise<void> => {
		await saveReport({
			name,
			configuration: {
				...currentReportConfiguration,
				includeChartSettings,
			},
		});
	};

	const handleEditSavedReport = async (
		reportId: string,
		name: string,
		configuration: SavedReportConfiguration,
	): Promise<void> => {
		await editReport({
			reportId,
			name,
			configuration,
		});
	};

	const handleDeleteSavedReport = async (reportId: string): Promise<void> => {
		await deleteReport(reportId);
	};

	const handleLoadSavedReport = (report: SavedReport): void => {
		setTab(report.tab);
		setDateRange(report.dateRange);
		setFilters(report.filters);

		if (report.includeChartSettings) {
			setView(report.view);
			setGrouping(report.grouping);
			setInterval(report.interval);
			setBreakdownChart(report.breakdownChart);
			setTrendChart(report.trendChart);
		}

		clearChartSelection();
		replaceReportUrl(report);
	};

	return (
		<div className="min-h-screen bg-[#f6f5f3] p-3 text-gray-950 sm:p-5 dark:bg-[#121212] dark:text-white">
			<ReportHeader
				tab={tab}
				onTabChange={(nextTab) => {
					const nextView = nextTab === "cash-flow" ? "breakdown" : view;

					setTab(nextTab);
					setView(nextView);
					clearChartSelection();
					replaceReportUrl({
						...currentReportConfiguration,
						tab: nextTab,
						view: nextView,
					});
				}}
				dateRange={dateRange}
				onDateRangeChange={(nextRange) => {
					setDateRange(nextRange);
					clearChartSelection();
					replaceReportUrl({
						...currentReportConfiguration,
						dateRange: nextRange,
					});
				}}
				filters={effectiveFilters}
				filterData={filterData}
				onFiltersChange={(nextFilters) => {
					setFilters(nextFilters);
					clearChartSelection();
					replaceReportUrl({
						...currentReportConfiguration,
						filters: nextFilters,
					});
				}}
				onClearAll={clearAllReportFilters}
				savedReports={savedReports}
				currentConfiguration={currentReportConfiguration}
				onSaveReport={handleSaveReport}
				onEditSavedReport={handleEditSavedReport}
				onDeleteSavedReport={handleDeleteSavedReport}
				onLoadSavedReport={handleLoadSavedReport}
				areSavedReportsLoading={areSavedReportsLoading}
				isSavingReport={isSavingReport}
				deletingReportId={deletingReportId}
				savedReportError={savedReportError}
				onClearSavedReportError={clearSavedReportError}
			/>

			{tab === "cash-flow" && (
				<div className="mt-5">
					<ReportSummaryCards summary={summary} />
				</div>
			)}

			<section className="mt-5 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/5 dark:bg-[#1b1b1b]">
				<h2 className="px-7 pt-6 text-xl font-bold">{reportTitle}</h2>
				<ReportControls
					tab={tab}
					view={view}
					onViewChange={(nextView) => {
						setView(nextView);
						clearChartSelection();
						replaceReportUrl({
							...currentReportConfiguration,
							view: nextView,
						});
					}}
					grouping={grouping}
					onGroupingChange={(nextGrouping) => {
						setGrouping(nextGrouping);
						clearChartSelection();
						replaceReportUrl({
							...currentReportConfiguration,
							grouping: nextGrouping,
						});
					}}
					interval={interval}
					onIntervalChange={(nextInterval) => {
						setInterval(nextInterval);
						clearChartSelection();
						replaceReportUrl({
							...currentReportConfiguration,
							interval: nextInterval,
						});
					}}
					breakdownChart={breakdownChart}
					onBreakdownChartChange={(nextChart) => {
						setBreakdownChart(nextChart);
						setView("breakdown");
						clearChartSelection();
						replaceReportUrl({
							...currentReportConfiguration,
							view: "breakdown",
							breakdownChart: nextChart,
						});
					}}
					trendChart={trendChart}
					onTrendChartChange={(nextChart) => {
						setTrendChart(nextChart);
						setView("trends");
						clearChartSelection();
						replaceReportUrl({
							...currentReportConfiguration,
							view: "trends",
							trendChart: nextChart,
						});
					}}
					showInterval={view === "trends"}
				/>

				{view === "breakdown" ? (
					tab === "cash-flow" ? (
						<CashFlowBreakdown
							incomeRows={incomeRows}
							expenseRows={expenseRows}
							selectedKey={chartSelection?.key ?? null}
							onSelectTransactions={handleChartSelection}
						/>
					) : (
						<BreakdownChart
							rows={activeRows}
							chartType={breakdownChart}
							selectedKey={chartSelection?.key ?? null}
							onSelectTransactions={handleChartSelection}
						/>
					)
				) : (
					<TrendsChart
						rows={monthlyRows}
						categories={chartCategories}
						chartType={trendChart}
						tab={tab}
						selectedKey={chartSelection?.key ?? null}
						onSelectTransactions={handleChartSelection}
					/>
				)}
			</section>

			<div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
				<section
					ref={transactionsSectionRef}
					className="min-h-[520px] scroll-mt-24 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/5 dark:bg-[#1b1b1b]"
				>
					<div className="flex min-h-14 items-center gap-3 border-b border-gray-200 px-5 dark:border-white/5">
						<h3 className="text-base font-bold">Transactions</h3>
						{chartSelection && (
							<button
								type="button"
								onClick={clearChartSelection}
								className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-200 dark:bg-white/5 dark:text-gray-200 dark:hover:bg-white/10"
							>
								<span className="max-w-64 truncate">
									{chartSelection.label}
								</span>
								<span className="text-gray-500 dark:text-zinc-400">
									{tableTransactions.length}
								</span>
								<X size={14} />
							</button>
						)}
					</div>
					<TableToolbar
						isEditMode={isEditMode}
						setIsEditMode={setIsEditMode}
						selectedIds={selectedIds}
						setSelectedIds={setSelectedIds}
						visibleTransactionIds={tableTransactions.map(
							(transaction) => transaction.id,
						)}
						currentView={currentView}
						setCurrentView={setCurrentView}
						filteredLength={tableTransactions.length}
						sorting={sorting}
						setSorting={setSorting}
						columnVisibility={columnVisibility}
						setColumnVisibility={setColumnVisibility}
						onEditMultiple={() => undefined}
					/>
					<div className="h-[470px] overflow-hidden">
						<DataTable
							transactions={tableTransactions}
							selectedIds={selectedIds}
							onSelectRow={handleSelectRow}
							onRowClick={(transaction) =>
								router.push(
									`/transactions/${encodeURIComponent(transaction.id)}`,
								)
							}
							columnVisibility={columnVisibility}
							isEditMode={isEditMode}
							currentView={currentView}
							sorting={sorting}
							merchantItems={merchantItems}
							navigationSource="reports"
						/>
					</div>
				</section>
				<ReportsTransactionSummary transactions={tableTransactions} />
			</div>
		</div>
	);
}
