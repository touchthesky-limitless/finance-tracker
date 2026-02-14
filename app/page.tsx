import { getMortgageData } from "@/lib/mortgage";
import { getStockData } from "@/lib/stock";
import { LENDER_TEMPLATES } from "@/lib/lenders";
import { calculateMonthlyPayment } from "@/lib/monthlypayment";
// import { StockData } from "@/lib/types";
import FinancialCard from "@/components/FinancialCard";
import MortgageCard from "@/components/MortgageCard";

const HERO_SYMBOL = "AAPL";
const WATCHLIST_SYMBOLS = ["GOOGL", "AMZN", "MSFT"];

export default async function Home() {
	// 1. Parallel fetching
	const [mortgage, featuredStock, rawWatchlist] = await Promise.all([
		getMortgageData(),
		getStockData(HERO_SYMBOL),
		Promise.all(WATCHLIST_SYMBOLS.map((sym) => getStockData(sym))),
	]);

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const validWatchlist = rawWatchlist.filter((stock) => {
		if (!stock) {
			return false;
		}
		return stock.symbol !== HERO_SYMBOL;
	});

	// 2. Define Baseline Constants
	const LOAN_AMOUNT = 350000; // Standard baseline for comparison
	const marketRate30Years = mortgage?.frm30.rate || 6.5;

	// 3. Calculate Average Payment across all LENDER_TEMPLATES
	const lenderPayments = LENDER_TEMPLATES.map((lender) => {
		return calculateMonthlyPayment(
			LOAN_AMOUNT,
			marketRate30Years + lender.rateOffset,
			30,
		);
	});

	// Sum total payments and divide by count
	const totalPayment = lenderPayments.reduce((sum, p) => sum + p, 0);
	const avgPaymentValue = totalPayment / lenderPayments.length;
	const avgPaymentDisplay = Math.round(avgPaymentValue).toLocaleString("en-US");

	return (
		<main className="min-h-screen bg-gray-50 dark:bg-gray-950 p-8">
			<div className="max-w-6xl mx-auto">
				<h1 className="text-3xl font-bold mb-8">Market Pulse</h1>
				{/* MORTGAGE CARD */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					<MortgageCard
						program="30-Year Fixed"
						rate={marketRate30Years}
						change={mortgage?.frm30.change || 0}
						payment={avgPaymentDisplay}
						date={mortgage?.date}
					/>

					{/* STOCK CARD */}
					{featuredStock ? (
						<FinancialCard
							symbol={featuredStock.symbol}
							name={featuredStock.name}
							price={featuredStock.price}
							change={featuredStock.change}
							changePercent={featuredStock.changePercent}
							currency={featuredStock.currency}
							exchange={featuredStock.exchange}
							logo={featuredStock.logo}
							showFooter={true}
						/>
					) : (
						<div className="p-10 text-center bg-white rounded-xl shadow-sm">
							Loading Market Data...
						</div>
					)}
				</div>

					{/* WATCHLIST GRID */}
					{/* <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{watchlist.map((stock) => {
						if (!stock) return null;
						return (
							<FinancialCard
								key={stock.symbol}
								symbol={stock.symbol}
								name={stock.name}
								price={stock.price}
								change={stock.change}
								changePercent={stock.changePercent}
								currency={stock.currency}
								exchange={stock.exchange}
								logo={stock.logo}
							/>
						);
					})}
				</div> */}
				</div>
			


		</main>
	);
}
