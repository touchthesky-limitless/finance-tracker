"use client";

import {
	Area,
	AreaChart,
	CartesianGrid,
	Cell,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { Download, Ellipsis, Info, Minus, Plus, Settings } from "lucide-react";
import { useMemo, useState } from "react";

import {
	AccountLogo,
	GoalsTabs,
	PrimaryButton,
	SecondaryButton,
	inputClassName,
} from "@/components/Goals/GoalsUI";
import { useGoalsData } from "@/hooks/useGoalsData";
import { formatAccountName } from "@/lib/goals/accountAdapters";
import { formatCurrency } from "@/lib/goals/formatters";
import {
	saveDebtAccountSetting,
	saveDebtPaydownSetting,
} from "@/lib/goals/repository";
import type {
	DebtAccountSetting,
	DebtPaydownSetting,
	DebtStrategy,
} from "@/lib/goals/types";

function addMonths(date: Date, amount: number): Date {
	return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1));
}

function calculateDebtProjection({
	principal,
	weightedApr,
	minimumPayment,
	extraMonthly,
	extraOneTime,
}: {
	principal: number;
	weightedApr: number;
	minimumPayment: number;
	extraMonthly: number;
	extraOneTime: number;
}) {
	const points: Array<{ month: string; balance: number; principal: number; interest: number }> = [];
	let balance = Math.max(0, principal - extraOneTime);
	let totalInterest = 0;
	const monthlyRate = weightedApr / 100 / 12;
	const payment = Math.max(1, minimumPayment + extraMonthly);
	const start = new Date();

	for (let index = 0; index < 240 && balance > 0.01; index += 1) {
		const interest = balance * monthlyRate;
		const principalPayment = Math.min(balance, Math.max(0, payment - interest));
		totalInterest += interest;
		balance = Math.max(0, balance + interest - payment);
		const date = addMonths(start, index);
		points.push({
			month: new Intl.DateTimeFormat("en-US", {
				month: "short",
				year: "numeric",
				timeZone: "UTC",
			}).format(date),
			balance,
			principal: principalPayment,
			interest,
		});
	}

	return { points, totalInterest };
}

