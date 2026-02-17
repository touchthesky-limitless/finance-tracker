"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
	PlusCircle,
	Moon,
	Lock,
	LucideIcon,
	PiggyBank,
} from "lucide-react";

interface SidebarItemType {
	name: string;
	href: string;
	icon: LucideIcon; // Specifically types the Lucide component
	hasAdd?: boolean; // Optional property for the 'Add' button
	category?: string;
	isLocked?: boolean;
}

interface NavGroupType {
	label: string;
	items: SidebarItemType[];
}

interface ProSidebarProps {
	onItemClick?: () => void; // Add this prop
}

// Sectioned Navigation for "Pro" features
const NAV_GROUPS: NavGroupType[] = [
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

export default function ProSidebar({ onItemClick }: ProSidebarProps) {
	const pathname = usePathname();

	return (
		<aside className="w-64 h-screen bg-[#F8F9FB] dark:bg-[#0a0a0a] dark:text-gray-100 border-r border-gray-800 flex flex-col shrink-0">
			{/* Logo Section */}
			<div className="p-6 flex items-center gap-3">
				{/* <div className="w-6 h-6 bg-orange-200 rounded-sm flex items-center justify-center">
					<div className="w-3 h-3 bg-orange-800 rounded-sm" />
				</div> */}
				<span className="text-lg font-semibold text-gray-600 dark:text-gray-100 tracking-tight">
					<PiggyBank size={34} />
				</span>
			</div>

			{/* Scrollable Navigation */}
			<div className="flex-1 px-4 py-2 space-y-8 overflow-y-auto scrollbar-hide">
				{NAV_GROUPS.map((group) => (
					<div key={group.label}>
						<h3 className="px-3 text-[10px] font-bold text-gray-500 dark:text-gray-100 uppercase tracking-widest mb-2">
							{group.label}
						</h3>
						<nav className="space-y-1">
							{group.items.map((item) => (
								<SidebarItem
									key={item.name}
									item={item}
									isActive={pathname === item.href}
									onClick={onItemClick}
								/>
							))}
						</nav>
					</div>
				))}
			</div>

			{/* User & Theme Toggle (Bottom) */}
			<div className="p-4 border-t border-gray-800 flex items-center justify-between">
				<button className="p-2 text-gray-400 hover:text-white transition-colors">
					<Moon size={18} />
				</button>
				<div className="flex items-center gap-3">
					<span className="text-xs text-gray-400 font-medium">JD</span>
					<div className="w-8 h-8 rounded-full bg-orange-200 flex items-center justify-center text-orange-900 text-xs font-bold">
						JD
					</div>
				</div>
			</div>
		</aside>
	);
}

function SidebarItem({
	item,
	isActive,
	onClick,
}: {
	item: SidebarItemType;
	isActive: boolean;
	onClick?: () => void;
}) {
	if (item.isLocked) {
		return (
			<div className="flex items-center px-3 py-2 rounded-lg text-sm font-medium text-gray-300 dark:text-gray-600 cursor-not-allowed opacity-60">
				<item.icon size={18} className="text-gray-700" />
				<span className="ml-3 flex-1">{item.name}</span>
				<Lock size={12} className="text-gray-700" />
			</div>
		);
	}

	return (
		<div className="flex items-center group">
			<Link
				href={item.href}
				onClick={onClick}
				className={`flex-1 flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
					isActive
						? "bg-gray-800/50 dark:bg-gray-800 text-gray-200 dark:text-gray-100"
						: "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"
				}`}
			>
				<item.icon
					size={18}
					className={isActive ? "text-orange-400" : "text-gray-500"}
				/>
				{item.name}
			</Link>
			{item.hasAdd && (
				<button className="p-2 opacity-0 group-hover:opacity-100 text-gray-500 hover:text-white transition-opacity">
					<PlusCircle size={16} />
				</button>
			)}
		</div>
	);
}
