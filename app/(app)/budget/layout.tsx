"use client";

import { useState, memo, useCallback, useRef, useEffect } from "react";
import { X, ChevronDown } from "lucide-react";
import { VersionProvider } from "@/app/context/VersionContext";
import ProSidebar from "@/components/Sidebar/ProSidebar";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useBudgetStore } from "@/store/useBudgetStore";
import { UndoToast } from "@/components/ui/UndoToast";
import { NAV_GROUPS } from "@/config/navigation";
import { FeatureGuard } from "@/components/ui/FeatureGuard";
import { featureFlags } from "@/config/featureFlags";

// 1. NEW CONTEXTUAL DROPDOWN NAV
const LocalNavigation = memo(function LocalNavigation() {
	const pathname = usePathname();
	const [isOpen, setIsOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);

	// The new feature flag
	const enableHorizontalNav =
		featureFlags.LayoutLocalNavigationEnableHorizontalNav;

	// Close the dropdown if clicking outside (used in legacy mode)
	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(event.target as Node)
			) {
				setIsOpen(false);
			}
		}
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	// Flatten the groups using a standard loop
	const allNavItems = [];
	for (let i = 0; i < NAV_GROUPS.length; i++) {
		const group = NAV_GROUPS[i];
		for (let j = 0; j < group.items.length; j++) {
			allNavItems.push(group.items[j]);
		}
	}

	// Find the title of the active page using a standard loop
	let currentTitle = "Budget Tracker";
	for (let i = 0; i < allNavItems.length; i++) {
		if (allNavItems[i].href === pathname) {
			currentTitle = allNavItems[i].name;
			break;
		}
	}

	// --- PATH 1: NEW HORIZONTAL UBER-EATS STYLE ---
	if (enableHorizontalNav) {
		return (
			<div className="w-full bg-white dark:bg-[#050505] flex flex-col pt-2 pb-1 z-40">
				{/* Horizontal Scroll Pill Row */}
				<nav className="w-full">
					<ul className="flex items-center gap-2 overflow-x-auto scrollbar-hide px-4 py-2 snap-x snap-mandatory">
						{allNavItems.map((item) => {
							const isActive = pathname === item.href;
							const Icon = item.icon;

							return (
								<li key={item.href} className="snap-start shrink-0">
									<FeatureGuard isLocked={item.isLocked}>
										<Link
											href={item.href}
											className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[14px] font-medium transition-colors [-webkit-tap-highlight-color:transparent] ${
												isActive
													? "bg-gray-100 text-gray-900 border border-transparent dark:bg-white/10 dark:text-white"
													: "bg-white text-gray-800 border border-gray-300 hover:bg-gray-50 dark:bg-[#0d0d0d] dark:text-gray-300 dark:border-white/15 dark:hover:bg-white/5"
											}`}
										>
											<Icon
												size={18}
												className={
													isActive
														? "text-gray-900 dark:text-white stroke-[2.5px]"
														: "text-gray-700 dark:text-gray-400 stroke-[2px]"
												}
											/>
											<span className="whitespace-nowrap tracking-tight">
												{item.name}
											</span>
										</Link>
									</FeatureGuard>
								</li>
							);
						})}
					</ul>
				</nav>
			</div>
		);
	}

	// --- PATH 2: LEGACY CONTEXTUAL DROPDOWN NAV ---
	return (
		<div className="relative" ref={dropdownRef}>
			<button
				onClick={() => setIsOpen(!isOpen)}
				className="flex items-center gap-2 px-3 py-2 -ml-3 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors group"
			>
				<h1 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white transition-colors group-hover:text-orange-600 dark:group-hover:text-orange-500">
					{currentTitle}
				</h1>
				<ChevronDown
					size={20}
					className={`text-gray-500 transition-transform duration-300 ${isOpen ? "rotate-180 text-orange-600 dark:text-orange-500" : ""}`}
				/>
			</button>

			{isOpen && (
				<div className="absolute left-0 top-11.25 z-100 w-64 max-w-50 bg-white dark:bg-[#121212] border border-gray-100 dark:border-gray-800 rounded-2xl shadow-xl overflow-y-auto max-h-[70vh] scrollbar-hide animate-in fade-in slide-in-from-top-2 duration-200">
					<div className="p-2 flex flex-col gap-1">
						{NAV_GROUPS.map((group, groupIndex) => (
							<div key={groupIndex} className="mb-2 last:mb-0">
								{group.label && (
									<span className="block text-[10px] font-black uppercase tracking-widest text-gray-400 px-3 pt-2 pb-1">
										{group.label}
									</span>
								)}

								{group.items.map((item) => {
									const isActive = pathname === item.href;
									const Icon = item.icon;

									return (
										<FeatureGuard key={item.href} isLocked={item.isLocked}>
											<Link
												href={item.href}
												onClick={() => setIsOpen(false)}
												className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all [-webkit-tap-highlight-color:transparent] ${
													isActive
														? "bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-500"
														: "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white"
												}`}
											>
												<div
													className={`${isActive ? "text-orange-600 dark:text-orange-500" : "text-gray-400"}`}
												>
													<Icon size={18} />
												</div>
												<span className="flex-1 truncate">{item.name}</span>
											</Link>
										</FeatureGuard>
									);
								})}
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
});

