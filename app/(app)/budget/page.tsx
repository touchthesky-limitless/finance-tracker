"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Download } from "lucide-react";
import { useBudgetData } from "@/hooks/useBudgetData";
import {
	formatCurrency,
	CURRENT_YEAR,
	DEFAULT_YEAR_FILTER,
	TIME_PRESETS,
} from "@/utils/formatters";
import { DateRangeDropdown } from "@/components/filters/DateRangeDropdown";

import { HeroSummary } from "@/components/features/HeroSummary";
import { SpendingChart } from "@/components/features/SpendingChart";
import { TopBudgetsList } from "@/components/features/TopBudgetsList";
import { MerchantInsights } from "@/components/features/MerchantInsights";
import { PredictedBillsList } from "@/components/features/PredictedBillsList";

export default function OverviewPage() {
	const [timeFilter, setTimeFilter] = useState(DEFAULT_YEAR_FILTER);
	const FALL_BACK_DATE = TIME_PRESETS.THIS_MONTH;

	// --- Smart Header State ---
	const [isHeaderVisible, setIsHeaderVisible] = useState(true);
	const lastScrollY = useRef(0);

	// --- Scroll Event Listener targeting <main> ---
	// --- Mobile-Optimized Scroll Event Listener ---
	useEffect(() => {
		// Target the layout's specific scrolling container using its class instead of tag name
		const scrollContainer = document.querySelector(".overflow-y-auto");
		if (!scrollContainer) return;

		const handleScroll = () => {
			const currentScrollY = scrollContainer.scrollTop;

			// 1. Handle mobile bounce/overscroll at the very top
			if (currentScrollY <= 20) {
				setIsHeaderVisible(true);
				lastScrollY.current = currentScrollY;
				return;
			}

			// 2. Prevent mobile touch jitter by requiring a minimum scroll distance
			const scrollDifference = currentScrollY - lastScrollY.current;

			// Ignore tiny micro-scrolls less than 12 pixels
			if (Math.abs(scrollDifference) < 12) {
				return;
			}

			// 3. Determine direction
			if (scrollDifference > 0) {
				setIsHeaderVisible(false); // Scrolling down
			} else {
				setIsHeaderVisible(true); // Scrolling up
			}

			lastScrollY.current = currentScrollY;
		};

		scrollContainer.addEventListener("scroll", handleScroll, { passive: true });

		return () => scrollContainer.removeEventListener("scroll", handleScroll);
	}, []);

	const {
		stats,
		categoryData,
		monthlyData,
		maxMonthlyValue,
		topMerchants,
		largestPurchases,
		predictedBills,
	} = useBudgetData(timeFilter);

	const activeYear = useMemo(() => {
		const match = timeFilter.match(/\d{4}/);
		if (match) {
			return parseInt(match[0]);
		}
		return CURRENT_YEAR;
	}, [timeFilter]);

	const budgetMetrics = useMemo(() => {
		let remaining = 0;
		let spent = 0;

		if (stats.income > 0) {
			remaining = Math.min(
				Math.round((Math.max(stats.remaining, 0) / stats.income) * 100),
				100,
			);
			spent = Math.min(Math.round((stats.expenses / stats.income) * 100), 100);
		}

		return { remaining, spent };
	}, [stats.income, stats.remaining, stats.expenses]);

	return (
		<div className="flex flex-col min-h-screen">
			<header
				className={`sticky top-0 z-30 w-full bg-white/80 dark:bg-[#050505]/80 backdrop-blur-md transform-gpu border-b border-gray-200/50 dark:border-white/5 transition-transform duration-300 ease-in-out ${
					isHeaderVisible ? "translate-y-0" : "-translate-y-full"
				}`}
			>
				<div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 py-4 md:py-6 px-4 md:px-8">
					<div className="max-w-2xl">
						<h1 className="text-xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tighter mb-1 md:mb-2 uppercase">
							Financial <span className="text-orange-600">Dashboard</span>
						</h1>
						<p className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400">
							You have{" "}
							<strong className="text-gray-900 dark:text-white font-black">
								{formatCurrency(stats.remaining)}
							</strong>{" "}
							safe to spend before your next payday.
						</p>
					</div>

					<div className="flex flex-row items-center gap-3 shrink-0 w-full lg:w-auto mt-2 lg:mt-0">
						<div className="flex-1 lg:flex-none">
							<DateRangeDropdown
								onApply={(val) => {
									let selectedDate = val;
									if (!selectedDate) {
										selectedDate = FALL_BACK_DATE;
									}
									setTimeFilter(selectedDate);
								}}
							/>
						</div>
						<button className="flex items-center justify-center gap-2 px-4 md:px-6 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-orange-600/20 active:scale-95 shrink-0">
							<Download size={16} strokeWidth={2.5} />
							<span className="hidden sm:inline">Export</span>
						</button>
					</div>
				</div>
			</header>

			<main className="@container flex-1 w-full max-w-[1600px] mx-auto px-4 md:px-8 py-8 pb-24">
				<HeroSummary stats={stats} budgetMetrics={budgetMetrics} />

				<div className="grid grid-cols-1 @5xl:grid-cols-3 gap-6 mb-6 relative z-10">
					<SpendingChart
						stats={stats}
						monthlyData={monthlyData}
						activeYear={activeYear}
						timeFilter={timeFilter}
						maxMonthlyValue={maxMonthlyValue}
						onFilterChange={setTimeFilter}
					/>
					<TopBudgetsList
						categoryData={categoryData}
						unreviewedCount={stats.unreviewedCount}
					/>
				</div>

				<div className="grid grid-cols-1 @4xl:grid-cols-2 gap-6 relative z-10">
					<MerchantInsights
						topMerchants={topMerchants}
						largestPurchases={largestPurchases}
					/>
					<PredictedBillsList predictedBills={predictedBills} />
				</div>
			</main>
		</div>
	);
}
