import { CATEGORY_HIERARCHY } from "@/constants/categories";

export const EXTERNAL_TO_PARENT_MAP: Record<string, string> = {
	// Debt payments
	"": "Debt payments",

	// Food & drink
	"EATING PLACES, RESTAURANTS": "Food & drink",
	"EXPRESS PAYMENT SERVICE MERCHANTS--FAST FOOD": "Food & drink",
	"Fast Food": "Food & drink",
	"Food & Drink": "Food & drink",
	"GROCERY STORES, SUPERMARKETS": "Food & drink",
	"Groceries": "Food & drink",
	"Restaurants & Dining": "Food & drink",
	"WHOLESALE CLUBS": "Food & drink",

	// Health & wellness
	"BEAUTY SHOPS AND BARBER SHOPS": "Health & wellness",
	"Health & Wellness": "Health & wellness",
	"DENTISTS, ORTHODONTISTS": "Health & wellness",
	"DOCTORS AND PHYSICIANS - NOT ELSEWHERE CLASSI": "Health & wellness",
	"MEDICAL SERVICES & HEALTH PRACTITIONERS NOT E": "Health & wellness",

	// Housing & utilities
	"Bills & Utilities": "Housing & utilities",
	"GOVERNMENT SERVICES-NOT ELSEWHERE CLASSIFIED": "Housing & utilities",
	"HOME SUPPLY WAREHOUSE": "Housing & utilities",
	"Internet & Cable": "Housing & utilities",
	"Repair & Maintenance": "Housing & utilities",
	"TELECOMMUNICATION EQUIPMENT AND TELEPHONE SAL": "Housing & utilities",
	"UTILITIES-GAS, WATER, SANITARY , ELECTRIC": "Housing & utilities",
	"Utility": "Housing & utilities",

    // Entertainment
    "DIGITAL GOODS - GAMES": "Entertainment",

	// Income
	"Fees & Adjustments": "Income",

	// Insurance
	"INSURANCE-SALES & UNDERWRITING": "Insurance",

	// Shopping
	"DEPARTMENT STORES": "Shopping",
	"ELECTRONICS STORE": "Shopping",
	"Merchandise & Inventory": "Shopping",
	"MISCELLANEOUS AND SPECIALTY RETAIL STORES": "Shopping",
	"Office & Shipping": "Shopping",
	"Shopping": "Shopping",
	"STATIONARY, OFFICE AND SCHOOL SUPPLY STORES": "Shopping",

	// Transportation
	"AUTOMATED FUEL DISPENSERS": "Transportation",
	"Automotive": "Transportation",
	"Gas": "Transportation",
	"Gasoline": "Transportation",

	// Add more as you find them in your bank CSVs
};

export function resolveToParent(externalCategory: string, description: string = ""): string {
    const desc = description.toLowerCase();
    const extCat = (externalCategory || "").toLowerCase();

    // --- STEP 1: U.S. BANK MCC CODES (Found in Memo/Category column) ---
    // These 4-digit codes are the most accurate way to map U.S. Bank

    // Debt payments
	if (extCat.includes("00300")) return "Debt payments"; // Credit Card Payment

    // Education
    if (extCat.includes("08211") || extCat.includes("08220") || extCat.includes("08299")) return "Education"; // Schools, Colleges, Correspondence

    // Entertainment
    if (extCat.includes("07832")) return "Entertainment"; // Motion Picture Theaters
    if (extCat.includes("07922") || extCat.includes("07994")) return "Entertainment"; // Theatrical Producers, Video Game Arcades

    // Food & drink
    if (extCat.includes("05814") || extCat.includes("05812")) return "Food & drink"; // Fast Food, Restaurants
    if (extCat.includes("05411") || extCat.includes("05499")) return "Food & drink"; // Groceries, Misc Food Stores
    if (extCat.includes("05813")) return "Food & drink";                             // Bars, Taverns, Nightclubs

    // Government & charity
	if (extCat.includes("09399")) return "Government & charity"; // DPS/DMV

    // Health & wellness
    if (extCat.includes("08011") || extCat.includes("08021") || extCat.includes("08099")) return "Health & wellness"; // Doctors, Medical Services
    if (extCat.includes("07230") || extCat.includes("07298")) return "Health & wellness"; // Health/Beauty Spas
    if (extCat.includes("07991") || extCat.includes("07997")) return "Health & wellness"; // Gyms, Membership Clubs

    // Housing & utilities
    if (extCat.includes("04814") || extCat.includes("04812")) return "Housing & utilities"; // Telecom, Cell Phones
    if (extCat.includes("04900")) return "Housing & utilities";                             // Utilities (Electric, Gas, Water)
    if (extCat.includes("04899")) return "Housing & utilities";                             // Cable, Streaming Services
    if (extCat.includes("05200") || extCat.includes("05211")) return "Housing & utilities"; // Home Supply, Hardware

    // Income
    if (extCat.includes("06010") || extCat.includes("06011")) return "Income"; // Manual Cash Disbursements, ATM

    // Insurance
    if (extCat.includes("06300")) return "Insurance"; // Insurance Sales/Underwriting (State Farm)

    // Shopping
    if (extCat.includes("05311") || extCat.includes("05310")) return "Shopping"; // Department Stores
    if (extCat.includes("05300") || extCat.includes("05399")) return "Shopping"; // Wholesale Clubs, Misc Merch
    if (extCat.includes("05732") || extCat.includes("05045")) return "Shopping"; // Electronics, Software
    if (extCat.includes("05611") || extCat.includes("05621") || extCat.includes("05651")) return "Shopping"; // Clothing/Apparel
    if (extCat.includes("05912")) return "Shopping";                             // Drug Stores, Pharmacies
    if (extCat.includes("05942") || extCat.includes("05999")) return "Shopping"; // Books, Misc Specialty Retail
    if (extCat.includes("05699")) return "Shopping"; // Miscellaneous Apparel and Accessory Stores

    // Transportation
    if (extCat.includes("05542") || extCat.includes("05541")) return "Transportation"; // Fuel, Service Stations
    if (extCat.includes("04121") || extCat.includes("04789")) return "Transportation"; // Taxis, Rideshare (Uber/Lyft)
    if (extCat.includes("04111") || extCat.includes("04112")) return "Transportation"; // Commuter Transport, Passenger Railways
    if (extCat.includes("07523")) return "Transportation";                             // Parking Lots, Garages

    // --- STEP 2: DESCRIPTION KEYWORDS (Universal Fallback) ---
    // Useful for all banks when the category column is "Miscellaneous"
    if (desc.includes("starbuck") || desc.includes("mcdonald") || desc.includes("wingstop")) return "Food & drink";
    if (desc.includes("amazon") || desc.includes("walmart") || desc.includes("target")) return "Shopping";
    if (desc.includes("state farm") || desc.includes("geico") || desc.includes("progressive")) return "Insurance";
    if (desc.includes("costco gas") || desc.includes("chevron") || desc.includes("shell")) return "Transportation";

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
