import { Transaction } from "@/store/createBudgetStore";

export function parseBankCSV(
	csvText: string,
	baseAccountName: string,
): Transaction[] {
	console.log("--- Starting Robust Parse ---");
	const lines = csvText
		.split("\n")
		.map((l) => l.trim())
		.filter((l) => l.length > 0);
	const transactions: Transaction[] = [];

	// 1. FIND THE HEADER ROW (The "Scoring" Method)
	let headerIndex = -1;
	let headers: string[] = [];

	for (let i = 0; i < Math.min(lines.length, 20); i++) {
		// We use a regex split to handle "Quoted,Headers" safely
		const rowValues = lines[i]
			.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
			.map((val) => val.replace(/^"|"$/g, "").trim().toLowerCase());

		const hasDate = rowValues.some((v) => v.includes("date"));
		const hasAmount = rowValues.some((v) => v.includes("amount"));
		const hasDesc = rowValues.some(
			(v) =>
				v.includes("description") ||
				v.includes("payee") ||
				v.includes("merchant"),
		);

		if (hasDate && hasAmount && hasDesc) {
			headerIndex = i;
			headers = rowValues; // Save the cleaned headers
			console.log(`FOUND HEADER at Row ${i}:`, headers);
			break;
		}
	}

	if (headerIndex === -1) {
		throw new Error(
			"Could not find a header row. Ensure your CSV has 'Date', 'Amount', and 'Description' columns.",
		);
	}

	// 2. MAP COLUMNS
	const transDateIdx = headers.findIndex(
		(h) => h.includes("trans. date") || h.includes("transaction date"),
	);
	const postDateIdx = headers.findIndex(
		(h) => h.includes("posting date") || h.includes("post date"),
	);
	const dateIdx =
		transDateIdx !== -1
			? transDateIdx
			: postDateIdx !== -1
				? postDateIdx
				: headers.findIndex((h) => h === "date"); // Fallback for simple "Date" header

	const descIdx = headers.findIndex(
		(h) => h === "description" || h.includes("merchant") || h.includes("payee"),
	);

	const amountIdx = headers.findIndex((h) => h === "amount");
	if (dateIdx === -1 || descIdx === -1 || amountIdx === -1) {
		throw new Error(
			"Missing required columns. Please check that your file contains Date, Description, and Amount.",
		);
	}

	// Category Priority: Merchant Category -> Category -> Any "category"
	let categoryIdx = headers.findIndex((h) => h === "merchant category");
	if (categoryIdx === -1) {
		categoryIdx = headers.findIndex((h) => h === "category");
	}
	if (categoryIdx === -1) {
		categoryIdx = headers.findIndex((h) => h.includes("category"));
	}

	console.log(`Selected Category Column Index: ${categoryIdx}`);

	// Account Number Column
	const accNumIdx = headers.findIndex(
		(h) => h.includes("account") || h.includes("card number") || h === "card",
	);

	// --- NEW: Transaction Type Column (for Sign Flipping) ---
	// BofA often has a column "Transaction Type" with "Debit" or "Credit"
	const typeIdx = headers.findIndex(
		(h) => h.includes("type") || h.includes("cr/dr"),
	);

	console.log(
		`MAPPED INDICES: Date=${dateIdx}, Desc=${descIdx}, Amount=${amountIdx}, AccNum=${accNumIdx}, Type=${typeIdx}`,
	);

	// 3. PARSE ROWS
	for (let i = headerIndex + 1; i < lines.length; i++) {
		const cols = lines[i]
			.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
			.map((c) => c.replace(/^"|"$/g, "").trim());

		if (cols.length < 3) continue;

		const date = cols[dateIdx];
		const description = cols[descIdx];

		const amountRaw = cols[amountIdx]?.replace(/[$,\s]/g, "");
		let amount = parseFloat(amountRaw);

		// --- SIGN FIX LOGIC ---
		if (typeIdx !== -1 && cols[typeIdx]) {
			const type = cols[typeIdx].toUpperCase();
			// If BofA says "Debit", force it negative
			if (type === "D" || type === "DEBIT") {
				amount = -Math.abs(amount);
			}
			// If BofA says "Credit", force it positive
			else if (type === "C" || type === "CREDIT") {
				amount = Math.abs(amount);
			}
		}
		// ----------------------

		// Account Name Logic
		let accountLabel = baseAccountName;
		if (accNumIdx !== -1 && cols[accNumIdx]) {
			const matches = cols[accNumIdx].match(/\d{4}/);
			if (matches) {
				accountLabel = `${baseAccountName} ${matches[0]}`;
			}
		}

		if (date && description && !isNaN(amount)) {
			transactions.push({
				id: crypto.randomUUID(),
				date,
				description,
				amount,
				account: accountLabel,
				category: categoryIdx !== -1 ? cols[categoryIdx] : "Uncategorized",
			});
		}
	}

	return transactions;
}
