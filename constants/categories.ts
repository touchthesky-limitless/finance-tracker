export interface CategoryTheme {
	text: string;
	bg: string;
	border: string;
	dot?: string;
	colorKey?: string;
}

export type UnifiedCategory = {
	id?: string;
	name: string;
	isCustom: boolean;
	parentName?: string;
	theme: CategoryTheme;
	icon?: string;
};

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
	"Uncategorized": ["Other"],
};

export const PARENT_COLORS: Record<string, CategoryTheme> = {
	"Income": {
		text: "text-emerald-500",
		bg: "bg-emerald-500",
		border: "border-emerald-500/20",
	},
	"Transfers": {
		text: "text-blue-500",
		bg: "bg-blue-500",
		border: "border-blue-500/20",
	},
	"Debt payments": {
		text: "text-red-400",
		bg: "bg-red-400",
		border: "border-red-400/20",
	},
	"Investments": {
		text: "text-indigo-400",
		bg: "bg-indigo-400",
		border: "border-indigo-400/20",
	},
	"Bank fees": {
		text: "text-amber-400",
		bg: "bg-amber-400",
		border: "border-amber-400/20",
	},
	"Food & drink": {
		text: "text-orange-500",
		bg: "bg-orange-500",
		border: "border-orange-500/20",
	},
	"Shopping": {
		text: "text-pink-500",
		bg: "bg-pink-500",
		border: "border-pink-500/20",
	},
	"Housing & utilities": {
		text: "text-yellow-600",
		bg: "bg-yellow-600",
		border: "border-yellow-600/20",
	},
	"Health & wellness": {
		text: "text-rose-500",
		bg: "bg-rose-500",
		border: "border-rose-500/20",
	},
	"Entertainment": {
		text: "text-purple-500",
		bg: "bg-purple-500",
		border: "border-purple-500/20",
	},
	"Insurance": {
		text: "text-cyan-500",
		bg: "bg-cyan-500",
		border: "border-cyan-500/20",
	},
	"Services": {
		text: "text-orange-500",
		bg: "bg-orange-500",
		border: "border-orange-500/20",
	},
	"Transportation": {
		text: "text-blue-500",
		bg: "bg-blue-500",
		border: "border-blue-500/20",
	},
	"Travel": {
		text: "text-sky-400",
		bg: "bg-sky-400",
		border: "border-sky-400/20",
	},
	"Government & charity": {
		text: "text-amber-900",
		bg: "bg-amber-900",
		border: "border-amber-900/20",
	},
	"Uncategorized": {
		text: "text-gray-400",
		bg: "bg-gray-400",
		border: "border-gray-400/20",
	},
};

export const CATEGORY_COLORS: Record<string, CategoryTheme> = {
	Emerald: {
		text: "text-emerald-500",
		bg: "bg-emerald-500",
		border: "border-emerald-500/20",
	},
	Blue: {
		text: "text-blue-500",
		bg: "bg-blue-500",
		border: "border-blue-500/20",
	},
	Red: { text: "text-red-400", bg: "bg-red-400", border: "border-red-400/20" },
	Indigo: {
		text: "text-indigo-400",
		bg: "bg-indigo-400",
		border: "border-indigo-400/20",
	},
	Amber: {
		text: "text-amber-400",
		bg: "bg-amber-400",
		border: "border-amber-400/20",
	},
	Orange: {
		text: "text-orange-500",
		bg: "bg-orange-500",
		border: "border-orange-500/20",
	},
	Pink: {
		text: "text-pink-500",
		bg: "bg-pink-500",
		border: "border-pink-500/20",
	},
	Yellow: {
		text: "text-yellow-600",
		bg: "bg-yellow-600",
		border: "border-yellow-600/20",
	},
	Rose: {
		text: "text-rose-500",
		bg: "bg-rose-500",
		border: "border-rose-500/20",
	},
	Purple: {
		text: "text-purple-500",
		bg: "bg-purple-500",
		border: "border-purple-500/20",
	},
	Cyan: {
		text: "text-cyan-500",
		bg: "bg-cyan-500",
		border: "border-cyan-500/20",
	},
	Sky: { text: "text-sky-400", bg: "bg-sky-400", border: "border-sky-400/20" },
	Slate: {
		text: "text-slate-400",
		bg: "bg-slate-400",
		border: "border-slate-400/20",
	},
	Fuchsia: {
		text: "text-fuchsia-500",
		bg: "bg-fuchsia-500",
		border: "border-fuchsia-500/20",
	},
	Lime: {
		text: "text-lime-500",
		bg: "bg-lime-500",
		border: "border-lime-500/20",
	},
};

/**
 * Finds the parent category name for any given subcategory.
 */
export function findParentCategory(subCategory: string): string {
	// Look through the static hierarchy
	for (const [parent, subs] of Object.entries(CATEGORY_HIERARCHY)) {
		if (subs.includes(subCategory) || parent === subCategory) {
			return parent;
		}
	}
	// 2. If it's not in the static list, it might be a custom primary category.
	// In that case, we return the name itself so getCategoryTheme
	// can attempt to look up its specific custom color.
	return subCategory || "Uncategorized";
}

/**
 * Helper to get the full theme object for a category.
 */
export function getCategoryTheme(categoryName: string): CategoryTheme {
    // 1. Helper to attach the key to the theme object
    const withKey = (theme: Omit<CategoryTheme, 'colorKey'>, key: string): CategoryTheme => ({
        ...theme,
        colorKey: key
    });

    // 2. Check if it's a System Category (e.g., "Food & drink")
    if (PARENT_COLORS[categoryName]) {
        // We need to find which CATEGORY_COLORS key this parent uses
        // Or if PARENT_COLORS already maps to a key, use that.
        return withKey(PARENT_COLORS[categoryName], categoryName);
    }

    // 3. Check if it's a raw Color Name (e.g., "Emerald")
    if (CATEGORY_COLORS[categoryName]) {
        return withKey(CATEGORY_COLORS[categoryName], categoryName);
    }

    // 4. Sub-category lookup
    const parent = findParentCategory(categoryName);
    const fallbackKey = parent || "Uncategorized";
    
    const theme = PARENT_COLORS[fallbackKey] || 
                  CATEGORY_COLORS[fallbackKey] || 
                  PARENT_COLORS["Uncategorized"];

    return withKey(theme, fallbackKey);
}

/**
 * Optimized search for categories
 */
export function searchCategories(query: string): string | null {
	const normalizedQuery = query.toLowerCase().trim();
	if (!normalizedQuery) return null;

	const allCategories = Object.entries(CATEGORY_HIERARCHY).flatMap(
		([parent, subs]) => [parent, ...subs],
	);

	const exactMatch = allCategories.find(
		(cat) => cat.toLowerCase() === normalizedQuery,
	);
	if (exactMatch) return exactMatch;

	const partialMatch = allCategories.find((cat) =>
		cat.toLowerCase().startsWith(normalizedQuery),
	);
	if (partialMatch) return partialMatch;

	return null;
}
