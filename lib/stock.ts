import { StockData } from "./types";

const FALLBACK_SYMBOL = "MSFT";

export async function getStockData(
	inputSymbol: string = FALLBACK_SYMBOL,
): Promise<StockData | null> {
	const stockKey = process.env.FINNHUB_API_KEY;
	if (!stockKey) return null;

	const targetSymbol = inputSymbol.toUpperCase().trim();

	try {
		const [quoteRes, profileRes] = await Promise.all([
			fetch(
				`https://finnhub.io/api/v1/quote?symbol=${targetSymbol}&token=${stockKey}`,
				{ next: { revalidate: 30 } },
			),
			fetch(
				`https://finnhub.io/api/v1/stock/profile2?symbol=${targetSymbol}&token=${stockKey}`,
				{ next: { revalidate: 86400 } },
			),
		]);

		if (!quoteRes.ok) return null;

		const quote = await quoteRes.json();
		const profile = await profileRes.json(); // May be empty for ETFs

		// Handle invalid symbol
		if (quote.c === 0 && quote.d === null) return null;

		return {
			symbol: targetSymbol,
			name: profile.name || targetSymbol,
			price: quote.c,
			change: quote.d,
			changePercent: quote.dp,
			currency: profile.currency || "USD",
			exchange: profile.exchange?.split(" ")[0] || "US", // "NASDAQ NMS" -> "NASDAQ"
			logo: profile.logo || undefined,
		};
	} catch (error) {
		console.error(`Error fetching ${targetSymbol}:`, error);
		return null;
	}
}
