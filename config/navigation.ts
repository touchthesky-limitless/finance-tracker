import {
	LayoutDashboard,
	Receipt,
	BarChart3,
	Compass,
	Wallet,
	Tags,
	Calendar,
	Repeat,
	RefreshCcw,
	Smartphone,
	Info,
	LucideIcon,
} from "lucide-react";

export interface SidebarItemType {
	name: string;
	href: string;
	icon: LucideIcon;
	hasAdd?: boolean;
	isLocked?: boolean;
}

export interface NavGroupType {
	label: string;
	items: SidebarItemType[];
}

export const FEATURE_LOCKS = {
	MAP_INTEGRATION: true, // Generic for any map-related feature
    MEDIA_UPLOADS: true,
	TRANSACTION_TEMPLATES: true,
	RECURRING_ITEMS: true, // Generic for scheduled/recurring logic
	ADVANCED_ANALYTICS: true,
} as const;

export type FeatureKey = keyof typeof FEATURE_LOCKS;

export const NAV_GROUPS: NavGroupType[] = [
	{
		label: "",
		items: [{ name: "Overview", href: "/budget-pro", icon: LayoutDashboard }],
	},
	{
		label: "Transaction Data",
		items: [
			{
				name: "Transaction Details",
				href: "/budget-pro/transactions",
				icon: Receipt,
				hasAdd: true,
			},
			{
				name: "Statistics & Analysis",
				href: "/budget-pro/stats",
				icon: BarChart3,
			},
			{
				name: "Insights Explorer",
				href: "/budget-pro/insights",
				icon: Compass,
			},
		],
	},
	{
		label: "Basis Data",
		items: [
			{ name: "Accounts", href: "/budget-pro/accounts", icon: Wallet },
			{
				name: "Transaction Categories",
				href: "/budget-pro/categories",
				icon: LayoutDashboard,
			},
			{ name: "Transaction Tags", href: "/budget-pro/tags", icon: Tags },
			{
				name: "Transaction Templates",
				href: "/budget-pro/templates",
				icon: Calendar,
				isLocked: true,
			},
			{
				name: "Scheduled Transactions",
				href: "/budget-pro/scheduled",
				icon: Repeat,
				isLocked: true,
			},
		],
	},
	{
		label: "Miscellaneous",
		items: [
			{
				name: "Exchange Rates Data",
				href: "/budget-pro/exchange",
				icon: RefreshCcw,
				isLocked: true,
			},
			{
				name: "Use on Mobile Device",
				href: "/budget-pro/mobile",
				icon: Smartphone,
			},
			{ name: "About", href: "/budget-pro/about", icon: Info },
		],
	},
];
