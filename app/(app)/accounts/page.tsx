"use client";

import {
	useCallback,
	useEffect,
	useMemo,
	useState,
	useSyncExternalStore,
	type FormEvent,
	type ReactNode,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
	autoUpdate,
	FloatingFocusManager,
	FloatingPortal,
	offset,
	shift,
	useDismiss,
	useFloating,
	useInteractions,
	useRole,
} from "@floating-ui/react";
import {
	ArrowDown,
	ArrowLeft,
	ArrowRight,
	ArrowUp,
	Building2,
	Car,
	Check,
	ChevronDown,
	ChevronRight,
	CircleDollarSign,
	CircleX,
	CreditCard,
	Download,
	Filter,
	Home,
	Landmark,
	LineChart,
	LoaderCircle,
	Plus,
	RefreshCw,
	Search,
	Sparkles,
	Upload,
	WalletCards,
	X,
} from "lucide-react";

import { Shimmer } from "@/components/ui/Shimmer";
import { useBudgetStore } from "@/store/useBudgetStore";

type ChartType = "performance" | "breakdown";
type DateRange = "1M" | "3M" | "6M" | "YTD" | "1Y" | "ALL";
type Timeframe = "month" | "year";
type SummaryMode = "totals" | "percent";
type AccountKind =
	| "cash"
	| "investment"
	| "real-estate"
	| "vehicle"
	| "valuable"
	| "other-asset"
	| "credit-card"
	| "mortgage"
	| "loan"
	| "other-liability";

interface AccountRecord {
	id: string;
	name: string;
	type: string;
	kind: AccountKind;
	group: "Cash" | "Investments" | "Other Assets" | "Credit Cards" | "Loans";
	balance: number;
	lastUpdated: string;
	lastFour?: string;
	institution?: string;
	isLiability: boolean;
}

interface ManualAccount {
	id: string;
	name: string;
	kind: AccountKind;
	type: string;
	balance: number;
	createdAt: string;
}

interface ChartPoint {
	label: string;
	date: Date;
	value: number;
}

interface FilterNode {
	id: string;
	label: string;
	children?: FilterNode[];
	account?: AccountRecord;
}

const DEFAULT_QUERY = {
	chartType: "performance" as ChartType,
	dateRange: "1M" as DateRange,
	timeframe: "month" as Timeframe,
};

const DATE_RANGE_OPTIONS: ReadonlyArray<{
	value: DateRange;
	label: string;
}> = [
	{ value: "1M", label: "1 month" },
	{ value: "3M", label: "3 months" },
	{ value: "6M", label: "6 months" },
	{ value: "YTD", label: "Year to date" },
	{ value: "1Y", label: "1 year" },
	{ value: "ALL", label: "All time" },
];

const MANUAL_ACCOUNT_OPTIONS: ReadonlyArray<{
	kind: AccountKind;
	label: string;
	section: "Asset" | "Liability";
	icon: typeof CircleDollarSign;
}> = [
	{ kind: "cash", label: "Cash", section: "Asset", icon: CircleDollarSign },
	{ kind: "investment", label: "Investments", section: "Asset", icon: LineChart },
	{ kind: "real-estate", label: "Real Estate", section: "Asset", icon: Home },
	{ kind: "vehicle", label: "Vehicles", section: "Asset", icon: Car },
	{ kind: "valuable", label: "Valuables", section: "Asset", icon: Sparkles },
	{ kind: "other-asset", label: "Other Assets", section: "Asset", icon: ArrowUp },
	{ kind: "credit-card", label: "Credit Card", section: "Liability", icon: CreditCard },
	{ kind: "mortgage", label: "Mortgage", section: "Liability", icon: Home },
	{ kind: "loan", label: "Loans", section: "Liability", icon: Building2 },
	{
		kind: "other-liability",
		label: "Other Liabilities",
		section: "Liability",
		icon: ArrowDown,
	},
];

const ADD_ACCOUNT_CATEGORIES = [
	{
		title: "Banks & credit cards",
		subtitle: "10 added",
		icon: Landmark,
	},
	{
		title: "Investments & loans",
		subtitle: "0 added",
		icon: LineChart,
	},
	{
		title: "Real estate, crypto, and more",
		subtitle: "0 added",
		icon: Home,
	},
	{
		title: "Company equity",
		subtitle: "0 added",
		icon: CircleDollarSign,
		badge: "New",
	},
	{
		title: "Import transaction & balance history",
		subtitle: "Import from CSV",
		icon: Upload,
	},
] as const;

const GROUP_ORDER: AccountRecord["group"][] = [
	"Cash",
	"Investments",
	"Other Assets",
	"Credit Cards",
	"Loans",
];

const LIABILITY_GROUPS = new Set<AccountRecord["group"]>([
	"Credit Cards",
	"Loans",
]);

function subscribeToClient(): () => void {
	return () => {};
}

function getClientSnapshot(): boolean {
	return true;
}

function getServerSnapshot(): boolean {
	return false;
}

function formatCurrency(value: number): string {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(value);
}

function compactCurrency(value: number): string {
	const absolute = Math.abs(value);

	if (absolute >= 1_000_000) {
		return `${value < 0 ? "-" : ""}$${(absolute / 1_000_000).toFixed(1)}M`;
	}

	if (absolute >= 1_000) {
		return `${value < 0 ? "-" : ""}$${(absolute / 1_000).toFixed(1)}K`;
	}

	return `${value < 0 ? "-" : ""}$${Math.round(absolute)}`;
}

function relativeTime(dateValue: string): string {
	const timestamp = new Date(dateValue).getTime();

	if (!Number.isFinite(timestamp)) {
		return "Recently";
	}

	const elapsed = Math.max(0, Date.now() - timestamp);
	const hours = Math.floor(elapsed / 3_600_000);

	if (hours < 1) {
		return "Just now";
	}

	if (hours < 24) {
		return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
	}

	const days = Math.floor(hours / 24);
	return `${days} ${days === 1 ? "day" : "days"} ago`;
}

function isLiabilityKind(kind: AccountKind): boolean {
	return [
		"credit-card",
		"mortgage",
		"loan",
		"other-liability",
	].includes(kind);
}

function classifyAccount(name: string, balance: number): {
	kind: AccountKind;
	type: string;
	group: AccountRecord["group"];
	isLiability: boolean;
} {
	const normalized = name.toLowerCase();

	if (
		normalized.includes("credit") ||
		normalized.includes("card") ||
		normalized.includes("amex") ||
		normalized.includes("sapphire") ||
		normalized.includes("unlimited") ||
		normalized.includes("flex")
	) {
		return {
			kind: "credit-card",
			type: "Credit Card",
			group: "Credit Cards",
			isLiability: true,
		};
	}

	if (
		normalized.includes("401") ||
		normalized.includes("investment") ||
		normalized.includes("broker") ||
		normalized.includes("vanguard") ||
		normalized.includes("fidelity")
	) {
		return {
			kind: "investment",
			type: "Investment",
			group: "Investments",
			isLiability: false,
		};
	}

	if (normalized.includes("mortgage")) {
		return {
			kind: "mortgage",
			type: "Mortgage",
			group: "Loans",
			isLiability: true,
		};
	}

	if (normalized.includes("loan")) {
		return {
			kind: "loan",
			type: "Loan",
			group: "Loans",
			isLiability: true,
		};
	}

	if (
		normalized.includes("checking") ||
		normalized.includes("saving") ||
		normalized.includes("cash")
	) {
		return {
			kind: "cash",
			type: normalized.includes("saving") ? "Savings" : "Checking",
			group: "Cash",
			isLiability: false,
		};
	}

	return balance < 0
		? {
				kind: "credit-card",
				type: "Credit Card",
				group: "Credit Cards",
				isLiability: true,
			}
		: {
				kind: "cash",
				type: "Cash",
				group: "Cash",
				isLiability: false,
			};
}

