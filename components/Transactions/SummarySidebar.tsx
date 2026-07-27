import { Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { formatCurrency, formatPositiveSignedCurrency } from "@/utils/formatters";

interface SummarySidebarProps {
	isVisible: boolean;
	stats: {
		total: number;
		largestTx: number;
		largestEx: number;
		avgTx: number;
		totalIncome: number;
		totalSpending: number;
		firstDate: string;
		lastDate: string;
	};
	className?: string;
}

export function SummarySidebar({
	isVisible,
	stats,
	className = "",
}: SummarySidebarProps) {
	const [isExpanded, setIsExpanded] = useState(false);

	if (!isVisible) {
		return null;
	}

	const {
		total,
		largestTx,
		largestEx,
		avgTx,
		totalIncome,
		totalSpending,
		firstDate,
		lastDate,
	} = stats;

	return (
		<div
			className={`bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-white/5 rounded-2xl shadow-sm p-6 flex flex-col z-20 transition-colors duration-200 h-fit ${className}`}
		>
			<div className="flex items-center justify-between mb-6">
				<h2 className="text-[18px] font-bold text-gray-900 dark:text-white tracking-tight">
					Summary
				</h2>
				<Sparkles size={18} className="text-gray-500 dark:text-gray-400" />
			</div>

			<div className="flex flex-col gap-4">
				{/* --- Always Visible Stats (Mobile & Desktop) --- */}
				<div className="flex items-center justify-between">
					<span className="text-[14px] text-gray-500 dark:text-gray-400 font-medium">
						Total transactions
					</span>
					<span className="text-[15px] text-gray-900 dark:text-white font-medium">
						{total}
					</span>
				</div>
				<div className="flex items-center justify-between">
					<span className="text-[14px] text-gray-500 dark:text-gray-400 font-medium">
						Largest transaction
					</span>
					<span className="text-[15px] text-gray-900 dark:text-white font-medium">
						{formatCurrency(largestTx)}
					</span>
				</div>
				<div className="flex items-center justify-between">
					<span className="text-[14px] text-gray-500 dark:text-gray-400 font-medium">
						Largest expense
					</span>
					<span className="text-[15px] text-gray-900 dark:text-white font-medium">
						{formatCurrency(largestEx)}
					</span>
				</div>
				<div className="flex items-center justify-between">
					<span className="text-[14px] text-gray-500 dark:text-gray-400 font-medium">
						Total spending
					</span>
					<span className="text-[15px] text-gray-900 dark:text-white font-medium">
						{formatCurrency(totalSpending)}
					</span>
				</div>

				{/* --- Collapsible Stats (Hidden on mobile, fully visible on desktop) --- */}
				<div
					className={`flex flex-col gap-4 transition-all duration-200 ${isExpanded ? "block" : "hidden md:block"}`}
				>
					<div className="flex items-center justify-between">
						<span className="text-[14px] text-gray-500 dark:text-gray-400 font-medium">
							Average transaction
						</span>
						<span className="text-[15px] text-emerald-700 dark:text-emerald-500 font-medium">
							{formatPositiveSignedCurrency(avgTx)}
						</span>
					</div>
					<div className="flex items-center justify-between">
						<span className="text-[14px] text-gray-500 dark:text-gray-400 font-medium">
							Total income
						</span>
						<span className="text-[15px] text-emerald-700 dark:text-emerald-500 font-medium">
							{formatPositiveSignedCurrency(totalIncome)}
						</span>
					</div>
					<div className="flex items-center justify-between">
						<span className="text-[14px] text-gray-500 dark:text-gray-400 font-medium">
							First transaction
						</span>
						<span className="text-[15px] text-gray-900 dark:text-white font-medium">
							{firstDate}
						</span>
					</div>
					<div className="flex items-center justify-between">
						<span className="text-[14px] text-gray-500 dark:text-gray-400 font-medium">
							Last transaction
						</span>
						<span className="text-[15px] text-gray-900 dark:text-white font-medium">
							{lastDate}
						</span>
					</div>
				</div>
			</div>

			{/* --- Bottom Actions --- */}
			<div className="mt-6 pt-4 border-t border-gray-200 dark:border-white/10">
				{/* Desktop Only: Download CSV Button */}
				<button
					type="button"
					onClick={() => {
						// TODO: Add your CSV download logic here
						console.log("Download CSV triggered");
					}}
					className="hidden md:block w-full text-center text-[15px] font-medium text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 transition-colors"
				>
					Download CSV
				</button>

				{/* Mobile Only: Expand / Collapse Toggle */}
				<button
					type="button"
					onClick={() => setIsExpanded(!isExpanded)}
					className="md:hidden flex items-center justify-center w-full gap-2 text-[14px] font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
				>
					{isExpanded ? (
						<>
							<ChevronUp size={16} />
							Hide details
						</>
					) : (
						<>
							<ChevronDown size={16} />
							Show details
						</>
					)}
				</button>
			</div>
		</div>
	);
}
