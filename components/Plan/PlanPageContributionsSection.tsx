"use client";

import { ChevronDown, Eye, EyeOff, Settings2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatCurrencyInt } from "@/utils/formatters";
import { PlanInput } from "./PlanInput";
import type { SavingsGoal } from "@/lib/goals/types";
import type { EditableAccount } from "@/components/Accounts/details/EditAccountForm";

interface PlanPageContributionsSectionProps {
	expanded: boolean;
	toggleSection: () => void;
	expandedGroups: Record<string, boolean>;
	toggleGroup: (groupName: string) => void;
	showUnbudgeted: Record<string, boolean>;
	toggleUnbudgeted: (group: string) => void;
	goals: SavingsGoal[];
	accounts: Array<{
		id: string;
		name: string;
		current_balance?: number | null;
		exclude_from_paydown?: boolean | null;
	}>;
	getPlanned: (categoryId: string) => number;
	handlePlanChange: (categoryId: string, rawValue: string) => void;
	router: ReturnType<typeof useRouter>;
	setEditingGoal: (goal: SavingsGoal | null) => void;
	setEditingAccount: (account: EditableAccount | null) => void;
	setGoalContributionOpen: (open: boolean) => void;
	setGoalContributionGoal: (goal: SavingsGoal | null) => void;
	setGoalContributionAnchor: (anchor: HTMLElement | null) => void;
	setGoalContributionValue: (value: number) => void;
	setAccountPaydownAccount: (account: EditableAccount | null) => void;
	setAccountPaydownAnchor: (anchor: HTMLElement | null) => void;
	setAccountPaydownValue: (value: number) => void;
	setAccountPaydownOpen: (open: boolean) => void;
	setHistoryCategory: (category: string | null) => void;
	setHistoryAnchor: (anchor: HTMLElement | null) => void;
	setHistoryOpen: (open: boolean) => void;
}

