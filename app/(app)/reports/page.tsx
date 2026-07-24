"use client";

import {
	useEffect,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
} from "react";
import { Download } from "lucide-react";

import { DateRangeDropdown } from "@/components/filters/DateRangeDropdown";
import { HeroSummary } from "@/components/features/HeroSummary";
import { MerchantInsights } from "@/components/features/MerchantInsights";
import { PredictedBillsList } from "@/components/features/PredictedBillsList";
import SpendingChart from "@/components/features/SpendingChart";
import { TopBudgetsList } from "@/components/features/TopBudgetsList";
import { Shimmer } from "@/components/ui/Shimmer";
import { useBudgetData } from "@/hooks/useBudgetData";
import {
	CURRENT_YEAR,
	DEFAULT_YEAR_FILTER,
	formatCurrency,
	TIME_PRESETS,
} from "@/utils/formatters";

function subscribeToClient(): () => void {
	return () => {};
}

function getClientSnapshot(): boolean {
	return true;
}

function getServerSnapshot(): boolean {
	return false;
}

function ReportsPageSkeleton() {
	return (
		<div
			role="status"
			aria-label="Loading reports"
			aria-live="polite"
			className="space-y-6"
		>
			<span className="sr-only">Loading reports…</span>

			<section
				aria-hidden="true"
				className="relative z-10 flex flex-col items-center gap-8 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm @4xl:flex-row dark:border-gray-800/80 dark:bg-[#121212]"
			>
				<div className="flex w-full shrink-0 items-center gap-6 @4xl:w-[35%] @4xl:border-r @4xl:border-gray-100 @4xl:pr-8 dark:@4xl:border-gray-800">
					<Shimmer className="size-28 shrink-0 rounded-full" />

					<div className="min-w-0 flex-1 space-y-4">
						{Array.from({ length: 3 }, (_, index) => (
							<div key={index} className="flex items-center gap-3">
								<Shimmer className="size-3 shrink-0 rounded-full" />
								<div className="min-w-0 flex-1 space-y-2">
									<Shimmer className="h-3 w-20 rounded-md" />
									<Shimmer
										className={`h-4 rounded-md ${
											index === 0 ? "w-28" : "w-24"
										}`}
									/>
								</div>
								<Shimmer className="h-4 w-10 rounded-md" />
							</div>
						))}
					</div>
				</div>

				<div className="grid w-full grid-cols-1 gap-6 @2xl:grid-cols-3 @4xl:w-[65%] @4xl:gap-8">
					{Array.from({ length: 3 }, (_, index) => (
						<div key={index} className="space-y-3">
							<Shimmer className="h-3 w-24 rounded-md" />
							<Shimmer
								className={`h-8 rounded-lg ${index === 0 ? "w-36" : "w-32"}`}
							/>
							<Shimmer className="h-12 w-full rounded-xl" />
						</div>
					))}
				</div>
			</section>

			<div className="relative z-10 grid grid-cols-1 gap-6 @5xl:grid-cols-3">
				<section
					aria-hidden="true"
					className="flex min-h-[390px] flex-col rounded-3xl border border-gray-100 bg-white p-6 shadow-sm @5xl:col-span-2 dark:border-gray-800/80 dark:bg-[#121212]"
				>
					<div className="flex items-center justify-between gap-4">
						<Shimmer className="h-5 w-36 rounded-md" />
						<Shimmer className="h-9 w-44 rounded-lg" />
					</div>

					<div className="mb-8 mt-6 space-y-3">
						<Shimmer className="h-11 w-48 rounded-lg" />
						<Shimmer className="h-4 w-40 rounded-md" />
					</div>

					<div className="flex h-48 w-full">
						<div className="mr-3 flex w-10 shrink-0 flex-col justify-between py-1">
							{Array.from({ length: 4 }, (_, index) => (
								<Shimmer key={index} className="h-3 w-8 rounded-md" />
							))}
						</div>

						<div className="relative flex flex-1 items-end gap-1 border-b border-gray-100 px-1 sm:gap-2 dark:border-gray-800/50">
							<div className="pointer-events-none absolute inset-0 flex flex-col justify-between pb-1">
								<div className="mt-2 h-0 border-t border-gray-100 dark:border-gray-800/30" />
								<div className="h-0 border-t border-gray-100 dark:border-gray-800/30" />
								<div className="h-0 border-t border-gray-100 dark:border-gray-800/30" />
								<div className="h-0" />
							</div>

							{[42, 68, 54, 82, 48, 76, 92, 64, 74, 88, 58, 80].map(
								(height, index) => (
									<Shimmer
										key={index}
										className="min-w-0 flex-1 rounded-t-sm"
										style={{ height: `${height}%` }}
									/>
								),
							)}
						</div>
					</div>
				</section>

				<section
					aria-hidden="true"
					className="min-h-[390px] rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800/80 dark:bg-[#121212]"
				>
					<Shimmer className="h-5 w-28 rounded-md" />

					<div className="mt-6 space-y-5">
						{Array.from({ length: 5 }, (_, index) => (
							<div key={index} className="space-y-2.5">
								<div className="flex items-center gap-3">
									<Shimmer className="size-8 shrink-0 rounded-lg" />
									<Shimmer
										className={`h-4 rounded-md ${
											index % 2 === 0 ? "w-32" : "w-24"
										}`}
									/>
									<Shimmer className="ml-auto h-4 w-20 rounded-md" />
								</div>
								<Shimmer className="h-2.5 w-full rounded-full" />
							</div>
						))}
					</div>
				</section>
			</div>

			<div className="relative z-10 grid grid-cols-1 gap-6 @4xl:grid-cols-2">
				{Array.from({ length: 2 }, (_, cardIndex) => (
					<section
						key={cardIndex}
						aria-hidden="true"
						className="min-h-[360px] rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800/80 dark:bg-[#121212]"
					>
						<Shimmer
							className={`h-5 rounded-md ${cardIndex === 0 ? "w-36" : "w-56"}`}
						/>

						<div className="mt-6 space-y-4">
							{Array.from({ length: 5 }, (_, rowIndex) => (
								<div
									key={rowIndex}
									className="flex min-h-12 items-center gap-3"
								>
									<Shimmer className="size-8 shrink-0 rounded-lg" />
									<div className="min-w-0 flex-1 space-y-2">
										<Shimmer
											className={`h-4 rounded-md ${
												rowIndex % 2 === 0 ? "w-36" : "w-28"
											}`}
										/>
										<Shimmer className="h-3 w-44 max-w-full rounded-md" />
									</div>
									<Shimmer className="h-4 w-20 shrink-0 rounded-md" />
								</div>
							))}
						</div>
					</section>
				))}
			</div>
		</div>
	);
}

