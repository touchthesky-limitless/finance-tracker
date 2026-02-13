import { getMortgageData } from "@/lib/mortgage";
import { getStockData } from "@/lib/stock";
import { LENDER_TEMPLATES } from "@/lib/lenders";
import { calculateMonthlyPayment, formatCurrency } from "@/lib/monthlypayment";
import { getFullMarketInfo } from "@/lib/date";
// import { StockData } from "@/lib/types";
import FinancialCard from "@/components/FinancialCard";
import TrendIndicator from "@/components/TrendIndicator";
import MarketStatus from "@/components/MarketStatus";

const HERO_SYMBOL = "MSFT";
const WATCHLIST_SYMBOLS = ["VTI", "VXUS", "TSLA", "NVDA"];

export default async function Home() {
	// 1. Parallel fetching
	const [mortgage, featuredStock, rawWatchlist] = await Promise.all([
		getMortgageData(),
		getStockData(HERO_SYMBOL),
		Promise.all(WATCHLIST_SYMBOLS.map((sym) => getStockData(sym))),
	]);

	// color number
	const change = featuredStock?.d ?? 0;
	const isPositive = change >= 0;

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const validWatchlist = rawWatchlist.filter((stock) => {
		if (!stock) {
			return false;
		}
		return stock.symbol !== HERO_SYMBOL;
	});

	// Date & time
	const { date, time, session } = getFullMarketInfo();

	// 2. Define Baseline Constants
	const LOAN_AMOUNT = 350000; // Standard baseline for comparison
	const marketRate = mortgage?.frm_30 || 6.5;

	// 3. Calculate Average Payment across all LENDER_TEMPLATES
	const lenderPayments = LENDER_TEMPLATES.map((lender) => {
		return calculateMonthlyPayment(
			LOAN_AMOUNT,
			marketRate + lender.rateOffset,
			30,
		);
	});

	// Sum total payments and divide by count
	const totalPayment = lenderPayments.reduce((sum, p) => sum + p, 0);
	const avgPaymentValue = totalPayment / lenderPayments.length;

	// Format as currency string (e.g., "$2,341")
	const avgPaymentDisplay = formatCurrency(avgPaymentValue);

	return (
		<main className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-6">
			<div className="max-w-4xl w-full">
				<div className="mb-10 text-center">
					<h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
						Market Pulse
					</h1>
					<p className="text-gray-500 mt-2">Real-time financial tracking</p>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					{/* MORTGAGE CARD */}
					<FinancialCard
						title="30-year Fixed Mortgage"
						value={
							mortgage ? (
								<>
									{mortgage.frm_30.toFixed(2)}%
									<span className="text-2xl font-medium text-gray-400 ml-2">
										| Est. {avgPaymentDisplay}/mo
									</span>
								</>
							) : (
								"N/A"
							)
						}
						subtext={
							mortgage ? (
								<div className="flex flex-col">
									<TrendIndicator
										change={mortgage.d || 0}
										percent={mortgage.dp || 0}
										inverse={true}
									/>
									<span className="text-xs text-gray-400 mt-1">
										Updated: {mortgage.week}
									</span>
								</div>
							) : (
								"Data Unavailable"
							)
						}
						color="primary"
					/>

					{/* STOCK CARD */}
					<FinancialCard
						title={
							featuredStock ? (
								<div className="flex items-center gap-2">
									<span className="truncate">{featuredStock.name}</span>
									<span className="text-xs font-bold text-gray-500 bg-gray-100 dark:bg-gray-800 dark:text-gray-400 px-2 py-0.5 rounded-full border border-gray-200 dark:border-gray-700">
										{HERO_SYMBOL}
									</span>
								</div>
							) : (
								"Loading..."
							)
						}
						value={featuredStock ? `$${featuredStock.c.toFixed(2)}` : "N/A"}
						subtext={
							featuredStock ? (
								<div className="flex flex-col">
									<TrendIndicator
										change={featuredStock.d}
										percent={featuredStock.dp}
									/>
									<span className="text-2xl font-medium text-gray-400 mt-1">
										
									<MarketStatus date={date} time={time} session={session}/>
									</span>
								</div>
							) : (
								"Data Unavailable"
							)
						}
						color={isPositive ? "green" : "red"}
					/>
				</div>

				{/* WATCHLIST GRID */}
				{/* <div>
					<h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 mt-4">
						Watchlist
					</h2>

					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
						{validWatchlist.map((stock, index) => (
							<FinancialCard
								key={`${stock.symbol} -${index}`}
								title={
									<div className="flex justify-between items-center w-full">
										<span className="font-semibold truncate text-gray-900 dark:text-white">
											{stock.name}
										</span>
										<span className="text-[10px] font-bold text-gray-500 bg-gray-100 dark:bg-gray-800 dark:text-gray-400 px-2 py-0.5 rounded-full border border-gray-200 dark:border-gray-700 ml-2">
											{stock.symbol}
										</span>
									</div>
								}
								value={`$${stock.c.toFixed(2)}`}
								color={stock.d >= 0 ? "green" : "red"}
								subtext={<TrendIndicator change={stock.d} percent={stock.dp} />}
							/>
						))}
					</div>
				</div> */}
			</div>
		</main>
	);
}
