"use client";

import { useMemo, useState } from "react";
import { useBudgetData } from "@/hooks/useBudgetData";
import { useUnifiedCategories } from "@/hooks/useUnifiedCategories";
import { CategoryIcon } from "@/components/CategoryIcon";
import { getCategoryTheme } from "@/constants/categories";
import {
	Calendar as CalendarIcon,
	LayoutGrid,
	ArrowUpRight,
	ChevronLeft,
	ChevronRight,
} from "lucide-react";
import { useBudgetStore } from "@/store/useBudgetStore";

export default function RecurringPage() {
	const { predictedBills, potentialSubscriptions } = useBudgetData("all");
	const { allUnifiedCategories } = useUnifiedCategories("Expense", "All");
	const confirmRecurring = useBudgetStore((state) => state.confirmRecurring);

	// --- State for Tabs & Date Navigation ---
	const [view, setView] = useState<"grid" | "calendar">("grid");
	const [viewDate, setViewDate] = useState(new Date());

	const numberFormatter = new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	});

	const getOrdinal = (n: number) => {
		const s = ["th", "st", "nd", "rd"],
			v = n % 100;
		return n + (s[(v - 20) % 10] || s[v] || s[0]);
	};

	const handleConfirm = (merchantName: string) => {
		// CLEAN THE NAME: Match the logic used in useBudgetData
		const cleanedName = merchantName
			.replace(/^(SQ\s\*|TST\s\*|PY\s\*|PAYMENT\s\*)/i, "")
			.split(" ")
			.slice(0, 2)
			.join(" ");

		confirmRecurring(cleanedName);
	};

	// --- Calendar Math ---
	const calendar = useMemo(() => {
		const year = viewDate.getFullYear();
		const month = viewDate.getMonth();
		const firstDay = new Date(year, month, 1).getDay();
		const daysInMonth = new Date(year, month + 1, 0).getDate();

		return {
			days: Array.from({ length: daysInMonth }, (_, i) => i + 1),
			blanks: Array.from({ length: firstDay }, (_, i) => i),
			monthName: viewDate.toLocaleString("default", { month: "long" }),
			year,
		};
	}, [viewDate]);

	return (
		<div className="p-8 max-w-7xl mx-auto space-y-10 min-h-screen text-white">
			{/* --- HEADER & TAB SWITCHER --- */}
			<div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
				<div className="space-y-2">
					<h1 className="text-3xl font-black tracking-tighter uppercase italic">
						Predicted Bills & Subscriptions
					</h1>
					<div className="flex bg-[#0d0d0d] p-1 rounded-xl border border-white/5 w-fit">
						<button
							onClick={() => setView("grid")}
							className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
								view === "grid"
									? "bg-white text-black"
									: "text-gray-500 hover:text-white"
							}`}
						>
							<LayoutGrid size={14} /> Grid
						</button>
						<button
							onClick={() => setView("calendar")}
							className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
								view === "calendar"
									? "bg-white text-black"
									: "text-gray-500 hover:text-white"
							}`}
						>
							<CalendarIcon size={14} /> Calendar
						</button>
					</div>
				</div>

				{view === "calendar" && (
					<div className="flex items-center gap-4 bg-[#0d0d0d] border border-white/5 px-4 py-2 rounded-2xl">
						<button
							onClick={() =>
								setViewDate(
									new Date(viewDate.setMonth(viewDate.getMonth() - 1)),
								)
							}
						>
							<ChevronLeft
								size={18}
								className="text-gray-500 hover:text-white"
							/>
						</button>
						<span className="text-xs font-black uppercase tracking-widest min-w-30 text-center">
							{calendar.monthName} {calendar.year}
						</span>
						<button
							onClick={() =>
								setViewDate(
									new Date(viewDate.setMonth(viewDate.getMonth() + 1)),
								)
							}
						>
							<ChevronRight
								size={18}
								className="text-gray-500 hover:text-white"
							/>
						</button>
					</div>
				)}
			</div>

			{/* --- GRID VIEW --- */}
{/* --- GRID VIEW --- */}
            {view === "grid" && (
                <div className="space-y-12 animate-in fade-in zoom-in-95 duration-300">
                    
                    {/* SECTION 1: SUBSCRIPTIONS */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-gray-500">
                                Active Subscriptions
                            </h2>
                            <span className="px-2 py-0.5 rounded bg-white/5 text-gray-400 text-[10px] font-bold">
                                {predictedBills.filter(b => b.type === "subscription").length}
                            </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {predictedBills
                                .filter((bill) => bill.type === "subscription")
                                .map((bill) => {
                                    const categoryData = allUnifiedCategories.find(
                                        (c) => c.name.toLowerCase() === bill.category.toLowerCase(),
                                    );
                                    const theme = categoryData?.theme || getCategoryTheme("Uncategorized");
                                    const iconName = categoryData?.icon || "HelpCircle";

                                    return (
                                        <div
                                            key={bill.id}
                                            className="relative group bg-[#0d0d0d] border border-white/5 rounded-[2.5rem] p-6 hover:bg-white/2 transition-all duration-300"
                                        >
                                            <div className="flex justify-between items-start mb-10">
                                                <div
                                                    className={`w-14 h-14 rounded-3xl flex items-center justify-center border-2 ${theme.border} bg-opacity-10 ${theme.border} transition-transform group-hover:rotate-6`}
                                                >
                                                    <CategoryIcon
                                                        name={iconName}
                                                        size={28}
                                                        colorClass={theme.text}
                                                    />
                                                </div>
                                                <div className="flex items-center gap-1.5 text-emerald-500 font-black text-[11px] uppercase tracking-tighter bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                                                    <CalendarIcon size={12} /> {getOrdinal(bill.dayOfMonth)}
                                                </div>
                                            </div>
                                            <div className="space-y-1 mb-8">
                                                <h3 className="text-xl font-black truncate uppercase tracking-tight">
                                                    {bill.merchant}
                                                </h3>
                                                <p
                                                    className={`text-[10px] font-black uppercase tracking-widest ${theme.text}`}
                                                >
                                                    {bill.category}
                                                </p>
                                            </div>
                                            <div className="flex justify-between items-end pt-6 border-t border-white/5">
                                                <div>
                                                    <p className="text-[10px] text-gray-600 font-black uppercase mb-1">
                                                        Price
                                                    </p>
                                                    <p className="text-2xl font-black">
                                                        {numberFormatter.format(bill.amount)}
                                                    </p>
                                                </div>
                                                <button className="p-3 bg-white/5 rounded-2xl hover:bg-white text-gray-500 hover:text-black transition-all">
                                                    <ArrowUpRight size={20} />
                                                </button>
                                            </div>
                                            <div
                                                className={`absolute -z-10 inset-0 opacity-0 group-hover:opacity-10 blur-3xl transition-opacity pointer-events-none rounded-[2.5rem] ${theme.bg}`}
                                            />
                                        </div>
                                    );
                                })}
                        </div>
                    </div>

                    {/* SECTION 2: UPCOMING BILLS */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-gray-500">
                                Upcoming Recurring Bills
                            </h2>
                            <span className="px-2 py-0.5 rounded bg-white/5 text-gray-400 text-[10px] font-bold">
                                {predictedBills.filter(b => b.type === "bill").length}
                            </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {predictedBills
                                .filter((bill) => bill.type === "bill")
                                .map((bill) => {
                                    const categoryData = allUnifiedCategories.find(
                                        (c) => c.name.toLowerCase() === bill.category.toLowerCase(),
                                    );
                                    const theme = categoryData?.theme || getCategoryTheme("Uncategorized");
                                    const iconName = categoryData?.icon || "HelpCircle";

                                    return (
                                        <div
                                            key={bill.id}
                                            className="relative group bg-[#0d0d0d] border border-white/5 rounded-[2.5rem] p-6 hover:bg-white/2 transition-all duration-300"
                                        >
                                            <div className="flex justify-between items-start mb-10">
                                                <div
                                                    className={`w-14 h-14 rounded-3xl flex items-center justify-center border-2 ${theme.border} bg-opacity-10 ${theme.border} transition-transform group-hover:rotate-6`}
                                                >
                                                    <CategoryIcon
                                                        name={iconName}
                                                        size={28}
                                                        colorClass={theme.text}
                                                    />
                                                </div>
                                                <div className="flex items-center gap-1.5 text-emerald-500 font-black text-[11px] uppercase tracking-tighter bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                                                    <CalendarIcon size={12} /> {getOrdinal(bill.dayOfMonth)}
                                                </div>
                                            </div>
                                            <div className="space-y-1 mb-8">
                                                <h3 className="text-xl font-black truncate uppercase tracking-tight">
                                                    {bill.merchant}
                                                </h3>
                                                <p
                                                    className={`text-[10px] font-black uppercase tracking-widest ${theme.text}`}
                                                >
                                                    {bill.category}
                                                </p>
                                            </div>
                                            <div className="flex justify-between items-end pt-6 border-t border-white/5">
                                                <div>
                                                    <p className="text-[10px] text-gray-600 font-black uppercase mb-1">
                                                        Estimated Cost
                                                    </p>
                                                    <p className="text-2xl font-black">
                                                        {numberFormatter.format(bill.amount)}
                                                    </p>
                                                </div>
                                                <button className="p-3 bg-white/5 rounded-2xl hover:bg-white text-gray-500 hover:text-black transition-all">
                                                    <ArrowUpRight size={20} />
                                                </button>
                                            </div>
                                            <div
                                                className={`absolute -z-10 inset-0 opacity-0 group-hover:opacity-10 blur-3xl transition-opacity pointer-events-none rounded-[2.5rem] ${theme.bg}`}
                                            />
                                        </div>
                                    );
                                })}
                        </div>
                    </div>

                </div>
            )}

			{/* --- CALENDAR VIEW --- */}
			{view === "calendar" && (
				<div className="grid grid-cols-7 gap-px bg-white/5 border border-white/5 rounded-[2.5rem] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 shadow-2xl">
					{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
						<div
							key={day}
							className="bg-[#0d0d0d] py-4 text-center text-[10px] font-black uppercase tracking-[0.2em] text-gray-600 border-b border-white/5"
						>
							{day}
						</div>
					))}

					{calendar.blanks.map((i) => (
						<div key={`blank-${i}`} className="bg-[#080808] min-h-30" />
					))}

					{calendar.days.map((day) => {
						// Filter bills for this specific day
						const billsOnDay = predictedBills.filter(
							(b) => b.dayOfMonth === day,
						);

						return (
							<div
								key={day}
								className="bg-[#0d0d0d] min-h-30 p-2 border-r border-b border-white/5 relative group hoverhover:bg-white/2sition-colors"
							>
								{/* Day Number */}
								<span className="text-[10px] font-black text-gray-700 group-hover:text-white transition-colors">
									{day}
								</span>

								{/* Bills Container */}
								<div className="mt-2 space-y-1">
									{billsOnDay.map((bill) => {
										const cat = allUnifiedCategories.find(
											(c) =>
												c.name.toLowerCase() === bill.category.toLowerCase(),
										);
										const theme =
											cat?.theme || getCategoryTheme("Uncategorized");

										return (
											<div
												key={bill.id}
												className={`flex items-center justify-between px-1.5 py-1 rounded-lg border ${theme.border} bg-opacity-10 ${theme.border} group/bill`}
											>
												<div className="flex items-center gap-1 min-w-0">
													<CategoryIcon
														name={cat?.icon || "HelpCircle"}
														size={10}
														colorClass={theme.text}
													/>
													<span
														className={`text-[10px] font-black uppercase truncate max-w-10 md:max-w-none ${theme.text}`}
													>
														{bill.merchant}
													</span>
												</div>

												{/* ✅ THE AMOUNT */}
												<span
													className={`text-[10px] font-bold ${theme.text} ml-1`}
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
			)}

			{/* --- POTENTIAL SUBSCRIPTIONS SECTION --- */}
			{potentialSubscriptions.length > 0 && (
				<div className="space-y-4">
					<div className="flex items-center gap-2">
						<div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
						<h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
							Potential Subscriptions Detected
						</h2>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{potentialSubscriptions.map((sub) => {
							const categoryData = allUnifiedCategories.find(
								(c) => c.name.toLowerCase() === sub.category.toLowerCase(),
							);
							const theme =
								categoryData?.theme || getCategoryTheme("Uncategorized");

							return (
								<div
									key={sub.id}
									className="flex items-center justify-between p-4 bg-orange-500/3 border border-orange-500/10 rounded-2xl group hover:border-orange-500/30 transition-all"
								>
									<div className="flex items-center gap-3">
										<div
											className={`p-2 rounded-xl bg-orange-500/10 text-orange-500`}
										>
											<CategoryIcon
												name={categoryData?.icon || "Search"}
												size={18}
												colorClass={theme.text}
											/>
										</div>
										<div>
											<p className="text-sm font-bold text-white group-hover:text-orange-500 transition-colors">
												{sub.merchant}
											</p>
											<p className="text-[10px] text-gray-600 font-medium">
												Charged {new Date(sub.date).toLocaleDateString()}
											</p>
										</div>
									</div>

									<div className="flex items-center gap-4">
										<span className="text-sm font-black text-white">
											{numberFormatter.format(Math.abs(sub.amount))}
										</span>
										<button
											onClick={() => handleConfirm(sub.merchant)}
											className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 bg-orange-500 text-white rounded-lg hover:bg-orange-400 active:scale-95 transition-all shadow-lg shadow-orange-500/20"
										>
											Confirm
										</button>
									</div>
								</div>
							);
						})}
					</div>
				</div>
			)}
		</div>
	);
}
