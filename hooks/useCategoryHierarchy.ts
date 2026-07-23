import { useEffect, useMemo, useState } from "react";

import {
	CATEGORY_HIERARCHY,
	getCategoryTheme,
	type UnifiedCategory,
} from "@/constants";
import {
	CATEGORY_PREFERENCES_CHANGED_EVENT,
	CATEGORY_PREFERENCES_STORAGE_KEY,
	GROUP_PREFERENCES_STORAGE_KEY,
	getCategoryGroupPreferenceKey,
	readCategoryPreferences,
	readGroupPreferences,
	type CategorySectionId,
} from "@/lib/categories/categoryPreferences";
import { useUnifiedCategories } from "@/hooks/useUnifiedCategories";

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
	const [preferenceVersion, setPreferenceVersion] = useState(0);

	useEffect(() => {
		const refreshPreferences = (): void => {
			setPreferenceVersion((current) => current + 1);
		};

		const handleStorage = (event: StorageEvent): void => {
			if (
				event.key === GROUP_PREFERENCES_STORAGE_KEY ||
				event.key === CATEGORY_PREFERENCES_STORAGE_KEY
			) {
				refreshPreferences();
			}
		};

		window.addEventListener(
			CATEGORY_PREFERENCES_CHANGED_EVENT,
			refreshPreferences,
		);
		window.addEventListener("storage", handleStorage);

		return () => {
			window.removeEventListener(
				CATEGORY_PREFERENCES_CHANGED_EVENT,
				refreshPreferences,
			);
			window.removeEventListener("storage", handleStorage);
		};
	}, []);

	const groupPreferences = useMemo(() => {
		void preferenceVersion;
		return readGroupPreferences();
	}, [preferenceVersion]);

	const categoryPreferences = useMemo(() => {
		void preferenceVersion;
		return readCategoryPreferences();
	}, [preferenceVersion]);

	const [selectedParent, setSelectedParent] = useState<string>(() => {
		const parents = Object.keys(CATEGORY_HIERARCHY);

		for (const parent of parents) {
			const children = CATEGORY_HIERARCHY[parent];

			if (
				children.includes(currentCategory) ||
				currentCategory.startsWith(parent)
			) {
				return parent;
			}
		}

		return parents[0] ?? "Income";
	});

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

	// useEffect(() => {
	// 	const preferredParent = selectedCategoryData?.parentName;

	// 	if (preferredParent && dynamicHierarchy[preferredParent]) {
	// 		setSelectedParent(preferredParent);
	// 		return;
	// 	}

	// 	if (!dynamicHierarchy[selectedParent]) {
	// 		setSelectedParent(Object.keys(dynamicHierarchy)[0] ?? "Income");
	// 	}
	// }, [dynamicHierarchy, selectedCategoryData?.parentName, selectedParent]);

const preferredParent = selectedCategoryData?.parentName;

if (preferredParent && dynamicHierarchy[preferredParent]) {
    // Only update if it actually differs to prevent infinite loops
    if (selectedParent !== preferredParent) {
        setSelectedParent(preferredParent);
    }
} else if (!dynamicHierarchy[selectedParent]) {
    const fallbackParent = Object.keys(dynamicHierarchy)[0] ?? "Income";
    if (selectedParent !== fallbackParent) {
        setSelectedParent(fallbackParent);
    }
}

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
			return selectedParent;
		}

		if (selectedParent.toLowerCase().includes(query)) {
			return selectedParent;
		}

		const children = dynamicHierarchy[selectedParent];

		if (
			children?.some((category) => {
				return category.name.toLowerCase().includes(query);
			})
		) {
			return selectedParent;
		}

		return visibleParents[0] ?? selectedParent;
	}, [deferredQuery, dynamicHierarchy, selectedParent, visibleParents]);

	return {
		selectedCategoryData,
		dynamicHierarchy,
		visibleParents,
		activeParent,
		selectedParent,
		setSelectedParent,
	};
}
