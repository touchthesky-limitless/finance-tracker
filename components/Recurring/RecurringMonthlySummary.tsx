"use client";

import { ArrowLeft, ArrowRight, CalendarDays, Info, List } from "lucide-react";

import type {
	RecurringOccurrence,
	RecurringType,
} from "@/components/Recurring/types";
import { formatMonthTitle } from "@/components/Recurring/recurringUtils";
import { formatMoney } from "@/utils/formatters";

export function RecurringMonthlySummary({
	month,
	occurrences,
	view,
	onMonthChange,
	onToday,
	onViewChange,
	onAdd,
}: {
	month: Date;
	occurrences: RecurringOccurrence[];
	view: "list" | "calendar";
	onMonthChange: (offset: number) => void;
	onToday: () => void;
	onViewChange: (view: "list" | "calendar") => void;
	onAdd: (type: RecurringType) => void;
}) {
	return (
		<section className="mb-5 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/5 dark:bg-[#232322]">
			<div className="flex flex-wrap items-center gap-4 border-b border-gray-200 px-6 py-4 dark:border-white/5">
				<h2 className="text-xl font-bold">{formatMonthTitle(month)}</h2>
				<div className="ml-auto flex items-center gap-4">
					<button
						type="button"
						onClick={() => onMonthChange(-1)}
						className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-white/5"
						aria-label="Previous month"
					>
						<ArrowLeft size={19} />
					</button>
					<button
						type="button"
						onClick={() => onMonthChange(1)}
						className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-white/5"
						aria-label="Next month"
					>
						<ArrowRight size={19} />
					</button>
					<button
						type="button"
						onClick={onToday}
						className="rounded-xl border border-gray-300 px-4 py-2.5 font-semibold hover:bg-gray-100 dark:border-white/15 dark:hover:bg-white/5"
					>
						Today
					</button>
				</div>
				<div className="flex overflow-hidden rounded-xl border border-gray-300 dark:border-white/15">
					<button
						type="button"
						onClick={() => onViewChange("list")}
						className={`flex items-center gap-2 px-4 py-2.5 font-semibold ${view === "list" ? "bg-gray-100 dark:bg-white/8" : "hover:bg-gray-100 dark:hover:bg-white/5"}`}
					>
						<List size={18} /> List
					</button>
					<button
						type="button"
						onClick={() => onViewChange("calendar")}
						className={`flex items-center gap-2 border-l border-gray-300 px-4 py-2.5 font-semibold dark:border-white/15 ${view === "calendar" ? "bg-gray-100 dark:bg-white/8" : "hover:bg-gray-100 dark:hover:bg-white/5"}`}
					>
						<CalendarDays size={18} /> Calendar
					</button>
				</div>
			</div>
			<div className="grid divide-y divide-gray-200 md:grid-cols-3 md:divide-x md:divide-y-0 dark:divide-white/5">
				<SummaryColumn
					type="income"
					title="Income"
					action="Add recurring income"
					occurrences={occurrences}
					onAdd={onAdd}
				/>
				<SummaryColumn
					type="expense"
					title="Expenses"
					action="Add recurring expenses"
					occurrences={occurrences}
					onAdd={onAdd}
				/>
				<SummaryColumn
					type="credit-card"
					title="Credit cards"
					action="Set up bill sync"
					occurrences={occurrences}
					onAdd={onAdd}
				/>
			</div>
		</section>
	);
}

function SummaryColumn({
	type,
	title,
	action,
	occurrences,
	onAdd,
}: {
	type: RecurringType;
	title: string;
	action: string;
	occurrences: RecurringOccurrence[];
	onAdd: (type: RecurringType) => void;
}) {
	const items = occurrences.filter((item) => item.record.type === type);
	const total = items.reduce((sum, item) => sum + item.record.amount, 0);
	const paid = items
		.filter((item) => item.status === "complete")
		.reduce((sum, item) => sum + item.record.amount, 0);
	const remaining = Math.max(0, total - paid);
	return (
		<div className="min-h-32 px-6 py-6">
			<div className="flex items-center gap-2">
				<h3 className="text-lg font-semibold">{title}</h3>
				<Info size={15} className="text-gray-500 dark:text-gray-400" />
			</div>
			{items.length === 0 ? (
				<button
					type="button"
					onClick={() => onAdd(type)}
					className="mt-2 text-base font-bold text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300"
				>
					{action}
				</button>
			) : (
				<div className="mt-2">
					<p className="text-right text-sm text-gray-500 dark:text-gray-400">
						{formatMoney(total)} total
					</p>
					<div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-white/15">
						<div
							className="h-full bg-cyan-500"
							style={{
								width: `${total > 0 ? Math.min(100, (paid / total) * 100) : 0}%`,
							}}
						/>
					</div>
					<div className="mt-3 flex justify-between text-sm font-bold">
						<span>{formatMoney(paid)} paid</span>
						<span>{formatMoney(remaining)} remaining</span>
					</div>
				</div>
			)}
		</div>
	);
}