export default function ReportsPage() {
	const isClient = useSyncExternalStore(
		subscribeToClient,
		getClientSnapshot,
		getServerSnapshot,
	);

	const [timeFilter, setTimeFilter] = useState(DEFAULT_YEAR_FILTER);
	const fallbackDate = TIME_PRESETS.THIS_MONTH;
	const [isHeaderVisible, setIsHeaderVisible] = useState(true);
	const lastScrollY = useRef(0);

	useEffect(() => {
		const scrollContainer = document.querySelector("main.overflow-y-auto");

		if (!scrollContainer) {
			return;
		}

		const handleScroll = () => {
			const currentScrollY = scrollContainer.scrollTop;

			if (currentScrollY <= 20) {
				setIsHeaderVisible(true);
				lastScrollY.current = currentScrollY;
				return;
			}

			const scrollDifference = currentScrollY - lastScrollY.current;

			if (Math.abs(scrollDifference) < 12) {
				return;
			}

			setIsHeaderVisible(scrollDifference < 0);
			lastScrollY.current = currentScrollY;
		};

		scrollContainer.addEventListener("scroll", handleScroll, {
			passive: true,
		});

		return () => {
			scrollContainer.removeEventListener("scroll", handleScroll);
		};
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

		return match ? Number.parseInt(match[0], 10) : CURRENT_YEAR;
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
	}, [stats.expenses, stats.income, stats.remaining]);

	const isLoading = !isClient;

	return (
		<div className="flex min-h-screen flex-col">
			<header
				className={`sticky top-0 z-30 w-full transform-gpu border-b border-gray-200/50 bg-white/80 backdrop-blur-md transition-transform duration-300 ease-in-out dark:border-white/5 dark:bg-[#050505]/80 ${
					isHeaderVisible ? "translate-y-0" : "-translate-y-full"
				}`}
			>
				<div className="flex flex-col justify-between px-4 py-2 md:px-8 md:py-6 lg:flex-row lg:items-end">
					<div className="max-w-2xl">
						<h1 className="mb-1 text-xl font-black uppercase tracking-tighter text-gray-900 md:mb-2 md:text-3xl dark:text-white">
							Financial <span className="text-orange-600">Dashboard</span>
						</h1>

						<div className="flex min-h-5 items-center text-xs font-medium text-gray-500 md:text-sm dark:text-gray-400">
							{isLoading ? (
								<>
									<Shimmer className="mr-2 h-3 w-16 rounded-md" />
									<Shimmer className="mr-2 h-4 w-24 rounded-md" />
									<Shimmer className="h-3 w-52 max-w-[40vw] rounded-md" />
								</>
							) : (
								<p>
									You have{" "}
									<strong className="font-black text-gray-900 dark:text-white">
										{formatCurrency(stats.remaining)}
									</strong>{" "}
									safe to spend before your next payday.
								</p>
							)}
						</div>
					</div>

					<div className="mt-2 flex w-full shrink-0 flex-row items-center gap-3 lg:mt-0 lg:w-auto">
						<div className="flex-1 lg:flex-none">
							<DateRangeDropdown
								onApply={(value) => {
									setTimeFilter(value || fallbackDate);
								}}
							/>
						</div>

						<button
							type="button"
							className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-orange-600/20 transition-all hover:bg-orange-500 active:scale-95 md:px-6"
						>
							<Download size={16} strokeWidth={2.5} />
							<span className="hidden sm:inline">Export</span>
						</button>
					</div>
				</div>
			</header>

			<main className="@container mx-auto w-full max-w-[1600px] flex-1 px-4 py-8 pb-24 md:px-8">
				{isLoading ? (
					<ReportsPageSkeleton />
				) : (
					<>
						<HeroSummary stats={stats} budgetMetrics={budgetMetrics} />

						<div className="relative z-10 mb-6 grid grid-cols-1 gap-6 @5xl:grid-cols-3">
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

						<div className="relative z-10 grid grid-cols-1 gap-6 @4xl:grid-cols-2">
							<MerchantInsights
								topMerchants={topMerchants}
								largestPurchases={largestPurchases}
							/>
							<PredictedBillsList predictedBills={predictedBills} />
						</div>
					</>
				)}
			</main>
		</div>
	);
}
