"use client";

import { useMemo, useSyncExternalStore, type ReactNode } from "react";
import { DollarSign, TrendingDown, TrendingUp } from "lucide-react";

import { Shimmer } from "@/components/ui/Shimmer";
import { useBudgetStore } from "@/store/useBudgetStore";
import { formatMoney } from "@/utils/formatters";

interface BudgetSummaryCardsProps {
	isLoading?: boolean;
}

function subscribeToClient(): () => void {
	return () => {};
}

function getClientSnapshot(): boolean {
	return true;
}

function getServerSnapshot(): boolean {
	return false;
}

function BudgetSummaryCardsSkeleton() {
	return (
		<div
			role="status"
			aria-label="Loading budget summary"
			aria-live="polite"
			className="grid grid-cols-1 gap-6 md:grid-cols-3"
		>
			<span className="sr-only">Loading budget summary…</span>

			{Array.from({ length: 3 }, (_, cardIndex) => (
				<div
					key={cardIndex}
					aria-hidden="true"
					className="rounded-3xl border border-gray-200 bg-gray-50 p-6 transition-all dark:border-gray-800 dark:bg-[#121212]"
				>
					<div className="mb-4 flex items-start justify-between gap-4">
						<Shimmer
							className={`h-3 rounded-md ${
								cardIndex === 0 ? "w-36" : cardIndex === 1 ? "w-24" : "w-28"
							}`}
						/>
						<Shimmer className="size-6 shrink-0 rounded-lg" />
					</div>

					<Shimmer
						className={`h-9 rounded-lg ${cardIndex === 0 ? "w-40" : "w-32"}`}
					/>

					<Shimmer className="mt-3 h-3 w-20 rounded-md" />
				</div>
			))}
		</div>
	);
}

export function BudgetSummaryCards({
	isLoading,
}: BudgetSummaryCardsProps = {}) {
	const isClient = useSyncExternalStore(
		subscribeToClient,
		getClientSnapshot,
		getServerSnapshot,
	);

	const transactions = useBudgetStore((state) => state.transactions);

	const totals = useMemo(() => {
		let totalIncome = 0;
		let totalExpenses = 0;

		for (let index = 0; index < transactions.length; index++) {
			const transaction = transactions[index];

			if (transaction.amount > 0) {
				totalIncome += transaction.amount;
			}

			if (transaction.amount < 0) {
				totalExpenses += Math.abs(transaction.amount);
			}
		}

		return {
			totalIncome,
			totalExpenses,
		};
	}, [transactions]);

	const shouldShowLoading = isLoading ?? !isClient;

	if (shouldShowLoading) {
		return <BudgetSummaryCardsSkeleton />;
	}

	return (
		<div className="grid grid-cols-1 gap-6 md:grid-cols-3">
			<SummaryCard
				title="Monthly Cash Flow"
				value={formatMoney(totals.totalIncome - totals.totalExpenses)}
				icon={<DollarSign />}
			/>

			<SummaryCard
				title="Total Income"
				value={formatMoney(totals.totalIncome)}
				icon={<TrendingUp className="text-emerald-500" />}
			/>

			<SummaryCard
				title="Total Expenses"
				value={formatMoney(totals.totalExpenses)}
				icon={<TrendingDown className="text-red-500" />}
			/>
		</div>
	);
}

function SummaryCard({
	title,
	value,
	icon,
}: {
	title: string;
	value: string;
	icon: ReactNode;
}) {
	return (
		<div className="rounded-3xl border border-gray-200 bg-gray-50 p-6 transition-all hover:border-orange-500/30 dark:border-gray-800 dark:bg-[#121212]">
			<div className="mb-4 flex items-start justify-between">
				<p className="text-xs font-bold uppercase tracking-wider text-gray-500">
					{title}
				</p>

				{icon}
			</div>

			<p className="flex items-center text-3xl font-black text-gray-900 dark:text-white">
				<span className="font-mono tabular-nums tracking-tight">{value}</span>
			</p>
		</div>
	);
}
