import { getCategoryTheme } from "@/constants";
import { useEffect, useMemo, useRef, useState } from "react";
import { buildMonthlyRows } from "@/components/Reports/reportUtils";
import { type Transaction } from "@/store/useBudgetStore";
import { X } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import {
	Bar,
	BarChart,
	CartesianGrid,
	ReferenceLine,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { MerchantLogo } from "@/components/Merchants/MerchantLogo";
import { CategoryGlyph } from "@/components/Categories/CategoryGlyph";

const AverageLabel = ({ value }: { value: string }) => (
	<div
		style={{
			position: "absolute",
			right: 0,
			top: "50%",
			transform: "translateY(-50%)",
			backgroundColor: "#1F2937",
			padding: "2px 12px",
			borderRadius: "9999px",
			color: "#fff",
			fontSize: "10px",
			fontWeight: 700,
		}}
	>
		{value}
	</div>
);

export function CategoryDetailDrawer({
	category,
	transactions,
	isOpen,
	onClose,
}: {
	category: string;
	transactions: Transaction[];
	isOpen: boolean;
	onClose: () => void;
}) {
	const theme = getCategoryTheme(category);

	const categoryTxs = useMemo(() => {
		return transactions.filter(
			(tx) => tx.category === category && tx.amount < 0,
		);
	}, [transactions, category]);

	const now = useMemo(() => new Date(), []);
	const currentMonthStart = useMemo(
		() => new Date(now.getFullYear(), now.getMonth(), 1),
		[now],
	);
	const currentMonthEnd = useMemo(
		() => new Date(now.getFullYear(), now.getMonth() + 1, 0),
		[now],
	);

	const currentMonthTxs = useMemo(() => {
		return categoryTxs.filter((tx) => {
			const d = new Date(tx.date);
			return d >= currentMonthStart && d <= currentMonthEnd;
		});
	}, [categoryTxs, currentMonthStart, currentMonthEnd]);

	const currentMonthSpent = useMemo(
		() => currentMonthTxs.reduce((sum, tx) => sum + Math.abs(tx.amount), 0),
		[currentMonthTxs],
	);

	const monthlyData = useMemo(() => {
		const rows = buildMonthlyRows(categoryTxs, "category", "monthly");
		return rows.map((row) => ({
			label: row.label,
			amount: row.expenses,
			transactionIds: row.transactionIds,
		}));
	}, [categoryTxs]);

	// Compute average monthly spending (excluding zero or missing)
	const averageMonthly = useMemo(() => {
		const amounts = monthlyData.map((d) => d.amount).filter((a) => a > 0);
		if (amounts.length === 0) return 0;
		return amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
	}, [monthlyData]);

	const annualData = useMemo(() => {
		const years = new Map<number, number>();
		for (const tx of categoryTxs) {
			const year = new Date(tx.date).getFullYear();
			years.set(year, (years.get(year) || 0) + Math.abs(tx.amount));
		}
		return Array.from(years.entries())
			.sort((a, b) => b[0] - a[0])
			.map(([year, total]) => ({
				year,
				total,
				avgMonthly: total / 12,
			}));
	}, [categoryTxs]);

	const groupedTransactions = useMemo(() => {
		const groups = new Map<string, Transaction[]>();
		for (const tx of categoryTxs) {
			const date = new Date(tx.date);
			const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
			const list = groups.get(key) || [];
			list.push(tx);
			groups.set(key, list);
		}
		return Array.from(groups.entries())
			.sort((a, b) => b[0].localeCompare(a[0]))
			.map(([monthKey, txs]) => ({
				monthKey,
				label: new Date(`${monthKey}-01`).toLocaleDateString("en-US", {
					month: "long",
					year: "numeric",
				}),
				transactions: txs.sort(
					(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
				),
			}));
	}, [categoryTxs]);

	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const monthRefs = useRef<(HTMLDivElement | null)[]>([]);
	const [activeMonthIndex, setActiveMonthIndex] = useState<number>(
		monthlyData.length - 1,
	);

	// Sync chart with scroll position
	useEffect(() => {
		const container = scrollContainerRef.current;
		if (!container || monthRefs.current.length === 0) return;

		const handleScroll = () => {
			const scrollTop = container.scrollTop;
			let selectedIndex = 0;
			const elements = monthRefs.current;

			for (let i = 0; i < elements.length; i++) {
				const el = elements[i];
				if (el && el.offsetTop - scrollTop <= 30) {
					selectedIndex = i;
				} else {
					break;
				}
			}
			setActiveMonthIndex(selectedIndex);
		};

		container.addEventListener("scroll", handleScroll);
		handleScroll(); // run once on mount

		return () => container.removeEventListener("scroll", handleScroll);
	}, [monthlyData]);

	if (!isOpen) return null;

	return (
		<div className="fixed h-full inset-0 z-[1000] flex justify-end">
			<div
				className="absolute inset-0 bg-black/40 backdrop-blur-sm"
				onClick={onClose}
			/>
			<div className="relative z-10 flex h-full w-full max-w-[480px] flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-300 dark:bg-[#232322]">
				{/* ✅ ONLY HEADER, INFO & CHART ARE STICKY */}
				<div className="sticky top-0 z-20 bg-white dark:bg-[#232322]">
					{/* Header */}
					<div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-white/5">
						<h2 className="text-lg font-bold text-gray-900 dark:text-[#f5f5f5]">
							Category
						</h2>
						<div className="flex items-center gap-3">
							<button className="rounded-full border border-gray-200 px-4 py-1.5 text-sm font-medium hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5">
								Edit budget
							</button>
							<button
								onClick={onClose}
								className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-white/10"
							>
								<X size={20} className="text-gray-500 dark:text-zinc-400" />
							</button>
						</div>
					</div>

					{/* Top info */}
					<div className="p-6 pb-2">
						<div className="flex items-center gap-3">
							<div className="flex size-10 items-center justify-center rounded-full bg-gray-100 dark:bg-white/5">
								<CategoryGlyph
									name={category}
									size={24}
									className={theme.text}
								/>
							</div>
							<h3 className="text-2xl font-bold text-gray-900 dark:text-[#f5f5f5]">
								{category}
							</h3>
						</div>
						<div className="mt-4 flex justify-between">
							<div>
								<p className="text-sm text-gray-500 dark:text-zinc-400">
									Spent in{" "}
									{currentMonthStart.toLocaleDateString("en-US", {
										month: "short",
									})}
								</p>
								<p className="text-2xl font-bold text-gray-900 dark:text-[#f5f5f5]">
									{formatCurrency(currentMonthSpent)}
								</p>
								<p className="text-sm text-cyan-600 dark:text-cyan-400">
									$124.80 left
								</p>
							</div>
						</div>
					</div>

					{/* Chart */}
					<div className="h-[180px] px-4 pb-4">
						<ResponsiveContainer width="100%" height="100%">
							<BarChart
								data={monthlyData}
								margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
							>
								<CartesianGrid
									vertical={false}
									stroke="rgba(128,128,128,0.18)"
									strokeDasharray="4 4"
								/>
								<XAxis
									dataKey="label"
									tick={{ fill: "#888", fontSize: 10 }}
									axisLine={false}
									tickLine={false}
									tickFormatter={(val) =>
										val.includes(" ") ? val.split(" ")[0] : val
									}
								/>
								<YAxis
									tick={{ fill: "#888", fontSize: 10 }}
									axisLine={false}
									tickLine={false}
									tickFormatter={(val) => formatCurrency(val)}
									width={60}
								/>
								<Tooltip
									content={({ active, payload, label }) => {
										if (!active || !payload?.length) return null;
										const value = payload[0].value;
										return (
											<div className="rounded-lg border border-gray-200 bg-white p-2 text-sm shadow-xl dark:border-white/10 dark:bg-[#232322]">
												<p className="font-semibold text-gray-900 dark:text-[#f5f5f5]">
													{label}
												</p>
												<p className="text-gray-900 dark:text-[#f5f5f5]">
													{formatCurrency(Number(value))}
												</p>
											</div>
										);
									}}
								/>
								{monthlyData.map((entry, index) => {
									const amount = entry.amount;
									let fillColor = "#32A86F"; // green
									if (amount > averageMonthly * 1.5)
										fillColor = "#FF642B"; // red
									else if (amount > averageMonthly) fillColor = "#FFC13D"; // yellow

									const isActive = index === activeMonthIndex;

									return (
										<Bar
											key={index}
											dataKey="amount"
											fill={isActive ? "#fff" : fillColor}
											stroke={isActive ? "#FF642B" : "transparent"}
											strokeWidth={isActive ? 2 : 0}
											barSize={24}
											radius={[6, 6, 0, 0]}
										/>
									);
								})}
								{averageMonthly > 0 && (
									<ReferenceLine
										y={averageMonthly}
										stroke="#374151"
										strokeWidth={2}
										label={
											<AverageLabel value={formatCurrency(averageMonthly)} />
										}
									/>
								)}
							</BarChart>
						</ResponsiveContainer>
					</div>
				</div>

				{/* ✅ SCROLLABLE AREA: Key Metrics + Transactions */}
				<div
					className="flex-1 overflow-y-auto px-6 pb-6"
					ref={scrollContainerRef}
				>
					{/* Key metrics - NO LONGER STICKY */}
					<div className="py-4">
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b border-gray-200 text-gray-500 dark:border-white/5 dark:text-zinc-400">
									<th className="pb-2 text-left font-medium">Key metrics</th>
									<th className="pb-2 text-right font-medium">
										Spent per year
									</th>
									<th className="pb-2 text-right font-medium">Avg monthly</th>
								</tr>
							</thead>
							<tbody>
								{annualData.map((item) => (
									<tr
										key={item.year}
										className="border-b border-gray-100 dark:border-white/5"
									>
										<td className="py-2 font-medium text-gray-900 dark:text-[#f5f5f5]">
											{item.year}
										</td>
										<td className="py-2 text-right text-gray-900 dark:text-[#f5f5f5]">
											{formatCurrency(item.total)}
										</td>
										<td className="py-2 text-right text-gray-900 dark:text-[#f5f5f5]">
											{formatCurrency(item.avgMonthly)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					{/* Transactions list */}
					<div className="mt-6 space-y-6">
						{groupedTransactions.map((group, idx) => (
							<div
								key={group.monthKey}
								ref={(el) => {
									monthRefs.current[idx] = el;
								}}
							>
								<h4 className="text-base font-bold text-gray-900 dark:text-[#f5f5f5]">
									{group.label}
								</h4>
								<div className="mt-3 space-y-4">
									{group.transactions.map((tx) => (
										<div
											key={tx.id}
											className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-white/5"
										>
											<div className="flex items-center gap-4">
												<MerchantLogo name={tx.merchant} size="sm" />
												<div>
													<p className="text-sm font-medium text-gray-900 dark:text-white">
														{tx.merchant}
													</p>
													<p className="text-xs text-gray-500 dark:text-zinc-400">
														{new Date(tx.date).toLocaleDateString("en-US", {
															weekday: "long",
															month: "long",
															day: "numeric",
														})}
													</p>
												</div>
											</div>
											<div className="flex items-center gap-2">
												<CategoryGlyph
													name={tx.category}
													size={16}
													className={theme.text}
												/>
												<span className="font-medium text-gray-900 dark:text-white">
													{formatCurrency(Math.abs(tx.amount))}
												</span>
											</div>
										</div>
									))}
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
