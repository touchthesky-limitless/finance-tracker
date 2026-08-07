/**
 * Hook for managing recurring filters with URL sync.
 */
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
	readRecurringFiltersFromSearchParams,
	writeRecurringFiltersToSearchParams,
} from "../utils/recurringUrlState";
import { countRecurringFilters } from "../utils";
import type { RecurringFilters } from "../types";

export function useRecurringFilters(
	searchParamsString: string,
	pathname: string,
	router: ReturnType<typeof useRouter>,
) {
	const filters = useMemo(
		() =>
			readRecurringFiltersFromSearchParams(
				new URLSearchParams(searchParamsString),
			),
		[searchParamsString],
	);
	const activeFilterCount = useMemo(
		() => countRecurringFilters(filters),
		[filters],
	);

	const applyFilters = (nextFilters: RecurringFilters) => {
		const nextSearchParams = new URLSearchParams(searchParamsString);
		writeRecurringFiltersToSearchParams(nextSearchParams, nextFilters);
		const nextQuery = nextSearchParams.toString();
		router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
			scroll: false,
		});
	};

	return { filters, activeFilterCount, applyFilters };
}
