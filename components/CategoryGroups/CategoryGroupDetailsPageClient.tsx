"use client";

import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	type ChangeEvent,
	type KeyboardEvent as ReactKeyboardEvent,
	type MouseEvent as ReactMouseEvent,
	type SetStateAction,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
	useParams,
	usePathname,
	useRouter,
	useSearchParams,
} from "next/navigation";
import type { SortingState, VisibilityState } from "@tanstack/react-table";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
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
	type TooltipContentProps,
	type XAxisTickContentProps,
} from "recharts";
import type {
	NameType,
	ValueType,
} from "recharts/types/component/DefaultTooltipContent";
import {
	AlertCircle,
	Check,
	ChevronDown,
	ChevronRight,
	Loader2,
	Search,
	X,
} from "lucide-react";

import { CashFlowFilterMenu } from "@/components/CashFlow/CashFlowFilterMenu";
import { TimeframeTabs } from "@/components/CashFlow/CashFlowControls";
import {
	endOfPeriod,
	findCashFlowCategoryGroupById,
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
import { CategoryIcon } from "@/components/CategoryIcon";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useMerchantOptions } from "@/hooks/useMerchantOptions";
import { useCategoryGroups } from "@/hooks/useCategoryGroups";
import {
	type GroupBudgetMode,
	type GroupBudgetType,
	getCategoryGroupPreferenceKey,
} from "@/lib/categories/categoryPreferences";
import type {
	CategoryGroupRecord,
	CategoryGroupUpdate,
} from "@/lib/categories/categoryGroups";
import { getReportSummary } from "@/components/Reports/reportUtils";
import { findParentCategory } from "@/constants";
import { type Transaction, useBudgetStore } from "@/store/useBudgetStore";
import { compactCurrency, formatMoney } from "@/utils/formatters";

const DEFAULT_SORTING: SortingState = [{ id: "date", desc: true }];
const HIDDEN_MODES = ["visible", "hidden", "all"] as const;
const GROUP_TABLE_COLUMNS = [
	{ id: "merchant", label: "Merchant" },
	{ id: "category", label: "Category" },
	{ id: "account", label: "Account" },
	{ id: "amount", label: "Amount" },
] as const;

