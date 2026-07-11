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

interface NavLinkProps {
	href: string;
	name: string;
	icon: ReactNode;
	onClick: () => void;
}

const NAV_LINKS = [
	{ name: "Overview", href: "/overview", icon: <LayoutDashboard size={18} /> },
	{ name: "Budget Tracking", href: "/budget", icon: <ReceiptText size={18} /> },
	{ name: "Market Pulse", href: "/stocks", icon: <BarChart3 size={18} /> },
	{ name: "Wallet Rewards", href: "/wallet", icon: <WalletCards size={18} /> },
	{ name: "Calculator", href: "/calculator", icon: <Calculator size={18} /> },
];

// 1. Move usePathname DOWN into the child component.
// Now, only the button cares about the URL, not the whole Sidebar.
const NavLink = memo(({ href, name, icon, onClick }: NavLinkProps) => {
	const pathname = usePathname(); // <--- MOVED HERE
	const active = pathname === href;

	return (
		<Link
			href={href}
			prefetch={true}
			onClick={onClick}
			className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all duration-75 transform-gpu ${
				active
					? "bg-orange-600 text-white shadow-lg shadow-orange-600/20"
					: "text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"
			}`}
		>
			{icon}
			{name}
		</Link>
	);
});
NavLink.displayName = "NavLink";

const Sidebar = memo(function Sidebar() {
	const [isOpen, setIsOpen] = useState(false);
	const toggleMobile = useCallback(() => setIsOpen((prev) => !prev), []);
	const closeMobile = useCallback(() => setIsOpen(false), []);

	// Explicitly loop through nav links instead of using inline maps
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
			/>,
		);
	}

	return (
		<>
			{/* MOBILE HEADER */}
			<header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white/80 dark:bg-[#050505]/80 backdrop-blur-md transform-gpu border-b border-gray-200 dark:border-white/5 px-6 flex justify-between items-center z-40">
				<div className="flex items-center gap-2 font-black text-gray-900 dark:text-white tracking-tighter">
					<Zap className="text-orange-600 fill-orange-600" size={20} />
					Budget Pro
				</div>
				<button
					type="button"
					aria-label="Menu"
					onClick={toggleMobile}
					className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
				>
					<Menu size={24} />
				</button>
			</header>

			{/* OVERLAY */}
			{isOpen && (
				<div
					className="fixed inset-0 bg-gray-900/60 dark:bg-black/60 backdrop-blur-sm transform-gpu z-50 lg:hidden"
					onClick={closeMobile}
				/>
			)}

			{/* SIDEBAR DRAWER */}
			<aside
				className={`
                    fixed inset-y-0 left-0 z-60 w-72 bg-gray-50 dark:bg-[#050505] border-r border-gray-200 dark:border-white/5 
                    flex flex-col transform-gpu transition-transform duration-200 ease-out
                    lg:translate-x-0 lg:static lg:w-64 lg:z-auto
                    ${isOpen ? "translate-x-0" : "-translate-x-full"}
                `}
			>
				<div className="p-8 flex items-center justify-between lg:block">
					<div className="flex items-center gap-2 font-black text-xl tracking-tighter text-gray-900 dark:text-white">
						<Zap className="text-orange-600 fill-orange-600" size={24} />
						Budget Pro
					</div>
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

export default Sidebar;
