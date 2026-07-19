"use client";

import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { SidebarItemType } from "@/config/navigation";
import { FeatureGuard } from "@/components/ui/FeatureGuard";

interface SidebarNavItemProps {
	item: SidebarItemType;
	isActive: boolean;
	isCollapsed: boolean;
}

export default function SidebarNavItem({
	item,
	isActive,
	isCollapsed,
}: SidebarNavItemProps) {
	return (
		<FeatureGuard isLocked={item.isLocked}>
			<Link
				href={item.href}
				className={`
                    flex items-center my-0.5 transition-all duration-200 group relative
                    ${
											isCollapsed
												? "justify-center py-3 w-12 mx-auto rounded-xl"
												: "justify-between py-2.5 pl-4 pr-3 rounded-r-2xl border-r"
										}
                    ${
											isActive
												? isCollapsed
													? "text-gray-900 dark:text-white bg-[#00d2d3]/15 dark:bg-[#00d2d3]/10 border border-[#00d2d3]/30"
													: "text-gray-900 dark:text-white border-y border-r border-[#00d2d3] bg-[#00d2d3]/10 dark:bg-[#00d2d3]/5"
												: isCollapsed
													? "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 border border-transparent"
													: "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 border-y border-r border-transparent"
										}
                `}
			>
				<div className={`flex items-center ${isCollapsed ? "" : "gap-4"}`}>
					<item.icon
						size={18}
						className={
							isActive
								? "text-gray-900 dark:text-white"
								: "text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-200"
						}
						strokeWidth={isActive ? 2.5 : 2}
					/>
					{!isCollapsed && (
						<span className="text-[14px] tracking-wide font-medium whitespace-nowrap">
							{item.name}
						</span>
					)}
				</div>

				{!isCollapsed && item.hasAdd && (
					<button
						type="button"
						aria-label={`Add ${item.name}`}
						className="text-gray-400 dark:text-gray-500 hover:text-[#00d2d3] dark:hover:text-[#00d2d3] transition-colors opacity-0 group-hover:opacity-100"
						onClick={(e) => e.preventDefault()} // Prevents the link from firing if the button is clicked
					>
						<PlusCircle size={15} />
					</button>
				)}
			</Link>
		</FeatureGuard>
	);
}
