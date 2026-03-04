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
	const allUnifiedCategories = useMemo(() => {
		// 1. Generate the System Categories from your constants
		const staticItems: UnifiedCategory[] = Object.entries(
			CATEGORY_HIERARCHY,
		).flatMap(([parent, subs]) => {
			const parentItem: UnifiedCategory = {
				name: parent,
				isCustom: false,
				theme: getCategoryTheme(parent),
				icon: parent
			};
			const subItems: UnifiedCategory[] = subs.map((sub) => ({
				name: sub,
				isCustom: false,
				parentName: parent,
				theme: getCategoryTheme(parent),
				icon: sub
			}));
			return [parentItem, ...subItems];
		});

		// 2. Map the Custom Categories from the Store/DB
		const customItems: UnifiedCategory[] = customCategories.map((cat) => {
			// Logic:
			// If it has a parent, get the theme of that parent (System name).
			// If it's a primary, use the 'color_key' (e.g. "Rose") saved in DB.
			const themeKey = cat.parent_name || cat.color_key;
			const theme = getCategoryTheme(themeKey);

			return {
				id: cat.id,
				name: cat.name,
				isCustom: true,
				parentName: cat.parent_name || undefined,
				theme: theme,
				icon: cat.icon_name,
			};
		});

		// 3. Create a "Lookup Key" set to identify overrides
		// We use "Name|ParentName" to uniquely identify a category slot
		const customKeys = new Set(
			customItems.map(
				(c) =>
					`${c.name.toLowerCase()}|${(c.parentName || "root").toLowerCase()}`,
			),
		);

		// 4. Filter out system categories that have a custom equivalent
		const filteredStatic = staticItems.filter((s) => {
			const key = `${s.name.toLowerCase()}|${(s.parentName || "root").toLowerCase()}`;
			return !customKeys.has(key);
		});

		return [...filteredStatic, ...customItems];
	}, [customCategories]);

	// 2. Derive Sidebar Primaries
	const primaryCategories = useMemo(() => {
		const primaries = allUnifiedCategories.filter((cat) => !cat.parentName);
		return primaries.filter((cat) => {
			if (transactionType === "Income") return cat.name === "Income";
			if (transactionType === "Transfer") return cat.name === "Transfers";
			return cat.name !== "Income" && cat.name !== "Transfers";
		});
	}, [allUnifiedCategories, transactionType]);

	// 3. Derive Table Display List
	const displayList = useMemo(() => {
		if (activePrimary === "All") return primaryCategories;
		return allUnifiedCategories.filter(
			(cat) => cat.parentName === activePrimary,
		);
	}, [activePrimary, primaryCategories, allUnifiedCategories]);

	// 4. Derive Active Context
	const activeCategory = useMemo(() => {
		if (activePrimary === "All") return null;
		return (
			allUnifiedCategories.find(
				(c) => c.name === activePrimary && !c.parentName,
			) || null
		);
	}, [activePrimary, allUnifiedCategories]);

	return {
		allUnifiedCategories,
		primaryCategories,
		displayList,
		activeCategory,
		isShowingAll: activePrimary === "All",
	};
}