interface GroupChartPeriod {
	key: string;
	label: string;
	shortLabel: string;
	start: Date;
	end: Date;
	amount: number;
	year: number;
	showYearMarker: boolean;
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

function getGroupPeriodShortLabel(
	date: Date,
	timeframe: CashFlowTimeframe,
): string {
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

function buildGroupChartPeriods(
	transactions: Transaction[],
	selectedDate: Date,
	timeframe: CashFlowTimeframe,
): GroupChartPeriod[] {
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

	const periods: GroupChartPeriod[] = [];

	for (let index = 0; index < periodCount; index += 1) {
		const start = shiftPeriod(chartEnd, timeframe, index - periodCount + 1);
		const key = toDateParam(start);
		const previous = periods[periods.length - 1];
		const year = start.getUTCFullYear();

		periods.push({
			key,
			label: formatPeriodTitle(start, timeframe),
			shortLabel: getGroupPeriodShortLabel(start, timeframe),
			start,
			end: endOfPeriod(start, timeframe),
			amount: amountByKey.get(key) ?? 0,
			year,
			showYearMarker: !previous || previous.year !== year,
		});
	}

	return periods;
}

function transactionMatchesGroup(
	transaction: Transaction,
	groupName: string,
	childCategoryNames: ReadonlySet<string>,
): boolean {
	const categoryName = normalize(transaction.category);

	if (!categoryName) {
		return false;
	}

	if (childCategoryNames.has(categoryName)) {
		return true;
	}

	if (categoryName === normalize(groupName)) {
		return true;
	}

	return (
		normalize(findParentCategory(transaction.category)) === normalize(groupName)
	);
}

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

	const resolvedGroup = useMemo(() => {
		return findCashFlowCategoryGroupById(
			groupId,
			categoryGroups,
			customCategories,
			categoryPreferences,
		);
	}, [categoryGroups, categoryPreferences, customCategories, groupId]);

	useEffect(() => {
		if (!resolvedGroup || resolvedGroup.groupId === groupId) {
			return;
		}

		const query = searchParamsString ? `?${searchParamsString}` : "";
		router.replace(
			`/category-groups/${encodeURIComponent(resolvedGroup.groupId)}${query}`,
			{ scroll: false },
		);
	}, [groupId, resolvedGroup, router, searchParamsString]);

	const sourceGroupCategoryRecord = useMemo(() => {
		if (!resolvedGroup) {
			return null;
		}

		const normalizedSourceName = normalize(resolvedGroup.sourceName);

		return (
			customCategories.find((category) => {
				return (
					normalize(category.name) === normalizedSourceName &&
					!category.parent_name?.trim()
				);
			}) ?? null
		);
	}, [customCategories, resolvedGroup]);

	const groupPreferenceKey = useMemo(() => {
		if (!resolvedGroup) {
			return null;
		}

		return getCategoryGroupPreferenceKey(
			resolvedGroup.sourceName,
			sourceGroupCategoryRecord?.id,
			resolvedGroup.groupRecord.is_system,
		);
	}, [resolvedGroup, sourceGroupCategoryRecord]);

	const groupDisplayName = resolvedGroup?.groupName || "Category group";

	const effectiveChildCategories = useMemo(() => {
		if (!resolvedGroup) {
			return [];
		}

		const normalizedGroupName = normalize(resolvedGroup.sourceName);

		return customCategories.filter((category) => {
			const effectiveParent =
				categoryPreferences[category.id]?.parentName?.trim() ||
				category.parent_name?.trim();

			return normalize(effectiveParent) === normalizedGroupName;
		});
	}, [categoryPreferences, customCategories, resolvedGroup]);

	const groupTransactions = useMemo(() => {
		if (!resolvedGroup) {
			return [];
		}

		const childNames = new Set(
			effectiveChildCategories
				.map((category) => normalize(category.name))
				.filter(Boolean),
		);

		return transactions.filter((transaction) => {
			return transactionMatchesGroup(
				transaction,
				resolvedGroup.sourceName,
				childNames,
			);
		});
	}, [effectiveChildCategories, resolvedGroup, transactions]);

	const filteredGroupTransactions = useMemo(() => {
		return groupTransactions.filter((transaction) => {
			return transactionMatchesCashFlowFilters(transaction, filters);
		});
	}, [filters, groupTransactions]);

	const latestGroupDate = useMemo(() => {
		return (
			getLatestTransactionDate(filteredGroupTransactions) ??
			getLatestTransactionDate(groupTransactions) ??
			new Date()
		);
	}, [filteredGroupTransactions, groupTransactions]);
	const selectedDate =
		parseUtcDate(dateParam) ?? startOfPeriod(latestGroupDate, timeframe);

	const chartPeriods = useMemo(() => {
		return buildGroupChartPeriods(
			filteredGroupTransactions,
			selectedDate,
			timeframe,
		);
	}, [filteredGroupTransactions, selectedDate, timeframe]);
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

		return filteredGroupTransactions.filter((transaction) => {
			const date = parseUtcDate(transaction.date);

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
		return getCategoryIdMap(customCategories);
	}, [customCategories]);
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

	const deleteTargetGroups = useMemo(() => {
		return categoryGroups.filter((group) => {
			return group.id !== resolvedGroup?.groupId && !group.hidden;
		});
	}, [categoryGroups, resolvedGroup?.groupId]);

	const selectedDeleteTarget = deleteTargetGroups.find((group) => {
		return group.id === deleteTargetGroupId;
	});

	const handleSaveGroup = async (
		updates: CategoryGroupUpdate,
	): Promise<void> => {
		if (!resolvedGroup || !groupPreferenceKey) {
			return;
		}

		const updated = await updateGroup(resolvedGroup.groupId, updates);

		await setGroupPreferences((current) => {
			return {
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
			};
		});

		setIsEditGroupOpen(false);
	};

	const openDeleteGroupDialog = (): void => {
		setDeleteError(null);
		setDeleteTargetGroupId("");
		setIsDeleteGroupOpen(true);
	};

	const handleConfirmDeleteGroup = async (): Promise<void> => {
		if (!resolvedGroup || !groupPreferenceKey) {
			return;
		}

		if (effectiveChildCategories.length > 0 && !selectedDeleteTarget) {
			setDeleteError("Choose a destination group before deleting.");
			return;
		}

		setIsDeletingGroup(true);
		setDeleteError(null);

		try {
			if (selectedDeleteTarget) {
				const childCategoryIds = new Set(
					effectiveChildCategories.map((category) => category.id),
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
				await setGroupPreferences((current) => {
					return {
						...current,
						[groupPreferenceKey]: {
							...(current[groupPreferenceKey] ?? {}),
							hidden: true,
						},
					};
				});
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
			router.push("/cash-flow?breakdown=group&view=bar");
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
						href="/cash-flow?breakdown=group&view=bar"
						className="mt-5 inline-flex rounded-xl bg-[#FF6633] px-4 py-2.5 font-semibold text-white"
					>
						Back to Cash Flow
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
						href="/cash-flow?breakdown=group&view=bar"
						className="text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
					>
						Cash Flow
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
						visibleTransactionIds={periodTransactions.map((transaction) => {
							return transaction.id;
						})}
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
							isCategoryView
							getCategoryId={getCategoryId}
							isMerchantNavigationEnabled
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
										{effectiveChildCategories.map((category) => {
											return (
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
											);
										})}
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
						if (!isDeletingGroup) {
							setIsDeleteGroupOpen(false);
						}
					}}
					onConfirm={handleConfirmDeleteGroup}
				/>
			)}
		</div>
	);
}

