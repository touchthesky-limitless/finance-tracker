import { useMemo } from "react";
import { useBudgetStore } from "@/store/useBudgetStore";
import {
	CATEGORY_HIERARCHY,
	getCategoryTheme,
	UnifiedCategory,
} from "@/constants";

function createCategoryKey(name: string, parentName?: string | null): string {
	const normalizedName = name.trim().toLowerCase();
	const normalizedParent = parentName
		? parentName.trim().toLowerCase()
		: "root";

	return `${normalizedName}|${normalizedParent}`;
}

export function useUnifiedCategories(
	transactionType: string,
	activePrimary: string,
) {
	const customCategories = useBudgetStore((state) => state.customCategories);

	/*
	 * Build one unified list containing:
	 *
	 * 1. Static parent categories
	 * 2. Static system subcategories with their Supabase UUIDs
	 * 3. User-created custom categories
	 */
	const allUnifiedCategories = useMemo(
		function () {
			const results: UnifiedCategory[] = [];

			/*
			 * Only system categories belong in this lookup.
			 * Their database rows provide stable UUIDs for URLs.
			 */
			const systemCategoryByKey = new Map<
				string,
				(typeof customCategories)[number]
			>();

			for (let index = 0; index < customCategories.length; index++) {
				const category = customCategories[index];

				if (!category.is_system) {
					continue;
				}

				const key = createCategoryKey(category.name, category.parent_name);

				systemCategoryByKey.set(key, category);
			}

			/*
			 * Build system categories in the same order as
			 * CATEGORY_HIERARCHY.
			 */
			const hierarchyEntries = Object.entries(CATEGORY_HIERARCHY);

			for (let index = 0; index < hierarchyEntries.length; index++) {
				const [parent, subcategories] = hierarchyEntries[index];

				const parentTheme = getCategoryTheme(parent);

				/*
				 * Parent categories remain static.
				 * They do not need database IDs.
				 */
				results.push({
					name: parent,
					isCustom: false,
					theme: parentTheme,
					icon: parent,
				});

				for (
					let subcategoryIndex = 0;
					subcategoryIndex < subcategories.length;
					subcategoryIndex++
				) {
					const subcategoryName = subcategories[subcategoryIndex];

					const systemCategory = systemCategoryByKey.get(
						createCategoryKey(subcategoryName, parent),
					);

					results.push({
						id: systemCategory?.id,
						name: subcategoryName,
						isCustom: false,
						parentName: parent,
						theme: parentTheme,
						icon: systemCategory?.icon_name ?? subcategoryName,
					});
				}
			}

			/*
			 * Append actual user-created categories.
			 * System rows were already added above.
			 */
			for (let index = 0; index < customCategories.length; index++) {
				const category = customCategories[index];

				if (category.is_system) {
					continue;
				}

				const parentName = category.parent_name ?? undefined;

				/*
				 * This always resolves to a string because
				 * category.name is required.
				 */
				const themeKey =
					category.parent_name ?? category.color_key ?? category.name;

				results.push({
					id: category.id,
					name: category.name,
					isCustom: true,
					parentName,
					theme: getCategoryTheme(themeKey),
					icon: category.icon_name ?? category.name,
				});
			}

			return results;
		},
		[customCategories],
	);

	// Derive the primary parent-category list.
	const primaryCategories = useMemo(
		function () {
			const results: UnifiedCategory[] = [];

			for (let index = 0; index < allUnifiedCategories.length; index++) {
				const category = allUnifiedCategories[index];

				if (category.parentName) {
					continue;
				}

				if (transactionType === "Income") {
					if (category.name === "Income") {
						results.push(category);
					}

					continue;
				}

				if (transactionType === "Transfer") {
					if (category.name === "Transfers") {
						results.push(category);
					}

					continue;
				}

				if (category.name !== "Income" && category.name !== "Transfers") {
					results.push(category);
				}
			}

			return results;
		},
		[allUnifiedCategories, transactionType],
	);

	// Derive the categories displayed for the selected parent.
	const displayList = useMemo(
		function () {
			if (activePrimary === "All") {
				return primaryCategories;
			}

			const results: UnifiedCategory[] = [];

			for (let index = 0; index < allUnifiedCategories.length; index++) {
				const category = allUnifiedCategories[index];

				if (category.parentName === activePrimary) {
					results.push(category);
				}
			}

			return results;
		},
		[activePrimary, primaryCategories, allUnifiedCategories],
	);

	// Find the selected primary category object.
	const activeCategory = useMemo(
		function () {
			if (activePrimary === "All") {
				return null;
			}

			for (let index = 0; index < allUnifiedCategories.length; index++) {
				const category = allUnifiedCategories[index];

				if (category.name === activePrimary && !category.parentName) {
					return category;
				}
			}

			return null;
		},
		[activePrimary, allUnifiedCategories],
	);

	return {
		allUnifiedCategories,
		primaryCategories,
		displayList,
		activeCategory,
		isShowingAll: activePrimary === "All",
	};
}
