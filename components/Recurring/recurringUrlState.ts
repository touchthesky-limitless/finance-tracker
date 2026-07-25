import type {
	RecurringFilters,
	RecurringFrequency,
	RecurringType,
} from "@/components/Recurring/types";
import {
	EMPTY_RECURRING_FILTERS,
} from "@/components/Recurring/types";
import {
	RECURRING_FREQUENCIES,
} from "@/components/Recurring/recurringUtils";

const FILTER_QUERY_KEYS = [
	"types",
	"accounts",
	"categories",
	"frequencies",
] as const;

const RECURRING_TYPES: ReadonlySet<string> =
	new Set<RecurringType>([
		"income",
		"expense",
		"credit-card",
	]);

const RECURRING_FREQUENCY_VALUES: ReadonlySet<string> =
	new Set<RecurringFrequency>(
		RECURRING_FREQUENCIES,
	);

function uniqueValues(values: string[]): string[] {
	return [
		...new Set(
			values
				.flatMap((value) => {
					return value.split(",");
				})
				.map((value) => value.trim())
				.filter(Boolean),
		),
	];
}

function readValues(
	searchParams: URLSearchParams,
	key: string,
): string[] {
	return uniqueValues(
		searchParams.getAll(key),
	);
}

export function readRecurringFiltersFromSearchParams(
	searchParams: URLSearchParams,
): RecurringFilters {
	const types = readValues(
		searchParams,
		"types",
	).filter((value): value is RecurringType => {
		return RECURRING_TYPES.has(value);
	});

	const frequencies = readValues(
		searchParams,
		"frequencies",
	).filter(
		(value): value is RecurringFrequency => {
			return RECURRING_FREQUENCY_VALUES.has(
				value,
			);
		},
	);

	return {
		...EMPTY_RECURRING_FILTERS,
		types,
		accountIds: readValues(
			searchParams,
			"accounts",
		),
		categoryIds: readValues(
			searchParams,
			"categories",
		),
		frequencies,
	};
}

export function writeRecurringFiltersToSearchParams(
	searchParams: URLSearchParams,
	filters: RecurringFilters,
): void {
	for (const key of FILTER_QUERY_KEYS) {
		searchParams.delete(key);
	}

	for (const type of filters.types) {
		searchParams.append("types", type);
	}

	for (const accountId of filters.accountIds) {
		searchParams.append(
			"accounts",
			accountId,
		);
	}

	for (const categoryId of filters.categoryIds) {
		searchParams.append(
			"categories",
			categoryId,
		);
	}

	for (const frequency of filters.frequencies) {
		searchParams.append(
			"frequencies",
			frequency,
		);
	}

	searchParams.sort();
}
