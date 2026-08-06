/*
 * StocksPageClient.tsx
 * Main client component for the stocks page. Fetches stock data from the API,
 * computes market info, manages search/sort/view state, and composes the
 * header, search bar, sort controls, and stock list.
 * Default view mode is now "list" for both desktop and mobile.
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import { StockData } from "@/lib/types";
import { getFullMarketInfo } from "@/lib/date";
import StockHeader from "@/components/Stocks/StockHeader";
import StockSearchBar from "@/components/Stocks/StockSearchBar";
import StockSortControls from "@/components/Stocks/StockSortControls";
import StockList from "@/components/Stocks/StockList";

export default function StocksPageClient() {
	// Data fetching
	const [stocks, setStocks] = useState<StockData[]>([]);
	const [, setLoading] = useState(true);

	// Market info (computed client‑side)
	const marketInfo = useMemo(() => {
		const raw = getFullMarketInfo();
		return {
			...raw,
			session: raw.session as "Pre-Market" | "Open" | "After-Hours" | "Closed",
		};
	}, []);

	useEffect(() => {
		fetch("/api/stocks")
			.then((res) => res.json())
			.then((data) => setStocks(data))
			.catch((err) => console.error("Failed to load stocks", err))
			.finally(() => setLoading(false));
	}, []);

	// View mode – now defaulting to "list" on all devices
	const [viewMode, setViewMode] = useState<"grid" | "list">("list");

	// Search and sort state
	const [searchQuery, setSearchQuery] = useState("");
	const [sortBy, setSortBy] = useState<"symbol" | "price" | "changePercent">(
		"changePercent",
	);
	const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

	// Filter and sort the stock list
	const processedStocks = useMemo(() => {
		return stocks
			.filter((stock): stock is StockData => stock !== null && !!stock.symbol)
			.filter(
				(stock) =>
					stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
					(stock.name || "").toLowerCase().includes(searchQuery.toLowerCase()),
			)
			.sort((a, b) => {
				let comparison = 0;
				if (sortBy === "symbol") {
					comparison = a.symbol.localeCompare(b.symbol);
				} else if (sortBy === "price") {
					comparison = (a.price ?? 0) - (b.price ?? 0);
				} else if (sortBy === "changePercent") {
					comparison = (a.changePercent ?? 0) - (b.changePercent ?? 0);
				}
				return sortOrder === "asc" ? comparison : -comparison;
			});
	}, [stocks, searchQuery, sortBy, sortOrder]);

	const toggleSortOrder = () => {
		setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
	};

	return (
		<div className="max-w-7xl mx-auto px-4 py-8">
			{/* Header with market status and view toggle */}
			<StockHeader
				date={marketInfo.date}
				time={marketInfo.time}
				session={marketInfo.session}
				viewMode={viewMode}
				setViewMode={setViewMode}
			/>

			{/* Search and sort controls */}
			<div className="flex flex-row justify-between items-center gap-2 md:gap-4 mb-6">
				<StockSearchBar
					searchQuery={searchQuery}
					setSearchQuery={setSearchQuery}
				/>
				<StockSortControls
					sortBy={sortBy}
					setSortBy={setSortBy}
					sortOrder={sortOrder}
					toggleSortOrder={toggleSortOrder}
				/>
			</div>

			{/* Stock grid/list */}
			<StockList
				stocks={processedStocks}
				viewMode={viewMode}
				searchQuery={searchQuery}
			/>
		</div>
	);
}
