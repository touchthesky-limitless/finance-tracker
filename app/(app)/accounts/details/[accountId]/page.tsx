"use client";

import { useEffect, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import {
	Check,
	ChevronDown,
	ChevronRight,
	Columns3,
	CreditCard,
} from "lucide-react";
import {
	CartesianGrid,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import type { SortingState, VisibilityState } from "@tanstack/react-table";

import { DataTable } from "@/components/Transactions/DataTable";
import {
	type Account,
	type Transaction,
	useBudgetStore,
} from "@/store/useBudgetStore";
import { formatCurrency } from "@/utils/formatters";
import { useCallback } from "react";
import { TRANSACTION_RETURN_URL_KEY } from "@/lib/transactions/navigation";

type AccountWithDetails = Account & {
	institution?: string | null;
	account_type?: string | null;
	credit_limit?: number | null;
	current_balance?: number | null;
};

type Timeframe = "30d" | "90d" | "1y" | "all";

type BalancePoint = {
	date: string;
	label: string;
	balance: number;
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const TIMEFRAME_OPTIONS: Array<{
	value: Timeframe;
	label: string;
}> = [
	{ value: "30d", label: "Last 30 days" },
	{ value: "90d", label: "Last 90 days" },
	{ value: "1y", label: "Last year" },
	{ value: "all", label: "All time" },
];

const chartDateFormatter = new Intl.DateTimeFormat("en-US", {
	month: "short",
	day: "numeric",
	timeZone: "UTC",
});

function getTimeframeStart(timeframe: Timeframe): number {
	const now = Date.now();

	switch (timeframe) {
		case "30d":
			return now - 30 * DAY_IN_MS;
		case "90d":
			return now - 90 * DAY_IN_MS;
		case "1y":
			return now - 365 * DAY_IN_MS;
		default:
			return Number.NEGATIVE_INFINITY;
	}
}

function buildBalanceData(
	transactions: Transaction[],
	timeframe: Timeframe,
): BalancePoint[] {
	const timeframeStart = getTimeframeStart(timeframe);
	const sortedTransactions = [...transactions].sort((first, second) => {
		return new Date(first.date).getTime() - new Date(second.date).getTime();
	});

	let runningBalance = 0;
	const balanceByDate = new Map<string, number>();

	for (const transaction of sortedTransactions) {
		const timestamp = new Date(transaction.date).getTime();

		if (Number.isNaN(timestamp)) {
			continue;
		}

		runningBalance += Number(transaction.amount) || 0;

		if (timestamp >= timeframeStart) {
			const date = new Date(timestamp).toISOString().slice(0, 10);
			balanceByDate.set(date, runningBalance);
		}
	}

	const points = Array.from(balanceByDate.entries()).map(([date, balance]) => {
		return {
			date,
			label: chartDateFormatter.format(new Date(`${date}T00:00:00.000Z`)),
			balance,
		};
	});

	if (points.length === 0) {
		const today = new Date().toISOString().slice(0, 10);

		return [
			{
				date: today,
				label: chartDateFormatter.format(new Date(`${today}T00:00:00.000Z`)),
				balance: 0,
			},
		];
	}

	return points;
}

function inferInstitution(accountName: string): string {
	const normalizedName = accountName.toLowerCase();

	if (normalizedName.includes("chase")) {
		return "Chase";
	}

	if (normalizedName.includes("amex")) {
		return "American Express";
	}

	if (normalizedName.includes("capital one")) {
		return "Capital One";
	}

	if (normalizedName.includes("citi")) {
		return "Citi";
	}

	return "Not set";
}

function inferAccountType(accountName: string): string {
	const normalizedName = accountName.toLowerCase();

	if (
		normalizedName.includes("card") ||
		normalizedName.includes("flex") ||
		normalizedName.includes("sapphire") ||
		normalizedName.includes("amex")
	) {
		return "Credit Card";
	}

	if (normalizedName.includes("checking")) {
		return "Checking";
	}

	if (normalizedName.includes("saving")) {
		return "Savings";
	}

	return "Account";
}

export default function AccountDetailsPage() {
	const params = useParams<{ accountId: string }>();
	const router = useRouter();

	const openTransaction = useCallback(
		(transaction: Transaction) => {
			if (typeof window !== "undefined") {
				const returnUrl = [
					window.location.pathname,
					window.location.search,
					window.location.hash,
				].join("");

				window.sessionStorage.setItem(TRANSACTION_RETURN_URL_KEY, returnUrl);
			}

			router.push(`/transactions/${encodeURIComponent(transaction.id)}`, {
				scroll: false,
			});
		},
		[router],
	);

	const accountId = params.accountId
		? decodeURIComponent(params.accountId)
		: "";

	const transactions = useBudgetStore((state) => {
		return state.transactions;
	});

	const accounts = useBudgetStore((state) => {
		return state.accounts;
	});

	const fetchTransactions = useBudgetStore((state) => {
		return state.fetchTransactions;
	});

	const fetchAccounts = useBudgetStore((state) => {
		return state.fetchAccounts;
	});

	const [timeframe, setTimeframe] = useState<Timeframe>("all");
	const [isEditMode, setIsEditMode] = useState(false);
	const [selectedIds, setSelectedIds] = useState<string[]>([]);

	const [sorting] = useState<SortingState>([{ id: "date", desc: true }]);

	useEffect(() => {
		void fetchTransactions();
		void fetchAccounts();
	}, [fetchAccounts, fetchTransactions]);

	const account = accounts.find((item) => {
		return item.id === accountId;
	}) as AccountWithDetails | undefined;

	const accountName =
		account?.name ||
		transactions.find((transaction) => {
			return transaction.account_id === accountId;
		})?.account ||
		"Account";

	const accountTransactions = transactions.filter((transaction) => {
		if (transaction.account_id) {
			return transaction.account_id === accountId;
		}

		return transaction.account === accountName;
	});

	const calculatedBalance = accountTransactions.reduce((total, transaction) => {
		return total + (Number(transaction.amount) || 0);
	}, 0);

	const currentBalance =
		account?.current_balance == null
			? calculatedBalance
			: Number(account.current_balance);

	const balanceData = buildBalanceData(accountTransactions, timeframe);
	const firstVisibleBalance = balanceData[0]?.balance ?? currentBalance;
	const balanceChange = currentBalance - firstVisibleBalance;

	const institution =
		account?.institution?.trim() || inferInstitution(accountName);
	const accountType =
		account?.account_type?.trim() || inferAccountType(accountName);
	const creditLimit = Math.max(Number(account?.credit_limit) || 0, 0);
	const creditUsed =
		accountType === "Credit Card" ? Math.max(Math.abs(currentBalance), 0) : 0;
	const creditRemaining = Math.max(creditLimit - creditUsed, 0);
	const utilization =
		creditLimit > 0 ? Math.min((creditUsed / creditLimit) * 100, 100) : 0;

	const columnVisibility: VisibilityState = {
		date: false,
		merchant: true,
		category: true,
		account: false,
		amount: true,
	};

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const handleSelectRow = (transactionId: string, _event: ReactMouseEvent) => {
		setSelectedIds((current) => {
			return current.includes(transactionId)
				? current.filter((id) => id !== transactionId)
				: [...current, transactionId];
		});
	};

	const selectedTimeframeLabel =
		TIMEFRAME_OPTIONS.find((option) => {
			return option.value === timeframe;
		})?.label || "All time";

	return (
		<div className="flex min-h-screen flex-col bg-[#171716] p-3 text-[#f4f4f2] md:p-5">
			<header className="mb-4 flex flex-wrap items-center justify-between gap-3 px-1">
				<div className="flex min-w-0 items-center gap-3">
					<button
						type="button"
						onClick={() => {
							router.push("/transactions");
						}}
						className="text-base font-semibold text-[#a8a7a2] transition hover:text-white"
					>
						Transactions
					</button>

					<ChevronRight size={18} className="text-[#777671]" />

					<div className="flex min-w-0 items-center gap-2">
						<div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1677b8] text-white ring-2 ring-[#4ab8ff]/40">
							<CreditCard size={16} />
						</div>
						<h1 className="truncate text-lg font-semibold text-[#f3f2ee]">
							{accountName}
						</h1>
					</div>
				</div>

				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => {
							setIsEditMode((current) => !current);
						}}
						className="flex h-10 items-center gap-3 rounded-xl border border-white/10 bg-[#222220] px-4 text-sm font-semibold text-white transition hover:bg-[#2a2a27]"
					>
						Edit
						<ChevronDown size={15} />
					</button>

					<button
						type="button"
						className="flex h-10 items-center gap-3 rounded-xl border border-white/10 bg-[#222220] px-4 text-sm font-semibold text-white transition hover:bg-[#2a2a27]"
					>
						Filters
						<ChevronDown size={15} />
					</button>
				</div>
			</header>

			<section className="mb-4 rounded-2xl border border-white/5 bg-[#222220] px-5 py-6 shadow-[0_8px_30px_rgba(0,0,0,0.18)]">
				<div className="mb-4 flex flex-wrap items-start justify-between gap-4">
					<div>
						<p className="mb-2 text-xs font-bold tracking-wide text-[#9c9b96]">
							CURRENT BALANCE
						</p>
						<div className="flex flex-wrap items-baseline gap-3">
							<strong className="text-3xl font-semibold tracking-tight text-[#f4f4f2]">
								{formatCurrency(currentBalance)}
							</strong>
							<span className="text-base font-semibold text-[#93928d]">
								{formatCurrency(balanceChange)}
							</span>
							<span className="text-base font-semibold text-[#93928d]">
								{selectedTimeframeLabel} change
							</span>
						</div>
					</div>

					<label className="relative">
						<select
							value={timeframe}
							onChange={(event) => {
								setTimeframe(event.target.value as Timeframe);
							}}
							className="h-10 min-w-44 appearance-none rounded-xl border border-white/10 bg-[#222220] px-4 pr-10 text-sm font-semibold text-[#ecebe8] outline-none transition hover:bg-[#292927] focus:border-[#05acd2]"
						>
							{TIMEFRAME_OPTIONS.map((option) => {
								return (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								);
							})}
						</select>
						<ChevronDown
							size={15}
							className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[#aaa9a4]"
						/>
					</label>
				</div>

				<div className="h-80 w-full">
					<ResponsiveContainer width="100%" height="100%">
						<LineChart
							data={balanceData}
							margin={{ top: 24, right: 18, bottom: 10, left: 4 }}
						>
							<CartesianGrid
								vertical={false}
								stroke="#3d3d39"
								strokeDasharray="0"
							/>
							<XAxis
								dataKey="label"
								axisLine={false}
								tickLine={false}
								tick={{ fill: "#8f8e89", fontSize: 12 }}
								minTickGap={48}
							/>
							<YAxis
								axisLine={false}
								tickLine={false}
								tick={{ fill: "#8f8e89", fontSize: 12 }}
								tickFormatter={(value: number) => {
									return formatCurrency(value);
								}}
								width={88}
							/>
							<Tooltip
								formatter={(value) => {
									return formatCurrency(Number(value) || 0);
								}}
								contentStyle={{
									background: "#181817",
									border: "1px solid rgba(255,255,255,0.1)",
									borderRadius: "12px",
								}}
								labelStyle={{ color: "#f4f4f2" }}
							/>
							<Line
								type="monotone"
								dataKey="balance"
								stroke="#05acd2"
								strokeWidth={4}
								dot={false}
								activeDot={{ r: 5 }}
							/>
						</LineChart>
					</ResponsiveContainer>
				</div>
			</section>

			<div className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2.2fr)_minmax(320px,0.95fr)]">
				<section className="flex min-h-140 min-w-0 flex-col overflow-hidden rounded-2xl border border-white/5 bg-[#222220] shadow-[0_8px_30px_rgba(0,0,0,0.18)]">
					<div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 px-5 py-3">
						<h2 className="text-lg font-semibold text-white">Transactions</h2>

						<div className="flex flex-wrap items-center gap-2">
							<button
								type="button"
								onClick={() => {
									setIsEditMode((current) => !current);
									setSelectedIds([]);
								}}
								className="flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-[#222220] px-4 text-sm font-semibold text-white transition hover:bg-[#2b2b28]"
							>
								<Check size={15} />
								{isEditMode ? "Done" : "Edit multiple"}
							</button>

							<div className="mx-1 h-6 w-px bg-white/10" />

							<button
								type="button"
								className="flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-[#222220] px-4 text-sm font-semibold text-white transition hover:bg-[#2b2b28]"
							>
								<Columns3 size={16} />
								Columns
							</button>
						</div>
					</div>

					<div className="min-h-0 flex-1">
						<DataTable
							transactions={accountTransactions}
							selectedIds={selectedIds}
							onSelectRow={handleSelectRow}
							onRowClick={openTransaction}
							columnVisibility={columnVisibility}
							isEditMode={isEditMode}
							currentView="all"
							sorting={sorting}
							isCategoryView={false}
							isMerchantNavigationEnabled
						/>
					</div>
				</section>

				<aside className="self-start overflow-hidden rounded-2xl border border-white/5 bg-[#222220] shadow-[0_8px_30px_rgba(0,0,0,0.18)]">
					<div className="border-b border-white/5 px-6 py-4">
						<h2 className="text-lg font-semibold text-white">Summary</h2>
					</div>

					<div className="space-y-6 px-6 py-6">
						<div>
							<div className="mb-3 flex items-center justify-between text-sm font-semibold">
								<span>Credit utilization</span>
								<span>{Math.round(utilization)}%</span>
							</div>
							<div className="h-2 overflow-hidden rounded-full bg-[#484743]">
								<div
									className="h-full rounded-full bg-[#05acd2] transition-[width]"
									style={{ width: `${utilization}%` }}
								/>
							</div>
							<div className="mt-3 flex items-center justify-between text-sm text-[#d3d2ce]">
								<span>{formatCurrency(creditUsed)}</span>
								<span>{formatCurrency(creditLimit)}</span>
							</div>
						</div>

						<div className="h-px bg-white/5" />

						<SummaryRow label="Institution" value={institution} accent />
						<SummaryRow label="Account type" value={accountType} />
						<SummaryRow
							label="Credit limit"
							value={creditLimit > 0 ? formatCurrency(creditLimit) : "Not set"}
						/>
						<SummaryRow
							label="Credit remaining"
							value={
								creditLimit > 0 ? formatCurrency(creditRemaining) : "Not set"
							}
						/>
						<SummaryRow
							label="Total transactions"
							value={String(accountTransactions.length)}
						/>
					</div>
				</aside>
			</div>
		</div>
	);
}

function SummaryRow({
	label,
	value,
	accent = false,
}: {
	label: string;
	value: string;
	accent?: boolean;
}) {
	return (
		<div className="flex items-center justify-between gap-5 text-sm">
			<span className="text-[#9b9a95]">{label}</span>
			<span
				className={
					accent
						? "text-right font-semibold text-[#05acd2]"
						: "text-right font-semibold text-[#f1f0ec]"
				}
			>
				{value}
			</span>
		</div>
	);
}
