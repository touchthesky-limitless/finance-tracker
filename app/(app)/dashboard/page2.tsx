import { Suspense } from "react";

import FinancialCard from "@/components/FinancialCard";
import MortgageCard from "@/components/MortgageCard";
import { BudgetSummaryCards } from "@/components/Dashboard/BudgetSummaryCards";
import { Shimmer } from "@/components/ui/Shimmer";
import { getMortgageData } from "@/lib/mortgage";
import { getStockData } from "@/lib/stock";
import { getAverageMortgagePayment } from "@/lib/market-utils";
import type { StockData } from "@/lib/types";

const HERO_SYMBOLS = ["MSFT", "VTI"];

async function MarketPulse() {
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
		<section className="space-y-4">
			<h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
				Market Pulse
			</h2>

			<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
				{validStocks.map((stock) => (
					<FinancialCard key={stock.symbol} {...stock} showFooter />
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
	);
}

function MarketPulseSkeleton() {
	return (
		<section
			role="status"
			aria-label="Loading market pulse"
			aria-live="polite"
			className="space-y-4"
		>
			<span className="sr-only">Loading market pulse…</span>

			<h2
				aria-hidden="true"
				className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500"
			>
				Market Pulse
			</h2>

			<div
				aria-hidden="true"
				className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
			>
				{Array.from({ length: 3 }, (_, cardIndex) => (
					<div
						key={cardIndex}
						className="min-h-52 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#171717]"
					>
						<div className="flex items-start justify-between gap-4">
							<div className="space-y-3">
								<Shimmer className="h-4 w-20 rounded-md" />
								<Shimmer className="h-8 w-32 rounded-lg" />
							</div>

							<Shimmer className="size-10 rounded-xl" />
						</div>

						<div className="mt-8 space-y-3">
							<Shimmer className="h-4 w-full rounded-md" />
							<Shimmer className="h-4 w-4/5 rounded-md" />
						</div>

						<div className="mt-7 flex items-center justify-between">
							<Shimmer className="h-4 w-24 rounded-md" />
							<Shimmer className="h-5 w-16 rounded-md" />
						</div>
					</div>
				))}
			</div>
		</section>
	);
}

export default function DashboardPage() {
	return (
		<main className="min-h-screen space-y-10 bg-white p-8 text-gray-900 dark:bg-black dark:text-white">
			<header>
				<h6 className="text-2xl font-black">Hello</h6>
			</header>

			<section className="space-y-4">
				<h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500">
					Your Performance
				</h2>

				<BudgetSummaryCards />
			</section>

			<Suspense fallback={<MarketPulseSkeleton />}>
				<MarketPulse />
			</Suspense>
		</main>
	);
}
