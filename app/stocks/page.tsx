import { getStockData } from "@/lib/stock";
import { StockData } from "@/lib/types";
import { getFullMarketInfo } from "@/lib/date";
import FinancialCard from "@/components/FinancialCard";
import MarketStatus from "@/components/MarketStatus";

const WATCHLIST = [
	"MSFT",
	"NVDA",
	"VTI",
	"VXUS",
	"MSTR",
	"TSLA",
	"META",
	"GOOG",
	"AAPL",
	"GEHC",
	"COF",
	"RIVN",
];

export default async function StockPage() {
	// fetch ALL stocks in parallel
	const stockPromises = WATCHLIST.map((item) => getStockData(item));

	// wait for all to finish
	const stocks = (await Promise.all(stockPromises)) as (StockData | null)[];

	// Date & time
	const { date, time, session } = getFullMarketInfo();

	return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Market Pulse</h1>
        <p className="text-gray-500 mt-2">Real-time tracking of your favorite assets</p>
		<MarketStatus date={date} time={time} session={session} />
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stocks.map((stock, index) => {
          // SAFETY CHECK: If the API failed for this specific stock
          if (!stock || !stock.symbol) {
            return (
              <div key={index} className="p-6 border rounded-2xl bg-gray-50 dark:bg-gray-800 text-gray-400 italic">
                Data unavailable for {WATCHLIST[index]}
              </div>
            );
          }

          return (
            <FinancialCard
              key={stock.symbol}
              symbol={stock.symbol}
              name={stock.name || "Unknown Company"}
              price={stock.price ?? 0}
              change={stock.change ?? 0}
              changePercent={stock.changePercent ?? 0}
              currency="USD"
              exchange="NASDAQ"
              logo={stock.logo}
            />
          );
        })}
      </div>
    </div>
  );
}