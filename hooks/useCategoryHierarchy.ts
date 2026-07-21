import { useEffect, useMemo, useRef, useState } from "react";

import {
	CATEGORY_HIERARCHY,
	getCategoryTheme,
	type UnifiedCategory,
} from "@/constants";

import { useUnifiedCategories } from "@/hooks/useUnifiedCategories";

const STATIC_PARENT_NAMES = Object.keys(CATEGORY_HIERARCHY);

const DEFAULT_PARENT = STATIC_PARENT_NAMES[0] ?? "Food & drink";

function normalizeName(value: string | null | undefined): string {
	return value?.trim().toLowerCase() ?? "";
}

function createCategoryKey(
	parentName: string | null | undefined,
	categoryName: string,
): string {
	return `${normalizeName(parentName)}::${normalizeName(categoryName)}`;
}

function findStaticParent(categoryName: string): string {
	const normalizedCategory = normalizeName(categoryName);

	for (
		let parentIndex = 0;
		parentIndex < STATIC_PARENT_NAMES.length;
		parentIndex++
	) {
		const parent = STATIC_PARENT_NAMES[parentIndex];

		if (normalizeName(parent) === normalizedCategory) {
			return parent;
		}

		const children = CATEGORY_HIERARCHY[parent];

		for (let childIndex = 0; childIndex < children.length; childIndex++) {
			if (normalizeName(children[childIndex]) === normalizedCategory) {
				return parent;
			}
		}
	}

	return DEFAULT_PARENT;
}

