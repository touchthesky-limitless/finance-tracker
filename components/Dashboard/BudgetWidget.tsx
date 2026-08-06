/**
 * Displays a mock budget overview with fixed, flexible, and non‑monthly categories.
 * Uses placeholder data; in a real implementation this would be connected to the budget store.
 */
"use client";

import { Transaction } from "@/store/useBudgetStore";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { MOBILE_BREAKPOINT } from "@/config/breakpoints";
import { WidgetShell } from "./WidgetShell";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function BudgetWidget({ txs: _txs }: { txs: Transaction[] }) {
	const isMobile = useMediaQuery(MOBILE_BREAKPOINT);
	const planned = 310;
	const fixedSpent = 18621;
	const flexSpent = 491;
	const flexPlanned = 1180;
	const nonMonthlyPlanned = 1450;
	const nonMonthlySpent = 0;

	return (
		<WidgetShell
			title="Budget"
			subtitle="July 2026"
			dropdown={
				<select
					className={`rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-sm font-medium outline-none dark:border-white/10 dark:bg-[#2a2a2a] ${
						isMobile ? "w-full" : "w-auto"
					}`}
				>
					<option>Expenses</option>
					<option>Summary</option>
				</select>
			}
		>
			<div className="space-y-5">
				{/* Fixed */}
				<div>
					<div className="mb-1 flex items-center justify-between text-sm">
						<span className="font-medium text-gray-900 dark:text-white">
							Fixed
						</span>
						<span className="text-gray-500 dark:text-gray-400">
							${planned.toLocaleString()} planned
						</span>
					</div>
					<div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
						<div className="h-full w-full rounded-full bg-red-500/80" />
					</div>
					<div className="mt-1 flex items-center justify-between text-sm">
						<span className="font-bold text-gray-900 dark:text-white">
							${fixedSpent.toLocaleString()} spent
						</span>
						<span className="font-bold text-red-500 dark:text-red-400">
							${(planned - fixedSpent).toLocaleString()} remaining
						</span>
					</div>
				</div>

				{/* Flexible */}
				<div>
					<div className="mb-1 flex items-center justify-between text-sm">
						<span className="font-medium text-gray-900 dark:text-white">
							Flexible
						</span>
						<span className="text-gray-500 dark:text-gray-400">
							${flexPlanned.toLocaleString()} planned
						</span>
					</div>
					<div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
						<div className="h-full w-[42%] rounded-full bg-emerald-500/80" />
					</div>
					<div className="mt-1 flex items-center justify-between text-sm">
						<span className="font-bold text-gray-900 dark:text-white">
							${flexSpent.toLocaleString()} spent
						</span>
						<span className="font-bold text-emerald-500 dark:text-emerald-400">
							${(flexPlanned - flexSpent).toLocaleString()} remaining
						</span>
					</div>
				</div>

				{/* Non‑Monthly */}
				<div>
					<div className="mb-1 flex items-center justify-between text-sm">
						<span className="font-medium text-gray-900 dark:text-white">
							Non-Monthly
						</span>
						<span className="text-gray-500 dark:text-gray-400">
							${nonMonthlyPlanned.toLocaleString()} planned
						</span>
					</div>
					<div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-white/10" />
					<div className="mt-1 flex items-center justify-between text-sm">
						<span className="font-bold text-gray-900 dark:text-white">
							${nonMonthlySpent.toLocaleString()} spent
						</span>
						<span className="font-bold text-emerald-500 dark:text-emerald-400">
							${nonMonthlyPlanned.toLocaleString()} remaining
						</span>
					</div>
				</div>
			</div>
		</WidgetShell>
	);
}
