"use client";

import {
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
	Filter,
	Plus,
	RefreshCw,
} from "lucide-react";

import { AccountGroupCard } from "@/components/Accounts/AccountGroupCard";
import { AccountsPageSkeleton } from "@/components/Accounts/AccountsPageSkeleton";
import {
	DEFAULT_QUERY,
	GROUP_ORDER,
	LIABILITY_GROUPS,
} from "@/components/Accounts/constants";
import { NetWorthChart } from "@/components/Accounts/chart/NetWorthChart";
import { AccountFilterModal } from "@/components/Accounts/filters/AccountFilterPopover";
import { useIsClient } from "@/hooks/useIsClient";
import { AddAccountModal } from "@/components/Accounts/modals/AddAccountModal";
import { ManualAccountForm } from "@/components/Accounts/modals/ManualAccountForm";
import { ManualAccountPicker } from "@/components/Accounts/modals/ManualAccountPicker";
import { SummaryPanel } from "@/components/Accounts/SummaryPanel";
import type {
	AccountKind,
	AccountRecord,
	ChartPoint,
	FilterNode,
	ManualAccount,
	SummaryMode,
} from "@/components/Accounts/types";
import {
	classifyAccount,
	isLiabilityKind,
} from "@/components/Accounts/utils/account";
import {
	getDateCutoff,
	normalizeChartType,
	normalizeDateRange,
	normalizeTimeframe,
} from "@/components/Accounts/utils/date";
import {
	loadManualAccounts,
	saveManualAccounts,
} from "@/components/Accounts/utils/storage";
import { useBudgetStore } from "@/store/useBudgetStore";

