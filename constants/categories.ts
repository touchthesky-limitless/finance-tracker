export const CATEGORY_HIERARCHY: Record<string, string[]> = {
	"Income": [
		"Wages",
		"Dividends",
		"Interest",
		"Benefits & pension",
		"Tax refunds",
		"Unemployment",
		"Other income",
	],
	"Transfers": [
		"Account transfers",
		"Investment transfers",
		"Savings transfers",
		"Cash deposits",
		"Cash withdraws",
		"Loans & cash advances",
		"Person to person payments",
		"Other transfers",
	],
	"Debt payments": [
		"Credit card payments",
		"Auto loan payments",
		"Student loan payments",
		"Personal loan payments",
		"Other debt payments",
	],
	"Investments": ["Buy", "Sell", "ETFs", "Crypto"],
	"Bank fees": [
		"ATM fees",
		"Foreign transaction fees",
		"Insufficient funds",
		"Interest charge",
		"Late fees",
		"Wire fees",
		"Overdraft fees",
		"Other bank fees",
	],
	"Food & drink": [
		"Restaurants & bars",
		"Groceries",
		"Coffee shops",
		"Liquor stores",
		"Other food & drink",
	],
	"Shopping": [
		"Clothing & accessories",
		"Electronics",
		"Pets supplies",
		"Gifts",
		"Office supplies",
		"Sports & outdoors",
		"Retail",
		"Convenience stores",
		"Hair & beauty",
		"Tobaco & vape",
		"Other shopping",
	],
	"Housing & utilities": [
		"Rent",
		"Mortgage payments",
		"Home improvement & repairs",
		"Phone & internet",
		"Gas & electricity",
		"Water sewer & garbage",
		"Security",
		"Hoa fee",
		"Property tax",
		"Other housing & utilities",
	],
	"Health & wellness": [
		"Medical",
		"Pharmacy",
		"Dental",
		"Vision",
		"Nursing",
		"Fitness",
		"Personal care",
		"Other health & wellness",
	],
	"Entertainment": [
		"Gambling",
		"Book & news",
		"Movies & TV",
		"Music & audio",
		"Games",
		"Events & Recreation",
		"Other entertainment",
	],
	"Insurance": [
		"Life insurance",
		"Health insurance",
		"Auto insurance",
		"Home insurance",
		"Other insurance",
	],
	"Services": [
		"Household services",
		"Education services",
		"Veterinary services",
		"Childcare services",
		"Digital services",
		"Legal services",
		"Financial services",
		"Shipping",
		"Moving & storage",
		"Other services",
	],
	"Transportation": [
		"Gasoline & EV charing",
		"Car services",
		"Public transit",
		"Taxi & ride shares",
		"Parking & tolls",
		"Other transportation",
	],
	"Travel": ["Flights", "Hotels", "Rental cars", "Other travel"],
	"Government & charity": [
		"Tax payments",
		"Government fees",
		"Charity",
		"Other government & charity",
	],
	"Other": ["Uncategorized", "Other"],
};

export const PARENT_COLORS: Record<string, string> = {
	"Income": "text-emerald-500",
	"Transfers": "text-blue-500",
	"Debt payments": "text-red-400",
	"Investments": "text-indigo-400",
	"Bank fees": "text-amber-400",
	"Food & drink": "text-orange-500",
	"Shopping": "text-pink-500",
	"Housing & utilities": "text-yellow-600",
	"Health & wellness": "text-rose-500",
	"Entertainment": "text-purple-500",
	"Insurance": "text-cyan-500",
	"Services": "text-orange-500",
	"Transportation": "text-blue-500",
	"Travel": "text-sky-400",
	"Government & charity": "text-amber-900",
};

export function findParentCategory(subCategory: string): string {
	for (const [parent, subs] of Object.entries(CATEGORY_HIERARCHY)) {
		if (subs.includes(subCategory) || parent === subCategory) {
			return parent;
		}
	}
	return "Other";
}

export function getParentColor(parentName: string): string {
	return PARENT_COLORS[parentName] || "text-gray-400";
}

/**
 * Optimized search that returns the most relevant category
 * Handles casing, whitespace, and "Parent vs Sub" matches.
 */
export function searchCategories(query: string): string | null {
    const normalizedQuery = query.toLowerCase().trim();
    if (!normalizedQuery) return null;

    const allCategories = Object.entries(CATEGORY_HIERARCHY).flatMap(([parent, subs]) => [
        parent,
        ...subs,
    ]);

    // 1. Check for exact match first
    const exactMatch = allCategories.find(cat => cat.toLowerCase() === normalizedQuery);
    if (exactMatch) return exactMatch;

    // 2. Check for "starts with" (good for partial typing)
    const partialMatch = allCategories.find(cat => cat.toLowerCase().startsWith(normalizedQuery));
    if (partialMatch) return partialMatch;

    return null;
}