function ProLayoutShell({ children }: { children: React.ReactNode }) {
	const [isMobileOpen, setIsMobileOpen] = useState(false);

	// Zustand selectors remain stable
	const toast = useBudgetStore((state) => state.toast);
	const setToast = useBudgetStore((state) => state.setToast);
	const undoBulkUpdate = useBudgetStore((state) => state.undoBulkUpdate);

	// Stable callback for the sidebar
	const closeMobileSidebar = useCallback(() => setIsMobileOpen(false), []);

	return (
		<div className="flex h-screen overflow-hidden bg-white dark:bg-[#0d0d0d]">
			{/* 1. Desktop Sidebar */}
			<div className="hidden lg:flex shrink-0">
				<ProSidebar />
			</div>

			{/* 2. Mobile Sidebar Overlay (Drawer) */}
			{isMobileOpen && (
				<div className="fixed inset-0 z-50 lg:hidden">
					{/* Background Overlay */}
					<div
						className="fixed inset-0 bg-gray-900/60 dark:bg-black/80 backdrop-blur-sm transform-gpu"
						onClick={closeMobileSidebar}
					/>
					{/* Drawer Content */}
					<div className="fixed inset-y-0 left-0 w-64 bg-gray-50 dark:bg-[#0d0d0d] shadow-2xl border-r border-gray-200 dark:border-gray-800 animate-in slide-in-from-left duration-300">
						<div className="flex justify-end p-4">
							<button
								type="button"
								aria-label="Close"
								onClick={closeMobileSidebar}
								className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
							>
								<X size={24} />
							</button>
						</div>
						<ProSidebar onItemClick={closeMobileSidebar} />
					</div>
				</div>
			)}

			<div className="flex-1 flex flex-col min-w-0">
				{/* 3. Mobile Header (Updated) */}
				<header className="relative z-40 lg:hidden shrink-0 w-full transform-gpu">
					{" "}
					{/* The new interactive title dropdown completely replaces the left burger and static title */}
					<LocalNavigation />
					{/* You can add your top-right global menu trigger here later if needed */}
					<div className="w-10" />
				</header>

				{/* 4. Main Content Area */}
				<main className="flex-1 overflow-y-auto transform-gpu bg-white dark:bg-transparent text-gray-900 dark:text-white">
					{children}
				</main>
			</div>

			{/* 5. Render Toast */}
			{toast && (
				<UndoToast
					show={!!toast}
					message={`Updated ${toast.count} transactions`}
					onUndo={() => {
						undoBulkUpdate(toast.snapshot);
						setToast(null);
					}}
					onClose={() => setToast(null)}
				/>
			)}
		</div>
	);
}

export default function ProLayout({ children }: { children: React.ReactNode }) {
	return (
		<VersionProvider version="pro">
			<ProLayoutShell>{children}</ProLayoutShell>
		</VersionProvider>
	);
}
