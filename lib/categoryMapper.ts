import { CATEGORY_HIERARCHY } from "@/constants/categories";

export const EXTERNAL_TO_PARENT_MAP: Record<string, string> = {
    "Bills & Utilities": "Housing & utilities",
    "Utility": "Housing & utilities",
    "Internet & Cable": "Housing & utilities",
    "Restaurants & Dining": "Food & drink",
    "Fast Food": "Food & drink",
    "Groceries": "Food & drink",
    "Food & Drink": "Food & drink",
    "Shopping": "Shopping",
    "Fees & Adjustments": "Income",
    "Automotive": "Transportation",
    "Gasoline": "Transportation",
    "Gas": "Transportation",
    "": "Debt payments",
    "Office & Shipping": "Shopping",
    "Merchandise & Inventory": "Shopping",
    "Health & Wellness": "Health & wellness",
    "Repair & Maintenance": "Housing & utilities",
    "AUTOMATED FUEL DISPENSERS": "Transportation",
    "GOVERNMENT SERVICES-NOT ELSEWHERE CLASSIFIED": "Housing & utilities",
    "MEDICAL SERVICES & HEALTH PRACTITIONERS NOT E": "Health & wellness",
    "GROCERY STORES, SUPERMARKETS": "Food & drink",
    "DEPARTMENT STORES": "Shopping",
    "HOME SUPPLY WAREHOUSE": "Housing & utilities",
    "WHOLESALE CLUBS": "Food & drink",
    "INSURANCE-SALES & UNDERWRITING": "Insurance",
    "UTILITIES-GAS, WATER, SANITARY , ELECTRIC": "Housing & utilities",
    // Add more as you find them in your bank CSVs
};

export function resolveToParent(externalCategory: string): string {
    // 1. Direct match in our map
    if (EXTERNAL_TO_PARENT_MAP[externalCategory]) {
        return EXTERNAL_TO_PARENT_MAP[externalCategory];
    }

    // 2. If it's already a valid Parent or Subcat in our system, keep it
    const allInternalCategories = [
        ...Object.keys(CATEGORY_HIERARCHY),
        ...Object.values(CATEGORY_HIERARCHY).flat()
    ];
    
    if (allInternalCategories.includes(externalCategory)) {
        return externalCategory;
    }

    // 3. Fallback
    return "Uncategorized"; 
}