function accountIcon(kind: AccountKind): typeof WalletCards {
	if (kind === "cash") return Landmark;
	if (kind === "investment") return LineChart;
	if (kind === "real-estate" || kind === "mortgage") return Home;
	if (kind === "vehicle") return Car;
	if (kind === "credit-card") return CreditCard;
	if (kind === "loan") return Building2;
	return WalletCards;
}

function accountAccent(account: AccountRecord): string {
	if (account.group === "Cash") {
		return "bg-sky-600";
	}

	if (account.group === "Investments") {
		return "bg-emerald-600";
	}

	if (account.isLiability) {
		return "bg-blue-600";
	}

	return "bg-zinc-600";
}

function getDateCutoff(range: DateRange): Date | null {
	const now = new Date();

	if (range === "ALL") {
		return null;
	}

	if (range === "YTD") {
		return new Date(now.getFullYear(), 0, 1);
	}

	const cutoff = new Date(now);

	if (range === "1M") cutoff.setMonth(cutoff.getMonth() - 1);
	if (range === "3M") cutoff.setMonth(cutoff.getMonth() - 3);
	if (range === "6M") cutoff.setMonth(cutoff.getMonth() - 6);
	if (range === "1Y") cutoff.setFullYear(cutoff.getFullYear() - 1);

	return cutoff;
}

function normalizeDateRange(value: string | null): DateRange {
	return DATE_RANGE_OPTIONS.some((option) => option.value === value)
		? (value as DateRange)
		: DEFAULT_QUERY.dateRange;
}

function normalizeChartType(value: string | null): ChartType {
	return value === "breakdown" ? "breakdown" : "performance";
}

function normalizeTimeframe(value: string | null): Timeframe {
	return value === "year" ? "year" : "month";
}

