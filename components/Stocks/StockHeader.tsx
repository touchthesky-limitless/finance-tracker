/*
 * StockHeader.tsx
 * Renders the header section of the stocks page, including the page title,
 * subtitle, live market status, and a toggle between grid/list view modes.
 */

"use client";

import MarketStatus from "@/components/Stocks/MarketStatus";
import ViewToggle from "@/components/ViewToggle";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { MOBILE_BREAKPOINT } from "@/config/breakpoints";

interface StockHeaderProps {
	date: string;
	time: string;
	session: "Pre-Market" | "Open" | "After-Hours" | "Closed";
	viewMode: "grid" | "list";
	setViewMode: (mode: "grid" | "list") => void;
}

export default function StockHeader({
	date,
	time,
	session,
	viewMode,
	setViewMode,
}: StockHeaderProps) {
	const isMobile = useMediaQuery(MOBILE_BREAKPOINT);

	return (
		<header className="mb-8 flex items-end justify-between gap-4">
			{/* Left Side: Title and Status */}
			<div className="flex flex-col gap-1">
				{!isMobile && (
					<h1 className="text-3xl font-bold text-gray-900 dark:text-white">
						Stocks
					</h1>
				)}
				<p className="text-gray-500">
					Real-time tracking of your favorite assets
				</p>
				<div className="mt-2">
					<MarketStatus date={date} time={time} session={session} />
				</div>
			</div>

			{/* Right Side: Toggle Buttons */}
			<ViewToggle viewMode={viewMode} setViewMode={setViewMode} iconSize={20} />
		</header>
	);
}
