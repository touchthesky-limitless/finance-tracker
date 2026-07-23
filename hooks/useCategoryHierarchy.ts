import { useMemo, useState } from "react";

import {
	CATEGORY_HIERARCHY,
	getCategoryTheme,
	type UnifiedCategory,
} from "@/constants";
import {
	getCategoryGroupPreferenceKey,
	type CategorySectionId,
} from "@/lib/categories/categoryPreferences";
import { useUnifiedCategories } from "@/hooks/useUnifiedCategories";
import { useBudgetStore } from "@/store/useBudgetStore";

function normalize(value: string | null | undefined): string {
	return value?.trim().toLowerCase() ?? "";
}

function getDefaultSectionId(groupName: string): CategorySectionId {
	const normalizedName = normalize(groupName);

	if (normalizedName === "income") {
		return "income";
	}

	if (normalizedName.includes("transfer")) {
		return "transfers";
	}

	return "expenses";
}

function getSectionRank(sectionId: CategorySectionId): number {
	if (sectionId === "income") {
		return 0;
	}

	if (sectionId === "expenses") {
		return 1;
	}

	return 2;
}

function getCategoryIdentity(category: UnifiedCategory): string {
	if (category.id) {
		return `id:${category.id}`;
	}

	return `name:${normalize(category.parentName)}:${normalize(category.name)}`;
}

