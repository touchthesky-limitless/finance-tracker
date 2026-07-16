"use client";

import { memo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
	LayoutDashboard,
	ReceiptText,
	BarChart3,
	WalletCards,
	Menu,
} from "lucide-react";

interface BottomNavProps {
	onOpenMenu: () => void;
}

const BOTTOM_NAV_LINKS = [
	{ name: "Overview", href: "/overview", icon: LayoutDashboard },
	{ name: "Budget", href: "/budget", icon: ReceiptText },
	{ name: "Stocks", href: "/stocks", icon: BarChart3 },
	{ name: "Wallet", href: "/wallet", icon: WalletCards },
];

const BottomNav = memo(function BottomNav({ onOpenMenu }: BottomNavProps) {
	const pathname = usePathname();

	return (
		<nav
			className="fixed bottom-2 left-4 right-4 z-50 lg:hidden flex justify-around items-center h-20 rounded-4xl pb-1 
    bg-white/40 dark:bg-[#1a1a1a]/40 
    backdrop-blur-3xl 
    border border-white/30 dark:border-white/10
    shadow-[0_8px_32px_0_rgba(0,0,0,0.1)]"
		>
			{/* 1. Map through the standard page links */}
			{BOTTOM_NAV_LINKS.map((item) => {
				const isActive = pathname === item.href;
				const Icon = item.icon;

				return (
					<Link
						key={item.href}
						href={item.href}
						className="relative flex flex-col items-center justify-center w-full h-full gap-1 transition-all duration-300"
					>
						{isActive && (
							<div className="absolute inset-x-2 inset-y-3 bg-white/20 dark:bg-white/10 rounded-2xl -z-10 backdrop-blur-sm transition-all duration-500 ease-out" />
						)}
						<div
							className={`${isActive ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-500"}`}
						>
							<Icon
								size={22}
								className={isActive ? "stroke-[2.5px]" : "stroke-[1.5px]"}
							/>
						</div>
						<span
							className={`text-[9px] font-semibold tracking-tight ${isActive ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-500"}`}
						>
							{item.name}
						</span>
					</Link>
				);
			})}
			{/* 2. Add the action button to open the sidebar for Settings/Logout */}
			<button
				onClick={onOpenMenu}
				className="flex flex-col items-center justify-center w-full h-full gap-1 transition-colors text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-300"
			>
				<Menu size={22} />
				<span className="text-[10px] font-bold">Menu</span>
			</button>
		</nav>
	);
});

export default BottomNav;
