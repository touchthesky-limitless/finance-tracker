"use client";
"use no memo";

import {
	useCallback,
	useMemo,
	useRef,
	type MouseEvent as ReactMouseEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
	createColumnHelper,
	flexRender,
	getCoreRowModel,
	getSortedRowModel,
	useReactTable,
	type Row,
	type SortingState,
	type VisibilityState,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowRight, Check, ChevronDown, ChevronRight } from "lucide-react";

import { CategorySelector } from "@/components/CategorySelector";
import { Transaction } from "@/store/useBudgetStore";
import { formatCurrency } from "@/utils/formatters";
import {
	getTransactionMerchantId,
	useUnifiedMerchants,
} from "@/hooks/useUnifiedMerchants";

interface DataTableProps {
	transactions: Transaction[];
	selectedIds: string[];

	onSelectRow: (id: string, event: ReactMouseEvent) => void;

	onRowClick: (transaction: Transaction) => void;

	columnVisibility: VisibilityState;
	isEditMode: boolean;
	currentView: "all" | "review";

	onMarkReviewed?: (id: string) => void;

	sorting: SortingState;

	onCategoryChange?: (id: string, newCategory: string) => void;

	isCategoryView?: boolean;

	getCategoryId?: (categoryName: string) => string | undefined;

	isMerchantNavigationEnabled?: boolean;

	getMerchantId?: (merchantName: string) => string | undefined;
}

type DateHeaderItem = {
	type: "header";
	id: string;
	date: string;
	total: number;
};

type TransactionRowItem = {
	type: "row";
	id: string;
	row: Row<Transaction>;
};

type FlatItem = DateHeaderItem | TransactionRowItem;

type ActiveHeader = {
	item: DateHeaderItem;
	translateY: number;
} | null;

const DATE_HEADER_HEIGHT = 48;
const TRANSACTION_ROW_HEIGHT = 56;
const VIRTUAL_OVERSCAN = 8;

const dateFormatter = new Intl.DateTimeFormat("en-US", {
	month: "long",
	day: "numeric",
	year: "numeric",
	timeZone: "UTC",
});

const columnHelper = createColumnHelper<Transaction>();

function getDateInfo(dateValue: string): {
	key: string;
	label: string;
	timestamp: number;
} {
	const parsedDate = new Date(dateValue);

	if (Number.isNaN(parsedDate.getTime())) {
		return {
			key: "unknown-date",
			label: "Unknown date",
			timestamp: Number.NEGATIVE_INFINITY,
		};
	}

	const year = parsedDate.getUTCFullYear();

	const month = parsedDate.getUTCMonth();

	const day = parsedDate.getUTCDate();

	const timestamp = Date.UTC(year, month, day);

	const monthValue = String(month + 1).padStart(2, "0");

	const dayValue = String(day).padStart(2, "0");

	return {
		key: `${year}-${monthValue}-${dayValue}`,
		label: dateFormatter.format(new Date(timestamp)),
		timestamp,
	};
}

