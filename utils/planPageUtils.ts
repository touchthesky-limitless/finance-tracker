import { CATEGORY_HIERARCHY, findParentCategory, getCategoryTheme } from "@/constants";
import type { CustomCategory, Transaction } from "@/store/useBudgetStore";
import type { CategoryPreferences } from "@/lib/categories/categoryPreferences";
import { CategoryBudgetType } from "@/components/Categories/types";

export function getGroupFromCategory(
    categoryName: string,
    categoryId: string | undefined,
    categoryPreferences: CategoryPreferences,
): string {
    const parent = findParentCategory(categoryName);
    // 1. Exclude Income and Transfers from expense groupings
    if (parent === "Income") return "Income";
    if (parent === "Transfers") return "Transfers";

    // 2. If we have a valid category ID and a valid budgetType, respect it
    if (categoryId) {
        const prefs = categoryPreferences[categoryId];
        if (prefs && prefs.budgetType) {
            const validTypes: CategoryBudgetType[] = [
                "fixed",
                "flexible",
                "non-monthly",
            ];
            if (validTypes.includes(prefs.budgetType as CategoryBudgetType)) {
                // 🔁 Map lowercase to capitalized group name
                const typeMap: Record<string, string> = {
                    "fixed": "Fixed",
                    "flexible": "Flexible",
                    "non-monthly": "Non-Monthly",
                };
                return typeMap[prefs.budgetType] || prefs.budgetType;
            }
        }
    }

    // 3. Fall back to static classification
    if (["Mortgage"].includes(categoryName)) {
        return "Fixed";
    }
    if (
        [
            "Vacation",
            "Home Improvement",
            "Medical",
            "Financial Fees",
            "Education",
        ].includes(categoryName)
    ) {
        return "Non-Monthly";
    }
    return "Flexible";
}

export function getPlanKey(date: Date, categoryId: string): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01_${categoryId}`;
}

// Get all category names (static + custom) that belong to a given group (via getGroupFromCategory)
export function getAllCategoryNamesForGroup(
    groupName: string,
    customCategories: CustomCategory[],
    categoryPreferences: CategoryPreferences,
    categoryMap: Map<string, CustomCategory>,
): { name: string; id?: string }[] {
    // All static categories from CATEGORY_HIERARCHY
    const staticCategories = new Set<string>();
    for (const [parent, children] of Object.entries(CATEGORY_HIERARCHY)) {
        staticCategories.add(parent);
        for (const child of children) {
            staticCategories.add(child);
        }
    }
    // All custom categories
    const customNames = customCategories.map((cat) => cat.name.trim());

    // Combine all and filter by group mapping
    const allNames = new Set([...staticCategories, ...customNames]);
    const result: { name: string; id?: string }[] = [];
    for (const name of allNames) {
        const cat = categoryMap.get(name.trim());
        const id = cat?.id;
        if (getGroupFromCategory(name, id, categoryPreferences) === groupName) {
            result.push({ name, id });
        }
    }
    return result;
}

// Build rows for a group, including zero‑actual categories
export function buildGroupRows(
    groupName: string,
    monthTransactions: Transaction[],
    customCategories: CustomCategory[],
    categoryPreferences: CategoryPreferences,
    categoryMap: Map<string, CustomCategory>,
): { label: string; value: number; key: string; color: string; id?: string }[] {
    const allCategories = getAllCategoryNamesForGroup(
        groupName,
        customCategories,
        categoryPreferences,
        categoryMap,
    );
    return allCategories.map(({ name, id }) => {
        const total = monthTransactions
            .filter((tx) => tx.category?.trim() === name)
            .reduce((sum, tx) => sum + Math.abs(tx.amount || 0), 0);
        const theme = getCategoryTheme(name);
        return {
            key: `${groupName}:${name}`,
            label: name,
            value: total,
            color: theme.text,
            id,
        };
    });
}