// This hook handles fetching the unified categories,
// mapping the static hierarchy to dynamic objects, 
// processing custom categories, 
// and handling all the real-time search filtering.

import { useState, useMemo } from "react";
import { CATEGORY_HIERARCHY, getCategoryTheme, UnifiedCategory } from "@/constants";
import { useUnifiedCategories } from "@/hooks/useUnifiedCategories";

export function useCategoryHierarchy(
    currentCategory: string,
    deferredQuery: string
) {
    // 1. Fetch categories
    const { allUnifiedCategories } = useUnifiedCategories("Expense", "All");

    // 2. Manage parent tab state
    const [selectedParent, setSelectedParent] = useState<string>(() => {
        const found = Object.keys(CATEGORY_HIERARCHY).find((parent) => {
            return (
                CATEGORY_HIERARCHY[parent].includes(currentCategory) ||
                currentCategory.startsWith(parent)
            );
        });
        return found || "Food & drink";
    });

    // 3. Find active category data for the UI trigger
    const selectedCategoryData = useMemo(() => {
        return allUnifiedCategories.find((cat) => {
            return cat.name === currentCategory;
        });
    }, [allUnifiedCategories, currentCategory]);

    // 4. Build the dynamic hierarchy
    const dynamicHierarchy = useMemo(() => {
        const base: Record<string, UnifiedCategory[]> = {};

        Object.keys(CATEGORY_HIERARCHY).forEach((parent) => {
            base[parent] = CATEGORY_HIERARCHY[parent].map((subName) => {
                const foundCat = allUnifiedCategories.find((c) => {
                    return c.name === subName;
                });
                
                if (foundCat) {
                    return foundCat;
                }
                
                return {
                    name: subName,
                    icon: subName,
                    theme: getCategoryTheme(parent),
                    isCustom: false,
                } as UnifiedCategory;
            });
        });

        allUnifiedCategories.forEach((cat) => {
            if (!cat.isCustom) {
                return;
            }

            if (cat.parentName && base[cat.parentName]) {
                const exists = base[cat.parentName].some((c) => {
                    return c.name === cat.name;
                });
                if (!exists) {
                    base[cat.parentName].push(cat);
                }
            } else if (!cat.parentName) {
                if (!base[cat.name]) {
                    base[cat.name] = [];
                }
            }
        });

        return base;
    }, [allUnifiedCategories]);

    // 5. Filter parent tabs based on search
    const visibleParents = useMemo(() => {
        const query = deferredQuery.toLowerCase().trim();
        const parents = Object.keys(dynamicHierarchy);

        if (!query) {
            return parents;
        }

        return parents.filter((parent) => {
            const matchesParent = parent.toLowerCase().includes(query);
            const matchesChild = dynamicHierarchy[parent].some((cat) => {
                return cat.name.toLowerCase().includes(query);
            });
            return matchesParent || matchesChild;
        });
    }, [deferredQuery, dynamicHierarchy]);

    // 6. Determine which parent tab is currently active
    const activeParent = useMemo(() => {
        const query = deferredQuery.toLowerCase().trim();
        if (!query) {
            return selectedParent;
        }

        const matchesParent = selectedParent.toLowerCase().includes(query);
        const matchesChild = CATEGORY_HIERARCHY[selectedParent]?.some((s) => {
            return s.toLowerCase().includes(query);
        });

        if (matchesParent || matchesChild) {
            return selectedParent;
        }

        if (visibleParents.length > 0) {
            return visibleParents[0];
        }
        
        return selectedParent;
    }, [deferredQuery, visibleParents, selectedParent]);

    return {
        selectedCategoryData,
        dynamicHierarchy,
        visibleParents,
        activeParent,
        selectedParent,
        setSelectedParent,
    };
}