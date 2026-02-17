"use client";

import { SummaryRowProps } from "@/types/budget";

export default function SummaryRow({
	label,
	value,
	icon: Icon,
	iconColor,
	valueColor,
}: SummaryRowProps) {
	// Dynamically calculate value if transactions are provided
	// const displayValue = transactions
	// 	? `$${transactions.reduce((acc, t) => acc + t.amount, 0).toFixed(2)}`
	// 	: value;

	return (
		<div className="flex justify-between items-center">
			<div className="flex gap-3">
				<div
					className={`w-6 h-6 rounded-full border border-gray-300 dark:border-gray-600 flex items-center justify-center ${iconColor}`}
				>
					<Icon size={10} strokeWidth={3} />
				</div>
				<div>
					<p className="text-sm font-semibold text-gray-900 dark:text-white">
						{label}
					</p>
				</div>
			</div>
			<span
				className={`text-sm font-bold ${valueColor || "text-gray-900 dark:text-white"}`}
			>
				{value}
			</span>
		</div>
	);
}
