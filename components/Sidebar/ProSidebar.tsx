"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PiggyBank, PlusCircle } from "lucide-react";
import { NAV_GROUPS, SidebarItemType } from "@/config/navigation";
import { FeatureGuard } from "@/components/ui/FeatureGuard";

interface ProSidebarProps {
	onItemClick?: () => void;
}

export default function ProSidebar({ onItemClick }: ProSidebarProps) {
	const pathname = usePathname();

	return (
		<aside className="w-64 h-screen bg-[#050505] text-gray-400 border-r border-white/5 flex flex-col shrink-0">
			{/* Logo Section - Matching Landing Page Branding */}
			<div className="p-8 flex items-center gap-3">
				<div className="bg-orange-600 p-1.5 rounded-lg shadow-lg shadow-orange-600/20">
					<PiggyBank size={20} className="text-white fill-white" />
				</div>
				<span className="text-lg font-black text-white tracking-tighter uppercase">
					$$$<span className="text-orange-600">$$$</span>
				</span>
			</div>

			{/* Scrollable Navigation */}
			<div className="flex-1 px-4 py-4 space-y-10 overflow-y-auto scrollbar-hide">
				{NAV_GROUPS.map((group) => (
					<div key={group.label}>
						<h3 className="px-4 text-[10px] font-black text-gray-600 uppercase tracking-[0.3em] mb-4">
							{group.label}
						</h3>
						<nav className="space-y-1.5">
							{group.items.map((item) => (
								<FeatureGuard key={item.name} isLocked={item.isLocked}>
									<SidebarItem
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
		<div className="flex items-center group relative px-2">
			{/* Active Indicator Line */}
			{isActive && (
				<div className="absolute left-0 w-1 h-5 bg-orange-600 rounded-full" />
			)}

			<Link
				href={item.href}
				onClick={onClick}
				className={`flex-1 flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
					isActive
						? "bg-orange-600/10 text-white"
						: "text-gray-500 hover:text-white hover:bg-white/5"
				}`}
			>
				<item.icon
					size={18}
					strokeWidth={2.5}
					className={
						isActive
							? "text-orange-600"
							: "text-gray-600 group-hover:text-gray-300"
					}
				/>
				{item.name}
			</Link>

			{item.hasAdd && (
				<button className="absolute right-4 p-1 opacity-0 group-hover:opacity-100 text-gray-500 hover:text-orange-500 transition-all">
					<PlusCircle size={14} />
				</button>
			)}
		</div>
	);
}
