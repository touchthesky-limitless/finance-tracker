"use client";

import {
	useCallback,
	useEffect,
	useMemo,
	useState,
	type MouseEvent as ReactMouseEvent,
	type SetStateAction,
} from "react";
import Link from "next/link";
import {
	useParams,
	usePathname,
	useRouter,
	useSearchParams,
} from "next/navigation";
import type { SortingState, VisibilityState } from "@tanstack/react-table";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	ReferenceLine,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
	type XAxisTickContentProps,
} from "recharts";
import { ChevronRight } from "lucide-react";

import { CashFlowFilterMenu } from "@/components/CashFlow/CashFlowFilterMenu";
import { TimeframeTabs } from "@/components/CashFlow/CashFlowControls";
import {
	endOfPeriod,
	formatPeriodTitle,
	getCategoryIdMap,
	parseUtcDate,
	shiftPeriod,
	startOfPeriod,
	toDateParam,
	transactionMatchesCashFlowFilters,
} from "@/components/CashFlow/cashFlowUtils";
import type {
	CashFlowFilters,
	CashFlowTimeframe,
} from "@/components/CashFlow/types";
import { DataTable } from "@/components/Transactions/DataTable";
import { TableToolbar } from "@/components/Transactions/TableToolbar";
import {
	MerchantEditorModal,
	MerchantMergeDialog,
	type MerchantEditorSaveValue,
	type MerchantEditorValue,
} from "@/components/Merchants/MerchantEditorModal";
import { getReportSummary } from "@/components/Reports/reportUtils";
import { useMerchantOptions } from "@/hooks/useMerchantOptions";
import { useUnifiedCategories } from "@/hooks/useUnifiedCategories";
import {
	getTransactionMerchantId,
	normalizeMerchantName,
	useUnifiedMerchants,
} from "@/hooks/useUnifiedMerchants";
import {
	deleteCustomMerchantRecord,
	updateCustomMerchantName,
} from "@/lib/merchants/merchantRepository";
import { type Transaction, useBudgetStore } from "@/store/useBudgetStore";
import { compactCurrency, formatMoney } from "@/utils/formatters";
import {
	getBreadcrumb,
	appendNavigationSource,
	getNavigationSource,
	type NavigationSource,
} from "@/lib/navigation/breadcrumb";

const DEFAULT_SORTING: SortingState = [{ id: "date", desc: true }];
const HIDDEN_MODES = ["visible", "hidden", "all"] as const;
const MERCHANT_TABLE_COLUMNS = [
	{ id: "merchant", label: "Merchant" },
	{ id: "category", label: "Category" },
	{ id: "account", label: "Account" },
	{ id: "amount", label: "Amount" },
] as const;

interface MerchantChartPeriod {
	key: string;
	label: string;
	shortLabel: string;
	start: Date;
	end: Date;
	amount: number;
	year: number;
	showYearMarker: boolean;
}

interface MerchantTrendTooltipProps {
	active?: boolean;
	payload?: ReadonlyArray<{
		payload?: MerchantChartPeriod;
	}>;
	merchantName: string;
}

function normalize(value: string | null | undefined): string {
	return value?.trim().toLowerCase() ?? "";
}

function setMerchantRecurringState(
	oldName: string,
	nextName: string,
	enabled: boolean,
): void {
	useBudgetStore.setState((state) => {
		const oldKey = normalizeMerchantName(oldName);
		const nextKey = normalizeMerchantName(nextName);
		const remaining = state.confirmedRecurringMerchants.filter((name) => {
			const key = normalizeMerchantName(name);
			return key !== oldKey && key !== nextKey;
		});

		return {
			confirmedRecurringMerchants: enabled
				? [...remaining, nextName]
				: remaining,
		};
	});
}

function parseEnum<T extends string>(
	value: string | null,
	allowed: readonly T[],
	fallback: T,
): T {
	return allowed.includes(value as T) ? (value as T) : fallback;
}

function readCsv(value: string | null): string[] {
	if (!value) {
		return [];
	}

	return value
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);
}

function getLatestTransactionDate(transactions: Transaction[]): Date | null {
	let latest: Date | null = null;

	for (const transaction of transactions) {
		const date = parseUtcDate(transaction.date);

		if (date && (!latest || date > latest)) {
			latest = date;
		}
	}

	return latest;
}

