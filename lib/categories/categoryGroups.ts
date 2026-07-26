import { CATEGORY_HIERARCHY } from "@/constants";
import type { CustomCategory } from "@/store/useBudgetStore";
import {
	type CategoryPreferences,
	type CategorySectionId,
	type GroupBudgetMode,
	type GroupBudgetType,
	type GroupPreferences,
	getCategoryGroupPreferenceKey,
} from "@/lib/categories/categoryPreferences";

export interface CategoryGroupRecord {
	id: string;
	user_id: string;
	source_name: string;
	name: string;
	section_id: CategorySectionId;
	budget_mode: GroupBudgetMode;
	budget_type: GroupBudgetType | null;
	monthly_rollover: boolean;
	hidden: boolean;
	is_system: boolean;
	sort_order: number | null;
	created_at: string;
	updated_at: string;
}

export interface CategoryGroupSeed {
	source_name: string;
	name: string;
	section_id: CategorySectionId;
	budget_mode: GroupBudgetMode;
	budget_type: GroupBudgetType | null;
	monthly_rollover: boolean;
	hidden: boolean;
	is_system: boolean;
	sort_order: number | null;
}

export type CategoryGroupUpdate = Partial<
	Pick<
		CategoryGroupRecord,
		| "name"
		| "section_id"
		| "budget_mode"
		| "budget_type"
		| "monthly_rollover"
		| "hidden"
		| "sort_order"
	>
>;

export function normalizeCategoryGroupName(
	value: string | null | undefined,
): string {
	return value?.trim().toLowerCase() ?? "";
}

export function getDefaultCategoryGroupSection(
	groupName: string,
): CategorySectionId {
	const normalizedName = normalizeCategoryGroupName(groupName);

	if (normalizedName === "income") {
		return "income";
	}

	if (normalizedName.includes("transfer")) {
		return "transfers";
	}

	return "expenses";
}

export function getEffectiveCategoryParentName(
	category: CustomCategory,
	categoryPreferences: CategoryPreferences,
): string | null {
	return (
		categoryPreferences[category.id]?.parentName?.trim() ||
		category.parent_name?.trim() ||
		null
	);
}

export function buildCategoryGroupSeeds({
	customCategories,
	categoryPreferences,
	groupPreferences,
}: {
	customCategories: CustomCategory[];
	categoryPreferences: CategoryPreferences;
	groupPreferences: GroupPreferences;
}): CategoryGroupSeed[] {
	const sourceNameByNormalizedName = new Map<string, string>();
	const builtInNames = new Set<string>();

	for (const sourceName of Object.keys(CATEGORY_HIERARCHY)) {
		const normalizedName = normalizeCategoryGroupName(sourceName);

		if (!normalizedName) {
			continue;
		}

		sourceNameByNormalizedName.set(normalizedName, sourceName);
		builtInNames.add(normalizedName);
	}

	for (const category of customCategories) {
		const sourceName =
			getEffectiveCategoryParentName(category, categoryPreferences) ||
			category.name.trim();
		const normalizedName = normalizeCategoryGroupName(sourceName);

		if (normalizedName && !sourceNameByNormalizedName.has(normalizedName)) {
			sourceNameByNormalizedName.set(normalizedName, sourceName);
		}
	}

	const rootRecordByNormalizedName = new Map<string, CustomCategory>();

	for (const category of customCategories) {
		const effectiveParent = getEffectiveCategoryParentName(
			category,
			categoryPreferences,
		);

		if (effectiveParent) {
			continue;
		}

		const normalizedName = normalizeCategoryGroupName(category.name);

		if (normalizedName && !rootRecordByNormalizedName.has(normalizedName)) {
			rootRecordByNormalizedName.set(normalizedName, category);
		}
	}

	return [...sourceNameByNormalizedName.entries()].map(
		([normalizedSourceName, sourceName], index) => {
			const rootRecord = rootRecordByNormalizedName.get(normalizedSourceName);
			const isSystem =
				builtInNames.has(normalizedSourceName) ||
				rootRecord?.is_system === true;
			const preferenceKey = getCategoryGroupPreferenceKey(
				sourceName,
				rootRecord?.id,
				isSystem,
			);
			const preference = groupPreferences[preferenceKey];
			const budgetMode = preference?.budgetMode ?? "category";

			return {
				source_name: sourceName,
				name: preference?.name?.trim() || sourceName,
				section_id:
					preference?.sectionId ??
					getDefaultCategoryGroupSection(sourceName),
				budget_mode: budgetMode,
				budget_type:
					budgetMode === "group"
						? preference?.budgetType ?? "flexible"
						: null,
				monthly_rollover:
					budgetMode === "group" &&
					preference?.monthlyRollover === true,
				hidden: preference?.hidden === true,
				is_system: isSystem,
				sort_order:
					typeof preference?.order === "number"
						? preference.order
						: index,
			};
		},
	);
}
