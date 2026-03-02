import { CATEGORY_HIERARCHY } from "@/constants/categories";

export const EXTERNAL_TO_PARENT_MAP: Record<string, string> = {
	// Debt payments

	// Food & drink
	"Fast Food": "Food & drink",
	"Food & Drink": "Food & drink",
	"Groceries": "Food & drink",
	"Restaurants & Dining": "Food & drink",

	// Health & wellness
	"Health & Wellness": "Health & wellness",

	// Housing & utilities
	"Bills & Utilities": "Housing & utilities",
	"Internet & Cable": "Housing & utilities",
	"Repair & Maintenance": "Housing & utilities",
	"Utility": "Housing & utilities",

	// Entertainment

	// Income
	"Fees & Adjustments": "Income",

	// Insurance

	// Shopping
	"Merchandise & Inventory": "Shopping",
	"Office & Shipping": "Shopping",
	"Shopping": "Shopping",

	// Transportation
	"Automotive": "Transportation",
	"Gas": "Transportation",
	"Gasoline": "Transportation",

	// Add more as you find them in your bank CSVs
};

export function resolveToParent(
	externalCategory: string,
	merchant: string = "",
	type: string = "",
): string {
	const merchantName = merchant.toLowerCase();
	const extCat = (externalCategory || "").toLowerCase();
	const transactionType = (type || "").toLowerCase();

	// --- STEP 0: EXPLICIT PAYMENT CHECK (For Chase & BofA) ---
	// If the Type is 'Payment' or the Merchant contains 'Payment' or 'Thank You'
	if (
		transactionType === "payment" ||
		merchantName.includes("payment") ||
		merchantName.includes("thank you")
	) {
		return "Debt payments";
	}

	// Helper to check for 4 or 5 digit MCC codes
	const hasMCC = (code: string) =>
		extCat.includes(code) || extCat.includes(`0${code}`);

	// --- STEP 1: U.S. BANK MCC CODES (Found in Memo/Category column) ---
	// STEP 1: MCC CODE MAPPING (BofA 4-digit & US Bank 5-digit) ---

	// Bank fees
	if (hasMCC("0000")) return "Bank fees"; // Annual Card Fee

	// Debt payments
	if (hasMCC("0300")) return "Debt payments"; // Credit Card Payment

	// Education
	if (hasMCC("8211") || hasMCC("8220") || hasMCC("8299")) return "Education"; // Schools, Colleges, Correspondence

	// Entertainment
	if (hasMCC("5816")) return "Entertainment"; // DIGITAL GOODS - GAMES
	if (hasMCC("7832")) return "Entertainment"; // Motion Picture Theaters
	if (hasMCC("7922") || hasMCC("7994")) return "Entertainment"; // Theatrical Producers, Video Game Arcades

	// Food & drink
	if (hasMCC("5814") || hasMCC("5812")) return "Food & drink"; // Fast Food, Restaurants
	if (hasMCC("5411") || hasMCC("5499")) return "Food & drink"; // Groceries, Misc Food Stores
	if (hasMCC("5813")) return "Food & drink"; // Bars, Taverns, Nightclubs

	// Government & charity
	if (hasMCC("9399")) return "Government & charity"; // DPS/DMV

	// Health & wellness
	if (hasMCC("8011") || hasMCC("8021") || hasMCC("8099"))
		return "Health & wellness"; // Doctors, Medical Services
	if (hasMCC("7230") || hasMCC("7298")) return "Health & wellness"; // Health/Beauty Spas
	if (hasMCC("7991") || hasMCC("7997")) return "Health & wellness"; // Gyms, Membership Clubs

	// Housing & utilities
	if (hasMCC("4814") || hasMCC("4812")) return "Housing & utilities"; // Telecom, Cell Phones
	if (hasMCC("4900")) return "Housing & utilities"; // Utilities (Electric, Gas, Water)
	if (hasMCC("4899")) return "Housing & utilities"; // Cable, Streaming Services
	if (hasMCC("5200") || hasMCC("5211")) return "Housing & utilities"; // Home Supply, Hardware

	// Income
	if (hasMCC("6010") || hasMCC("6011")) return "Income"; // Manual Cash Disbursements, ATM

	// Insurance
	if (hasMCC("6300")) return "Insurance"; // Insurance Sales/Underwriting (State Farm)

	// Shopping
	if (hasMCC("5311") || hasMCC("5310")) return "Shopping"; // Department Stores
	if (hasMCC("5300") || hasMCC("5399")) return "Shopping"; // Wholesale Clubs, Misc Merch
	if (hasMCC("5732") || hasMCC("5045")) return "Shopping"; // Electronics, Software
	if (hasMCC("5611") || hasMCC("5621") || hasMCC("5651")) return "Shopping"; // Clothing/Apparel
	if (hasMCC("5912")) return "Shopping"; // Drug Stores, Pharmacies
	if (hasMCC("5943")) return "Shopping"; // Office Supply
	if (hasMCC("5942") || hasMCC("5999")) return "Shopping"; // Books, Misc Specialty Retail
	if (hasMCC("5699")) return "Shopping"; // Miscellaneous Apparel and Accessory Stores

	// Transportation
	if (hasMCC("5542") || hasMCC("5541")) return "Transportation"; // Fuel, Service Stations
	if (hasMCC("4121") || hasMCC("4789")) return "Transportation"; // Taxis, Rideshare (Uber/Lyft)
	if (hasMCC("4111") || hasMCC("4112")) return "Transportation"; // Commuter Transport, Passenger Railways
	if (hasMCC("7523")) return "Transportation"; // Parking Lots, Garages

	// --- STEP 2: DESCRIPTION KEYWORDS (Universal Fallback) ---
	// Useful for all banks when the category column is "Miscellaneous"
	if (
		merchantName.includes("starbuck") ||
		merchantName.includes("mcdonald") ||
		merchantName.includes("wingstop")
	)
		return "Food & drink";
	if (
		merchantName.includes("amazon") ||
		merchantName.includes("walmart") ||
		merchantName.includes("target")
	)
		return "Shopping";
	if (
		merchantName.includes("state farm") ||
		merchantName.includes("geico") ||
		merchantName.includes("progressive")
	)
		return "Insurance";
	if (
		merchantName.includes("costco gas") ||
		merchantName.includes("chevron") ||
		merchantName.includes("shell")
	)
		return "Transportation";

	// --- STEP 3: BofA & CHASE MAPPING TABLE ---
	// If the category matches a known string from your existing map
	if (EXTERNAL_TO_PARENT_MAP[externalCategory]) {
		return EXTERNAL_TO_PARENT_MAP[externalCategory];
	}

	// --- STEP 4: INTERNAL VALIDATION ---
	// If it's already a valid category in your system, return it as is
	const allInternalCategories = [
		...Object.keys(CATEGORY_HIERARCHY),
		...Object.values(CATEGORY_HIERARCHY).flat(),
	];

	if (allInternalCategories.includes(externalCategory)) {
		return externalCategory;
	}

	// 3. Fallback
	return "Uncategorized";
}
