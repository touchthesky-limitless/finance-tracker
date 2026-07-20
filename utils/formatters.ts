// 1. Cache the expensive Intl objects globally
const moneyFormatter = new Intl.NumberFormat("en-US", {
	style: "currency",
	currency: "USD",
});

const numberFormatter = new Intl.NumberFormat("en-US", {
	minimumFractionDigits: 2,
	maximumFractionDigits: 2,
});

const shortDateFormatter = new Intl.DateTimeFormat("en-US", {
	month: "short",
	day: "numeric",
	year: "2-digit",
});

const longDateFormatter = new Intl.DateTimeFormat("en-US", {
	month: "long",
	day: "numeric",
	year: "numeric",
});

/**
 * Formats a number as a standard US dollar currency string with commas and decimals.
 * @example
 * formatMoney(1540.6) // "$1,540.60"
 */
export function formatMoney(amount: number) {
	return moneyFormatter.format(amount);
}

/**
 * Converts a date string into a short date format (Month Day, 2-digit Year).
 * @example
 * formatDate("2026-07-19") // "Jul 19, 26"
 */
export function formatDate(dateStr: string) {
	const d = new Date(dateStr);
	if (isNaN(d.getTime())) {
		return dateStr;
	}
	return shortDateFormatter.format(d);
}

/**
 * Converts a date string into a long date format (Full Month Day, Full Year).
 * @example
 * formatDateLong("2026-07-19") // "July 19, 2026"
 */
export function formatDateLong(dateStr: string) {
	const d = new Date(dateStr);
	if (isNaN(d.getTime())) {
		return dateStr;
	}
	return longDateFormatter.format(d);
}

/**
 * Strips non-numeric characters and formats a number or string with thousands separators. No dollar sign.
 * @example
 * formatThousandWithCommas("1540.61") // "1,540.61"
 */
export function formatThousandWithCommas(val: string | number) {
	if (val === undefined || val === null || val === "") {
		return "";
	}
	const str = val.toString().replace(/[^0-9.]/g, "");
	const parts = str.split(".");
	parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
	return parts.join(".");
}

/**
 * Formats a number to USD with commas and exactly 2 decimal places.
 * Always returns a positive number (strips negative signs).
 * @example
 * formatCurrency(-1540.61) // "$1,540.61"
 */
export function formatCurrency(num: number) {
	if (isNaN(num) || num === undefined) {
		return "$0.00";
	}
	// Remove the sign logic to ensure numbers are always positive
	const absNum = Math.abs(num);
	return `$${numberFormatter.format(absNum)}`;
}

/**
 * Conditionally formats values for charts.
 * Numbers over 1,000 get a "k" suffix with 1 decimal. Numbers under 1,000 have no decimals. Keeps negative signs.
 * @example
 * formatChartValue(1540) // "$1.5k"
 * formatChartValue(850.5) // "$851"
 */
export const formatChartValue = (value: number) => {
	const isNegative = value < 0;
	const absValue = Math.abs(value);

	if (absValue >= 1000) {
		const formatted = (absValue / 1000).toFixed(1).replace(/\.0$/, "");
		return `${isNegative ? "-" : ""}$${formatted}k`;
	}

	return `${isNegative ? "-" : ""}$${absValue.toFixed(0)}`;
};

/**
 * Always converts numbers to a "k" format with 1 decimal, regardless of size. Keeps negative signs.
 * @example
 * formatCompact(1540) // "$1.5k"
 * formatCompact(500) // "$0.5k"
 */
export function formatCompact(num: number) {
	if (isNaN(num) || num === undefined) {
		return "$0k";
	}
	const sign = num < 0 ? "-" : "";
	const absNum = Math.abs(num);
	return `${sign}${(absNum / 1000).toFixed(1)}k`;
}

/**
 * Rounds numbers to nearest whole "k" for large numbers, or nearest whole dollar for small numbers. Keeps negative signs.
 * @example
 * formatYAxis(1800) // "$2k"
 * formatYAxis(850) // "$850"
 */
