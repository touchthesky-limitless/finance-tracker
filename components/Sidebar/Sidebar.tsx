"use client";

import { useState, useEffect } from "react"; // ✅ Added useEffect
import { usePathname } from "next/navigation";
import { NAV_GROUPS } from "@/config/navigation";
import SidebarHeader from "@/components/Sidebar/SidebarHeader";
import SidebarNavItem from "@/components/Sidebar/SidebarNavItem";
import ProfileDropdown from "@/components/navigation/ProfileDropdown";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { MOBILE_BREAKPOINT } from "@/config/breakpoints";

export default function Sidebar({
	onMobileClose,
	onItemClick,
}: {
	onMobileClose?: () => void;
	onItemClick?: () => void;
}) {
	const pathname = usePathname();
	const [isCollapsed, setIsCollapsed] = useState(false);
	const isMobile = useMediaQuery(MOBILE_BREAKPOINT);

	// ✅ ADDED: Prevents width class from changing during initial hydration
	const [isMounted, setIsMounted] = useState(false);
	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect
		setIsMounted(true);
	}, []);

	return (
		<aside
			suppressHydrationWarning // ✅ CRITICAL: Silences theme class mismatches
			className={`
				relative z-[100] flex h-dvh shrink-0 flex-col overflow-hidden
				border-r border-black/5 bg-[#f9f9f9] text-[#0d0d0d]
				transition-[width] duration-200 ease-out
				dark:border-white/5 dark:bg-[#171717] dark:text-[#ececec]
				${isCollapsed ? "w-[56px]" : isMounted && isMobile ? "w-full" : "w-[220px]"}
			`}
		>
			<SidebarHeader
				isCollapsed={isCollapsed}
				onToggle={() => setIsCollapsed((current) => !current)}
				onMobileClose={onMobileClose}
			/>

			<nav
				aria-label="Primary navigation"
				className="scrollbar-hide flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto px-3 py-1"
			>
				{NAV_GROUPS.map((item) => {
					const isActive =
						pathname === item.href || pathname.startsWith(`${item.href}/`);

					return (
						<SidebarNavItem
							key={item.name}
							item={item}
							isActive={isActive}
							isCollapsed={isCollapsed}
							onItemClick={onItemClick}
						/>
					);
				})}
			</nav>

			<div
				className={`shrink-0 p-2 ${isCollapsed ? "flex justify-center" : ""}`}
			>
				<ProfileDropdown isCollapsed={isCollapsed} />
			</div>
		</aside>
	);
}
