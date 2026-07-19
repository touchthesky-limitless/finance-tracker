"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { NAV_GROUPS } from "@/config/navigation";
import SidebarHeader from "@/components/Sidebar/SidebarHeader";
import SidebarNavItem from "@/components/Sidebar/SidebarNavItem";
import ProfileDropdown from "@/components/navigation/ProfileDropdown";

export default function Sidebar() {
	const pathname = usePathname();

	const [isCollapsed, setIsCollapsed] = useState(false);
	const [isHovered, setIsHovered] = useState(false);

	const showCollapsedUI = isCollapsed && !isHovered;

	const renderNavItems = () => {
		const itemElements = [];
		for (let i = 0; i < NAV_GROUPS.length; i++) {
			const item = NAV_GROUPS[i];
			itemElements.push(
				<SidebarNavItem
					key={item.name}
					item={item}
					isActive={pathname === item.href}
					isCollapsed={showCollapsedUI}
				/>,
			);
		}
		return itemElements;
	};

	return (
		<motion.aside
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
			// Framer Motion handles the width animation here seamlessly
			animate={{
				width: showCollapsedUI ? 80 : 200,
			}}
			transition={{
				type: "spring",
				bounce: 0, // Removes the "wobble" effect for a clean snap
				duration: 0.4,
			}}
			// Added light mode colors, dark: modifiers, and updated z-index
			className="h-screen bg-white dark:bg-[#1c1c1c] text-gray-900 dark:text-[#e0e0e0] flex flex-col z-100 shrink-0 overflow-x-hidden transition-colors"
		>
			<SidebarHeader
				isCollapsed={showCollapsedUI}
				onToggle={() => setIsCollapsed(!isCollapsed)}
			/>

			<nav className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide flex flex-col">
				{" "}
				{renderNavItems()}
			</nav>

			<div
				// Added light mode border color and dark: modifier
				className={`transition-colors ${showCollapsedUI ? "flex justify-center" : ""}`}
			>
				<ProfileDropdown isCollapsed={showCollapsedUI} />
			</div>
		</motion.aside>
	);
}
