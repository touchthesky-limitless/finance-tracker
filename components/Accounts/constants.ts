import type { LucideIcon } from "lucide-react";
import {
	ArrowDown,
	ArrowUp,
	Building2,
	Car,
	CircleDollarSign,
	CreditCard,
	Home,
	Landmark,
	LineChart,
	Sparkles,
	Upload,
} from "lucide-react";

import type {
	AccountKind,
	AccountRecord,
	ChartType,
	DateRange,
	Timeframe,
} from "@/components/Accounts/types";

export const DEFAULT_QUERY = {
	chartType: "performance" as ChartType,
	dateRange: "1M" as DateRange,
	timeframe: "month" as Timeframe,
};

export const DATE_RANGE_OPTIONS: ReadonlyArray<{
	value: DateRange;
	label: string;
}> = [
	{ value: "1M", label: "1 month" },
	{ value: "3M", label: "3 months" },
	{ value: "6M", label: "6 months" },
	{ value: "YTD", label: "Year to date" },
	{ value: "1Y", label: "1 year" },
	{ value: "ALL", label: "All time" },
];

export const MANUAL_ACCOUNT_OPTIONS: ReadonlyArray<{
	kind: AccountKind;
	label: string;
	section: "Asset" | "Liability";
	icon: LucideIcon;
}> = [
	{ kind: "cash", label: "Cash", section: "Asset", icon: CircleDollarSign },
	{ kind: "investment", label: "Investments", section: "Asset", icon: LineChart },
	{ kind: "real-estate", label: "Real Estate", section: "Asset", icon: Home },
	{ kind: "vehicle", label: "Vehicles", section: "Asset", icon: Car },
	{ kind: "valuable", label: "Valuables", section: "Asset", icon: Sparkles },
	{ kind: "other-asset", label: "Other Assets", section: "Asset", icon: ArrowUp },
	{ kind: "credit-card", label: "Credit Card", section: "Liability", icon: CreditCard },
	{ kind: "mortgage", label: "Mortgage", section: "Liability", icon: Home },
	{ kind: "loan", label: "Loans", section: "Liability", icon: Building2 },
	{
		kind: "other-liability",
		label: "Other Liabilities",
		section: "Liability",
		icon: ArrowDown,
	},
];

export const ADD_ACCOUNT_CATEGORIES: ReadonlyArray<{
	title: string;
	subtitle: string;
	icon: LucideIcon;
	badge?: string;
}> = [
	{
		title: "Banks & credit cards",
		subtitle: "10 added",
		icon: Landmark,
	},
	{
		title: "Investments & loans",
		subtitle: "0 added",
		icon: LineChart,
	},
	{
		title: "Real estate, crypto, and more",
		subtitle: "0 added",
		icon: Home,
	},
	{
		title: "Company equity",
		subtitle: "0 added",
		icon: CircleDollarSign,
		badge: "New",
	},
	{
		title: "Import transaction & balance history",
		subtitle: "Import from CSV",
		icon: Upload,
	},
];

export const GROUP_ORDER: AccountRecord["group"][] = [
	"Cash",
	"Investments",
	"Other Assets",
	"Credit Cards",
	"Loans",
];

export const LIABILITY_GROUPS = new Set<AccountRecord["group"]>([
	"Credit Cards",
	"Loans",
]);
