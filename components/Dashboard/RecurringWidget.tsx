/**
 * Displays upcoming recurring bills and payments.
 * Supports filtering by next two weeks, this week, or this month.
 */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, FlagTriangleRight, Hourglass, Receipt } from "lucide-react";
import { useBudgetStore } from "@/store/useBudgetStore";
import { useRecurringStore } from "@/store/useRecurringStore";
import { getOccurrencesForMonth } from "@/components/Recurring/recurringUtils";
import { formatDateShort, formatCurrency } from "@/utils/formatters";
import { CategoryGlyph } from "@/components/Categories/CategoryGlyph";
import { MerchantLogo } from "@/components/Merchants/MerchantLogo";
import { getCategoryTheme } from "@/constants/categories";
import { appendNavigationSource } from "@/lib/navigation/breadcrumb";
import { RecurringOccurrence } from "@/components/Recurring/types";
import { WidgetShell } from "./WidgetShell";

export function RecurringWidget() {
	const router = useRouter();
	const [period, setPeriod] = useState<"month" | "week" | "two-weeks">(
		"two-weeks",
	);

	const records = useRecurringStore((state) => state.records);
	const transactions = useBudgetStore((state) => state.transactions);
	const fetchRecurringData = useRecurringStore(
		(state) => state.fetchRecurringData,
	);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const load = async () => {
			try {
				await fetchRecurringData();
			} catch (error) {
				console.error("Failed to load recurring data:", error);
			} finally {
				setIsLoading(false);
			}
		};
		load();
	}, [fetchRecurringData]);

	const occurrences = useMemo(() => {
		if (isLoading || records.length === 0) return [];

		const now = new Date();
		now.setHours(0, 0, 0, 0);

		let startDate: Date;
		let endDate: Date;
		let allGenerated: RecurringOccurrence[] = [];

		if (period === "month") {
			startDate = new Date(now.getFullYear(), now.getMonth(), 1);
			endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
			allGenerated = getOccurrencesForMonth(records, startDate, transactions);
		} else if (period === "week") {
			const dayOfWeek = now.getDay();
			const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
			startDate = new Date(now);
			startDate.setDate(now.getDate() - diff);
			endDate = new Date(startDate);
			endDate.setDate(startDate.getDate() + 6);
			endDate.setHours(23, 59, 59, 999);
			allGenerated = getOccurrencesForMonth(records, startDate, transactions);
		} else {
			startDate = new Date(now);
			endDate = new Date(now);
			endDate.setDate(now.getDate() + 13);
			endDate.setHours(23, 59, 59, 999);

			const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
			const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
			allGenerated = [
				...getOccurrencesForMonth(records, currentMonthStart, transactions),
				...getOccurrencesForMonth(records, nextMonthStart, transactions),
			];
		}

		return allGenerated.filter((occ) => {
			const d = new Date(occ.date);
			return d >= startDate && d <= endDate;
		});
	}, [records, transactions, period, isLoading]);

	const totalDue = useMemo(
		() =>
			occurrences.reduce((sum, occ) => sum + Math.abs(occ.record.amount), 0),
		[occurrences],
	);

	const upcoming = useMemo(() => occurrences.slice(0, 5), [occurrences]);
	const showSeeRecurring = upcoming.length === 0;

	const formatFrequency = (freq: string) =>
		freq.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

	return (
		<WidgetShell
			title="Recurring"
			subtitle={
				<>
					<span className="text-red-500 dark:text-red-400">
						{formatCurrency(totalDue)}
					</span>
					<span className="text-gray-500 dark:text-gray-400">
						{" "}
						remaining due
					</span>
				</>
			}
			dropdown={
				<select
					className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-sm font-medium outline-none dark:border-white/10 dark:bg-[#2a2a2a]"
					value={period}
					onChange={(e) =>
						setPeriod(e.target.value as "month" | "week" | "two-weeks")
					}
				>
					<option value="two-weeks">Next two weeks</option>
					<option value="week">This week</option>
					<option value="month">This month</option>
				</select>
			}
		>
			{isLoading ? (
				<div className="flex items-center justify-center py-8 text-sm text-gray-500">
					Loading recurring…
				</div>
			) : upcoming.length > 0 ? (
				<div className="space-y-4">
					{upcoming.map((occ) => {
						const record = occ.record;

						const date = new Date(occ.date);
						const now = new Date();
						const diffDays = Math.ceil(
							(date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
						);
						const formattedDate = formatDateShort(
							date.toISOString().slice(0, 10),
						);

						const theme = getCategoryTheme(
							record.categoryName || "Uncategorized",
						);
						const categoryColor = theme.text;

						return (
							<div
								key={occ.id}
								className="flex items-center justify-between border-b border-gray-100 pb-3 last:border-0 dark:border-white/5"
							>
								<div className="min-w-0 flex-1 pr-4">
									<div className="flex items-center gap-2">
										<button
											type="button"
											onClick={() => {
												if (record.merchantId) {
													router.push(
														appendNavigationSource(
															`/merchants/${encodeURIComponent(record.merchantId)}`,
															"dashboard",
														),
													);
												}
											}}
											disabled={!record.merchantId}
											className={`shrink-0 disabled:cursor-default ${categoryColor}`}
										>
											<MerchantLogo
												name={record.merchantName}
												logoUrl={record.logoUrl}
												size="sm"
											/>
										</button>
										<div className="flex min-w-0 flex-col">
											<button
												type="button"
												onClick={() => {
													if (record.merchantId) {
														router.push(
															appendNavigationSource(
																`/merchants/${encodeURIComponent(record.merchantId)}`,
																"dashboard",
															),
														);
													}
												}}
												disabled={!record.merchantId}
												className="truncate text-left text-sm font-medium text-gray-900 transition-colors hover:text-cyan-600 focus-visible:text-cyan-600 disabled:cursor-default dark:text-white dark:hover:text-cyan-400 dark:focus-visible:text-cyan-400"
											>
												{record.merchantName}
											</button>
											<div className="flex items-center gap-1.5 text-[10px] text-gray-500 dark:text-gray-400">
												<button
													type="button"
													onClick={() => {
														if (record.categoryId) {
															router.push(
																appendNavigationSource(
																	`/categories/${encodeURIComponent(record.categoryId)}`,
																	"dashboard",
																),
															);
														}
													}}
													disabled={!record.categoryId}
													className={`flex items-center gap-1 hover:underline focus:underline disabled:cursor-default ${categoryColor}`}
												>
													<CategoryGlyph
														name={record.categoryName}
														size={12}
														colorClass={categoryColor}
													/>
													{record.categoryName || "Uncategorized"}
												</button>
												<span>•</span>
												<span>{formatFrequency(record.frequency)}</span>
											</div>
										</div>
									</div>
								</div>

								<div className="flex shrink-0 flex-col items-end text-right">
									<span className="text-sm font-bold text-gray-900 dark:text-white">
										{formatCurrency(Math.abs(record.amount))}
									</span>
									<div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400">
										<span>{formattedDate}</span>
										<span>
											(
											{diffDays < 0
												? `${Math.abs(diffDays)} days ago`
												: diffDays === 0
													? "Today"
													: `in ${diffDays} days`}
											)
										</span>
										<span className="shrink-0">
											{diffDays < 0 && (
												<Check size={12} className={categoryColor} />
											)}
											{diffDays === 0 && (
												<FlagTriangleRight
													size={12}
													className={categoryColor}
												/>
											)}
											{diffDays > 0 && (
												<Hourglass size={12} className={categoryColor} />
											)}
										</span>
									</div>
								</div>
							</div>
						);
					})}
				</div>
			) : (
				<div className="flex flex-col items-center justify-center py-6 text-center">
					<div className="flex size-12 items-center justify-center rounded-full bg-orange-100 text-orange-500 dark:bg-orange-500/20">
						<Receipt size={22} />
					</div>
					<h4 className="mt-3 text-base font-bold text-gray-900 dark:text-white">
						No upcoming bills
					</h4>
					<p className="mt-1 max-w-[240px] text-sm text-gray-500 dark:text-gray-400">
						You’re all set for this period!
					</p>
				</div>
			)}

			{showSeeRecurring && (
				<button
					onClick={() => router.push("/recurring")}
					className="mt-4 w-full rounded-lg bg-[#FF5A35] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#E04825]"
				>
					See recurring →
				</button>
			)}
		</WidgetShell>
	);
}
