/*
 * StockList.tsx
 * Displays a collection of FinancialCard components. Renders in a grid layout
 * (2–4 columns) or a single‑column list based on the viewMode prop.
 * Shows a placeholder message when no stocks match the current search.
 */

"use client";

import FinancialCard from "@/components/Stocks/FinancialCard";
import { StockData } from "@/lib/types";

interface StockListProps {
	stocks: StockData[];
	viewMode: "grid" | "list";
	searchQuery: string;
}

export default function StockList({
	stocks,
	viewMode,
	searchQuery,
}: StockListProps) {
	if (stocks.length === 0) {
		return (
			<div className="text-center py-12 text-gray-500 dark:text-gray-400 text-sm border border-dashed border-gray-200 dark:border-white/10 rounded-3xl">
				No assets found matching &quot;{searchQuery}&quot;
			</div>
		);
	}

	return (
		<div
			className={`grid gap-3 ${
				viewMode === "grid"
					? "grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
					: "grid-cols-1"
			}`}
		>
			{stocks.map((stock) => (
				<FinancialCard
					key={stock.symbol}
					{...stock}
					name={stock.name || "Unknown Company"}
					price={stock.price ?? 0}
					change={stock.change ?? 0}
					changePercent={stock.changePercent ?? 0}
					viewMode={viewMode}
					marketCap={stock.marketCap}
				/>
			))}
		</div>
	);
}
