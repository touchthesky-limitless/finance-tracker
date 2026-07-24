"use client";

import { useState } from "react";
import { useBudgetData } from "@/hooks/useBudgetData";
import { useUnifiedCategories } from "@/hooks/useUnifiedCategories";
import { CategoryIcon } from "@/components/CategoryIcon";
import { getCategoryTheme } from "@/constants/categories";
import {
	Calendar as CalendarIcon,
	LayoutGrid,
	ChevronLeft,
	ChevronRight,
} from "lucide-react";
import { useBudgetStore } from "@/store/useBudgetStore";
import { RecurringGrid } from "@/components/RecurringGrid";
import { RecurringCalendar } from "@/components/RecurringCalendar";
import { Shimmer } from "@/components/ui/Shimmer";

function RecurringPageSkeleton() {
	return (
		<div
			role="status"
			aria-label="Loading recurring bills"
			aria-live="polite"
			className="mx-auto min-h-screen max-w-7xl space-y-8 p-4 text-gray-900 md:space-y-10 md:p-8 dark:text-white"
		>
			<span className="sr-only">Loading recurring bills…</span>

			<div
				aria-hidden="true"
				className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end lg:gap-6"
			>
				<div className="space-y-3">
					<Shimmer className="h-9 w-72 max-w-[80vw] rounded-lg" />
					<Shimmer className="h-10 w-24 rounded-xl" />
				</div>

				<Shimmer className="h-10 w-48 rounded-2xl" />
			</div>

			<div
				aria-hidden="true"
				className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
			>
				{Array.from({ length: 6 }, (_, index) => (
					<div
						key={index}
						className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#111]"
					>
						<div className="flex items-start justify-between gap-3">
							<div className="flex min-w-0 items-center gap-3">
								<Shimmer className="size-10 shrink-0 rounded-xl" />
								<div className="min-w-0 space-y-2">
									<Shimmer
										className={`h-4 rounded-md ${
											index % 2 === 0 ? "w-32" : "w-24"
										}`}
									/>
									<Shimmer className="h-3 w-20 rounded-md" />
								</div>
							</div>

							<Shimmer className="h-5 w-20 rounded-md" />
						</div>

						<Shimmer className="mt-6 h-3 w-full rounded-md" />
						<Shimmer className="mt-3 h-3 w-3/4 rounded-md" />
						<Shimmer className="mt-6 h-9 w-full rounded-xl" />
					</div>
				))}
			</div>

			<div aria-hidden="true" className="space-y-4">
				<div className="flex items-center gap-2">
					<Shimmer className="size-2 rounded-full" />
					<Shimmer className="h-3 w-56 rounded-md" />
				</div>

				<div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
					{Array.from({ length: 3 }, (_, index) => (
						<div
							key={index}
							className="flex items-center gap-3 rounded-2xl border border-orange-500/10 p-4"
						>
							<Shimmer className="size-9 shrink-0 rounded-xl" />
							<div className="min-w-0 flex-1 space-y-2">
								<Shimmer className="h-4 w-32 rounded-md" />
								<Shimmer className="h-3 w-24 rounded-md" />
							</div>
							<Shimmer className="h-5 w-20 rounded-md" />
							<Shimmer className="h-8 w-20 rounded-lg" />
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

export default function RecurringPage() {
	const { predictedBills, potentialSubscriptions } = useBudgetData("all");
	const { allUnifiedCategories } = useUnifiedCategories("Expense", "All");
	const confirmRecurring = useBudgetStore((state) => state.confirmRecurring);
	const hasHydrated = useBudgetStore((state) => state.hasHydrated);

	const [view, setView] = useState<"grid" | "calendar">("grid");
	const [viewDate, setViewDate] = useState(new Date());

	const numberFormatter = new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	});

	const handleConfirm = (merchantName: string) => {
		let cleanedName = merchantName.replace(
			/^(SQ\s\*|TST\s\*|PY\s\*|PAYMENT\s\*)/i,
			"",
		);
		const nameParts = cleanedName.split(" ");
		const finalParts = [];
		for (let i = 0; i < nameParts.length; i++) {
			if (i < 2) {
				finalParts.push(nameParts[i]);
			}
		}
		cleanedName = finalParts.join(" ");
		confirmRecurring(cleanedName);
	};

	const monthName = viewDate.toLocaleString("default", { month: "long" });
	const year = viewDate.getFullYear();

	if (!hasHydrated) {
		return <RecurringPageSkeleton />;
	}

	// Potential Subscriptions Logic
	const potentialSubElements = [];
	for (let i = 0; i < potentialSubscriptions.length; i++) {
		const sub = potentialSubscriptions[i];
		let categoryData = undefined;

		for (let j = 0; j < allUnifiedCategories.length; j++) {
			if (
				allUnifiedCategories[j].name.toLowerCase() ===
				sub.category.toLowerCase()
			) {
				categoryData = allUnifiedCategories[j];
				break;
			}
		}

		const theme = categoryData?.theme || getCategoryTheme("Uncategorized");

		potentialSubElements.push(
			<div
				key={sub.id}
				// 1. Added overflow-hidden to ensure nothing breaks the border radius
				className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-orange-500/5 dark:bg-orange-500/3 border border-orange-500/20 dark:border-orange-500/10 rounded-2xl group hover:border-orange-500/40 dark:hover:border-orange-500/30 transition-all gap-4 overflow-hidden"
			>
				{/* 2. Added flex-1 and min-w-0 to force this block to shrink and truncate text */}
				<div className="flex items-center gap-3 w-full sm:w-auto flex-1 min-w-0">
					<div className="p-2 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-500 shrink-0">
						<CategoryIcon
							name={categoryData?.icon || "Search"}
							size={18}
							colorClass={theme.text}
						/>
					</div>
					{/* Added flex-1 here as well to pass the truncation constraint down */}
					<div className="min-w-0 flex-1">
						<p className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-500 transition-colors truncate">
							{sub.merchant}
						</p>
						<p className="text-[10px] text-gray-500 dark:text-gray-600 font-medium truncate">
							Charged {new Date(sub.date).toLocaleDateString()}
						</p>
					</div>
				</div>

				{/* 3. Added shrink-0 to perfectly protect the price and button from getting squeezed */}
				<div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto mt-2 sm:mt-0 shrink-0">
					<span className="text-sm font-black text-gray-900 dark:text-white shrink-0">
						{numberFormatter.format(Math.abs(sub.amount))}
					</span>
					<button
						type="button"
						aria-label="Confirm"
						onClick={() => handleConfirm(sub.merchant)}
						className="text-[10px] font-black uppercase tracking-widest px-4 py-2 sm:px-3 sm:py-1.5 bg-orange-600 hover:bg-orange-500 dark:bg-orange-500 dark:hover:bg-orange-400 text-white rounded-lg active:scale-95 transition-all shadow-lg shadow-orange-500/20 shrink-0"
					>
						Confirm
					</button>
				</div>
			</div>,
		);
	}

	return (
		<div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 md:space-y-10 min-h-screen text-gray-900 dark:text-white">
			{/* --- HEADER & TAB SWITCHER --- */}
			<div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 lg:gap-6">
				<div className="space-y-3">
					<h1 className="text-2xl md:text-3xl font-black tracking-tighter uppercase italic">
						Predicted Bills & Subs
					</h1>
					<div className="flex bg-gray-100 dark:bg-[#0d0d0d] p-1 rounded-xl border border-black/5 dark:border-white/5 w-fit">
						<button
							type="button"
							aria-label="Grid"
							onClick={() => setView("grid")}
							className={`flex items-center gap-2 px-4 py-2 md:py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
								view === "grid"
									? "bg-white text-black dark:bg-white dark:text-black shadow-sm"
									: "text-gray-500 hover:text-gray-900 dark:hover:text-white"
							}`}
						>
							{/* FIX: Restored the Grid text */}
							<LayoutGrid size={14} />
						</button>
						<button
							type="button"
							aria-label="Calendar"
							onClick={() => setView("calendar")}
							className={`flex items-center gap-2 px-4 py-2 md:py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
								view === "calendar"
									? "bg-white text-black dark:bg-white dark:text-black shadow-sm"
									: "text-gray-500 hover:text-gray-900 dark:hover:text-white"
							}`}
						>
							{/* FIX: Restored the Calendar text */}
							<CalendarIcon size={14} />
						</button>
					</div>
				</div>

				{view === "calendar" && (
					<div className="flex items-center justify-between lg:justify-start gap-4 bg-gray-50 dark:bg-[#0d0d0d] border border-black/5 dark:border-white/5 px-4 py-3 md:py-2 rounded-2xl w-full lg:w-auto">
						<button
							type="button"
							aria-label="Left"
							onClick={() =>
								setViewDate(
									new Date(viewDate.setMonth(viewDate.getMonth() - 1)),
								)
							}
							className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors"
						>
							<ChevronLeft
								size={18}
								className="text-gray-500 hover:text-gray-900 dark:hover:text-white"
							/>
						</button>
						<span className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest min-w-30 text-center">
							{monthName} {year}
						</span>
						<button
							type="button"
							aria-label="Right"
							onClick={() =>
								setViewDate(
									new Date(viewDate.setMonth(viewDate.getMonth() + 1)),
								)
							}
							className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors"
						>
							<ChevronRight
								size={18}
								className="text-gray-500 hover:text-gray-900 dark:hover:text-white"
							/>
						</button>
					</div>
				)}
			</div>

			{/* --- RENDERING EXTRACTED COMPONENTS --- */}
			{view === "grid" ? (
				<RecurringGrid predictedBills={predictedBills} />
			) : (
				<RecurringCalendar
					viewDate={viewDate}
					predictedBills={predictedBills}
				/>
			)}

			{/* --- POTENTIAL SUBSCRIPTIONS SECTION --- */}
			{potentialSubscriptions.length > 0 && (
				<div className="space-y-4">
					<div className="flex items-center gap-2">
						<div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse shrink-0" />
						<h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 truncate">
							Potential Subscriptions Detected
						</h2>
					</div>
					<div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
						{potentialSubElements}
					</div>
				</div>
			)}
		</div>
	);
}
