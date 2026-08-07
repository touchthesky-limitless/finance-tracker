/**
 * Main client component for the Merchant Details page.
 * Fetches data, manages URL state, and renders the layout.
 */
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
import { ChevronRight } from "lucide-react";

import { CashFlowFilterMenu } from "@/components/CashFlow/CashFlowFilterMenu";
import { TimeframeTabs } from "@/components/CashFlow/CashFlowControls";
import {
	formatPeriodTitle,
	getCategoryIdMap,
	parseUtcDate,
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
	type MerchantEditorSaveValue,
	type MerchantEditorValue,
} from "@/components/Merchants/MerchantEditorModal";
import { MerchantMergeDialog } from "@/components/Merchants/MerchantMergeDialog";
import { useMerchantOptions } from "@/hooks/useMerchantOptions";
import { useUnifiedCategories } from "@/hooks/useUnifiedCategories";
import {
	normalizeMerchantName,
	useUnifiedMerchants,
} from "@/hooks/useUnifiedMerchants";
import {
	deleteCustomMerchantRecord,
	updateCustomMerchantName,
} from "@/lib/merchants/merchantRepository";
import type { Transaction } from "@/store/useBudgetStore";
import { useBudgetStore } from "@/store/useBudgetStore";
import {
	getBreadcrumb,
	type NavigationSource,
} from "@/lib/navigation/breadcrumb";
import { useTransactionDrawer } from "@/store/useTransactionDrawer";