export function DataTable({
	transactions,
	selectedIds,
	onSelectRow,
	onRowClick,
	columnVisibility,
	isEditMode,
	currentView,
	onMarkReviewed,
	sorting,
	onCategoryChange,
	isCategoryView = true,
	getCategoryId,
	isMerchantNavigationEnabled = true,
	getMerchantId: getMerchantIdOverride,
}: DataTableProps) {
	const parentRef = useRef<HTMLDivElement>(null);

	const router = useRouter();

	const selectedIdSet = useMemo(() => {
		return new Set(selectedIds);
	}, [selectedIds]);

	const { getMerchantId: getUnifiedMerchantId } = useUnifiedMerchants();

	const resolveMerchantId = getMerchantIdOverride ?? getUnifiedMerchantId;

	const navigateToCategory = useCallback(
		(categoryName: string, targetId: string | undefined) => {
			if (!targetId) {
				console.error(`No subcategory ID found for "${categoryName}"`);

				return;
			}

			const currentYear = new Date().getFullYear();

			const params = new URLSearchParams({
				breakdown: "category",
				categories: targetId,
				date: `${currentYear}-01-01`,
				order: "inverse_date",
				sankey: "category",
				timeframe: "year",
				view: "breakdown",
			});

			router.push(
				`/categories/${encodeURIComponent(targetId)}?${params.toString()}`,
			);
		},
		[router],
	);

	const columns = useMemo(() => {
		return [
			columnHelper.accessor("date", {
				id: "date",
			}),

			columnHelper.display({
				id: "select",
				size: 40,

				cell: (info) => {
					const transactionId = info.row.original.id;

					const isSelected = selectedIdSet.has(transactionId);

					if (currentView === "review" && !isEditMode) {
						return (
							<div className="flex items-center justify-center w-full h-full">
								<button
									type="button"
									onClick={(event) => {
										event.stopPropagation();

										onMarkReviewed?.(transactionId);
									}}
									disabled={!onMarkReviewed}
									aria-label="Mark transaction as reviewed"
									className="group w-5 h-5 rounded-full border border-gray-300 dark:border-gray-500 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-white disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
								>
									<Check
										size={12}
										strokeWidth={3}
										aria-hidden="true"
										className="opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
									/>
								</button>
							</div>
						);
					}

					if (isEditMode) {
						return (
							<div className="flex items-center justify-center w-full h-full">
								<button
									type="button"
									onClick={(event) => {
										event.stopPropagation();

										onSelectRow(transactionId, event);
									}}
									aria-label={
										isSelected ? "Deselect transaction" : "Select transaction"
									}
									aria-pressed={isSelected}
									className={`w-5 h-5 rounded-sm border-2 flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
										isSelected
											? "bg-[#FF5A35] border-[#FF5A35]"
											: "border-gray-300 dark:border-gray-600"
									}`}
								>
									<Check
										size={14}
										aria-hidden="true"
										className={isSelected ? "text-white" : "text-transparent"}
									/>
								</button>
							</div>
						);
					}

					return null;
				},
			}),

			columnHelper.accessor("merchant", {
				size: 360,

				cell: (info) => {
					const merchantName = String(info.getValue() || "Unknown merchant");

					const merchantId =
						getTransactionMerchantId(info.row.original) ??
						resolveMerchantId(merchantName);

					const canNavigate = Boolean(merchantId);

					const initial = merchantName.charAt(0).toUpperCase() || "?";

					const handleMerchantClick = () => {
						if (!merchantId) {
							return;
						}

						router.push(`/merchants/${encodeURIComponent(merchantId)}`);
					};

					return (
						<div
							onClick={(event) => {
								event.stopPropagation();
							}}
							className="group flex h-full w-full items-center gap-1.5 pr-2"
						>
							<div className="min-w-0 flex-1">
								<button
	type="button"
	onClick={(event) => {
		event.stopPropagation();
		onRowClick(info.row.original);
	}}
									aria-label={`Open ${merchantName} merchant`}
									className={`
							flex h-10 w-full min-w-0 items-center
							gap-3 rounded-xl border border-transparent
							px-3 text-left transition-all

							group-hover:border-gray-300
							group-hover:bg-gray-50

							dark:group-hover:border-white/20
							dark:group-hover:bg-white/5

							focus-visible:border-gray-300
							focus-visible:outline-none
							focus-visible:ring-2
							focus-visible:ring-orange-500/30

						
						`}
								>
									<div
										aria-hidden="true"
										className="
								flex h-7 w-7 shrink-0 items-center
								justify-center rounded-full
								bg-gray-100 text-sm font-black
								text-[#FF5A35]
								dark:bg-white
							"
									>
										{initial}
									</div>

									<span
										title={merchantName}
										className="
								min-w-0 flex-1 truncate
								text-[15px] font-medium
								text-gray-900 dark:text-white
							"
									>
										{merchantName}
									</span>

									<ChevronDown
										size={16}
										strokeWidth={2}
										aria-hidden="true"
										className="
		shrink-0
		text-gray-500
		opacity-0
		transition-all
		group-hover:opacity-100
		group-focus-within:opacity-100
		dark:text-gray-400
	"
									/>
								</button>
							</div>

							{isMerchantNavigationEnabled && (
								<button
									type="button"
									disabled={!canNavigate}
									onClick={(event) => {
										event.stopPropagation();
										handleMerchantClick();
									}}
									aria-label={`View ${merchantName} merchant`}
									title={
										canNavigate
											? "View merchant"
											: `Merchant ID unavailable for ${merchantName}`
									}
									className={`
							flex h-8 w-8 shrink-0 items-center
							justify-center rounded-lg
							border border-transparent
							opacity-0 transition-all

							group-hover:opacity-100
							group-focus-within:opacity-100
							focus-visible:opacity-100

							group-hover:border-gray-300
							dark:group-hover:border-white/20

							hover:bg-gray-100
							dark:hover:bg-white/5

							${canNavigate ? "cursor-pointer" : "cursor-not-allowed"}
						`}
								>
									<ArrowRight
										size={16}
										strokeWidth={2}
										aria-hidden="true"
										className={
											canNavigate
												? "text-gray-600 dark:text-gray-400"
												: "text-gray-300 dark:text-gray-600"
										}
									/>
								</button>
							)}
						</div>
					);
				},
			}),

			columnHelper.accessor("category", {
				size: 360,

				cell: (info) => {
					const categoryName = String(info.getValue() || "Uncategorized");

					const targetId = getCategoryId?.(categoryName);

					return (
						<div
							onClick={(event) => {
								event.stopPropagation();
							}}
							className="group flex items-center gap-1.5 w-full h-full pr-2"
						>
							<div className="flex-1 min-w-0">
								<CategorySelector
									currentCategory={categoryName}
									variant="form"
									showChevron
									hideChevronUntilHover
									onSelect={(newCategory) => {
										if (newCategory === categoryName) {
											return;
										}

										onCategoryChange?.(info.row.original.id, newCategory);
									}}
								/>
							</div>

							{isCategoryView && (
								<button
									type="button"
									onClick={(event) => {
										event.stopPropagation();

										navigateToCategory(categoryName, targetId);
									}}
									aria-disabled={!targetId}
									aria-label={`View ${categoryName} category`}
									title={
										targetId
											? "View Category"
											: `Category ID unavailable for ${categoryName}`
									}
									className={`flex items-center justify-center w-8 h-8 rounded-lg border border-transparent opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 group-hover:border-gray-300 dark:group-hover:border-white/20 hover:bg-gray-100 dark:hover:bg-white/5 transition-all shrink-0 ${
										targetId ? "cursor-pointer" : "cursor-not-allowed"
									}`}
								>
									<ArrowRight
										size={16}
										strokeWidth={2}
										aria-hidden="true"
										className={
											targetId
												? "text-gray-600 dark:text-gray-400"
												: "text-gray-300 dark:text-gray-600"
										}
									/>
								</button>
							)}
						</div>
					);
				},
			}),

			columnHelper.accessor("account", {
				size: 300,

				cell: (info) => {
					const transaction = info.row.original;

					const accountName = transaction.account?.trim() || "Unknown account";

					const accountId = transaction.account_id;

					const canNavigate = Boolean(accountId);

					return (
						<button
							type="button"
							disabled={!canNavigate}
							onClick={(event) => {
								event.stopPropagation();

								if (!accountId) {
									return;
								}

								router.push(
									`/accounts/details/${encodeURIComponent(accountId)}`,
								);
							}}
							aria-label={`View ${accountName} account`}
							title={
								canNavigate ? `View ${accountName}` : "Account ID unavailable"
							}
							className={`
		group 
		flex w-full min-w-0
		items-center gap-3
		rounded-lg
		border border-transparent
		px-2 py-1 text-left
		bg-transparent
		group-hover:border-gray-300
		dark:group-hover:border-white/20
		transition-colors
		focus-visible:outline-none
		focus-visible:border-blue-500/60
		focus-visible:ring-2
		focus-visible:ring-blue-500/20
		${
			canNavigate
				? `
					cursor-pointer
					hover:border-gray-300
					hover:bg-gray-50
					dark:hover:border-white/20
					dark:hover:bg-white/4
				`
				: `
					cursor-not-allowed
					opacity-50
				`
		}
	`}
						>
							<span
								className="
			min-w-0 flex-1 truncate
			text-[15px] font-semibold
			text-gray-900 dark:text-white
		"
								title={accountName}
							>
								{accountName}
							</span>

							<ArrowRight
								size={16}
								strokeWidth={2}
								aria-hidden="true"
								className={
									accountId
										? `
				shrink-0
				opacity-0
				text-gray-600 dark:text-gray-400
				transition-opacity duration-150
				group-hover:opacity-100
				group-focus-visible:opacity-100
			`
										: `
				shrink-0
				opacity-0
				text-gray-300 dark:text-gray-600
			`
								}
							/>
						</button>
					);
				},
			}),

			columnHelper.accessor("amount", {
				size: 140,

				sortingFn: (rowA, rowB, columnId) => {
					const firstAmount = Number(rowA.getValue(columnId));

					const secondAmount = Number(rowB.getValue(columnId));
					const safeAmountA = Number.isFinite(firstAmount)
						? Math.abs(firstAmount)
						: 0;

					const safeAmountB = Number.isFinite(secondAmount)
						? Math.abs(secondAmount)
						: 0;
					return safeAmountA - safeAmountB;
				},
				sortUndefined: "last",

				cell: (info) => {
					const parsedAmount = Number(info.getValue());

					const amount = Number.isFinite(parsedAmount) ? parsedAmount : 0;

					const isPositive = amount > 0;

					return (
						<div className="flex items-center justify-end w-full gap-2 pr-2 font-medium text-[15px]">
							<span
								className={`text-right ${
									isPositive
										? "text-emerald-700 dark:text-emerald-500"
										: "text-gray-900 dark:text-white"
								}`}
							>
								{isPositive ? "+" : ""}

								{formatCurrency(amount)}
							</span>

							<button
								type="button"
								onClick={(event) => {
									event.stopPropagation();

									onRowClick(info.row.original);
								}}
								aria-label={`Open ${
									info.row.original.merchant || "transaction"
								} details`}
								className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-500 dark:text-gray-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
							>
								<ChevronRight size={18} strokeWidth={2} aria-hidden="true" />
							</button>
						</div>
					);
				},
			}),
		];
	}, [
		selectedIdSet,
		currentView,
		isEditMode,
		onMarkReviewed,
		onSelectRow,
		getCategoryId,
		isCategoryView,
		onCategoryChange,
		navigateToCategory,
		resolveMerchantId,
		isMerchantNavigationEnabled,
		router,
		onRowClick,
	]);

	const uniqueTransactions = useMemo(() => {
		const seen = new Set<string>();

		return transactions.filter((transaction) => {
			if (!transaction.id || seen.has(transaction.id)) {
				return false;
			}

			seen.add(transaction.id);

			return true;
		});
	}, [transactions]);

	// eslint-disable-next-line react-hooks/incompatible-library
	const table = useReactTable({
		data: uniqueTransactions,
		columns,

		getRowId: (transaction) => {
			return transaction.id;
		},

		state: {
			sorting,

			columnVisibility: {
				...columnVisibility,
				date: false,
				select: isEditMode || currentView === "review",
				amount: columnVisibility.amount !== false,
			},
		},

		getCoreRowModel: getCoreRowModel(),

		getSortedRowModel: getSortedRowModel(),
	});

	const rows = table.getRowModel().rows;

	const flatRows = useMemo<FlatItem[]>(() => {
		const dateTotals = new Map<string, number>();
		const rowDateInfo = new Map<
			string,
			{
				key: string;
				label: string;
			}
		>();

		/*
		 * First pass:
		 * Calculate the total for each date without changing row order.
		 */
		for (const row of rows) {
			const dateInfo = getDateInfo(row.original.date);

			const amount = Number(row.original.amount);

			rowDateInfo.set(row.id, {
				key: dateInfo.key,
				label: dateInfo.label,
			});

			dateTotals.set(
				dateInfo.key,
				(dateTotals.get(dateInfo.key) ?? 0) +
					(Number.isFinite(amount) ? amount : 0),
			);
		}

		const result: FlatItem[] = [];

		let previousDateKey: string | null = null;
		let headerSequence = 0;

		/*
		 * Second pass:
		 * Keep the exact TanStack-sorted order.
		 *
		 * When sorting by amount, `rows` is already globally sorted:
		 * $999
		 * $123
		 * $10
		 *
		 * We only insert date headers without regrouping the rows.
		 */
		for (const row of rows) {
			const dateInfo = rowDateInfo.get(row.id);

			if (!dateInfo) {
				continue;
			}

			if (dateInfo.key !== previousDateKey) {
				result.push({
					type: "header",
					id: `header-${dateInfo.key}-${headerSequence}`,
					date: dateInfo.label,
					total: dateTotals.get(dateInfo.key) ?? 0,
				});

				previousDateKey = dateInfo.key;
				headerSequence++;
			}

			result.push({
				type: "row",
				id: `row-${row.id}`,
				row,
			});
		}

		return result;
	}, [rows]);

	const stickyHeaderIndexByItemIndex = useMemo(() => {
		const indices = new Array<number>(flatRows.length);

		let latestHeaderIndex = -1;

		for (let index = 0; index < flatRows.length; index++) {
			if (flatRows[index].type === "header") {
				latestHeaderIndex = index;
			}

			indices[index] = latestHeaderIndex;
		}

		return indices;
	}, [flatRows]);

	const rowVirtualizer = useVirtualizer({
		count: flatRows.length,

		getScrollElement: () => {
			return parentRef.current;
		},

		getItemKey: (index) => {
			return flatRows[index]?.id ?? index;
		},

		estimateSize: (index) => {
			return flatRows[index]?.type === "header"
				? DATE_HEADER_HEIGHT
				: TRANSACTION_ROW_HEIGHT;
		},

		overscan: VIRTUAL_OVERSCAN,
	});

	const virtualItems = rowVirtualizer.getVirtualItems();

	let activeHeader: ActiveHeader = null;

	if (virtualItems.length > 0) {
		const scrollTop = parentRef.current?.scrollTop ?? 0;

		let currentTopIndex = virtualItems[0].index;

		for (let index = 0; index < virtualItems.length; index++) {
			const virtualItem = virtualItems[index];

			if (virtualItem.start <= scrollTop) {
				currentTopIndex = virtualItem.index;

				continue;
			}

			break;
		}

		const stickyHeaderIndex =
			stickyHeaderIndexByItemIndex[currentTopIndex] ?? -1;

		if (stickyHeaderIndex >= 0) {
			const stickyItem = flatRows[stickyHeaderIndex];

			if (stickyItem.type === "header") {
				let translateY = 0;

				const nextHeader = virtualItems.find((virtualItem) => {
					return (
						virtualItem.index > stickyHeaderIndex &&
						flatRows[virtualItem.index]?.type === "header"
					);
				});

				if (nextHeader && nextHeader.start - scrollTop < DATE_HEADER_HEIGHT) {
					translateY = nextHeader.start - scrollTop - DATE_HEADER_HEIGHT;
				}

				activeHeader = {
					item: stickyItem,
					translateY,
				};
			}
		}
	}

	return (
		<div
			ref={parentRef}
			role="table"
			aria-label="Transactions"
			className="h-full overflow-auto bg-white dark:bg-[#191919] scrollbar-hide transition-colors duration-200 relative"
		>
			{flatRows.length === 0 ? (
				<div className="h-full min-h-48 flex items-center justify-center px-6 text-sm text-gray-500 dark:text-gray-400">
					No transactions found.
				</div>
			) : (
				<>
					<div
						className="sticky top-0 z-10 w-full"
						style={{
							height: 0,
						}}
					>
						{activeHeader && (
							<div
								role="row"
								className="absolute w-full px-6 flex items-center justify-between bg-[#F9FAFB] dark:bg-[#232323] text-gray-500 dark:text-gray-400 font-bold text-sm border-b border-gray-200 dark:border-white/5 transition-colors duration-200"
								style={{
									height: DATE_HEADER_HEIGHT,

									transform: `translateY(${activeHeader.translateY}px)`,
								}}
							>
								<span role="cell">{activeHeader.item.date}</span>

								<span role="cell">
									{formatCurrency(activeHeader.item.total)}
								</span>
							</div>
						)}
					</div>

					<div
						style={{
							height: `${rowVirtualizer.getTotalSize()}px`,
							position: "relative",
						}}
					>
						{virtualItems.map((virtualRow) => {
							const item = flatRows[virtualRow.index];

							if (!item) {
								return null;
							}

							if (item.type === "header") {
								return (
									<div
										key={item.id}
										role="row"
										className="absolute w-full px-6 flex items-center justify-between bg-[#F9FAFB] dark:bg-[#232323] text-gray-500 dark:text-gray-400 font-bold text-sm border-b border-gray-200 dark:border-white/5 transition-colors duration-200"
										style={{
											height: DATE_HEADER_HEIGHT,

											transform: `translateY(${virtualRow.start}px)`,
										}}
									>
										<span role="cell">{item.date}</span>

										<span role="cell">{formatCurrency(item.total)}</span>
									</div>
								);
							}

							const row = item.row;

							const isSelected = selectedIdSet.has(row.original.id);

							return (
								<div
									key={item.id}
									role="row"
									className={`absolute w-full flex items-center border-b border-gray-100 dark:border-white/5 transition-colors ${
										isSelected
											? "bg-blue-50 dark:bg-[#FF5A35]/10"
											: "bg-white dark:bg-[#191919] hover:bg-gray-50 dark:hover:bg-white/5"
									}`}
									style={{
										height: TRANSACTION_ROW_HEIGHT,

										transform: `translateY(${virtualRow.start}px)`,
									}}
								>
									{row.getVisibleCells().map((cell, index) => {
										const isAmount = cell.column.id === "amount";

										return (
											<div
												key={cell.id}
												role="cell"
												style={{
													width: isAmount ? "auto" : cell.column.getSize(),

													flex: isAmount ? 1 : "none",
												}}
												className={`min-w-0 truncate ${
													index === 0 ? "pl-6 pr-2" : "px-2"
												}`}
											>
												{flexRender(
													cell.column.columnDef.cell,

													cell.getContext(),
												)}
											</div>
										);
									})}
								</div>
							);
						})}
					</div>
				</>
			)}
		</div>
	);
}
