import { useMemo } from "react";

import {
	CATEGORY_HIERARCHY,
	getCategoryTheme,
	type UnifiedCategory,
} from "@/constants";

import { useBudgetStore } from "@/store/useBudgetStore";

const ALL_CATEGORY_KEY = "all";
const INCOME_CATEGORY_KEY = "income";
const TRANSFERS_CATEGORY_KEY = "transfers";
const ROOT_CATEGORY_KEY = "__root__";

function normalizeName(value: string | null | undefined): string {
	return value?.trim().toLowerCase() ?? "";
}

function createCategoryKey(name: string, parentName?: string | null): string {
	const normalizedName = normalizeName(name);

	const normalizedParent = normalizeName(parentName) || ROOT_CATEGORY_KEY;

	return `${normalizedParent}|${normalizedName}`;
}

/*
 * CATEGORY_HIERARCHY is static, so this metadata only needs to
 * be calculated once when the module loads.
 */
const STATIC_CATEGORY_DEFINITIONS = Object.entries(CATEGORY_HIERARCHY).map(
	([parentName, subcategoryNames]) => {
		return {
			parentName,
			parentKey: normalizeName(parentName),
			subcategoryNames,
			theme: getCategoryTheme(parentName),
		};
	},
);

interface CategoryModel {
	allUnifiedCategories: UnifiedCategory[];
	rootCategories: UnifiedCategory[];

	rootCategoryByName: Map<string, UnifiedCategory>;

	childrenByParent: Map<string, UnifiedCategory[]>;
}

