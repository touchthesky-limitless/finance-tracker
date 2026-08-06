/*
 * StockSearchBar.tsx
 * A search input component that allows users to filter stocks by ticker symbol
 * or company name. Displays a magnifying glass icon and updates the parent
 * component's search query state.
 */

"use client";

import { Search } from "lucide-react";

interface StockSearchBarProps {
	searchQuery: string;
	setSearchQuery: (query: string) => void;
}

export default function StockSearchBar({
	searchQuery,
	setSearchQuery,
}: StockSearchBarProps) {
	return (
		<div className="relative flex-1 md:max-w-xs">
			<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
				<Search size={16} />
			</div>
			<input
				type="text"
				placeholder="Search ticker or name..."
				value={searchQuery}
				onChange={(e) => setSearchQuery(e.target.value)}
				className="w-full bg-gray-50 dark:bg-[#0a0a0a] border border-gray-200 dark:border-white/5 rounded-xl py-2 pl-10 pr-4 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
			/>
		</div>
	);
}