import {
	MerchantTrendChart,
	EntityTransactionSummary,
	MerchantBreadcrumbIcon,
	DEFAULT_SORTING,
	HIDDEN_MODES,
	MERCHANT_TABLE_COLUMNS,
	normalize,
	parseEnum,
	readCsv,
	getLatestTransactionDate,
	buildMerchantChartPeriods,
	transactionMatchesMerchant,
	setMerchantRecurringState,
	type MerchantChartPeriod,
} from "./MerchantDetailsPage";

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

	const openDrawer = useTransactionDrawer((state) => state.openDrawer);

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
	}>({ contextKey: "", ids: [] });
	const [isTableEditMode, setIsTableEditMode] = useState(false);

	// Initial data fetch
	useEffect(() => {
		let active = true;
		const load = async () => {
			try {
				await Promise.all([
					fetchTransactions(),
					fetchAccounts(),
					fetchCustomCategories(),
					fetchMerchants(),
				]);
			} finally {
				if (active) setLoading(false);
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

	const filters = useMemo<CashFlowFilters>(
		() => ({
			accountIds: readCsv(accountsParam),
			tags: readCsv(tagsParam),
			hidden,
		}),
		[accountsParam, hidden, tagsParam],
	);

	const fromParam = searchParams.get("from");
	const breadcrumb = getBreadcrumb(fromParam);

	const updateUrl = useCallback(
		(updates: Record<string, string | null>) => {
			const next = new URLSearchParams(searchParamsString);
			for (const [key, value] of Object.entries(updates)) {
				if (!value) next.delete(key);
				else next.set(key, value);
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
		if (directMatch) return directMatch;
		const normalizedRouteValue = normalizeMerchantName(merchantId);
		return allUnifiedMerchants.find(
			(item) => normalizeMerchantName(item.name) === normalizedRouteValue,
		);
	}, [allUnifiedMerchants, getMerchantById, merchantId]);

	// Redirect to canonical merchant ID if needed
	useEffect(() => {
		if (!merchant?.id || merchant.id === merchantId) return;
		const query = searchParamsString ? `?${searchParamsString}` : "";
		router.replace(`/merchants/${encodeURIComponent(merchant.id)}${query}`, {
			scroll: false,
		});
	}, [merchant, merchantId, router, searchParamsString]);

	const merchantName = merchant?.name ?? "Merchant";

	const merchantRecord = useMemo(
		() => merchants.find((item) => item.id === merchant?.id) ?? null,
		[merchant, merchants],
	);

	const recurringNames = useMemo(
		() =>
			new Set(recurringMerchants.map((name) => normalizeMerchantName(name))),
		[recurringMerchants],
	);

	const merchantTransactions = useMemo(() => {
		if (!merchant) return [];
		return transactions.filter((t) =>
			transactionMatchesMerchant(t, merchant.id, merchant.name),
		);
	}, [merchant, transactions]);

	const merchantEditorValue = useMemo<MerchantEditorValue | null>(() => {
		if (!merchant) return null;
		const baseItem = merchantItems.find(
			(item) =>
				item.id === merchant.id ||
				normalizeMerchantName(item.name) ===
					normalizeMerchantName(merchant.name),
		);
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

	const filteredMerchantTransactions = useMemo(
		() =>
			merchantTransactions.filter((t) =>
				transactionMatchesCashFlowFilters(t, filters),
			),
		[filters, merchantTransactions],
	);

	const latestMerchantDate = useMemo(
		() =>
			getLatestTransactionDate(filteredMerchantTransactions) ??
			getLatestTransactionDate(merchantTransactions) ??
			new Date(),
		[filteredMerchantTransactions, merchantTransactions],
	);

	const selectedDate =
		parseUtcDate(dateParam) ?? startOfPeriod(latestMerchantDate, timeframe);

	const chartPeriods = useMemo(
		() =>
			buildMerchantChartPeriods(
				filteredMerchantTransactions,
				selectedDate,
				timeframe,
			),
		[filteredMerchantTransactions, selectedDate, timeframe],
	);

	const selectedPeriod =
		chartPeriods.find(
			(p) => selectedDate >= p.start && selectedDate <= p.end,
		) ??
		[...chartPeriods].reverse().find((p) => p.amount > 0) ??
		chartPeriods[chartPeriods.length - 1];

	const periodTransactions = useMemo(() => {
		if (!selectedPeriod) return [];
		return filteredMerchantTransactions.filter((t) => {
			const date = parseUtcDate(t.date);
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
				return { contextKey: selectionContextKey, ids: nextIds };
			});
		},
		[selectionContextKey],
	);

	const categoryIdByName = useMemo(() => {
		const customCategoryMap = getCategoryIdMap(customCategories);
		const result = new Map(customCategoryMap);
		for (const category of allUnifiedCategories) {
			if (category.id) result.set(normalize(category.name), category.id);
		}
		return result;
	}, [allUnifiedCategories, customCategories]);

	const getCategoryId = useCallback(
		(categoryName: string) => categoryIdByName.get(normalize(categoryName)),
		[categoryIdByName],
	);

	const handleSelectRow = (id: string, event: ReactMouseEvent) => {
		event.stopPropagation();
		setSelectedIds((current) =>
			current.includes(id) ? current.filter((v) => v !== id) : [...current, id],
		);
	};

	const handleRowClick = (transaction: Transaction) => {
		openDrawer(transaction.id);
	};

	const handleTimeframeChange = (nextTimeframe: CashFlowTimeframe) => {
		const anchor = selectedPeriod?.start ?? selectedDate;
		updateUrl({
			timeframe: nextTimeframe,
			date: toDateParam(startOfPeriod(anchor, nextTimeframe)),
		});
	};

	const handleSaveMerchant = async (value: MerchantEditorSaveValue) => {
		if (!merchant || !merchantEditorValue) return;

		const cleanName = value.name.trim();
		if (!cleanName) throw new Error("Merchant name is required.");

		const nameChanged =
			normalizeMerchantName(cleanName) !== normalizeMerchantName(merchant.name);

		if (nameChanged) {
			const duplicate = allUnifiedMerchants.find(
				(item) =>
					item.id !== merchant.id &&
					normalizeMerchantName(item.name) === normalizeMerchantName(cleanName),
			);
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
				merchantTransactions.map((t) =>
					updateTransaction(t.id, {
						merchant: cleanName,
						merchant_id: targetMerchantId,
					}),
				),
			);
		}

		setMerchantRecurringState(merchant.name, cleanName, value.isRecurring);

		setLogoOverrides((current) => {
			const next = { ...current };
			if (targetMerchantId !== merchant.id) delete next[merchant.id];
			next[targetMerchantId] = value.logoUrl;
			return next;
		});

		await Promise.all([fetchTransactions(true), fetchMerchants()]);
		setIsEditOpen(false);

		if (targetMerchantId !== merchant.id) {
			const query = searchParamsString ? `?${searchParamsString}` : "";
			router.replace(
				`/merchants/${encodeURIComponent(targetMerchantId)}${query}`,
				{
					scroll: false,
				},
			);
		}
	};

	const handleMergeMerchant = async (target: { id: string; name: string }) => {
		if (!merchant || !merchantEditorValue) return;
		if (target.id === merchant.id)
			throw new Error("Choose a different merchant.");

		await Promise.all(
			merchantTransactions.map((t) =>
				updateTransaction(t.id, {
					merchant: target.name,
					merchant_id: target.id,
				}),
			),
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

	// Loading state
	if (loading) {
		return (
			<div className="min-h-screen space-y-5 bg-gray-50 p-5 dark:bg-[#171716]">
				<div className="h-12 animate-pulse rounded-xl bg-gray-200 dark:bg-white/10" />
				<div className="h-[410px] animate-pulse rounded-2xl bg-gray-200 dark:bg-white/10" />
				<div className="h-[560px] animate-pulse rounded-2xl bg-gray-200 dark:bg-white/10" />
			</div>
		);
	}

	// Merchant not found
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
				onSelect={(period: MerchantChartPeriod) =>
					updateUrl({ date: period.key })
				}
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
						visibleTransactionIds={periodTransactions.map((t) => t.id)}
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
							onRowClick={handleRowClick}
							columnVisibility={columnVisibility}
							isEditMode={isTableEditMode}
							currentView="all"
							sorting={sorting}
							merchantItems={merchantItems}
							isCategoryView
							getCategoryId={getCategoryId}
							isMerchantNavigationEnabled={false}
							getMerchantId={getMerchantId}
							onCategoryChange={(id, newCategory) =>
								void updateTransaction(id, { category: newCategory })
							}
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
					key="merge-dialog"
					source={mergeSource}
					merchantItems={merchantItems}
					onClose={() => setMergeSource(null)}
					onConfirm={handleMergeMerchant}
				/>
			)}
		</div>
	);
}
