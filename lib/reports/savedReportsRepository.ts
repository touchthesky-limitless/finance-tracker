import {
	EMPTY_TRANSACTION_FILTERS,
	type TransactionFilters,
} from "@/components/Transactions/transactionFilters";
import type {
	BreakdownChartType,
	CreateSavedReportInput,
	ReportDateRange,
	ReportGrouping,
	ReportInterval,
	ReportTab,
	ReportView,
	SavedReport,
	SavedReportChartSettings,
	TrendChartType,
	UpdateSavedReportInput,
} from "@/components/Reports/types";
import { createClient } from "@/lib/supabase";

const supabase = createClient();

interface SavedReportRow {
	id: string;
	user_id: string;
	name: string;
	report_tab: string;
	date_range: unknown;
	filters: unknown;
	chart_settings: unknown | null;
	created_at: string;
	updated_at: string;
}

interface SupabaseQueryError {
	code?: string;
	message: string;
}

const REPORT_TABS = new Set<ReportTab>([
	"cash-flow",
	"spending",
	"income",
]);

const REPORT_VIEWS = new Set<ReportView>([
	"breakdown",
	"trends",
]);

const REPORT_GROUPINGS = new Set<ReportGrouping>([
	"category",
	"group",
	"merchant",
	"fixed-flexible",
]);

const REPORT_INTERVALS = new Set<ReportInterval>([
	"monthly",
	"quarterly",
	"yearly",
]);

const BREAKDOWN_CHART_TYPES =
	new Set<BreakdownChartType>(["pie", "bars"]);

const TREND_CHART_TYPES =
	new Set<TrendChartType>(["grouped", "stacked"]);

const DEFAULT_CHART_SETTINGS: SavedReportChartSettings = {
	view: "breakdown",
	grouping: "category",
	interval: "monthly",
	breakdownChart: "pie",
	trendChart: "stacked",
};

function isRecord(
	value: unknown,
): value is Record<string, unknown> {
	return (
		typeof value === "object" &&
		value !== null &&
		!Array.isArray(value)
	);
}

function readString(
	value: unknown,
	fallback = "",
): string {
	return typeof value === "string"
		? value
		: fallback;
}

function readStringArray(value: unknown): string[] {
	if (!Array.isArray(value)) {
		return [];
	}

	return value.filter(
		(item): item is string => {
			return typeof item === "string";
		},
	);
}

function readReportTab(value: unknown): ReportTab {
	return (
		typeof value === "string" &&
		REPORT_TABS.has(value as ReportTab)
	)
		? (value as ReportTab)
		: "cash-flow";
}

function readDateRange(
	value: unknown,
): ReportDateRange {
	if (!isRecord(value)) {
		return {
			startDate: "",
			endDate: "",
		};
	}

	return {
		startDate: readString(value.startDate),
		endDate: readString(value.endDate),
	};
}

function readTransactionFilters(
	value: unknown,
): TransactionFilters {
	if (!isRecord(value)) {
		return {
			...EMPTY_TRANSACTION_FILTERS,
		};
	}

	const amountMode =
		typeof value.amountMode === "string" &&
		[
			"none",
			"greater-than",
			"less-than",
			"equal-to",
			"between",
		].includes(value.amountMode)
			? (value.amountMode as TransactionFilters["amountMode"])
			: EMPTY_TRANSACTION_FILTERS.amountMode;

	const transactionType =
		typeof value.transactionType === "string" &&
		["all", "debits", "credits"].includes(
			value.transactionType,
		)
			? (value.transactionType as TransactionFilters["transactionType"])
			: EMPTY_TRANSACTION_FILTERS.transactionType;

	const readAnyYesNo = (
		nextValue: unknown,
		fallback:
			| TransactionFilters["needsReview"]
			| TransactionFilters["recurring"]
			| TransactionFilters["attachments"]
			| TransactionFilters["split"],
	) => {
		return (
			typeof nextValue === "string" &&
			["any", "yes", "no"].includes(nextValue)
		)
			? (nextValue as typeof fallback)
			: fallback;
	};

	return {
		categoryNames: readStringArray(
			value.categoryNames,
		),
		merchantNames: readStringArray(
			value.merchantNames,
		),
		accountNames: readStringArray(
			value.accountNames,
		),
		tags: readStringArray(value.tags),
		goalIds: readStringArray(value.goalIds),
		amountMode,
		amountValue: readString(
			value.amountValue,
		),
		amountMaxValue: readString(
			value.amountMaxValue,
		),
		transactionType,
		needsReview: readAnyYesNo(
			value.needsReview,
			EMPTY_TRANSACTION_FILTERS.needsReview,
		),
		recurring: readAnyYesNo(
			value.recurring,
			EMPTY_TRANSACTION_FILTERS.recurring,
		),
		attachments: readAnyYesNo(
			value.attachments,
			EMPTY_TRANSACTION_FILTERS.attachments,
		),
		split: readAnyYesNo(
			value.split,
			EMPTY_TRANSACTION_FILTERS.split,
		),
	};
}

