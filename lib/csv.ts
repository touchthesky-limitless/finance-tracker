import { Transaction } from "@/store/useBudgetStore";
import { resolveToParent } from "@/lib/categoryMapper";

export function parseBankCSV(
	csvText: string,
	baseAccountName: string,
): Transaction[] {
	const lines = csvText
		.split("\n")
		.map((l) => l.trim())
		.filter((l) => l.length > 0);
	const transactions: Transaction[] = [];

	// 1. FIND HEADER
	let headerIndex = -1;
	let headers: string[] = [];

	for (let i = 0; i < Math.min(lines.length, 20); i++) {
		const rowValues = lines[i]
			.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
			.map((val) => val.replace(/^"|"$/g, "").trim().toLowerCase());

		const hasDate = rowValues.some((v) => v.includes("date"));
		const hasAmount = rowValues.some((v) => v.includes("amount"));
		const hasMerchant = rowValues.some(
			(v) =>
				v.includes("description") ||
				v.includes("payee") ||
				v.includes("merchant") ||
				v === "name",
		);

		if (hasDate && hasAmount && hasMerchant) {
			headerIndex = i;
			headers = rowValues;
			break;
		}
	}

	if (headerIndex === -1) throw new Error("Could not find header row.");

	// 2. MAPPING INDICES
	const dateIdx = headers.findIndex((h) => h.includes("date"));
	const amountIdx = headers.findIndex((h) => h === "amount");

	// BofA Specifics
	const mccIdx = headers.findIndex((h) => h === "mcc");
	const categoryIdx = headers.findIndex(
		(h) =>
			h === "merchant category" || h === "category" || h.includes("category"),
	);
	const typeIdx = headers.findIndex(
		(h) => h.includes("type") || h.includes("cr/dr"),
	);

	const merchantIdx = headers.findIndex(
		(h) =>
			h === "description" ||
			h === "merchant" ||
			h === "payee" ||
			h === "name" ||
			h.includes("merchant name"),
	);

	const memoIdx = headers.findIndex(
		(h) => h === "memo" || h.includes("original description"),
	);
	// If there is no explicit "Category" column, we use the Memo index as the category source
	const effectiveCategoryIdx = categoryIdx !== -1 ? categoryIdx : memoIdx;

	// 3. ROW PARSING
	for (let i = headerIndex + 1; i < lines.length; i++) {
		const cols = lines[i]
			.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
			.map((c) => c.replace(/^"|"$/g, "").trim());

		if (cols.length < 3) continue;

		const rawMerchant = cols[merchantIdx] || "";
		const merchantValue =
			rawMerchant.replace(/\s+/g, " ").trim() || "Unknown Merchant";

		const amountRaw = cols[amountIdx]?.replace(/[$,\s]/g, "") || "0";
		let amount = parseFloat(amountRaw);

		// --- GLOBAL SIGN LOGIC (BofA, Chase, US Bank) ---
		const type = typeIdx !== -1 ? cols[typeIdx].toUpperCase() : "";
		const merchantLower = merchantValue.toLowerCase();

		// 1. If it's a known 'Payment' or 'Credit', it's money leaving your bank to the card.
		// We force it to be NEGATIVE so it shows as an outflow.
		if (
			type === "PAYMENT" ||
			type === "CREDIT" ||
			type === "C" ||
			merchantLower.includes("payment thank you") ||
			merchantLower.includes("automatic payment")
		) {
			amount = -Math.abs(amount);
		}

		// 2. If it's a 'Debit' or 'Sale', it's a standard expense.
		// We force it to be NEGATIVE.
		else if (type === "DEBIT" || type === "D" || type === "SALE") {
			amount = -Math.abs(amount);
		}

		// 3. Fallback: If no type is found, we assume the CSV sign is correct.
		// ------------------------------------------------

		const date = cols[dateIdx] || "";

		// ✨ US BANK FIX:
		// If we are using the Memo column as the category, it contains the MCC (e.g., "00300")
		const rawType = typeIdx !== -1 ? cols[typeIdx] : "";
		const rawCatInput =
			effectiveCategoryIdx !== -1 ? cols[effectiveCategoryIdx] : "";
		const rawMcc = mccIdx !== -1 ? cols[mccIdx] : "";

		// Combine Category Text and MCC (e.g., "EATING PLACES 5812")
		// This allows resolveToParent to find the 4-digit code OR the string
		const combinedCategoryInput =
			`${rawCatInput} ${rawMcc}`.trim() || "Uncategorized";

		const finalCategory = resolveToParent(
			combinedCategoryInput,
			merchantValue,
			rawType,
		);

		if (date && !isNaN(amount)) {
			transactions.push({
				id: crypto.randomUUID(),
				date,
				merchant: merchantValue,
				description: memoIdx !== -1 ? cols[memoIdx] : "",
				amount,
				account: baseAccountName,
				category: finalCategory,
				needs_review: finalCategory === "Uncategorized",
				needs_subcat:
					finalCategory !== "Uncategorized" &&
					finalCategory !== "Debt payments",
			});
		}
	}

	return transactions;
}
