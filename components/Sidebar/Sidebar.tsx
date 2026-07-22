"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { NAV_GROUPS } from "@/config/navigation";
import SidebarHeader from "@/components/Sidebar/SidebarHeader";
import SidebarNavItem from "@/components/Sidebar/SidebarNavItem";
import ProfileDropdown from "@/components/navigation/ProfileDropdown";

export default function Sidebar() {
	const pathname = usePathname();
	const [isCollapsed, setIsCollapsed] = useState(false);

	return (
		<aside
			className={`
				relative z-[100] flex h-dvh shrink-0 flex-col overflow-hidden
				border-r border-black/5 bg-[#f9f9f9] text-[#0d0d0d]
				transition-[width] duration-200 ease-out
				dark:border-white/5 dark:bg-[#171717] dark:text-[#ececec]
				${isCollapsed ? "w-[56px]" : "w-[220px]"}
			`}
		>
			<SidebarHeader
				isCollapsed={isCollapsed}
				onToggle={() => setIsCollapsed((current) => !current)}
			/>

			<nav
				aria-label="Primary navigation"
				className="scrollbar-hide flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto px-0.5 py-1"
			>
				{NAV_GROUPS.map((item) => {
					const isActive =
						pathname === item.href ||
						pathname.startsWith(`${item.href}/`);

					return (
						<SidebarNavItem
							key={item.name}
							item={item}
							isActive={isActive}
							isCollapsed={isCollapsed}
						/>
					);
				})}
			</nav>

			<div
				className={`shrink-0 p-2 ${
					isCollapsed ? "flex justify-center" : ""
				}`}
			>
				<ProfileDropdown isCollapsed={isCollapsed} />
			</div>
		</aside>
	);
}
