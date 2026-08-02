"use client";

import { ChevronDown, Eye, EyeOff, Settings2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatCurrencyInt, formatSignedCurrencyInt } from "@/utils/formatters";
import { getCategoryTheme } from "@/constants";
import { getIconForCategory } from "@/lib/categoryIcons";
import { PlanInput } from "./PlanInput";
import { SimpleTooltip } from "./SimpleTooltip";
import type { CustomCategory } from "@/store/useBudgetStore";
import { RefObject } from "react";

interface PlanPageExpensesSectionProps {
	expanded: boolean;
	toggleSection: () => void;
	expandedGroups: Record<string, boolean>;
	toggleGroup: (groupName: string) => void;
	expenseGroupData: Record<
		string,
		{
			budgeted: Array<{
				label: string;
				value: number;
				key: string;
				id?: string;
			}>;
			unbudgeted: Array<{
				label: string;
				value: number;
				key: string;
				id?: string;
			}>;
		}
	>;
	groupTotals: Record<string, number>;
	showUnbudgeted: Record<string, boolean>;
	toggleUnbudgeted: (group: string) => void;
	categoryMap: Map<string, CustomCategory>;
	getPlanned: (categoryId: string) => number;
	handlePlanChange: (categoryId: string, rawValue: string) => void;
	setIsFlexibleBudgetOpen: (open: boolean) => void;
	router: ReturnType<typeof useRouter>;
	currentDate: Date;
	totalExpenses: number;
	setHistoryCategory: (category: string | null) => void;
	setHistoryAnchor: (anchor: HTMLElement | null) => void;
	setHistoryOpen: (open: boolean) => void;
	closeTimeoutRef: RefObject<NodeJS.Timeout | null>;
	setEditingCategory: (category: CustomCategory | null) => void;
}