function getPeriodShortLabel(date: Date, timeframe: CashFlowTimeframe): string {
	if (timeframe === "year") {
		return String(date.getUTCFullYear());
	}

	if (timeframe === "quarter") {
		return `Q${Math.floor(date.getUTCMonth() / 3) + 1}`;
	}

	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		timeZone: "UTC",
	}).format(date);
}

function buildMerchantChartPeriods(
	transactions: Transaction[],
	selectedDate: Date,
	timeframe: CashFlowTimeframe,
): MerchantChartPeriod[] {
	const periodCount = timeframe === "year" ? 7 : 9;
	const latestTransactionDate = getLatestTransactionDate(transactions);
	const latestStart = startOfPeriod(
		latestTransactionDate ?? selectedDate,
		timeframe,
	);
	const selectedStart = startOfPeriod(selectedDate, timeframe);
	const earliestLatestWindow = shiftPeriod(
		latestStart,
		timeframe,
		-(periodCount - 1),
	);

	let chartEnd = latestStart;

	if (selectedStart < earliestLatestWindow) {
		chartEnd = shiftPeriod(selectedStart, timeframe, periodCount - 2);
	} else if (selectedStart > latestStart) {
		chartEnd = selectedStart;
	}

	const amountByKey = new Map<string, number>();

	for (const transaction of transactions) {
		const date = parseUtcDate(transaction.date);

		if (!date) {
			continue;
		}

		const key = toDateParam(startOfPeriod(date, timeframe));
		const amount = Math.abs(Number(transaction.amount) || 0);

		amountByKey.set(key, (amountByKey.get(key) ?? 0) + amount);
	}

	const periods: MerchantChartPeriod[] = [];

	for (let index = 0; index < periodCount; index += 1) {
		const start = shiftPeriod(chartEnd, timeframe, index - periodCount + 1);
		const key = toDateParam(start);
		const previous = periods[periods.length - 1];
		const year = start.getUTCFullYear();

		periods.push({
			key,
			label: formatPeriodTitle(start, timeframe),
			shortLabel: getPeriodShortLabel(start, timeframe),
			start,
			end: endOfPeriod(start, timeframe),
			amount: amountByKey.get(key) ?? 0,
			year,
			showYearMarker: !previous || previous.year !== year,
		});
	}

	return periods;
}

function transactionMatchesMerchant(
	transaction: Transaction,
	merchantId: string,
	merchantName: string,
): boolean {
	if (getTransactionMerchantId(transaction) === merchantId) {
		return true;
	}

	return (
		normalizeMerchantName(transaction.merchant) ===
		normalizeMerchantName(merchantName)
	);
}

