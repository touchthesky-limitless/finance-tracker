"use client";

import { useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { X, Download, ShoppingBag, ChevronDown } from "lucide-react";
import { formatMoney, formatDate } from "@/utils/formatters";
import { DEFAULT_TAGS } from "@/data/categories";
import { CategoryDetailsModalProps } from "@/types/budget";
import CategoryDropdown from "@/components/Budget/CategoryDropdown";
import { useOutsideClick } from "@/hooks/useOutsideClick";

export default function CategoryDetailsModal({
	isOpen,
	onClose,
	category,
	transactions,
	color,
	onUpdateCategory,
	onTransactionClick,
}: CategoryDetailsModalProps) {
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (isOpen) {
			// Only lock if not already locked by another modal
			if (document.body.style.overflow !== "hidden") {
				document.body.style.overflow = "hidden";
			}
		} else {
			// Only unlock if this is the last modal closing
			// You might need a global 'modalCount' if you open many at once
			document.body.style.overflow = "unset";
		}
	}, [isOpen]);

	// --- Memoized Stats ---
	const stats = useMemo(() => {
		const total = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
		const sorted = [...transactions].sort(
			(a, b) => Math.abs(b.amount) - Math.abs(a.amount),
		);
		return {
			total,
			avg: total / (transactions.length || 1),
			largest: sorted[0],
		};
	}, [transactions]);

	// --- Memoized Trend Chart ---
	const trendData = useMemo(() => {
		const months = Array(12).fill(0);
		transactions.forEach((t) => {
			const d = new Date(t.date);
			if (!isNaN(d.getTime())) months[d.getMonth()] += Math.abs(t.amount);
		});
		const max = Math.max(...months, 1);
		return months.map((val, i) => ({
			label: new Date(0, i).toLocaleString("default", { month: "short" }),
			value: val,
			height: max > 0 ? (val / max) * 100 : 0,
		}));
	}, [transactions]);

	// 7. INTERACTION LOGIC (Click Outside & Escape Key)
	// useOutsideClick(containerRef, onClose, isOpen, "data-category-details-modal");

	if (!isOpen) return null;

	return createPortal(
		<div
			data-category-details-modal
			ref={containerRef}
			tabIndex={-1}
			className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity"
			onClick={onClose}
		>
			<div
				className="bg-[#F8F9FB] dark:bg-[#0a0a0a] w-full max-w-5xl max-h-[90vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Header */}
				<div className="bg-white dark:bg-gray-900 px-8 py-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center sticky top-0 z-10">
					<div className="flex items-center gap-4">
						<div
							className={`w-10 h-10 rounded-full flex items-center justify-center ${color.replace("bg-", "bg-opacity-20 text-")}`}
						>
							<ShoppingBag size={20} />
						</div>
						<h2 className="text-2xl font-bold text-gray-900 dark:text-white">
							{category}
						</h2>
					</div>
					<div className="flex gap-3">
						<button className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-full hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
							<Download size={16} /> Export
						</button>
						<button
							onClick={onClose}
							className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-400 hover:text-gray-900 transition-colors"
						>
							<X size={24} />
						</button>
					</div>
				</div>

				{/* <div className="overflow-y-auto p-8 space-y-8 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-800"> */}
				<div className="overflow-y-auto p-8 space-y-8 scrollbar-thin">
					{/* Trend Chart */}
					<div className="bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm relative">
						<div className="h-40 flex items-end gap-2 relative">
							{/* Dynamic Y-Axis Labels */}
							{(() => {
								const maxVal = Math.max(...trendData.map((d) => d.value), 0);
								const maxAxis =
									maxVal > 0 ? Math.ceil(maxVal / 100) * 100 : 1000;
								const midAxis = maxAxis / 2;

								return (
									<>
										<div className="hidden md:flex flex-col justify-between h-full text-[10px] text-gray-400 font-medium pb-6 absolute -left-2 top-0 bottom-0 pointer-events-none">
											<span>{formatMoney(maxAxis)}</span>
											<span>{formatMoney(midAxis)}</span>
											<span>$0</span>
										</div>

										<div className="flex-1 ml-0 md:ml-12 flex items-end justify-between h-full border-b border-gray-100 dark:border-gray-800 pb-2">
											<div className="flex-1 ml-0 md:ml-12 flex items-end justify-between h-full border-b border-gray-100 dark:border-gray-800 pb-2">
												{trendData.map((d, i) => {
													const barHeight =
														maxAxis > 0 ? (d.value / maxAxis) * 100 : 0;

													return (
														<div
															key={i}
															className="flex-1 flex flex-col items-center gap-2 group h-full"
														>
															<div className="w-full h-full flex items-end justify-center relative px-1">
																{/* VALUE LABEL (Always Visible) */}
																{d.value > 0 && (
																	<span
																		className="absolute text-[8px] font-extrabold text-gray-400 dark:text-gray-500 mb-1 transition-all"
																		style={{
																			bottom: `${d.value > 0 ? Math.max(barHeight, 4) : 0}%`,
																		}}
																	>
																		{/* Shorten logic: $1200 -> $1.2k, $45 -> $45 */}
																		{d.value >= 1000
																			? `$${(d.value / 1000).toFixed(1)}k`
																			: `$${Math.round(d.value)}`}
																	</span>
																)}

																<div
																	className="w-full max-w-6 bg-[#5686F5] dark:bg-[#3b82f6] rounded-t-md opacity-80 hover:opacity-100 transition-all relative group"
																	style={{
																		height:
																			d.value > 0
																				? `${Math.max(barHeight, 4)}%`
																				: "0%",
																	}}
																>
																	{/* DETAILED TOOLTIP (On Hover) */}
																	<div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 dark:bg-white text-white dark:text-black text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 shadow-xl pointer-events-none">
																		{formatMoney(d.value)}
																	</div>
																</div>
															</div>
															<span className="text-[10px] font-bold text-gray-400 uppercase">
																{d.label}
															</span>
														</div>
													);
												})}
											</div>
										</div>
									</>
								);
							})()}
						</div>
					</div>

					<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
						{/* Transaction Table */}
						<div className="lg:col-span-2 space-y-4">
							<h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
								Transactions
							</h3>
							<div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
								<table className="w-full text-left">
									<thead className="bg-gray-50 dark:bg-gray-800/50 text-[11px] font-bold text-gray-400 uppercase">
										<tr>
											<th className="px-6 py-4">Date</th>
											<th className="px-6 py-4">Name</th>
											<th className="px-6 py-4">Category</th>
											<th className="px-6 py-4 text-right">Amount</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-gray-100 dark:divide-gray-800">
										{transactions.map((t) => (
											<tr
												key={t.id}
												onClick={() => onTransactionClick(t)}
												className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors group cursor-pointer"
											>
												<td className="px-6 py-4 text-sm font-medium text-gray-500 dark:text-gray-400">
													{formatDate(t.date)}
												</td>
												<td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-white max-w-50 truncate">
													{t.description}
												</td>
												{/* <td className="px-6 py-4">
													<div
														className="relative"
														onClick={(e) => e.stopPropagation()}
													>
														<select
															value={t.category || "Uncategorized"}
															onChange={(e) =>
																onUpdateCategory(t.id, e.target.value)
															}
															className="appearance-none bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-lg px-3 py-1.5 pr-8 hover:border-blue-500 transition-colors cursor-pointer"
														>
															
															{!DEFAULT_TAGS.includes(t.category) &&
																t.category && (
																	<option value={t.category}>
																		{t.category}
																	</option>
																)}
															{DEFAULT_TAGS.map((opt) => (
																<option key={opt} value={opt}>
																	{opt}
																</option>
															))}
														</select>
														<ChevronDown
															size={12}
															className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
														/>
													</div>
												</td> */}
												<td className="px-6 py-4">
													<div onClick={(e) => e.stopPropagation()}>
														<CategoryDropdown
															currentCategory={t.category || "Uncategorized"}
															onSelect={(newCat) =>
																onUpdateCategory(t.id, newCat)
															}
														/>
													</div>
												</td>
												<td className="px-6 py-4 text-right text-sm font-bold text-gray-900 dark:text-white font-mono">
													{formatMoney(Math.abs(t.amount))}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>

						{/* Sidebar Stats */}
						<div className="space-y-6">
							<div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
								<h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
									Summary
								</h3>
								<div className="space-y-2">
									<DetailRow label="Count" value={transactions.length} />
									<DetailRow label="Average" value={formatMoney(stats.avg)} />
									<DetailRow
										label="Largest"
										value={formatMoney(Math.abs(stats.largest?.amount || 0))}
									/>
								</div>
								<div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-gray-800">
									<span className="text-sm font-bold text-gray-900 dark:text-white">
										Total
									</span>
									<span className="text-xl font-bold text-blue-600 dark:text-blue-400 font-mono">
										{formatMoney(stats.total)}
									</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>,
		document.body,
	);
}

// Simple internal component for the sidebar rows
function DetailRow({
	label,
	value,
}: {
	label: string;
	value: string | number;
}) {
	return (
		<div className="flex justify-between items-center text-sm">
			<span className="text-gray-500 dark:text-gray-400">{label}</span>
			<span className="font-bold text-gray-900 dark:text-white">{value}</span>
		</div>
	);
}
