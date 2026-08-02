"use client";

import { ChevronDown, Eye, EyeOff, Settings2 } from "lucide-react";
import { formatCurrencyInt } from "@/utils/formatters";
import { getCategoryTheme } from "@/constants";
import { getIconForCategory } from "@/lib/categoryIcons";
import { PlanInput } from "./PlanInput";
import { SimpleTooltip } from "./SimpleTooltip";
import type { CustomCategory } from "@/store/useBudgetStore";
import { useRouter } from "next/navigation";
import { RefObject } from "react";

interface PlanPageIncomeSectionProps {
	expanded: boolean; // expandedSections.income
	toggleSection: () => void; // toggleSection("income")
	expandedGroup: boolean; // expandedGroups.Income
	toggleGroup: () => void; // toggleGroup("Income")
	budgetedRows: Array<{
		label: string;
		value: number;
		key: string;
		id?: string;
	}>;
	unbudgetedRows: Array<{
		label: string;
		value: number;
		key: string;
		id?: string;
	}>;
	showUnbudgeted: boolean; // showUnbudgeted["Income"]
	toggleUnbudgeted: () => void; // toggleUnbudgeted("Income")
	categoryMap: Map<string, CustomCategory>;
	getPlanned: (categoryId: string) => number;
	handlePlanChange: (categoryId: string, rawValue: string) => void;
	setIsEditGroupOpen: (open: boolean) => void;
	router: ReturnType<typeof useRouter>;
	currentDate: Date;
	totalIncome: number;
	setHistoryCategory: (category: string | null) => void;
	setHistoryAnchor: (anchor: HTMLElement | null) => void;
	setHistoryOpen: (open: boolean) => void;
	closeTimeoutRef: RefObject<NodeJS.Timeout | null>;
	setEditingCategory: (category: CustomCategory | null) => void;
}

