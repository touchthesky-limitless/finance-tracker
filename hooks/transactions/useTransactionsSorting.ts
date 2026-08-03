/**
 * @file useTransactionsSorting.ts
 * @description Manages the sorting state for the transaction table.
 * Persists the user's chosen sort order in localStorage using the generic useLocalStorage hook.
 * Defaults to sorting by date in descending order (newest first).
 */
import { SortingState } from "@tanstack/react-table";
import { useLocalStorage } from "@/hooks/useLocalStorage";

const DEFAULT_SORTING: SortingState = [{ id: "date", desc: true }];

export function useTransactionsSorting() {
	return useLocalStorage<SortingState>("custom_sort", DEFAULT_SORTING);
}