export default function AccountsPageClient() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const isClient = useIsClient();

	const transactions = useBudgetStore((state) => state.transactions);
	const fetchAccounts = useBudgetStore((state) => state.fetchAccounts);

	const [isRefreshing, setIsRefreshing] = useState(false);
	const [isFilterOpen, setIsFilterOpen] = useState(false);
	const [filterAnchorElement, setFilterAnchorElement] =
		useState<HTMLButtonElement | null>(null);
	const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
	const [isManualPickerOpen, setIsManualPickerOpen] = useState(false);
	const [manualKind, setManualKind] = useState<AccountKind | null>(null);
	const [manualAccounts, setManualAccounts] =
		useState<ManualAccount[]>(loadManualAccounts);
	const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
	const [draftSelectedIds, setDraftSelectedIds] = useState<string[]>([]);
	const [filterQuery, setFilterQuery] = useState("");
	const [summaryMode, setSummaryMode] = useState<SummaryMode>("totals");
	const [collapsedGroups, setCollapsedGroups] = useState<string[]>([]);

	const chartType = normalizeChartType(searchParams.get("chartType"));
	const dateRange = normalizeDateRange(searchParams.get("dateRange"));
	const timeframe = normalizeTimeframe(searchParams.get("timeframe"));


	useEffect(() => {
		const hasRequiredQuery =
			searchParams.has("chartType") &&
			searchParams.has("dateRange") &&
			searchParams.has("timeframe");

		if (hasRequiredQuery) {
			return;
		}

		const params = new URLSearchParams(searchParams.toString());
		params.set("chartType", chartType);
		params.set("dateRange", dateRange);
		params.set("timeframe", timeframe);
		router.replace(`/accounts?${params.toString()}`, {
			scroll: false,
		});
	}, [chartType, dateRange, router, searchParams, timeframe]);

	const updateQuery = useCallback(
		(next: Partial<typeof DEFAULT_QUERY>) => {
			const params = new URLSearchParams(searchParams.toString());

			if (next.chartType) {
				params.set("chartType", next.chartType);
			}

			if (next.dateRange) {
				params.set("dateRange", next.dateRange);
			}

			if (next.timeframe) {
				params.set("timeframe", next.timeframe);
			}

			router.replace(`/accounts?${params.toString()}`, {
				scroll: false,
			});
		},
		[router, searchParams],
	);

	const transactionAccounts = useMemo<AccountRecord[]>(() => {
		const accountMap = new Map<string, AccountRecord>();

		for (const transaction of transactions) {
			const name = transaction.account?.trim();

			if (!name) {
				continue;
			}

			const id = transaction.account_id?.trim() || name;
			const amount = Number(transaction.amount);
			const safeAmount = Number.isFinite(amount) ? amount : 0;
			const existing = accountMap.get(id);

			if (existing) {
				existing.balance += safeAmount;

				if (
					new Date(transaction.date).getTime() >
					new Date(existing.lastUpdated).getTime()
				) {
					existing.lastUpdated = transaction.date;
				}

				continue;
			}

			const classification = classifyAccount(name, safeAmount);
			const maskedMatch = name.match(/(?:\.\.\.|•{2,})(\d{4})\)?$/);

			accountMap.set(id, {
				id,
				name,
				balance: safeAmount,
				lastUpdated: transaction.date,
				lastFour: maskedMatch?.[1],
				institution: name.split(" ")[0],
				...classification,
			});
		}

		return [...accountMap.values()];
	}, [transactions]);

	const accounts = useMemo<AccountRecord[]>(() => {
		const manualRecords = manualAccounts.map<AccountRecord>((account) => {
			const isLiability = isLiabilityKind(account.kind);

			return {
				id: account.id,
				name: account.name,
				kind: account.kind,
				type: account.type,
				balance: isLiability ? Math.abs(account.balance) : account.balance,
				lastUpdated: account.createdAt,
				isLiability,
				group:
					account.kind === "cash"
						? "Cash"
						: account.kind === "investment"
							? "Investments"
							: ["credit-card"].includes(account.kind)
								? "Credit Cards"
								: ["mortgage", "loan", "other-liability"].includes(account.kind)
									? "Loans"
									: "Other Assets",
			};
		});

		const byId = new Map<string, AccountRecord>();

		for (const account of [...transactionAccounts, ...manualRecords]) {
			byId.set(account.id, account);
		}

		return [...byId.values()];
	}, [manualAccounts, transactionAccounts]);

	const visibleAccounts = useMemo(() => {
		if (selectedAccountIds.length === 0) {
			return accounts;
		}

		const selected = new Set(selectedAccountIds);
		return accounts.filter((account) => selected.has(account.id));
	}, [accounts, selectedAccountIds]);

	const groupedAccounts = useMemo(() => {
		return GROUP_ORDER.map((group) => {
			const groupAccounts = visibleAccounts.filter(
				(account) => account.group === group,
			);
			const total = groupAccounts.reduce((sum, account) => {
				return sum + Math.abs(account.balance);
			}, 0);

			return {
				group,
				accounts: groupAccounts,
				total,
				isLiability: LIABILITY_GROUPS.has(group),
			};
		}).filter((group) => group.accounts.length > 0);
	}, [visibleAccounts]);

	const summary = useMemo(() => {
		let assets = 0;
		let liabilities = 0;

		for (const account of visibleAccounts) {
			if (account.isLiability) {
				liabilities += Math.abs(account.balance);
			} else {
				assets += account.balance;
			}
		}

		return {
			assets,
			liabilities,
			netWorth: assets - liabilities,
		};
	}, [visibleAccounts]);

	const chartPoints = useMemo<ChartPoint[]>(() => {
		const selectedSet =
			selectedAccountIds.length > 0 ? new Set(selectedAccountIds) : null;
		const cutoff = getDateCutoff(dateRange);
		const sorted = [...transactions]
			.filter((transaction) => {
				if (selectedSet) {
					const id = transaction.account_id?.trim() || transaction.account;
					if (!selectedSet.has(id)) {
						return false;
					}
				}

				const date = new Date(transaction.date);
				return !cutoff || date >= cutoff;
			})
			.sort((first, second) => {
				return (
					new Date(first.date).getTime() - new Date(second.date).getTime()
				);
			});

		const daily = new Map<string, number>();

		for (const transaction of sorted) {
			const date = new Date(transaction.date);

			if (!Number.isFinite(date.getTime())) {
				continue;
			}

			const key = date.toISOString().slice(0, 10);
			daily.set(key, (daily.get(key) ?? 0) + Number(transaction.amount || 0));
		}

		let running = 0;
		const points: ChartPoint[] = [];

		for (const [key, value] of daily) {
			running += value;
			const date = new Date(`${key}T12:00:00`);

			points.push({
				date,
				value: running,
				label:
					timeframe === "year"
						? String(date.getFullYear())
						: date.toLocaleDateString("en-US", {
								month: "short",
								day: "numeric",
							}),
			});
		}

		if (points.length === 0) {
			const now = new Date();
			points.push({
				date: now,
				value: summary.netWorth,
				label: now.toLocaleDateString("en-US", {
					month: "short",
					day: "numeric",
				}),
			});
		}

		return points;
	}, [
		dateRange,
		selectedAccountIds,
		summary,
		timeframe,
		transactions,
	]);

	const filterTree = useMemo<FilterNode[]>(() => {
		const allGroups = GROUP_ORDER.map((group) => {
			const groupAccounts = accounts.filter((account) => {
				return account.group === group;
			});

			return {
				group,
				accounts: groupAccounts,
				isLiability: LIABILITY_GROUPS.has(group),
			};
		}).filter((group) => {
			return group.accounts.length > 0;
		});

		const convertGroup = (
			group: (typeof allGroups)[number],
		): FilterNode => ({
			id: `group:${group.group}`,
			label: group.group,
			children: group.accounts.map((account) => ({
				id: account.id,
				label: account.name,
				account,
			})),
		});

		return [
			{
				id: "assets",
				label: "Assets",
				children: allGroups
					.filter((group) => {
						return !group.isLiability;
					})
					.map(convertGroup),
			},
			{
				id: "liabilities",
				label: "Liabilities",
				children: allGroups
					.filter((group) => {
						return group.isLiability;
					})
					.map(convertGroup),
			},
		].filter((node) => {
			return Boolean(node.children?.length);
		});
	}, [accounts]);

	const refreshAccounts = async () => {
		setIsRefreshing(true);

		try {
			await fetchAccounts();
		} catch (error) {
			console.error("Failed to refresh accounts:", error);
		} finally {
			setIsRefreshing(false);
		}
	};

	const saveManualAccount = (account: ManualAccount) => {
		setManualAccounts((current) => {
			const next = [...current, account];

			try {
				saveManualAccounts(next);
			} catch (error) {
				console.error("Failed to save manual account:", error);
			}

			return next;
		});

		setManualKind(null);
		setIsManualPickerOpen(false);
		setIsAddAccountOpen(false);
	};

	if (!isClient) {
		return <AccountsPageSkeleton />;
	}

	return (
		<div className="min-h-screen bg-gray-50 p-2 text-gray-900 sm:p-3 md:p-5 dark:bg-[#171717] dark:text-[#f5f5f5]">
			<header className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
				<h1 className="px-1 text-lg font-semibold">Accounts</h1>

				<div className="flex flex-wrap items-center gap-2">
					{selectedAccountIds.length > 0 && (
						<button
							type="button"
							onClick={() => {
								setSelectedAccountIds([]);
								setDraftSelectedIds([]);
							}}
							className="h-10 px-2 text-sm font-semibold text-cyan-400 transition hover:text-cyan-300"
						>
							Clear
						</button>
					)}

					<button
						ref={setFilterAnchorElement}
						type="button"
						onClick={() => {
							setDraftSelectedIds(selectedAccountIds);
							setFilterQuery("");
							setIsFilterOpen(true);
						}}
						className="relative inline-flex h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-900 transition hover:bg-gray-100 dark:border-white/10 dark:bg-[#222] dark:text-white dark:hover:bg-[#2b2b2b]"
					>
						<Filter size={15} />
						Filters

						{selectedAccountIds.length > 0 && (
							<span
								aria-label={`${selectedAccountIds.length} account filters active`}
								className="absolute -right-1 -top-1 size-3 rounded-full border-2 border-[#171717] bg-[#ff6b3d]"
							/>
						)}
					</button>

					<button
						type="button"
						disabled={isRefreshing}
						onClick={() => void refreshAccounts()}
						className="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-900 transition hover:bg-gray-100 disabled:opacity-60 dark:border-white/10 dark:bg-[#222] dark:text-white dark:hover:bg-[#2b2b2b]"
					>
						<RefreshCw
							size={15}
							className={isRefreshing ? "animate-spin" : ""}
						/>
						Refresh all
					</button>

					<button
						type="button"
						onClick={() => setIsAddAccountOpen(true)}
						className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#ff5a35] px-4 text-sm font-semibold text-white transition hover:bg-[#ff6d4b]"
					>
						<Plus size={16} />
						Add account
					</button>
				</div>
			</header>

			<NetWorthChart
				chartType={chartType}
				dateRange={dateRange}
				timeframe={timeframe}
				points={chartPoints}
				summary={summary}
				onChartTypeChange={(value) => {
					updateQuery({
						chartType: value,
						timeframe: value === "breakdown" ? "year" : timeframe,
					});
				}}
				onDateRangeChange={(value) => updateQuery({ dateRange: value })}
			/>

			<div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2.25fr)_minmax(300px,0.95fr)]">
				<div className="space-y-4">
					{groupedAccounts.length > 0 ? (
						groupedAccounts.map((group) => (
							<AccountGroupCard
								key={group.group}
								group={group.group}
								total={group.total}
								accounts={group.accounts}
								isLiability={group.isLiability}
								isCollapsed={collapsedGroups.includes(group.group)}
								onToggle={() => {
									setCollapsedGroups((current) =>
										current.includes(group.group)
											? current.filter((value) => value !== group.group)
											: [...current, group.group],
									);
								}}
								onOpenAccount={(account) => {
									router.push(
										`/accounts/details/${encodeURIComponent(account.id)}`,
									);
								}}
							/>
						))
					) : (
						<div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center text-sm text-gray-500 dark:border-white/10 dark:bg-[#222] dark:text-zinc-400">
							No accounts match the selected filters.
						</div>
					)}
				</div>

				<SummaryPanel
					accounts={visibleAccounts}
					summary={summary}
					mode={summaryMode}
					onModeChange={setSummaryMode}
				/>
			</div>

			{isFilterOpen && (
				<AccountFilterModal
					anchorElement={filterAnchorElement}
					tree={filterTree}
					selectedIds={draftSelectedIds}
					onSelectedIdsChange={setDraftSelectedIds}
					query={filterQuery}
					onQueryChange={setFilterQuery}
					onClear={() => setDraftSelectedIds([])}
					onCancel={() => {
						setDraftSelectedIds(selectedAccountIds);
						setIsFilterOpen(false);
					}}
					onApply={() => {
						setSelectedAccountIds(draftSelectedIds);
						setIsFilterOpen(false);
					}}
				/>
			)}

			{isAddAccountOpen && !isManualPickerOpen && !manualKind && (
				<AddAccountModal
					onClose={() => setIsAddAccountOpen(false)}
					onManual={() => setIsManualPickerOpen(true)}
				/>
			)}

			{isManualPickerOpen && !manualKind && (
				<ManualAccountPicker
					onBack={() => setIsManualPickerOpen(false)}
					onClose={() => {
						setIsManualPickerOpen(false);
						setIsAddAccountOpen(false);
					}}
					onSelect={setManualKind}
				/>
			)}

			{manualKind && (
				<ManualAccountForm
					kind={manualKind}
					onBack={() => setManualKind(null)}
					onClose={() => {
						setManualKind(null);
						setIsManualPickerOpen(false);
						setIsAddAccountOpen(false);
					}}
					onSave={saveManualAccount}
				/>
			)}
		</div>
	);
}
