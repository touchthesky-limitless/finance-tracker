"use client";

import { useMemo } from "react";
import { useUnifiedCategories } from "@/hooks/useUnifiedCategories";
import { CategoryIcon } from "@/components/CategoryIcon";
import { getCategoryTheme } from "@/constants/categories";

interface PredictedBill {
	id: string;
	merchant: string;
	amount: number;
	category: string;
	dueDate: Date;
	dayOfMonth: number;
	frequency: string;
	type: string;
}

// FIX: Simplified the props to only what this component needs
interface RecurringCalendarProps {
	viewDate: Date;
	predictedBills: PredictedBill[];
}

export function RecurringCalendar({
	viewDate,
	predictedBills,
}: RecurringCalendarProps) {
	const { allUnifiedCategories } = useUnifiedCategories("Expense", "All");

	// --- Calendar Math ---
	const calendarData = useMemo(() => {
		const year = viewDate.getFullYear();
		const month = viewDate.getMonth();

		const firstDayOfMonth = new Date(year, month, 1).getDay();
		const daysInMonth = new Date(year, month + 1, 0).getDate();

		const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
		const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i);

		return {
			days,
			blanks,
			monthName: viewDate.toLocaleString("default", { month: "long" }),
			year,
		};
	}, [viewDate]);

	return (
		<div className="space-y-6 animate-in fade-in duration-500">
			{/* FIX: Removed duplicate calendar header */}

			{/* The Grid */}
			<div className="grid grid-cols-7 gap-px bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-2xl md:rounded-[2.5rem] overflow-hidden shadow-xl md:shadow-2xl">
				{/* Day Labels */}
				{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
					<div
						key={day}
						className="bg-gray-50 dark:bg-[#0d0d0d] py-2 md:py-4 text-center text-[8px] md:text-[10px] font-black uppercase tracking-widest md:tracking-[0.2em] text-gray-500 dark:text-gray-600"
					>
						<span className="md:hidden">{day.charAt(0)}</span>
						<span className="hidden md:inline">{day}</span>
					</div>
				))}

				{/* Blank Days */}
				{calendarData.blanks.map((i) => (
					<div
						key={`blank-${i}`}
						className="bg-gray-100 dark:bg-[#080808] min-h-20 lg:min-h-37.5"
					/>
				))}

				{/* Actual Days */}
				{calendarData.days.map((day) => {
					// Find all bills hitting on this specific day
					const billsOnDay = predictedBills.filter((b) => b.dayOfMonth === day);

					return (
						<div
							key={day}
							className="bg-gray-50 dark:bg-[#0d0d0d] min-h-20 lg:min-h-37.5 p-1 md:p-2 border-t border-black/5 dark:border-white/5 relative group hover:bg-black/5 dark:hover:bg-white/2 transition-colors flex flex-col"
						>
							<span className="text-[10px] font-bold text-gray-500 dark:text-gray-600 group-hover:text-gray-900 dark:group-hover:text-white transition-colors pl-1">
								{day}
							</span>

							{/* Bills Container with hidden scrollbar for overflow */}
							<div className="mt-1 md:mt-2 space-y-1 flex-1 overflow-y-auto scrollbar-hide">
								{billsOnDay.map((bill) => {
									const categoryData = allUnifiedCategories.find(
										(c) => c.name.toLowerCase() === bill.category.toLowerCase(),
									);
									const theme =
										categoryData?.theme || getCategoryTheme("Uncategorized");
									const iconName = categoryData?.icon || "HelpCircle";

									return (
										<div
											key={bill.id}
											className={`flex items-center justify-between gap-1.5 p-1 rounded-md border ${theme.border} bg-gray-500/10 dark:bg-white/10 overflow-hidden min-w-0`}
										>
											<div className="flex items-center gap-1 min-w-0">
												<div className="hidden lg:block shrink-0">
													<CategoryIcon
														name={iconName}
														size={10}
														colorClass={theme.text}
													/>
												</div>
												<span
													className={`text-[8px] md:text-[10px] font-black uppercase truncate ${theme.text}`}
												>
													{bill.merchant}
												</span>
											</div>
											<span
												className={`hidden md:inline text-[8px] md:text-[10px] font-bold ${theme.text} ml-1 shrink-0`}
											>
												${Math.round(bill.amount)}
											</span>
										</div>
									);
								})}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
