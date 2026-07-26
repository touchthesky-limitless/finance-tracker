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
import { ChevronRight, Trash2 } from "lucide-react";

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
	CategoryEditorModal,
	type CategoryEditorGroupOption,
	type CategoryEditorSaveValue,
	type CategoryEditorValue,
} from "@/components/Categories/CategoryEditorModal";
import { CategoryGlyph } from "@/components/Categories/CategoryGlyph";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { getReportSummary } from "@/components/Reports/reportUtils";
import { useMerchantOptions } from "@/hooks/useMerchantOptions";
import { useCategoryGroups } from "@/hooks/useCategoryGroups";
import { useUnifiedCategories } from "@/hooks/useUnifiedCategories";
import { useUnifiedMerchants } from "@/hooks/useUnifiedMerchants";
import { type Transaction, useBudgetStore } from "@/store/useBudgetStore";
import { compactCurrency, formatMoney } from "@/utils/formatters";

const DEFAULT_SORTING: SortingState = [{ id: "date", desc: true }];
const HIDDEN_MODES = ["visible", "hidden", "all"] as const;
const CATEGORY_TABLE_COLUMNS = [
	{ id: "merchant", label: "Merchant" },
	{ id: "category", label: "Category" },
	{ id: "account", label: "Account" },
	{ id: "amount", label: "Amount" },
] as const;

interface CategoryChartPeriod {
	key: string;
	label: string;
	shortLabel: string;
	start: Date;
	end: Date;
	amount: number;
	year: number;
	showYearMarker: boolean;
}

interface CategoryTrendTooltipProps {
	active?: boolean;
	payload?: ReadonlyArray<{
		payload?: CategoryChartPeriod;
	}>;
	categoryName: string;
}