export function formatYAxis(num: number) {
	if (num === 0) {
		return "0";
	}
	const sign = num < 0 ? "-" : "";
	const absNum = Math.abs(num);

	if (absNum >= 1000) {
		return `${sign}$${Math.round(absNum / 1000)}k`;
	}
	return `${sign}$${Math.round(absNum)}`;
}

// --- Date & Time Constants ---

/** Current calendar year */
export const CURRENT_YEAR = new Date().getFullYear();

/** Default filter string for the current year */
export const DEFAULT_YEAR_FILTER = `Year ${CURRENT_YEAR}`;

/** Standardized time range presets for dropdowns */
export const TIME_PRESETS = {
	TODAY: "Today",
	THIS_WEEK: "This Week",
	THIS_MONTH: "This Month",
	THIS_YEAR: "This Year",
	LAST_MONTH: "Last Month",
	LAST_12_MONTHS: "Last 12 Months",
} as const;

/**
 * Generates an array of the last 3 years (including current year).
 * @example
 * // If CURRENT_YEAR is 2026
 * // [2024, 2025, 2026]
 */
export const YEARS: number[] = [];
for (let i = 0; i < 3; i++) {
	YEARS.push(CURRENT_YEAR - 2 + i);
}

// --- Input Processing ---

/**
 * Built specifically for controlled input fields. Cleans raw user typing, adds commas dynamically,
 * and limits decimals to 2 places. Returns both a display string and raw number.
 * @example
 * parseAmountInput("1540.619")
 * // { displayString: "1,540.61", numericValue: 1540.61 }
 */
export function parseAmountInput(rawValue: string) {
	let cleanStr = rawValue.replace(/[^0-9.]/g, "");

	if (cleanStr.startsWith(".")) {
		cleanStr = "0" + cleanStr;
	}

	const parts = cleanStr.split(".");

	if (parts.length > 2) {
		cleanStr = parts[0] + "." + parts.slice(1).join("");
	}

	if (parts.length > 1 && parts[1].length > 2) {
		cleanStr = `${parts[0]}.${parts[1].substring(0, 2)}`;
	}

	if (
		cleanStr.length > 1 &&
		cleanStr.startsWith("0") &&
		!cleanStr.startsWith("0.")
	) {
		cleanStr = cleanStr.replace(/^0+/, "");
		if (cleanStr === "" || cleanStr.startsWith(".")) {
			cleanStr = "0" + cleanStr;
		}
	}

	const displayParts = cleanStr.split(".");
	const formattedWhole = displayParts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
	const displayString =
		displayParts.length > 1
			? `${formattedWhole}.${displayParts[1]}`
			: formattedWhole;

	return {
		displayString,
		numericValue: parseFloat(cleanStr) || 0,
	};
}

/**
 * Designed to prepopulate input fields. Takes a raw number and adds commas to the whole number part,
 * preserving exact decimals (ignores trailing zeros). Strips negative signs.
 * @example
 * getInitialDisplayAmount(-1540.6) // "1,540.6"
 */
export function getInitialDisplayAmount(amount: number) {
	const absVal = Math.abs(amount);
	if (absVal === 0) {
		return "";
	}

	const parts = absVal.toString().split(".");
	const whole = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");

	return parts.length > 1 ? `${whole}.${parts[1]}` : whole;
}

/**
 * Converts raw numbers (in millions) into Billions ("B") or Trillions ("T") with 2 decimal places.
 * @example
 * formatMarketCap(2500000) // "2.50T"
 * formatMarketCap(45000) // "45.00B"
 */
export function formatMarketCap(valueInMillions: number | undefined) {
	if (valueInMillions === undefined || !Number.isFinite(valueInMillions)) {
		return "N/A";
	}

	if (valueInMillions >= 1_000_000) {
		return (valueInMillions / 1_000_000).toFixed(2) + "T";
	} else {
		return (valueInMillions / 1_000).toFixed(2) + "B";
	}
}
