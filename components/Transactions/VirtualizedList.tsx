"use client";

/**
 * Renders the virtualized list of date headers and transaction rows.
 * Uses a sticky header that follows the scroll position.
 */

import { flexRender } from "@tanstack/react-table";
import { formatCurrency } from "@/utils/formatters";
import type { Transaction } from "@/store/useBudgetStore";
import {
	DATE_HEADER_HEIGHT,
	TRANSACTION_ROW_HEIGHT,
	type FlatItem,
} from "@/hooks/transactions/useDateGrouping";
import { type Virtualizer } from "@tanstack/react-virtual";

interface VirtualizedListProps {
	flatRows: FlatItem[];
	rowVirtualizer: Virtualizer<HTMLDivElement, Element>;
	// stickyHeaderIndexByItemIndex: number[];
	activeHeader: {
		item: FlatItem & { type: "header" };
		translateY: number;
	} | null;
	selectedIdSet: Set<string>;
	onRowClick: (transaction: Transaction) => void;
}

export function VirtualizedList({
	flatRows,
	rowVirtualizer,
	activeHeader,
	selectedIdSet,
	onRowClick,
}: VirtualizedListProps) {
	const virtualItems = rowVirtualizer.getVirtualItems();

	return (
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
						<span role="cell">{formatCurrency(activeHeader.item.total)}</span>
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
							onClick={() => onRowClick(row.original)}
							className={`absolute w-full flex items-center border-b border-gray-100 dark:border-white/5 transition-colors md:cursor-pointer ${
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
											minWidth: cell.column.columnDef.minSize ?? 0,
										}}
										className={`min-w-0 truncate ${
											index === 0 ? "pr-0" : "px-2"
										}`}
									>
										{flexRender(cell.column.columnDef.cell, cell.getContext())}
									</div>
								);
							})}
						</div>
					);
				})}
			</div>
		</>
	);
}
