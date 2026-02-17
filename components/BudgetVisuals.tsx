"use client";
import { useMemo } from "react";
import { PieChart, Pie, ResponsiveContainer, Tooltip } from "recharts";
import { Transaction } from "@/store/createBudgetStore";

// Professional Financial Palette
const COLORS = [
	"#3b82f6",
	"#10b981",
	"#f59e0b",
	"#ef4444",
	"#8b5cf6",
	"#ec4899",
];
const GRAY = "#e5e7eb";

export default function BudgetVisuals({
	transactions,
}: {
	transactions: Transaction[];
}) {
	const { data, totalSpending } = useMemo(() => {
		// if (!transactions || transactions.length === 0) return [];
		if (!transactions || transactions.length === 0)
			return { data: [], totalSpending: 0 };

		// 1. Sum up spending by category
		const categoryTotals: Record<string, number> = {};
		let totalSpending = 0;

		transactions.forEach((t) => {
			if (t.amount < 0) {
				// Only count spending
				const val = Math.abs(t.amount);
				const cat = t.category || "Uncategorized";
				categoryTotals[cat] = (categoryTotals[cat] || 0) + val;
				totalSpending += val;
			}
		});

		const sortedCategories = Object.entries(categoryTotals)
			.map(
				([name, value]) =>
					({ name, value }) as {
						name: string;
						value: number;
						isOther?: boolean;
					},
			)
			.sort((a, b) => b.value - a.value);

		// 3. "Top 5 + Others" Strategy
		if (sortedCategories.length > 5) {
			const top5 = sortedCategories.slice(0, 5);
			const othersVal = sortedCategories
				.slice(5)
				.reduce((acc, curr) => acc + curr.value, 0);
			return {
				data: [...top5, { name: "Others", value: othersVal, isOther: true }],
				totalSpending,
			};
		}

		const dataWithColors = sortedCategories.map((entry, index) => ({
			...entry,
			// Assign the color here instead of in the JSX
			fill: entry.isOther ? GRAY : COLORS[index % COLORS.length],
		}));

		return { data: dataWithColors, totalSpending };
	}, [transactions]);

	if (data.length === 0) return null;

	return (
		<div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm mb-8">
			<h3 className="text-lg font-bold mb-6 text-gray-900 dark:text-white">
				Spending Breakdown
			</h3>
			<p className="text-3xl font-bold text-gray-900 dark:text-white">
				${totalSpending.toLocaleString(undefined, { minimumFractionDigits: 2 })}
			</p>

			{/* RESPONSIVE LAYOUT: Stack on mobile (col), Side-by-side on desktop (row) */}
			<div className="flex flex-col md:flex-row items-center gap-8">
				{/* CHART: Fixed height on mobile to prevent squishing */}
				<div className="w-full h-64 md:h-80 md:w-1/2 relative">
					<ResponsiveContainer width="100%" height="100%">
						<PieChart>
							<Pie
								data={data}
								cx="50%"
								cy="50%"
								innerRadius={80}
								outerRadius={110}
								paddingAngle={5}
								dataKey="value"
								stroke="none"
							></Pie>
							<Tooltip
								formatter={(value: number | undefined) =>
									`$${(value || 0).toFixed(2)}`
								}
								contentStyle={{
									borderRadius: "12px",
									border: "none",
									boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
								}}
							/>
						</PieChart>
					</ResponsiveContainer>

					{/* Center Text (Total Spending) */}
					<div className="absolute inset-0 flex items-center justify-center pointer-events-none">
						<div className="text-center">
							<span className="text-xs text-gray-400 font-medium tracking-wider">
								Total
							</span>
							<div className="text-xl font-bold text-gray-900 dark:text-white">
								$
								{data
									.reduce((acc, item) => acc + item.value, 0)
									.toLocaleString(undefined, { maximumFractionDigits: 0 })}
							</div>
						</div>
					</div>
				</div>

				{/* LEGEND: Full width on mobile, scrolling if needed */}
				<div className="w-full md:w-1/2">
					<div className="flex flex-col gap-3">
						{data.map((entry, index) => (
							<div
								key={index}
								className="flex items-center justify-between group"
							>
								<div className="flex items-center gap-3">
									<div
										className="w-3 h-3 rounded-full shadow-sm ring-2 ring-white dark:ring-gray-800"
										style={{
											backgroundColor: entry.isOther
												? GRAY
												: COLORS[index % COLORS.length],
										}}
									/>
									<span className="text-sm font-medium text-gray-600 dark:text-gray-300 truncate max-w-37.5">
										{entry.name}
									</span>
								</div>

								<div className="flex items-center gap-4">
									{/* Progress Bar Visual for scale */}
									<div className="hidden sm:block w-16 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
										<div
											className="h-full rounded-full"
											style={{
												width: `${(entry.value / data.reduce((a, b) => a + b.value, 0)) * 100}%`,
												backgroundColor: entry.isOther
													? GRAY
													: COLORS[index % COLORS.length],
											}}
										/>
									</div>
									<span className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">
										$
										{entry.value.toLocaleString(undefined, {
											minimumFractionDigits: 2,
											maximumFractionDigits: 2,
										})}
									</span>
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
