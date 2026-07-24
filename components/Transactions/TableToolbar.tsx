"use client";

import type {
	Dispatch,
	ReactNode,
	SetStateAction,
} from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
	ChevronDown,
	Columns,
	Minus,
	PencilSparkles,
	Plus,
} from "lucide-react";
import type {
	SortingState,
	VisibilityState,
} from "@tanstack/react-table";

interface ColumnOption {
	id: string;
	label: string;
}

interface TableToolbarProps {
	isEditMode: boolean;
	setIsEditMode: (value: boolean) => void;
	selectedIds: string[];
	setSelectedIds: Dispatch<SetStateAction<string[]>>;
	visibleTransactionIds: string[];
	currentView?: "all" | "review";
	setCurrentView?: (view: "all" | "review") => void;
	filteredLength: number;
	sorting: SortingState;
	setSorting: (sorting: SortingState) => void;
	columnVisibility: VisibilityState;
	setColumnVisibility: Dispatch<SetStateAction<VisibilityState>>;
	onEditMultiple: () => void;
	onMoveTransactions?: () => void;
	onAddTransaction?: () => void;
	title?: string;
	showViewSelector?: boolean;
	showAddTransaction?: boolean;
	columnOptions?: ReadonlyArray<ColumnOption>;
	leadingContent?: ReactNode;
}

const SORT_OPTIONS = [
	{ label: "Date (new to old)", id: "date", desc: true },
	{ label: "Date (old to new)", id: "date", desc: false },
	{ label: "Amount (high to low)", id: "amount", desc: true },
	{ label: "Amount (low to high)", id: "amount", desc: false },
] as const;

const DEFAULT_COLUMN_OPTIONS: ReadonlyArray<ColumnOption> = [
	{ id: "category", label: "Category" },
	{ id: "account", label: "Account" },
];

