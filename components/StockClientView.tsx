"use client";

import { useEffect, useState, useMemo } from "react";
import { Search, ArrowUpDown } from "lucide-react";
import FinancialCard from "@/components/FinancialCard";
import MarketStatus from "@/components/MarketStatus";
import { StockData } from "@/lib/types";
import { MarketInfo } from "@/app/(app)/stocks/page";
import ViewToggle from "@/components/ViewToggle";

interface StockClientViewProps {
	stocks: (StockData | null)[];
	marketInfo: MarketInfo;
}

export default function StockClientView({
	stocks,
	marketInfo,
}: StockClientViewProps) {
	const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

	// Search and Sort State
	const [searchQuery, setSearchQuery] = useState("");
	// 1. Set default sort to changePercent
	const [sortBy, setSortBy] = useState<"symbol" | "price" | "changePercent">(
		"changePercent",
	);
	// 2. (Optional but recommended) Set default order to descending (highest % first)
	const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

	useEffect(() => {
		// Update to 'list' ONLY if on mobile
		const handleResize = () => {
			const isMobile = window.innerWidth < 768;
			setViewMode(isMobile ? "list" : "grid");
		};

		// Run once on mount to set initial state
		handleResize();

		// Optional: Add listener if you want it to switch if user resizes window
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, []);

	// Memoized filtering and sorting logic
	const processedStocks = useMemo(() => {
		return (
			stocks
				// 1. Remove nulls and ensure symbol exists
				.filter((stock): stock is StockData => stock !== null && !!stock.symbol)
				// 2. Filter by search query
				.filter(
					(stock) =>
						stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
						(stock.name || "")
							.toLowerCase()
							.includes(searchQuery.toLowerCase()),
				)
				// 3. Sort by selected criteria
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
				})
		);
	}, [stocks, searchQuery, sortBy, sortOrder]);

	const toggleSortOrder = () => {
		setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
	};

	// Prevent rendering until the view is determined to avoid layout shift
	if (viewMode === null) return null;

	return (
		<div className="max-w-7xl mx-auto px-4 py-8">
			<header className="mb-8 flex items-end justify-between gap-4">
				{/* Left Side: Title and Status */}
				<div className="flex flex-col gap-1">
					<h1 className="text-3xl font-bold text-gray-900 dark:text-white">
						Market Pulse
					</h1>
					<p className="text-gray-500">
						Real-time tracking of your favorite assets
					</p>
					<div className="mt-2">
						<MarketStatus
							date={marketInfo.date}
							time={marketInfo.time}
							session={marketInfo.session}
						/>
					</div>
				</div>

				{/* Right Side: Toggle Buttons (Aligned with the bottom of the header area) */}
				<ViewToggle
					viewMode={viewMode}
					setViewMode={setViewMode}
					iconSize={20}
				/>
			</header>

			{/* NEW: Search & Sort Controls */}
			<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
				{/* Search Bar */}
				<div className="relative w-full md:max-w-xs">
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

				{/* Sort Controls */}
				<div className="flex items-center bg-gray-50 dark:bg-[#0a0a0a] border border-gray-200 dark:border-white/5 rounded-xl p-1 w-full md:w-auto">
					<select
						value={sortBy}
						onChange={(e) => setSortBy(e.target.value as never)}
						className="bg-transparent text-sm text-gray-700 dark:text-gray-300 py-1.5 px-3 focus:outline-none cursor-pointer appearance-none outline-none"
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
			</div>

			{/* DATA GRID / LIST */}
			{processedStocks.length === 0 ? (
				<div className="text-center py-12 text-gray-500 dark:text-gray-400 text-sm border border-dashed border-gray-200 dark:border-white/10 rounded-3xl">
					No assets found matching &quot;{searchQuery}&quot;
				</div>
			) : (
				<div
					className={`grid gap-3 ${
						viewMode === "grid"
							? "grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" // 2 columns mobile, 3+ desktop
							: "grid-cols-1" // List view remains 1 column
					}`}
				>
					{processedStocks.map((stock) => (
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
			)}
		</div>
	);
}
