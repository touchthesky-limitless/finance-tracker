"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Search, ArrowUpDown } from "lucide-react";
import FinancialCard from "@/components/FinancialCard";
import MarketStatus from "@/components/MarketStatus";
import { StockData } from "@/lib/types";
import { MarketInfo } from "@/app/(app)/stocks/page";
import ViewToggle from "@/components/ViewToggle";
import { Shimmer } from "@/components/ui/Shimmer";

interface StockClientViewProps {
	stocks: (StockData | null)[];
	marketInfo: MarketInfo;
	isLoading?: boolean;
}

function subscribeToClient(): () => void {
	return () => {};
}

function getClientSnapshot(): boolean {
	return true;
}

function getServerSnapshot(): boolean {
	return false;
}

function StocksPageSkeleton() {
	return (
		<div
			role="status"
			aria-label="Loading market pulse"
			aria-live="polite"
			className="mx-auto max-w-7xl px-4 py-8"
		>
			<span className="sr-only">Loading market pulse…</span>

			<header
				aria-hidden="true"
				className="mb-8 flex items-end justify-between gap-4"
			>
				<div className="space-y-3">
					<Shimmer className="h-9 w-48 rounded-lg" />
					<Shimmer className="h-4 w-72 max-w-[70vw] rounded-md" />
					<Shimmer className="h-6 w-40 rounded-lg" />
				</div>

				<Shimmer className="h-10 w-24 rounded-xl" />
			</header>

			<div
				aria-hidden="true"
				className="mb-6 flex items-center justify-between gap-2 md:gap-4"
			>
				<Shimmer className="h-10 min-w-0 flex-1 rounded-xl md:max-w-xs" />
				<Shimmer className="h-10 w-40 shrink-0 rounded-xl" />
			</div>

			<div
				aria-hidden="true"
				className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4"
			>
				{Array.from({ length: 8 }, (_, index) => (
					<div
						key={index}
						className="min-h-48 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#111]"
					>
						<div className="flex items-start justify-between gap-3">
							<div className="space-y-2">
								<Shimmer className="h-5 w-16 rounded-md" />
								<Shimmer
									className={`h-3 rounded-md ${
										index % 2 === 0 ? "w-28" : "w-20"
									}`}
								/>
							</div>
							<Shimmer className="size-9 rounded-xl" />
						</div>

						<Shimmer className="mt-8 h-8 w-28 rounded-lg" />
						<Shimmer className="mt-3 h-4 w-20 rounded-md" />
						<Shimmer className="mt-6 h-10 w-full rounded-xl" />
					</div>
				))}
			</div>
		</div>
	);
}

export default function StockClientView({
	stocks,
	marketInfo,
	isLoading = false,
}: StockClientViewProps) {
	const isClient = useSyncExternalStore(
		subscribeToClient,
		getClientSnapshot,
		getServerSnapshot,
	);
	const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
		if (typeof window === "undefined") {
			return "grid";
		}

		return window.matchMedia("(max-width: 767px)").matches ? "list" : "grid";
	});

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

	if (isLoading || !isClient) {
		return <StocksPageSkeleton />;
	}

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
			<div className="flex flex-row justify-between items-center gap-2 md:gap-4 mb-6">
				{/* Search Bar */}
				{/* Changed to flex-1 so it takes up available space, removed w-full */}
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

				{/* Sort Controls */}
				{/* Removed w-full, added shrink-0 so it doesn't get squished by the search bar */}
				<div className="flex items-center shrink-0 bg-gray-50 dark:bg-[#0a0a0a] border border-gray-200 dark:border-white/5 rounded-xl p-1">
					<select
						value={sortBy}
						onChange={(e) => setSortBy(e.target.value as never)}
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
