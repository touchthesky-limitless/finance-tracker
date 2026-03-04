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
	ListTree,
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
		items: [{ name: "Dashboard", href: "/budget", icon: LayoutDashboard }],
	},
	{
		label: "Transaction Data",
		items: [
			{
				name: "Transaction Details",
				href: "/budget/transactions",
				icon: Receipt,
				hasAdd: true,
			},
			{
				name: "Statistics & Analysis",
				href: "/budget/stats",
				icon: BarChart3,
			},
			{
				name: "Insights Explorer",
				href: "/budget/insights",
				icon: Compass,
			},
		],
	},
	{
		label: "Basis Data",
		items: [
			{
				name: "Transaction Categories",
				href: "/budget/categories",
				hasAdd: true,
				icon: ListTree,
				isLocked: false,
			},
			{
				name: "Accounts",
				href: "/budget/accounts",
				icon: Wallet,
				isLocked: true,
			},

			{
				name: "Transaction Tags",
				href: "/budget/tags",
				hasAdd: false,
				icon: Tags,
				isLocked: true,
			},
			{
				name: "Transaction Templates",
				href: "/budget/templates",
				icon: Calendar,
				isLocked: true,
			},
			{
				name: "Scheduled Transactions",
				href: "/budget/scheduled",
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
				href: "/budget/exchange",
				icon: RefreshCcw,
				isLocked: true,
			},
			{
				name: "Use on Mobile Device",
				href: "/budget/mobile",
				icon: Smartphone,
			},
			{ name: "About", href: "/budget/about", icon: Info },
		],
	},
];