export default function MerchantDetailsPageClient() {
	const params = useParams<{ merchantId: string }>();
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const searchParamsString = searchParams.toString();
	const merchantId = decodeURIComponent(params.merchantId ?? "");

	const transactions = useBudgetStore((state) => state.transactions);
	const accounts = useBudgetStore((state) => state.accounts);
	const customCategories = useBudgetStore((state) => state.customCategories);
	const customTags = useBudgetStore((state) => state.customTags);
	const merchants = useBudgetStore((state) => state.merchants);
	const recurringMerchants = useBudgetStore(
		(state) => state.confirmedRecurringMerchants,
	);
	const fetchTransactions = useBudgetStore((state) => state.fetchTransactions);
	const fetchAccounts = useBudgetStore((state) => state.fetchAccounts);
	const fetchCustomCategories = useBudgetStore(
		(state) => state.fetchCustomCategories,
	);
	const fetchMerchants = useBudgetStore((state) => state.fetchMerchants);
	const updateTransaction = useBudgetStore((state) => state.updateTransaction);
	const addCustomMerchant = useBudgetStore((state) => state.addCustomMerchant);

	const merchantItems = useMerchantOptions();
	const { allUnifiedCategories } = useUnifiedCategories("Expense", "All");
	const { allUnifiedMerchants, getMerchantById, getMerchantId } =
		useUnifiedMerchants();

	const [loading, setLoading] = useState(true);
	const [isEditOpen, setIsEditOpen] = useState(false);
	const [mergeSource, setMergeSource] = useState<MerchantEditorValue | null>(
		null,
	);
	const [logoOverrides, setLogoOverrides] = useState<
		Record<string, string | null>
	>({});
	const [sorting, setSorting] = useState<SortingState>(DEFAULT_SORTING);
	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
	const [selectionState, setSelectionState] = useState<{
		contextKey: string;
		ids: string[];
	}>({
		contextKey: "",
		ids: [],
	});
	const [isTableEditMode, setIsTableEditMode] = useState(false);

	useEffect(() => {
		let active = true;

		const load = async (): Promise<void> => {
			try {
				await Promise.all([
					fetchTransactions(),
					fetchAccounts(),
					fetchCustomCategories(),
					fetchMerchants(),
				]);
			} finally {
				if (active) {
					setLoading(false);
				}
			}
		};

		void load();

		return () => {
			active = false;
		};
	}, [fetchAccounts, fetchCustomCategories, fetchMerchants, fetchTransactions]);

	const timeframe = parseEnum<CashFlowTimeframe>(
		searchParams.get("timeframe"),
		["month", "quarter", "year"],
		"quarter",
	);
	const accountsParam = searchParams.get("accounts");
	const tagsParam = searchParams.get("tags");
	const dateParam = searchParams.get("date");
	const hidden = parseEnum(searchParams.get("hidden"), HIDDEN_MODES, "visible");

	const filters = useMemo<CashFlowFilters>(() => {
		return {
			accountIds: readCsv(accountsParam),
			tags: readCsv(tagsParam),
			hidden,
		};
	}, [accountsParam, hidden, tagsParam]);

	const fromParam = searchParams.get("from");
	const breadcrumb = getBreadcrumb(fromParam);
	const currentSource = getNavigationSource(fromParam);

	const openTransaction = useCallback(
		(transaction: Transaction): void => {
			const basePath = `/transactions/${encodeURIComponent(transaction.id)}`;

			// Pass the current context forward to the transaction detail page
			const pathWithContext = appendNavigationSource(basePath, currentSource);

			router.push(pathWithContext);
		},
		[router, currentSource],
	);

	// const cameFrom = searchParams.get("from");
	// const breadcrumbLabel =
	// 	cameFrom === "cash-flow"
	// 		? "Cash Flow"
	// 		: cameFrom === "transactions"
	// 			? "Transactions"
	// 			: "Accounts";

	// const breadcrumbHref =
	// 	cameFrom === "cash-flow"
	// 		? "/cash-flow"
	// 		: cameFrom === "transactions"
	// 			? "/transactions"
	// 			: "/accounts";

	const updateUrl = useCallback(
		(updates: Record<string, string | null>) => {
			const next = new URLSearchParams(searchParamsString);

			for (const [key, value] of Object.entries(updates)) {
				if (!value) {
					next.delete(key);
				} else {
					next.set(key, value);
				}
			}

			const query = next.toString();

			router.replace(query ? `${pathname}?${query}` : pathname, {
				scroll: false,
			});
		},
		[pathname, router, searchParamsString],
	);

	const merchant = useMemo(() => {
		const directMatch = getMerchantById(merchantId);

		if (directMatch) {
			return directMatch;
		}

		const normalizedRouteValue = normalizeMerchantName(merchantId);

		return allUnifiedMerchants.find((item) => {
			return normalizeMerchantName(item.name) === normalizedRouteValue;
		});
	}, [allUnifiedMerchants, getMerchantById, merchantId]);

	useEffect(() => {
		if (!merchant?.id || merchant.id === merchantId) {
			return;
		}

		const query = searchParamsString ? `?${searchParamsString}` : "";

		router.replace(`/merchants/${encodeURIComponent(merchant.id)}${query}`, {
			scroll: false,
		});
	}, [merchant, merchantId, router, searchParamsString]);

	const merchantName = merchant?.name ?? "Merchant";

	const merchantRecord = useMemo(() => {
		if (!merchant) {
			return null;
		}

		return merchants.find((item) => item.id === merchant.id) ?? null;
	}, [merchant, merchants]);

	const recurringNames = useMemo(() => {
		return new Set(
			recurringMerchants.map((name) => normalizeMerchantName(name)),
		);
	}, [recurringMerchants]);

	const merchantTransactions = useMemo(() => {
		if (!merchant) {
			return [];
		}

		return transactions.filter((transaction) => {
			return transactionMatchesMerchant(
				transaction,
				merchant.id,
				merchant.name,
			);
		});
	}, [merchant, transactions]);

	const merchantEditorValue = useMemo<MerchantEditorValue | null>(() => {
		if (!merchant) {
			return null;
		}

		const baseItem = merchantItems.find((item) => {
			return (
				item.id === merchant.id ||
				normalizeMerchantName(item.name) ===
					normalizeMerchantName(merchant.name)
			);
		});

		const overriddenLogo = logoOverrides[merchant.id];

		return {
			id: merchant.id,
			name: merchant.name,
			transactionCount: merchantTransactions.length,
			logoUrl:
				overriddenLogo === undefined ? baseItem?.logoUrl : overriddenLogo,
			isSystem: merchantRecord?.is_system ?? false,
		};
	}, [
		logoOverrides,
		merchant,
		merchantItems,
		merchantRecord?.is_system,
		merchantTransactions.length,
	]);

	const filteredMerchantTransactions = useMemo(() => {
		return merchantTransactions.filter((transaction) => {
			return transactionMatchesCashFlowFilters(transaction, filters);
		});
	}, [filters, merchantTransactions]);

	const latestMerchantDate = useMemo(() => {
		return (
			getLatestTransactionDate(filteredMerchantTransactions) ??
			getLatestTransactionDate(merchantTransactions) ??
			new Date()
		);
	}, [filteredMerchantTransactions, merchantTransactions]);

	const selectedDate =
		parseUtcDate(dateParam) ?? startOfPeriod(latestMerchantDate, timeframe);

	const chartPeriods = useMemo(() => {
		return buildMerchantChartPeriods(
			filteredMerchantTransactions,
			selectedDate,
			timeframe,
		);
	}, [filteredMerchantTransactions, selectedDate, timeframe]);

	const selectedPeriod =
		chartPeriods.find((period) => {
			return selectedDate >= period.start && selectedDate <= period.end;
		}) ??
		[...chartPeriods].reverse().find((period) => period.amount > 0) ??
		chartPeriods[chartPeriods.length - 1];

	const periodTransactions = useMemo(() => {
		if (!selectedPeriod) {
			return [];
		}

		return filteredMerchantTransactions.filter((transaction) => {
			const date = parseUtcDate(transaction.date);

			return Boolean(
				date && date >= selectedPeriod.start && date <= selectedPeriod.end,
			);
		});
	}, [filteredMerchantTransactions, selectedPeriod]);

	const selectionContextKey = useMemo(() => {
		const accountKey = [...filters.accountIds].sort().join(",");
		const tagKey = [...filters.tags].sort().join(",");

		return [
			merchant?.id ?? "none",
			selectedPeriod?.key ?? "none",
			filters.hidden,
			accountKey,
			tagKey,
		].join("|");
	}, [
		filters.accountIds,
		filters.hidden,
		filters.tags,
		merchant?.id,
		selectedPeriod?.key,
	]);

	const selectedIds =
		selectionState.contextKey === selectionContextKey ? selectionState.ids : [];

	const setSelectedIds = useCallback(
		(nextValue: SetStateAction<string[]>): void => {
			setSelectionState((current) => {
				const currentIds =
					current.contextKey === selectionContextKey ? current.ids : [];
				const nextIds =
					typeof nextValue === "function" ? nextValue(currentIds) : nextValue;

				return {
					contextKey: selectionContextKey,
					ids: nextIds,
				};
			});
		},
		[selectionContextKey],
	);

	const categoryIdByName = useMemo(() => {
		const customCategoryMap = getCategoryIdMap(customCategories);
		const result = new Map(customCategoryMap);

		for (const category of allUnifiedCategories) {
			if (category.id) {
				result.set(normalize(category.name), category.id);
			}
		}

		return result;
	}, [allUnifiedCategories, customCategories]);

	const getCategoryId = useCallback(
		(categoryName: string) => {
			return categoryIdByName.get(normalize(categoryName));
		},
		[categoryIdByName],
	);

	const handleSelectRow = (id: string, event: ReactMouseEvent): void => {
		event.stopPropagation();

		setSelectedIds((current) => {
			return current.includes(id)
				? current.filter((value) => value !== id)
				: [...current, id];
		});
	};

	const handleTimeframeChange = (nextTimeframe: CashFlowTimeframe): void => {
		const anchor = selectedPeriod?.start ?? selectedDate;

		updateUrl({
			timeframe: nextTimeframe,
			date: toDateParam(startOfPeriod(anchor, nextTimeframe)),
		});
	};

	const handleSaveMerchant = async (
		value: MerchantEditorSaveValue,
	): Promise<void> => {
		if (!merchant || !merchantEditorValue) {
			return;
		}

		const cleanName = value.name.trim();

		if (!cleanName) {
			throw new Error("Merchant name is required.");
		}

		const nameChanged =
			normalizeMerchantName(cleanName) !== normalizeMerchantName(merchant.name);

		if (nameChanged) {
			const duplicate = allUnifiedMerchants.find((item) => {
				return (
					item.id !== merchant.id &&
					normalizeMerchantName(item.name) === normalizeMerchantName(cleanName)
				);
			});

			if (duplicate) {
				throw new Error(
					"A merchant with this name already exists. Use Merge & delete instead.",
				);
			}
		}

		let targetMerchantId = merchant.id;

		if (nameChanged && merchantRecord?.is_system) {
			const createdMerchant = await addCustomMerchant(cleanName);
			targetMerchantId = createdMerchant.id;
		} else if (nameChanged && merchantRecord && !merchantRecord.is_system) {
			await updateCustomMerchantName(merchant.id, cleanName);
		}

		if (nameChanged) {
			await Promise.all(
				merchantTransactions.map((transaction) => {
					return updateTransaction(transaction.id, {
						merchant: cleanName,
						merchant_id: targetMerchantId,
					});
				}),
			);
		}

		setMerchantRecurringState(merchant.name, cleanName, value.isRecurring);

		setLogoOverrides((current) => {
			const next = { ...current };

			if (targetMerchantId !== merchant.id) {
				delete next[merchant.id];
			}

			next[targetMerchantId] = value.logoUrl;
			return next;
		});

		await Promise.all([fetchTransactions(true), fetchMerchants()]);
		setIsEditOpen(false);

		if (targetMerchantId !== merchant.id) {
			const query = searchParamsString ? `?${searchParamsString}` : "";

			router.replace(
				`/merchants/${encodeURIComponent(targetMerchantId)}${query}`,
				{ scroll: false },
			);
		}
	};

	const handleMergeMerchant = async (target: {
		id: string;
		name: string;
	}): Promise<void> => {
		if (!merchant || !merchantEditorValue) {
			return;
		}

		if (target.id === merchant.id) {
			throw new Error("Choose a different merchant.");
		}

		await Promise.all(
			merchantTransactions.map((transaction) => {
				return updateTransaction(transaction.id, {
					merchant: target.name,
					merchant_id: target.id,
				});
			}),
		);

		if (merchantRecord && !merchantRecord.is_system) {
			await deleteCustomMerchantRecord(merchant.id);
		}

		const sourceWasRecurring = recurringNames.has(
			normalizeMerchantName(merchant.name),
		);
		const targetWasRecurring = recurringNames.has(
			normalizeMerchantName(target.name),
		);

		setMerchantRecurringState(
			merchant.name,
			target.name,
			sourceWasRecurring || targetWasRecurring,
		);

		setLogoOverrides((current) => {
			const next = { ...current };
			delete next[merchant.id];
			return next;
		});

		await Promise.all([fetchTransactions(true), fetchMerchants()]);
		setMergeSource(null);
		setIsEditOpen(false);

		const query = searchParamsString ? `?${searchParamsString}` : "";
		router.replace(`/merchants/${encodeURIComponent(target.id)}${query}`, {
			scroll: false,
		});
	};

	if (loading) {
		return (
			<div className="min-h-screen space-y-5 bg-gray-50 p-5 dark:bg-[#171716]">
				<div className="h-12 animate-pulse rounded-xl bg-gray-200 dark:bg-white/10" />
				<div className="h-[410px] animate-pulse rounded-2xl bg-gray-200 dark:bg-white/10" />
				<div className="h-[560px] animate-pulse rounded-2xl bg-gray-200 dark:bg-white/10" />
			</div>
		);
	}

	if (!merchant || !selectedPeriod) {
		return (
			<div className="grid min-h-[70vh] place-items-center p-6 text-center">
				<div>
					<h1 className="text-2xl font-bold">Merchant not found</h1>
					<p className="mt-2 text-gray-500 dark:text-gray-400">
						No merchant exists with ID {merchantId}.
					</p>
					<Link
						href={breadcrumb.href}
						className="mt-5 inline-flex rounded-xl bg-[#FF6633] px-4 py-2.5 font-semibold text-white"
					>
						Back to {breadcrumb.label}
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen space-y-5 bg-gray-50 p-4 text-gray-900 dark:bg-[#171716] dark:text-white sm:p-5">
			<header className="flex flex-wrap items-center gap-4">
				<nav className="flex min-w-0 items-center gap-2 text-lg font-semibold">
					<Link
						href={breadcrumb.href}
						className="text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
					>
						{breadcrumb.label}
					</Link>
					<ChevronRight size={18} className="shrink-0 text-gray-400" />
					<span className="flex min-w-0 items-center gap-2">
						<MerchantBreadcrumbIcon
							name={merchantName}
							logoUrl={merchantEditorValue?.logoUrl}
						/>
						<span className="truncate">{merchantName}</span>
					</span>
				</nav>

				<div className="ml-auto flex flex-wrap items-center justify-end gap-3">
					<TimeframeTabs value={timeframe} onChange={handleTimeframeChange} />
					<button
						type="button"
						onClick={() => setIsEditOpen(true)}
						disabled={!merchantEditorValue}
						className="flex h-11 items-center rounded-xl border border-gray-300 bg-white px-4 font-semibold transition-colors hover:bg-gray-50 dark:border-white/15 dark:bg-[#232322] dark:hover:bg-white/7"
					>
						Edit merchant
					</button>
					<CashFlowFilterMenu
						filters={filters}
						accounts={accounts}
						tags={customTags}
						onApply={(nextFilters) => {
							updateUrl({
								accounts:
									nextFilters.accountIds.length > 0
										? nextFilters.accountIds.join(",")
										: null,
								tags:
									nextFilters.tags.length > 0
										? nextFilters.tags.join(",")
										: null,
								hidden:
									nextFilters.hidden === "visible" ? null : nextFilters.hidden,
							});
						}}
					/>
				</div>
			</header>

			<MerchantTrendChart
				periods={chartPeriods}
				selectedKey={selectedPeriod.key}
				merchantName={merchantName}
				onSelect={(period) => {
					updateUrl({ date: period.key });
				}}
			/>

			<h1 className="text-3xl font-bold tracking-tight">
				{formatPeriodTitle(selectedPeriod.start, timeframe)}
			</h1>

			<div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
				<section className="min-h-[560px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/5 dark:bg-[#1b1b1b]">
					<TableToolbar
						title={`Transactions (${periodTransactions.length})`}
						showViewSelector={false}
						showEditMultiple={false}
						isEditMode={isTableEditMode}
						setIsEditMode={setIsTableEditMode}
						selectedIds={selectedIds}
						setSelectedIds={setSelectedIds}
						visibleTransactionIds={periodTransactions.map(
							(transaction) => transaction.id,
						)}
						currentView="all"
						filteredLength={periodTransactions.length}
						sorting={sorting}
						setSorting={setSorting}
						columnVisibility={columnVisibility}
						setColumnVisibility={setColumnVisibility}
						columnOptions={MERCHANT_TABLE_COLUMNS}
						onEditMultiple={() => undefined}
					/>

					<div className="h-[490px] overflow-hidden">
						<DataTable
							transactions={periodTransactions}
							selectedIds={selectedIds}
							onSelectRow={handleSelectRow}
							onRowClick={openTransaction}
							columnVisibility={columnVisibility}
							isEditMode={isTableEditMode}
							currentView="all"
							sorting={sorting}
							merchantItems={merchantItems}
							isCategoryView
							getCategoryId={getCategoryId}
							isMerchantNavigationEnabled={false}
							getMerchantId={getMerchantId}
							onCategoryChange={(id, newCategory) => {
								void updateTransaction(id, {
									category: newCategory,
								});
							}}
							navigationSource={(fromParam as NavigationSource) ?? undefined}
						/>
					</div>
				</section>

				<EntityTransactionSummary
					transactions={periodTransactions}
					csvFilename="merchant-transactions.csv"
				/>
			</div>

			{isEditOpen && merchantEditorValue && (
				<MerchantEditorModal
					key={merchantEditorValue.id}
					merchant={merchantEditorValue}
					isRecurring={recurringNames.has(
						normalizeMerchantName(merchantEditorValue.name),
					)}
					childDialogOpen={Boolean(mergeSource)}
					onClose={() => setIsEditOpen(false)}
					onSave={handleSaveMerchant}
					onRequestMerge={() => setMergeSource(merchantEditorValue)}
				/>
			)}

			{mergeSource && (
				<MerchantMergeDialog
					key={mergeSource.id}
					source={mergeSource}
					merchantItems={merchantItems}
					onClose={() => setMergeSource(null)}
					onConfirm={handleMergeMerchant}
				/>
			)}
		</div>
	);
}

function MerchantTrendChart({
	periods,
	selectedKey,
	merchantName,
	onSelect,
}: {
	periods: MerchantChartPeriod[];
	selectedKey: string;
	merchantName: string;
	onSelect: (period: MerchantChartPeriod) => void;
}) {
	const [hoverKey, setHoverKey] = useState<string | null>(null);
	const periodByKey = useMemo(() => {
		return new Map(periods.map((period) => [period.key, period] as const));
	}, [periods]);

	return (
		<section className="h-[410px] rounded-2xl border border-gray-200 bg-white px-4 pb-4 pt-3 shadow-sm dark:border-white/5 dark:bg-[#232322]">
			<ResponsiveContainer width="100%" height="100%">
				<BarChart
					data={periods}
					margin={{ top: 48, right: 8, left: 0, bottom: 4 }}
					onMouseLeave={() => setHoverKey(null)}
				>
					<CartesianGrid
						vertical={false}
						stroke="currentColor"
						className="text-gray-200 dark:text-white/10"
					/>

					{periods
						.filter((period) => period.showYearMarker)
						.map((period) => {
							return (
								<ReferenceLine
									key={`year:${period.key}`}
									x={period.key}
									stroke="currentColor"
									className="text-gray-200 dark:text-white/10"
									label={{
										value: `${period.year} →`,
										position: "insideTopRight",
										fill: "#999",
										fontSize: 12,
									}}
								/>
							);
						})}

					<XAxis
						dataKey="key"
						axisLine={false}
						tickLine={false}
						tick={(props: XAxisTickContentProps) => {
							const rawValue = props.payload?.value;
							const periodKey =
								typeof rawValue === "string"
									? rawValue
									: String(rawValue ?? "");
							const period = periodByKey.get(periodKey);
							const parsedX = Number(props.x ?? 0);
							const parsedY = Number(props.y ?? 0);
							const x = Number.isFinite(parsedX) ? parsedX : 0;
							const y = Number.isFinite(parsedY) ? parsedY : 0;

							return (
								<text
									x={x}
									y={y + 16}
									textAnchor="middle"
									fill="#999"
									fontSize={12}
									fontWeight={600}
								>
									{period?.shortLabel ?? ""}
								</text>
							);
						}}
					/>

					<YAxis
						axisLine={false}
						tickLine={false}
						tick={{ fill: "#999", fontSize: 12 }}
						tickFormatter={(value: number | string) => {
							return compactCurrency(Number(value));
						}}
						width={64}
					/>

					<Tooltip
						cursor={{
							fill: "rgba(255,255,255,0.035)",
						}}
						content={<MerchantTrendTooltip merchantName={merchantName} />}
					/>

					<Bar
						dataKey="amount"
						cursor="pointer"
						minPointSize={2}
						onMouseEnter={(_entry: unknown, index: number) => {
							setHoverKey(periods[index]?.key ?? null);
						}}
						onClick={(_entry: unknown, index: number) => {
							const period = periods[index];

							if (period) {
								onSelect(period);
							}
						}}
					>
						{periods.map((period) => {
							const active =
								period.key === selectedKey || period.key === hoverKey;

							return (
								<Cell
									key={period.key}
									fill="#a4383d"
									fillOpacity={active ? 0.96 : 0.52}
									style={{
										transition: "fill-opacity 150ms ease",
									}}
								/>
							);
						})}
					</Bar>
				</BarChart>
			</ResponsiveContainer>
		</section>
	);
}

function MerchantTrendTooltip({
	active,
	payload,
	merchantName,
}: MerchantTrendTooltipProps) {
	const period = payload?.[0]?.payload;

	if (!active || !period) {
		return null;
	}

	return (
		<div className="min-w-64 overflow-hidden rounded-xl border border-white/10 bg-[#121212] text-white shadow-2xl">
			<div className="border-b border-white/10 px-4 py-3 text-sm font-bold">
				{period.label}
			</div>
			<div className="flex items-center gap-3 px-4 py-4 text-sm">
				<span className="size-2.5 rounded-full bg-[#ef4b55]" />
				<span className="font-semibold">{merchantName}:</span>
				<span className="ml-auto font-bold">{formatMoney(period.amount)}</span>
			</div>
		</div>
	);
}

function EntityTransactionSummary({
	transactions,
	csvFilename,
}: {
	transactions: Transaction[];
	csvFilename: string;
}) {
	const summary = getReportSummary(transactions);

	const downloadCsv = (): void => {
		const escapeValue = (value: unknown): string => {
			return `"${String(value ?? "").replaceAll('"', '""')}"`;
		};
		const rows = [
			["Date", "Merchant", "Category", "Account", "Amount"],
			...transactions.map((transaction) => {
				return [
					transaction.date,
					transaction.merchant,
					transaction.category,
					transaction.account,
					transaction.amount,
				];
			}),
		];
		const csv = rows.map((row) => row.map(escapeValue).join(",")).join("\n");
		const url = URL.createObjectURL(
			new Blob([csv], {
				type: "text/csv;charset=utf-8",
			}),
		);
		const anchor = document.createElement("a");

		anchor.href = url;
		anchor.download = csvFilename;
		anchor.click();
		URL.revokeObjectURL(url);
	};

	return (
		<aside className="h-fit overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/5 dark:bg-[#1b1b1b]">
			<h2 className="border-b border-gray-200 px-5 py-4 text-lg font-bold dark:border-white/5">
				Summary
			</h2>
			<dl className="space-y-4 px-5 py-5 text-sm">
				{[
					["Total transactions", String(transactions.length)],
					["Largest transaction", formatMoney(summary.largestTransaction)],
					["Average transaction", formatMoney(summary.averageTransaction)],
					["Total income", formatMoney(summary.totalIncome)],
					["Total spending", formatMoney(summary.totalExpenses)],
					["First transaction", summary.firstTransaction?.date ?? "—"],
					["Last transaction", summary.lastTransaction?.date ?? "—"],
				].map(([label, value]) => {
					return (
						<div
							key={label}
							className="flex items-center justify-between gap-6"
						>
							<dt className="text-gray-500 dark:text-zinc-400">{label}</dt>
							<dd className="text-right font-semibold text-gray-900 dark:text-white">
								{value}
							</dd>
						</div>
					);
				})}
			</dl>
			<button
				type="button"
				onClick={downloadCsv}
				disabled={transactions.length === 0}
				className="w-full border-t border-gray-200 py-4 text-sm font-semibold text-cyan-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/5 dark:text-cyan-400 dark:hover:bg-white/5"
			>
				Download CSV
			</button>
		</aside>
	);
}

function MerchantBreadcrumbIcon({
	name,
	logoUrl,
}: {
	name: string;
	logoUrl?: string | null;
}) {
	const initial = name.trim().charAt(0).toUpperCase() || "?";

	return (
		<span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-full border border-black/10 bg-white text-sm font-bold text-[#ff5a35] shadow-sm dark:border-white/15 dark:bg-white/10 dark:text-white">
			{logoUrl ? (
				// eslint-disable-next-line @next/next/no-img-element
				<img src={logoUrl} alt="" className="h-full w-full object-cover" />
			) : (
				<span aria-hidden="true">{initial}</span>
			)}
		</span>
	);
}
