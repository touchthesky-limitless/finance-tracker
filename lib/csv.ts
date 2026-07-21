import { Transaction } from "@/store/useBudgetStore";
import { resolveToParent } from "@/lib/categoryMapper";

const CSV_SPLIT_REGEX = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;

const INVALID_DATE_VALUES = new Set([
	"",
	"/",
	"-",
	"--",
	"n/a",
	"na",
	"null",
	"undefined",
]);

function parseCsvRow(line: string): string[] {
	return line.split(CSV_SPLIT_REGEX).map((value) => {
		return value.replace(/^"|"$/g, "").replace(/""/g, '"').trim();
	});
}

function normalizeHeader(value: string): string {
	return value.trim().toLowerCase();
}

function isValidIsoDate(value: string): boolean {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
		return false;
	}

	const parsedDate = new Date(`${value}T00:00:00Z`);

	return (
		!Number.isNaN(parsedDate.getTime()) &&
		parsedDate.toISOString().slice(0, 10) === value
	);
}

function normalizeDateValue(value: string | undefined): string | null {
	const normalizedValue = value?.trim() ?? "";

	if (INVALID_DATE_VALUES.has(normalizedValue.toLowerCase())) {
		return null;
	}

	if (isValidIsoDate(normalizedValue)) {
		return normalizedValue;
	}

	const slashDateMatch = normalizedValue.match(
		/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
	);

	if (slashDateMatch) {
		const [, month, day, year] = slashDateMatch;

		const isoDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;

		return isValidIsoDate(isoDate) ? isoDate : null;
	}

	return null;
}

function resolveTransactionDate(
	postedDate: string | undefined,
	authorizedDate: string | undefined,
	fallbackDate: string | undefined,
): string | null {
	return (
		normalizeDateValue(postedDate) ??
		normalizeDateValue(authorizedDate) ??
		normalizeDateValue(fallbackDate)
	);
}

export function parseBankCSV(
	csvText: string,
	baseAccountName: string,
): Transaction[] {
	const lines = csvText
		.replace(/^\uFEFF/, "")
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean);

	if (lines.length === 0) {
		return [];
	}

	let headerIndex = -1;
	let headers: string[] = [];

	const headerSearchLimit = Math.min(lines.length, 20);

	for (let index = 0; index < headerSearchLimit; index++) {
		const rowValues = parseCsvRow(lines[index]).map(normalizeHeader);

		const hasDate = rowValues.some((value) => value.includes("date"));

		const hasAmount = rowValues.some((value) => value === "amount");

		const hasDescription = rowValues.some(
			(value) => value === "description" || value === "merchant",
		);

		if (hasDate && hasAmount && hasDescription) {
			headerIndex = index;
			headers = rowValues;
			break;
		}
	}

	if (headerIndex === -1) {
		throw new Error("Could not find a valid CSV header row.");
	}

	const postedDateIdx = headers.findIndex((header) => header === "posted date");

	const authorizedDateIdx = headers.findIndex(
		(header) => header === "authorized date",
	);

	const fallbackDateIdx = headers.findIndex((header) =>
		header.includes("date"),
	);

	const amountIdx = headers.findIndex((header) => header === "amount");

	const descriptionIdx = headers.findIndex(
		(header) => header === "description" || header === "merchant",
	);

	const accountIdx = headers.findIndex((header) => header === "account name");

	const detailedCategoryIdx = headers.findIndex(
		(header) => header === "detailed category",
	);

	const primaryCategoryIdx = headers.findIndex(
		(header) => header === "primary category",
	);

	const genericCategoryIdx = headers.findIndex((header) =>
		header.includes("category"),
	);

	if (amountIdx === -1) {
		throw new Error('CSV is missing an "Amount" column.');
	}

	if (descriptionIdx === -1) {
		throw new Error('CSV is missing a "Description" or "Merchant" column.');
	}

	const effectiveCategoryIdx =
		detailedCategoryIdx !== -1
			? detailedCategoryIdx
			: primaryCategoryIdx !== -1
				? primaryCategoryIdx
				: genericCategoryIdx;

	const transactions: Transaction[] = [];

	for (let index = headerIndex + 1; index < lines.length; index++) {
		const columns = parseCsvRow(lines[index]);

		if (columns.length < 3) {
			continue;
		}

		const rawDescription = columns[descriptionIdx] ?? "";

		const merchantValue =
			rawDescription.replace(/\s+/g, " ").trim() || "Unknown Merchant";

		const amountRaw =
			columns[amountIdx]?.replace(/[$,\s]/g, "").replace(/^\((.*)\)$/, "-$1") ??
			"";

		const amount = Number(amountRaw);

		if (!Number.isFinite(amount)) {
			console.warn(
				`Skipping CSV row ${index + 1}: invalid amount "${columns[amountIdx]}"`,
			);

			continue;
		}

		const date = resolveTransactionDate(
			postedDateIdx !== -1 ? columns[postedDateIdx] : undefined,

			authorizedDateIdx !== -1 ? columns[authorizedDateIdx] : undefined,

			fallbackDateIdx !== -1 ? columns[fallbackDateIdx] : undefined,
		);

		if (!date) {
			console.warn(`Skipping CSV row ${index + 1}: no valid transaction date`);

			continue;
		}

		const rawCategoryInput =
			effectiveCategoryIdx !== -1 ? (columns[effectiveCategoryIdx] ?? "") : "";

		const accountName =
			accountIdx !== -1 && columns[accountIdx]?.trim()
				? columns[accountIdx].trim()
				: baseAccountName.trim() || "Unknown Account";

		const finalCategory = resolveToParent(rawCategoryInput, merchantValue);

		transactions.push({
			id: crypto.randomUUID(),
			date,
			merchant: merchantValue,
			description: rawDescription,
			amount,
			account: accountName,
			category: finalCategory,
			needs_review: finalCategory === "Uncategorized",
			needs_subcat:
				finalCategory !== "Uncategorized" && finalCategory !== "Debt payments",
		});
	}

	return transactions;
}
