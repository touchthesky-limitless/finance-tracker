"use client";
"use no memo";

import { useRef, useMemo } from "react";
import {
	useReactTable,
	getCoreRowModel,
	getSortedRowModel,
	flexRender,
	VisibilityState,
	SortingState,
	createColumnHelper,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Transaction } from "@/store/useBudgetStore";
import { ChevronRight, ArrowRight, Check } from "lucide-react";
import { CategorySelector } from "@/components/CategorySelector";
import { formatCurrency } from "@/utils/formatters";

interface DataTableProps {
	transactions: Transaction[];
	selectedIds: string[];
	onSelectRow: (id: string, e: React.MouseEvent) => void;
	onRowClick: (transaction: Transaction) => void;
	columnVisibility: VisibilityState;
	isEditMode: boolean;
	currentView: "all" | "review";
	onMarkReviewed?: (id: string) => void;
	sorting: SortingState;
	onCategoryChange?: (id: string, newCategory: string) => void;
}

const columnHelper = createColumnHelper<Transaction>();

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
}: DataTableProps) {
	const parentRef = useRef<HTMLDivElement>(null);

	const columns = useMemo(() => {
		return [
			columnHelper.accessor("date", {
				id: "date",
			}),
			columnHelper.display({
				id: "select",
				size: 40,
				cell: (info) => {
					const isSelected = selectedIds.includes(info.row.original.id);
					if (currentView === "review" && !isEditMode) {
						return (
							<div className="flex items-center justify-center w-full h-full">
								<button
									onClick={(e) => {
										e.stopPropagation();
										onMarkReviewed?.(info.row.original.id);
									}}
									className="w-5 h-5 rounded-full border border-gray-300 dark:border-gray-500 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-white"
								>
									<Check
										size={12}
										strokeWidth={3}
										className="opacity-0 hover:opacity-100"
									/>
								</button>
							</div>
						);
					}
					if (isEditMode) {
						return (
							<div className="flex items-center justify-center w-full h-full">
								<div
									onClick={(e) => {
										e.stopPropagation();
										onSelectRow(info.row.original.id, e);
									}}
									className={`w-5 h-5 rounded-sm border-2 flex items-center justify-center cursor-pointer ${isSelected ? "bg-[#FF5A35] border-[#FF5A35]" : "border-gray-300 dark:border-gray-600"}`}
								>
									<Check
										size={14}
										className={isSelected ? "text-white" : "text-transparent"}
									/>
								</div>
							</div>
						);
					}
					return null;
				},
			}),
			columnHelper.accessor("merchant", {
				size: 280,
				cell: (info) => {
					return (
						<div className="flex items-center gap-3 w-full">
							<div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-white flex items-center justify-center text-[#FF5A35] font-black text-sm">
								{String(info.getValue()).charAt(0).toUpperCase()}
							</div>
							<span className="font-medium text-gray-900 dark:text-white text-[15px]">
								{info.getValue()}
							</span>
						</div>
					);
				},
			}),
			columnHelper.accessor("category", {
				size: 280,
				cell: (info) => {
					return (
						<div
							onClick={(e) => e.stopPropagation()}
							className="group flex items-center gap-1.5 w-full h-full pr-2"
						>
							{/* Box 1: The Category Selector */}
							<div className="flex-1 min-w-0">
								<CategorySelector
									currentCategory={String(info.getValue())}
									onSelect={(newCategory) => {
										if (onCategoryChange) {
											onCategoryChange(info.row.original.id, newCategory);
										}
									}}
								/>
							</div>

							{/* Box 2: View Category Button */}
							<button
								className="flex items-center justify-center w-8 h-8 rounded-lg border border-transparent group-hover:border-gray-300 dark:group-hover:border-white/20 opacity-0 group-hover:opacity-100 hover:bg-gray-100 dark:hover:bg-white/5 transition-all shrink-0 cursor-pointer"
								title="View Category"
							>
								<ArrowRight
									size={16}
									className="text-gray-600 dark:text-gray-400"
									strokeWidth={2}
								/>
							</button>
						</div>
					);
				},
			}),

			columnHelper.accessor("account", {
				size: 300,
				cell: (info) => {
					return (
						// Added overflow-hidden to the wrapper
						<div className="flex items-center gap-2 overflow-hidden">
							{/* Added shrink-0 so the icon doesn't squash */}
							<div className="w-5 h-5 rounded-full border-4 border-[#2563EB] bg-white shrink-0" />

							{/* Added truncate so long strings like "Customized Cash Rewards Visa..." get an ellipsis */}
							<span
								className="text-gray-700 dark:text-gray-200 text-[15px] truncate"
								title={String(info.getValue())}
							>
								{String(info.getValue())}
							</span>
						</div>
					);
				},
			}),
			columnHelper.accessor("amount", {
				size: 140,
				sortingFn: (rowA, rowB, columnId) => {
					const aVal = Number(rowA.getValue(columnId));
					const bVal = Number(rowB.getValue(columnId));

					return Math.abs(aVal) - Math.abs(bVal);
				},
				cell: (info) => {
					const val = Number(info.getValue());
					const isPositive = val > 0;

					return (
						<div className="flex items-center justify-end w-full gap-2 pr-2 font-medium text-[15px]">
							<span
								className={`text-right ${isPositive ? "text-emerald-700 dark:text-emerald-500" : "text-gray-900 dark:text-white"}`}
							>
								{isPositive ? "+" : ""}
								{formatCurrency(val)}
							</span>
							<button
								onClick={(e) => {
									e.stopPropagation();
									onRowClick(info.row.original);
								}}
								className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-500 dark:text-gray-400 transition-colors"
							>
								<ChevronRight size={18} strokeWidth={2} />
							</button>
						</div>
					);
				},
			}),
		];
	}, [
		selectedIds,
		isEditMode,
		currentView,
		onSelectRow,
		onMarkReviewed,
		onRowClick,
		onCategoryChange,
	]);

	// eslint-disable-next-line
	const table = useReactTable({
		data: transactions,
		columns,
		state: {
			sorting,
			columnVisibility: {
				...columnVisibility,
				date: false,
				select: isEditMode || currentView === "review",
			},
		},
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
	});

	const rows = table.getRowModel().rows;

	const flatRows = useMemo(() => {
		const result = [];

		// 2. Single pass to calculate totals and cache formatted dates
		const dateTotals = new Map<string, number>();
		const rowDates = new Map<string, string>();

		for (let i = 0; i < rows.length; i++) {
			const row = rows[i];
			const dateStr = new Date(row.original.date).toLocaleDateString("en-US", {
				month: "long",
				day: "numeric",
				year: "numeric",
			});

			rowDates.set(row.id, dateStr);

			const currentTotal = dateTotals.get(dateStr) || 0;
			dateTotals.set(dateStr, currentTotal + Number(row.original.amount));
		}

		// 3. Build the final flat array
		let lastDate = "";

		for (let i = 0; i < rows.length; i++) {
			const row = rows[i];
			const dateStr = rowDates.get(row.id) as string;

			if (dateStr !== lastDate) {
				result.push({
					type: "header",
					date: dateStr,
					total: dateTotals.get(dateStr),
					id: dateStr,
				});
				lastDate = dateStr;
			}
			result.push({ type: "row", ...row });
		}

		return result;
	}, [rows]); // 4. Depend ONLY on the extracted rows array

	const rowVirtualizer = useVirtualizer({
		count: flatRows.length,
		getScrollElement: () => {
			return parentRef.current;
		},
		estimateSize: (index) => {
			return flatRows[index].type === "header" ? 48 : 56;
		},
		overscan: 5,
	});

	const virtualItems = rowVirtualizer.getVirtualItems();

	// Determine the active sticky header and calculate any push-up offset
	let activeHeader = null;
	if (virtualItems.length > 0) {
		const scrollTop = parentRef.current?.scrollTop || 0;

		// 1. Find the actual item touching the top of the viewport (ignoring overscan)
		let currentTopIndex = virtualItems[0].index;
		for (const v of virtualItems) {
			if (v.start <= scrollTop) {
				currentTopIndex = v.index;
			} else {
				break;
			}
		}

		// 2. Find the closest header for that specific item
		let stickyIdx = -1;
		for (let i = currentTopIndex; i >= 0; i--) {
			if (flatRows[i]?.type === "header") {
				stickyIdx = i;
				break;
			}
		}

		// 3. Calculate push-up effect
		if (stickyIdx !== -1) {
			let translateY = 0;
			const nextHeader = virtualItems.find((v) => {
				return v.index > stickyIdx && flatRows[v.index]?.type === "header";
			});

			if (nextHeader) {
				if (nextHeader.start - scrollTop < 48) {
					translateY = nextHeader.start - scrollTop - 48;
				}
			}

			activeHeader = {
				item: flatRows[stickyIdx],
				translateY,
			};
		}
	}

	return (
		<div
			ref={parentRef}
			className="h-full overflow-auto bg-white dark:bg-[#191919] scrollbar-hide transition-colors duration-200 relative"
		>
			{/* Sticky Header Overlay */}
			<div className="sticky top-0 z-10 w-full" style={{ height: 0 }}>
				{activeHeader && (
					<div
						className="absolute w-full px-6 flex items-center justify-between bg-[#F9FAFB] dark:bg-[#232323] text-gray-500 dark:text-gray-400 font-bold text-sm border-b border-gray-200 dark:border-white/5 transition-colors duration-200"
						style={{
							height: 48,
							transform: `translateY(${activeHeader.translateY}px)`,
						}}
					>
						<span>{activeHeader.item.date}</span>
						{/* Add the || 0 fallback here */}
						<span>${Math.abs(activeHeader.item.total || 0).toFixed(2)}</span>
					</div>
				)}
			</div>

			<div
				style={{
					height: `${rowVirtualizer.getTotalSize()}px`,
					position: "relative",
				}}
			>
				{virtualItems.map((vRow) => {
					const item = flatRows[vRow.index];
					if (!item) return null;

					if (item.type === "header") {
						return (
							<div
								key={`header-${item.id}-${vRow.index}`}
								className="absolute w-full px-6 flex items-center justify-between bg-[#F9FAFB] dark:bg-[#232323] text-gray-500 dark:text-gray-400 font-bold text-sm border-b border-gray-200 dark:border-white/5 transition-colors duration-200"
								style={{ height: 48, transform: `translateY(${vRow.start}px)` }}
							>
								<span>{item.date}</span>
								<span>${Math.abs(item.total || 0).toFixed(2)}</span>
							</div>
						);
					}

					// --- TYPE GUARD: 'row' is now treated as the correct TanStack Row type ---
					const row = item;

					// Check if the object has the getVisibleCells method
					if (!("getVisibleCells" in row)) return null;

					return (
						<div
							key={row.id}
							className={`absolute w-full flex items-center border-b border-gray-100 dark:border-white/5 transition-colors ${selectedIds.includes(row.original.id) ? "bg-blue-50 dark:bg-[#FF5A35]/10" : "bg-white dark:bg-[#191919] hover:bg-gray-50 dark:hover:bg-white/5"}`}
							style={{ height: 56, transform: `translateY(${vRow.start}px)` }}
						>
							{row.getVisibleCells().map((cell, index) => {
								const isAmount = cell.column.id === "amount";
								return (
									<div
										key={cell.id}
										style={{
											width: isAmount ? "auto" : cell.column.getSize(),
											flex: isAmount ? 1 : "none",
										}}
										className={`truncate ${index === 0 ? "pl-6 pr-2" : "px-2"}`}
									>
										{flexRender(cell.column.columnDef.cell, cell.getContext())}
									</div>
								);
							})}
						</div>
					);
				})}
			</div>
		</div>
	);
}
