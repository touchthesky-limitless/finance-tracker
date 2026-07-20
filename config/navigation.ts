import {
	LayoutDashboard,
	Receipt,
	ChartPie,
	BarChart3,
	Compass,
	WalletCards,
	Layers2,
	Repeat,
	RefreshCcw,
	LucideIcon,
	ListTree,
	Calculator,
	ChartCandlestick,
} from "lucide-react";

export interface SidebarItemType {
	name: string;
	href: string;
	icon: LucideIcon;
	hasAdd?: boolean;
	isLocked?: boolean;
}

export interface NavGroupType {
	// label: string;
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

// Add this helper to config/navigation.ts
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
	createItem("Reports", "/reports", ChartPie),
	createItem("Wallet", "/wallet", WalletCards),
	createItem("Calculator", "/calculator", Calculator),
	createItem("Stocks", "/stocks", ChartCandlestick),
	createItem("Insights", "/insights", Compass),
	createItem("Statistics", "/stats", BarChart3),
	createItem("Recurring", "/recurring", Repeat),
	createItem("Tags", "/tags", ListTree, {
		hasAdd: true, isLocked: true,
	}),
	createItem("Exchange Rates", "/exchange", RefreshCcw, {
		isLocked: true,
	}),
];
