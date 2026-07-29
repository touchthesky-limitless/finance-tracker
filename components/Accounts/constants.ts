import {
	Banknote,
	Building2,
	Car,
	CreditCard,
	Gem,
	Home,
	Landmark,
	LineChart,
	Wallet,
	type LucideIcon,
} from "lucide-react";

import type {
	AccountKind,
	ChartType,
	DateRange,
	Timeframe,
} from "@/components/Accounts/types";

export const DATE_RANGE_OPTIONS = [
	{ value: "1M", label: "1 Month" },
	{ value: "3M", label: "3 Months" },
	{ value: "6M", label: "6 Months" },
	{ value: "1Y", label: "1 Year" },
	{ value: "YTD", label: "Year to Date" },
	{ value: "ALL", label: "All Time" },
];

export const ADD_ACCOUNT_CATEGORIES = [
	{
		title: "Personal accounts",
		subtitle: "Checking, savings, cash management",
		icon: Banknote,
	},
	{
		title: "Credit cards",
		subtitle: "Rewards, cash back, travel",
		icon: CreditCard,
		badge: "Popular",
	},
	{
		title: "Investments",
		subtitle: "Brokerage, retirement, crypto",
		icon: LineChart,
	},
	{
		title: "Mortgages & Loans",
		subtitle: "Auto, home, personal, student",
		icon: Building2,
	},
];

export const MANUAL_ACCOUNT_OPTIONS: Array<{
	kind: AccountKind;
	label: string;
	icon: LucideIcon;
	section: "Asset" | "Liability";
}> = [
	{ kind: "cash", label: "Cash", icon: Landmark, section: "Asset" },
	{
		kind: "investment",
		label: "Investments",
		icon: LineChart,
		section: "Asset",
	},
	{ kind: "real-estate", label: "Real Estate", icon: Home, section: "Asset" },
	{ kind: "vehicle", label: "Vehicles", icon: Car, section: "Asset" },
	{ kind: "valuable", label: "Valuables", icon: Gem, section: "Asset" },
	{
		kind: "other-asset",
		label: "Other Assets",
		icon: Wallet,
		section: "Asset",
	},
	{
		kind: "credit-card",
		label: "Credit Card",
		icon: CreditCard,
		section: "Liability",
	},
	{ kind: "mortgage", label: "Mortgage", icon: Home, section: "Liability" },
	{ kind: "loan", label: "Loans", icon: Building2, section: "Liability" },
	{
		kind: "other-liability",
		label: "Other Liabilities",
		icon: Wallet,
		section: "Liability",
	},
]

export const GROUP_ORDER = [
	"Cash",
	"Investments",
	"Real Estate",
	"Vehicles",
	"Valuables",
	"Other Assets",
	"Credit Cards",
	"Mortgage",
	"Loans",
	"Other Liabilities",
];

export const LIABILITY_GROUPS = new Set([
	"Credit Cards",
	"Loans",
	"Other Liabilities",
]);

export const DEFAULT_QUERY = {
	chartType: "performance" as ChartType,
	dateRange: "1M" as DateRange,
	timeframe: "month" as Timeframe,
};
