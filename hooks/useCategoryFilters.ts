/**
 * useCategoryFilters - Hook to manage category filters from URL search params.
 */

import { useMemo, useCallback } from "react";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { parseEnum, readCsv } from "@/components/Categories/utils";
import type {
	CashFlowFilters,
	CashFlowTimeframe,
} from "@/components/CashFlow/types";
import {
	startOfPeriod,
	toDateParam,
} from "@/components/CashFlow/cashFlowUtils";

const HIDDEN_MODES = ["visible", "hidden", "all"] as const;

export function useCategoryFilters() {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const searchString = searchParams.toString();

	const timeframe = parseEnum<CashFlowTimeframe>(
		searchParams.get("timeframe"),
		["month", "quarter", "year"],
		"quarter",
	);
	const accountsParam = searchParams.get("accounts");
	const tagsParam = searchParams.get("tags");
	const dateParam = searchParams.get("date");
	const hidden = parseEnum(searchParams.get("hidden"), HIDDEN_MODES, "visible");

	const filters = useMemo<CashFlowFilters>(
		() => ({
			accountIds: readCsv(accountsParam),
			tags: readCsv(tagsParam),
			hidden,
		}),
		[accountsParam, hidden, tagsParam],
	);

	const updateUrl = useCallback(
		(updates: Record<string, string | null>) => {
			const next = new URLSearchParams(searchString);
			for (const [key, value] of Object.entries(updates)) {
				if (value == null) next.delete(key);
				else next.set(key, value);
			}
			const query = next.toString();
			router.replace(query ? `${pathname}?${query}` : pathname, {
				scroll: false,
			});
		},
		[pathname, router, searchString],
	);

	const updateTimeframe = useCallback(
		(nextTimeframe: CashFlowTimeframe, anchorDate: Date) => {
			updateUrl({
				timeframe: nextTimeframe,
				date: toDateParam(startOfPeriod(anchorDate, nextTimeframe)),
			});
		},
		[updateUrl],
	);

	return { timeframe, filters, dateParam, updateUrl, updateTimeframe };
}
