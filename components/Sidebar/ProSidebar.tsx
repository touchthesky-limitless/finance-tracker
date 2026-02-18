"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PlusCircle, Moon, PiggyBank } from "lucide-react";
import { NAV_GROUPS, SidebarItemType } from "@/config/navigation";
import { FeatureGuard } from "@/components/ui/FeatureGuard";

interface ProSidebarProps {
	onItemClick?: () => void; // Add this prop
}

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
								<FeatureGuard key={item.name} isLocked={item.isLocked}>
									<SidebarItem
										key={item.name}
										item={item}
										isActive={pathname === item.href}
										onClick={onItemClick}
									/>
								</FeatureGuard>
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
					<span className="text-xs text-gray-400 font-medium">FT</span>
					<div className="w-8 h-8 rounded-full bg-orange-200 flex items-center justify-center text-orange-900 text-xs font-bold">
						FT
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
