import { getMortgageData } from "@/lib/mortgage";
import { getStockData } from "@/lib/stock";
import { getAverageMortgagePayment } from "@/lib/market-utils";
import FinancialCard from "@/components/FinancialCard";
import MortgageCard from "@/components/MortgageCard";
import { BudgetSummaryCards } from "@/components/Dashboard/BudgetSummaryCards";

const HERO_SYMBOL = "MSFT";

export default async function OverviewPage() {
    // 1. Parallel fetching for speed
    const [mortgage, featuredStock] = await Promise.all([
        getMortgageData(),
        getStockData(HERO_SYMBOL),
    ]);

    const marketRate = mortgage?.frm30.rate || 6.5;
    const avgPayment = getAverageMortgagePayment(350000, marketRate);

    return (
        <main className="p-8 space-y-10 bg-black min-h-screen text-white">
            <header>
                <h1 className="text-4xl font-black tracking-tight">Command Center</h1>
                <p className="text-gray-500 font-medium">Global market pulse & personal wealth.</p>
            </header>

            {/* NEW: Personal Finance Section (Zustand Data) */}
            <section className="space-y-4">
                <h2 className="text-[10px] uppercase tracking-[0.2em] text-orange-500 font-black">Your Performance</h2>
                <BudgetSummaryCards />
            </section>

            {/* EXISTING: Market Pulse Section (Server Data) */}
            <section className="space-y-4">
                <h2 className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-black">Market Pulse</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <MortgageCard
                        program="30-Year Fixed"
                        rate={marketRate}
                        change={mortgage?.frm30.change || 0}
                        payment={avgPayment}
                        date={mortgage?.date}
                    />
                    {featuredStock && (
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
                    )}
                </div>
            </section>
        </main>
    );
}