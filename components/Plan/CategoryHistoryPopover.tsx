"use client";

import { getCategoryHex } from "@/constants";
import { Transaction } from "@/store/useBudgetStore";
import { formatCurrencyInt } from "@/utils/formatters";
import { Check, Info, X } from "lucide-react";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import {
	Bar,
	BarChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

export function CategoryHistoryPopover({
	open,
	onClose,
	categoryName,
	transactions,
	anchorRef,
	onMouseEnter,
	onMouseLeave,
}: {
	open: boolean;
	onClose: () => void;
	categoryName: string;
	transactions: Transaction[];
	anchorRef: HTMLElement | null;
	onMouseEnter?: () => void;
	onMouseLeave?: () => void;
}) {
	const [, setHoveredKey] = useState<string | null>(null);

	const chartData = useMemo(() => {
		const now = new Date();
		const months: { label: string; amount: number }[] = [];
		for (let i = 11; i >= 0; i--) {
			const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
			const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
			const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
			const total = transactions
				.filter((tx) => {
					const txDate = new Date(tx.date);
					return (
						tx.category?.trim() === categoryName &&
						txDate >= monthStart &&
						txDate <= monthEnd
					);
				})
				.reduce((sum, tx) => sum + Math.abs(tx.amount || 0), 0);
			months.push({
				label: d.toLocaleDateString("en-US", { month: "short" }),
				amount: total,
			});
		}
		return months;
	}, [categoryName, transactions]);

	const average =
		chartData.length > 0
			? chartData.reduce((sum, d) => sum + d.amount, 0) / chartData.length
			: 0;

	// Position the popover relative to the anchor
	const [position, setPosition] = useState<{
		top: number;
		left: number;
	} | null>(null);
	const positionRef = useRef<{ top: number; left: number } | null>(null);
	useLayoutEffect(() => {
		if (!open || !anchorRef) {
			if (positionRef.current !== null) {
				positionRef.current = null;
				setPosition(null);
			}
			return;
		}

		const rect = anchorRef.getBoundingClientRect();
		const newPosition = {
			top: rect.bottom + 8,
			left: rect.left + rect.width / 2 - 140,
		};

		if (
			!positionRef.current ||
			positionRef.current.top !== newPosition.top ||
			positionRef.current.left !== newPosition.left
		) {
			positionRef.current = newPosition;
			setPosition(newPosition);
		}
	}, [open, anchorRef]);

	if (!open || !position) return null;

	return (
		<div
			className="fixed z-[200] w-[280px] rounded-xl border border-gray-200 bg-white p-4 shadow-xl dark:border-white/10 dark:bg-[#1B1B1B]"
			style={{ top: position.top, left: position.left }}
			onMouseEnter={() => {
				// Keep open when mouse enters popover
				if (onMouseEnter) onMouseEnter();
			}}
			onMouseLeave={() => {
				// Start the close timer again when mouse leaves popover
				if (onMouseLeave) onMouseLeave();
			}}
		>
			<div className="flex items-center justify-between">
				<h4 className="text-sm font-bold text-gray-900 dark:text-white">
					History
				</h4>
				<button
					onClick={onClose}
					className="rounded-full p-1 hover:bg-gray-100 dark:hover:bg-white/5"
				>
					<X size={16} />
				</button>
			</div>

			<div className="mt-3 grid grid-cols-2 gap-2">
				<div className="rounded-lg bg-gray-50 p-2 dark:bg-white/5">
					<p className="text-lg font-bold">
						{formatCurrencyInt(chartData[chartData.length - 1]?.amount ?? 0)}
					</p>
					<p className="text-[10px] text-gray-500">Spent last month</p>
				</div>
				<div className="rounded-lg bg-gray-50 p-2 dark:bg-white/5">
					<p className="text-lg font-bold">{formatCurrencyInt(average)}</p>
					<p className="text-[10px] text-gray-500">Monthly average</p>
				</div>
			</div>

			<div className="mt-3 h-[100px]">
				<ResponsiveContainer width="100%" height="100%">
					<BarChart data={chartData}>
						<CartesianGrid
							vertical={false}
							strokeDasharray="3 3"
							stroke="rgba(128,128,128,.18)"
						/>
						<XAxis
							dataKey="label"
							tick={{ fontSize: 9, fill: "#777" }}
							axisLine={false}
							tickLine={false}
						/>
						<YAxis
							tickFormatter={(v) => formatCurrencyInt(Number(v))}
							tick={{ fontSize: 9, fill: "#777" }}
							width={40}
							axisLine={false}
							tickLine={false}
						/>
						<Tooltip
							content={({ active, payload, label }) => {
								if (!active || !payload?.length) return null;
								return (
									<div className="rounded-lg border border-white/10 bg-[#222] px-2 py-1 text-white text-xs shadow-xl">
										<p className="font-semibold">{label}</p>
										<p>{formatCurrencyInt(Number(payload[0].value))}</p>
									</div>
								);
							}}
						/>
						<Bar
							dataKey="amount"
							fill={getCategoryHex(categoryName) || "#FF5A35"}
							barSize={20}
							radius={[4, 4, 0, 0]}
							onMouseEnter={(_, index) =>
								setHoveredKey(chartData[index]?.label ?? null)
							}
							onMouseLeave={() => setHoveredKey(null)}
						/>
					</BarChart>
				</ResponsiveContainer>
			</div>

			<div className="mt-2 flex items-center gap-2 text-xs">
				<button className="flex items-center gap-1 rounded-full bg-orange-500 px-2 py-1 text-white hover:bg-orange-600">
					<Check size={12} /> Apply $
					{chartData[chartData.length - 1]?.amount ?? 0}
				</button>
				<Info size={14} className="text-gray-400" />
			</div>
		</div>
	);
}