export function useUnifiedCategories(
	transactionType: string,
	activePrimary: string,
) {
	const customCategories = useBudgetStore((state) => {
		return state.customCategories;
	});

	const categoryModel = useMemo<CategoryModel>(() => {
		type StoredCategory = (typeof customCategories)[number];

		const allUnifiedCategories: UnifiedCategory[] = [];

		const rootCategories: UnifiedCategory[] = [];

		const rootCategoryByName = new Map<string, UnifiedCategory>();

		const childrenByParent = new Map<string, UnifiedCategory[]>();

		const canonicalParentByName = new Map<string, string>();

		const systemCategoryByKey = new Map<string, StoredCategory>();

		const existingCategoryKeys = new Set<string>();

		/*
		 * System rows provide stable UUIDs for static
		 * subcategories.
		 */
		for (let index = 0; index < customCategories.length; index++) {
			const category = customCategories[index];

			if (!category.is_system) {
				continue;
			}

			const name = category.name.trim();

			const parentName = category.parent_name?.trim();

			if (!name || !parentName) {
				continue;
			}

			const key = createCategoryKey(name, parentName);

			/*
			 * Keep the first matching row if duplicate
			 * system records somehow exist.
			 */
			if (!systemCategoryByKey.has(key)) {
				systemCategoryByKey.set(key, category);
			}
		}

		/*
		 * Build static roots and subcategories in the
		 * exact order declared in CATEGORY_HIERARCHY.
		 */
		for (
			let definitionIndex = 0;
			definitionIndex < STATIC_CATEGORY_DEFINITIONS.length;
			definitionIndex++
		) {
			const definition = STATIC_CATEGORY_DEFINITIONS[definitionIndex];

			const parentCategory: UnifiedCategory = {
				name: definition.parentName,
				isCustom: false,
				theme: definition.theme,
				icon: definition.parentName,
			};

			allUnifiedCategories.push(parentCategory);

			rootCategories.push(parentCategory);

			rootCategoryByName.set(definition.parentKey, parentCategory);

			canonicalParentByName.set(definition.parentKey, definition.parentName);

			existingCategoryKeys.add(createCategoryKey(definition.parentName));

			const children: UnifiedCategory[] = [];

			for (
				let childIndex = 0;
				childIndex < definition.subcategoryNames.length;
				childIndex++
			) {
				const subcategoryName = definition.subcategoryNames[childIndex];

				const categoryKey = createCategoryKey(
					subcategoryName,
					definition.parentName,
				);

				const systemCategory = systemCategoryByKey.get(categoryKey);

				const childCategory: UnifiedCategory = {
					id: systemCategory?.id,

					name: subcategoryName,

					isCustom: false,

					parentName: definition.parentName,

					theme: definition.theme,

					icon: systemCategory?.icon_name?.trim() || subcategoryName,
				};

				children.push(childCategory);

				allUnifiedCategories.push(childCategory);

				existingCategoryKeys.add(categoryKey);
			}

			childrenByParent.set(definition.parentKey, children);
		}

		/*
		 * Add custom root categories first so custom child
		 * categories can reference them regardless of the
		 * database row order.
		 */
		for (let index = 0; index < customCategories.length; index++) {
			const category = customCategories[index];

			if (category.is_system || category.parent_name) {
				continue;
			}

			const name = category.name.trim();

			if (!name) {
				continue;
			}

			const normalizedName = normalizeName(name);

			const categoryKey = createCategoryKey(name);

			if (existingCategoryKeys.has(categoryKey)) {
				continue;
			}

			const themeKey = category.color_key?.trim() || name;

			const rootCategory: UnifiedCategory = {
				id: category.id,
				name,
				isCustom: true,
				theme: getCategoryTheme(themeKey),
				icon: category.icon_name?.trim() || name,
			};

			allUnifiedCategories.push(rootCategory);

			rootCategories.push(rootCategory);

			rootCategoryByName.set(normalizedName, rootCategory);

			canonicalParentByName.set(normalizedName, name);

			childrenByParent.set(normalizedName, []);

			existingCategoryKeys.add(categoryKey);
		}

		/*
		 * Add custom child categories after every possible
		 * parent has been registered.
		 */
		for (let index = 0; index < customCategories.length; index++) {
			const category = customCategories[index];

			if (category.is_system || !category.parent_name) {
				continue;
			}

			const name = category.name.trim();

			const storedParentName = category.parent_name.trim();

			if (!name || !storedParentName) {
				continue;
			}

			const normalizedStoredParent = normalizeName(storedParentName);

			const canonicalParentName =
				canonicalParentByName.get(normalizedStoredParent) ?? storedParentName;

			const normalizedParent = normalizeName(canonicalParentName);

			const categoryKey = createCategoryKey(name, canonicalParentName);

			if (existingCategoryKeys.has(categoryKey)) {
				continue;
			}

			const themeKey =
				canonicalParentName || category.color_key?.trim() || name;

			const childCategory: UnifiedCategory = {
				id: category.id,
				name,
				isCustom: true,
				parentName: canonicalParentName,
				theme: getCategoryTheme(themeKey),
				icon: category.icon_name?.trim() || name,
			};

			let parentChildren = childrenByParent.get(normalizedParent);

			if (!parentChildren) {
				parentChildren = [];

				childrenByParent.set(normalizedParent, parentChildren);
			}

			parentChildren.push(childCategory);

			allUnifiedCategories.push(childCategory);

			existingCategoryKeys.add(categoryKey);
		}

		return {
			allUnifiedCategories,
			rootCategories,
			rootCategoryByName,
			childrenByParent,
		};
	}, [customCategories]);

	const normalizedTransactionType = normalizeName(transactionType);

	const normalizedActivePrimary = normalizeName(activePrimary);

	const isShowingAll = normalizedActivePrimary === ALL_CATEGORY_KEY;

	const primaryCategories = useMemo(() => {
		if (normalizedTransactionType === INCOME_CATEGORY_KEY) {
			const incomeCategory =
				categoryModel.rootCategoryByName.get(INCOME_CATEGORY_KEY);

			return incomeCategory ? [incomeCategory] : [];
		}

		if (normalizedTransactionType === "transfer") {
			const transfersCategory = categoryModel.rootCategoryByName.get(
				TRANSFERS_CATEGORY_KEY,
			);

			return transfersCategory ? [transfersCategory] : [];
		}

		return categoryModel.rootCategories.filter((category) => {
			const categoryKey = normalizeName(category.name);

			return (
				categoryKey !== INCOME_CATEGORY_KEY &&
				categoryKey !== TRANSFERS_CATEGORY_KEY
			);
		});
	}, [categoryModel, normalizedTransactionType]);

	const displayList = useMemo(() => {
		if (isShowingAll) {
			return primaryCategories;
		}

		return categoryModel.childrenByParent.get(normalizedActivePrimary) ?? [];
	}, [categoryModel, isShowingAll, normalizedActivePrimary, primaryCategories]);

	const activeCategory = useMemo(() => {
		if (isShowingAll) {
			return null;
		}

		return (
			categoryModel.rootCategoryByName.get(normalizedActivePrimary) ?? null
		);
	}, [categoryModel, isShowingAll, normalizedActivePrimary]);

	return {
		allUnifiedCategories: categoryModel.allUnifiedCategories,

		primaryCategories,
		displayList,
		activeCategory,
		isShowingAll,
	};
}
