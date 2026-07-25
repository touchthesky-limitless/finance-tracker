import {
	EMPTY_TRANSACTION_FILTERS,
	type TransactionFilters,
} from "@/components/Transactions/transactionFilters";
import type {
	BreakdownChartType,
	ReportDateRange,
	ReportGrouping,
	ReportInterval,
	ReportTab,
	ReportView,
	SavedReportConfiguration,
	TrendChartType,
} from "@/components/Reports/types";

interface SearchParamsLike {
	get: (name: string) => string | null;
	getAll: (name: string) => string[];
}

interface ReportUrlState {
	tab: ReportTab;
	view: ReportView;
	grouping: ReportGrouping;
	interval: ReportInterval;
	breakdownChart: BreakdownChartType;
	trendChart: TrendChartType;
	dateRange: ReportDateRange;
	filters: TransactionFilters;
}

const REPORT_TABS = new Set<ReportTab>([
	"cash-flow",
	"spending",
	"income",
]);

const REPORT_GROUPINGS =
	new Set<ReportGrouping>([
		"category",
		"group",
		"merchant",
		"fixed-flexible",
	]);

const REPORT_INTERVALS =
	new Set<ReportInterval>([
		"monthly",
		"quarterly",
		"yearly",
	]);

function readReportTab(pathname: string): ReportTab {
	const pathSegments = pathname
		.split("/")
		.filter(Boolean);
	const reportsIndex =
		pathSegments.indexOf("reports");
	const candidate =
		reportsIndex >= 0
			? pathSegments[reportsIndex + 1]
			: null;

	return (
		candidate &&
		REPORT_TABS.has(candidate as ReportTab)
	)
		? (candidate as ReportTab)
		: "cash-flow";
}

function readList(
	searchParams: SearchParamsLike,
	key: string,
): string[] {
	const values = searchParams
		.getAll(key)
		.flatMap((value) => {
			return value.split(",");
		})
		.map((value) => {
			return value.trim();
		})
		.filter(Boolean);

	return [...new Set(values)];
}

function readChartState(
	searchParams: SearchParamsLike,
): Pick<
	ReportUrlState,
	| "view"
	| "breakdownChart"
	| "trendChart"
> {
	const rawChartType =
		searchParams.get("chartType") ?? "";
	const chartType =
		rawChartType.split("?")[0];

	switch (chartType) {
		case "horizontalBarChart":
		case "bars":
			return {
				view: "breakdown",
				breakdownChart: "bars",
				trendChart: "stacked",
			};

		case "groupedBarChart":
		case "grouped":
			return {
				view: "trends",
				breakdownChart: "pie",
				trendChart: "grouped",
			};

		case "stackedBarChart":
		case "stacked":
			return {
				view: "trends",
				breakdownChart: "pie",
				trendChart: "stacked",
			};

		case "sankeyChart":
		case "pieChart":
		case "pie":
		default:
			return {
				view: "breakdown",
				breakdownChart: "pie",
				trendChart: "stacked",
			};
	}
}

function readGrouping(
	searchParams: SearchParamsLike,
): ReportGrouping {
	const value =
		searchParams.get("groupBy");

	return (
		value &&
		REPORT_GROUPINGS.has(
			value as ReportGrouping,
		)
	)
		? (value as ReportGrouping)
		: "category";
}

function readInterval(
	searchParams: SearchParamsLike,
): ReportInterval {
	const value =
		searchParams.get("interval");

	return (
		value &&
		REPORT_INTERVALS.has(
			value as ReportInterval,
		)
	)
		? (value as ReportInterval)
		: "monthly";
}

function readAnyYesNo(
	value: string | null,
): "any" | "yes" | "no" {
	return (
		value === "yes" ||
		value === "no"
	)
		? value
		: "any";
}

function readAmountMode(
	value: string | null,
): TransactionFilters["amountMode"] {
	return (
		value === "greater-than" ||
		value === "less-than" ||
		value === "equal-to" ||
		value === "between"
	)
		? value
		: "none";
}

function readTransactionType(
	value: string | null,
): TransactionFilters["transactionType"] {
	return (
		value === "debits" ||
		value === "credits"
	)
		? value
		: "all";
}

