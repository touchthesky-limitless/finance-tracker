export const formatMoney = (amount: number) =>
	new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
		amount,
	);

export const formatDate = (dateStr: string) => {
	const d = new Date(dateStr);
	return isNaN(d.getTime())
		? dateStr
		: d.toLocaleDateString("en-US", {
				month: "short",
				day: "numeric",
				year: "2-digit",
			});
};

export const formatDateLong = (dateStr: string) => {
	const d = new Date(dateStr);
	return isNaN(d.getTime())
		? dateStr
		: d.toLocaleDateString("en-US", {
				month: "long",
				day: "numeric",
				year: "numeric",
			});
};

// 1000 -> 1,000
export const formatThousandWithCommas = (val: string | number) => {
	if (val === undefined || val === null || val === "") return "";
	const str = val.toString().replace(/[^0-9.]/g, "");
	const parts = str.split(".");
	parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
	return parts.join(".");
};

export const formatCurrency = (num: number) => {
	if (isNaN(num) || num === undefined) {
		return "$0.00";
	}
	const sign = num < 0 ? "-" : "";
	const absNum = Math.abs(num);
	return `${sign}$${absNum.toLocaleString("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})}`;
};

export const formatCompact = (num: number) => {
	if (isNaN(num) || num === undefined) {
		return "$0k";
	}
	const sign = num < 0 ? "-" : "";
	const absNum = Math.abs(num);
	return `${sign}$${(absNum / 1000).toFixed(1)}k`;
};

export const formatYAxis = (num: number) => {
	if (num === 0) {
		return "0";
	}
	const sign = num < 0 ? "-" : "";
	const absNum = Math.abs(num);

	if (absNum >= 1000) {
		return `${sign}$${Math.round(absNum / 1000)}k`;
	}
	return `${sign}$${Math.round(absNum)}`;
};

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

export const YEARS: number[] = [];
for (let i = 0; i < 3; i++) {
	YEARS.push(CURRENT_YEAR - 2 + i);
}

export const parseAmountInput = (rawValue: string) => {
	// 1. Strip everything except numbers and decimals
	let cleanStr = rawValue.replace(/[^0-9.]/g, "");

	// 2. Handle starting with a decimal
	if (cleanStr.startsWith(".")) {
		cleanStr = "0" + cleanStr;
	}

	const parts = cleanStr.split(".");

	// 3. Prevent multiple decimals
	if (parts.length > 2) {
		cleanStr = parts[0] + "." + parts.slice(1).join("");
	}

	// 4. Strictly limit to 2 decimal places
	if (parts.length > 1 && parts[1].length > 2) {
		cleanStr = `${parts[0]}.${parts[1].substring(0, 2)}`;
	}

	// 5. Remove leading zeros (e.g., 05 becomes 5) unless it's "0."
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

	// 6. Format with commas for the visual UI display
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
};

export const getInitialDisplayAmount = (amount: number): string => {
    const absVal = Math.abs(amount);
    if (absVal === 0) return "";
    
    const parts = absVal.toString().split(".");
    const whole = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    
    return parts.length > 1 ? `${whole}.${parts[1]}` : whole;
};