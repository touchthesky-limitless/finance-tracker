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
		const hasDescription = rowValues.some((v) => v.includes("description"));

		if (hasDate && hasAmount && hasDescription) {
			headerIndex = i;
			headers = rowValues;
			break;
		}
	}

	if (headerIndex === -1) throw new Error("Could not find header row.");

	// 2. MAPPING INDICES
	// Prefer "posted date", fallback to any column containing "date"
	let dateIdx = headers.findIndex((h) => h === "posted date");
	if (dateIdx === -1) dateIdx = headers.findIndex((h) => h.includes("date"));

	const amountIdx = headers.findIndex((h) => h === "amount");
	const descriptionIdx = headers.findIndex((h) => h === "description");
	const accountIdx = headers.findIndex((h) => h === "account name");

	// Prioritize "Detailed Category" > "Primary Category" > any category
	const detailedCategoryIdx = headers.findIndex(
		(h) => h === "detailed category",
	);
	const primaryCategoryIdx = headers.findIndex((h) => h === "primary category");
	const categoryIdx = headers.findIndex((h) => h.includes("category"));

	const effectiveCategoryIdx =
		detailedCategoryIdx !== -1
			? detailedCategoryIdx
			: primaryCategoryIdx !== -1
				? primaryCategoryIdx
				: categoryIdx;

	// 3. ROW PARSING
	for (let i = headerIndex + 1; i < lines.length; i++) {
		const cols = lines[i]
			.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
			.map((c) => c.replace(/^"|"$/g, "").trim());

		if (cols.length < 3) continue;

		const rawDescription = descriptionIdx !== -1 ? cols[descriptionIdx] : "";
		const merchantValue =
			rawDescription.replace(/\s+/g, " ").trim() || "Unknown Merchant";

		const amountRaw = cols[amountIdx]?.replace(/[$,\s]/g, "") || "0";
		const amount = parseFloat(amountRaw);

		const date = dateIdx !== -1 ? cols[dateIdx] : "";
		const rawCatInput =
			effectiveCategoryIdx !== -1 ? cols[effectiveCategoryIdx] : "";

		// Use the CSV Account Name if available, otherwise fallback to the filename
		const accountName =
			accountIdx !== -1 && cols[accountIdx]
				? cols[accountIdx]
				: baseAccountName;

		const finalCategory = resolveToParent(rawCatInput, merchantValue);

		if (date && !isNaN(amount)) {
			transactions.push({
				id: crypto.randomUUID(),
				date,
				merchant: merchantValue,
				description: "",
				amount, // Centralized CSVs generally have accurate positive/negative values natively
				account: accountName,
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
