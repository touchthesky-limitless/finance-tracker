"use client";

import { memo, useState, useCallback, ReactNode } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
	Zap,
	LayoutDashboard,
	ReceiptText,
	BarChart3,
	Calculator,
	Menu,
	X,
	WalletCards,
} from "lucide-react";
import { LogoutButton } from "@/components/LogoutButton";
import ThemeToggle from "@/components/ThemeToggle";
import BottomNav from "@/components/navigation/BottomNav";
import { featureFlags } from "@/config/featureFlags";

const enableBottomNav = featureFlags.SidebarEnableBottomNav;

interface NavLinkProps {
	href: string;
	name: string;
	icon: ReactNode;
	onClick: () => void;
	isPrimary?: boolean;
}

const NAV_LINKS = [
	{
		name: "Dashboard",
		href: "/dashboard",
		icon: <LayoutDashboard size={18} />,
		isPrimary: true,
	},
	{
		name: "Budget Tracking",
		href: "/budget",
		icon: <ReceiptText size={18} />,
		isPrimary: true,
	},
	{
		name: "Market Pulse",
		href: "/stocks",
		icon: <BarChart3 size={18} />,
		isPrimary: true,
	},
	{
		name: "Wallet Rewards",
		href: "/wallet",
		icon: <WalletCards size={18} />,
		isPrimary: true,
	},
	{
		name: "Calculator",
		href: "/calculator",
		icon: <Calculator size={18} />,
		isPrimary: false,
	},
];

const NavLink = memo(
	({ href, name, icon, onClick, isPrimary }: NavLinkProps) => {
		const pathname = usePathname();

		// FIX: Use startsWith for "/budget" so children remain highlighted,
		// but keep strict equality for others to prevent accidental matching.
		const active =
			href === "/budget" ? pathname.startsWith("/budget") : pathname === href;

		const displayClass =
			isPrimary && enableBottomNav ? "hidden lg:flex" : "flex";

		return (
			<Link
				href={href}
				prefetch={true}
				onClick={onClick}
				className={`${displayClass} items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all duration-75 transform-gpu ${
					active
						? "bg-orange-600 text-white shadow-lg shadow-orange-600/20"
						: "text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"
				}`}
			>
				{icon}
				{name}
			</Link>
		);
	},
);
NavLink.displayName = "NavLink";

const OldSidebar = memo(function OldSidebar() {
	const [isOpen, setIsOpen] = useState(false);
	const toggleMobile = useCallback(() => setIsOpen((prev) => !prev), []);
	const closeMobile = useCallback(() => setIsOpen(false), []);

	const navLinkElements = [];
	for (let i = 0; i < NAV_LINKS.length; i++) {
		const link = NAV_LINKS[i];
		navLinkElements.push(
			<NavLink
				key={link.href}
				href={link.href}
				name={link.name}
				icon={link.icon}
				onClick={closeMobile}
				isPrimary={link.isPrimary}
			/>,
		);
	}

	return (
		<>
			{/* --- 1. THE OVERLAY (Moved outside the ternary) --- */}
			{/* LEGACY OVERLAY */}
			{isOpen && (
				<div
					className="fixed inset-0 bg-gray-900/60 dark:bg-black/60 backdrop-blur-sm transform-gpu z-50 lg:hidden"
					onClick={closeMobile}
				/>
			)}

			{/* --- 2. THE TERNARY FEATURE GATE FOR MOBILE NAV --- */}
			{enableBottomNav ? (
				<BottomNav onOpenMenu={toggleMobile} />
			) : (
				<>
					{/* LEGACY MOBILE HEADER */}
					<header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white/80 dark:bg-[#050505]/80 backdrop-blur-md transform-gpu border-b border-gray-200 dark:border-white/5 px-6 flex justify-between items-center z-40">
						<Link href="/dashboard">
							<div className="flex items-center gap-2 font-black text-gray-900 dark:text-white tracking-tighter cursor-pointer transition-opacity hover:opacity-80">
								<Zap className="text-orange-600 fill-orange-600" size={20} />
								Budget Pro
							</div>
						</Link>
						<button
							type="button"
							aria-label="Menu"
							onClick={toggleMobile}
							className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
						>
							<Menu size={24} />
						</button>
					</header>
				</>
			)}

			{/* --- 3. THE SMART SIDEBAR DRAWER --- */}
			{/* On mobile: Completely hidden if BottomNav is true, otherwise uses legacy drawer. On desktop: Always visible. */}
			<aside
				className={`
                    fixed inset-y-0 left-0 z-60 w-72 
					bg-white/30 dark:bg-[#0d0d0d]/40 
					backdrop-blur-3xl 
					border-r border-white/20 dark:border-white/5
					shadow-[0_0_40px_rgba(0,0,0,0.1)]
					flex flex-col transform-gpu transition-transform duration-300 ease-in-out
					lg:translate-x-0 lg:static lg:w-72
                    ${isOpen ? "translate-x-0" : "-translate-x-full"}
                `}
			>
				<div className="p-8 flex items-center justify-between lg:block">
					<Link href="/dashboard">
						<div className="flex items-center gap-2 font-black text-gray-900 dark:text-white tracking-tighter cursor-pointer transition-opacity hover:opacity-80">
							<Zap className="text-orange-600 fill-orange-600" size={20} />
							Budget Pro
						</div>
					</Link>
					<button
						type="button"
						aria-label="Close"
						className="lg:hidden text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
						onClick={closeMobile}
					>
						<X size={24} />
					</button>
				</div>

				{/* Navigation */}
				<nav className="flex-1 px-4 space-y-2">{navLinkElements}</nav>

				<div className="p-6 border-t border-gray-200 dark:border-white/5 space-y-6">
					<div className="px-2">
						<p className="text-[10px] uppercase tracking-[0.2em] text-gray-500 dark:text-gray-600 font-black mb-4">
							Appearance
						</p>
						<ThemeToggle />
					</div>
					<LogoutButton />
				</div>
			</aside>
		</>
	);
});

export default OldSidebar;
