"use client";

import { ShoppingBag } from "lucide-react";
import { Transaction } from "@/store/createBudgetStore";
import { SidebarListProps, Merchant } from "@/types/budget";
import { formatMoney } from "@/utils/formatters";
import { ChevronUp, ChevronDown } from "lucide-react";

export default function SidebarList({
	title,
	items,
	showAll,
	onToggle,
	isPurchaseList,
}: SidebarListProps) {
	return (
		<div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
			<h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">
				{title}
			</h3>
			<div className="space-y-4">
				{items.slice(0, showAll ? 10 : 3).map((item, i) => {
					// Type assertions to help TS distinguish between Transaction and Merchant
					const tx = item as Transaction;
					const merchant = item as Merchant;

					return (
						<div key={i} className="flex justify-between items-center">
							<div className="flex gap-3 items-center">
								<div
									className={`w-8 h-8 rounded-${isPurchaseList ? "full" : "lg"} bg-${isPurchaseList ? "blue-50 text-blue-600" : "gray-50 text-gray-600"} dark:bg-gray-800 dark:text-gray-300 font-bold text-xs flex items-center justify-center`}
								>
									{isPurchaseList ? (
										<ShoppingBag size={14} />
									) : (
										`${merchant.count}x`
									)}
								</div>
								<div>
									<p className="text-sm font-bold text-gray-900 dark:text-white truncate max-w-25">
										{isPurchaseList ? tx.description : merchant.name}
									</p>
									<p className="text-[10px] text-gray-400">
										{isPurchaseList
											? tx.date
											: `Avg ${formatMoney(merchant.total / merchant.count)}`}
									</p>
								</div>
							</div>
							<span className="text-sm font-bold text-gray-900 dark:text-white">
								{formatMoney(
									Math.abs(isPurchaseList ? tx.amount : merchant.total),
								)}
							</span>
						</div>
					);
				})}
			</div>
			<button
				onClick={onToggle}
				className="w-full mt-6 py-2 border border-gray-200 dark:border-gray-700 rounded-full text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-1"
			>
				{showAll ? "Show less" : "See more"}{" "}
				{showAll ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
			</button>
		</div>
	);
}
