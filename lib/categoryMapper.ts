import { CATEGORY_HIERARCHY } from "@/constants/categories";

export const EXTERNAL_TO_PARENT_MAP: Record<string, string> = {
	"Fast Food": "Food & drink",
	"Restaurants & Dining": "Food & drink",
	"Gas": "Transportation",
	"Bills & Utilities": "Housing & utilities",
	// Add generic text standardizations here if needed
};

export function resolveToParent(
	externalCategory: string,
	merchant: string = "",
): string {
	const merchantName = merchant.toLowerCase();

	// --- STEP 1: INTERNAL VALIDATION ---
	// If it perfectly matches your hierarchy (e.g., from your centralized CSV)
	const allInternalCategories = [
		...Object.keys(CATEGORY_HIERARCHY),
		...Object.values(CATEGORY_HIERARCHY).flat(),
	];

	if (allInternalCategories.includes(externalCategory)) {
		return externalCategory;
	}

	// --- STEP 2: GENERIC MAPPING TABLE ---
	if (EXTERNAL_TO_PARENT_MAP[externalCategory]) {
		return EXTERNAL_TO_PARENT_MAP[externalCategory];
	}

	// --- STEP 3: MERCHANT KEYWORDS (Universal Fallback) ---
	if (merchantName.includes("starbuck") || merchantName.includes("mcdonald"))
		return "Food & drink";

	if (
		merchantName.includes("amazon") ||
		merchantName.includes("walmart") ||
		merchantName.includes("target")
	)
		return "Shopping";

	if (
		merchantName.includes("chevron") ||
		merchantName.includes("shell") ||
		merchantName.includes("costco gas")
	)
		return "Transportation";

	return "Uncategorized";
}