function loadManualAccounts(): ManualAccount[] {
	if (typeof window === "undefined") {
		return [];
	}

	try {
		const value = window.localStorage.getItem("manual_accounts");

		if (!value) {
			return [];
		}

		const parsed = JSON.parse(value) as ManualAccount[];
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

function getDescendantAccountIds(node: FilterNode): string[] {
	if (node.account) {
		return [node.account.id];
	}

	return (
		node.children?.flatMap((child) => {
			return getDescendantAccountIds(child);
		}) ?? []
	);
}

function getDescendantParentIds(node: FilterNode): string[] {
	if (node.account) {
		return [];
	}

	return [
		node.id,
		...(
			node.children?.flatMap((child) => {
				return getDescendantParentIds(child);
			}) ?? []
		),
	];
}

function findAccountAncestorIds(
	tree: FilterNode[],
	accountId: string,
): string[] {
	function visit(
		node: FilterNode,
		ancestorIds: string[],
	): string[] | null {
		if (node.account?.id === accountId) {
			return ancestorIds;
		}

		const nextAncestorIds = node.account
			? ancestorIds
			: [...ancestorIds, node.id];

		for (const child of node.children ?? []) {
			const result = visit(child, nextAncestorIds);

			if (result) {
				return result;
			}
		}

		return null;
	}

	for (const node of tree) {
		const result = visit(node, []);

		if (result) {
			return result;
		}
	}

	return [];
}

function AccountsPageSkeleton() {
	return (
		<div
			role="status"
			aria-label="Loading accounts"
			aria-live="polite"
			className="min-h-screen bg-gray-50 p-3 text-gray-900 md:p-5 dark:bg-[#171717] dark:text-white"
		>
			<span className="sr-only">Loading accounts…</span>

			<div aria-hidden="true" className="mb-5 flex items-center justify-between">
				<Shimmer className="h-7 w-28 rounded-md" />
				<div className="flex gap-2">
					<Shimmer className="h-10 w-24 rounded-lg" />
					<Shimmer className="h-10 w-28 rounded-lg" />
					<Shimmer className="h-10 w-32 rounded-lg" />
				</div>
			</div>

			<div
				aria-hidden="true"
				className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/5 dark:bg-[#222]"
			>
				<div className="flex items-start justify-between gap-5">
					<div className="space-y-3">
						<Shimmer className="h-3 w-24 rounded-md" />
						<Shimmer className="h-8 w-64 rounded-lg" />
					</div>
					<div className="flex gap-3">
						<Shimmer className="h-11 w-48 rounded-lg" />
						<Shimmer className="h-11 w-36 rounded-lg" />
					</div>
				</div>
				<Shimmer className="mt-8 h-60 w-full rounded-xl" />
			</div>

			<div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2.2fr)_minmax(300px,0.95fr)]">
				<div aria-hidden="true" className="space-y-4">
					{Array.from({ length: 2 }, (_, groupIndex) => (
						<div
							key={groupIndex}
							className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-white/5 dark:bg-[#222]"
						>
							<div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-white/5">
								<Shimmer className="h-5 w-48 rounded-md" />
								<Shimmer className="h-5 w-24 rounded-md" />
							</div>
							{Array.from({ length: groupIndex === 0 ? 2 : 5 }, (_, row) => (
								<div
									key={row}
									className="flex h-20 items-center gap-4 border-b border-gray-200 px-5 last:border-0 dark:border-white/5"
								>
									<Shimmer className="size-10 rounded-full" />
									<div className="flex-1 space-y-2">
										<Shimmer className="h-4 w-44 rounded-md" />
										<Shimmer className="h-3 w-24 rounded-md" />
									</div>
									<Shimmer className="h-5 w-24 rounded-md" />
								</div>
							))}
						</div>
					))}
				</div>

				<Shimmer className="h-96 rounded-2xl" />
			</div>
		</div>
	);
}

export default function AccountsPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const isClient = useSyncExternalStore(
		subscribeToClient,
		getClientSnapshot,
		getServerSnapshot,
	);

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
				window.localStorage.setItem("manual_accounts", JSON.stringify(next));
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
						<div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center text-sm text-gray-500 dark:border-white/10 dark:bg-[#222] dark:text-gray-500">
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

function NetWorthChart({
	chartType,
	dateRange,
	timeframe,
	points,
	summary,
	onChartTypeChange,
	onDateRangeChange,
}: {
	chartType: ChartType;
	dateRange: DateRange;
	timeframe: Timeframe;
	points: ChartPoint[];
	summary: { assets: number; liabilities: number; netWorth: number };
	onChartTypeChange: (value: ChartType) => void;
	onDateRangeChange: (value: DateRange) => void;
}) {
	const [hoverIndex, setHoverIndex] = useState<number | null>(null);
	const [chartMenuOpen, setChartMenuOpen] = useState(false);
	const [rangeMenuOpen, setRangeMenuOpen] = useState(false);

	const width = 1200;
	const height = 250;
	const padding = { top: 26, right: 18, bottom: 34, left: 70 };
	const values =
		chartType === "breakdown"
			? [summary.assets, -summary.liabilities, summary.netWorth]
			: points.map((point) => point.value);
	const minimum = Math.min(...values, 0);
	const maximum = Math.max(...values, 0);
	const span = Math.max(maximum - minimum, 1);
	const y = (value: number) =>
		padding.top +
		((maximum - value) / span) * (height - padding.top - padding.bottom);
	const x = (index: number, count: number) =>
		padding.left +
		(index / Math.max(count - 1, 1)) *
			(width - padding.left - padding.right);

	const linePath = points
		.map((point, index) => {
			return `${index === 0 ? "M" : "L"} ${x(index, points.length)} ${y(
				point.value,
			)}`;
		})
		.join(" ");

	const areaPath =
		points.length > 0
			? `${linePath} L ${x(points.length - 1, points.length)} ${y(
					minimum,
				)} L ${x(0, points.length)} ${y(minimum)} Z`
			: "";

	const activePoint =
		hoverIndex === null ? null : points[Math.min(hoverIndex, points.length - 1)];
	const tooltipStartPoint = points[0] ?? null;
	const tooltipChange =
		activePoint && tooltipStartPoint
			? activePoint.value - tooltipStartPoint.value
			: 0;
	const tooltipChangePercent =
		tooltipStartPoint && tooltipStartPoint.value !== 0
			? Math.abs((tooltipChange / tooltipStartPoint.value) * 100)
			: 0;
	const tooltipIsPositive = tooltipChange >= 0;
	const tooltipStartDate = tooltipStartPoint?.date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
	const tooltipEndDate = activePoint?.date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
	const tooltipDateLabel =
		tooltipStartDate && tooltipEndDate && tooltipStartDate !== tooltipEndDate
			? `${tooltipStartDate} - ${tooltipEndDate}`
			: tooltipEndDate ?? tooltipStartDate ?? "";

	const xAxisTickIndexes = (() => {
		if (chartType !== "performance") {
			return [0];
		}

		const maximumTickCount = 7;

		if (points.length <= maximumTickCount) {
			return points.map((_, index) => index);
		}

		const indexes = new Set<number>();

		for (let tickIndex = 0; tickIndex < maximumTickCount; tickIndex++) {
			indexes.add(
				Math.round(
					(tickIndex / (maximumTickCount - 1)) * (points.length - 1),
				),
			);
		}

		return [...indexes];
	})();

	const formatXAxisLabel = (point: ChartPoint): string => {
		if (
			timeframe === "year" ||
			dateRange === "1Y" ||
			dateRange === "ALL"
		) {
			return point.date.toLocaleDateString("en-US", {
				month: "short",
				year: "2-digit",
			});
		}

		if (dateRange === "YTD" || dateRange === "6M") {
			return point.date.toLocaleDateString("en-US", {
				month: "short",
			});
		}

		return point.date.toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
		});
	};

	const tooltipLeftPercent =
		activePoint && hoverIndex !== null
			? Math.min(
					80,
					Math.max(
						20,
						(x(hoverIndex, points.length) / width) * 100,
					),
				)
			: 50;

	const tooltipTopPercent = activePoint
		? (y(activePoint.value) / height) * 100
		: 0;

	return (
		<section className="relative rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5 dark:border-white/5 dark:bg-[#222]">
			<div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
				<div>
					<div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.17em] text-gray-500 dark:text-zinc-400">
						Net Worth
						<span className="flex size-3.5 items-center justify-center rounded-full border border-zinc-500 text-[8px]">
							i
						</span>
					</div>

					<div className="mt-2 flex flex-wrap items-baseline gap-3">
						<strong className="text-2xl font-semibold tracking-tight sm:text-3xl">
							{formatCurrency(summary.netWorth)}
						</strong>
						<span
							className={`text-sm font-semibold ${
								summary.netWorth >= 0 ? "text-emerald-400" : "text-red-400"
							}`}
						>
							{summary.netWorth >= 0 ? "↗" : "↘"}{" "}
							{formatCurrency(Math.abs(summary.netWorth))}
						</span>
						<span className="text-sm font-medium text-gray-500 dark:text-zinc-400">
							{chartType === "breakdown"
								? timeframe === "year"
									? "This year"
									: "This month"
								: `${
										DATE_RANGE_OPTIONS.find(
											(option) => option.value === dateRange,
										)?.label
									} change`}
						</span>
					</div>
				</div>

				<div className="flex flex-col gap-3 sm:flex-row">
					<Dropdown
						label={chartType === "performance" ? "Performance" : "Breakdown"}
						open={chartMenuOpen}
						onOpenChange={(open) => {
							setChartMenuOpen(open);
							if (open) setRangeMenuOpen(false);
						}}
						options={[
							{ value: "performance", label: "Performance" },
							{ value: "breakdown", label: "Breakdown" },
						]}
						value={chartType}
						onChange={(value) => {
							onChartTypeChange(value as ChartType);
							setChartMenuOpen(false);
						}}
						className="w-full sm:w-52"
					/>

					<Dropdown
						label={
							chartType === "breakdown"
								? timeframe === "year"
									? "Yearly"
									: "Monthly"
								: DATE_RANGE_OPTIONS.find(
										(option) => option.value === dateRange,
									)?.label ?? "1 month"
						}
						open={rangeMenuOpen}
						onOpenChange={(open) => {
							setRangeMenuOpen(open);
							if (open) setChartMenuOpen(false);
						}}
						options={
							chartType === "breakdown"
								? [
										{ value: "YTD", label: "Yearly" },
										{ value: "1M", label: "Monthly" },
									]
								: DATE_RANGE_OPTIONS
						}
						value={dateRange}
						onChange={(value) => {
							onDateRangeChange(value as DateRange);
							setRangeMenuOpen(false);
						}}
						className="w-full sm:w-40"
					/>
				</div>
			</div>

			<div className="relative mt-5 h-[250px] w-full">
				<svg
					viewBox={`0 0 ${width} ${height}`}
					preserveAspectRatio="none"
					className="h-full w-full overflow-visible"
					onMouseLeave={() => setHoverIndex(null)}
					onMouseMove={(event) => {
						if (chartType !== "performance" || points.length === 0) {
							return;
						}

						const bounds = event.currentTarget.getBoundingClientRect();
						const ratio = (event.clientX - bounds.left) / bounds.width;
						const index = Math.round(ratio * (points.length - 1));
						setHoverIndex(Math.max(0, Math.min(points.length - 1, index)));
					}}
				>
					{Array.from({ length: 5 }, (_, index) => {
						const lineY =
							padding.top +
							(index / 4) * (height - padding.top - padding.bottom);
						const value = maximum - (index / 4) * span;

						return (
							<g key={index}>
								<line
									x1={padding.left}
									x2={width - padding.right}
									y1={lineY}
									y2={lineY}
									className="stroke-gray-200 dark:stroke-white/10"
									strokeWidth="1"
								/>
								<text
									x={padding.left - 16}
									y={lineY + 4}
									textAnchor="end"
									fontSize="12"
									className="fill-gray-500 dark:fill-[#8a8a8a]"
								>
									{compactCurrency(value)}
								</text>
							</g>
						);
					})}

					{chartType === "performance" ? (
						<>
							<defs>
								<linearGradient id="accountArea" x1="0" y1="0" x2="0" y2="1">
									<stop offset="0%" stopColor="#08b7df" stopOpacity="0.27" />
									<stop offset="100%" stopColor="#08b7df" stopOpacity="0.05" />
								</linearGradient>
							</defs>
							<path d={areaPath} fill="url(#accountArea)" />
							<path
								d={linePath}
								fill="none"
								stroke="#08b7df"
								strokeWidth="3"
								vectorEffect="non-scaling-stroke"
							/>

							{activePoint && hoverIndex !== null && (
								<>
									<line
										x1={x(hoverIndex, points.length)}
										x2={x(hoverIndex, points.length)}
										y1={padding.top}
										y2={height - padding.bottom}
										stroke="#525252"
										strokeDasharray="6 5"
									/>
									<circle
										cx={x(hoverIndex, points.length)}
										cy={y(activePoint.value)}
										r="6"
										fill="#08b7df"
										stroke="white"
										strokeWidth="3"
										vectorEffect="non-scaling-stroke"
									/>
								</>
							)}
						</>
					) : (
						<>
							<rect
								x={width / 2 - 34}
								y={y(summary.assets)}
								width="34"
								height={Math.max(y(0) - y(summary.assets), 1)}
								fill="#35aa76"
							/>
							<rect
								x={width / 2}
								y={y(0)}
								width="34"
								height={Math.max(y(-summary.liabilities) - y(0), 1)}
								fill="#ed4650"
							/>
						</>
					)}

					{chartType === "performance" ? (
						xAxisTickIndexes.map((pointIndex) => {
							const point = points[pointIndex];

							if (!point) {
								return null;
							}

							return (
								<text
									key={`${point.date.toISOString()}-${pointIndex}`}
									x={x(pointIndex, points.length)}
									y={height - 8}
									textAnchor="middle"
									fontSize="11"
									className="fill-gray-500 dark:fill-[#878787]"
								>
									{formatXAxisLabel(point)}
								</text>
							);
						})
					) : (
						<text
							x={width / 2}
							y={height - 8}
							textAnchor="middle"
							fontSize="11"
							className="fill-gray-500 dark:fill-[#878787]"
						>
							{new Date().getFullYear()}
						</text>
					)}
				</svg>

				{activePoint && hoverIndex !== null && (
					<div
						className="pointer-events-none absolute z-40 w-[380px] max-w-[calc(100vw-32px)] overflow-hidden rounded-[20px] border border-white/[0.04] bg-[#111111] text-white shadow-[0_24px_70px_rgba(0,0,0,0.55)]"
						style={{
							left: `${tooltipLeftPercent}%`,
							top: `${tooltipTopPercent}%`,
							transform: "translate(-50%, calc(-100% - 14px))",
						}}
					>
						<div className="border-b border-white/10 px-5 py-4 text-[15px] font-bold leading-none">
							{tooltipDateLabel}
						</div>

						<div className="flex items-center justify-between gap-5 px-5 py-4">
							<span className="text-[17px] font-bold leading-none tracking-[-0.01em]">
								{formatCurrency(activePoint.value)}
							</span>

							<span
								className={`whitespace-nowrap text-[15px] font-bold leading-none ${
									tooltipIsPositive
										? "text-emerald-400"
										: "text-[#ff8589]"
								}`}
							>
								{tooltipIsPositive ? "+" : "-"}
								{formatCurrency(Math.abs(tooltipChange))}{" "}
								<span className="ml-1">
									({tooltipChangePercent.toFixed(2)}%)
								</span>
							</span>
						</div>

						<div className="mx-5 mb-5 flex h-12 items-center justify-between rounded-[16px] bg-[#4a2010] px-4 text-[15px] font-bold text-[#ff6b2c]">
							<span className="flex items-center gap-2">
								<Sparkles size={17} strokeWidth={2.2} />
								Explain this change
							</span>

							<ChevronRight size={18} strokeWidth={2.2} />
						</div>
					</div>
				)}
			</div>
		</section>
	);
}

