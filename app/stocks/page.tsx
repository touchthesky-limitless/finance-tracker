import { getStockData } from "@/lib/stock";
import { StockData } from "@/lib/types";
import { getFullMarketInfo } from "@/lib/date";
import FinancialCard from "@/components/FinancialCard";
import TrendIndicator from "@/components/TrendIndicator";
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
		<main className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
			<div className="max-w-7xl mx-auto">
				{/* Header */}
				<div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
					<div>
						<h1 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
							Stock Watchlist
						</h1>
						<p className="text-gray-500 mt-2">
							Real-time market data for your portfolio
						</p>
						<MarketStatus date={date} time={time} session={session} />
					</div>

					{/* <div className="text-sm text-gray-400 bg-white dark:bg-gray-800 px-4 py-2 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm">
						Market Status:{" "}
						<span className="text-green-500 font-semibold">{session}</span>
					</div> */}
				</div>

				{/* Grid of Cards */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
					{stocks.map((stock, index) => {
						const price = stock?.c ?? 0;
						const change = stock?.d ?? 0;
						const percent = stock?.dp ?? 0;
						const isPositive = change >= 0;

						return (
							<FinancialCard
								key={`${stock?.symbol} -${index}`}
								title={
									<div className="flex items-center gap-2">
										<span className="truncate">{stock?.name}</span>
										<span className="text-xs font-bold text-gray-500 bg-gray-100 dark:bg-gray-800 dark:text-gray-400 px-2 py-0.5 rounded-full border border-gray-200 dark:border-gray-700">
											{stock?.symbol}
										</span>
									</div>
								}
								color={isPositive ? "green" : "red"}
								value={
									stock ? (
										<span className="flex items-baseline gap-2">
											${price.toFixed(2)}
										</span>
									) : (
										"N/A"
									)
								}
								subtext={
									stock ? (
										<div className="flex flex-col">
											<TrendIndicator change={change} percent={percent} />
											<span className="text-xs text-gray-400 mt-1">
												Previous Close: ${stock.pc?.toFixed(2)}
											</span>
										</div>
									) : (
										<span className="text-red-400">Failed to load data</span>
									)
								}
							/>
						);
					})}
				</div>
			</div>
		</main>
	);
}
