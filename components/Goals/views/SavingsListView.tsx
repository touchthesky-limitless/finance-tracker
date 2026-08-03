"use client";

import Link from "next/link";
import { ChevronRight, Info, Plus } from "lucide-react";
import { useState } from "react";
import { GoalImage } from "@/components/Goals/GoalImage";
import {
	AllocateFundsModal,
	EditGoalAccountsModal,
} from "@/components/Goals/GoalDialogs";
import {
	AccountLogo,
	AllocateButton,
	GoalsTabs,
	ManageButton,
	Menu,
	MenuItem,
	ProgressBar,
	SecondaryButton,
} from "@/components/Goals/GoalsUI";
import { useGoalsData } from "@/hooks/useGoalsData";
import { formatAccountName } from "@/lib/goals/accountAdapters";
import {
	formatCurrency,
	formatGoalDate,
	getGoalProgress,
} from "@/lib/goals/formatters";
import {
	createGoalAllocation,
	saveGoalAccountSetting,
} from "@/lib/goals/repository";
import type { SavingsGoal } from "@/lib/goals/types";
import { Skeleton } from "@/components/ui/skeleton";

export function SavingsListView() {
	const {
		goals,
		savingsAccounts,
		enabledSavingsAccounts,
		goalAccountSettings,
		availableForGoals,
		isLoading,
		error,
		reload,
	} = useGoalsData();
	const [manageOpen, setManageOpen] = useState(false);
	const [allocateGoal, setAllocateGoal] = useState<SavingsGoal | null>(null);
	const [accountsOpen, setAccountsOpen] = useState(false);
	const totalSaved = goals.reduce((total, goal) => total + goal.saved, 0);
	const firstGoal = goals[0] ?? null;

	if (isLoading) {
		return <SavingsListSkeleton />;
	}

	return (
		<main className="min-h-screen bg-[#f7f6f4] p-4 text-gray-950 sm:p-6 dark:bg-[#171716] dark:text-white">
			<header className="flex flex-wrap items-center gap-4">
				<GoalsTabs />
				<div className="ml-auto flex flex-wrap justify-end gap-3">
					<div className="relative">
						<ManageButton
							open={manageOpen}
							onClick={() => setManageOpen((c) => !c)}
						/>
						<Menu open={manageOpen}>
							<MenuItem
								onClick={() => {
									setManageOpen(false);
									setAccountsOpen(true);
								}}
							>
								Edit goal accounts
							</MenuItem>
							<MenuItem onClick={() => setManageOpen(false)}>
								Reconciliation history
							</MenuItem>
						</Menu>
					</div>
					<SecondaryButton
						type="button"
						disabled={!firstGoal}
						onClick={() => setAllocateGoal(firstGoal)}
					>
						↔ Allocate funds
					</SecondaryButton>
					<Link
						href="/goals/savings/new"
						className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#ff6633] px-5 font-semibold text-white shadow-sm transition hover:bg-[#ed5528]"
					>
						<Plus size={18} /> Add goal
					</Link>
				</div>
			</header>

			{error && (
				<div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 font-semibold text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
					{error}
				</div>
			)}

			<div className="mt-5 grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
				<section>
					<div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/5 dark:bg-[#232322]">
						<div className="flex min-h-20 items-center border-b border-gray-200 px-7 dark:border-white/10">
							<h1 className="text-2xl font-bold">Save up</h1>
							<span className="ml-auto text-2xl font-semibold">
								{formatCurrency(totalSaved)}
							</span>
						</div>

						{goals.length > 0 ? (
							goals.map((goal) => {
								const progress = getGoalProgress(goal);
								const linkedAccount = savingsAccounts.find((account) =>
									goal.linkedAccountIds.includes(account.id),
								);
								return (
									<Link
										key={goal.id}
										href={`/goals/savings/${encodeURIComponent(goal.id)}`}
										className="grid gap-5 border-b border-gray-200 p-6 transition last:border-b-0 hover:bg-gray-50 sm:grid-cols-[120px_minmax(0,1fr)_220px] dark:border-white/10 dark:hover:bg-white/5"
									>
										<GoalImage
											src={goal.imageUrl}
											alt={goal.name}
											className="size-[120px] rounded-xl object-cover"
										/>
										<div className="min-w-0 self-center">
											<div className="flex items-center gap-3">
												<h2 className="truncate text-2xl font-medium">
													{goal.name}
												</h2>
												<AccountLogo account={linkedAccount} size={28} />
											</div>
											<div className="mt-3 flex flex-wrap items-center gap-3 text-lg text-gray-500">
												<span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-700">
													{goal.status}
												</span>
												{formatGoalDate(goal)}
											</div>
										</div>
										<div className="self-center text-left sm:text-right">
											<p className="text-2xl font-medium">
												{formatCurrency(goal.saved)}
											</p>
											<p className="mt-3 text-lg text-gray-500">
												{Math.round(progress)}% of{" "}
												{formatCurrency(goal.targetAmount)}
											</p>
										</div>
										<div className="sm:col-start-2 sm:col-end-4">
											<ProgressBar value={progress} />
										</div>
									</Link>
								);
							})
						) : (
							<div className="px-6 py-16 text-center">
								<h2 className="text-2xl font-bold">
									Create your first savings goal
								</h2>
								<p className="mx-auto mt-3 max-w-lg text-gray-500">
									Goals are stored in Supabase and can be linked to your
									existing accounts.
								</p>
								<Link
									href="/goals/savings/new"
									className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#ff6633] px-5 font-semibold text-white"
								>
									<Plus size={18} /> Add goal
								</Link>
							</div>
						)}
					</div>

					<p className="mt-8 max-w-5xl text-base leading-8 text-gray-500 sm:text-lg">
						Estimates only, not guarantees or personalized investment, tax or
						financial advice. Projected completion dates and recommended
						contributions depend on your assumptions and may differ materially.
					</p>
				</section>

				<aside className="self-start overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/5 dark:bg-[#232322]">
					<div className="p-6">
						<div className="rounded-2xl bg-[#f5f3f1] px-5 py-10 text-center dark:bg-white/5">
							<p className="text-5xl font-semibold text-gray-500">
								{formatCurrency(availableForGoals)}
							</p>
							<p className="mt-4 text-xl font-medium text-gray-500">
								Available for goals <Info size={20} className="inline" />
							</p>
						</div>
					</div>
					<div className="divide-y divide-gray-200 border-y border-gray-200 dark:divide-white/10 dark:border-white/10">
						{enabledSavingsAccounts.map((account) => (
							<div key={account.id} className="flex min-h-24 items-center px-6">
								<ChevronRight size={21} />
								<AccountLogo account={account} size={42} />
								<span className="ml-3 min-w-0 flex-1 truncate text-xl">
									{formatAccountName(account)}
								</span>
								<span className="text-xl text-gray-500">
									{formatCurrency(Math.max(0, account.balance))}
								</span>
							</div>
						))}
						{enabledSavingsAccounts.length === 0 && (
							<p className="px-6 py-7 text-center text-gray-500">
								Enable a real account to make funds available.
							</p>
						)}
					</div>
					<div className="space-y-3 p-6">
						<AllocateButton
							onClick={() => firstGoal && setAllocateGoal(firstGoal)}
							className="w-full"
						/>
						<SecondaryButton
							type="button"
							className="w-full"
							onClick={() => setAccountsOpen(true)}
						>
							Edit goal accounts
						</SecondaryButton>
					</div>
				</aside>
			</div>

			{allocateGoal && (
				<AllocateFundsModal
					open
					onClose={() => setAllocateGoal(null)}
					goal={allocateGoal}
					accounts={savingsAccounts}
					onAllocate={async (input) => {
						await createGoalAllocation({ goalId: allocateGoal.id, ...input });
						reload();
					}}
				/>
			)}
			<EditGoalAccountsModal
				open={accountsOpen}
				onClose={() => setAccountsOpen(false)}
				accounts={savingsAccounts}
				goals={goals}
				settings={goalAccountSettings}
				onSave={async (setting) => {
					await saveGoalAccountSetting(setting);
					reload();
				}}
			/>
		</main>
	);
}

function SavingsListSkeleton() {
	return (
		<div className="min-h-screen bg-[#f7f6f4] p-6 dark:bg-[#171716]">
			<Skeleton className="h-12 w-full rounded-xl" />
			<div className="mt-6 grid gap-6 xl:grid-cols-[1fr_390px]">
				<div className="space-y-4">
					<Skeleton className="h-72 w-full rounded-2xl" />
					<Skeleton className="h-20 w-full rounded-2xl" />
				</div>
				<Skeleton className="h-[520px] w-full rounded-2xl" />
			</div>
		</div>
	);
}
