"use client";

import { useMemo } from "react";
import {
	Area,
	AreaChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

import { Shimmer } from "@/components/ui/Shimmer";
import { useBudgetStore } from "@/store/useBudgetStore";
import { formatChartValue } from "@/utils/formatters";

interface AccountsChartProps {
	isLoading?: boolean;
}

function AccountsChartSkeleton() {
	return (
		<div
			role="status"
			aria-label="Loading net worth chart"
			aria-live="polite"
			className="h-[300px] w-full rounded-xl border border-gray-200 bg-white p-6 transition-colors dark:border-[#2a2a2a] dark:bg-[#1c1c1c]"
		>
			<span className="sr-only">Loading net worth chart…</span>

			<div aria-hidden="true">
				<Shimmer className="mb-5 h-4 w-24 rounded-md" />

				<div className="relative h-[220px] overflow-hidden rounded-xl border border-gray-100 p-4 dark:border-white/5">
					<div className="absolute inset-x-4 top-1/4 border-t border-dashed border-gray-200 dark:border-white/10" />
					<div className="absolute inset-x-4 top-1/2 border-t border-dashed border-gray-200 dark:border-white/10" />
					<div className="absolute inset-x-4 top-3/4 border-t border-dashed border-gray-200 dark:border-white/10" />

					<div className="absolute inset-x-4 bottom-4 flex items-end gap-3">
						{[38, 62, 48, 86, 70, 108, 92, 132, 118, 150, 136, 174].map(
							(height, index) => (
								<Shimmer
									key={index}
									className="min-w-0 flex-1 rounded-t-md"
									style={{ height }}
								/>
							),
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

export default function AccountsChart({
	isLoading = false,
}: AccountsChartProps) {
	const transactions = useBudgetStore((state) => state.transactions);

	const data = useMemo(() => {
		const map = new Map<string, number>();

		[...transactions]
			.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
			.forEach((transaction) => {
				const date = new Date(transaction.date).toLocaleDateString(undefined, {
					month: "short",
					day: "numeric",
				});

				map.set(date, (map.get(date) || 0) + transaction.amount);
			});

		return Array.from(map.entries()).map(([name, value]) => ({
			name,
			value,
		}));
	}, [transactions]);

	if (isLoading) {
		return <AccountsChartSkeleton />;
	}

	return (
		<div className="h-[300px] w-full rounded-xl border border-gray-200 bg-white p-6 transition-colors dark:border-[#2a2a2a] dark:bg-[#1c1c1c]">
			<h3 className="mb-4 text-sm font-medium text-gray-500 dark:text-gray-400">
				NET WORTH
			</h3>

			<ResponsiveContainer width="100%" height="100%">
				<AreaChart data={data}>
					<defs>
						<linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
							<stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
							<stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
						</linearGradient>
					</defs>

					<CartesianGrid
						strokeDasharray="3 3"
						stroke="#e5e7eb"
						className="dark:stroke-[#2a2a2a]"
					/>

					<XAxis
						dataKey="name"
						stroke="#9ca3af"
						fontSize={12}
						tickLine={false}
						axisLine={false}
					/>

					<YAxis
						stroke="#9ca3af"
						fontSize={12}
						tickLine={false}
						axisLine={false}
						tickFormatter={formatChartValue}
					/>

					<Tooltip
						formatter={(value: unknown) => {
							if (typeof value === "number") {
								return [formatChartValue(value), "Value"];
							}

							return [value ? String(value) : "", "Value"];
						}}
						contentStyle={{
							backgroundColor: "#1c1c1c",
							border: "1px solid #2a2a2a",
							borderRadius: "8px",
							color: "#fff",
						}}
					/>

					<Area
						type="monotone"
						dataKey="value"
						stroke="#06b6d4"
						fillOpacity={1}
						fill="url(#colorValue)"
					/>
				</AreaChart>
			</ResponsiveContainer>
		</div>
	);
}
