/**
 * @file useTransactionsColumnVisibility.ts
 * @description Manages the visible columns for the transaction table.
 * Persists the user's column visibility choices in localStorage.
 * Initialises with an empty object (all columns visible by default).
 */
import { VisibilityState } from "@tanstack/react-table";
import { useLocalStorage } from "@/hooks/useLocalStorage";

export function useTransactionsColumnVisibility() {
	return useLocalStorage<VisibilityState>("sort_cols", {});
}
