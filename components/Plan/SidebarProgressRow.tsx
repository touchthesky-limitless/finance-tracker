"use client";

import { formatCurrencyInt, formatSignedCurrencyInt } from "@/utils/formatters";

export function SidebarProgressRow({
	label,
	planned,
	actual,
	color,
	actualLabel = "spent",
}: {
	label: string;
	planned: number;
	actual: number;
	color: "green" | "red" | "blue" | "gray";
	actualLabel?: string;
}) {
	const progress = planned > 0 ? Math.min((actual / planned) * 100, 100) : 0;
	const remaining = planned - actual;
	const colorClass =
		color === "green"
			? "bg-emerald-500 text-emerald-600 dark:bg-emerald-400 dark:text-emerald-400"
			: color === "red"
				? "bg-red-500 text-red-600 dark:bg-red-400 dark:text-red-400"
				: color === "blue"
					? "bg-blue-500 text-blue-600 dark:bg-blue-400 dark:text-blue-400"
					: "bg-gray-400 text-gray-500 dark:bg-gray-600 dark:text-gray-400";

	return (
		<div>
			<div className="mb-1 flex justify-between text-sm">
				<span className="font-medium text-gray-800 dark:text-gray-200">
					{label}
				</span>
				<span className="text-gray-500 dark:text-gray-400">
					{formatCurrencyInt(planned)} planned
				</span>
			</div>
			<div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
				<div
					className={`h-full ${colorClass.split(" ")[0]} rounded-full`}
					style={{ width: `${progress}%` }}
				/>
			</div>
			<div className="mt-1 flex justify-between text-sm">
				<span className="font-bold text-gray-900 dark:text-white">
					{formatCurrencyInt(actual)} {actualLabel}
				</span>
				<span
					className={`font-bold ${remaining >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}
				>
					{formatSignedCurrencyInt(remaining)} remaining
				</span>
			</div>
		</div>
	);
}