function GroupTrendChart({
	periods,
	selectedKey,
	groupName,
	onSelect,
}: {
	periods: GroupChartPeriod[];
	selectedKey: string;
	groupName: string;
	onSelect: (period: GroupChartPeriod) => void;
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
						tickFormatter={(value: number | string) =>
							compactCurrency(Number(value))
						}
						width={64}
					/>
					<Tooltip
						cursor={{ fill: "rgba(255,255,255,0.035)" }}
						content={(props: TooltipContentProps<ValueType, NameType>) => {
							return <GroupTrendTooltip {...props} groupName={groupName} />;
						}}
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
									style={{ transition: "fill-opacity 150ms ease" }}
								/>
							);
						})}
					</Bar>
				</BarChart>
			</ResponsiveContainer>
		</section>
	);
}

function GroupTrendTooltip({
	active,
	payload,
	groupName,
}: TooltipContentProps<ValueType, NameType> & { groupName: string }) {
	const period = payload?.[0]?.payload as GroupChartPeriod | undefined;

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
				<span className="font-semibold">{groupName}:</span>
				<span className="ml-auto font-bold">{formatMoney(period.amount)}</span>
			</div>
		</div>
	);
}

function GroupTransactionSummary({
	transactions,
}: {
	transactions: Transaction[];
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
			new Blob([csv], { type: "text/csv;charset=utf-8" }),
		);
		const anchor = document.createElement("a");
		anchor.href = url;
		anchor.download = "category-group-transactions.csv";
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

function EditGroupModal({
	group,
	childDialogOpen,
	onClose,
	onSave,
	onDelete,
}: {
	group: CategoryGroupRecord;
	childDialogOpen: boolean;
	onClose: () => void;
	onSave: (updates: CategoryGroupUpdate) => Promise<void>;
	onDelete: () => void;
}) {
	const initialBudgetMode = group.budget_mode;
	const initialBudgetType = group.budget_type ?? "flexible";
	const initialMonthlyRollover = group.monthly_rollover;
	const [name, setName] = useState(group.name);
	const [budgetMode, setBudgetMode] =
		useState<GroupBudgetMode>(initialBudgetMode);
	const [budgetType, setBudgetType] =
		useState<GroupBudgetType>(initialBudgetType);
	const [monthlyRollover, setMonthlyRollover] = useState(
		initialMonthlyRollover,
	);
	const [isSaving, setIsSaving] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent): void => {
			if (event.key === "Escape" && !isSaving && !childDialogOpen) {
				onClose();
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [childDialogOpen, isSaving, onClose]);

	const hasChanges =
		name.trim() !== group.name.trim() ||
		budgetMode !== initialBudgetMode ||
		(budgetMode === "group" &&
			(budgetType !== initialBudgetType ||
				monthlyRollover !== initialMonthlyRollover));
	const canSave = Boolean(name.trim()) && hasChanges && !isSaving;

	const save = async (): Promise<void> => {
		if (!canSave) {
			return;
		}

		setIsSaving(true);
		setErrorMessage(null);

		try {
			await onSave({
				name: name.trim(),
				budget_mode: budgetMode,
				budget_type: budgetMode === "group" ? budgetType : null,
				monthly_rollover: budgetMode === "group" ? monthlyRollover : false,
				hidden: false,
			});
		} catch (error) {
			setErrorMessage(
				error instanceof Error ? error.message : "Failed to save group.",
			);
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<div className="fixed inset-0 z-[1000] grid place-items-center overflow-y-auto bg-black/55 p-3 backdrop-blur-sm sm:p-5">
			<button
				type="button"
				aria-label="Close edit group dialog"
				className="absolute inset-0"
				onClick={() => {
					if (!isSaving) {
						onClose();
					}
				}}
			/>

			<section
				role="dialog"
				aria-modal="true"
				aria-hidden={childDialogOpen || undefined}
				aria-labelledby="edit-group-title"
				className="relative my-auto flex max-h-[calc(100dvh-24px)] w-full max-w-[790px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_30px_100px_rgba(0,0,0,0.42)] dark:border-white/10 dark:bg-[#232322]"
			>
				<header className="flex shrink-0 items-center justify-between border-b border-gray-200 px-6 py-5 dark:border-white/5">
					<h2 id="edit-group-title" className="text-2xl font-bold">
						Edit Group
					</h2>
					<button
						type="button"
						onClick={onClose}
						disabled={isSaving}
						aria-label="Close"
						className="grid size-10 place-items-center rounded-full transition-colors hover:bg-gray-100 disabled:opacity-50 dark:hover:bg-white/7"
					>
						<X size={27} />
					</button>
				</header>

				<div className="min-h-0 flex-1 space-y-7 overflow-y-auto px-6 py-7">
					<label className="block">
						<span className="mb-3 block text-lg font-bold">Name</span>
						<input
							autoFocus
							value={name}
							onChange={(event: ChangeEvent<HTMLInputElement>) => {
								setName(event.target.value);
							}}
							className="h-14 w-full rounded-xl border border-gray-300 bg-transparent px-4 text-lg font-semibold outline-none transition-colors focus:border-cyan-500 dark:border-white/15"
						/>
					</label>

					<div>
						<span className="mb-3 block text-lg font-bold">Budget</span>
						<BudgetModeSelect value={budgetMode} onChange={setBudgetMode} />
						<p className="mt-3 text-base text-gray-500 dark:text-gray-400">
							{budgetMode === "group"
								? "Budget with a single number for all categories within this group."
								: "Budget by individual categories within this group."}
						</p>
					</div>

					{budgetMode === "group" && (
						<>
							<div>
								<span className="mb-3 block text-lg font-bold">Type</span>
								<div className="overflow-hidden rounded-2xl border border-gray-300 dark:border-white/15">
									<BudgetTypeOption
										value="fixed"
										selected={budgetType === "fixed"}
										title="Fixed"
										description="Spending is usually the same every month, and cannot be easily reduced. Great for utilities, mortgage, bills, etc."
										onSelect={setBudgetType}
									/>
									<BudgetTypeOption
										value="flexible"
										selected={budgetType === "flexible"}
										title="Flexible"
										description="Spending changes monthly, and can be reduced when you want to save more money. Great for restaurants, entertainment, etc."
										onSelect={setBudgetType}
									/>
									<BudgetTypeOption
										value="non-monthly"
										selected={budgetType === "non-monthly"}
										title="Non-Monthly"
										description="Spending typically happens yearly, or less frequently than monthly. Great for annual bills, quarterly payments, etc."
										onSelect={setBudgetType}
									/>
								</div>
							</div>

							<div className="flex items-center gap-5 rounded-2xl border border-gray-300 p-5 dark:border-white/15">
								<div className="min-w-0 flex-1">
									<h3 className="text-base font-bold">
										Make this category group a monthly rollover
									</h3>
									<p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
										Every month the remaining balance will roll over to the next
										month.{" "}
										<span className="font-semibold text-cyan-500">
											Learn more
										</span>
									</p>
								</div>
								<button
									type="button"
									role="switch"
									aria-checked={monthlyRollover}
									onClick={() => {
										setMonthlyRollover((current) => !current);
									}}
									className={`inline-flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition-colors ${
										monthlyRollover
											? "bg-[#FF6633]"
											: "bg-gray-400 dark:bg-zinc-600"
									}`}
								>
									<span
										className={`size-5 rounded-full bg-white shadow-sm transition-transform ${
											monthlyRollover ? "translate-x-5" : "translate-x-0"
										}`}
									/>
								</button>
							</div>
						</>
					)}

					{errorMessage && (
						<div className="flex items-start gap-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
							<AlertCircle size={18} className="mt-0.5 shrink-0" />
							<span>{errorMessage}</span>
						</div>
					)}
				</div>

				<footer className="flex shrink-0 items-center justify-between gap-4 border-t border-gray-200 px-6 py-5 dark:border-white/5">
					<button
						type="button"
						onClick={onDelete}
						disabled={isSaving}
						className="h-12 rounded-xl border border-gray-300 px-4 font-bold text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50 dark:border-white/15"
					>
						Delete
					</button>
					<div className="flex items-center gap-3">
						<button
							type="button"
							onClick={onClose}
							disabled={isSaving}
							className="h-12 rounded-xl border border-gray-300 px-5 font-bold transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-white/15 dark:hover:bg-white/7"
						>
							Cancel
						</button>
						<button
							type="button"
							onClick={() => void save()}
							disabled={!canSave}
							className="inline-flex h-12 min-w-24 items-center justify-center gap-2 rounded-xl bg-[#FF6633] px-5 font-bold text-white transition-colors hover:bg-[#E95424] disabled:cursor-not-allowed disabled:opacity-45"
						>
							{isSaving && <Loader2 size={18} className="animate-spin" />}
							Save
						</button>
					</div>
				</footer>
			</section>
		</div>
	);
}

function CategoryGroupSelect({
	value,
	groups,
	disabled,
	onChange,
}: {
	value: string;
	groups: CategoryGroupRecord[];
	disabled: boolean;
	onChange: (value: string) => void;
}) {
	const triggerRef = useRef<HTMLButtonElement | null>(null);
	const menuRef = useRef<HTMLDivElement | null>(null);
	const [isOpen, setIsOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [menuPosition, setMenuPosition] = useState<{
		top: number;
		left: number;
		width: number;
		maxHeight: number;
	} | null>(null);

	const selectedGroup = groups.find((group) => group.id === value);
	const normalizedSearch = normalize(searchQuery);
	const filteredGroups = normalizedSearch
		? groups.filter((group) => {
				return (
					normalize(group.name).includes(normalizedSearch) ||
					normalize(group.source_name).includes(normalizedSearch)
				);
			})
		: groups;

	const incomeGroups = filteredGroups.filter((group) => {
		return group.section_id === "income";
	});
	const expenseGroups = filteredGroups.filter((group) => {
		return group.section_id === "expenses";
	});
	const transferGroups = filteredGroups.filter((group) => {
		return group.section_id === "transfers";
	});

	const calculateMenuPosition = useCallback(() => {
		const trigger = triggerRef.current;

		if (!trigger || typeof window === "undefined") {
			return null;
		}

		const bounds = trigger.getBoundingClientRect();
		const viewportPadding = 16;
		const gap = 10;
		const minimumHeight = 220;
		const preferredHeight = 500;
		const spaceBelow =
			window.innerHeight - bounds.bottom - gap - viewportPadding;
		const spaceAbove = bounds.top - gap - viewportPadding;
		const openAbove = spaceBelow < minimumHeight && spaceAbove > spaceBelow;
		const availableHeight = Math.max(
			minimumHeight,
			openAbove ? spaceAbove : spaceBelow,
		);
		const maxHeight = Math.min(preferredHeight, availableHeight);
		const width = Math.min(
			bounds.width,
			window.innerWidth - viewportPadding * 2,
		);
		const left = Math.min(
			Math.max(viewportPadding, bounds.left),
			window.innerWidth - viewportPadding - width,
		);
		const top = openAbove
			? Math.max(viewportPadding, bounds.top - gap - maxHeight)
			: Math.min(
					bounds.bottom + gap,
					window.innerHeight - viewportPadding - maxHeight,
				);

		return { top, left, width, maxHeight };
	}, []);

	const closeMenu = useCallback(() => {
		setIsOpen(false);
		setSearchQuery("");
	}, []);

	const openMenu = useCallback(() => {
		const nextPosition = calculateMenuPosition();

		if (!nextPosition) {
			return;
		}

		setMenuPosition(nextPosition);
		setSearchQuery("");
		setIsOpen(true);
	}, [calculateMenuPosition]);

	useEffect(() => {
		if (!isOpen) {
			return;
		}

		const updatePosition = (): void => {
			const nextPosition = calculateMenuPosition();

			if (nextPosition) {
				setMenuPosition(nextPosition);
			}
		};

		const handlePointerDown = (event: PointerEvent): void => {
			const target = event.target;

			if (!(target instanceof Node)) {
				return;
			}

			if (
				triggerRef.current?.contains(target) ||
				menuRef.current?.contains(target)
			) {
				return;
			}

			closeMenu();
		};

		const handleKeyDown = (event: KeyboardEvent): void => {
			if (event.key === "Escape") {
				event.preventDefault();
				event.stopPropagation();
				closeMenu();
				triggerRef.current?.focus();
			}
		};

		window.addEventListener("resize", updatePosition);
		window.addEventListener("scroll", updatePosition, true);
		document.addEventListener("pointerdown", handlePointerDown);
		document.addEventListener("keydown", handleKeyDown, true);

		return () => {
			window.removeEventListener("resize", updatePosition);
			window.removeEventListener("scroll", updatePosition, true);
			document.removeEventListener("pointerdown", handlePointerDown);
			document.removeEventListener("keydown", handleKeyDown, true);
		};
	}, [calculateMenuPosition, closeMenu, isOpen]);

	const selectGroup = (nextValue: string): void => {
		onChange(nextValue);
		closeMenu();
		triggerRef.current?.focus();
	};

	return (
		<div className="relative">
			<button
				ref={triggerRef}
				type="button"
				disabled={disabled || groups.length === 0}
				aria-haspopup="listbox"
				aria-expanded={isOpen}
				onClick={() => {
					if (isOpen) {
						closeMenu();
					} else {
						openMenu();
					}
				}}
				onKeyDown={(event: ReactKeyboardEvent<HTMLButtonElement>) => {
					if ((event.key === "ArrowDown" || event.key === "Enter") && !isOpen) {
						event.preventDefault();
						openMenu();
					}
				}}
				className={`flex h-14 w-full items-center justify-between rounded-xl border bg-transparent px-4 text-left text-base font-medium outline-none transition dark:bg-[#232322] ${
					isOpen
						? "border-cyan-500 ring-2 ring-cyan-500/15"
						: "border-gray-300 dark:border-white/15"
				} ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
			>
				<span
					className={`min-w-0 truncate ${
						selectedGroup ? "" : "text-gray-500 dark:text-gray-400"
					}`}
				>
					{selectedGroup?.name ?? "Select..."}
				</span>
				<ChevronDown
					size={19}
					className={`shrink-0 transition-transform ${
						isOpen ? "rotate-180" : ""
					}`}
				/>
			</button>

			{isOpen &&
				!disabled &&
				menuPosition &&
				typeof document !== "undefined" &&
				createPortal(
					<div
						ref={menuRef}
						className="fixed z-[1900] flex overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_24px_70px_rgba(0,0,0,0.34)] dark:border-white/15 dark:bg-[#2a2a28]"
						style={{
							top: menuPosition.top,
							left: menuPosition.left,
							width: menuPosition.width,
							maxHeight: menuPosition.maxHeight,
						}}
					>
						<div className="flex min-h-0 w-full flex-col">
							<div className="shrink-0 border-b border-gray-200 p-3 dark:border-white/10">
								<label className="flex h-11 items-center gap-3 rounded-xl border border-gray-300 bg-gray-50 px-3 focus-within:border-cyan-500 focus-within:ring-2 focus-within:ring-cyan-500/15 dark:border-white/15 dark:bg-[#20201f]">
									<Search
										size={18}
										className="shrink-0 text-gray-500 dark:text-gray-400"
									/>
									<input
										autoFocus
										value={searchQuery}
										onChange={(event: ChangeEvent<HTMLInputElement>) => {
											setSearchQuery(event.target.value);
										}}
										placeholder="Search groups"
										className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-gray-500 dark:text-white"
									/>
								</label>
							</div>

							<div
								role="listbox"
								className="min-h-0 flex-1 overflow-y-auto py-2"
							>
								{filteredGroups.length > 0 ? (
									<>
										<CategoryGroupOptionSection
											label="Income"
											groups={incomeGroups}
											value={value}
											onChange={selectGroup}
										/>
										<CategoryGroupOptionSection
											label="Expenses"
											groups={expenseGroups}
											value={value}
											onChange={selectGroup}
										/>
										<CategoryGroupOptionSection
											label="Transfers"
											groups={transferGroups}
											value={value}
											onChange={selectGroup}
										/>
									</>
								) : (
									<div className="px-5 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
										No groups match “{searchQuery.trim()}”.
									</div>
								)}
							</div>
						</div>
					</div>,
					document.body,
				)}
		</div>
	);
}

function CategoryGroupOptionSection({
	label,
	groups,
	value,
	onChange,
}: {
	label: string;
	groups: CategoryGroupRecord[];
	value: string;
	onChange: (value: string) => void;
}) {
	if (groups.length === 0) {
		return null;
	}

	return (
		<div className="px-2">
			<div className="px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] text-gray-500 dark:text-gray-400">
				{label}
			</div>
			{groups.map((group) => {
				const selected = group.id === value;

				return (
					<button
						key={group.id}
						type="button"
						role="option"
						aria-selected={selected}
						onClick={() => onChange(group.id)}
						className={`flex min-h-12 w-full items-center justify-between rounded-xl px-4 text-left text-sm font-semibold transition ${
							selected
								? "bg-cyan-50 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300"
								: "hover:bg-gray-50 dark:hover:bg-white/5"
						}`}
					>
						<span className="min-w-0 truncate">{group.name}</span>
						{selected && <Check size={18} className="shrink-0" />}
					</button>
				);
			})}
		</div>
	);
}

function BudgetModeSelect({
	value,
	onChange,
}: {
	value: GroupBudgetMode;
	onChange: (value: GroupBudgetMode) => void;
}) {
	const label = value === "group" ? "By group" : "By category";
	const options: ReadonlyArray<{
		value: GroupBudgetMode;
		label: string;
	}> = [
		{ value: "category", label: "By category" },
		{ value: "group", label: "By group" },
	];

	return (
		<DropdownMenu.Root modal={false}>
			<DropdownMenu.Trigger asChild>
				<button
					type="button"
					className="flex h-14 w-full items-center justify-between rounded-xl border border-gray-300 bg-transparent px-4 text-left text-lg font-semibold outline-none transition-colors focus:border-cyan-500 data-[state=open]:border-cyan-500 data-[state=open]:ring-2 data-[state=open]:ring-cyan-500/15 dark:border-white/15"
				>
					<span>{label}</span>
					<ChevronDown
						size={20}
						className="transition-transform data-[state=open]:rotate-180"
					/>
				</button>
			</DropdownMenu.Trigger>

			<DropdownMenu.Portal>
				<DropdownMenu.Content
					align="start"
					side="bottom"
					sideOffset={8}
					collisionPadding={16}
					className="z-[1300] w-[var(--radix-dropdown-menu-trigger-width)] rounded-xl border border-gray-200 bg-white p-2 shadow-2xl outline-none dark:border-white/10 dark:bg-[#2a2a28]"
				>
					{options.map((option) => {
						const selected = option.value === value;

						return (
							<DropdownMenu.Item
								key={option.value}
								onSelect={() => onChange(option.value)}
								className={`flex h-12 cursor-pointer items-center rounded-lg px-4 font-semibold outline-none transition-colors ${
									selected
										? "bg-cyan-50 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300"
										: "data-[highlighted]:bg-gray-50 dark:data-[highlighted]:bg-white/7"
								}`}
							>
								<span>{option.label}</span>
								{selected && <Check size={18} className="ml-auto" />}
							</DropdownMenu.Item>
						);
					})}
				</DropdownMenu.Content>
			</DropdownMenu.Portal>
		</DropdownMenu.Root>
	);
}

function BudgetTypeOption({
	value,
	selected,
	title,
	description,
	onSelect,
}: {
	value: GroupBudgetType;
	selected: boolean;
	title: string;
	description: string;
	onSelect: (value: GroupBudgetType) => void;
}) {
	return (
		<button
			type="button"
			role="radio"
			aria-checked={selected}
			onClick={() => onSelect(value)}
			className="flex w-full items-start gap-4 border-b border-gray-200 p-5 text-left last:border-b-0 hover:bg-gray-50 dark:border-white/5 dark:hover:bg-white/[0.035]"
		>
			<span
				className={`mt-1 grid size-7 shrink-0 place-items-center rounded-full border ${
					selected ? "border-[#FF6633] bg-[#FF6633]" : "border-gray-400"
				}`}
			>
				{selected && <span className="size-2.5 rounded-full bg-[#232322]" />}
			</span>
			<span>
				<span className="block text-lg font-bold">{title}</span>
				<span className="mt-1 block text-base leading-7 text-gray-600 dark:text-gray-300">
					{description}
				</span>
			</span>
		</button>
	);
}
