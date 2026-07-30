import { getStockData } from "@/lib/stock";
import { NextResponse } from "next/server";

export const FULL_WATCHLIST = [
	"VTI",
	"MSFT",
	"NVDA",
	"MU",
	"SNDK",
	"VXUS",
	"MSTR",
	"QQQM",
	"TSLA",
	"META",
	"GOOG",
	"AAPL",
];

export async function GET(request: Request) {
	try {
		const { searchParams } = new URL(request.url);
		const symbolsParam = searchParams.get("symbols");
		const limitParam = searchParams.get("limit");

		let watchlist: string[];

		if (symbolsParam) {
			// User‑selected symbols (comma‑separated)
			watchlist = symbolsParam
				.split(",")
				.map((s) => s.trim())
				.filter(Boolean);
		} else if (limitParam) {
			// Limit the default watchlist
			const limit = Number(limitParam);
			watchlist = FULL_WATCHLIST.slice(0, limit);
		} else {
			// Return full watchlist
			watchlist = FULL_WATCHLIST;
		}

		const promises = watchlist.map((symbol) => getStockData(symbol));
		const results = await Promise.all(promises);
		const validStocks = results.filter((stock) => stock !== null);
		return NextResponse.json(validStocks);
	} catch (error) {
		console.error("Stocks API error:", error);
		return NextResponse.json(
			{ error: "Failed to fetch stocks" },
			{ status: 500 },
		);
	}
}