export default function DebtPaydownPageClient() {
	const {
		debtAccounts,
		debtAccountSettings,
		debtPaydownSetting,
		isLoading,
		error,
		reload,
	} = useGoalsData();
	const [view, setView] = useState<"timeline" | "principal-interest">("timeline");
	const [manageOpen, setManageOpen] = useState(false);
	const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
	const [draftOverride, setDraftOverride] = useState<DebtPaydownSetting | null>(null);
	const draftSettings = draftOverride ?? debtPaydownSetting;

	const settingsByAccountId = useMemo(() => {
		return new Map(debtAccountSettings.map((setting) => [setting.accountId, setting] as const));
	}, [debtAccountSettings]);

	const principal = debtAccounts.reduce((total, account) => total + account.balance, 0);
	const weightedAprNumerator = debtAccounts.reduce((total, account) => {
		return total + account.balance * (settingsByAccountId.get(account.id)?.apr ?? 0);
	}, 0);
	const weightedApr = principal > 0 ? weightedAprNumerator / principal : 0;
	const minimumPayment = debtAccounts.reduce((total, account) => {
		return total + (settingsByAccountId.get(account.id)?.minimumPayment ?? 0);
	}, 0);
	const projection = useMemo(() => {
		return calculateDebtProjection({
			principal,
			weightedApr,
			minimumPayment,
			extraMonthly: draftSettings.extraMonthlyPayment,
			extraOneTime: draftSettings.extraOneTimePayment,
		});
	}, [draftSettings.extraMonthlyPayment, draftSettings.extraOneTimePayment, minimumPayment, principal, weightedApr]);
	const totalPrincipalInterest = principal + projection.totalInterest;
	const debtFreeDate = projection.points.at(-1)?.month ?? "—";

	if (isLoading) {
		return <div className="min-h-screen animate-pulse bg-[#f7f6f4] p-6 dark:bg-[#171716]" />;
	}

	return (
		<main className="min-h-screen bg-[#f7f6f4] p-3 text-gray-950 sm:p-5 dark:bg-[#171716] dark:text-white">
			<header className="flex flex-wrap items-center gap-4">
				<GoalsTabs />
				<div className="ml-auto flex gap-3">
					<div className="relative">
						<SecondaryButton type="button" onClick={() => setManageOpen((current) => !current)} className={manageOpen ? "border-cyan-500" : ""}>
							<Settings size={17} /> Manage
						</SecondaryButton>
						{manageOpen && (
							<div className="absolute right-0 top-[calc(100%+8px)] z-50 min-w-64 rounded-xl border border-gray-200 bg-white p-2 shadow-xl dark:border-white/10 dark:bg-[#232322]">
								<button type="button" onClick={() => setManageOpen(false)} className="w-full rounded-lg px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-white/10">Debt account settings</button>
							</div>
						)}
					</div>
					<PrimaryButton type="button" onClick={() => void saveDebtPaydownSetting(draftSettings).then(reload)}>Save to budget</PrimaryButton>
				</div>
			</header>

			{error && <p className="mt-4 rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}

			<section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				<Metric value={formatCurrency(principal)} label="Current Debt Principal" />
				<Metric value={formatCurrency(projection.totalInterest)} label="Projected Interest" />
				<Metric value={formatCurrency(totalPrincipalInterest)} label="Total Principal & Interest" />
				<Metric value={debtFreeDate} label="Debt Free Date" />
			</section>

			<section className="mt-5 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/5 dark:bg-[#232322]">
				<header className="flex flex-wrap items-center border-b border-gray-200 px-6 py-4 dark:border-white/10">
					<h1 className="text-2xl font-bold">Overview</h1>
					<div className="ml-auto flex items-center gap-3">
						<button type="button" onClick={() => setView("timeline")} className={`rounded-full px-4 py-2 font-semibold ${view === "timeline" ? "bg-gray-100 dark:bg-white/10" : "text-gray-500"}`}>Timeline</button>
						<button type="button" onClick={() => setView("principal-interest")} className={`rounded-full px-4 py-2 font-semibold ${view === "principal-interest" ? "bg-gray-100 dark:bg-white/10" : "text-gray-500"}`}>Principal & Interest</button>
						<SecondaryButton type="button"><Download size={17} /> Export</SecondaryButton>
					</div>
				</header>
				<div className="h-[430px] p-6">
					{view === "timeline" ? (
						<ResponsiveContainer width="100%" height="100%">
							<AreaChart data={projection.points} margin={{ top: 20, right: 20, left: 0, bottom: 10 }}>
								<defs>
									<linearGradient id="debtFill" x1="0" y1="0" x2="0" y2="1">
										<stop offset="0%" stopColor="#ff6633" stopOpacity={0.35} />
										<stop offset="100%" stopColor="#ff6633" stopOpacity={0.04} />
									</linearGradient>
								</defs>
								<CartesianGrid vertical={false} stroke="#e7e5e4" />
								<XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#777" }} />
								<YAxis tickFormatter={(value) => formatCurrency(Number(value))} axisLine={false} tickLine={false} width={80} />
								<Tooltip formatter={(value) => formatCurrency(Number(value))} />
								<Area type="monotone" dataKey="balance" stroke="#ff6633" strokeWidth={4} fill="url(#debtFill)" />
							</AreaChart>
						</ResponsiveContainer>
					) : (
						<div className="grid h-full gap-8 md:grid-cols-2">
							<Donut title="Current Principal" value={principal} />
							<Donut title="Projected Interest" value={projection.totalInterest} />
						</div>
					)}
				</div>
			</section>

			<div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(340px,1fr)]">
				<section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/5 dark:bg-[#232322]">
					<header className="border-b border-gray-200 px-6 py-4 text-2xl font-bold dark:border-white/10">Debt accounts</header>
					{debtAccounts.map((account) => {
						const setting = settingsByAccountId.get(account.id);
						return (
							<div key={account.id} className="flex flex-wrap items-center gap-4 border-b border-gray-200 px-6 py-5 last:border-b-0 dark:border-white/10">
								<AccountLogo account={account} size={48} />
								<div className="min-w-0 flex-1">
									<p className="truncate text-lg font-medium">{formatAccountName(account)}</p>
									<button type="button" onClick={() => setEditingAccountId(account.id)} className="mt-1 font-semibold text-cyan-600">
										{setting ? `${setting.apr.toFixed(2)}% APR • ${formatCurrency(setting.minimumPayment)}/mo.` : "Set up APR & monthly payment"}
									</button>
								</div>
								<div className="text-right">
									<p className="text-xl">{formatCurrency(account.balance)}</p>
									<p className="text-sm text-gray-500">{account.updatedAt ? new Intl.RelativeTimeFormat("en-US").format(0, "day") : "Current"}</p>
								</div>
								<Ellipsis size={20} />
							</div>
						);
					})}
					{debtAccounts.length === 0 && <p className="p-10 text-center text-gray-500">No real liability accounts were found.</p>}
				</section>

				<SavingsCalculator
					value={draftSettings}
					onChange={setDraftOverride}
					onSave={async (setting) => {
						await saveDebtPaydownSetting(setting);
						reload();
					}}
				/>
			</div>

			{editingAccountId && (
				<DebtAccountSettingsDialog
					accountName={debtAccounts.find((account) => account.id === editingAccountId)?.name ?? "Debt account"}
					value={settingsByAccountId.get(editingAccountId) ?? { accountId: editingAccountId, apr: 0, minimumPayment: 0 }}
					onClose={() => setEditingAccountId(null)}
					onSave={async (setting) => {
						await saveDebtAccountSetting(setting);
						setEditingAccountId(null);
						reload();
					}}
				/>
			)}
		</main>
	);
}

function Metric({ value, label }: { value: string; label: string }) {
	return (
		<div className="rounded-2xl border border-gray-200 bg-white p-7 text-center shadow-sm dark:border-white/5 dark:bg-[#232322]">
			<p className="text-3xl font-bold">{value}</p>
			<p className="mt-4 font-semibold text-gray-500">{label} <Info size={15} className="inline" /></p>
		</div>
	);
}

function Donut({ title, value }: { title: string; value: number }) {
	const data = [{ name: title, value: Math.max(value, 0.01) }];
	return (
		<div className="grid grid-cols-[minmax(0,1fr)_180px] items-center gap-4">
			<ResponsiveContainer width="100%" height="100%">
				<PieChart>
					<Pie data={data} dataKey="value" innerRadius="62%" outerRadius="88%" startAngle={90} endAngle={-270}>
						<Cell fill="#ff6633" />
					</Pie>
					<Tooltip formatter={(item) => formatCurrency(Number(item))} />
				</PieChart>
			</ResponsiveContainer>
			<div>
				<p className="text-xl font-bold">{title}</p>
				<p className="mt-4 text-2xl">{formatCurrency(value)}</p>
			</div>
		</div>
	);
}

function SavingsCalculator({
	value,
	onChange,
	onSave,
}: {
	value: DebtPaydownSetting;
	onChange: (value: DebtPaydownSetting) => void;
	onSave: (value: DebtPaydownSetting) => Promise<void>;
}) {
	const strategies: Array<{ id: DebtStrategy; title: string; description: string }> = [
		{ id: "planned", title: "Planned payments", description: "Pay only scheduled minimum or planned amounts." },
		{ id: "avalanche", title: "Avalanche", description: "Target the highest-interest balance first to minimize interest." },
		{ id: "snowball", title: "Snowball", description: "Pay the smallest balances first to build momentum." },
	];

	return (
		<section className="self-start overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/5 dark:bg-[#232322]">
			<header className="border-b border-gray-200 px-6 py-4 text-2xl font-bold dark:border-white/10">Savings Calculator</header>
			{strategies.map((strategy) => {
				const selected = value.strategy === strategy.id;
				return (
					<div key={strategy.id} className="border-b border-gray-200 p-6 last:border-b-0 dark:border-white/10">
						<button type="button" onClick={() => onChange({ ...value, strategy: strategy.id })} className="flex w-full items-start gap-4 text-left">
							<span className={`mt-1 size-6 rounded-full border-[7px] ${selected ? "border-[#ff6633]" : "border-gray-300"}`} />
							<span>
								<span className="text-xl font-bold">{strategy.title}</span>
								<span className="mt-2 block leading-7 text-gray-600 dark:text-gray-300">{strategy.description}</span>
							</span>
						</button>
						{selected && strategy.id !== "planned" && (
							<div className="ml-10 mt-5 space-y-4">
								<Stepper label="Additional monthly payment" value={value.extraMonthlyPayment} onChange={(next) => onChange({ ...value, extraMonthlyPayment: next })} />
								<Stepper label="Additional one-time payment" value={value.extraOneTimePayment} onChange={(next) => onChange({ ...value, extraOneTimePayment: next })} />
							</div>
						)}
					</div>
				);
			})}
			<div className="p-5"><PrimaryButton type="button" className="w-full" onClick={() => void onSave(value)}>Apply strategy</PrimaryButton></div>
		</section>
	);
}

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
	return (
		<div>
			<label className="font-semibold">{label}</label>
			<div className="mt-2 flex items-center rounded-xl border border-gray-300 px-4 dark:border-white/15">
				<span className="text-gray-500">$</span>
				<input value={value || ""} onChange={(event) => onChange(Math.max(0, Number(event.target.value) || 0))} inputMode="decimal" className="h-14 min-w-0 flex-1 bg-transparent px-2 outline-none" />
				<button type="button" onClick={() => onChange(Math.max(0, value - 10))} className="grid size-9 place-items-center rounded-full bg-gray-100 dark:bg-white/10"><Minus size={17} /></button>
				<button type="button" onClick={() => onChange(value + 10)} className="ml-2 grid size-9 place-items-center rounded-full bg-gray-100 dark:bg-white/10"><Plus size={17} /></button>
			</div>
		</div>
	);
}

