import { CategoryIcon } from "@/components/CategoryIcon";
import { getCategoryTheme } from "@/constants/categories";
import { Calendar as CalendarIcon, ArrowUpRight } from "lucide-react";
import { useUnifiedCategories } from "@/hooks/useUnifiedCategories";

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

// FIX: Removed allUnifiedCategories from props since the component fetches it internally
interface RecurringGridProps {
	predictedBills: PredictedBill[];
}

export function RecurringGrid({ predictedBills }: RecurringGridProps) {
	const { allUnifiedCategories } = useUnifiedCategories("Expense", "All");
	const numberFormatter = new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	});

	const getOrdinal = (n: number) => {
		const s = ["th", "st", "nd", "rd"],
			v = n % 100;
		return n + (s[(v - 20) % 10] || s[v] || s[0]);
	};

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
				className="relative group bg-gray-50 dark:bg-[#0d0d0d] border border-black/5 dark:border-white/5 rounded-[2.5rem] p-6 hover:bg-black/5 dark:hover:bg-white/2 transition-all duration-300 flex flex-col h-full"
			>
				<div className="flex justify-between items-start mb-10">
					<div
						className={`w-14 h-14 rounded-3xl flex items-center justify-center border-2 ${theme.border} bg-opacity-10 transition-transform group-hover:rotate-6 shrink-0`}
					>
						<CategoryIcon name={iconName} size={28} colorClass={theme.text} />
					</div>
					<div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-500 font-black text-[11px] uppercase tracking-tighter bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 whitespace-nowrap">
						<CalendarIcon size={12} /> {getOrdinal(bill.dayOfMonth)}
					</div>
				</div>
				<div className="space-y-1 mb-8 flex-1">
					<h3 className="text-xl font-black text-gray-900 dark:text-white truncate uppercase tracking-tight">
						{bill.merchant}
					</h3>
					<p
						className={`text-[10px] font-black uppercase tracking-widest truncate ${theme.text}`}
					>
						{bill.category}
					</p>
				</div>
				<div className="flex justify-between items-end pt-6 border-t border-black/5 dark:border-white/5">
					<div className="min-w-0 pr-2">
						<p className="text-[10px] text-gray-500 dark:text-gray-600 font-black uppercase mb-1 truncate">
							{bill.type === "subscription" ? "Price" : "Estimated Cost"}
						</p>
						<p className="text-2xl font-black text-gray-900 dark:text-white truncate">
							{numberFormatter.format(bill.amount)}
						</p>
					</div>
					<button
						type="button"
						aria-label="Up"
						className="p-3 bg-black/5 dark:bg-white/5 rounded-2xl hover:bg-black dark:hover:bg-white text-gray-500 hover:text-white dark:hover:text-black transition-all shrink-0"
					>
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

	return (
		<div className="space-y-12 animate-in fade-in zoom-in-95 duration-300">
			{/* SECTION 1: SUBSCRIPTIONS */}
			<div className="space-y-4">
				<div className="flex items-center gap-2 border-b border-black/5 dark:border-white/5 pb-3">
					<h2 className="text-sm font-black uppercase tracking-[0.2em] text-gray-500 truncate">
						Active Subscriptions
					</h2>
					<span className="px-2 py-0.5 rounded bg-black/5 dark:bg-white/5 text-gray-600 dark:text-gray-400 text-[10px] font-bold shrink-0">
						{subscriptionCount}
					</span>
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
					{activeSubscriptionElements}
				</div>
			</div>

			{/* SECTION 2: UPCOMING BILLS */}
			<div className="space-y-4">
				<div className="flex items-center gap-2 border-b border-black/5 dark:border-white/5 pb-3">
					<h2 className="text-sm font-black uppercase tracking-[0.2em] text-gray-500 truncate">
						Upcoming Recurring Bills
					</h2>
					<span className="px-2 py-0.5 rounded bg-black/5 dark:bg-white/5 text-gray-600 dark:text-gray-400 text-[10px] font-bold shrink-0">
						{billCount}
					</span>
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
					{upcomingBillElements}
				</div>
			</div>
		</div>
	);
}
