/**
 * Displays the top 5 spending categories for the current month.
 * Each category shows a progress bar and a clickable row that opens the
 * CategoryDetailDrawer.
 */
"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useBudgetStore } from "@/store/useBudgetStore";
import { formatCurrency } from "@/utils/formatters";
import { getCategoryTheme } from "@/constants/categories";
import { getIconForCategory } from "@/lib/categoryIcons";
import dynamic from "next/dynamic";
import { WidgetShell } from "./WidgetShell";

const CategoryDetailDrawer = dynamic(
	() =>
		import("@/components/Categories/CategoryDetailDrawer").then(
			(mod) => mod.CategoryDetailDrawer,
		),
	{ ssr: false },
);

export function TopCategoriesWidget() {
	const transactions = useBudgetStore((state) => state.transactions);
	const router = useRouter();
	const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
	const [categoryDrawerOpen, setCategoryDrawerOpen] = useState(false);
	const lastCategoryRef = useRef<string | null>(null);

	const categoryData = useMemo(() => {
		const now = new Date();
		const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
		const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

		const monthTxs = transactions.filter((tx) => {
			const d = new Date(tx.date);
			return d >= startOfMonth && d <= endOfMonth && tx.amount < 0;
		});

		const totals = new Map<string, { amount: number; ids: string[] }>();
		for (const tx of monthTxs) {
			const category = tx.category || "Uncategorized";
			const entry = totals.get(category) || { amount: 0, ids: [] };
			entry.amount += Math.abs(tx.amount);
			entry.ids.push(tx.id);
			totals.set(category, entry);
		}

		const totalSpent = Array.from(totals.values()).reduce(
			(sum, v) => sum + v.amount,
			0,
		);

		const rows = Array.from(totals.entries())
			.map(([label, { amount, ids }]) => ({
				label,
				amount,
				transactionIds: ids,
				color: getCategoryTheme(label).text,
				icon: getIconForCategory(label),
			}))
			.sort((a, b) => b.amount - a.amount)
			.slice(0, 5);

		return { rows, totalSpent };
	}, [transactions]);

	if (categoryData.rows.length === 0) {
		return (
			<WidgetShell
				title="Top categories"
				subtitle="No spending this month"
				className="min-h-[200px]"
			>
				<div className="flex h-32 flex-col items-center justify-center text-sm text-gray-500 dark:text-gray-400">
					<p>No transactions found this month.</p>
				</div>
			</WidgetShell>
		);
	}

	return (
		<>
			<WidgetShell
				title="Top categories"
				subtitle={
					<span className="text-gray-500 dark:text-gray-400">
						{categoryData.rows.length} categories
					</span>
				}
				dropdown={
					<button
						onClick={() => router.push("/reports")}
						className="text-xs font-medium text-[#FF5A35] hover:underline"
					>
						View all →
					</button>
				}
				className="min-h-[200px]"
			>
				<div className="space-y-3">
					{categoryData.rows.map((row) => {
						const percentage =
							categoryData.totalSpent > 0
								? (row.amount / categoryData.totalSpent) * 100
								: 0;

						return (
							<button
								key={row.label}
								type="button"
								onClick={() => {
									lastCategoryRef.current = row.label;
									setSelectedCategory(row.label);
									setCategoryDrawerOpen(true);
								}}
								className="flex w-full items-center gap-3 rounded-lg p-2 transition-colors hover:bg-gray-50 dark:hover:bg-white/5"
							>
								<div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-white/5">
									<row.icon size={16} className={row.color} />
								</div>
								<div className="min-w-0 flex-1">
									<div className="flex items-center justify-between">
										<span className="truncate text-sm font-medium text-gray-900 dark:text-white">
											{row.label}
										</span>
										<span className="text-sm font-medium text-gray-900 dark:text-white">
											{formatCurrency(row.amount)}
										</span>
									</div>
									<div className="mt-1 h-1.5 w-full rounded-full bg-gray-200 dark:bg-white/10">
										<div
											className="h-full rounded-full transition-all"
											style={{
												width: `${Math.min(percentage, 100)}%`,
												backgroundColor: row.color,
											}}
										/>
									</div>
								</div>
							</button>
						);
					})}
				</div>
			</WidgetShell>

			{selectedCategory && categoryDrawerOpen && (
				<CategoryDetailDrawer
					category={selectedCategory}
					transactions={transactions}
					isOpen={categoryDrawerOpen}
					onClose={() => {
						setSelectedCategory(null);
						setCategoryDrawerOpen(false);
					}}
					onReopen={() => {
						if (lastCategoryRef.current) {
							setSelectedCategory(lastCategoryRef.current);
							setCategoryDrawerOpen(true);
						}
					}}
				/>
			)}
		</>
	);
}
