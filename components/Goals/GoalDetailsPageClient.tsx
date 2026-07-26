"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
	AllocationDetailsSheet,
	AllocateFundsModal,
	EditGoalAccountsModal,
	GoalSettingsModal,
} from "@/components/Goals/GoalDialogs";
import { GoalImage } from "@/components/Goals/GoalImage";
import {
	AccountLogo,
	AllocateButton,
	ManageButton,
	Menu,
	MenuItem,
	ProgressBar,
	SecondaryButton,
	Toggle,
} from "@/components/Goals/GoalsUI";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useGoalsData } from "@/hooks/useGoalsData";
import { formatAccountName } from "@/lib/goals/accountAdapters";
import {
	formatCurrency,
	formatGoalDate,
	getGoalProgress,
} from "@/lib/goals/formatters";
import {
	archiveSavingsGoal,
	createGoalAllocation,
	deleteSavingsGoal,
	fetchGoalAccountLinks,
	fetchGoalAllocations,
	saveGoalAccountSetting,
	setGoalAccountLinks,
	updateSavingsGoal,
	uploadGoalImage,
} from "@/lib/goals/repository";
import type {
	GoalAccountLink,
	GoalAllocation,
} from "@/lib/goals/types";

function monthKey(value: string): string {
	return value.slice(0, 7);
}

function monthLabel(key: string): string {
	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		year: "numeric",
		timeZone: "UTC",
	}).format(new Date(`${key}-01T00:00:00Z`));
}

function buildContributionData(allocations: GoalAllocation[]) {
	const values = new Map<string, number>();

	for (const allocation of allocations) {
		if (allocation.kind === "spending") {
			continue;
		}

		const key = monthKey(allocation.allocatedAt);
		values.set(key, (values.get(key) ?? 0) + allocation.amount);
	}

	return [...values.entries()]
		.sort(([first], [second]) => first.localeCompare(second))
		.map(([key, amount]) => ({
			key,
			month: monthLabel(key),
			amount,
		}));
}

function addMonths(date: Date, amount: number): Date {
	return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1));
}

