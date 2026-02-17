"use client";

import { useBudgetStore } from "@/hooks/useBudgetStore";
import { Wallet, Landmark, CreditCard, PiggyBank, EyeOff } from "lucide-react";

import { LucideIcon } from "lucide-react";

// Interface for the Asset Summary cards
interface AssetItemProps {
	icon: LucideIcon;
	label: string;
	amount: string;
	color: string;
}

// Interface for the time-period summary cards
interface TimeCardProps {
	label: string;
	amount: string;
	balance: string;
	date: string;
}

export default function ProOverviewPage() {
	const useStore = useBudgetStore();
	const transactions = useStore((state) => state.transactions);

	return (
		// Use p-4 on mobile and p-8 on desktop for better spacing
		<div className="p-4 md:p-8 space-y-6 bg-[#F8F9FB] dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100 min-h-full">
			{/* Top Row: Responsive Grid */}
			<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
				{/* Monthly Expense: Full width on mobile, 4/12 on large screens */}
				<div className="lg:col-span-4 bg-white border-gray-100 dark:bg-gray-900 dark:border-gray-800 p-6 rounded-2xl">
					<div className="flex items-center justify-between mb-4">
						<h3 className="text-gray-400 dark:text-gray-500 font-medium">February · Expense</h3>
						<button className="text-gray-400 dark:text-gray-500 hover:text-white hover:text-white-700">
							<EyeOff size={18} />
						</button>
					</div>
					<p className="text-3xl font-bold text-orange-400">$ 66,077.48</p>
					<p className="text-sm text-gray-500 dark:text-gray-600 mt-1">
						Monthly income $ 6,200.00
					</p>
					<button className="mt-6 px-4 py-2 bg-orange-800/30 text-orange-400 rounded-lg text-sm font-medium">
						View Details
					</button>
					{/* Decorative background icon */}
					<div className="absolute -right-2.5 -bottom-2.5 opacity-10">
						<Wallet size={120} className="text-orange-400" />
					</div>
				</div>

				{/* Asset Summary: Full width on mobile, 8/12 on large screens */}
				<div className="lg:col-span-8 bg-white border-gray-100 dark:bg-gray-900 dark:border-gray-800 p-6 rounded-2xl">
					<h3 className="text-white dark:text-gray-500 font-medium mb-4">Asset Summary</h3>
					<p className="text-xs text-gray-500 dark:text-gray-600 mb-6">
						You have recorded 3 accounts
					</p>

					{/* Items stack on mobile, go side-by-side on tablet+ */}
					<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
						<AssetItem
							icon={Landmark}
							label="Total assets"
							amount="$ 3,701.38"
							color="bg-gray-800"
						/>
						<AssetItem
							icon={CreditCard}
							label="Total liabilities"
							amount="$ 11,947.79"
							color="bg-teal-600"
						/>
						<AssetItem
							icon={PiggyBank}
							label="Net assets"
							amount="-$ 8,246.41"
							color="bg-orange-400"
						/>
					</div>
				</div>
			</div>

			{/* Bottom Row: 2-column grid that becomes 1 column on mobile */}
			<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
				{/* Time Cards: 2x2 grid on desktop, 1 column on small mobile */}
				<div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
					<TimeCard
						label="Today"
						amount="$ 0.00"
						balance="$ 50,552.00"
						date="February 15, 2026"
					/>
					<TimeCard
						label="This Week"
						amount="$ 0.00"
						balance="$ 51,104.00"
						date="February 15-February 21"
					/>
					<TimeCard
						label="This Month"
						amount="$ 6,200.00"
						balance="$ 66,077.48"
						date="February 1-February 28"
					/>
					<TimeCard
						label="This Year"
						amount="$ 6,200.00"
						balance="$ 66,077.48"
						date="2026"
					/>
				</div>

				{/* Trends Chart: Responsive height */}
				<div className="lg:col-span-7 bg-white border-gray-100 dark:bg-gray-900 dark:border-gray-800 p-6 rounded-2xl min-h-75">
					<h3 className="text-white dark:text-gray-400  font-medium mb-4">
						Income and Expense Trends
					</h3>
					<div className="h-64 flex items-end justify-between px-4 border-l border-b border-gray-800">
						{/* You would integrate Recharts or similar here */}
					</div>
				</div>
			</div>
		</div>
	);
}

function AssetItem({ icon: Icon, label, amount, color }: AssetItemProps) {
	return (
		<div className="flex items-center gap-4">
			<div className={`p-3 rounded-xl ${color} text-white dark:text-gray-400 `}>
				<Icon size={20} />
			</div>
			<div>
				<p className="text-[10px] text-gray-500 dark:text-gray-500 uppercase font-bold">{label}</p>
				<p className="text-lg font-bold text-white dark:text-gray-400 ">{amount}</p>
			</div>
		</div>
	);
}

function TimeCard({ label, amount, balance, date }: TimeCardProps) {
	return (
		<div className="bg-white border-gray-100 dark:bg-gray-900 dark:border-gray-800 p-4 rounded-2xl space-y-4">
			<div className="flex justify-between items-center text-gray-400">
				<span className="text-xs font-medium">{label}</span>
				<button>···</button>
			</div>
			<div>
				<p className="text-lg font-bold text-red-500">{amount}</p>
				<p className="text-sm font-medium text-teal-500">{balance}</p>
			</div>
			<p className="text-[10px] text-gray-600">{date}</p>
		</div>
	);
}
