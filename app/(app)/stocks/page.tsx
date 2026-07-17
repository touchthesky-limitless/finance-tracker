import { getStockData } from "@/lib/stock";
import { StockData } from "@/lib/types";
import { getFullMarketInfo } from "@/lib/date";
import StockClientView from "@/components/StockClientView";
import MarketStatus from "@/components/MarketStatus";
import React from "react";

const WATCHLIST = [
	"MSFT",
	"NVDA",
	"MU",
	"SNDK",
	"VTI",
	"VXUS",
	"MSTR",
	"QQQM",
	"TSLA",
	"META",
	"GOOG",
	"AAPL",
];

// Extract the Session type dynamically from the component props
type MarketStatusProps = React.ComponentProps<typeof MarketStatus>;
type Session = MarketStatusProps["session"];

export interface MarketInfo {
	date: string;
	time: string;
	session: Session;
}

export default async function StockPage() {
	const stockPromises = WATCHLIST.map((item) => getStockData(item));
	const stocks = (await Promise.all(stockPromises)) as (StockData | null)[];

	const rawMarketInfo = getFullMarketInfo();

	// Cast the session directly here
	const marketInfo: MarketInfo = {
		...rawMarketInfo,
		session: rawMarketInfo.session as Session,
	};

	return <StockClientView stocks={stocks} marketInfo={marketInfo} />;
}
