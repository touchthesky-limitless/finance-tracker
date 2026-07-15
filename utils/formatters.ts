export const formatMoney = (amount: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

export const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
};

export const formatDateLong = (dateStr: string) => {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
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