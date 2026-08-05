"use client";

/**
 * Main transaction table component.
 * Uses extracted hooks for date grouping and column definitions,
 * and a dedicated virtualized list renderer.
 */

import {
	useCallback,
	useMemo,
	useRef,
	type MouseEvent as ReactMouseEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
	getCoreRowModel,
	getSortedRowModel,
	useReactTable,
	type SortingState,
	type VisibilityState,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";

import { TransactionTableSkeleton } from "@/components/ui/skeletons/TransactionTableSkeleton";
import type { MerchantListItem } from "@/components/Merchants/types";
import type { Merchant, Transaction } from "@/store/useBudgetStore";
import { useUnifiedMerchants } from "@/hooks/useUnifiedMerchants";
import {
	appendNavigationSource,
	type NavigationSource,
	useNavigationSource,
} from "@/lib/navigation/breadcrumb";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { MOBILE_BREAKPOINT } from "@/config/breakpoints";
import React from "react";

import {
	useDateGrouping,
	DATE_HEADER_HEIGHT,
	TRANSACTION_ROW_HEIGHT,
} from "@/hooks/transactions/useDateGrouping";
import { useTableColumns } from "@/hooks/transactions/useTableColumns";
import { VirtualizedList } from "./VirtualizedList";

interface DataTableProps {
	transactions: Transaction[];
	selectedIds: string[];
	onSelectRow: (id: string, event: ReactMouseEvent) => void;
	onRowClick: (transaction: Transaction) => void;
	merchantItems?: MerchantListItem[];
	onMerchantChange?: (
		transactionId: string,
		merchant: Pick<Merchant, "id" | "name">,
	) => Promise<void> | void;
	columnVisibility: VisibilityState;
	isEditMode: boolean;
	currentView: "all" | "review";
	onMarkReviewed?: (id: string) => void;
	sorting: SortingState;
	onCategoryChange?: (id: string, newCategory: string) => Promise<void> | void;
	isCategoryView?: boolean;
	getCategoryId?: (categoryName: string) => string | undefined;
	isMerchantNavigationEnabled?: boolean;
	getMerchantId?: (merchantName: string) => string | undefined;
	isLoading?: boolean;
	navigationSource?: NavigationSource;
	disableDateGrouping?: boolean;
	onViewCategory?: (categoryName: string, targetId?: string) => void;
	columnWidths?: {
		merchant?: number;
		category?: number;
		amount?: number;
	};
	isMobile?: boolean;
	showCategoryChevron?: boolean;
	merchantPopoverZIndex?: number;
	forceCategoryIconOnly?: boolean;
}

const VIRTUAL_OVERSCAN = 8;

function DataTableComponent({
	transactions,
	selectedIds,
	onSelectRow,
	onRowClick,
	onMerchantChange,
	merchantItems = [],
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
	isLoading = false,
	navigationSource,
	disableDateGrouping = false,
	onViewCategory,
	columnWidths,
	showCategoryChevron = true,
	merchantPopoverZIndex,
	forceCategoryIconOnly = false,
}: DataTableProps) {
	const parentRef = useRef<HTMLDivElement>(null);
	const router = useRouter();
	const isMobile = useMediaQuery(MOBILE_BREAKPOINT);

	const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);

	const { getMerchantId: getUnifiedMerchantId } = useUnifiedMerchants();
	const resolveMerchantId = getMerchantIdOverride ?? getUnifiedMerchantId;
	const source = useNavigationSource();

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

			const basePath = `/categories/${encodeURIComponent(targetId)}`;
			const existingQuery = params.toString();
			const url = appendNavigationSource(
				basePath,
				navigationSource ?? source,
				existingQuery,
			);
			router.push(url);
		},
		[router, navigationSource, source],
	);

	const columns = useTableColumns({
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
		navigationSource,
		source,
		router,
		onRowClick,
		onMerchantChange,
		merchantItems,
		isMobile,
		onViewCategory,
		columnWidths,
		showCategoryChevron,
		merchantPopoverZIndex,
		forceCategoryIconOnly,
	});

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
		getRowId: (transaction) => transaction.id,
		state: {
			sorting,
			columnVisibility: {
				...columnVisibility,
				date: false,
				select: isEditMode || currentView === "review",
				amount: columnVisibility.amount !== false,
				account: isMobile ? false : (columnVisibility.account ?? true),
			},
		},
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
	});

	const rows = table.getRowModel().rows;

	const { flatRows, stickyHeaderIndexByItemIndex } = useDateGrouping(
		rows,
		disableDateGrouping,
	);

	const rowVirtualizer = useVirtualizer({
		count: flatRows.length,
		getScrollElement: () => parentRef.current,
		getItemKey: (index) => flatRows[index]?.id ?? index,
		estimateSize: (index) =>
			flatRows[index]?.type === "header"
				? DATE_HEADER_HEIGHT
				: TRANSACTION_ROW_HEIGHT,
		overscan: VIRTUAL_OVERSCAN,
	});

	const virtualItems = rowVirtualizer.getVirtualItems();
	let activeHeader = null;

	if (virtualItems.length > 0 && !disableDateGrouping) {
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

	const skeleton = useMemo(() => <TransactionTableSkeleton />, []);

	return (
		<div
			ref={parentRef}
			role="table"
			aria-label="Transactions"
			className="h-full overflow-auto bg-white dark:bg-[#191919] scrollbar-hide transition-colors duration-200 relative"
		>
			{isLoading ? (
				skeleton
			) : flatRows.length === 0 ? (
				<div className="h-full min-h-48 flex items-center justify-center px-6 text-sm text-gray-500 dark:text-gray-400">
					No transactions found.
				</div>
			) : (
				<VirtualizedList
					flatRows={flatRows}
					rowVirtualizer={rowVirtualizer}
					// stickyHeaderIndexByItemIndex={stickyHeaderIndexByItemIndex}
					activeHeader={activeHeader}
					selectedIdSet={selectedIdSet}
					onRowClick={onRowClick}
				/>
			)}
		</div>
	);
}

export const DataTable = React.memo(DataTableComponent);
