"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
	ChevronDown,
	TrendingDown,
	TrendingUp,
} from "lucide-react";
import {
	Area,
	AreaChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

import {
	ACCOUNT_TIMEFRAME_OPTIONS,
	type AccountTimeframe,
	type BalancePoint,
} from "@/components/Accounts/details/accountDetailsUtils";
import {
	compactCurrency,
	formatSignedCurrency,
} from "@/utils/formatters";

interface AccountBalanceChartProps {
	currentBalance: number;
	balanceData: BalancePoint[];
	timeframe: AccountTimeframe;
	onTimeframeChange: (timeframe: AccountTimeframe) => void;
}

export function AccountBalanceChart({
	currentBalance,
	balanceData,
	timeframe,
	onTimeframeChange,
}: AccountBalanceChartProps) {
	const firstBalance = balanceData[0]?.balance ?? currentBalance;
	const balanceChange = currentBalance - firstBalance;
	const changePercent =
		firstBalance !== 0 ? (balanceChange / Math.abs(firstBalance)) * 100 : 0;
	const isPositive = balanceChange >= 0;

	const timeframeLabel =
		ACCOUNT_TIMEFRAME_OPTIONS.find((option) => {
			return option.value === timeframe;
		})?.label ?? "All time";

	return (
		<section className="rounded-2xl border border-gray-200 bg-white px-5 py-6 shadow-sm dark:border-white/5 dark:bg-[#222220]">
			<div className="mb-4 flex flex-wrap items-start justify-between gap-4">
				<div>
					<p className="mb-2 text-xs font-bold tracking-wide text-gray-500 dark:text-gray-400">
						CURRENT BALANCE
					</p>

					<div className="flex flex-wrap items-baseline gap-3">
						<strong className="text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">
							{formatSignedCurrency(currentBalance)}
						</strong>

						<span
							className={`flex items-center gap-1 text-base font-semibold ${
								isPositive
									? "text-emerald-600 dark:text-emerald-400"
									: "text-red-600 dark:text-red-400"
							}`}
						>
							{isPositive ? (
								<TrendingUp size={16} />
							) : (
								<TrendingDown size={16} />
							)}
							{formatSignedCurrency(balanceChange)}
							{" "}
							({changePercent.toFixed(0)}%)
						</span>

						<span className="text-base font-medium text-gray-500 dark:text-gray-400">
							{timeframeLabel} change
						</span>
					</div>
				</div>

				<DropdownMenu.Root modal={false}>
					<DropdownMenu.Trigger asChild>
						<button
							type="button"
							className="flex h-10 min-w-36 items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-900 outline-none transition-colors hover:bg-gray-50 dark:border-white/10 dark:bg-[#222220] dark:text-white dark:hover:bg-[#2A2A27]"
						>
							{timeframeLabel}
							<ChevronDown size={15} />
						</button>
					</DropdownMenu.Trigger>

					<DropdownMenu.Portal>
						<DropdownMenu.Content
							align="end"
							sideOffset={8}
							className="z-[120] w-48 overflow-hidden rounded-xl border border-gray-200 bg-white py-2 shadow-2xl outline-none dark:border-white/10 dark:bg-[#1E1E1E]"
						>
							{ACCOUNT_TIMEFRAME_OPTIONS.map((option) => {
								const selected = timeframe === option.value;

								return (
									<DropdownMenu.Item
										key={option.value}
										onSelect={() => {
											onTimeframeChange(option.value);
										}}
										className={`cursor-pointer px-4 py-2.5 text-sm outline-none ${
											selected
												? "bg-blue-50 text-blue-600 dark:bg-[#0B4D56] dark:text-[#38bdf8]"
												: "text-gray-900 data-[highlighted]:bg-gray-100 dark:text-white dark:data-[highlighted]:bg-white/5"
										}`}
									>
										{option.label}
									</DropdownMenu.Item>
								);
							})}
						</DropdownMenu.Content>
					</DropdownMenu.Portal>
				</DropdownMenu.Root>
			</div>

			<div className="h-80 w-full">
				<ResponsiveContainer width="100%" height="100%">
					<AreaChart
						data={balanceData}
						margin={{
							top: 24,
							right: 18,
							bottom: 10,
							left: 4,
						}}
					>
						<defs>
							<linearGradient
								id="accountBalanceArea"
								x1="0"
								y1="0"
								x2="0"
								y2="1"
							>
								<stop
									offset="0%"
									stopColor="#08A7C9"
									stopOpacity={0.35}
								/>
								<stop
									offset="100%"
									stopColor="#08A7C9"
									stopOpacity={0.04}
								/>
							</linearGradient>
						</defs>

						<CartesianGrid
							vertical={false}
							stroke="rgba(148,163,184,0.24)"
						/>

						<XAxis
							dataKey="label"
							axisLine={false}
							tickLine={false}
							tick={{
								fill: "#7D7D7D",
								fontSize: 12,
							}}
							minTickGap={48}
						/>

						<YAxis
							axisLine={false}
							tickLine={false}
							tick={{
								fill: "#7D7D7D",
								fontSize: 12,
							}}
							tickFormatter={compactCurrency}
							width={88}
						/>

						<Tooltip
							formatter={(value) => {
								return formatSignedCurrency(Number(value) || 0);
							}}
							contentStyle={{
								background: "#181817",
								border: "1px solid rgba(255,255,255,0.1)",
								borderRadius: "12px",
								color: "#F4F4F2",
							}}
							labelStyle={{
								color: "#F4F4F2",
							}}
						/>

						<Area
							type="linear"
							dataKey="balance"
							stroke="#08A7C9"
							strokeWidth={4}
							fill="url(#accountBalanceArea)"
							fillOpacity={1}
							dot={false}
							activeDot={{
								r: 6,
								fill: "#08A7C9",
								stroke: "#FFFFFF",
								strokeWidth: 3,
							}}
							isAnimationActive={false}
						/>
					</AreaChart>
				</ResponsiveContainer>
			</div>
		</section>
	);
}
