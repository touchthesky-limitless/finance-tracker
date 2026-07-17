import { getMortgageData } from "@/lib/mortgage";
import { getStockData } from "@/lib/stock";
import { getAverageMortgagePayment } from "@/lib/market-utils";
import FinancialCard from "@/components/FinancialCard";
import MortgageCard from "@/components/MortgageCard";
import { BudgetSummaryCards } from "@/components/Dashboard/BudgetSummaryCards";
import { StockData } from "@/lib/types";

const HERO_SYMBOLS = ["MSFT", "VTI"];

export default async function OverviewPage() {
	// 1. Parallel fetching for speed
	const [mortgage, ...featuredStocks] = await Promise.all([
		getMortgageData(),
		...HERO_SYMBOLS.map(
			(symbol): Promise<StockData | null> => getStockData(symbol),
		),
	]);
	const validStocks = featuredStocks.filter(
		(stock): stock is StockData => stock !== null,
	);

	const marketRate = mortgage?.frm30.rate || 6.5;
	const avgPayment = getAverageMortgagePayment(350000, marketRate);

	return (
		<main className="p-8 space-y-10 bg-white dark:bg-black min-h-screen text-gray-900 dark:text-white">
			<header>
				<h1 className="text-4xl font-black tracking-tight">Command Center</h1>
				<p className="text-gray-500 font-medium">
					Global market pulse & personal wealth.
				</p>
			</header>

			{/* NEW: Personal Finance Section (Zustand Data) */}
			<section className="space-y-4">
				<h2 className="text-[10px] uppercase tracking-[0.2em] text-orange-500 font-black">
					Your Performance
				</h2>
				<BudgetSummaryCards />
			</section>

			{/* EXISTING: Market Pulse Section (Server Data) */}
			<section className="space-y-4">
				<h2 className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-black">
					Market Pulse
				</h2>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{validStocks.map((stock) => (
						<FinancialCard key={stock.symbol} {...stock} showFooter={true} />
					))}
					<MortgageCard
						program="30-Year Fixed"
						rate={marketRate}
						change={mortgage?.frm30.change || 0}
						payment={avgPayment}
						date={mortgage?.date}
					/>
				</div>
			</section>
		</main>
	);
}
