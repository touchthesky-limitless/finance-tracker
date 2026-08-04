import {
	LayoutDashboard,
	Receipt,
	ChartPie,
	WalletCards,
	Layers2,
	Repeat,
	RefreshCcw,
	LucideIcon,
	ListTree,
	Calculator,
	ChartCandlestick,
	PiggyBank,
	HandCoins,
	LandPlot,
	TrendingUp,
	Sparkles,
} from "lucide-react";

export interface SidebarItemType {
	name: string;
	href: string;
	icon: LucideIcon;
	hasAdd?: boolean;
	isLocked?: boolean;
}

export interface NavGroupType {
	items: SidebarItemType[];
}

export const FEATURE_LOCKS = {
	MAP_INTEGRATION: true,
	MEDIA_UPLOADS: true,
	TRANSACTION_TEMPLATES: true,
	RECURRING_ITEMS: true,
	ADVANCED_ANALYTICS: true,
} as const;

export type FeatureKey = keyof typeof FEATURE_LOCKS;

const createItem = (
	name: string,
	href: string,
	icon: LucideIcon,
	options?: { hasAdd?: boolean; isLocked?: boolean },
): SidebarItemType => ({
	name,
	href,
	icon,
	hasAdd: options?.hasAdd ?? false,
	isLocked: options?.isLocked ?? false,
});

export const NAV_GROUPS: SidebarItemType[] = [
	createItem("Dashboard", "/dashboard", LayoutDashboard),
	createItem("Accounts", "/accounts", Layers2),
	createItem("Transactions", "/transactions", Receipt),
	createItem("Cash Flow", "/cash-flow", HandCoins),
	createItem("Reports", "/reports", ChartPie),
	createItem("Budget", "/plan", PiggyBank),
	createItem("Wallet", "/wallet", WalletCards),
	createItem("Recurring", "/recurring", Repeat),
	createItem("Goals", "/goals", LandPlot),
	createItem("Investments", "/investments", TrendingUp),
	createItem("Forecasting", "/forecast", Sparkles),
	createItem("Stocks", "/stocks", ChartCandlestick),
	createItem("Calculator", "/calculator", Calculator, {
		isLocked: true,
	}),
	createItem("Tags", "/tags", ListTree, {
		hasAdd: true, isLocked: true,
	}),
	createItem("Exchange Rates", "/exchange", RefreshCcw, {
		isLocked: true,
	}),
];