function normalize(value: string | null | undefined): string {
	return value?.trim().toLowerCase() ?? "";
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

function buildCategoryChartPeriods(
	transactions: Transaction[],
	selectedDate: Date,
	timeframe: CashFlowTimeframe,
): CategoryChartPeriod[] {
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

	const periods: CategoryChartPeriod[] = [];

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

export default function CategoryDetailsPageClient() {
	const params = useParams<{ id: string }>();
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const searchParamsString = searchParams.toString();
	const categoryId = decodeURIComponent(params.id ?? "");

	const transactions = useBudgetStore((state) => state.transactions);
	const accounts = useBudgetStore((state) => state.accounts);
	const customCategories = useBudgetStore((state) => state.customCategories);
	const customTags = useBudgetStore((state) => state.customTags);
	const groupPreferences = useBudgetStore((state) => state.groupPreferences);
	const categoryPreferences = useBudgetStore(
		(state) => state.categoryPreferences,
	);
	const fetchTransactions = useBudgetStore((state) => state.fetchTransactions);
	const fetchAccounts = useBudgetStore((state) => state.fetchAccounts);
	const fetchCustomCategories = useBudgetStore(
		(state) => state.fetchCustomCategories,
	);
	const fetchCategoryPreferences = useBudgetStore(
		(state) => state.fetchCategoryPreferences,
	);
	const updateTransaction = useBudgetStore((state) => state.updateTransaction);
	const updateCustomCategory = useBudgetStore(
		(state) => state.updateCustomCategory,
	);
	const deleteCustomCategory = useBudgetStore(
		(state) => state.deleteCustomCategory,
	);
	const setCategoryPreferences = useBudgetStore(
		(state) => state.setCategoryPreferences,
	);
	const merchantItems = useMerchantOptions();
	const { allUnifiedCategories } = useUnifiedCategories("Expense", "All");
	const { getMerchantId } = useUnifiedMerchants();
	const { groups: categoryGroups, isLoading: areCategoryGroupsLoading } =
		useCategoryGroups({
			customCategories,
			categoryPreferences,
			groupPreferences,
		});

	const [loading, setLoading] = useState(true);
	const [isEditOpen, setIsEditOpen] = useState(false);
	const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
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
					fetchCategoryPreferences(),
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
	}, [
		fetchAccounts,
		fetchCategoryPreferences,
		fetchCustomCategories,
		fetchTransactions,
	]);

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

	const category = useMemo(() => {
		const directMatch = allUnifiedCategories.find((item) => {
			return item.id === categoryId;
		});

		if (directMatch) {
			return directMatch;
		}

		const normalizedRouteValue = normalize(categoryId);

		return allUnifiedCategories.find((item) => {
			return normalize(item.name) === normalizedRouteValue;
		});
	}, [allUnifiedCategories, categoryId]);

	useEffect(() => {
		if (!category?.id || category.id === categoryId) {
			return;
		}

		const query = searchParamsString ? `?${searchParamsString}` : "";

		router.replace(`/categories/${encodeURIComponent(category.id)}${query}`, {
			scroll: false,
		});
	}, [category, categoryId, router, searchParamsString]);

	const categoryName = category?.name ?? "Category";

	const categoryRecord = useMemo(() => {
		const categoryIdValue = category?.id;

		if (!categoryIdValue) {
			return null;
		}

		return customCategories.find((item) => item.id === categoryIdValue) ?? null;
	}, [category?.id, customCategories]);

	const effectiveParentName =
		(category?.id
			? categoryPreferences[category.id]?.parentName?.trim()
			: undefined) ||
		categoryRecord?.parent_name?.trim() ||
		category?.parentName?.trim() ||
		categoryGroups.find((group) => group.section_id === "expenses")
			?.source_name ||
		"Other";

	const categoryEditorGroups = useMemo<CategoryEditorGroupOption[]>(() => {
		return categoryGroups.map((group) => {
			return {
				key: group.id,
				name: group.source_name,
				displayName: group.name,
				sectionId: group.section_id,
				hidden: group.hidden,
			};
		});
	}, [categoryGroups]);

	const categoryEditorValue = useMemo<CategoryEditorValue | null>(() => {
		if (!category?.id) {
			return null;
		}

		return {
			id: category.id,
			name: category.name,
			icon:
				categoryRecord?.icon_name?.trim() ||
				String(category.icon ?? category.name),
			parentName: effectiveParentName,
			isSystem: categoryRecord?.is_system ?? !category.isCustom,
			excludedFromBudget:
				categoryPreferences[category.id]?.excludedFromBudget === true,
			hidden: categoryPreferences[category.id]?.hidden === true,
		};
	}, [category, categoryPreferences, categoryRecord, effectiveParentName]);

	const categoryTransactions = useMemo(() => {
		if (!category) {
			return [];
		}

		const normalizedCategoryName = normalize(category.name);

		return transactions.filter((transaction) => {
			return normalize(transaction.category) === normalizedCategoryName;
		});
	}, [category, transactions]);

	const filteredCategoryTransactions = useMemo(() => {
		return categoryTransactions.filter((transaction) => {
			return transactionMatchesCashFlowFilters(transaction, filters);
		});
	}, [categoryTransactions, filters]);

	const latestCategoryDate = useMemo(() => {
		return (
			getLatestTransactionDate(filteredCategoryTransactions) ??
			getLatestTransactionDate(categoryTransactions) ??
			new Date()
		);
	}, [categoryTransactions, filteredCategoryTransactions]);

	const selectedDate =
		parseUtcDate(dateParam) ?? startOfPeriod(latestCategoryDate, timeframe);

	const chartPeriods = useMemo(() => {
		return buildCategoryChartPeriods(
			filteredCategoryTransactions,
			selectedDate,
			timeframe,
		);
	}, [filteredCategoryTransactions, selectedDate, timeframe]);

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

		return filteredCategoryTransactions.filter((transaction) => {
			const date = parseUtcDate(transaction.date);

			return Boolean(
				date && date >= selectedPeriod.start && date <= selectedPeriod.end,
			);
		});
	}, [filteredCategoryTransactions, selectedPeriod]);

	const selectionContextKey = useMemo(() => {
		const accountKey = [...filters.accountIds].sort().join(",");
		const tagKey = [...filters.tags].sort().join(",");

		return [
			category?.id ?? categoryName,
			selectedPeriod?.key ?? "none",
			filters.hidden,
			accountKey,
			tagKey,
		].join("|");
	}, [
		category?.id,
		categoryName,
		filters.accountIds,
		filters.hidden,
		filters.tags,
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

		for (const item of allUnifiedCategories) {
			if (item.id) {
				result.set(normalize(item.name), item.id);
			}
		}

		return result;
	}, [allUnifiedCategories, customCategories]);

	const getCategoryId = useCallback(
		(categoryNameValue: string) => {
			return categoryIdByName.get(normalize(categoryNameValue));
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

	const handleSaveCategory = async (
		value: CategoryEditorSaveValue,
	): Promise<void> => {
		if (!category?.id || !categoryEditorValue) {
			return;
		}

		const cleanName = value.name.trim();

		if (!cleanName) {
			throw new Error("Category name is required.");
		}

		if (!value.parentName.trim()) {
			throw new Error("Choose a category group.");
		}

		const nameChanged = normalize(cleanName) !== normalize(category.name);

		if (nameChanged) {
			const duplicate = allUnifiedCategories.find((item) => {
				return (
					item.id !== category.id &&
					normalize(item.name) === normalize(cleanName)
				);
			});

			if (duplicate) {
				throw new Error("A category with this name already exists.");
			}
		}

		if (categoryRecord && !categoryRecord.is_system) {
			await updateCustomCategory(categoryRecord.id, {
				name: cleanName,
				icon: value.icon.trim() || categoryRecord.icon_name || category.name,
				color: categoryRecord.color_key?.trim() || value.parentName.trim(),
			});
		}

		if (nameChanged) {
			await Promise.all(
				categoryTransactions.map((transaction) => {
					return updateTransaction(transaction.id, {
						category: cleanName,
					});
				}),
			);
		}

		await setCategoryPreferences((current) => {
			return {
				...current,
				[category.id as string]: {
					...(current[category.id as string] ?? {}),
					parentName: value.parentName.trim(),
					excludedFromBudget: value.excludedFromBudget,
				},
			};
		});

		await Promise.all([fetchTransactions(true), fetchCustomCategories()]);
		setIsEditOpen(false);
	};

	const handleActivateCategory = async (): Promise<void> => {
		if (!category?.id) {
			return;
		}

		await setCategoryPreferences((current) => {
			return {
				...current,
				[category.id as string]: {
					...(current[category.id as string] ?? {}),
					hidden: false,
				},
			};
		});

		setIsEditOpen(false);
	};

	const handleDeleteCategory = async (): Promise<void> => {
		if (!category?.id || !categoryEditorValue) {
			return;
		}

		setIsDeleting(true);

		try {
			if (categoryEditorValue.isSystem) {
				await setCategoryPreferences((current) => {
					return {
						...current,
						[category.id as string]: {
							...(current[category.id as string] ?? {}),
							hidden: true,
						},
					};
				});
			} else if (categoryRecord) {
				await deleteCustomCategory(categoryRecord.id);
				await setCategoryPreferences((current) => {
					const next = { ...current };
					delete next[category.id as string];
					return next;
				});
			}

			setIsDeleteConfirmOpen(false);
			setIsEditOpen(false);
			router.push("/transactions");
		} finally {
			setIsDeleting(false);
		}
	};

	if (loading || areCategoryGroupsLoading) {
		return (
			<div className="min-h-screen space-y-5 bg-gray-50 p-5 dark:bg-[#171716]">
				<div className="h-12 animate-pulse rounded-xl bg-gray-200 dark:bg-white/10" />
				<div className="h-[410px] animate-pulse rounded-2xl bg-gray-200 dark:bg-white/10" />
				<div className="h-[560px] animate-pulse rounded-2xl bg-gray-200 dark:bg-white/10" />
			</div>
		);
	}

	if (!category || !selectedPeriod) {
		return (
			<div className="grid min-h-[70vh] place-items-center p-6 text-center">
				<div>
					<h1 className="text-2xl font-bold">Category not found</h1>
					<p className="mt-2 text-gray-500 dark:text-gray-400">
						No category exists with ID {categoryId}.
					</p>
					<Link
						href="/transactions"
						className="mt-5 inline-flex rounded-xl bg-[#FF6633] px-4 py-2.5 font-semibold text-white"
					>
						Back to Transactions
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
						href="/transactions"
						className="text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
					>
						Transactions
					</Link>
					<ChevronRight size={18} className="shrink-0 text-gray-400" />
					<span className="flex min-w-0 items-center gap-2">
						<span className="grid size-8 shrink-0 place-items-center rounded-lg bg-black/[0.04] dark:bg-white/8">
							<CategoryGlyph
								name={categoryEditorValue?.icon || categoryName}
								size={18}
								colorClass={category.theme?.text}
							/>
						</span>
						<span className="truncate">{categoryName}</span>
					</span>
				</nav>

				<div className="ml-auto flex flex-wrap items-center justify-end gap-3">
					<TimeframeTabs value={timeframe} onChange={handleTimeframeChange} />
					<button
						type="button"
						onClick={() => setIsEditOpen(true)}
						disabled={!categoryEditorValue}
						className="flex h-11 items-center rounded-xl border border-gray-300 bg-white px-4 font-semibold transition-colors hover:bg-gray-50 dark:border-white/15 dark:bg-[#232322] dark:hover:bg-white/7"
					>
						Edit category
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

			<CategoryTrendChart
				periods={chartPeriods}
				selectedKey={selectedPeriod.key}
				categoryName={categoryName}
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
						columnOptions={CATEGORY_TABLE_COLUMNS}
						onEditMultiple={() => undefined}
					/>

					<div className="h-[490px] overflow-hidden">
						<DataTable
							transactions={periodTransactions}
							selectedIds={selectedIds}
							onSelectRow={handleSelectRow}
							onRowClick={(transaction: Transaction) => {
								router.push(
									`/transactions/${encodeURIComponent(transaction.id)}`,
								);
							}}
							columnVisibility={columnVisibility}
							isEditMode={isTableEditMode}
							currentView="all"
							sorting={sorting}
							merchantItems={merchantItems}
							isCategoryView={false}
							getCategoryId={getCategoryId}
							isMerchantNavigationEnabled
							getMerchantId={getMerchantId}
							onCategoryChange={(id, newCategory) => {
								void updateTransaction(id, {
									category: newCategory,
								});
							}}
						/>
					</div>
				</section>

				<EntityTransactionSummary
					transactions={periodTransactions}
					csvFilename="category-transactions.csv"
				/>
			</div>

			{isEditOpen && categoryEditorValue && (
				<CategoryEditorModal
					key={categoryEditorValue.id}
					category={categoryEditorValue}
					groups={categoryEditorGroups}
					childDialogOpen={isDeleteConfirmOpen}
					onClose={() => setIsEditOpen(false)}
					onSave={handleSaveCategory}
					onDelete={() => setIsDeleteConfirmOpen(true)}
					onActivate={handleActivateCategory}
				/>
			)}

			{isDeleteConfirmOpen && categoryEditorValue && (
				<ConfirmDialog
					title={
						categoryEditorValue.isSystem
							? `Disable ${categoryName}?`
							: `Delete ${categoryName}?`
					}
					description={
						categoryEditorValue.isSystem
							? "This built-in category will be hidden from category selectors. Existing transactions keep their current category value."
							: "This permanently deletes the custom category. Existing transactions retain their current category text and may need to be recategorized."
					}
					confirmLabel={categoryEditorValue.isSystem ? "Disable" : "Delete"}
					confirmVariant={categoryEditorValue.isSystem ? "warning" : "danger"}
					icon={<Trash2 size={20} />}
					isLoading={isDeleting}
					overlayClassName="z-[1200]"
					onCancel={() => {
						if (!isDeleting) {
							setIsDeleteConfirmOpen(false);
						}
					}}
					onConfirm={handleDeleteCategory}
				/>
			)}
		</div>
	);
}

function CategoryTrendChart({
	periods,
	selectedKey,
	categoryName,
	onSelect,
}: {
	periods: CategoryChartPeriod[];
	selectedKey: string;
	categoryName: string;
	onSelect: (period: CategoryChartPeriod) => void;
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
						content={<CategoryTrendTooltip categoryName={categoryName} />}
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

function CategoryTrendTooltip({
	active,
	payload,
	categoryName,
}: CategoryTrendTooltipProps) {
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
				<span className="font-semibold">{categoryName}:</span>
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
