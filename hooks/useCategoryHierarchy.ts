import { useState, useMemo } from "react";
import {
	CATEGORY_HIERARCHY,
	getCategoryTheme,
	UnifiedCategory,
} from "@/constants";
import { useUnifiedCategories } from "@/hooks/useUnifiedCategories";

export function useCategoryHierarchy(
	currentCategory: string,
	deferredQuery: string,
) {
	// 1. Fetch categories
	const { allUnifiedCategories } = useUnifiedCategories("Expense", "All");

	// 2. Manage parent tab state
	const [selectedParent, setSelectedParent] = useState<string>(function () {
		const parents = Object.keys(CATEGORY_HIERARCHY);

		for (let i = 0; i < parents.length; i++) {
			const parent = parents[i];
			const children = CATEGORY_HIERARCHY[parent];

			let childMatch = false;
			for (let j = 0; j < children.length; j++) {
				if (children[j] === currentCategory) {
					childMatch = true;
					break;
				}
			}

			if (childMatch || currentCategory.startsWith(parent)) {
				return parent;
			}
		}

		return "Food & drink";
	});

	// 3. Find active category data for the UI trigger
	const selectedCategoryData = useMemo(
		function () {
			for (let i = 0; i < allUnifiedCategories.length; i++) {
				if (allUnifiedCategories[i].name === currentCategory) {
					return allUnifiedCategories[i];
				}
			}
			return undefined;
		},
		[allUnifiedCategories, currentCategory],
	);

	// 4. Build the dynamic hierarchy
	const dynamicHierarchy = useMemo(
		function () {
			const base: Record<string, UnifiedCategory[]> = {};

			// --- OPTIMIZATION: Create an O(1) Lookup Map ---
			const categoryMap = new Map<string, UnifiedCategory>();
			for (let i = 0; i < allUnifiedCategories.length; i++) {
				categoryMap.set(allUnifiedCategories[i].name, allUnifiedCategories[i]);
			}

			// --- OPTIMIZATION: Single-pass hierarchy building ---
			const hierarchyKeys = Object.keys(CATEGORY_HIERARCHY);
			for (let i = 0; i < hierarchyKeys.length; i++) {
				const parent = hierarchyKeys[i];
				const subs = CATEGORY_HIERARCHY[parent];
				const mappedSubs: UnifiedCategory[] = [];

				for (let j = 0; j < subs.length; j++) {
					const subName = subs[j];

					// Instant O(1) lookup instead of O(N) .find()
					const foundCat = categoryMap.get(subName);

					if (foundCat) {
						mappedSubs.push(foundCat);
					} else {
						mappedSubs.push({
							name: subName,
							icon: subName,
							theme: getCategoryTheme(parent),
							isCustom: false,
						} as UnifiedCategory);
					}
				}

				base[parent] = mappedSubs;
			}

			// Handle Custom Categories
			for (let i = 0; i < allUnifiedCategories.length; i++) {
				const cat = allUnifiedCategories[i];

				if (!cat.isCustom) continue;

				if (cat.parentName && base[cat.parentName]) {
					const parentList = base[cat.parentName];
					let exists = false;

					for (let j = 0; j < parentList.length; j++) {
						if (parentList[j].name === cat.name) {
							exists = true;
							break;
						}
					}

					if (!exists) {
						parentList.push(cat);
					}
				} else if (!cat.parentName) {
					if (!base[cat.name]) {
						base[cat.name] = [];
					}
				}
			}

			return base;
		},
		[allUnifiedCategories],
	);

	// 5. Filter parent tabs based on search
	const visibleParents = useMemo(
		function () {
			const query = deferredQuery.toLowerCase().trim();
			const parents = Object.keys(dynamicHierarchy);

			if (!query) return parents;

			const results: string[] = [];

			for (let i = 0; i < parents.length; i++) {
				const parent = parents[i];

				if (parent.toLowerCase().includes(query)) {
					results.push(parent);
					continue;
				}

				const children = dynamicHierarchy[parent];
				let childMatch = false;

				if (children) {
					for (let j = 0; j < children.length; j++) {
						if (children[j].name.toLowerCase().includes(query)) {
							childMatch = true;
							break;
						}
					}
				}

				if (childMatch) {
					results.push(parent);
				}
			}

			return results;
		},
		[deferredQuery, dynamicHierarchy],
	);

	// 6. Determine which parent tab is currently active
	const activeParent = useMemo(
		function () {
			const query = deferredQuery.toLowerCase().trim();
			if (!query) return selectedParent;

			if (selectedParent.toLowerCase().includes(query)) {
				return selectedParent;
			}

			const children = CATEGORY_HIERARCHY[selectedParent];
			if (children) {
				for (let i = 0; i < children.length; i++) {
					if (children[i].toLowerCase().includes(query)) {
						return selectedParent;
					}
				}
			}

			if (visibleParents.length > 0) {
				return visibleParents[0];
			}

			return selectedParent;
		},
		[deferredQuery, visibleParents, selectedParent],
	);

	return {
		selectedCategoryData,
		dynamicHierarchy,
		visibleParents,
		activeParent,
		selectedParent,
		setSelectedParent,
	};
}