function readChartSettings(
	value: unknown,
): SavedReportChartSettings | null {
	if (!isRecord(value)) {
		return null;
	}

	return {
		view:
			typeof value.view === "string" &&
			REPORT_VIEWS.has(
				value.view as ReportView,
			)
				? (value.view as ReportView)
				: DEFAULT_CHART_SETTINGS.view,
		grouping:
			typeof value.grouping === "string" &&
			REPORT_GROUPINGS.has(
				value.grouping as ReportGrouping,
			)
				? (value.grouping as ReportGrouping)
				: DEFAULT_CHART_SETTINGS.grouping,
		interval:
			typeof value.interval === "string" &&
			REPORT_INTERVALS.has(
				value.interval as ReportInterval,
			)
				? (value.interval as ReportInterval)
				: DEFAULT_CHART_SETTINGS.interval,
		breakdownChart:
			typeof value.breakdownChart === "string" &&
			BREAKDOWN_CHART_TYPES.has(
				value.breakdownChart as BreakdownChartType,
			)
				? (value.breakdownChart as BreakdownChartType)
				: DEFAULT_CHART_SETTINGS.breakdownChart,
		trendChart:
			typeof value.trendChart === "string" &&
			TREND_CHART_TYPES.has(
				value.trendChart as TrendChartType,
			)
				? (value.trendChart as TrendChartType)
				: DEFAULT_CHART_SETTINGS.trendChart,
	};
}

function mapSavedReportRow(
	row: SavedReportRow,
): SavedReport {
	const chartSettings = readChartSettings(
		row.chart_settings,
	);

	return {
		id: row.id,
		name: row.name,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
		tab: readReportTab(row.report_tab),
		dateRange: readDateRange(row.date_range),
		filters: readTransactionFilters(
			row.filters,
		),
		includeChartSettings:
			chartSettings !== null,
		...(chartSettings ??
			DEFAULT_CHART_SETTINGS),
	};
}

function throwSavedReportQueryError(
	error: SupabaseQueryError,
): never {
	if (error.code === "23505") {
		throw new Error(
			"A saved report with this name already exists.",
		);
	}

	throw new Error(error.message);
}

async function getAuthenticatedUserId(): Promise<string> {
	const {
		data: { user },
		error,
	} = await supabase.auth.getUser();

	if (error) {
		throw new Error(error.message);
	}

	if (!user) {
		throw new Error(
			"You must be signed in to use saved reports.",
		);
	}

	return user.id;
}

function getChartSettingsPayload(
	input: CreateSavedReportInput,
): SavedReportChartSettings | null {
	if (
		!input.configuration
			.includeChartSettings
	) {
		return null;
	}

	return {
		view: input.configuration.view,
		grouping:
			input.configuration.grouping,
		interval:
			input.configuration.interval,
		breakdownChart:
			input.configuration
				.breakdownChart,
		trendChart:
			input.configuration.trendChart,
	};
}

function getSavedReportWritePayload({
	userId,
	input,
}: {
	userId: string;
	input: CreateSavedReportInput;
}) {
	return {
		user_id: userId,
		name: input.name.trim(),
		report_tab:
			input.configuration.tab,
		date_range:
			input.configuration.dateRange,
		filters:
			input.configuration.filters,
		chart_settings:
			getChartSettingsPayload(input),
	};
}

const SAVED_REPORT_SELECT =
	"id, user_id, name, report_tab, date_range, filters, chart_settings, created_at, updated_at";

export async function fetchSavedReports(): Promise<
	SavedReport[]
> {
	const userId =
		await getAuthenticatedUserId();

	const { data, error } = await supabase
		.from("saved_reports")
		.select(SAVED_REPORT_SELECT)
		.eq("user_id", userId)
		.order("created_at", {
			ascending: false,
		});

	if (error) {
		throwSavedReportQueryError(error);
	}

	return (
		(data ?? []) as SavedReportRow[]
	).map(mapSavedReportRow);
}

export async function insertSavedReport(
	input: CreateSavedReportInput,
): Promise<SavedReport> {
	const userId =
		await getAuthenticatedUserId();
	const cleanName = input.name.trim();

	if (!cleanName) {
		throw new Error(
			"Report name is required.",
		);
	}

	const { data, error } = await supabase
		.from("saved_reports")
		.insert(
			getSavedReportWritePayload({
				userId,
				input: {
					...input,
					name: cleanName,
				},
			}),
		)
		.select(SAVED_REPORT_SELECT)
		.single();

	if (error) {
		throwSavedReportQueryError(error);
	}

	return mapSavedReportRow(
		data as SavedReportRow,
	);
}

export async function updateSavedReport(
	input: UpdateSavedReportInput,
): Promise<SavedReport> {
	const userId =
		await getAuthenticatedUserId();
	const cleanName = input.name.trim();

	if (!cleanName) {
		throw new Error(
			"Report name is required.",
		);
	}

	const { data, error } = await supabase
		.from("saved_reports")
		.update(
			getSavedReportWritePayload({
				userId,
				input: {
					name: cleanName,
					configuration:
						input.configuration,
				},
			}),
		)
		.eq("id", input.reportId)
		.eq("user_id", userId)
		.select(SAVED_REPORT_SELECT)
		.single();

	if (error) {
		throwSavedReportQueryError(error);
	}

	return mapSavedReportRow(
		data as SavedReportRow,
	);
}

export async function removeSavedReport(
	reportId: string,
): Promise<void> {
	const userId =
		await getAuthenticatedUserId();

	const { error } = await supabase
		.from("saved_reports")
		.delete()
		.eq("id", reportId)
		.eq("user_id", userId);

	if (error) {
		throwSavedReportQueryError(error);
	}
}
