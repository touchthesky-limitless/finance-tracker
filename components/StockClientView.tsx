"use client";

import { useEffect, useState } from "react";
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

	useEffect(() => {
		// 2. Update to 'list' ONLY if on mobile
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

			<div
				className={`grid gap-3 ${
					viewMode === "grid"
						? "grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" // 2 columns mobile, 3+ desktop
						: "grid-cols-1" // Stack view remains 1 column
				}`}
			>
				{stocks.map((stock) => {
					if (!stock || !stock.symbol) return null;

					return (
						<FinancialCard
							key={stock.symbol}
							{...stock}
							name={stock.name || "Unknown Company"}
							price={stock.price ?? 0}
							change={stock.change ?? 0}
							changePercent={stock.changePercent ?? 0}
							// exchange="NASDAQ"
							viewMode={viewMode}
							marketCap={stock.marketCap}
						/>
					);
				})}
			</div>
		</div>
	);
}
