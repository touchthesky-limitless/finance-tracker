"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import * as Tooltip from "@radix-ui/react-tooltip";
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
	const navItem = (
		<div
			className={`group relative ${isCollapsed ? "mx-auto w-10" : "mx-1.5"}`}
		>
			<Link
				href={item.href}
				aria-current={isActive ? "page" : undefined}
				className={`
					flex h-9 min-w-0 items-center rounded-lg text-sm
					transition-colors duration-100
					focus-visible:outline-none focus-visible:ring-2
					focus-visible:ring-black/20 dark:focus-visible:ring-white/20
					${isCollapsed ? "w-10 justify-center" : "w-full gap-3 px-2.5 pr-9"}
					${
						isActive
							? "bg-[#ececec] text-[#0d0d0d] dark:bg-[#2a2a2a] dark:text-[#ececec]"
							: "text-[#0d0d0d] hover:bg-[#ececec] dark:text-[#ececec] dark:hover:bg-[#2a2a2a]"
					}
				`}
			>
				<item.icon size={18} strokeWidth={1.8} className="shrink-0" />

				{!isCollapsed && (
					<span className="min-w-0 flex-1 truncate font-normal">
						{item.name}
					</span>
				)}
			</Link>

			{!isCollapsed && item.hasAdd && (
				<button
					type="button"
					aria-label={`Add ${item.name}`}
					onClick={(event) => {
						event.preventDefault();
						event.stopPropagation();
					}}
					className="absolute right-1 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-[#676767] opacity-0 transition-all hover:bg-black/5 hover:text-[#0d0d0d] focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 group-hover:opacity-100 dark:text-[#a6a6a6] dark:hover:bg-white/10 dark:hover:text-[#ececec] dark:focus-visible:ring-white/20"
				>
					<Plus size={17} strokeWidth={1.8} />
				</button>
			)}
		</div>
	);

	return (
		<FeatureGuard isLocked={item.isLocked}>
			{isCollapsed ? (
				<Tooltip.Provider delayDuration={250}>
					<Tooltip.Root>
						<Tooltip.Trigger asChild>{navItem}</Tooltip.Trigger>
						<Tooltip.Portal>
							<Tooltip.Content
								side="right"
								sideOffset={8}
								className="z-[200] rounded-lg bg-[#212121] px-3 py-2 text-xs font-medium text-white shadow-lg dark:bg-[#f2f2f2] dark:text-[#171717]"
							>
								{item.name}
								<Tooltip.Arrow className="fill-[#212121] dark:fill-[#f2f2f2]" />
							</Tooltip.Content>
						</Tooltip.Portal>
					</Tooltip.Root>
				</Tooltip.Provider>
			) : (
				navItem
			)}
		</FeatureGuard>
	);
}