export function PlanPageContributionsSection({
	expanded,
	toggleSection,
	expandedGroups,
	toggleGroup,
	showUnbudgeted,
	toggleUnbudgeted,
	goals,
	accounts,
	getPlanned,
	handlePlanChange,
	router,
	setEditingGoal,
	setEditingAccount,
	setGoalContributionOpen,
	setGoalContributionGoal,
	setGoalContributionAnchor,
	setGoalContributionValue,
	setAccountPaydownAccount,
	setAccountPaydownAnchor,
	setAccountPaydownValue,
	setAccountPaydownOpen,
	setHistoryCategory,
	setHistoryAnchor,
	setHistoryOpen,
}: PlanPageContributionsSectionProps) {
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
					<span>Contributions</span>
				</div>
				<div className="w-[22%] text-center">Planned</div>
				<div className="w-[22%] text-center">Actual</div>
				<div className="w-[26%] text-center">Remaining</div>
			</div>

			{expanded && (
				<div className="bg-white dark:bg-[#191919]">
					{/* ====== SAVE UP GROUP ====== */}
					<div className="border-b border-gray-100 dark:border-white/5">
						<div className="flex w-full items-center px-6 py-3 hover:bg-[#F9FAFB] dark:hover:bg-[#151515]">
							<div className="sticky left-0 z-10 bg-white dark:bg-[#191919] w-[30%] flex items-center gap-2 pl-2 font-medium shrink-0">
								<button
									onClick={() => toggleGroup("Save up")}
									className="p-0 bg-transparent border-none focus:outline-none"
								>
									<ChevronDown
										size={18}
										className={`text-gray-400 transition-transform ${expandedGroups["Save up"] ? "rotate-0" : "-rotate-90"}`}
									/>
								</button>
								<span>Save up</span>
							</div>
							<div className="w-[22%] text-center text-lg font-medium">
								<span className="font-medium text-lg">
									{formatCurrencyInt(getPlanned("Save up"))}
								</span>
							</div>
							<div className="w-[22%] text-center text-lg font-medium">$0</div>
							<div className="w-[26%] text-center"></div>
						</div>

						{expandedGroups["Save up"] && (
							<div className="divide-y divide-gray-50 dark:divide-white/5">
								{goals.map((goal) => {
									const planned = getPlanned(goal.id);
									const actual = goal.saved;
									const isBudgeted = !(planned === 0 && actual === 0);
									if (!isBudgeted) return null;
									return (
										<div
											key={goal.id}
											className="flex items-center bg-[#F9FAFB] px-6 py-3 dark:bg-[#151515] cursor-pointer hover:bg-gray-100 dark:hover:bg-white/5 group"
											onClick={() => router.push(`/goals/savings/${goal.id}`)}
										>
											<div className="sticky left-0 z-10 bg-[#F9FAFB] dark:bg-[#151515] w-[30%] flex items-center gap-3 pl-2 text-sm font-medium text-[#484B50] dark:text-gray-300 shrink-0">
												<div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300 text-xs border border-gray-200 dark:border-white/10">
													<span>🎯</span>
												</div>
												{goal.name}
												{goal.status && (
													<span className="ml-2 rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-bold text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
														{goal.status}
													</span>
												)}
												<button
													onClick={(e) => {
														e.stopPropagation();
														setEditingGoal(goal);
													}}
													className="opacity-0 group-hover:opacity-100 ml-auto p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
												>
													<Settings2 size={16} />
												</button>
											</div>
											<div className="w-[22%] text-center">
												<PlanInput
													value={getPlanned(goal.id)}
													onChange={(val) => handlePlanChange(goal.id, val)}
													onClick={(e) => {
														e.stopPropagation();
														setGoalContributionGoal(goal);
														setGoalContributionAnchor(e.currentTarget);
														setGoalContributionValue(getPlanned(goal.id));
														setGoalContributionOpen(true);
													}}
												/>
											</div>
											<div className="w-[22%] text-center text-sm">
												{formatCurrencyInt(actual)}
											</div>
											<div className="w-[26%] text-center flex items-center justify-end pr-2"></div>
										</div>
									);
								})}

								{/* Unbudgeted goals */}
								{goals.filter((g) => getPlanned(g.id) === 0 && g.saved === 0)
									.length > 0 && (
									<button
										onClick={() => toggleUnbudgeted("Save up")}
										className="flex w-full items-center bg-[#F9FAFB] px-6 py-3 text-sm text-gray-400 hover:bg-[#F0F1F2] dark:bg-[#151515] dark:hover:bg-[#202020]"
									>
										<div className="sticky left-0 z-10 bg-[#F9FAFB] dark:bg-[#151515] w-[30%] flex items-center gap-3 pl-2 shrink-0">
											{showUnbudgeted["Save up"] ? (
												<EyeOff size={16} />
											) : (
												<Eye size={16} />
											)}
											{showUnbudgeted["Save up"] ? "Collapse" : "Show"}{" "}
											{
												goals.filter(
													(g) => getPlanned(g.id) === 0 && g.saved === 0,
												).length
											}{" "}
											unbudgeted
										</div>
										<div className="w-[22%] text-center"></div>
										<div className="w-[22%] text-center font-medium text-gray-700 dark:text-gray-300">
											$0
										</div>
										<div className="w-[26%] text-center"></div>
									</button>
								)}

								{showUnbudgeted["Save up"] && (
									<div className="divide-y divide-gray-50 dark:divide-white/5">
										{goals
											.filter((g) => getPlanned(g.id) === 0 && g.saved === 0)
											.map((goal) => (
												<div
													key={goal.id}
													className="flex items-center bg-[#F9FAFB] px-6 py-3 dark:bg-[#151515] cursor-pointer hover:bg-gray-100 dark:hover:bg-white/5 group"
													onClick={() =>
														router.push(`/goals/savings/${goal.id}`)
													}
												>
													<div className="sticky left-0 z-10 bg-[#F9FAFB] dark:bg-[#151515] w-[30%] flex items-center gap-3 pl-2 text-sm font-medium text-[#484B50] dark:text-gray-300 shrink-0">
														<div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300 text-xs border border-gray-200 dark:border-white/10">
															<span>🎯</span>
														</div>
														{goal.name}
														{goal.status && (
															<span className="ml-2 rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-bold text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
																{goal.status}
															</span>
														)}
														<button
															onClick={(e) => {
																e.stopPropagation();
																setEditingGoal(goal);
															}}
															className="opacity-0 group-hover:opacity-100 ml-auto p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
														>
															<Settings2 size={16} />
														</button>
													</div>
													<div className="w-[22%] text-center">
														<PlanInput
															value={getPlanned(goal.id)}
															onChange={(val) => handlePlanChange(goal.id, val)}
															onClick={(e) => {
																e.stopPropagation();
																setHistoryCategory(goal.name);
																setHistoryAnchor(e.currentTarget);
																setHistoryOpen(true);
															}}
														/>
													</div>
													<div className="w-[22%] text-center text-sm">
														{formatCurrencyInt(goal.saved)}
													</div>
													<div className="w-[26%] text-center flex items-center justify-end pr-2"></div>
												</div>
											))}
									</div>
								)}
							</div>
						)}
					</div>

					{/* ====== PAY DOWN GROUP ====== */}
					<div className="border-b border-gray-100 dark:border-white/5">
						<div className="flex w-full items-center px-6 py-3 hover:bg-[#F9FAFB] dark:hover:bg-[#151515]">
							<div className="sticky left-0 z-10 bg-white dark:bg-[#191919] w-[30%] flex items-center gap-2 pl-2 font-medium shrink-0">
								<button
									onClick={() => toggleGroup("Pay down")}
									className="p-0 bg-transparent border-none focus:outline-none"
								>
									<ChevronDown
										size={18}
										className={`text-gray-400 transition-transform ${expandedGroups["Pay down"] ? "rotate-0" : "-rotate-90"}`}
									/>
								</button>
								<span>Pay down</span>
							</div>
							<div className="w-[22%] text-center text-lg font-medium">
								<span className="font-medium text-lg">
									{formatCurrencyInt(getPlanned("Pay down"))}
								</span>
							</div>
							<div className="w-[22%] text-center text-lg font-medium">$0</div>
							<div className="w-[26%] text-center text-base">
								<span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
									{formatCurrencyInt(getPlanned("Pay down"))}
								</span>
							</div>
						</div>

						{expandedGroups["Pay down"] && (
							<div className="divide-y divide-gray-50 dark:divide-white/5">
								{accounts
									.filter(
										(acc) =>
											(acc.current_balance || 0) > 0 &&
											!acc.exclude_from_paydown,
									)
									.map((acc) => (
										<div
											key={acc.id}
											className="flex items-center bg-[#F9FAFB] px-6 py-3 dark:bg-[#151515] cursor-pointer hover:bg-gray-100 dark:hover:bg-white/5 group"
											onClick={() => router.push(`/accounts/details/${acc.id}`)}
										>
											<div className="sticky left-0 z-10 bg-[#F9FAFB] dark:bg-[#151515] w-[30%] flex items-center gap-3 pl-2 text-sm font-medium text-[#484B50] dark:text-gray-300 shrink-0">
												<div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300 text-xs border border-gray-200 dark:border-white/10">
													💳
												</div>
												{acc.name}
												<button
													onClick={(e) => {
														e.stopPropagation();
														setEditingAccount(acc as EditableAccount);
													}}
													className="opacity-0 group-hover:opacity-100 ml-auto p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
												>
													<Settings2 size={16} />
												</button>
											</div>
											<div className="w-[22%] text-center">
												<PlanInput
													value={getPlanned(acc.id)}
													onChange={(val) => handlePlanChange(acc.id, val)}
													onClick={(e) => {
														e.stopPropagation();
														setAccountPaydownAccount(acc as EditableAccount);
														setAccountPaydownAnchor(e.currentTarget);
														setAccountPaydownValue(getPlanned(acc.id));
														setAccountPaydownOpen(true);
													}}
												/>
											</div>
											<div className="w-[22%] text-center text-sm">
												{formatCurrencyInt(acc.current_balance || 0)}
											</div>
											<div className="w-[26%] text-center flex items-center justify-end pr-2"></div>
										</div>
									))}
							</div>
						)}
					</div>

					{/* Total Contributions */}
					<div className="flex items-center bg-[#F9FAFB] px-6 py-4 font-semibold dark:bg-[#151515]">
						<div className="sticky left-0 z-10 bg-[#F9FAFB] dark:bg-[#151515] w-[30%] pl-2 text-base shrink-0">
							Total Contributions
						</div>
						<div className="w-[22%] text-center text-base">
							{formatCurrencyInt(
								getPlanned("Save up") + getPlanned("Pay down"),
							)}
						</div>
						<div className="w-[22%] text-center text-base">$0</div>
						<div className="w-[26%] text-center text-base">
							<span className="text-emerald-600 dark:text-emerald-400">
								{formatCurrencyInt(
									getPlanned("Save up") + getPlanned("Pay down"),
								)}
							</span>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
