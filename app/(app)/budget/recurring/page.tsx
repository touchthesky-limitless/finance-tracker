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
		// Explicitly format the merchant name string
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

	// --- Calendar Math ---
	const calendar = useMemo(() => {
		const year = viewDate.getFullYear();
		const month = viewDate.getMonth();
		const firstDay = new Date(year, month, 1).getDay();
		const daysInMonth = new Date(year, month + 1, 0).getDate();

		// Standard loops instead of Array.from maps
		const days = [];
		for (let i = 1; i <= daysInMonth; i++) {
			days.push(i);
		}

		const blanks = [];
		for (let i = 0; i < firstDay; i++) {
			blanks.push(i);
		}

		return {
			days,
			blanks,
			monthName: viewDate.toLocaleString("default", { month: "long" }),
			year,
		};
	}, [viewDate]);

	// --- View Logic Processing ---

	// 1. Grid View Elements
	const activeSubscriptionElements = [];
	const upcomingBillElements = [];
	let subscriptionCount = 0;
	let billCount = 0;

	for (let i = 0; i < predictedBills.length; i++) {
		const bill = predictedBills[i];

		let categoryData = undefined;
		for (let j = 0; j < allUnifiedCategories.length; j++) {
			if (
				allUnifiedCategories[j].name.toLowerCase() ===
				bill.category.toLowerCase()
			) {
				categoryData = allUnifiedCategories[j];
				break;
			}
		}

		const theme = categoryData?.theme || getCategoryTheme("Uncategorized");
		const iconName = categoryData?.icon || "HelpCircle";

		const cardJsx = (
			<div
				key={bill.id}
				className="relative group bg-gray-50 dark:bg-[#0d0d0d] border border-black/5 dark:border-white/5 rounded-[2.5rem] p-6 hover:bg-black/5 dark:hover:bg-white/2 transition-all duration-300"
			>
				<div className="flex justify-between items-start mb-10">
					<div
						className={`w-14 h-14 rounded-3xl flex items-center justify-center border-2 ${theme.border} bg-opacity-10 transition-transform group-hover:rotate-6`}
					>
						<CategoryIcon name={iconName} size={28} colorClass={theme.text} />
					</div>
					<div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-500 font-black text-[11px] uppercase tracking-tighter bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
						<CalendarIcon size={12} /> {getOrdinal(bill.dayOfMonth)}
					</div>
				</div>
				<div className="space-y-1 mb-8">
					<h3 className="text-xl font-black text-gray-900 dark:text-white truncate uppercase tracking-tight">
						{bill.merchant}
					</h3>
					<p
						className={`text-[10px] font-black uppercase tracking-widest ${theme.text}`}
					>
						{bill.category}
					</p>
				</div>
				<div className="flex justify-between items-end pt-6 border-t border-black/5 dark:border-white/5">
					<div>
						<p className="text-[10px] text-gray-500 dark:text-gray-600 font-black uppercase mb-1">
							{bill.type === "subscription" ? "Price" : "Estimated Cost"}
						</p>
						<p className="text-2xl font-black text-gray-900 dark:text-white">
							{numberFormatter.format(bill.amount)}
						</p>
					</div>
					<button className="p-3 bg-black/5 dark:bg-white/5 rounded-2xl hover:bg-black dark:hover:bg-white text-gray-500 hover:text-white dark:hover:text-black transition-all">
						<ArrowUpRight size={20} />
					</button>
				</div>
				<div
					className={`absolute -z-10 inset-0 opacity-0 group-hover:opacity-10 blur-3xl transition-opacity pointer-events-none rounded-[2.5rem] ${theme.bg}`}
				/>
			</div>
		);

		if (bill.type === "subscription") {
			subscriptionCount++;
			activeSubscriptionElements.push(cardJsx);
		}

		if (bill.type === "bill") {
			billCount++;
			upcomingBillElements.push(cardJsx);
		}
	}

	// 2. Calendar View Elements
	const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
	const calendarHeaderElements = [];
	for (let i = 0; i < daysOfWeek.length; i++) {
		calendarHeaderElements.push(
			<div
				key={daysOfWeek[i]}
				className="bg-gray-50 dark:bg-[#0d0d0d] py-4 text-center text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-gray-600 border-b border-black/5 dark:border-white/5"
			>
				{daysOfWeek[i]}
			</div>,
		);
	}

	const calendarBlankElements = [];
	for (let i = 0; i < calendar.blanks.length; i++) {
		calendarBlankElements.push(
			<div
				key={`blank-${calendar.blanks[i]}`}
				className="bg-gray-100 dark:bg-[#080808] min-h-30"
			/>,
		);
	}

	const calendarDayElements = [];
	for (let i = 0; i < calendar.days.length; i++) {
		const day = calendar.days[i];

		const billsOnDayElements = [];
		for (let j = 0; j < predictedBills.length; j++) {
			const bill = predictedBills[j];

			if (bill.dayOfMonth === day) {
				let cat = undefined;
				for (let k = 0; k < allUnifiedCategories.length; k++) {
					if (
						allUnifiedCategories[k].name.toLowerCase() ===
						bill.category.toLowerCase()
					) {
						cat = allUnifiedCategories[k];
						break;
					}
				}
				const theme = cat?.theme || getCategoryTheme("Uncategorized");

				billsOnDayElements.push(
					<div
						key={bill.id}
						className={`flex items-center justify-between px-1.5 py-1 rounded-lg border ${theme.border} bg-opacity-10 group/bill`}
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
						<span className={`text-[10px] font-bold ${theme.text} ml-1`}>
							${Math.round(bill.amount)}
						</span>
					</div>,
				);
			}
		}

		calendarDayElements.push(
			<div
				key={day}
				className="bg-gray-50 dark:bg-[#0d0d0d] min-h-30 p-2 border-r border-b border-black/5 dark:border-white/5 relative group hover:bg-black/5 dark:hover:bg-white/2 transition-colors"
			>
				<span className="text-[10px] font-black text-gray-500 dark:text-gray-700 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
					{day}
				</span>
				<div className="mt-2 space-y-1">{billsOnDayElements}</div>
			</div>,
		);
	}

	// 3. Potential Subscriptions Elements
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
				className="flex items-center justify-between p-4 bg-orange-500/5 dark:bg-orange-500/3 border border-orange-500/20 dark:border-orange-500/10 rounded-2xl group hover:border-orange-500/40 dark:hover:border-orange-500/30 transition-all"
			>
				<div className="flex items-center gap-3">
					<div className="p-2 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-500">
						<CategoryIcon
							name={categoryData?.icon || "Search"}
							size={18}
							colorClass={theme.text}
						/>
					</div>
					<div>
						<p className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-500 transition-colors">
							{sub.merchant}
						</p>
						<p className="text-[10px] text-gray-500 dark:text-gray-600 font-medium">
							Charged {new Date(sub.date).toLocaleDateString()}
						</p>
					</div>
				</div>

				<div className="flex items-center gap-4">
					<span className="text-sm font-black text-gray-900 dark:text-white">
						{numberFormatter.format(Math.abs(sub.amount))}
					</span>
					<button
						onClick={() => handleConfirm(sub.merchant)}
						className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 bg-orange-600 hover:bg-orange-500 dark:bg-orange-500 dark:hover:bg-orange-400 text-white rounded-lg active:scale-95 transition-all shadow-lg shadow-orange-500/20"
					>
						Confirm
					</button>
				</div>
			</div>,
		);
	}

	return (
		<div className="p-8 max-w-7xl mx-auto space-y-10 min-h-screen text-gray-900 dark:text-white">
			{/* --- HEADER & TAB SWITCHER --- */}
			<div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
				<div className="space-y-2">
					<h1 className="text-3xl font-black tracking-tighter uppercase italic">
						Predicted Bills & Subscriptions
					</h1>
					<div className="flex bg-gray-100 dark:bg-[#0d0d0d] p-1 rounded-xl border border-black/5 dark:border-white/5 w-fit">
						<button
							onClick={() => setView("grid")}
							className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
								view === "grid"
									? "bg-white text-black dark:bg-white dark:text-black shadow-sm"
									: "text-gray-500 hover:text-gray-900 dark:hover:text-white"
							}`}
						>
							<LayoutGrid size={14} /> Grid
						</button>
						<button
							onClick={() => setView("calendar")}
							className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
								view === "calendar"
									? "bg-white text-black dark:bg-white dark:text-black shadow-sm"
									: "text-gray-500 hover:text-gray-900 dark:hover:text-white"
							}`}
						>
							<CalendarIcon size={14} /> Calendar
						</button>
					</div>
				</div>

				{view === "calendar" && (
					<div className="flex items-center gap-4 bg-gray-50 dark:bg-[#0d0d0d] border border-black/5 dark:border-white/5 px-4 py-2 rounded-2xl">
						<button
							onClick={() =>
								setViewDate(
									new Date(viewDate.setMonth(viewDate.getMonth() - 1)),
								)
							}
						>
							<ChevronLeft
								size={18}
								className="text-gray-500 hover:text-gray-900 dark:hover:text-white"
							/>
						</button>
						<span className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest min-w-30 text-center">
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
								className="text-gray-500 hover:text-gray-900 dark:hover:text-white"
							/>
						</button>
					</div>
				)}
			</div>

			{/* --- GRID VIEW --- */}
			{view === "grid" && (
				<div className="space-y-12 animate-in fade-in zoom-in-95 duration-300">
					{/* SECTION 1: SUBSCRIPTIONS */}
					<div className="space-y-4">
						<div className="flex items-center gap-2 border-b border-black/5 dark:border-white/5 pb-3">
							<h2 className="text-sm font-black uppercase tracking-[0.2em] text-gray-500">
								Active Subscriptions
							</h2>
							<span className="px-2 py-0.5 rounded bg-black/5 dark:bg-white/5 text-gray-600 dark:text-gray-400 text-[10px] font-bold">
								{subscriptionCount}
							</span>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
							{activeSubscriptionElements}
						</div>
					</div>

					{/* SECTION 2: UPCOMING BILLS */}
					<div className="space-y-4">
						<div className="flex items-center gap-2 border-b border-black/5 dark:border-white/5 pb-3">
							<h2 className="text-sm font-black uppercase tracking-[0.2em] text-gray-500">
								Upcoming Recurring Bills
							</h2>
							<span className="px-2 py-0.5 rounded bg-black/5 dark:bg-white/5 text-gray-600 dark:text-gray-400 text-[10px] font-bold">
								{billCount}
							</span>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
							{upcomingBillElements}
						</div>
					</div>
				</div>
			)}

			{/* --- CALENDAR VIEW --- */}
			{view === "calendar" && (
				<div className="grid grid-cols-7 gap-px bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-[2.5rem] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 shadow-2xl">
					{calendarHeaderElements}
					{calendarBlankElements}
					{calendarDayElements}
				</div>
			)}

			{/* --- POTENTIAL SUBSCRIPTIONS SECTION --- */}
			{potentialSubscriptions.length > 0 && (
				<div className="space-y-4">
					<div className="flex items-center gap-2">
						<div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
						<h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
							Potential Subscriptions Detected
						</h2>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{potentialSubElements}
					</div>
				</div>
			)}
		</div>
	);
}