function DebtAccountSettingsDialog({
	accountName,
	value,
	onClose,
	onSave,
}: {
	accountName: string;
	value: DebtAccountSetting;
	onClose: () => void;
	onSave: (value: DebtAccountSetting) => Promise<void>;
}) {
	const [apr, setApr] = useState(String(value.apr || ""));
	const [minimumPayment, setMinimumPayment] = useState(String(value.minimumPayment || ""));
	return (
		<div className="fixed inset-0 z-[1500] grid place-items-center bg-black/45 p-4" onMouseDown={onClose}>
			<div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#232322]" onMouseDown={(event) => event.stopPropagation()}>
				<h2 className="text-2xl font-bold">Debt account settings</h2>
				<p className="mt-2 text-gray-500">{accountName}</p>
				<label className="mt-6 block font-semibold">APR</label>
				<input value={apr} onChange={(event) => setApr(event.target.value)} inputMode="decimal" className={`${inputClassName} mt-2`} />
				<label className="mt-5 block font-semibold">Minimum monthly payment</label>
				<input value={minimumPayment} onChange={(event) => setMinimumPayment(event.target.value)} inputMode="decimal" className={`${inputClassName} mt-2`} />
				<div className="mt-7 flex justify-end gap-3">
					<SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
					<PrimaryButton type="button" onClick={() => void onSave({ accountId: value.accountId, apr: Number(apr) || 0, minimumPayment: Number(minimumPayment) || 0 })}>Save</PrimaryButton>
				</div>
			</div>
		</div>
	);
}
