import type { TransactionFilters } from "@/components/Transactions/transactionFilters";
import type { Transaction } from "@/store/useBudgetStore";

export type ReportTab = "cash-flow" | "spending" | "income";
export type ReportView = "breakdown" | "trends";
export type BreakdownChartType = "pie" | "bars";
export type TrendChartType = "grouped" | "stacked";
export type ReportGrouping =
	| "category"
	| "group"
	| "merchant"
	| "fixed-flexible";
export type ReportInterval = "monthly" | "quarterly" | "yearly";

export interface ReportDateRange {
	startDate: string;
	endDate: string;
}

export interface ChartTransactionSelection {
	key: string;
	label: string;
	transactionIds: string[];
}

export interface ReportCategoryRow {
	key: string;
	label: string;
	/**
	 * Kept for compatibility with existing chart callers.
	 * UI renderers resolve the actual icon through getIconForCategory().
	 */
	icon: string;
	value: number;
	color: string;
	percentage: number;
	transactionIds: string[];
}

export interface ReportMonthRow {
	key: string;
	label: string;
	date: Date;
	total: number;
	income: number;
	expenses: number;
	net: number;
	values: Record<string, number>;
	transactionIds: string[];
	incomeTransactionIds: string[];
	expenseTransactionIds: string[];
	transactionIdsByLabel: Record<string, string[]>;
}

export interface ReportSummary {
	totalIncome: number;
	totalExpenses: number;
	netIncome: number;
	savingsRate: number;
	largestTransaction: number;
	averageTransaction: number;
	firstTransaction: Transaction | null;
	lastTransaction: Transaction | null;
}

export interface SavedReportChartSettings {
	view: ReportView;
	grouping: ReportGrouping;
	interval: ReportInterval;
	breakdownChart: BreakdownChartType;
	trendChart: TrendChartType;
}

export interface SavedReportConfiguration
	extends SavedReportChartSettings {
	tab: ReportTab;
	dateRange: ReportDateRange;
	filters: TransactionFilters;
	includeChartSettings: boolean;
}

export interface CreateSavedReportInput {
	name: string;
	configuration: SavedReportConfiguration;
}

export interface UpdateSavedReportInput
	extends CreateSavedReportInput {
	reportId: string;
}

export interface SavedReport
	extends SavedReportConfiguration {
	id: string;
	name: string;
	createdAt: string;
	updatedAt: string;
}
