/**
 * CategoryDetailsPageClient - Main page component for category details.
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
import { useParams, useRouter, useSearchParams } from "next/navigation";
import type { SortingState, VisibilityState } from "@tanstack/react-table";
import { ChevronRight, Trash2 } from "lucide-react";

import { CashFlowFilterMenu } from "@/components/CashFlow/CashFlowFilterMenu";
import { TimeframeTabs } from "@/components/CashFlow/CashFlowControls";
import {
	startOfPeriod,
	formatPeriodTitle,
	toDateParam,
	getCategoryIdMap,
} from "@/components/CashFlow/cashFlowUtils";
import type { CashFlowTimeframe } from "@/components/CashFlow/types";
import { DataTable } from "@/components/Transactions/DataTable";
import { TableToolbar } from "@/components/Transactions/TableToolbar";
import { CategoryEditorModal } from "./CategoryEditorModal";
import { CategoryGlyph } from "./CategoryGlyph";
import { CategoryTrendChart } from "./CategoryTrendChart";

import { EntityTransactionSummary } from "./EntityTransactionSummary";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useMerchantOptions } from "@/hooks/useMerchantOptions";
import { useCategoryGroups } from "@/hooks/useCategoryGroups";
import { useUnifiedCategories } from "@/hooks/useUnifiedCategories";
import { useUnifiedMerchants } from "@/hooks/useUnifiedMerchants";
import { type Transaction, useBudgetStore } from "@/store/useBudgetStore";
import {
	getBreadcrumb,
	type NavigationSource,
} from "@/lib/navigation/breadcrumb";
import { useTransactionDrawer } from "@/store/useTransactionDrawer";

import { useCategoryFilters } from "@/hooks/useCategoryFilters";
import { useCategoryTransactions } from "@/hooks/useCategoryTransactions";
import { useCategoryChartPeriods } from "@/hooks/useCategoryChartPeriods";
import { parseUtcDate } from "@/components/CashFlow/cashFlowUtils";
import { normalizeCategoryName, getLatestTransactionDate } from "./utils";
import type {
	CategoryEditorValue,
	CategoryEditorGroupOption,
	CategoryBudgetType,
	CategoryEditorSaveValue,
} from "./types";

const DEFAULT_SORTING: SortingState = [{ id: "date", desc: true }];
const CATEGORY_TABLE_COLUMNS = [
	{ id: "merchant", label: "Merchant" },
	{ id: "category", label: "Category" },
	{ id: "account", label: "Account" },
	{ id: "amount", label: "Amount" },
] as const;

export default function CategoryDetailsPageClient() {
	const params = useParams<{ id: string }>();
	const router = useRouter();
	const searchParams = useSearchParams();
	const searchString = searchParams.toString();
	const categoryId = decodeURIComponent(params.id ?? "");
	const fromParam = searchParams.get("from");
	const breadcrumb = getBreadcrumb(fromParam);

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

	const openDrawer = useTransactionDrawer((state) => state.openDrawer);

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
		const load = async () => {
			try {
				await Promise.all([
					fetchTransactions(),
					fetchAccounts(),
					fetchCustomCategories(),
					fetchCategoryPreferences(),
				]);
			} finally {
				if (active) setLoading(false);
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

	// URL filters
	const { timeframe, filters, dateParam, updateUrl } = useCategoryFilters();

	const category = useMemo(() => {
		const direct = allUnifiedCategories.find((item) => item.id === categoryId);
		if (direct) return direct;
		const norm = normalizeCategoryName(categoryId);
		return allUnifiedCategories.find(
			(item) => normalizeCategoryName(item.name) === norm,
		);
	}, [allUnifiedCategories, categoryId]);

	useEffect(() => {
		if (category?.id && category.id !== categoryId) {
			const query = searchString ? `?${searchString}` : "";
			router.replace(`/categories/${encodeURIComponent(category.id)}${query}`, {
				scroll: false,
			});
		}
	}, [category, categoryId, router, searchString]);

	const categoryName = category?.name ?? "Category";

	const categoryRecord = useMemo(() => {
		const categoryIdValue = category?.id;
		if (!categoryIdValue) return null;
		return customCategories.find((item) => item.id === categoryIdValue) ?? null;
	}, [category?.id, customCategories]);

	const effectiveParentName =
		(category?.id
			? categoryPreferences[category.id]?.parentName?.trim()
			: undefined) ||
		categoryRecord?.parent_name?.trim() ||
		category?.parentName?.trim() ||
		categoryGroups.find((g) => g.section_id === "expenses")?.source_name ||
		"Other";

	const categoryEditorGroups = useMemo<CategoryEditorGroupOption[]>(() => {
		return categoryGroups.map((g) => ({
			key: g.id,
			name: g.source_name,
			displayName: g.name,
			sectionId: g.section_id,
			hidden: g.hidden,
		}));
	}, [categoryGroups]);

	type CategoryPreferenceWithBudget = (typeof categoryPreferences)[string] & {
		budgetType?: CategoryBudgetType;
		monthlyRollover?: boolean;
	};

	const categoryEditorValue = useMemo<CategoryEditorValue | null>(() => {
		if (!category?.id) return null;
		const pref = categoryPreferences[category.id] as
			| CategoryPreferenceWithBudget
			| undefined;
		return {
			id: category.id,
			name: category.name,
			icon:
				categoryRecord?.icon_name?.trim() ||
				String(category.icon ?? category.name),
			parentName: effectiveParentName,
			isSystem: categoryRecord?.is_system ?? !category.isCustom,
			excludedFromBudget: pref?.excludedFromBudget === true,
			budgetType: pref?.budgetType ?? "flexible",
			monthlyRollover: pref?.monthlyRollover === true,
			hidden: pref?.hidden === true,
		};
	}, [category, categoryPreferences, categoryRecord, effectiveParentName]);

	// Get category transactions
	const { categoryTxs, filtered: filteredCategoryTransactions } =
		useCategoryTransactions(transactions, category?.name ?? null, filters);

	const latestCategoryDate = useMemo(() => {
		return (
			getLatestTransactionDate(filteredCategoryTransactions) ??
			getLatestTransactionDate(categoryTxs) ??
			new Date()
		);
	}, [categoryTxs, filteredCategoryTransactions]);

	const selectedDate =
		parseUtcDate(dateParam) ?? startOfPeriod(latestCategoryDate, timeframe);

	// Chart periods
	const chartPeriods = useCategoryChartPeriods(
		filteredCategoryTransactions,
		selectedDate,
		timeframe,
	);

	const selectedPeriod = useMemo(() => {
		return (
			chartPeriods.find(
				(p) => selectedDate >= p.start && selectedDate <= p.end,
			) ??
			[...chartPeriods].reverse().find((p) => p.amount > 0) ??
			chartPeriods[chartPeriods.length - 1]
		);
	}, [chartPeriods, selectedDate]);

	const periodTransactions = useMemo(() => {
		if (!selectedPeriod) return [];
		return filteredCategoryTransactions.filter((tx) => {
			const d = parseUtcDate(tx.date);
			return d && d >= selectedPeriod.start && d <= selectedPeriod.end;
		});
	}, [filteredCategoryTransactions, selectedPeriod]);

	// Selection context
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
		(next: SetStateAction<string[]>) => {
			setSelectionState((cur) => {
				const current = cur.contextKey === selectionContextKey ? cur.ids : [];
				const nextIds = typeof next === "function" ? next(current) : next;
				return { contextKey: selectionContextKey, ids: nextIds };
			});
		},
		[selectionContextKey],
	);

	const categoryIdByName = useMemo(() => {
		const map = getCategoryIdMap(customCategories);
		for (const item of allUnifiedCategories) {
			if (item.id) map.set(normalizeCategoryName(item.name), item.id);
		}
		return map;
	}, [allUnifiedCategories, customCategories]);

	const getCategoryId = useCallback(
		(name: string) => categoryIdByName.get(normalizeCategoryName(name)),
		[categoryIdByName],
	);

	const handleSelectRow = (id: string, event: ReactMouseEvent) => {
		event.stopPropagation();
		setSelectedIds((cur) =>
			cur.includes(id) ? cur.filter((v) => v !== id) : [...cur, id],
		);
	};

	const handleTimeframeChange = (next: CashFlowTimeframe) => {
		const anchor = selectedPeriod?.start ?? selectedDate;
		updateUrl({
			timeframe: next,
			date: toDateParam(startOfPeriod(anchor, next)),
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

		const nameChanged =
			normalizeCategoryName(cleanName) !== normalizeCategoryName(category.name);

		if (nameChanged) {
			const duplicate = allUnifiedCategories.find((item) => {
				return (
					item.id !== category.id &&
					normalizeCategoryName(item.name) === normalizeCategoryName(cleanName)
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
				categoryTxs.map((transaction) => {
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
					budgetType: value.budgetType,
					monthlyRollover: value.monthlyRollover,
				} as (typeof current)[string] & {
					budgetType: CategoryBudgetType;
					monthlyRollover: boolean;
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
						href={breadcrumb.href}
						className="mt-5 inline-flex rounded-xl bg-[#FF6633] px-4 py-2.5 font-semibold text-white"
					>
						{`Back to ${breadcrumb.label}`}
					</Link>
				</div>
			</div>
		);
	}

	const handleRowClick = (tx: Transaction) => openDrawer(tx.id);

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
						onApply={(next) => {
							updateUrl({
								accounts:
									next.accountIds.length > 0 ? next.accountIds.join(",") : null,
								tags: next.tags.length > 0 ? next.tags.join(",") : null,
								hidden: next.hidden === "visible" ? null : next.hidden,
							});
						}}
					/>
				</div>
			</header>

			<CategoryTrendChart
				periods={chartPeriods}
				selectedKey={selectedPeriod.key}
				categoryName={categoryName}
				onSelect={(p) => updateUrl({ date: p.key })}
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
						visibleTransactionIds={periodTransactions.map((tx) => tx.id)}
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
							onRowClick={handleRowClick}
							columnVisibility={columnVisibility}
							isEditMode={isTableEditMode}
							currentView="all"
							sorting={sorting}
							merchantItems={merchantItems}
							isCategoryView={false}
							getCategoryId={getCategoryId}
							isMerchantNavigationEnabled
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
						if (!isDeleting) setIsDeleteConfirmOpen(false);
					}}
					onConfirm={handleDeleteCategory}
				/>
			)}
		</div>
	);
}