export function TableToolbar({
	isEditMode,
	setIsEditMode,
	selectedIds,
	setSelectedIds,
	visibleTransactionIds,
	currentView = "all",
	setCurrentView,
	filteredLength,
	sorting,
	setSorting,
	columnVisibility,
	setColumnVisibility,
	onEditMultiple,
	onMoveTransactions,
	onAddTransaction,
	title,
	showViewSelector = true,
	showAddTransaction = Boolean(onAddTransaction),
	columnOptions = DEFAULT_COLUMN_OPTIONS,
	leadingContent,
}: TableToolbarProps) {
	const activeSortLabel = SORT_OPTIONS.find((option) => {
		return (
			option.id === sorting[0]?.id &&
			option.desc === sorting[0]?.desc
		);
	})?.label;

	const isSortModified =
		sorting.length > 0 &&
		(sorting[0]?.id !== "date" || sorting[0]?.desc !== true);

	const isColumnsModified = columnOptions.some((column) => {
		return columnVisibility[column.id] === false;
	});

	const isViewModified = currentView !== "all";

	const allVisibleTransactionsSelected =
		visibleTransactionIds.length > 0 &&
		visibleTransactionIds.every((transactionId) => {
			return selectedIds.includes(transactionId);
		});

	const hasVisibleSelection = visibleTransactionIds.some((transactionId) => {
		return selectedIds.includes(transactionId);
	});

	const handleToggleSelectAll = (): void => {
		if (visibleTransactionIds.length === 0) {
			return;
		}

		const visibleIdSet = new Set(visibleTransactionIds);

		setSelectedIds((current) => {
			if (allVisibleTransactionsSelected) {
				return current.filter((transactionId) => {
					return !visibleIdSet.has(transactionId);
				});
			}

			return Array.from(new Set([...current, ...visibleTransactionIds]));
		});
	};

	const exitEditMode = (): void => {
		setIsEditMode(false);
		setSelectedIds([]);
	};

	const renderBulkAction = () => {
		if (!onMoveTransactions) {
			return (
				<button
					type="button"
					onClick={onEditMultiple}
					disabled={selectedIds.length === 0}
					className="h-9 rounded-lg bg-[#FF5A35] px-4 text-[14px] font-bold text-white transition-colors hover:bg-[#E04825] disabled:cursor-not-allowed disabled:opacity-45"
				>
					Edit {selectedIds.length}
				</button>
			);
		}

		return (
			<DropdownMenu.Root modal={false}>
				<DropdownMenu.Trigger asChild>
					<button
						type="button"
						disabled={selectedIds.length === 0}
						className="flex h-9 items-center gap-2 rounded-lg bg-[#FF5A35] px-4 text-[14px] font-bold text-white outline-none transition-colors hover:bg-[#E04825] disabled:cursor-not-allowed disabled:opacity-45"
					>
						Edit {selectedIds.length}
						<ChevronDown size={15} />
					</button>
				</DropdownMenu.Trigger>

				<DropdownMenu.Portal>
					<DropdownMenu.Content
						align="end"
						sideOffset={8}
						className="z-[120] w-68 overflow-hidden rounded-xl border border-gray-200 bg-white py-2 text-gray-900 shadow-2xl outline-none dark:border-white/10 dark:bg-[#1E1E1E] dark:text-white"
					>
						<DropdownMenu.Item
							onSelect={onEditMultiple}
							className="cursor-pointer px-5 py-3 text-[15px] outline-none transition-colors data-[highlighted]:bg-gray-100 dark:data-[highlighted]:bg-white/5"
						>
							Edit {selectedIds.length} transaction
							{selectedIds.length === 1 ? "" : "s"}
						</DropdownMenu.Item>

						<DropdownMenu.Item
							onSelect={onMoveTransactions}
							className="cursor-pointer px-5 py-3 text-[15px] outline-none transition-colors data-[highlighted]:bg-gray-100 dark:data-[highlighted]:bg-white/5"
						>
							Move to account
						</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Portal>
			</DropdownMenu.Root>
		);
	};

	return (
		<div className="relative z-40 flex min-h-14 flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-5 py-3 dark:border-white/5">
			<div className="flex min-w-0 items-center gap-4">
				{isEditMode ? (
					<div className="flex items-center gap-3">
						<button
							type="button"
							onClick={handleToggleSelectAll}
							disabled={visibleTransactionIds.length === 0}
							aria-label={
								allVisibleTransactionsSelected
									? "Deselect all visible transactions"
									: "Select all visible transactions"
							}
							className={`flex size-6 items-center justify-center rounded border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A35]/40 disabled:cursor-not-allowed disabled:opacity-40 ${
								hasVisibleSelection
									? "border-[#FF5A35] bg-[#FF5A35] text-white hover:bg-[#E04825]"
									: "border-gray-400 bg-white text-transparent hover:border-[#FF5A35] dark:border-gray-500 dark:bg-transparent"
							}`}
						>
							{hasVisibleSelection && <Minus size={16} strokeWidth={3} />}
						</button>

						<span className="text-[15px] font-bold text-gray-900 dark:text-white">
							{selectedIds.length} transaction
							{selectedIds.length === 1 ? "" : "s"} selected{" "}
							<span className="ml-1 font-normal text-gray-500">(ESC)</span>
						</span>
					</div>
				) : (
					<>
						{leadingContent}

						{title && (
							<h2 className="truncate text-lg font-semibold text-gray-900 dark:text-white">
								{title}
							</h2>
						)}

						{showViewSelector && setCurrentView && (
							<DropdownMenu.Root modal={false}>
								<DropdownMenu.Trigger asChild>
									<button
										type="button"
										className="relative flex h-9 min-w-45 items-center justify-between gap-2 rounded-lg border border-gray-300 px-3 text-[14px] font-medium text-gray-900 outline-none transition-colors hover:bg-gray-100 data-[state=open]:border-blue-600 dark:border-white/20 dark:text-white dark:hover:bg-white/5 dark:data-[state=open]:border-[#38bdf8]"
									>
										{currentView === "all" ? "All transactions" : "Anyone"}
										<ChevronDown
											size={16}
											className="text-gray-500 dark:text-gray-400"
										/>

										{isViewModified && (
											<span className="absolute -right-1 -top-1 size-2.5 rounded-full border-2 border-white bg-blue-500 dark:border-[#191919] dark:bg-[#38bdf8]" />
										)}
									</button>
								</DropdownMenu.Trigger>

								<DropdownMenu.Portal>
									<DropdownMenu.Content
										align="start"
										sideOffset={8}
										className="z-[120] w-64 overflow-hidden rounded-xl border border-gray-200 bg-white py-2 shadow-2xl outline-none dark:border-white/10 dark:bg-[#1E1E1E]"
									>
										<DropdownMenu.Item
											onSelect={() => {
												setCurrentView("all");
											}}
											className={`cursor-pointer px-4 py-2.5 text-[15px] outline-none ${
												currentView === "all"
													? "bg-blue-50 text-blue-600 dark:bg-[#0B4D56] dark:text-[#38bdf8]"
													: "text-gray-900 data-[highlighted]:bg-gray-100 dark:text-white dark:data-[highlighted]:bg-white/5"
											}`}
										>
											All transactions
										</DropdownMenu.Item>

										<div className="mt-2 px-4 py-2 text-xs font-bold text-gray-500">
											Needs Review by...
										</div>

										<DropdownMenu.Item
											onSelect={() => {
												setCurrentView("review");
											}}
											className={`cursor-pointer px-4 py-2.5 text-[15px] outline-none ${
												currentView === "review"
													? "bg-blue-50 text-blue-600 dark:bg-[#0B4D56] dark:text-[#38bdf8]"
													: "text-gray-900 data-[highlighted]:bg-gray-100 dark:text-white dark:data-[highlighted]:bg-white/5"
											}`}
										>
											Anyone
										</DropdownMenu.Item>
									</DropdownMenu.Content>
								</DropdownMenu.Portal>
							</DropdownMenu.Root>
						)}
					</>
				)}
			</div>

			<div className="flex flex-wrap items-center gap-2">
				{isEditMode ? (
					<>
						<button
							type="button"
							onClick={exitEditMode}
							className="h-9 rounded-lg border border-gray-300 px-4 text-[14px] font-medium text-gray-900 transition-colors hover:bg-gray-100 dark:border-white/20 dark:text-white dark:hover:bg-white/5"
						>
							Cancel
						</button>

						{renderBulkAction()}
					</>
				) : (
					<>
						<button
							type="button"
							onClick={() => {
								setIsEditMode(true);
							}}
							className="flex h-9 items-center gap-2 rounded-lg border border-gray-300 px-3 text-[14px] font-medium text-gray-900 transition-colors hover:bg-gray-100 dark:border-white/20 dark:text-white dark:hover:bg-white/5"
						>
							<PencilSparkles
								size={16}
								className="text-gray-500 dark:text-gray-400"
								strokeWidth={2.5}
							/>
							Edit multiple
						</button>


						{currentView === "review" && (
							<button
								type="button"
								className="h-9 rounded-lg bg-[#FF5A35] px-4 text-[14px] font-bold text-white transition-colors hover:bg-[#E04825]"
							>
								Mark all {filteredLength} as reviewed
							</button>
						)}
					</>
				)}

				{showAddTransaction && onAddTransaction && (
					<button
						type="button"
						onClick={onAddTransaction}
						className="flex h-9 items-center gap-2 rounded-lg bg-[#FF5A35] px-4 text-[14px] font-bold text-white transition-colors hover:bg-[#E04825]"
					>
						<Plus size={16} strokeWidth={2.5} />
						Add transaction
					</button>
				)}

				<div className="mx-1 h-6 w-px bg-gray-300 dark:bg-white/20" />

				<DropdownMenu.Root modal={false}>
					<DropdownMenu.Trigger asChild>
						<button
							type="button"
							className="relative flex h-9 items-center gap-2 whitespace-nowrap rounded-lg border border-gray-300 px-3 text-[14px] font-medium text-gray-900 outline-none transition-colors hover:bg-gray-100 data-[state=open]:bg-gray-100 dark:border-white/20 dark:text-white dark:hover:bg-white/5 dark:data-[state=open]:bg-white/5"
						>
							{isSortModified && activeSortLabel ? (
								<span className="flex items-center gap-1.5">
									Sort
									<span className="text-gray-300 dark:text-gray-600">|</span>
									<span className="text-blue-600 dark:text-[#38bdf8]">
										{activeSortLabel}
									</span>
								</span>
							) : (
								"Sort"
							)}

							<ChevronDown
								size={16}
								className="shrink-0 text-gray-500 dark:text-gray-400"
							/>

							{isSortModified && (
								<span className="absolute -right-1 -top-1 size-2.5 rounded-full border-2 border-white bg-blue-500 dark:border-[#191919] dark:bg-[#38bdf8]" />
							)}
						</button>
					</DropdownMenu.Trigger>

					<DropdownMenu.Portal>
						<DropdownMenu.Content
							align="end"
							sideOffset={8}
							className="z-[120] w-60 overflow-hidden rounded-xl border border-gray-200 bg-white py-2 shadow-2xl outline-none dark:border-white/10 dark:bg-[#1E1E1E]"
						>
							{SORT_OPTIONS.map((option) => {
								const isActive = activeSortLabel === option.label;

								return (
									<DropdownMenu.Item
										key={option.label}
										onSelect={() => {
											setSorting([
												{
													id: option.id,
													desc: option.desc,
												},
											]);
										}}
										className={`cursor-pointer px-4 py-2.5 text-[15px] outline-none ${
											isActive
												? "bg-blue-50 text-blue-600 dark:bg-[#0B4D56] dark:text-[#38bdf8]"
												: "text-gray-900 data-[highlighted]:bg-gray-100 dark:text-white dark:data-[highlighted]:bg-white/5"
										}`}
									>
										{option.label}
									</DropdownMenu.Item>
								);
							})}
						</DropdownMenu.Content>
					</DropdownMenu.Portal>
				</DropdownMenu.Root>

				<DropdownMenu.Root modal={false}>
					<DropdownMenu.Trigger asChild>
						<button
							type="button"
							className="relative flex h-9 items-center gap-2 rounded-lg border border-gray-300 px-3 text-[14px] font-medium text-gray-900 outline-none transition-colors hover:bg-gray-100 data-[state=open]:bg-gray-100 dark:border-white/20 dark:text-white dark:hover:bg-white/5 dark:data-[state=open]:bg-white/5"
						>
							<Columns
								size={16}
								className="text-gray-500 dark:text-gray-400"
							/>
							Columns

							{isColumnsModified && (
								<span className="absolute -right-1 -top-1 size-2.5 rounded-full border-2 border-white bg-blue-500 dark:border-[#191919] dark:bg-[#38bdf8]" />
							)}
						</button>
					</DropdownMenu.Trigger>

					<DropdownMenu.Portal>
						<DropdownMenu.Content
							align="end"
							sideOffset={8}
							className="z-[120] flex w-60 flex-col gap-4 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-2xl outline-none dark:border-white/10 dark:bg-[#1E1E1E]"
						>
							<div className="text-xs font-bold text-gray-500">
								{columnOptions.filter((column) => {
									return columnVisibility[column.id] !== false;
								}).length}{" "}
								of {columnOptions.length} visible
							</div>

							{columnOptions.map((column) => {
								const isChecked = columnVisibility[column.id] !== false;

								return (
									<DropdownMenu.Item
										key={column.id}
										onSelect={(event) => {
											event.preventDefault();
											setColumnVisibility((current) => {
												return {
													...current,
													[column.id]: !isChecked,
												};
											});
										}}
										className="flex cursor-pointer items-center justify-between outline-none"
									>
										<span className="text-[15px] text-gray-900 dark:text-white">
											{column.label}
										</span>

										<span
											className={`relative h-5 w-10 rounded-full transition-colors ${
												isChecked
													? "bg-[#FF5A35]"
													: "bg-gray-300 dark:bg-gray-600"
											}`}
										>
											<span
												className={`absolute top-[3px] size-3.5 rounded-full bg-white transition-all dark:bg-[#191919] ${
													isChecked ? "right-1" : "left-1"
												}`}
											/>
										</span>
									</DropdownMenu.Item>
								);
							})}
						</DropdownMenu.Content>
					</DropdownMenu.Portal>
				</DropdownMenu.Root>
			</div>
		</div>
	);
}
