import {Percent, Home } from "lucide-react";
import { getTrendProps } from "@/lib/utils";

interface MortgageCardProps {
	program: string; // e.g. "30-Year Fixed"
	rate: number; // e.g. 6.875
	change: number; // e.g. -0.05
	payment?: string; // e.g. "$2,000" (Optional)
	date?: string; // e.g. "Feb 14, 2026"
}

export default function MortgageCard({
	program,
	rate,
	change,
	payment,
	date,
}: MortgageCardProps) {
	const { color, Icon } = getTrendProps(change, "liability");

	return (
		<div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between h-full hover:shadow-md transition-shadow">
			{/* HEADER */}
			<div className="flex items-start gap-4 mb-4">
				<div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-300">
					<Home size={24} />
				</div>
				<div>
					<h2 className="text-xl font-medium text-gray-900 dark:text-white">
						{program}
					</h2>
					<div className="text-sm text-gray-500">National Average</div>
				</div>
			</div>

			{/* RATE SECTION */}
			<div className="mt-2">
				<div className="flex items-baseline gap-1">
					<span className="text-5xl font-normal tracking-tight text-gray-900 dark:text-white">
						{rate?.toFixed(2) ?? "0.00"}
					</span>
					{/* Percent Icon adjusted for visual balance */}
					<span className="text-gray-400">
						<Percent size={24} strokeWidth={2.5} />
					</span>
				</div>

				{/* Monthly Payment Estimate (Conditional) */}
				{payment && (
					<div className="text-sm font-medium text-gray-500 mt-1 ml-1">
						Est.{" "}
						<span className="text-gray-900 dark:text-gray-300">${payment}</span>
						/mo
					</div>
				)}
			</div>

			{/* CHANGE INDICATOR */}
			<div
				className={`flex items-center gap-2 mt-4 font-medium text-lg ${color}`}
			>
				<span>{Math.abs(change || 0).toFixed(2)}%</span>
				<Icon size={20} />
			</div>

			{/* FOOTER */}
			<div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-400">
				Updated: {date || "Today"}
			</div>
		</div>
	);
}