export function useCategoryHierarchy(
	currentCategory: string,
	deferredQuery: string,
) {
	const { allUnifiedCategories } = useUnifiedCategories("Expense", "All");
	const groupPreferences = useBudgetStore((state) => state.groupPreferences);
	const categoryPreferences = useBudgetStore(
		(state) => state.categoryPreferences,
	);
	const [selectedParent, setSelectedParent] = useState("");

	const selectedCategoryData = useMemo(() => {
		const category = allUnifiedCategories.find((item) => {
			return item.name === currentCategory;
		});

		if (!category) {
			return undefined;
		}

		const preferredParent = category.id
			? categoryPreferences[category.id]?.parentName?.trim()
			: undefined;
		const effectiveParent = preferredParent || category.parentName;

		if (!effectiveParent || effectiveParent === category.parentName) {
			return category;
		}

		return {
			...category,
			parentName: effectiveParent,
			theme: getCategoryTheme(effectiveParent),
		};
	}, [allUnifiedCategories, categoryPreferences, currentCategory]);

	const dynamicHierarchy = useMemo(() => {
		const base: Record<string, UnifiedCategory[]> = {};
		const rootCategoryByName = new Map<string, UnifiedCategory>();
		const categoryByKey = new Map<string, UnifiedCategory>();
		const parentNames: string[] = [];
		const seenParentNames = new Set<string>();

		for (const category of allUnifiedCategories) {
			if (!category.parentName) {
				rootCategoryByName.set(normalize(category.name), category);
			}

			categoryByKey.set(
				`${normalize(category.name)}|${normalize(category.parentName)}`,
				category,
			);
		}

		for (const parentName of Object.keys(CATEGORY_HIERARCHY)) {
			parentNames.push(parentName);
			seenParentNames.add(normalize(parentName));
		}

		for (const category of allUnifiedCategories) {
			if (category.parentName || seenParentNames.has(normalize(category.name))) {
				continue;
			}

			parentNames.push(category.name);
			seenParentNames.add(normalize(category.name));
		}

		const parentMetadata = parentNames.map((parentName, fallbackIndex) => {
			const rootCategory = rootCategoryByName.get(normalize(parentName));
			const preferenceKey = getCategoryGroupPreferenceKey(
				parentName,
				rootCategory?.id,
				rootCategory ? !rootCategory.isCustom : true,
			);
			const preference = groupPreferences[preferenceKey];

			return {
				parentName,
				fallbackIndex,
				hidden: preference?.hidden === true,
				sectionId:
					preference?.sectionId ?? getDefaultSectionId(parentName),
				order:
					typeof preference?.order === "number"
						? preference.order
						: null,
			};
		});

		parentMetadata.sort((first, second) => {
			const sectionDifference =
				getSectionRank(first.sectionId) - getSectionRank(second.sectionId);

			if (sectionDifference !== 0) {
				return sectionDifference;
			}

			if (first.order !== null || second.order !== null) {
				if (first.order === null) {
					return 1;
				}

				if (second.order === null) {
					return -1;
				}

				if (first.order !== second.order) {
					return first.order - second.order;
				}
			}

			return first.fallbackIndex - second.fallbackIndex;
		});

		const visibleParentNames = new Set<string>();

		for (const metadata of parentMetadata) {
			if (metadata.hidden) {
				continue;
			}

			base[metadata.parentName] = [];
			visibleParentNames.add(metadata.parentName);
		}

		const insertedByParent = new Map<string, Set<string>>();

		const appendCategory = (
			category: UnifiedCategory,
			defaultParentName: string,
		): void => {
			const preferredParent = category.id
				? categoryPreferences[category.id]?.parentName?.trim()
				: undefined;
			const parentName = preferredParent || defaultParentName;

			if (!visibleParentNames.has(parentName)) {
				return;
			}

			const identity = getCategoryIdentity(category);
			const inserted = insertedByParent.get(parentName) ?? new Set<string>();

			if (inserted.has(identity)) {
				return;
			}

			inserted.add(identity);
			insertedByParent.set(parentName, inserted);
			base[parentName].push({
				...category,
				parentName,
				theme: getCategoryTheme(parentName),
			});
		};

		for (const [parentName, subcategoryNames] of Object.entries(
			CATEGORY_HIERARCHY,
		)) {
			for (const subcategoryName of subcategoryNames) {
				const foundCategory = categoryByKey.get(
					`${normalize(subcategoryName)}|${normalize(parentName)}`,
				);
				const category: UnifiedCategory = foundCategory
					? {
							...foundCategory,
							name: subcategoryName,
							parentName,
							isCustom: false,
						}
					: {
							name: subcategoryName,
							parentName,
							icon: subcategoryName,
							theme: getCategoryTheme(parentName),
							isCustom: false,
						};

				appendCategory(category, parentName);
			}
		}

		for (const category of allUnifiedCategories) {
			if (!category.isCustom || !category.parentName) {
				continue;
			}

			appendCategory(category, category.parentName);
		}

		for (const parentName of Object.keys(base)) {
			const fallbackOrder = new Map<string, number>();

			base[parentName].forEach((category, index) => {
				fallbackOrder.set(getCategoryIdentity(category), index);
			});

			base[parentName].sort((first, second) => {
				const firstOrder = first.id
					? categoryPreferences[first.id]?.order
					: undefined;
				const secondOrder = second.id
					? categoryPreferences[second.id]?.order
					: undefined;

				if (firstOrder !== undefined || secondOrder !== undefined) {
					if (firstOrder === undefined) {
						return 1;
					}

					if (secondOrder === undefined) {
						return -1;
					}

					if (firstOrder !== secondOrder) {
						return firstOrder - secondOrder;
					}
				}

				return (
					(fallbackOrder.get(getCategoryIdentity(first)) ?? 0) -
					(fallbackOrder.get(getCategoryIdentity(second)) ?? 0)
				);
			});
		}

		return base;
	}, [allUnifiedCategories, categoryPreferences, groupPreferences]);

	const preferredParent = useMemo(() => {
		const categoryParent = selectedCategoryData?.parentName;

		if (categoryParent && dynamicHierarchy[categoryParent]) {
			return categoryParent;
		}

		const parents = Object.keys(dynamicHierarchy);

		for (const parent of parents) {
			const categories = dynamicHierarchy[parent];

			if (
				categories.some((category) => {
					return category.name === currentCategory;
				})
			) {
				return parent;
			}
		}

		return parents[0] ?? "Income";
	}, [
		currentCategory,
		dynamicHierarchy,
		selectedCategoryData?.parentName,
	]);

	const resolvedSelectedParent = useMemo(() => {
		if (selectedParent && dynamicHierarchy[selectedParent]) {
			return selectedParent;
		}

		return preferredParent;
	}, [dynamicHierarchy, preferredParent, selectedParent]);

	const visibleParents = useMemo(() => {
		const query = deferredQuery.toLowerCase().trim();
		const parents = Object.keys(dynamicHierarchy);

		if (!query) {
			return parents;
		}

		return parents.filter((parent) => {
			if (parent.toLowerCase().includes(query)) {
				return true;
			}

			return dynamicHierarchy[parent].some((category) => {
				return category.name.toLowerCase().includes(query);
			});
		});
	}, [deferredQuery, dynamicHierarchy]);

	const activeParent = useMemo(() => {
		const query = deferredQuery.toLowerCase().trim();

		if (!query) {
			return resolvedSelectedParent;
		}

		if (resolvedSelectedParent.toLowerCase().includes(query)) {
			return resolvedSelectedParent;
		}

		const children = dynamicHierarchy[resolvedSelectedParent];

		if (
			children?.some((category) => {
				return category.name.toLowerCase().includes(query);
			})
		) {
			return resolvedSelectedParent;
		}

		return visibleParents[0] ?? resolvedSelectedParent;
	}, [
		deferredQuery,
		dynamicHierarchy,
		resolvedSelectedParent,
		visibleParents,
	]);

	return {
		selectedCategoryData,
		dynamicHierarchy,
		visibleParents,
		activeParent,
		selectedParent: resolvedSelectedParent,
		setSelectedParent,
	};
}
