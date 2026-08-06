/**
 * Main page component for viewing details of a single category group.
 * Fetches data, manages URL state, renders trend chart, transaction table, and summary.
 * Uses the separated subcomponents and utilities.
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
	findCashFlowCategoryGroupById,
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
import { CategoryIcon } from "@/components/CategoryIcon";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useMerchantOptions } from "@/hooks/useMerchantOptions";
import { useCategoryGroups } from "@/hooks/useCategoryGroups";
import { getCategoryGroupPreferenceKey } from "@/lib/categories/categoryPreferences";
import type { CategoryGroupUpdate } from "@/lib/categories/categoryGroups";
import { type Transaction, useBudgetStore } from "@/store/useBudgetStore";
import { getBreadcrumb, NavigationSource } from "@/lib/navigation/breadcrumb";

import { GroupTrendChart } from "./GroupTrendChart";
import { GroupTransactionSummary } from "./GroupTransactionSummary";
import { EditGroupModal } from "@/components/modals";
import { CategoryGroupSelect } from "./CategoryGroupSelect";
import {
	DEFAULT_SORTING,
	HIDDEN_MODES,
	GROUP_TABLE_COLUMNS,
	normalize,
	parseEnum,
	readCsv,
	getLatestTransactionDate,
	buildGroupChartPeriods,
	transactionMatchesGroup,
} from "@/components/CategoryGroups"; 

export default function CategoryGroupDetailsPageClient() {
	const params = useParams<{ groupId: string }>();
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const searchParamsString = searchParams.toString();
	const groupId = decodeURIComponent(params.groupId ?? "");

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
	const fetchMerchants = useBudgetStore((state) => state.fetchMerchants);
	const setGroupPreferences = useBudgetStore(
		(state) => state.setGroupPreferences,
	);
	const setCategoryPreferences = useBudgetStore(
		(state) => state.setCategoryPreferences,
	);
	const deleteCustomCategory = useBudgetStore(
		(state) => state.deleteCustomCategory,
	);
	const merchantItems = useMerchantOptions();
	const {
		groups: categoryGroups,
		isLoading: areCategoryGroupsLoading,
		updateGroup,
		removeGroup,
	} = useCategoryGroups({
		customCategories,
		categoryPreferences,
		groupPreferences,
	});

	const fromParam = searchParams.get("from");
	const breadcrumb = getBreadcrumb(fromParam);

	const [loading, setLoading] = useState(true);
	const [isEditGroupOpen, setIsEditGroupOpen] = useState(false);
	const [isDeleteGroupOpen, setIsDeleteGroupOpen] = useState(false);
	const [deleteTargetGroupId, setDeleteTargetGroupId] = useState("");
	const [isDeletingGroup, setIsDeletingGroup] = useState(false);
	const [deleteError, setDeleteError] = useState<string | null>(null);
	const [sorting, setSorting] = useState<SortingState>(DEFAULT_SORTING);
	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
	const [selectionState, setSelectionState] = useState<{
		contextKey: string;
		ids: string[];
	}>({ contextKey: "", ids: [] });
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
	}, [
		fetchAccounts,
		fetchCategoryPreferences,
		fetchCustomCategories,
		fetchMerchants,
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
	const filters = useMemo<CashFlowFilters>(
		() => ({
			accountIds: readCsv(accountsParam),
			tags: readCsv(tagsParam),
			hidden,
		}),
		[accountsParam, hidden, tagsParam],
	);

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

	const resolvedGroup = useMemo(
		() =>
			findCashFlowCategoryGroupById(
				groupId,
				categoryGroups,
				customCategories,
				categoryPreferences,
			),
		[categoryGroups, categoryPreferences, customCategories, groupId],
	);

	useEffect(() => {
		if (!resolvedGroup || resolvedGroup.groupId === groupId) return;
		const query = searchParamsString ? `?${searchParamsString}` : "";
		router.replace(
			`/category-groups/${encodeURIComponent(resolvedGroup.groupId)}${query}`,
			{ scroll: false },
		);
	}, [groupId, resolvedGroup, router, searchParamsString]);

	const sourceGroupCategoryRecord = useMemo(() => {
		if (!resolvedGroup) return null;
		const normalizedSourceName = normalize(resolvedGroup.sourceName);
		return (
			customCategories.find(
				(c) =>
					normalize(c.name) === normalizedSourceName && !c.parent_name?.trim(),
			) ?? null
		);
	}, [customCategories, resolvedGroup]);

	const groupPreferenceKey = useMemo(() => {
		if (!resolvedGroup) return null;
		return getCategoryGroupPreferenceKey(
			resolvedGroup.sourceName,
			sourceGroupCategoryRecord?.id,
			resolvedGroup.groupRecord.is_system,
		);
	}, [resolvedGroup, sourceGroupCategoryRecord]);

	const groupDisplayName = resolvedGroup?.groupName || "Category group";

	const effectiveChildCategories = useMemo(() => {
		if (!resolvedGroup) return [];
		const normalizedGroupName = normalize(resolvedGroup.sourceName);
		return customCategories.filter((c) => {
			const effectiveParent =
				categoryPreferences[c.id]?.parentName?.trim() || c.parent_name?.trim();
			return normalize(effectiveParent) === normalizedGroupName;
		});
	}, [categoryPreferences, customCategories, resolvedGroup]);

	const groupTransactions = useMemo(() => {
		if (!resolvedGroup) return [];
		const childNames = new Set(
			effectiveChildCategories.map((c) => normalize(c.name)).filter(Boolean),
		);
		return transactions.filter((t) =>
			transactionMatchesGroup(t, resolvedGroup.sourceName, childNames),
		);
	}, [effectiveChildCategories, resolvedGroup, transactions]);

	const filteredGroupTransactions = useMemo(
		() =>
			groupTransactions.filter((t) =>
				transactionMatchesCashFlowFilters(t, filters),
			),
		[filters, groupTransactions],
	);

	const latestGroupDate = useMemo(
		() =>
			getLatestTransactionDate(filteredGroupTransactions) ??
			getLatestTransactionDate(groupTransactions) ??
			new Date(),
		[filteredGroupTransactions, groupTransactions],
	);
	const selectedDate =
		parseUtcDate(dateParam) ?? startOfPeriod(latestGroupDate, timeframe);

	const chartPeriods = useMemo(
		() =>
			buildGroupChartPeriods(
				filteredGroupTransactions,
				selectedDate,
				timeframe,
			),
		[filteredGroupTransactions, selectedDate, timeframe],
	);
	const selectedPeriod =
		chartPeriods.find(
			(p) => selectedDate >= p.start && selectedDate <= p.end,
		) ??
		[...chartPeriods].reverse().find((p) => p.amount > 0) ??
		chartPeriods[chartPeriods.length - 1];

	const periodTransactions = useMemo(() => {
		if (!selectedPeriod) return [];
		return filteredGroupTransactions.filter((t) => {
			const date = parseUtcDate(t.date);
			return Boolean(
				date && date >= selectedPeriod.start && date <= selectedPeriod.end,
			);
		});
	}, [filteredGroupTransactions, selectedPeriod]);

	const selectionContextKey = useMemo(() => {
		const accountKey = [...filters.accountIds].sort().join(",");
		const tagKey = [...filters.tags].sort().join(",");
		return [
			selectedPeriod?.key ?? "none",
			filters.hidden,
			accountKey,
			tagKey,
		].join("|");
	}, [filters.accountIds, filters.hidden, filters.tags, selectedPeriod?.key]);

	const selectedIds =
		selectionState.contextKey === selectionContextKey ? selectionState.ids : [];

	const setSelectedIds = useCallback(
		(nextValue: SetStateAction<string[]>) => {
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

	const categoryIdByName = useMemo(
		() => getCategoryIdMap(customCategories),
		[customCategories],
	);
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

	const handleTimeframeChange = (nextTimeframe: CashFlowTimeframe) => {
		const anchor = selectedPeriod?.start ?? selectedDate;
		updateUrl({
			timeframe: nextTimeframe,
			date: toDateParam(startOfPeriod(anchor, nextTimeframe)),
		});
	};

	const deleteTargetGroups = useMemo(
		() =>
			categoryGroups.filter(
				(g) => g.id !== resolvedGroup?.groupId && !g.hidden,
			),
		[categoryGroups, resolvedGroup?.groupId],
	);
	const selectedDeleteTarget = deleteTargetGroups.find(
		(g) => g.id === deleteTargetGroupId,
	);

	const handleSaveGroup = async (updates: CategoryGroupUpdate) => {
		if (!resolvedGroup || !groupPreferenceKey) return;
		const updated = await updateGroup(resolvedGroup.groupId, updates);
		await setGroupPreferences((current) => ({
			...current,
			[groupPreferenceKey]: {
				...(current[groupPreferenceKey] ?? {}),
				name: updated.name,
				budgetMode: updated.budget_mode,
				budgetType: updated.budget_type ?? undefined,
				monthlyRollover:
					updated.budget_mode === "group"
						? updated.monthly_rollover
						: undefined,
				hidden: updated.hidden,
			},
		}));
		setIsEditGroupOpen(false);
	};

	const openDeleteGroupDialog = () => {
		setDeleteError(null);
		setDeleteTargetGroupId("");
		setIsDeleteGroupOpen(true);
	};

	const handleConfirmDeleteGroup = async () => {
		if (!resolvedGroup || !groupPreferenceKey) return;
		if (effectiveChildCategories.length > 0 && !selectedDeleteTarget) {
			setDeleteError("Choose a destination group before deleting.");
			return;
		}
		setIsDeletingGroup(true);
		setDeleteError(null);
		try {
			if (selectedDeleteTarget) {
				const childCategoryIds = new Set(
					effectiveChildCategories.map((c) => c.id),
				);
				await setCategoryPreferences((current) => {
					const next = { ...current };
					for (const categoryId of childCategoryIds) {
						next[categoryId] = {
							...(next[categoryId] ?? {}),
							parentName: selectedDeleteTarget.source_name,
						};
					}
					return next;
				});
			}
			if (resolvedGroup.groupRecord.is_system) {
				await updateGroup(resolvedGroup.groupId, { hidden: true });
				await setGroupPreferences((current) => ({
					...current,
					[groupPreferenceKey]: {
						...(current[groupPreferenceKey] ?? {}),
						hidden: true,
					},
				}));
			} else {
				if (sourceGroupCategoryRecord && !sourceGroupCategoryRecord.is_system) {
					await deleteCustomCategory(sourceGroupCategoryRecord.id);
				}
				await removeGroup(resolvedGroup.groupId);
				await setGroupPreferences((current) => {
					const next = { ...current };
					delete next[groupPreferenceKey];
					return next;
				});
			}
			setIsDeleteGroupOpen(false);
			setIsEditGroupOpen(false);
			const redirectUrl = breadcrumb.href + "?breakdown=group&view=bar";
			router.push(redirectUrl);
		} catch (error) {
			setDeleteError(
				error instanceof Error ? error.message : "Failed to delete the group.",
			);
		} finally {
			setIsDeletingGroup(false);
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

	if (!resolvedGroup || !selectedPeriod || !groupPreferenceKey) {
		return (
			<div className="grid min-h-[70vh] place-items-center p-6 text-center">
				<div>
					<h1 className="text-2xl font-bold">Category group not found</h1>
					<p className="mt-2 text-gray-500 dark:text-gray-400">
						No category group exists with ID {groupId}.
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
					<span className="truncate">{groupDisplayName}</span>
				</nav>
				<div className="ml-auto flex flex-wrap items-center justify-end gap-3">
					<TimeframeTabs value={timeframe} onChange={handleTimeframeChange} />
					<button
						type="button"
						onClick={() => setIsEditGroupOpen(true)}
						className="flex h-11 items-center rounded-xl border border-gray-300 bg-white px-4 font-semibold transition-colors hover:bg-gray-50 dark:border-white/15 dark:bg-[#232322] dark:hover:bg-white/7"
					>
						Edit group
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

			<GroupTrendChart
				periods={chartPeriods}
				selectedKey={selectedPeriod.key}
				groupName={groupDisplayName}
				onSelect={(period) => updateUrl({ date: period.key })}
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
						columnOptions={GROUP_TABLE_COLUMNS}
						onEditMultiple={() => undefined}
					/>
					<div className="h-[490px] overflow-hidden">
						<DataTable
							transactions={periodTransactions}
							selectedIds={selectedIds}
							onSelectRow={handleSelectRow}
							onRowClick={(transaction: Transaction) =>
								router.push(
									`/transactions/${encodeURIComponent(transaction.id)}`,
								)
							}
							columnVisibility={columnVisibility}
							isEditMode={isTableEditMode}
							currentView="all"
							sorting={sorting}
							merchantItems={merchantItems}
							isCategoryView
							getCategoryId={getCategoryId}
							isMerchantNavigationEnabled
							navigationSource={(fromParam as NavigationSource) ?? undefined}
						/>
					</div>
				</section>

				<GroupTransactionSummary transactions={periodTransactions} />
			</div>

			{isEditGroupOpen && (
				<EditGroupModal
					group={resolvedGroup.groupRecord}
					childDialogOpen={isDeleteGroupOpen}
					onClose={() => setIsEditGroupOpen(false)}
					onSave={handleSaveGroup}
					onDelete={openDeleteGroupDialog}
				/>
			)}

			{isDeleteGroupOpen && (
				<ConfirmDialog
					title="Delete Group"
					description={
						<div className="space-y-6 text-base leading-7 text-gray-700 dark:text-gray-200">
							{effectiveChildCategories.length > 0 ? (
								<>
									<p>
										There {effectiveChildCategories.length === 1 ? "is" : "are"}{" "}
										{effectiveChildCategories.length}{" "}
										{effectiveChildCategories.length === 1
											? "category"
											: "categories"}{" "}
										nested in this group (listed below). Before you delete it,
										where should we move{" "}
										{effectiveChildCategories.length === 1 ? "it" : "them"} to?
									</p>
									<div className="space-y-2">
										{effectiveChildCategories.map((category) => (
											<div
												key={category.id}
												className="flex min-h-14 items-center gap-3 rounded-xl bg-gray-100 px-5 font-semibold dark:bg-[#181817]"
											>
												<CategoryIcon
													name={category.icon_name || category.name}
													size={20}
												/>
												<span>{category.name}</span>
											</div>
										))}
									</div>
									<div>
										<span className="mb-3 block text-sm font-bold">
											Move Categories to Group
										</span>
										<CategoryGroupSelect
											value={deleteTargetGroupId}
											groups={deleteTargetGroups}
											disabled={isDeletingGroup}
											onChange={(nextGroupId) => {
												setDeleteTargetGroupId(nextGroupId);
												setDeleteError(null);
											}}
										/>
									</div>
								</>
							) : (
								<p>Delete {groupDisplayName}? This action cannot be undone.</p>
							)}
							{deleteError && (
								<p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-500">
									{deleteError}
								</p>
							)}
						</div>
					}
					confirmLabel="Delete"
					confirmVariant="danger"
					isLoading={isDeletingGroup}
					confirmDisabled={
						effectiveChildCategories.length > 0 && !deleteTargetGroupId
					}
					autoFocusConfirm={false}
					showCloseButton
					panelClassName="max-w-[800px]"
					overlayClassName="z-[1700]"
					onCancel={() => {
						if (!isDeletingGroup) setIsDeleteGroupOpen(false);
					}}
					onConfirm={handleConfirmDeleteGroup}
				/>
			)}
		</div>
	);
}