function Dropdown({
	label,
	open,
	onOpenChange,
	options,
	value,
	onChange,
	className = "",
}: {
	label: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	options: ReadonlyArray<{ value: string; label: string }>;
	value: string;
	onChange: (value: string) => void;
	className?: string;
}) {
	return (
		<div className={`relative ${className}`}>
			<button
				type="button"
				onClick={() => onOpenChange(!open)}
				className="flex h-11 w-full items-center justify-between gap-4 rounded-lg border border-gray-200 bg-white px-3 text-left text-sm font-medium text-gray-900 dark:border-white/10 dark:bg-[#202020] dark:text-white"
			>
				{label}
				<ChevronDown size={15} />
			</button>

			{open && (
				<div className="absolute right-0 top-[calc(100%+8px)] z-50 w-full min-w-48 overflow-hidden rounded-xl border border-gray-200 bg-white p-2 text-gray-900 shadow-2xl dark:border-white/10 dark:bg-[#222] dark:text-white">
					{options.map((option) => (
						<button
							key={option.value}
							type="button"
							onClick={() => onChange(option.value)}
							className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition hover:bg-white/5 ${
								value === option.value ? "text-white" : "text-gray-700 dark:text-zinc-300"
							}`}
						>
							{option.label}
							{value === option.value && <Check size={15} />}
						</button>
					))}
				</div>
			)}
		</div>
	);
}

function AccountGroupCard({
	group,
	total,
	accounts,
	isLiability,
	isCollapsed,
	onToggle,
	onOpenAccount,
}: {
	group: string;
	total: number;
	accounts: AccountRecord[];
	isLiability: boolean;
	isCollapsed: boolean;
	onToggle: () => void;
	onOpenAccount: (account: AccountRecord) => void;
}) {
	const change = total * 0.137;

	return (
		<section className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-white/5 dark:bg-[#222]">
			<button
				type="button"
				onClick={onToggle}
				className="flex w-full items-center justify-between gap-4 border-b border-gray-200 px-5 py-4 text-left dark:border-white/5"
			>
				<div className="flex min-w-0 flex-wrap items-center gap-2">
					<ChevronDown
						size={16}
						className={`transition-transform ${
							isCollapsed ? "-rotate-90" : ""
						}`}
					/>
					<strong className="text-base">{group}</strong>
					<span
						className={`text-sm font-semibold ${
							isLiability ? "text-red-400" : "text-emerald-400"
						}`}
					>
						↗ {formatCurrency(change)}
						{isLiability ? " (30.6%)" : ""}
					</span>
					<span className="text-sm text-gray-500 dark:text-zinc-400">1 month change</span>
				</div>

				<strong className="shrink-0">{formatCurrency(total)}</strong>
			</button>

			{!isCollapsed && (
				<div>
					{accounts.map((account) => {
						const Icon = accountIcon(account.kind);

						return (
							<button
								key={account.id}
								type="button"
								onClick={() => onOpenAccount(account)}
								aria-label={`View ${account.name} account`}
								title={`View ${account.name} account`}
								className="group flex w-full items-center gap-4 border-b border-gray-200 px-5 py-4 text-left transition last:border-0 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-500 dark:border-white/5 dark:hover:bg-white/[0.035]"
							>
								<div
									className={`flex size-10 shrink-0 items-center justify-center rounded-full text-white ${accountAccent(
										account,
									)}`}
								>
									<Icon size={18} />
								</div>

								<div className="min-w-0 flex-1">
									<div className="truncate text-sm font-medium sm:text-base">
										{account.name}
									</div>
									<div className="mt-0.5 text-xs text-gray-500 dark:text-zinc-400">
										{account.type}
									</div>
								</div>

								<div className="hidden w-24 items-center gap-2 md:flex">
									<span className="h-1.5 w-16 rounded-full bg-zinc-700">
										<span className="block h-full w-1/6 rounded-full bg-cyan-400" />
									</span>
								</div>

								<div className="hidden h-8 w-20 items-end md:flex">
									<svg viewBox="0 0 80 32" className="h-full w-full">
										<path
											d={
												Math.abs(account.balance) % 3 === 0
													? "M2 27 L20 27 L34 8 L78 8"
													: Math.abs(account.balance) % 2 === 0
														? "M2 8 L24 8 L48 27 L78 27"
														: "M2 26 L26 26 L50 26 L78 26"
											}
											fill="none"
											stroke="#777"
											strokeWidth="1.7"
										/>
									</svg>
								</div>

								<div className="w-28 shrink-0 text-right">
									<div className="font-medium">
										{formatCurrency(Math.abs(account.balance))}
									</div>
									<div className="mt-1 text-xs text-gray-500 dark:text-zinc-400">
										{relativeTime(account.lastUpdated)}
									</div>
								</div>

								<ArrowRight
									size={16}
									className="hidden shrink-0 text-gray-500 dark:text-zinc-500 opacity-0 transition group-hover:opacity-100 sm:block"
								/>
							</button>
						);
					})}
				</div>
			)}
		</section>
	);
}

function SummaryPanel({
	accounts,
	summary,
	mode,
	onModeChange,
}: {
	accounts: AccountRecord[];
	summary: { assets: number; liabilities: number; netWorth: number };
	mode: SummaryMode;
	onModeChange: (mode: SummaryMode) => void;
}) {
	const assetAccounts = accounts.filter((account) => !account.isLiability);
	const liabilityAccounts = accounts.filter((account) => account.isLiability);
	const [showInsight, setShowInsight] = useState(false);

	const renderRows = (
		rows: AccountRecord[],
		total: number,
		color: string,
	) => {
		const groupTotals = new Map<string, number>();

		for (const account of rows) {
			groupTotals.set(
				account.group,
				(groupTotals.get(account.group) ?? 0) + Math.abs(account.balance),
			);
		}

		return [...groupTotals.entries()].map(([label, value]) => (
			<div key={label} className="flex items-center justify-between text-sm">
				<span className="flex items-center gap-2">
					<span className={`size-2 rounded-full ${color}`} />
					{label}
				</span>
				<strong>
					{mode === "totals"
						? formatCurrency(value)
						: `${total > 0 ? Math.round((value / total) * 100) : 0}%`}
				</strong>
			</div>
		));
	};

	const downloadCsv = () => {
		const lines = [
			["Name", "Type", "Group", "Balance"],
			...accounts.map((account) => [
				account.name,
				account.type,
				account.group,
				String(account.balance),
			]),
		];

		const csv = lines
			.map((line) =>
				line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","),
			)
			.join("\n");
		const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement("a");
		anchor.href = url;
		anchor.download = "accounts-summary.csv";
		anchor.click();
		URL.revokeObjectURL(url);
	};

	return (
		<aside className="relative self-start overflow-visible rounded-2xl border border-gray-200 bg-white xl:sticky xl:top-4 dark:border-white/5 dark:bg-[#222]">
			<div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-white/5">
				<div className="relative">
					<button
						type="button"
						onMouseEnter={() => setShowInsight(true)}
						onMouseLeave={() => setShowInsight(false)}
						onFocus={() => setShowInsight(true)}
						onBlur={() => setShowInsight(false)}
						className="flex items-center gap-2 text-base font-semibold"
					>
						Summary <Sparkles size={16} className="text-orange-500" />
					</button>

					{showInsight && (
						<div className="absolute -left-4 bottom-[calc(100%+16px)] z-50 w-80 rounded-2xl border border-white/5 bg-[#111] p-4 shadow-2xl">
							<div className="flex items-center gap-2 font-semibold text-orange-500">
								<Sparkles size={16} />
								AI Insights
							</div>
							<div className="mt-3 border-t border-white/10 pt-3 text-sm font-semibold">
								Understand insights about your assets & liabilities
							</div>
							<div className="absolute -bottom-2 left-40 size-4 rotate-45 bg-[#111]" />
						</div>
					)}
				</div>

				<div className="flex rounded-full bg-[#2b2b2b] p-1 text-xs">
					<button
						type="button"
						onClick={() => onModeChange("totals")}
						className={`rounded-full px-3 py-1.5 ${
							mode === "totals" ? "bg-[#353535] text-white" : "text-gray-500 dark:text-zinc-400"
						}`}
					>
						Totals
					</button>
					<button
						type="button"
						onClick={() => onModeChange("percent")}
						className={`rounded-full px-3 py-1.5 ${
							mode === "percent" ? "bg-[#353535] text-white" : "text-gray-500 dark:text-zinc-400"
						}`}
					>
						Percent
					</button>
				</div>
			</div>

			<div className="border-b border-gray-200 p-5 dark:border-white/5">
				<div className="flex items-center justify-between">
					<strong>Assets</strong>
					<strong className="text-gray-500 dark:text-zinc-400">
						{formatCurrency(summary.assets)}
					</strong>
				</div>
				<div className="my-4 h-3 overflow-hidden rounded-sm bg-zinc-800">
					<div className="h-full w-full rounded-sm bg-emerald-500/80" />
				</div>
				<div className="space-y-4">
					{renderRows(assetAccounts, summary.assets, "bg-emerald-500")}
				</div>
			</div>

			<div className="border-b border-gray-200 p-5 dark:border-white/5">
				<div className="flex items-center justify-between">
					<strong>Liabilities</strong>
					<strong className="text-gray-500 dark:text-zinc-400">
						{formatCurrency(summary.liabilities)}
					</strong>
				</div>
				<div className="my-4 h-3 overflow-hidden rounded-sm bg-zinc-800">
					<div className="h-full w-full rounded-sm bg-red-500" />
				</div>
				<div className="space-y-4">
					{renderRows(liabilityAccounts, summary.liabilities, "bg-red-500")}
				</div>
			</div>

			<button
				type="button"
				onClick={downloadCsv}
				className="flex w-full items-center justify-center gap-2 px-5 py-5 text-sm font-semibold text-cyan-400 transition hover:bg-white/[0.03]"
			>
				<Download size={15} />
				Download CSV
			</button>
		</aside>
	);
}

function AccountFilterModal({
	anchorElement,
	tree,
	selectedIds,
	onSelectedIdsChange,
	query,
	onQueryChange,
	onClear,
	onCancel,
	onApply,
}: {
	anchorElement: HTMLElement | null;
	tree: FilterNode[];
	selectedIds: string[];
	onSelectedIdsChange: (ids: string[]) => void;
	query: string;
	onQueryChange: (query: string) => void;
	onClear: () => void;
	onCancel: () => void;
	onApply: () => void;
}) {
	const [explicitParentIds, setExplicitParentIds] = useState<string[]>([]);
	const [selectAllExplicit, setSelectAllExplicit] = useState(false);

	const {
		refs: floatingRefs,
		context,
		floatingStyles,
	} = useFloating({
		open: true,
		placement: "bottom-end",
		strategy: "fixed",
		elements: {
			reference: anchorElement,
		},
		middleware: [
			offset(8),
			shift({
				padding: 12,
				crossAxis: true,
			}),
		],
		whileElementsMounted: autoUpdate,
		onOpenChange(open) {
			if (!open) {
				onCancel();
			}
		},
	});

	const dismiss = useDismiss(context, {
		escapeKey: true,
		outsidePress: true,
		outsidePressEvent: "mousedown",
	});

	const role = useRole(context, {
		role: "dialog",
	});

	const { getFloatingProps } = useInteractions([dismiss, role]);

	const setFloatingElement = useCallback(
		(node: HTMLElement | null): void => {
			floatingRefs.setFloating(node);
		},
		[floatingRefs],
	);

	const allAccounts = useMemo(() => {
		return tree.flatMap((section) => {
			return section.children?.flatMap((group) => {
				return group.children?.flatMap((node) => {
					return node.account ? [node.account] : [];
				}) ?? [];
			}) ?? [];
		});
	}, [tree]);

	const accountById = useMemo(() => {
		return new Map(
			allAccounts.map((account) => {
				return [account.id, account] as const;
			}),
		);
	}, [allAccounts]);

	const visibleTree = useMemo(() => {
		const normalized = query.trim().toLowerCase();

		if (!normalized) {
			return tree;
		}

		const filterNode = (node: FilterNode): FilterNode | null => {
			const ownMatch = node.label.toLowerCase().includes(normalized);

			if (node.account) {
				return ownMatch ? node : null;
			}

			const visibleChildren =
				node.children
					?.map(filterNode)
					.filter((child): child is FilterNode => {
						return child !== null;
					}) ?? [];

			if (ownMatch) {
				return node;
			}

			if (visibleChildren.length === 0) {
				return null;
			}

			return {
				...node,
				children: visibleChildren,
			};
		};

		return tree
			.map(filterNode)
			.filter((node): node is FilterNode => {
				return node !== null;
			});
	}, [query, tree]);

	const selectedAccounts = useMemo(() => {
		return selectedIds
			.map((id) => {
				return accountById.get(id);
			})
			.filter((account): account is AccountRecord => {
				return Boolean(account);
			});
	}, [accountById, selectedIds]);

	const toggleAccount = (
		accountId: string,
		ancestorIds: string[],
	): void => {
		const resolvedAncestorIds =
			ancestorIds.length > 0
				? ancestorIds
				: findAccountAncestorIds(tree, accountId);

		onSelectedIdsChange(
			selectedIds.includes(accountId)
				? selectedIds.filter((id) => {
						return id !== accountId;
					})
				: [...selectedIds, accountId],
		);

		setExplicitParentIds((current) => {
			return current.filter((id) => {
				return !resolvedAncestorIds.includes(id);
			});
		});

		setSelectAllExplicit(false);
	};

	const toggleParent = (node: FilterNode): void => {
		const accountIds = getDescendantAccountIds(node);
		const parentIds = getDescendantParentIds(node);
		const isExplicitlySelected = explicitParentIds.includes(node.id);
		const selected = new Set(selectedIds);

		if (isExplicitlySelected) {
			for (const id of accountIds) {
				selected.delete(id);
			}
		} else {
			for (const id of accountIds) {
				selected.add(id);
			}
		}

		onSelectedIdsChange([...selected]);

		setExplicitParentIds((current) => {
			const next = new Set(current);

			for (const id of parentIds) {
				if (isExplicitlySelected) {
					next.delete(id);
				} else {
					next.add(id);
				}
			}

			return [...next];
		});

		setSelectAllExplicit(false);
	};

	const renderNode = (
		node: FilterNode,
		depth: number,
		ancestorIds: string[],
	): ReactNode => {
		const isAccount = Boolean(node.account);
		const checked = node.account
			? selectedIds.includes(node.account.id)
			: explicitParentIds.includes(node.id);
		const Icon = node.account ? accountIcon(node.account.kind) : null;
		const nextAncestorIds = node.account
			? ancestorIds
			: [...ancestorIds, node.id];

		const paddingClass =
			depth === 0
				? "pl-7"
				: depth === 1
					? "pl-12"
					: depth === 2
						? "pl-16"
						: "pl-20";

		return (
			<div key={node.id}>
				<label
					className={`flex min-h-9 cursor-pointer items-center gap-2 rounded-md py-1.5 pr-2 transition-colors hover:bg-gray-50 dark:hover:bg-white/5 ${paddingClass}`}
				>
					<input
						type="checkbox"
						checked={checked}
						aria-label={
							isAccount
								? `${checked ? "Deselect" : "Select"} ${node.label}`
								: `${checked ? "Deselect" : "Select"} ${node.label} group`
						}
						onChange={() => {
							if (node.account) {
								toggleAccount(node.account.id, ancestorIds);
								return;
							}

							toggleParent(node);
						}}
						className="h-4 w-4 shrink-0 rounded border-gray-300 text-[#FF5A35] focus:ring-[#FF5A35]/30 dark:border-white/20 dark:bg-transparent"
					/>

					{Icon && (
						<span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
							<Icon size={11} />
						</span>
					)}

					<span
						title={node.label}
						className={`min-w-0 flex-1 truncate text-sm ${
							isAccount
								? "font-medium text-gray-900 dark:text-white"
								: "font-semibold text-gray-600 dark:text-gray-400"
						}`}
					>
						{node.label}
					</span>
				</label>

				{node.children?.map((child) => {
					return renderNode(child, depth + 1, nextAncestorIds);
				})}
			</div>
		);
	};

	const clearDraftFilters = (): void => {
		onClear();
		setExplicitParentIds([]);
		setSelectAllExplicit(false);
	};

	const toggleSelectAll = (): void => {
		if (selectAllExplicit) {
			onSelectedIdsChange([]);
			setSelectAllExplicit(false);
			setExplicitParentIds([]);
			return;
		}

		onSelectedIdsChange(
			allAccounts.map((account) => {
				return account.id;
			}),
		);
		setSelectAllExplicit(true);
		setExplicitParentIds(
			tree.flatMap((node) => {
				return getDescendantParentIds(node);
			}),
		);
	};

	const applyDisabled = false;
	const activeCount = selectedIds.length;

	return (
		<FloatingPortal>
			<FloatingFocusManager
				context={context}
				initialFocus={-1}
				modal={false}
			>
				<div
					ref={setFloatingElement}
					style={floatingStyles}
					{...getFloatingProps({
						"aria-label": "Account filters",
					})}
					className="z-[100] w-[min(900px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-gray-200 bg-white text-gray-900 shadow-2xl dark:border-white/10 dark:bg-[#1B1B1B] dark:text-white"
				>
						<div className="flex h-[min(610px,calc(100vh-96px))] min-h-[460px] flex-col">
							<div className="grid min-h-0 flex-1 grid-cols-[180px_350px_minmax(260px,1fr)]">
								<aside className="border-r border-gray-200 dark:border-white/10">
									<h2 className="flex h-14 items-center border-b border-gray-200 px-5 text-lg font-semibold text-gray-900 dark:border-white/10 dark:text-white">
										Filters
									</h2>

									<nav className="space-y-0.5 px-2 py-2">
										<button
											type="button"
											onClick={() => {
												onQueryChange("");
											}}
											className="w-full rounded-lg bg-cyan-100 px-3 py-2 text-left text-sm font-medium text-cyan-700 transition-colors dark:bg-cyan-500/15 dark:text-cyan-300"
										>
											Accounts
										</button>
									</nav>
								</aside>

								<section className="flex min-h-0 flex-col border-r border-gray-200 dark:border-white/10">
									<label className="flex h-14 items-center gap-2.5 border-b border-gray-200 px-4 dark:border-white/10">
										<Search
											size={19}
											className="text-gray-500"
											strokeWidth={2}
										/>

										<input
											value={query}
											onChange={(event) => {
												onQueryChange(event.target.value);
											}}
											placeholder="Search..."
											className="min-w-0 flex-1 bg-transparent text-base text-gray-900 outline-none placeholder:text-gray-400 dark:text-white"
										/>

										{query && (
											<button
												type="button"
												aria-label="Clear filter search"
												onClick={() => {
													onQueryChange("");
												}}
												className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/10 dark:hover:text-white"
											>
												<X size={17} />
											</button>
										)}
									</label>

									<div className="min-h-0 flex-1 overflow-y-auto">
										{visibleTree.length === 0 ? (
											<div className="flex h-full flex-col items-center justify-center px-8 text-center">
												<Search
													size={38}
													strokeWidth={1.6}
													className="text-gray-400"
												/>
												<h3 className="mt-5 text-lg font-semibold text-gray-900 dark:text-white">
													No results found
												</h3>
												<p className="mt-3 text-base font-medium text-gray-500 dark:text-gray-400">
													Try searching for something else.
												</p>
											</div>
										) : (
											<div className="px-3 py-2">
												<label className="flex min-h-9 cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 font-semibold transition-colors hover:bg-gray-50 dark:hover:bg-white/5">
													<input
														type="checkbox"
														checked={selectAllExplicit}
														onChange={toggleSelectAll}
														className="h-4 w-4 shrink-0 rounded border-gray-300 text-[#FF5A35] focus:ring-[#FF5A35]/30 dark:border-white/20 dark:bg-transparent"
													/>
													<span className="text-sm">Select all</span>
												</label>

												<div className="mt-1 space-y-0.5">
													{visibleTree.map((node) => {
														return renderNode(node, 0, []);
													})}
												</div>
											</div>
										)}
									</div>
								</section>

								<section className="flex min-h-0 flex-col">
									<div className="flex h-14 items-center border-b border-gray-200 px-4 dark:border-white/10">
										<h3 className="text-base font-semibold text-gray-500 dark:text-gray-400">
											{activeCount}{" "}
											{activeCount === 1 ? "filter" : "filters"} selected
										</h3>
									</div>

									<div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
										{selectedAccounts.length === 0 ? (
											<div className="flex h-full items-center justify-center text-center text-sm text-gray-400">
												Selected filters will appear here.
											</div>
										) : (
											<div className="space-y-4">
												<section>
													<div className="mb-1.5 flex items-center justify-between gap-3">
														<h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400">
															Accounts
														</h4>

														<button
															type="button"
															onClick={clearDraftFilters}
															className="text-xs font-semibold text-cyan-600 transition-colors hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300"
														>
															Clear
														</button>
													</div>

													<div className="space-y-1">
														{selectedAccounts.map((account) => {
															const Icon = accountIcon(account.kind);

															return (
																<button
																	key={account.id}
																	type="button"
																	aria-label={`Remove ${account.name} filter`}
																	onClick={() => {
																		toggleAccount(account.id, []);
																	}}
																	className="flex min-h-9 w-full cursor-pointer items-center justify-between gap-3 rounded-md px-1 text-left transition-colors hover:bg-gray-50 dark:hover:bg-white/5"
																>
																	<div className="flex min-w-0 items-center gap-2">
																		<span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
																			<Icon size={11} />
																		</span>

																		<p className="min-w-0 truncate text-sm font-medium text-gray-900 dark:text-white">
																			{account.name}
																		</p>
																	</div>

																	<CircleX
																		size={18}
																		strokeWidth={2.2}
																		className="shrink-0 text-gray-400 transition-colors group-hover:text-gray-700 dark:group-hover:text-gray-200"
																	/>
																</button>
															);
														})}
													</div>
												</section>
											</div>
										)}
									</div>
								</section>
							</div>

							<div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-[#1B1B1B]">
								<button
									type="button"
									onClick={clearDraftFilters}
									disabled={activeCount === 0}
									className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-45 dark:border-white/10 dark:bg-white/5 dark:text-gray-200 dark:hover:bg-white/10"
								>
									Clear
								</button>

								<div className="flex items-center gap-2">
									<button
										type="button"
										onClick={onCancel}
										className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm transition-colors hover:bg-gray-50 dark:border-white/10 dark:bg-[#222] dark:text-white dark:hover:bg-white/5"
									>
										Cancel
									</button>

									<button
										type="button"
										onClick={onApply}
										disabled={applyDisabled}
										className="rounded-lg bg-[#FF5A35] px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#E04825] disabled:cursor-not-allowed disabled:opacity-45"
									>
										Apply
									</button>
								</div>
							</div>
						</div>
				</div>
			</FloatingFocusManager>
		</FloatingPortal>
	);
}

function AddAccountModal({
	onClose,
	onManual,
}: {
	onClose: () => void;
	onManual: () => void;
}) {
	return (
		<ModalShell onClose={onClose} className="max-w-xl">
			<div className="flex items-center justify-between px-6 pt-6">
				<h2 className="text-2xl font-semibold">Add an account</h2>
				<button type="button" onClick={onClose}>
					<X size={25} />
				</button>
			</div>

			<div className="px-6 pb-6">
				<div className="mt-7 flex h-12 items-center gap-3 rounded-xl border border-gray-200 px-4 dark:border-white/10">
					<Search size={20} className="text-gray-500 dark:text-zinc-400" />
					<input
						placeholder="Search 13,000 institutions..."
						className="w-full bg-transparent outline-none placeholder:text-gray-500 dark:text-zinc-500"
					/>
				</div>

				<div className="mt-5 space-y-3">
					{ADD_ACCOUNT_CATEGORIES.map((category) => {
						const Icon = category.icon;

						return (
							<button
								key={category.title}
								type="button"
								className="flex w-full items-center justify-between rounded-2xl bg-gray-100 px-5 py-4 text-left transition hover:bg-gray-200 dark:bg-[#2a2a2a] dark:hover:bg-[#303030]"
							>
								<div>
									<div className="flex items-center gap-2 text-lg font-semibold">
										{category.title}
										{"badge" in category && category.badge && (
											<span className="rounded-lg bg-[#ff5a35] px-2 py-1 text-xs text-white">
												{category.badge}
											</span>
										)}
									</div>
									<div className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
										{category.subtitle}
									</div>
								</div>

								<div className="flex items-center gap-3">
									<span className="flex size-10 items-center justify-center rounded-full bg-white text-zinc-900">
										<Icon size={20} />
									</span>
									<ArrowRight size={20} />
								</div>
							</button>
						);
					})}
				</div>

				<button
					type="button"
					onClick={onManual}
					className="mx-auto mt-10 block w-full max-w-xs rounded-xl border border-white/15 py-3 font-semibold"
				>
					Add manual account
				</button>
			</div>
		</ModalShell>
	);
}

function ManualAccountPicker({
	onBack,
	onClose,
	onSelect,
}: {
	onBack: () => void;
	onClose: () => void;
	onSelect: (kind: AccountKind) => void;
}) {
	return (
		<ModalShell onClose={onClose} className="max-w-xl">
			<div className="flex items-center justify-between px-6 pt-5">
				<button
					type="button"
					onClick={onBack}
					className="flex size-11 items-center justify-center rounded-full border border-gray-200 dark:border-white/10"
				>
					<ArrowLeft size={22} />
				</button>
				<button type="button" onClick={onClose}>
					<X size={25} />
				</button>
			</div>

			<h2 className="px-6 pb-5 pt-4 text-2xl font-semibold">
				Add Manual Account
			</h2>

			{(["Asset", "Liability"] as const).map((section) => (
				<div key={section}>
					<div className="border-y border-gray-200 bg-gray-100 px-6 py-3 text-gray-500 dark:border-white/5 dark:bg-[#292929] dark:text-zinc-400">
						{section}
					</div>

					{MANUAL_ACCOUNT_OPTIONS.filter(
						(option) => option.section === section,
					).map((option) => {
						const Icon = option.icon;

						return (
							<button
								key={option.kind}
								type="button"
								onClick={() => onSelect(option.kind)}
								className="flex w-full items-center gap-5 border-b border-gray-200 px-6 py-5 text-left text-lg transition hover:bg-gray-50 dark:border-white/5 dark:hover:bg-white/[0.03]"
							>
								<Icon size={19} />
								{option.label}
							</button>
						);
					})}
				</div>
			))}
		</ModalShell>
	);
}

function ManualAccountForm({
	kind,
	onBack,
	onClose,
	onSave,
}: {
	kind: AccountKind;
	onBack: () => void;
	onClose: () => void;
	onSave: (account: ManualAccount) => void;
}) {
	const option =
		MANUAL_ACCOUNT_OPTIONS.find((item) => item.kind === kind) ??
		MANUAL_ACCOUNT_OPTIONS[0];
	const [name, setName] = useState("");
	const [balance, setBalance] = useState("");
	const [cashType, setCashType] = useState("Checking");
	const [isSaving, setIsSaving] = useState(false);

	const submit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		const parsedBalance = Number(balance.replaceAll(",", "") || 0);

		if (!name.trim() || !Number.isFinite(parsedBalance)) {
			return;
		}

		setIsSaving(true);

		onSave({
			id: crypto.randomUUID(),
			name: name.trim(),
			kind,
			type: kind === "cash" ? cashType : option.label.replace(/s$/, ""),
			balance: parsedBalance,
			createdAt: new Date().toISOString(),
		});
	};

	return (
		<ModalShell onClose={onClose} className="max-w-xl">
			<form onSubmit={submit}>
				<div className="flex items-center justify-between px-6 pt-5">
					<button type="button" onClick={onBack}>
						<ArrowLeft size={24} />
					</button>
					<button type="button" onClick={onClose}>
						<X size={25} />
					</button>
				</div>

				<div className="px-6 py-7">
					<h2 className="text-2xl font-semibold">
						Add {option.label.replace(/s$/, "")} Account
					</h2>

					<label className="mt-7 block">
						<span className="font-semibold">Name</span>
						<input
							value={name}
							onChange={(event) => setName(event.target.value)}
							placeholder={`My ${option.label} Account`}
							className="mt-3 h-13 w-full rounded-xl border border-gray-200 bg-transparent px-4 text-base outline-none focus:border-orange-500 dark:border-white/10"
						/>
					</label>

					{kind === "cash" && (
						<label className="mt-6 block">
							<span className="font-semibold">Type</span>
							<select
								value={cashType}
								onChange={(event) => setCashType(event.target.value)}
								className="mt-3 h-13 w-full rounded-xl border border-gray-200 bg-white px-4 text-base outline-none dark:border-white/10 dark:bg-[#222]"
							>
								<option>Checking</option>
								<option>Savings</option>
								<option>Cash</option>
							</select>
						</label>
					)}

					<label className="mt-6 block">
						<span className="font-semibold">Balance</span>
						<div className="relative mt-3">
							<span className="absolute inset-y-0 left-4 flex items-center text-gray-500 dark:text-zinc-400">
								$
							</span>
							<input
								value={balance}
								onChange={(event) => setBalance(event.target.value)}
								inputMode="decimal"
								placeholder="0.00"
								className="h-13 w-full rounded-xl border border-gray-200 bg-transparent pl-9 pr-4 text-base outline-none focus:border-orange-500 dark:border-white/10"
							/>
						</div>
					</label>
				</div>

				<div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-5 dark:border-white/5">
					<button
						type="button"
						onClick={onClose}
						className="rounded-xl border border-white/15 px-5 py-3 font-semibold"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={!name.trim() || isSaving}
						className="flex min-w-20 items-center justify-center rounded-xl bg-[#a94628] px-5 py-3 font-semibold text-white disabled:opacity-50"
					>
						{isSaving ? <LoaderCircle size={18} className="animate-spin" /> : "Save"}
					</button>
				</div>
			</form>
		</ModalShell>
	);
}

function ModalShell({
	children,
	onClose,
	className = "",
}: {
	children: ReactNode;
	onClose: () => void;
	className?: string;
}) {
	return (
		<div className="fixed inset-0 z-[110] flex items-start justify-center overflow-y-auto bg-black/70 p-3 py-8 backdrop-blur-sm sm:p-6">
			<button
				type="button"
				aria-label="Close modal"
				onClick={onClose}
				className="absolute inset-0"
			/>
			<div
				role="dialog"
				aria-modal="true"
				className={`relative z-10 w-full overflow-hidden rounded-2xl border border-gray-200 bg-white text-gray-900 shadow-2xl dark:border-white/5 dark:bg-[#222] dark:text-white ${className}`}
			>
				{children}
			</div>
		</div>
	);
}
