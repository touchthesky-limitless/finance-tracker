/**
 * Constants used in the Merchant Details page.
 */
import type { SortingState } from "@tanstack/react-table";

export const DEFAULT_SORTING: SortingState = [{ id: "date", desc: true }];
export const HIDDEN_MODES = ["visible", "hidden", "all"] as const;
export const MERCHANT_TABLE_COLUMNS = [
	{ id: "merchant", label: "Merchant" },
	{ id: "category", label: "Category" },
	{ id: "account", label: "Account" },
	{ id: "amount", label: "Amount" },
] as const;