export function readReportUrlState({
	pathname,
	searchParams,
}: {
	pathname: string;
	searchParams: SearchParamsLike;
}): ReportUrlState {
	const chartState =
		readChartState(searchParams);

	return {
		tab: readReportTab(pathname),
		...chartState,
		grouping: readGrouping(searchParams),
		interval: readInterval(searchParams),
		dateRange: {
			startDate:
				searchParams.get("startDate") ?? "",
			endDate:
				searchParams.get("endDate") ?? "",
		},
		filters: {
			...EMPTY_TRANSACTION_FILTERS,
			categoryNames: readList(
				searchParams,
				"categories",
			),
			merchantNames: readList(
				searchParams,
				"merchants",
			),
			accountNames: readList(
				searchParams,
				"accounts",
			),
			tags: readList(searchParams, "tags"),
			goalIds: readList(
				searchParams,
				"goals",
			),
			amountMode: readAmountMode(
				searchParams.get("amountMode"),
			),
			amountValue:
				searchParams.get("amount") ?? "",
			amountMaxValue:
				searchParams.get("amountMax") ?? "",
			transactionType: readTransactionType(
				searchParams.get(
					"transactionType",
				),
			),
			needsReview: readAnyYesNo(
				searchParams.get("needsReview"),
			),
			recurring: readAnyYesNo(
				searchParams.get("recurring"),
			),
			attachments: readAnyYesNo(
				searchParams.get("attachments"),
			),
			split: readAnyYesNo(
				searchParams.get("split"),
			),
		},
	};
}

function getChartType(
	configuration: SavedReportConfiguration,
): string {
	if (
		configuration.tab === "cash-flow" &&
		configuration.view === "breakdown"
	) {
		return "sankeyChart";
	}

	if (configuration.view === "breakdown") {
		return configuration.breakdownChart === "bars"
			? "horizontalBarChart"
			: "pieChart";
	}

	return configuration.trendChart === "grouped"
		? "groupedBarChart"
		: "stackedBarChart";
}

function appendValues(
	searchParams: URLSearchParams,
	key: string,
	values: string[],
	mapValue?: (value: string) => string,
): void {
	const uniqueValues = [
		...new Set(
			values
				.map((value) => value.trim())
				.filter(Boolean),
		),
	];

	for (const value of uniqueValues) {
		searchParams.append(
			key,
			mapValue ? mapValue(value) : value,
		);
	}
}

export function buildReportUrl({
	configuration,
	merchantIdByName,
}: {
	configuration: SavedReportConfiguration;
	merchantIdByName: ReadonlyMap<string, string>;
}): string {
	const searchParams =
		new URLSearchParams();

	searchParams.set(
		"chartType",
		getChartType(configuration),
	);

	if (configuration.grouping !== "category") {
		searchParams.set(
			"groupBy",
			configuration.grouping,
		);
	}

	if (
		configuration.view === "trends" ||
		configuration.interval !== "monthly"
	) {
		searchParams.set(
			"interval",
			configuration.interval,
		);
	}

	if (configuration.dateRange.startDate) {
		searchParams.set(
			"startDate",
			configuration.dateRange.startDate,
		);
	}

	if (configuration.dateRange.endDate) {
		searchParams.set(
			"endDate",
			configuration.dateRange.endDate,
		);
	}

	appendValues(
		searchParams,
		"categories",
		configuration.filters.categoryNames,
	);

	appendValues(
		searchParams,
		"merchants",
		configuration.filters.merchantNames,
		(value) => {
			return (
				merchantIdByName.get(
					value.trim().toLowerCase(),
				) ?? value
			);
		},
	);

	appendValues(
		searchParams,
		"accounts",
		configuration.filters.accountNames,
	);

	appendValues(
		searchParams,
		"tags",
		configuration.filters.tags,
	);

	appendValues(
		searchParams,
		"goals",
		configuration.filters.goalIds,
	);

	if (
		configuration.filters.amountMode !==
		"none"
	) {
		searchParams.set(
			"amountMode",
			configuration.filters.amountMode,
		);

		if (
			configuration.filters.amountValue
		) {
			searchParams.set(
				"amount",
				configuration.filters.amountValue,
			);
		}

		if (
			configuration.filters.amountMode ===
				"between" &&
			configuration.filters.amountMaxValue
		) {
			searchParams.set(
				"amountMax",
				configuration.filters
					.amountMaxValue,
			);
		}
	}

	if (
		configuration.filters.transactionType !==
		"all"
	) {
		searchParams.set(
			"transactionType",
			configuration.filters
				.transactionType,
		);
	}

	for (const [
		key,
		value,
	] of [
		[
			"needsReview",
			configuration.filters.needsReview,
		],
		[
			"recurring",
			configuration.filters.recurring,
		],
		[
			"attachments",
			configuration.filters.attachments,
		],
		[
			"split",
			configuration.filters.split,
		],
	] as const) {
		if (value !== "any") {
			searchParams.set(key, value);
		}
	}

	const query = searchParams.toString();

	return `/reports/${configuration.tab}${
		query ? `?${query}` : ""
	}`;
}