export function PlanPageExpensesSection({
	expanded,
	toggleSection,
	expandedGroups,
	toggleGroup,
	expenseGroupData,
	groupTotals,
	showUnbudgeted,
	toggleUnbudgeted,
	categoryMap,
	getPlanned,
	handlePlanChange,
	setIsFlexibleBudgetOpen,
	router,
	currentDate,
	totalExpenses,
	setHistoryCategory,
	setHistoryAnchor,
	setHistoryOpen,
	closeTimeoutRef,
	setEditingCategory,
}: PlanPageExpensesSectionProps) {
	return (
		<div className="border-b border-gray-200 dark:border-white/5">
			<div className="flex w-full items-center bg-[#EBECEE] px-6 py-3 font-medium text-[#5D6064] dark:bg-[#2A2A2A] dark:text-gray-300 hover:bg-[#EAEBED] dark:hover:bg-[#353535]">
				<div className="sticky left-0 z-20 bg-[#EBECEE] dark:bg-[#2A2A2A] w-[30%] flex items-center gap-2 pl-2 shrink-0">
					<button
						onClick={toggleSection}
						className="p-0 bg-transparent border-none focus:outline-none"
					>
						<ChevronDown
							size={18}
							className={`text-gray-500 transition-transform ${expanded ? "rotate-0" : "-rotate-90"}`}
						/>
					</button>
					<span>Expenses</span>
				</div>
				<div className="w-[22%] text-center">Planned</div>
				<div className="w-[22%] text-center">Actual</div>
				<div className="w-[26%] text-center">Remaining</div>
			</div>

			{expanded && (
				<div className="bg-white dark:bg-[#191919]">
					{/* FIXED GROUP */}
					<div className="border-b border-gray-100 dark:border-white/5">
						<div className="flex w-full items-center px-6 py-3 hover:bg-[#F9FAFB] dark:hover:bg-[#151515]">
							<div className="sticky left-0 z-10 bg-white dark:bg-[#191919] w-[30%] flex items-center gap-2 pl-2 font-medium shrink-0">
								<button
									onClick={() => toggleGroup("Fixed")}
									className="p-0 bg-transparent border-none focus:outline-none"
								>
									<ChevronDown
										size={18}
										className={`text-gray-400 transition-transform ${expandedGroups.Fixed ? "rotate-0" : "-rotate-90"}`}
									/>
								</button>
								<span>Fixed</span>
							</div>
							<div className="w-[22%] text-center">
								<span className="font-medium text-lg">
									{formatCurrencyInt(getPlanned("Fixed"))}
								</span>
							</div>
							<div className="w-[22%] text-center text-lg font-medium">
								{formatCurrencyInt(groupTotals.Fixed || 0)}
							</div>
							<div className="w-[26%] text-center text-red-500 font-medium text-base">
								{formatSignedCurrencyInt(
									(groupTotals.Fixed || 0) - getPlanned("Fixed"),
								)}
							</div>
						</div>

						{expandedGroups.Fixed && (
							<div className="divide-y divide-gray-50 dark:divide-white/5">
								{expenseGroupData.Fixed.budgeted.map((row) => {
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

								{expenseGroupData.Fixed.unbudgeted.length > 0 && (
									<button
										onClick={() => toggleUnbudgeted("Fixed")}
										className="flex w-full items-center bg-[#F9FAFB] px-6 py-3 text-sm text-gray-400 hover:bg-[#F0F1F2] dark:bg-[#151515] dark:hover:bg-[#202020]"
									>
										<div className="sticky left-0 z-10 bg-[#F9FAFB] dark:bg-[#151515] w-[30%] flex items-center gap-3 pl-2 shrink-0">
											{showUnbudgeted["Fixed"] ? (
												<EyeOff size={16} />
											) : (
												<Eye size={16} />
											)}
											{showUnbudgeted["Fixed"] ? "Collapse" : "Show"}{" "}
											{expenseGroupData.Fixed.unbudgeted.length} unbudgeted
										</div>
										<div className="w-[22%] text-center"></div>
										<div className="w-[22%] text-center font-medium text-gray-700 dark:text-gray-300">
											{formatCurrencyInt(
												expenseGroupData.Fixed.unbudgeted.reduce(
													(sum, r) => sum + r.value,
													0,
												),
											)}
										</div>
										<div className="w-[26%] text-center"></div>
									</button>
								)}

								{showUnbudgeted["Fixed"] &&
									expenseGroupData.Fixed.unbudgeted.length > 0 && (
										<div className="divide-y divide-gray-50 dark:divide-white/5">
											{expenseGroupData.Fixed.unbudgeted.map((row) => {
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
															<span className="flex-1 truncate">
																{row.label}
															</span>
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
																		currentDate.toISOString().slice(0, 7) +
																		"-01";
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

					{/* FLEXIBLE GROUP */}
					<div className="border-b border-gray-100 dark:border-white/5">
						<div className="flex w-full items-center px-6 py-3 hover:bg-[#F9FAFB] dark:hover:bg-[#151515]">
							<div className="sticky left-0 z-10 bg-white dark:bg-[#191919] w-[30%] flex items-center gap-2 pl-2 font-medium shrink-0">
								<button
									onClick={() => toggleGroup("Flexible")}
									className="p-0 bg-transparent border-none focus:outline-none"
								>
									<ChevronDown
										size={18}
										className={`text-gray-400 transition-transform ${expandedGroups.Flexible ? "rotate-0" : "-rotate-90"}`}
									/>
								</button>
								<span>Flexible</span>
								<button
									onClick={() => setIsFlexibleBudgetOpen(true)}
									className="rounded p-1 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
								>
									<Settings2 size={16} className="text-gray-400" />
								</button>
							</div>
							<div className="w-[22%] text-center">
								<PlanInput
									value={getPlanned("Flexible")}
									onChange={(val) => handlePlanChange("Flexible", val)}
								/>
							</div>
							<div className="w-[22%] text-center text-lg font-medium">
								{formatCurrencyInt(groupTotals.Flexible || 0)}
							</div>
							<div className="w-[26%] text-center font-medium text-base">
								<span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
									{formatCurrencyInt(
										getPlanned("Flexible") - (groupTotals.Flexible || 0),
									)}
								</span>
							</div>
						</div>

						<div className="relative flex w-full bg-white px-6 pb-1 dark:bg-[#191919]">
							<div className="ml-[30%] h-1 w-[22%] overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
								<div
									className="h-full bg-emerald-500 dark:bg-emerald-400"
									style={{
										width: `${Math.min(((groupTotals.Flexible || 0) / Math.max(getPlanned("Flexible"), 1)) * 100, 100)}%`,
									}}
								/>
							</div>
						</div>

						{expandedGroups.Flexible && (
							<div className="divide-y divide-gray-50 dark:divide-white/5">
								{expenseGroupData.Flexible.budgeted.map((row) => {
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
													className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${theme.text} ${row.label === "Uncategorized" ? "bg-white border border-gray-300 dark:bg-[#232323] dark:border-white/10" : "bg-gray-100 dark:bg-white/10"}`}
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

								{expenseGroupData.Flexible.unbudgeted.length > 0 && (
									<button
										onClick={() => toggleUnbudgeted("Flexible")}
										className="flex w-full items-center bg-[#F9FAFB] px-6 py-3 text-sm text-gray-400 hover:bg-[#F0F1F2] dark:bg-[#151515] dark:hover:bg-[#202020]"
									>
										<div className="sticky left-0 z-10 bg-[#F9FAFB] dark:bg-[#151515] w-[30%] flex items-center gap-3 pl-2 shrink-0">
											{showUnbudgeted["Flexible"] ? (
												<EyeOff size={16} />
											) : (
												<Eye size={16} />
											)}
											{showUnbudgeted["Flexible"] ? "Collapse" : "Show"}{" "}
											{expenseGroupData.Flexible.unbudgeted.length} unbudgeted
										</div>
										<div className="w-[22%] text-center"></div>
										<div className="w-[22%] text-center font-medium text-gray-700 dark:text-gray-300">
											{formatCurrencyInt(
												expenseGroupData.Flexible.unbudgeted.reduce(
													(sum, r) => sum + r.value,
													0,
												),
											)}
										</div>
										<div className="w-[26%] text-center"></div>
									</button>
								)}

								{showUnbudgeted["Flexible"] &&
									expenseGroupData.Flexible.unbudgeted.length > 0 && (
										<div className="divide-y divide-gray-50 dark:divide-white/5">
											{expenseGroupData.Flexible.unbudgeted.map((row) => {
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
																className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${theme.text} ${row.label === "Uncategorized" ? "bg-white border border-gray-300 dark:bg-[#232323] dark:border-white/10" : "bg-gray-100 dark:bg-white/10"}`}
															>
																{(() => {
																	const Icon = getIconForCategory(row.label);
																	return <Icon size={14} />;
																})()}
															</div>
															<span className="flex-1 truncate">
																{row.label}
															</span>
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
																		currentDate.toISOString().slice(0, 7) +
																		"-01";
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

					{/* NON-MONTHLY GROUP */}
					<div className="border-b border-gray-100 dark:border-white/5">
						<div className="flex w-full items-center px-6 py-3 hover:bg-[#F9FAFB] dark:hover:bg-[#151515]">
							<div className="sticky left-0 z-10 bg-white dark:bg-[#191919] w-[30%] flex items-center gap-2 pl-2 font-medium shrink-0">
								<button
									onClick={() => toggleGroup("Non-Monthly")}
									className="p-0 bg-transparent border-none focus:outline-none"
								>
									<ChevronDown
										size={18}
										className={`text-gray-400 transition-transform ${expandedGroups["Non-Monthly"] ? "rotate-0" : "-rotate-90"}`}
									/>
								</button>
								<span>Non-Monthly</span>
							</div>
							<div className="w-[22%] text-center">
								<span className="font-medium text-lg">
									{formatCurrencyInt(getPlanned("Non-Monthly"))}
								</span>
							</div>
							<div className="w-[22%] text-center text-lg font-medium">
								{formatCurrencyInt(groupTotals["Non-Monthly"] || 0)}
							</div>
							<div className="w-[26%] text-center font-medium text-base">
								<span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
									{formatCurrencyInt(
										getPlanned("Non-Monthly") -
											(groupTotals["Non-Monthly"] || 0),
									)}
								</span>
							</div>
						</div>

						{expandedGroups["Non-Monthly"] && (
							<div className="divide-y divide-gray-50 dark:divide-white/5">
								{expenseGroupData["Non-Monthly"].budgeted.map((row) => {
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

								{expenseGroupData["Non-Monthly"].unbudgeted.length > 0 && (
									<button
										onClick={() => toggleUnbudgeted("Non-Monthly")}
										className="flex w-full items-center bg-[#F9FAFB] px-6 py-3 text-sm text-gray-400 hover:bg-[#F0F1F2] dark:bg-[#151515] dark:hover:bg-[#202020]"
									>
										<div className="sticky left-0 z-10 bg-[#F9FAFB] dark:bg-[#151515] w-[30%] flex items-center gap-3 pl-2 shrink-0">
											{showUnbudgeted["Non-Monthly"] ? (
												<EyeOff size={16} />
											) : (
												<Eye size={16} />
											)}
											{showUnbudgeted["Non-Monthly"] ? "Collapse" : "Show"}{" "}
											{expenseGroupData["Non-Monthly"].unbudgeted.length}{" "}
											unbudgeted
										</div>
										<div className="w-[22%] text-center"></div>
										<div className="w-[22%] text-center font-medium text-gray-700 dark:text-gray-300">
											{formatCurrencyInt(
												expenseGroupData["Non-Monthly"].unbudgeted.reduce(
													(sum, r) => sum + r.value,
													0,
												),
											)}
										</div>
										<div className="w-[26%] text-center"></div>
									</button>
								)}

								{showUnbudgeted["Non-Monthly"] &&
									expenseGroupData["Non-Monthly"].unbudgeted.length > 0 && (
										<div className="divide-y divide-gray-50 dark:divide-white/5">
											{expenseGroupData["Non-Monthly"].unbudgeted.map((row) => {
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
															<span className="flex-1 truncate">
																{row.label}
															</span>
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
																		currentDate.toISOString().slice(0, 7) +
																		"-01";
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

					{/* Total Expenses Row */}
					<div className="flex items-center bg-[#F9FAFB] px-6 py-4 font-semibold dark:bg-[#151515]">
						<div className="sticky left-0 z-10 bg-[#F9FAFB] dark:bg-[#151515] w-[30%] pl-2 text-base shrink-0">
							Total Expenses
						</div>
						<div className="w-[22%] text-center text-base">
							{formatCurrencyInt(
								getPlanned("Fixed") +
									getPlanned("Flexible") +
									getPlanned("Non-Monthly"),
							)}
						</div>
						<div className="w-[22%] text-center text-base">
							{formatCurrencyInt(totalExpenses)}
						</div>
						<div className="w-[26%] text-center text-red-500 text-base">
							{formatSignedCurrencyInt(
								totalExpenses -
									(getPlanned("Fixed") +
										getPlanned("Flexible") +
										getPlanned("Non-Monthly")),
							)}
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
