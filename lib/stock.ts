import { StockData } from "./types";

const FALLBACK_SYMBOL = "MSFT";

export async function getStockData(
	symbol: string = FALLBACK_SYMBOL,
): Promise<StockData | null> {
	const stockKey = process.env.FINNHUB_API_KEY;
	if (!stockKey) return null;

	const targetSymbol = symbol.toUpperCase();

	// Helper: Attempt to fetch a specific symbol
	const fetchOne = async (sym: string): Promise<StockData | null> => {
		try {
			// 👇 Fetch Price (Quote) AND Profile (Name) at the same time
			const [quoteRes, profileRes] = await Promise.all([
				fetch(
					`https://finnhub.io/api/v1/quote?symbol=${sym}&token=${stockKey}`,
					{ next: { revalidate: 30 } },
				),
				fetch(
					`https://finnhub.io/api/v1/stock/profile2?symbol=${sym}&token=${stockKey}`,
					{ next: { revalidate: 86400 } }, // Profile data rarely changes, cache for 24h
				),
			]);

			if (!quoteRes.ok || !profileRes.ok) return null;

			const quote = await quoteRes.json();
			const profile = await profileRes.json();

			// Check if symbol is invalid (returns all zeros)
			if (quote.c === 0 && quote.d === null) return null;

			return {
				name: profile.name || sym, // 👇 Use fetched name, fallback to symbol if missing
				symbol: profile.ticker,
				c: quote.c,
				d: quote.d,
				dp: quote.dp,
				pc: quote.pc,
				logo: profile.logo || undefined,
			};
		} catch (error) {
			console.error(`❌ Error fetching ${targetSymbol}:`, error);
			return null;
		}
	};

	// try the requested symbol first
	let data = await fetchOne(targetSymbol);

	// if failed, fall back to MSFT
	if (!data) {
		console.warn(`⚠️ Symbol '${targetSymbol}' failed. Falling back to ${FALLBACK_SYMBOL}.`);
		data = await(fetchOne(FALLBACK_SYMBOL));
	}

	return data;
}
