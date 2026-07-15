import { memo } from "react";
import { Card } from "@/components/ui/Card";
import { formatCurrency } from "@/utils/formatters";

interface MerchantData {
	name: string;
	count: number;
	total: number;
}

interface PurchaseData {
	merchant: string;
	amount: number;
	date: string | Date;
}

interface MerchantInsightsProps {
	topMerchants: MerchantData[];
	largestPurchases: PurchaseData[];
}

export const MerchantInsights = memo(function MerchantInsights({
	topMerchants,
	largestPurchases,
}: MerchantInsightsProps) {
	const topMerchantElements = [];
	let merchLimit = topMerchants.length;
	if (merchLimit > 5) {
		merchLimit = 5;
	}
	
	for (let i = 0; i < merchLimit; i++) {
		const m = topMerchants[i];
		topMerchantElements.push(
			<div key={m.name} className="flex items-start justify-between group gap-4">
				<div className="flex items-start gap-3 min-w-0 flex-1">
					<div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-500 group-hover:bg-orange-100 dark:group-hover:bg-orange-500/20 group-hover:text-orange-600 transition-colors shrink-0">
						{m.name.charAt(0)}
					</div>
					<div className="min-w-0 pt-0.5">
						<p className="text-sm font-bold text-gray-900 dark:text-white truncate leading-none mb-1">
							{m.name}
						</p>
						<p className="text-[10px] text-gray-500 font-medium leading-none">
							{m.count} transactions
						</p>
					</div>
				</div>
				<span className="text-sm @2xl:text-base font-black text-gray-900 dark:text-white whitespace-nowrap shrink-0">
					{formatCurrency(m.total)}
				</span>
			</div>,
		);
	}

	const largestPurchasesElements = [];
	let purchLimit = largestPurchases.length;
	if (purchLimit > 5) {
		purchLimit = 5;
	}
	
	for (let i = 0; i < purchLimit; i++) {
		const t = largestPurchases[i];
		const amountVal = -Math.abs(t.amount);
		
		largestPurchasesElements.push(
			<div key={i} className="flex flex-col gap-1">
				<div className="flex justify-between items-center gap-2">
					<span className="text-sm font-bold text-gray-900 dark:text-white truncate">
						{t.merchant}
					</span>
					<span className="text-sm font-black text-gray-700 dark:text-gray-400 shrink-0">
						{formatCurrency(amountVal)}
					</span>
				</div>
				<span className="text-[10px] text-gray-500 font-medium italic">
					{new Date(t.date).toLocaleDateString("en-US", {
						month: "short",
						day: "numeric",
					})}
				</span>
			</div>,
		);
	}

	return (
		<Card title="Merchant Insights">
			<div className="grid grid-cols-1 @2xl:grid-cols-2 gap-8 mt-4">
				<div className="min-w-0">
					<p className="text-[10px] font-black text-gray-400 tracking-widest mb-4">
						Top Merchants
					</p>
					<div className="flex flex-col gap-4">{topMerchantElements}</div>
				</div>
				
				<div className="pt-8 @2xl:pt-0 border-t @2xl:border-t-0 @2xl:border-l border-gray-100 dark:border-gray-800 @2xl:pl-8 min-w-0">
					<p className="text-[10px] font-black text-gray-400 tracking-widest mb-4">
						Largest Hits
					</p>
					<div className="flex flex-col gap-4">
						{largestPurchasesElements}
					</div>
				</div>
			</div>
		</Card>
	);
});