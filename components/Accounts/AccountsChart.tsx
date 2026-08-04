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

import { useBudgetStore } from "@/store/useBudgetStore";
import { formatChartValue } from "@/utils/formatters";

interface AccountsChartProps {
	isLoading?: boolean;
}

export default function AccountsChart({}: AccountsChartProps) {
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