export function useCategoryHierarchy(
	currentCategory: string,
	deferredQuery: string,
) {
	const { allUnifiedCategories } = useUnifiedCategories("Expense", "All");

	const [selectedParent, setSelectedParent] = useState<string>(() => {
		return findStaticParent(currentCategory);
	});

	/*
	 * Build reusable indexes once.
	 *
	 * categoryByName:
	 * Used to locate the currently selected category.
	 *
	 * systemByName:
	 * Fallback system-category lookup.
	 *
	 * systemByParentAndName:
	 * Safest lookup because it distinguishes categories with
	 * identical names under different parents.
	 */
	const categoryIndexes = useMemo(() => {
		const categoryByName = new Map<string, UnifiedCategory>();

		const systemByName = new Map<string, UnifiedCategory>();

		const systemByParentAndName = new Map<string, UnifiedCategory>();

		for (let index = 0; index < allUnifiedCategories.length; index++) {
			const category = allUnifiedCategories[index];

			const normalizedCategoryName = normalizeName(category.name);

			if (!normalizedCategoryName) {
				continue;
			}

			const existingCategory = categoryByName.get(normalizedCategoryName);

			/*
			 * Prefer a system category if duplicate data somehow
			 * reaches this hook.
			 */
			if (
				!existingCategory ||
				(existingCategory.isCustom && !category.isCustom)
			) {
				categoryByName.set(normalizedCategoryName, category);
			}

			if (category.isCustom) {
				continue;
			}

			if (!systemByName.has(normalizedCategoryName)) {
				systemByName.set(normalizedCategoryName, category);
			}

			systemByParentAndName.set(
				createCategoryKey(category.parentName, category.name),
				category,
			);
		}

		return {
			categoryByName,
			systemByName,
			systemByParentAndName,
		};
	}, [allUnifiedCategories]);

	const selectedCategoryData = useMemo(() => {
		return categoryIndexes.categoryByName.get(normalizeName(currentCategory));
	}, [categoryIndexes, currentCategory]);

	const dynamicHierarchy = useMemo(() => {
		const hierarchy: Record<string, UnifiedCategory[]> = {};

		const canonicalParentNames = new Map<string, string>();

		const categoryNamesByParent = new Map<string, Set<string>>();

		/*
		 * Build the static hierarchy first.
		 */
		for (
			let parentIndex = 0;
			parentIndex < STATIC_PARENT_NAMES.length;
			parentIndex++
		) {
			const parent = STATIC_PARENT_NAMES[parentIndex];

			canonicalParentNames.set(normalizeName(parent), parent);

			const subcategoryNames = CATEGORY_HIERARCHY[parent];

			const mappedCategories: UnifiedCategory[] = [];

			const existingNames = new Set<string>();

			for (
				let childIndex = 0;
				childIndex < subcategoryNames.length;
				childIndex++
			) {
				const subcategoryName = subcategoryNames[childIndex];

				const normalizedSubcategory = normalizeName(subcategoryName);

				const category =
					categoryIndexes.systemByParentAndName.get(
						createCategoryKey(parent, subcategoryName),
					) ?? categoryIndexes.systemByName.get(normalizedSubcategory);

				if (category) {
					mappedCategories.push({
						...category,
						name: subcategoryName,
						parentName: parent,
						isCustom: false,
					});
				} else {
					mappedCategories.push({
						name: subcategoryName,
						parentName: parent,
						icon: subcategoryName,
						theme: getCategoryTheme(parent),
						isCustom: false,
					});
				}

				existingNames.add(normalizedSubcategory);
			}

			hierarchy[parent] = mappedCategories;

			categoryNamesByParent.set(parent, existingNames);
		}

		/*
		 * Append user-created categories.
		 */
		for (let index = 0; index < allUnifiedCategories.length; index++) {
			const category = allUnifiedCategories[index];

			if (!category.isCustom) {
				continue;
			}

			const categoryName = category.name.trim();

			if (!categoryName) {
				continue;
			}

			const normalizedCategoryName = normalizeName(categoryName);

			const rawParentName = category.parentName?.trim();

			/*
			 * Preserve the previous behavior for standalone
			 * categories without a parent: expose them as an
			 * empty parent group.
			 */
			if (!rawParentName) {
				if (!hierarchy[categoryName]) {
					hierarchy[categoryName] = [];

					categoryNamesByParent.set(categoryName, new Set());
				}

				continue;
			}

			/*
			 * Convert variations such as "food & Drink" to
			 * the canonical static parent name.
			 */
			const canonicalParent =
				canonicalParentNames.get(normalizeName(rawParentName)) ?? rawParentName;

			if (!hierarchy[canonicalParent]) {
				hierarchy[canonicalParent] = [];

				categoryNamesByParent.set(canonicalParent, new Set());

				canonicalParentNames.set(
					normalizeName(canonicalParent),
					canonicalParent,
				);
			}

			const existingNames = categoryNamesByParent.get(canonicalParent);

			if (existingNames?.has(normalizedCategoryName)) {
				continue;
			}

			hierarchy[canonicalParent].push({
				...category,
				name: categoryName,
				parentName: canonicalParent,
			});

			existingNames?.add(normalizedCategoryName);
		}

		return hierarchy;
	}, [allUnifiedCategories, categoryIndexes]);

	/*
	 * Determine which parent owns currentCategory.
	 *
	 * This supports:
	 * - static categories
	 * - custom categories
	 * - a parent name passed as currentCategory
	 * - categories loaded asynchronously
	 */
	const resolvedCurrentParent = useMemo(() => {
		const normalizedCurrentCategory = normalizeName(currentCategory);

		const parentNames = Object.keys(dynamicHierarchy);

		const parentByNormalizedName = new Map<string, string>();

		for (let index = 0; index < parentNames.length; index++) {
			const parent = parentNames[index];

			parentByNormalizedName.set(normalizeName(parent), parent);
		}

		const matchingParent = parentByNormalizedName.get(
			normalizedCurrentCategory,
		);

		if (matchingParent) {
			return matchingParent;
		}

		const categoryParentName = selectedCategoryData?.parentName;

		if (categoryParentName) {
			const canonicalParent = parentByNormalizedName.get(
				normalizeName(categoryParentName),
			);

			if (canonicalParent) {
				return canonicalParent;
			}
		}

		for (let parentIndex = 0; parentIndex < parentNames.length; parentIndex++) {
			const parent = parentNames[parentIndex];

			const children = dynamicHierarchy[parent];

			for (let childIndex = 0; childIndex < children.length; childIndex++) {
				if (
					normalizeName(children[childIndex].name) === normalizedCurrentCategory
				) {
					return parent;
				}
			}
		}

		return parentNames[0] ?? DEFAULT_PARENT;
	}, [currentCategory, dynamicHierarchy, selectedCategoryData]);

	/*
	 * Synchronize the tab when:
	 * - currentCategory changes
	 * - a custom category finishes loading and reveals its parent
	 *
	 * The ref prevents manually selected tabs from being immediately
	 * reset while currentCategory remains unchanged.
	 */
	const lastAutomaticSelection = useRef<{
		category: string;
		parent: string;
	} | null>(null);

	useEffect(() => {
		const nextSelection = {
			category: normalizeName(currentCategory),
			parent: resolvedCurrentParent,
		};

		const previousSelection = lastAutomaticSelection.current;

		if (
			previousSelection?.category === nextSelection.category &&
			previousSelection.parent === nextSelection.parent
		) {
			return;
		}

		lastAutomaticSelection.current = nextSelection;

		setSelectedParent(resolvedCurrentParent);
	}, [currentCategory, resolvedCurrentParent]);

	const normalizedQuery = useMemo(() => {
		return normalizeName(deferredQuery);
	}, [deferredQuery]);

	const visibleParents = useMemo(() => {
		const parentNames = Object.keys(dynamicHierarchy);

		if (!normalizedQuery) {
			return parentNames;
		}

		return parentNames.filter((parent) => {
			if (normalizeName(parent).includes(normalizedQuery)) {
				return true;
			}

			const children = dynamicHierarchy[parent];

			for (let index = 0; index < children.length; index++) {
				if (normalizeName(children[index].name).includes(normalizedQuery)) {
					return true;
				}
			}

			return false;
		});
	}, [dynamicHierarchy, normalizedQuery]);

	const activeParent = useMemo(() => {
		if (visibleParents.includes(selectedParent)) {
			return selectedParent;
		}

		if (visibleParents.length > 0) {
			return visibleParents[0];
		}

		if (dynamicHierarchy[selectedParent]) {
			return selectedParent;
		}

		return Object.keys(dynamicHierarchy)[0] ?? DEFAULT_PARENT;
	}, [dynamicHierarchy, selectedParent, visibleParents]);

	return {
		selectedCategoryData,
		dynamicHierarchy,
		visibleParents,
		activeParent,
		selectedParent,
		setSelectedParent,
	};
}