export default function GoalDetailsPageClient() {
	const params = useParams<{ goalId: string }>();
	const router = useRouter();
	const goalId = decodeURIComponent(params.goalId);
	const {
		goals,
		savingsAccounts,
		goalAccountSettings,
		isLoading,
		error,
		reload,
	} = useGoalsData();
	const goal = goals.find((item) => item.id === goalId) ?? null;
	const [allocations, setAllocations] = useState<GoalAllocation[]>([]);
	const [accountLinks, setAccountLinks] = useState<GoalAccountLink[]>([]);
	const [manageOpen, setManageOpen] = useState(false);
	const [view, setView] = useState<"timeline" | "contributions">("contributions");
	const [allocateOpen, setAllocateOpen] = useState(false);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [accountsOpen, setAccountsOpen] = useState(false);
	const [selectedAllocation, setSelectedAllocation] = useState<GoalAllocation | null>(null);
	const [showAdjustments, setShowAdjustments] = useState(true);
	const [confirmAction, setConfirmAction] = useState<"archive" | "delete" | null>(null);
	const [isMutating, setIsMutating] = useState(false);

	useEffect(() => {
		let cancelled = false;

		const loadGoalDetails = async (): Promise<void> => {
			try {
				const [nextAllocations, nextLinks] = await Promise.all([
					fetchGoalAllocations(goalId),
					fetchGoalAccountLinks(goalId),
				]);

				if (!cancelled) {
					setAllocations(nextAllocations);
					setAccountLinks(nextLinks);
				}
			} catch (loadError) {
				console.error("Failed to load goal details:", loadError);
			}
		};

		void loadGoalDetails();

		return () => {
			cancelled = true;
		};
	}, [goalId]);

	const reloadDetails = async (): Promise<void> => {
		const [nextAllocations, nextLinks] = await Promise.all([
			fetchGoalAllocations(goalId),
			fetchGoalAccountLinks(goalId),
		]);
		setAllocations(nextAllocations);
		setAccountLinks(nextLinks);
		reload();
	};

	const contributionData = useMemo(() => {
		return buildContributionData(allocations);
	}, [allocations]);

	const timelineData = useMemo(() => {
		if (!goal) {
			return [];
		}

		const start = new Date();
		const plannedMonthly = Math.max(0, goal.monthlyContribution);
		const points: Array<{
			month: string;
			savings: number;
			target: number;
		}> = [];
		let savings = goal.saved;

		for (let index = 0; index < 18; index += 1) {
			const date = addMonths(start, index);
			points.push({
				month: new Intl.DateTimeFormat("en-US", {
					month: "short",
					year: "numeric",
					timeZone: "UTC",
				}).format(date),
				savings: Math.min(goal.targetAmount || Number.MAX_SAFE_INTEGER, savings),
				target: goal.targetAmount,
			});
			savings += plannedMonthly;
		}

		return points;
	}, [goal]);

	if (isLoading) {
		return <div className="min-h-screen animate-pulse bg-[#f7f6f4] p-6 dark:bg-[#171716]" />;
	}

	if (!goal) {
		return (
			<main className="min-h-screen bg-[#f7f6f4] p-6 dark:bg-[#171716] dark:text-white">
				<h1 className="text-2xl font-bold">Goal not found</h1>
				<p className="mt-3 text-gray-500">The Supabase goal ID in this URL does not exist or is not available to your account.</p>
				<Link href="/goals/savings" className="mt-6 inline-block font-semibold text-cyan-600">
					Back to goals
				</Link>
			</main>
		);
	}

	const progress = getGoalProgress(goal);
	const availableToSpend = Math.max(0, goal.saved - goal.spent);
	const leftToSave = Math.max(0, goal.targetAmount - goal.saved);
	const linkedAccounts = savingsAccounts.filter((account) =>
		goal.linkedAccountIds.includes(account.id),
	);
	const primaryAccount = linkedAccounts[0];

	return (
		<main className="min-h-screen bg-[#f7f6f4] p-3 text-gray-950 sm:p-5 dark:bg-[#171716] dark:text-white">
			<header className="flex flex-wrap items-center gap-3">
				<div className="flex items-center gap-3 text-lg">
					<Link href="/goals/savings" className="text-gray-500 hover:text-gray-950 dark:hover:text-white">
						Goals
					</Link>
					<ChevronRight size={18} className="text-gray-400" />
					<span className="font-bold">{goal.name}</span>
				</div>
				<div className="ml-auto flex gap-3">
					<div className="relative">
						<ManageButton open={manageOpen} onClick={() => setManageOpen((current) => !current)} />
						<Menu open={manageOpen}>
							<MenuItem onClick={() => { setManageOpen(false); setSettingsOpen(true); }}>
								Edit goal details
							</MenuItem>
							<MenuItem onClick={() => { setManageOpen(false); setAccountsOpen(true); }}>
								Edit goal accounts
							</MenuItem>
							<MenuItem onClick={() => { setManageOpen(false); setConfirmAction("archive"); }}>
								Archive goal
							</MenuItem>
							<MenuItem danger onClick={() => { setManageOpen(false); setConfirmAction("delete"); }}>
								Delete goal
							</MenuItem>
						</Menu>
					</div>
					<AllocateButton onClick={() => setAllocateOpen(true)} />
				</div>
			</header>

			{error && <p className="mt-4 rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}

			<section className="relative mt-4 overflow-hidden rounded-2xl bg-gray-200 shadow-sm">
				<GoalImage src={goal.imageUrl} alt={goal.name} className="h-[360px] w-full object-cover sm:h-[410px]" />
				<div className="absolute inset-x-5 bottom-5 rounded-2xl bg-white p-5 shadow-xl dark:bg-[#232322] sm:inset-x-8 sm:bottom-7">
					<div className="grid items-start gap-4 sm:grid-cols-[1fr_auto]">
						<div>
							<div className="flex items-center gap-3">
								<h1 className="text-2xl font-medium">{goal.name}</h1>
								<AccountLogo account={primaryAccount} size={28} />
							</div>
							<div className="mt-3 flex items-center gap-3 text-gray-500">
								<span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-700">{goal.status}</span>
								{formatGoalDate(goal)}
							</div>
						</div>
						<div className="text-left sm:text-right">
							<p className="text-2xl font-medium">{formatCurrency(goal.saved)}</p>
							<p className="mt-2 text-gray-500">{Math.round(progress)}% of {formatCurrency(goal.targetAmount)}</p>
						</div>
					</div>
					<ProgressBar value={progress} className="mt-4" />
				</div>
			</section>

			<section className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				<MetricCard value={`+${formatCurrency(goal.saved)}`} label="Total saved" positive />
				<MetricCard value={formatCurrency(goal.spent)} label="Total spent" />
				<MetricCard value={`+${formatCurrency(availableToSpend)}`} label="Available to spend" positive />
				<MetricCard value={formatCurrency(leftToSave)} label="Left to save" />
			</section>

			<section className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/5 dark:bg-[#232322]">
				<header className="flex flex-wrap items-center border-b border-gray-200 px-6 py-4 dark:border-white/10">
					<h2 className="text-xl font-bold">{view === "timeline" ? "Timeline" : "Contributions"}</h2>
					<div className="ml-auto flex rounded-full bg-gray-100 p-1 dark:bg-white/10">
						{(["timeline", "contributions"] as const).map((option) => (
							<button
								key={option}
								type="button"
								onClick={() => setView(option)}
								className={`rounded-full px-4 py-2 font-semibold capitalize ${view === option ? "bg-white shadow-sm dark:bg-white/15" : "text-gray-500"}`}
							>
								{option}
							</button>
						))}
					</div>
				</header>
				<div className="h-[390px] px-3 pb-4 pt-7 sm:px-6">
					{view === "contributions" ? (
						<ResponsiveContainer width="100%" height="100%">
							<BarChart data={contributionData} margin={{ top: 20, right: 10, left: 10, bottom: 10 }}>
								<CartesianGrid vertical={false} stroke="#eceae8" />
								<XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#777", fontSize: 12 }} />
								<YAxis tickFormatter={(value) => formatCurrency(Number(value))} axisLine={false} tickLine={false} width={80} />
								<Tooltip formatter={(value) => formatCurrency(Number(value))} />
								<Bar dataKey="amount" fill="#85817d" radius={[4, 4, 0, 0]} barSize={48} />
							</BarChart>
						</ResponsiveContainer>
					) : (
						<ResponsiveContainer width="100%" height="100%">
							<LineChart data={timelineData} margin={{ top: 20, right: 10, left: 10, bottom: 10 }}>
								<CartesianGrid vertical={false} stroke="#eceae8" />
								<XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#777", fontSize: 12 }} />
								<YAxis tickFormatter={(value) => `$${Math.round(Number(value) / 1000)}K`} axisLine={false} tickLine={false} width={60} />
								<Tooltip formatter={(value) => formatCurrency(Number(value))} />
								<Line type="monotone" dataKey="target" stroke="#9b51e0" dot={false} strokeWidth={2} />
								<Line type="monotone" dataKey="savings" stroke="#1c8d57" dot={false} strokeWidth={3} />
							</LineChart>
						</ResponsiveContainer>
					)}
				</div>
			</section>

			<div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
				<section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/5 dark:bg-[#232322]">
					<header className="flex items-center border-b border-gray-200 px-6 py-4 dark:border-white/10">
						<h2 className="text-xl font-bold">Activity</h2>
						<div className="ml-auto flex items-center gap-3 text-sm">
							Show adjustments
							<Toggle checked={showAdjustments} onChange={setShowAdjustments} label="Show adjustments" />
						</div>
					</header>
					{allocations
						.filter((allocation) => showAdjustments || allocation.kind !== "adjustment")
						.map((allocation) => {
							const account = savingsAccounts.find((item) => item.id === allocation.accountId);
							return (
								<button
									key={allocation.id}
									type="button"
									onClick={() => setSelectedAllocation(allocation)}
									className="flex w-full items-center border-b border-gray-200 px-6 py-4 text-left transition last:border-b-0 hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5"
								>
									<AccountLogo account={account} size={30} />
									<span className="ml-3 min-w-0 truncate">{account ? formatAccountName(account) : "No account"}</span>
									<span className="ml-3 rounded-lg bg-gray-100 px-2 py-1 text-xs capitalize text-gray-500">{allocation.kind}</span>
									<span className={`ml-auto font-semibold ${allocation.kind === "spending" ? "text-red-600" : "text-emerald-600"}`}>
										{allocation.kind === "spending" ? "−" : "+"}{formatCurrency(allocation.amount)}
									</span>
									<ChevronRight size={18} className="ml-3" />
								</button>
							);
						})}
					{allocations.length === 0 && <p className="p-8 text-center text-gray-500">No goal activity yet.</p>}
				</section>

				<div className="space-y-4">
					<section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/5 dark:bg-[#232322]">
						<header className="border-b border-gray-200 px-5 py-4 text-xl font-bold dark:border-white/10">Allocation</header>
						{linkedAccounts.map((account) => (
							<div key={account.id} className="flex items-center border-b border-gray-200 px-5 py-4 last:border-b-0 dark:border-white/10">
								<ChevronRight size={18} />
								<AccountLogo account={account} size={34} />
								<span className="ml-3 flex-1 truncate">{formatAccountName(account)}</span>
								<span className="font-semibold text-emerald-600">{formatCurrency(account.balance)}</span>
							</div>
						))}
						<div className="px-5 py-5">
							<SecondaryButton type="button" className="w-full" onClick={() => setAllocateOpen(true)}>↔ Allocate funds</SecondaryButton>
						</div>
					</section>

					<section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/5 dark:bg-[#232322]">
						<header className="flex items-center border-b border-gray-200 px-5 py-4 dark:border-white/10">
							<h2 className="text-xl font-bold">Details</h2>
							<button type="button" onClick={() => setSettingsOpen(true)} className="ml-auto font-semibold text-cyan-600">Edit</button>
						</header>
						<div className="space-y-5 p-5">
							<SummaryRow label="Status" value={goal.status} />
							<SummaryRow label="Target amount" value={formatCurrency(goal.targetAmount)} />
							<SummaryRow label="Target date" value={formatGoalDate(goal)} />
							<SummaryRow label="Budget contribution" value={`${formatCurrency(goal.monthlyContribution)}/mo.`} />
						</div>
					</section>
				</div>
			</div>

			<AllocateFundsModal
				open={allocateOpen}
				onClose={() => setAllocateOpen(false)}
				goal={goal}
				accounts={savingsAccounts}
				onAllocate={async (input) => {
					await createGoalAllocation({ goalId: goal.id, ...input });
					await reloadDetails();
				}}
			/>
			<GoalSettingsModal
				open={settingsOpen}
				onClose={() => setSettingsOpen(false)}
				goal={goal}
				accountLinks={accountLinks}
				accounts={savingsAccounts}
				onSave={async (input) => {
					await Promise.all([
						updateSavingsGoal(goal.id, {
							name: input.name,
							targetAmount: input.targetAmount,
							targetDate: input.targetDate,
							spendingReducesProgress: input.spendingReducesProgress,
						}),
						setGoalAccountLinks(goal.id, input.links),
					]);
					await reloadDetails();
				}}
				onImageUpload={async (file) => {
					await uploadGoalImage(goal.id, file, goal.imagePath);
					reload();
				}}
			/>
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
			<AllocationDetailsSheet
				open={Boolean(selectedAllocation)}
				onClose={() => setSelectedAllocation(null)}
				goal={goal}
				allocation={selectedAllocation}
				account={savingsAccounts.find((account) => account.id === selectedAllocation?.accountId) ?? null}
			/>
			{confirmAction && (
				<ConfirmDialog
					title={confirmAction === "delete" ? "Delete goal" : "Archive goal"}
					description={
						confirmAction === "delete"
							? "This permanently deletes the goal, its account links, activity, and uploaded image."
							: "This removes the goal from your active goals without deleting its history."
					}
					confirmLabel={confirmAction === "delete" ? "Delete" : "Archive"}
					confirmVariant={confirmAction === "delete" ? "danger" : "warning"}
					isLoading={isMutating}
					onCancel={() => setConfirmAction(null)}
					onConfirm={async () => {
						setIsMutating(true);
						try {
							if (confirmAction === "delete") {
								await deleteSavingsGoal(goal.id);
							} else {
								await archiveSavingsGoal(goal.id);
							}
							router.push("/goals/savings");
						} finally {
							setIsMutating(false);
						}
					}}
				/>
			)}
		</main>
	);
}

function MetricCard({ value, label, positive = false }: { value: string; label: string; positive?: boolean }) {
	return (
		<div className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm dark:border-white/5 dark:bg-[#232322]">
			<p className={`text-2xl font-bold ${positive ? "text-emerald-600" : ""}`}>{value}</p>
			<p className="mt-3 text-gray-500">{label}</p>
		</div>
	);
}

function SummaryRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex items-start gap-4">
			<span className="text-gray-500">{label}</span>
			<span className="ml-auto text-right font-semibold">{value}</span>
		</div>
	);
}
