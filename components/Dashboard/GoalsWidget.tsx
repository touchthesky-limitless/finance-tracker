/**
 * Displays a list of savings goals with progress bars.
 * Users can select up to 5 goals to show via a settings modal.
 */
"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { Settings2, X } from "lucide-react";
import { SavingsGoal, GoalAccountView } from "@/lib/goals/types";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { MOBILE_BREAKPOINT } from "@/config/breakpoints";
import { formatCurrency } from "@/utils/formatters";
import { GoalImage } from "@/components/Goals/GoalImage";
import { AccountLogo, ProgressBar } from "@/components/Goals/GoalsUI";
import { formatGoalDate, getGoalProgress } from "@/lib/goals/formatters";
import { WidgetShell } from "./WidgetShell";

const GOAL_WIDGET_STORAGE_KEY = "dashboard-widget-goal-ids";

interface GoalsWidgetProps {
	goals: SavingsGoal[];
	savingsAccounts: GoalAccountView[];
}

export function GoalsWidget({ goals, savingsAccounts }: GoalsWidgetProps) {
	const isMobile = useMediaQuery(MOBILE_BREAKPOINT);
	const [isSettingsOpen, setIsSettingsOpen] = useState(false);
	const [tempSelectedIds, setTempSelectedIds] = useState<string[]>([]);

	const [widgetGoalIds, setWidgetGoalIds] = useState<string[]>(() => {
		try {
			const stored = localStorage.getItem(GOAL_WIDGET_STORAGE_KEY);
			if (stored) {
				const parsed = JSON.parse(stored);
				return parsed;
			}
		} catch (e) {
			console.error("Failed to read goal widget settings", e);
		}
		return goals.slice(0, 5).map((g) => g.id);
	});

	const visibleGoals = useMemo(() => {
		if (widgetGoalIds.length === 0) return [];
		return goals.filter((g) => widgetGoalIds.includes(g.id));
	}, [goals, widgetGoalIds]);

	const totalSaved = useMemo(
		() => visibleGoals.reduce((sum, g) => sum + g.saved, 0),
		[visibleGoals],
	);

	const handleOpenSettings = () => {
		setTempSelectedIds(widgetGoalIds);
		setIsSettingsOpen(true);
	};

	const handleSaveSettings = () => {
		setWidgetGoalIds(tempSelectedIds);
		localStorage.setItem(
			GOAL_WIDGET_STORAGE_KEY,
			JSON.stringify(tempSelectedIds),
		);
		setIsSettingsOpen(false);
	};

	const toggleGoalSelection = (id: string) => {
		setTempSelectedIds((prev) => {
			if (prev.includes(id)) {
				return prev.filter((gid) => gid !== id);
			}
			if (prev.length >= 5) return prev;
			return [...prev, id];
		});
	};

	return (
		<>
			<WidgetShell
				title="Goals"
				subtitle={
					<>
						<span className="text-emerald-500 dark:text-emerald-400">
							↗ {formatCurrency(totalSaved)}
						</span>
						<span className="text-gray-500 dark:text-gray-400">
							{" "}
							this month
						</span>
					</>
				}
				dropdown={
					<button
						onClick={handleOpenSettings}
						className="text-gray-500 transition-colors hover:text-gray-900 dark:hover:text-white"
					>
						<Settings2 size={16} />
					</button>
				}
				className="min-h-[200px]"
			>
				{visibleGoals.length > 0 ? (
					<div className={`space-y-${isMobile ? 2 : 3}`}>
						{visibleGoals.map((goal) => {
							const progress = getGoalProgress(goal);
							const linkedAccount = savingsAccounts.find((acc) =>
								goal.linkedAccountIds?.includes(acc.id),
							);
							return (
								<Link
									key={goal.id}
									href={`/goals/savings/${encodeURIComponent(goal.id)}`}
									className={`flex flex-col gap-${isMobile ? 1 : 2} rounded-lg p-${
										isMobile ? 2 : 3
									} transition-colors hover:bg-gray-50 dark:hover:bg-white/5`}
								>
									<div className="flex items-start justify-between">
										<div className="flex min-w-0 flex-1 items-center gap-3">
											<GoalImage
												src={goal.imageUrl}
												alt={goal.name}
												className={`shrink-0 rounded-md object-cover ${
													isMobile ? "size-10" : "size-12"
												}`}
											/>
											<div className="min-w-0">
												<div className="flex items-center gap-2">
													<p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
														{goal.name}
													</p>
													{linkedAccount && (
														<AccountLogo
															account={linkedAccount}
															size={isMobile ? 16 : 20}
														/>
													)}
												</div>
												<div className="mt-1 flex items-center gap-2 text-[11px] text-gray-500 dark:text-zinc-400">
													{goal.status && (
														<span className="rounded-full bg-amber-100 px-1.5 py-0.5 font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
															{goal.status}
														</span>
													)}
													{formatGoalDate(goal)}
												</div>
											</div>
										</div>
										<div className="shrink-0 text-right">
											<p className="text-sm font-medium text-gray-900 dark:text-white">
												{formatCurrency(goal.saved)}
											</p>
											<p className="text-[11px] text-gray-500 dark:text-zinc-400">
												{Math.round(progress)}% of{" "}
												{formatCurrency(goal.targetAmount)}
											</p>
										</div>
									</div>
									<ProgressBar value={progress} className="h-1.5" />
								</Link>
							);
						})}
					</div>
				) : (
					<div className="flex h-32 flex-col items-center justify-center text-center text-sm text-gray-500 dark:text-zinc-400">
						<p>All goals are hidden.</p>
						<p>
							Turn on at least one of your goals to see them in this widget.
						</p>
						<button
							onClick={handleOpenSettings}
							className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-5 font-semibold text-gray-950 shadow-sm transition hover:bg-gray-50 dark:border-white/15 dark:bg-[#232322] dark:text-white dark:hover:bg-white/10"
						>
							Open widget settings
						</button>
					</div>
				)}
			</WidgetShell>

			{/* Settings Modal */}
			<Dialog.Root open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
				<Dialog.Portal>
					<Dialog.Overlay className="fixed inset-0 z-[999] bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
					<Dialog.Content className="fixed left-1/2 top-1/2 z-[1000] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl outline-none dark:bg-[#1B1B1B]">
						<div className="flex items-center justify-between">
							<Dialog.Title className="text-lg font-bold text-gray-900 dark:text-white">
								Goal widget settings
							</Dialog.Title>
							<Dialog.Close asChild>
								<button className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-white/5">
									<X size={20} className="text-gray-500 dark:text-zinc-400" />
								</button>
							</Dialog.Close>
						</div>

						<p className="mt-4 text-sm text-gray-500 dark:text-zinc-400">
							Select up to 5 goals you&apos;d like to see on your dashboard.
						</p>

						<div className="mt-5 max-h-[400px] space-y-2 overflow-y-auto">
							{goals.length > 0 ? (
								goals.map((goal) => {
									const isSelected = tempSelectedIds.includes(goal.id);
									return (
										<div
											key={goal.id}
											className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50/50 p-4 dark:border-white/5 dark:bg-white/5"
										>
											<div className="flex items-center gap-3">
												<GoalImage
													src={goal.imageUrl}
													alt={goal.name}
													className="size-10 shrink-0 rounded-md object-cover"
												/>
												<span className="text-sm font-medium text-gray-900 dark:text-white">
													{goal.name}
												</span>
											</div>
											<button
												type="button"
												role="switch"
												aria-checked={isSelected}
												onClick={() => toggleGoalSelection(goal.id)}
												className={`relative h-6 w-11 rounded-full transition-colors ${
													isSelected
														? "bg-[#FF5A35]"
														: "bg-gray-300 dark:bg-gray-600"
												}`}
											>
												<span
													className={`absolute top-[3px] block size-[18px] rounded-full bg-white transition-all ${
														isSelected ? "right-[3px]" : "left-[3px]"
													}`}
												/>
											</button>
										</div>
									);
								})
							) : (
								<p className="py-6 text-center text-sm text-gray-500 dark:text-zinc-400">
									No savings goals found.
								</p>
							)}
						</div>

						<div className="mt-6 flex justify-end gap-3 border-t border-gray-200 pt-6 dark:border-white/10">
							<button
								onClick={() => setIsSettingsOpen(false)}
								className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium transition hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5"
							>
								Cancel
							</button>
							<button
								onClick={handleSaveSettings}
								className="rounded-lg bg-[#FF5A35] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#E04825]"
							>
								Save
							</button>
						</div>
					</Dialog.Content>
				</Dialog.Portal>
			</Dialog.Root>
		</>
	);
}
