/*
 * StockSortControls.tsx
 * A dropdown and button combination that lets users choose a sorting criterion
 * (symbol, price, or change percent) and toggle between ascending and descending order.
 */

"use client";

import { ArrowUpDown } from "lucide-react";

interface StockSortControlsProps {
	sortBy: "symbol" | "price" | "changePercent";
	setSortBy: (value: "symbol" | "price" | "changePercent") => void;
	sortOrder: "asc" | "desc";
	toggleSortOrder: () => void;
}

export default function StockSortControls({
	sortBy,
	setSortBy,
	sortOrder,
	toggleSortOrder,
}: StockSortControlsProps) {
	return (
		<div className="flex items-center shrink-0 bg-gray-50 dark:bg-[#0a0a0a] border border-gray-200 dark:border-white/5 rounded-xl p-1">
			<select
				value={sortBy}
				onChange={(e) =>
					setSortBy(e.target.value as "symbol" | "price" | "changePercent")
				}
				className="bg-transparent text-sm text-gray-700 dark:text-gray-300 py-1.5 px-2 md:px-3 focus:outline-none cursor-pointer appearance-none outline-none"
			>
				<option
					value="symbol"
					className="bg-white dark:bg-[#0d0d0d] text-gray-900 dark:text-white"
				>
					Ticker (A-Z)
				</option>
				<option
					value="price"
					className="bg-white dark:bg-[#0d0d0d] text-gray-900 dark:text-white"
				>
					Price
				</option>
				<option
					value="changePercent"
					className="bg-white dark:bg-[#0d0d0d] text-gray-900 dark:text-white"
				>
					% Change
				</option>
			</select>
			<button
				onClick={toggleSortOrder}
				className="p-1.5 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
				title={`Sort ${sortOrder === "asc" ? "Descending" : "Ascending"}`}
			>
				<ArrowUpDown
					size={16}
					className={sortOrder === "desc" ? "rotate-180" : ""}
				/>
			</button>
		</div>
	);
}
