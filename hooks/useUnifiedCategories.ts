import { useMemo } from "react";
import { useBudgetStore } from "@/store/useBudgetStore";
import {
	CATEGORY_HIERARCHY,
	getCategoryTheme,
	UnifiedCategory,
} from "@/constants";

export function useUnifiedCategories(
	transactionType: string,
	activePrimary: string,
) {
	const customCategories = useBudgetStore((state) => state.customCategories);

	// 1. Merge System + Custom into one Master List
	const allUnifiedCategories = useMemo(
		function () {
			const customItems: UnifiedCategory[] = [];
			const customKeys = new Set<string>();

			// Single pass to build custom items and their lookup keys
			for (let i = 0; i < customCategories.length; i++) {
				const cat = customCategories[i];
				const themeKey = cat.parent_name || cat.color_key;
				const theme = getCategoryTheme(themeKey);

				const customItem: UnifiedCategory = {
					id: cat.id,
					name: cat.name,
					isCustom: true,
					parentName: cat.parent_name || undefined,
					theme: theme,
					icon: cat.icon_name,
				};

				customItems.push(customItem);

				const key = `${customItem.name.toLowerCase()}|${(customItem.parentName || "root").toLowerCase()}`;
				customKeys.add(key);
			}

			const staticItems: UnifiedCategory[] = [];
			const hierarchyEntries = Object.entries(CATEGORY_HIERARCHY);

			// Single pass to generate static items and filter out custom overrides simultaneously
			for (let i = 0; i < hierarchyEntries.length; i++) {
				const [parent, subs] = hierarchyEntries[i];
				const parentTheme = getCategoryTheme(parent);
				const parentKey = `${parent.toLowerCase()}|root`;

				// Only create and push the static parent if it wasn't overridden
				if (!customKeys.has(parentKey)) {
					staticItems.push({
						name: parent,
						isCustom: false,
						theme: parentTheme,
						icon: parent,
					});
				}

				// Only create and push the static sub-categories if they weren't overridden
				for (let j = 0; j < subs.length; j++) {
					const sub = subs[j];
					const subKey = `${sub.toLowerCase()}|${parent.toLowerCase()}`;

					if (!customKeys.has(subKey)) {
						staticItems.push({
							name: sub,
							isCustom: false,
							parentName: parent,
							theme: parentTheme,
							icon: sub,
						});
					}
				}
			}

			// Combine arrays efficiently
			const result: UnifiedCategory[] = [];
			for (let i = 0; i < staticItems.length; i++) {
				result.push(staticItems[i]);
			}
			for (let i = 0; i < customItems.length; i++) {
				result.push(customItems[i]);
			}

			return result;
		},
		[customCategories],
	);

	// 2. Derive Sidebar Primaries
	const primaryCategories = useMemo(
		function () {
			const results: UnifiedCategory[] = [];

			for (let i = 0; i < allUnifiedCategories.length; i++) {
				const cat = allUnifiedCategories[i];

				if (!cat.parentName) {
					if (transactionType === "Income") {
						if (cat.name === "Income") results.push(cat);
					} else if (transactionType === "Transfer") {
						if (cat.name === "Transfers") results.push(cat);
					} else {
						if (cat.name !== "Income" && cat.name !== "Transfers") {
							results.push(cat);
						}
					}
				}
			}

			return results;
		},
		[allUnifiedCategories, transactionType],
	);

	// 3. Derive Table Display List
	const displayList = useMemo(
		function () {
			if (activePrimary === "All") return primaryCategories;

			const results: UnifiedCategory[] = [];
			for (let i = 0; i < allUnifiedCategories.length; i++) {
				const cat = allUnifiedCategories[i];
				if (cat.parentName === activePrimary) {
					results.push(cat);
				}
			}

			return results;
		},
		[activePrimary, primaryCategories, allUnifiedCategories],
	);

	// 4. Derive Active Context
	const activeCategory = useMemo(
		function () {
			if (activePrimary === "All") return null;

			for (let i = 0; i < allUnifiedCategories.length; i++) {
				const cat = allUnifiedCategories[i];
				if (cat.name === activePrimary && !cat.parentName) {
					return cat;
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
