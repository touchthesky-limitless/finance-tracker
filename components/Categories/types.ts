/**
 * Category-related type definitions.
 */

import type { CategorySectionId } from "@/lib/categories/categoryPreferences";

export type CategoryBudgetType = "fixed" | "flexible" | "non-monthly";

export interface CategoryEditorValue {
	id: string;
	name: string;
	icon: string;
	parentName: string;
	isSystem: boolean;
	excludedFromBudget: boolean;
	budgetType: CategoryBudgetType;
	monthlyRollover: boolean;
	rolloverStartMonth?: string;
	rolloverStartingBalance?: number;
	hidden: boolean;
}

export interface CategoryEditorSaveValue {
	name: string;
	icon: string;
	parentName: string;
	excludedFromBudget: boolean;
	budgetType: CategoryBudgetType;
	monthlyRollover: boolean;
	rolloverStartMonth?: string;
	rolloverStartingBalance?: number;
}

export interface CategoryEditorGroupOption {
	key: string;
	name: string;
	displayName: string;
	sectionId: CategorySectionId;
	hidden: boolean;
}

/**
 * Chart period used in the category trend chart.
 */
export interface CategoryChartPeriod {
	key: string;
	label: string;
	shortLabel: string;
	start: Date;
	end: Date;
	amount: number;
	year: number;
	showYearMarker: boolean;
}