export function PlanPageIncomeSection({
	expanded,
	toggleSection,
	expandedGroup,
	toggleGroup,
	budgetedRows,
	unbudgetedRows,
	showUnbudgeted,
	toggleUnbudgeted,
	categoryMap,
	getPlanned,
	handlePlanChange,
	setIsEditGroupOpen,
	router,
	currentDate,
	totalIncome,
	setHistoryCategory,
	setHistoryAnchor,
	setHistoryOpen,
	closeTimeoutRef,
	setEditingCategory,
}: PlanPageIncomeSectionProps) {
	return (
		<div className="border-b border-gray-200 dark:border-white/5">
			<div className="flex w-full items-center bg-[#F3F4F6] px-6 py-3 font-medium text-[#5D6064] dark:bg-[#2A2A2A] dark:text-gray-300 hover:bg-[#EAEBED] dark:hover:bg-[#353535]">
				<div className="sticky left-0 z-20 bg-[#F3F4F6] dark:bg-[#2A2A2A] w-[30%] flex items-center gap-2 pl-2 shrink-0">
					<button
						onClick={toggleSection}
						className="p-0 bg-transparent border-none focus:outline-none"
					>
						<ChevronDown
							size={18}
							className={`text-gray-500 transition-transform ${expanded ? "rotate-0" : "-rotate-90"}`}
						/>
					</button>
					<span>Income</span>
				</div>
				<div className="w-[22%] text-center">Planned</div>
				<div className="w-[22%] text-center">Actual</div>
				<div className="w-[26%] text-center">Remaining</div>
			</div>

			{expanded && (
				<div className="bg-white dark:bg-[#191919]">
					<div className="border-b border-gray-100 dark:border-white/5">
						<div className="flex w-full items-center px-6 py-3 hover:bg-[#F9FAFB] dark:hover:bg-[#151515]">
							<div className="sticky left-0 z-10 bg-white dark:bg-[#191919] w-[30%] flex items-center gap-2 pl-2 font-medium shrink-0">
								<button
									onClick={toggleGroup}
									className="p-0 bg-transparent border-none focus:outline-none"
								>
									<ChevronDown
										size={18}
										className={`text-gray-400 transition-transform ${expandedGroup ? "rotate-0" : "-rotate-90"}`}
									/>
								</button>
								<span>Income</span>
								<button
									onClick={() => setIsEditGroupOpen(true)}
									className="rounded p-1 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
								>
									<Settings2 size={16} className="text-gray-400" />
								</button>
							</div>
							<div className="w-[22%] text-center font-medium text-lg">
								<span className="font-medium text-lg">
									{formatCurrencyInt(getPlanned("Income"))}
								</span>
							</div>
							<div className="w-[22%] text-center font-medium text-lg">
								{formatCurrencyInt(totalIncome)}
							</div>
							<div className="w-[26%] text-center"></div>
						</div>

						{expandedGroup && (
							<div className="divide-y divide-gray-50 dark:divide-white/5">
								{budgetedRows.map((row) => {
									const foundCat = categoryMap.get(row.label.trim());
									const theme = getCategoryTheme(row.label);
									return (
										<div
											key={row.key}
											className="flex items-center bg-[#F9FAFB] px-6 py-3 dark:bg-[#151515] hover:bg-gray-100 dark:hover:bg-white/5 group"
										>
											<div
												onClick={() => {
													if (foundCat)
														router.push(`/categories/${foundCat.id}`);
												}}
												className="sticky left-0 z-10 bg-[#F9FAFB] dark:bg-[#151515] w-[30%] flex items-center gap-3 pl-2 text-sm font-medium text-[#484B50] dark:text-gray-300 cursor-pointer shrink-0"
											>
												<div
													className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-white/10 text-xs ${theme.text}`}
												>
													{(() => {
														const Icon = getIconForCategory(row.label);
														return <Icon size={14} />;
													})()}
												</div>
												<span className="flex-1 truncate">{row.label}</span>
												{foundCat && (
													<button
														onClick={(e) => {
															e.stopPropagation();
															setEditingCategory(foundCat);
														}}
														className="opacity-0 group-hover:opacity-100 p-1.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 dark:border-white/10 dark:bg-[#191919] dark:hover:bg-white/5 shadow-sm transition-all ml-auto"
													>
														<Settings2
															size={16}
															className="text-gray-500 dark:text-gray-400"
														/>
													</button>
												)}
											</div>

											<div className="w-[22%] text-center">
												<PlanInput
													value={getPlanned(row.label)}
													onChange={(val) => handlePlanChange(row.label, val)}
													onClick={(e) => {
														setHistoryCategory(row.label);
														setHistoryAnchor(e.currentTarget);
														setHistoryOpen(true);
													}}
												/>
											</div>
											<div
												onClick={() => {
													if (foundCat) {
														const dateParam =
															currentDate.toISOString().slice(0, 7) + "-01";
														router.push(
															`/categories/${foundCat.id}?date=${dateParam}`,
														);
													}
												}}
												onMouseEnter={(e) => {
													if (closeTimeoutRef.current) {
														clearTimeout(closeTimeoutRef.current);
														closeTimeoutRef.current = null;
													}
													setHistoryCategory(row.label);
													setHistoryAnchor(e.currentTarget);
													setHistoryOpen(true);
												}}
												onMouseLeave={() => {
													closeTimeoutRef.current = setTimeout(() => {
														setHistoryOpen(false);
													}, 300);
												}}
												className="w-[22%] text-center text-sm cursor-pointer hover:underline"
											>
												{formatCurrencyInt(row.value)}
											</div>
											<div className="w-[26%] text-center flex items-center justify-end pr-2">
												<SimpleTooltip
													label={row.label}
													planned={getPlanned(row.label)}
													actual={row.value}
													remaining={getPlanned(row.label) - row.value}
												>
													<span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
														{formatCurrencyInt(
															getPlanned(row.label) - row.value,
														)}
													</span>
												</SimpleTooltip>
											</div>
										</div>
									);
								})}

								{unbudgetedRows.length > 0 && (
									<button
										onClick={toggleUnbudgeted}
										className="flex w-full items-center bg-[#F9FAFB] px-6 py-3 text-sm text-gray-400 hover:bg-[#F0F1F2] dark:bg-[#151515] dark:hover:bg-[#202020]"
									>
										<div className="sticky left-0 z-10 bg-[#F9FAFB] dark:bg-[#151515] w-[30%] flex items-center gap-3 pl-2 shrink-0">
											{showUnbudgeted ? (
												<EyeOff size={16} />
											) : (
												<Eye size={16} />
											)}
											{showUnbudgeted ? "Collapse" : "Show"}{" "}
											{unbudgetedRows.length} unbudgeted
										</div>
										<div className="w-[22%] text-center"></div>
										<div className="w-[22%] text-center font-medium text-gray-700 dark:text-gray-300">
											{formatCurrencyInt(
												unbudgetedRows.reduce((sum, r) => sum + r.value, 0),
											)}
										</div>
										<div className="w-[26%] text-center"></div>
									</button>
								)}

								{showUnbudgeted && unbudgetedRows.length > 0 && (
									<div className="divide-y divide-gray-50 dark:divide-white/5">
										{unbudgetedRows.map((row) => {
											const foundCat = categoryMap.get(row.label.trim());
											const theme = getCategoryTheme(row.label);
											return (
												<div
													key={row.key}
													className="flex items-center bg-[#F9FAFB] px-6 py-3 dark:bg-[#151515] hover:bg-gray-100 dark:hover:bg-white/5 group"
												>
													<div
														onClick={() => {
															if (foundCat)
																router.push(`/categories/${foundCat.id}`);
														}}
														onMouseEnter={(e) => {
															if (closeTimeoutRef.current) {
																clearTimeout(closeTimeoutRef.current);
																closeTimeoutRef.current = null;
															}
															setHistoryCategory(row.label);
															setHistoryAnchor(e.currentTarget);
															setHistoryOpen(true);
														}}
														onMouseLeave={() => {
															closeTimeoutRef.current = setTimeout(() => {
																setHistoryOpen(false);
															}, 300);
														}}
														className="sticky left-0 z-10 bg-[#F9FAFB] dark:bg-[#151515] w-[30%] flex items-center gap-3 pl-2 text-sm font-medium text-[#484B50] dark:text-gray-300 cursor-pointer shrink-0"
													>
														<div
															className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-white/10 text-xs ${theme.text}`}
														>
															{(() => {
																const Icon = getIconForCategory(row.label);
																return <Icon size={14} />;
															})()}
														</div>
														<span className="flex-1 truncate">{row.label}</span>
														{foundCat && (
															<button
																onClick={(e) => {
																	e.stopPropagation();
																	setEditingCategory(foundCat);
																}}
																className="opacity-0 group-hover:opacity-100 p-1.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 dark:border-white/10 dark:bg-[#191919] dark:hover:bg-white/5 shadow-sm transition-all ml-auto"
															>
																<Settings2
																	size={16}
																	className="text-gray-500 dark:text-gray-400"
																/>
															</button>
														)}
													</div>
													<div className="w-[22%] text-center">
														<PlanInput
															value={getPlanned(row.label)}
															onChange={(val) =>
																handlePlanChange(row.label, val)
															}
															onClick={(e) => {
																setHistoryCategory(row.label);
																setHistoryAnchor(e.currentTarget);
																setHistoryOpen(true);
															}}
														/>
													</div>
													<div
														onClick={() => {
															if (foundCat) {
																const dateParam =
																	currentDate.toISOString().slice(0, 7) + "-01";
																router.push(
																	`/categories/${foundCat.id}?date=${dateParam}`,
																);
															}
														}}
														onMouseEnter={(e) => {
															if (closeTimeoutRef.current) {
																clearTimeout(closeTimeoutRef.current);
																closeTimeoutRef.current = null;
															}
															setHistoryCategory(row.label);
															setHistoryAnchor(e.currentTarget);
															setHistoryOpen(true);
														}}
														onMouseLeave={() => {
															closeTimeoutRef.current = setTimeout(() => {
																setHistoryOpen(false);
															}, 300);
														}}
														className="w-[22%] text-center text-sm cursor-pointer hover:underline"
													>
														{formatCurrencyInt(row.value)}
													</div>
													<div className="w-[26%] text-center flex items-center justify-end pr-2">
														<SimpleTooltip
															label={row.label}
															planned={getPlanned(row.label)}
															actual={row.value}
															remaining={getPlanned(row.label) - row.value}
														>
															<span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
																{formatCurrencyInt(
																	getPlanned(row.label) - row.value,
																)}
															</span>
														</SimpleTooltip>
													</div>
												</div>
											);
										})}
									</div>
								)}
							</div>
						)}
					</div>
					<div className="flex items-center bg-[#F9FAFB] px-6 py-4 font-semibold dark:bg-[#151515]">
						<div className="sticky left-0 z-10 bg-[#F9FAFB] dark:bg-[#151515] w-[30%] pl-2 text-base shrink-0">
							Total Income
						</div>
						<div className="w-[22%] text-center text-base">
							{formatCurrencyInt(getPlanned("Income"))}
						</div>
						<div className="w-[22%] text-center text-base">
							{formatCurrencyInt(totalIncome)}
						</div>
						<div className="w-[26%] text-center"></div>
					</div>
				</div>
			)}
		</div>
	);
}
