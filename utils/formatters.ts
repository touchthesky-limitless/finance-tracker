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

// 2. Convert all 1-line arrow functions to explicit blocks
export function formatMoney(amount: number) {
	return moneyFormatter.format(amount);
}

export function formatDate(dateStr: string) {
	const d = new Date(dateStr);
	if (isNaN(d.getTime())) {
		return dateStr;
	}
	return shortDateFormatter.format(d);
}

export function formatDateLong(dateStr: string) {
	const d = new Date(dateStr);
	if (isNaN(d.getTime())) {
		return dateStr;
	}
	return longDateFormatter.format(d);
}

export function formatThousandWithCommas(val: string | number) {
	if (val === undefined || val === null || val === "") {
		return "";
	}
	const str = val.toString().replace(/[^0-9.]/g, "");
	const parts = str.split(".");
	parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
	return parts.join(".");
}

export function formatCurrency(num: number) {
	if (isNaN(num) || num === undefined) {
		return "$0.00";
	}
	const sign = num < 0 ? "-" : "";
	const absNum = Math.abs(num);
	return `${sign}$${numberFormatter.format(absNum)}`;
}

export function formatCompact(num: number) {
	if (isNaN(num) || num === undefined) {
		return "$0k";
	}
	const sign = num < 0 ? "-" : "";
	const absNum = Math.abs(num);
	return `${sign}${(absNum / 1000).toFixed(1)}k`;
}

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

export const CURRENT_YEAR = new Date().getFullYear();
export const DEFAULT_YEAR_FILTER = `Year ${CURRENT_YEAR}`;

export const TIME_PRESETS = {
	TODAY: "Today",
	THIS_WEEK: "This Week",
	THIS_MONTH: "This Month",
	THIS_YEAR: "This Year",
	LAST_MONTH: "Last Month",
	LAST_12_MONTHS: "Last 12 Months",
} as const;

// Explicit loop block
export const YEARS: number[] = [];
for (let i = 0; i < 3; i++) {
	YEARS.push(CURRENT_YEAR - 2 + i);
}

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

export function getInitialDisplayAmount(amount: number) {
	const absVal = Math.abs(amount);
	if (absVal === 0) {
		return "";
	}

	const parts = absVal.toString().split(".");
	const whole = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");

	return parts.length > 1 ? `${whole}.${parts[1]}` : whole;
}
