"use client";

import {
	forwardRef,
	useRef,
	useState,
	type ButtonHTMLAttributes,
	type ComponentPropsWithoutRef,
	type Dispatch,
	type PointerEvent as ReactPointerEvent,
	type ReactNode,
	type SetStateAction,
} from "react";
import {
	Calendar,
	Filter,
	Import,
	Plus,
	Search,
	Sidebar as SidebarIcon,
} from "lucide-react";
import * as Popover from "@radix-ui/react-popover";

import { TransactionFilterPanel } from "@/components/Transactions/TransactionFilterPanel";
import {
	EMPTY_TRANSACTION_FILTERS,
	countActiveTransactionFilters,
	hasTransactionFilters,
	transactionFiltersEqual,
	type TransactionFilterData,
	type TransactionFilters,
} from "@/components/Transactions/transactionFilters";

export interface TransactionDateRange {
	startDate: string;
	endDate: string;
}

interface TopToolbarProps {
	searchQuery: string;
	setSearchQuery: (value: string) => void;
	dateRange: TransactionDateRange;
	setDateRange: Dispatch<SetStateAction<TransactionDateRange>>;
	setShowUploader: (value: boolean) => void;
	onAddTransaction: () => void;
	isSummaryVisible: boolean;
	setIsSummaryVisible: Dispatch<SetStateAction<boolean>>;
	hasActiveFilters: boolean;
	onClearAll: () => void;
	filters: TransactionFilters;
	filterData: TransactionFilterData;
	onFiltersChange: (filters: TransactionFilters) => void;
}

type OpenPopover = "search" | "date" | "filter" | null;
type DatePreset =
	| "last-7"
	| "last-14"
	| "last-30"
	| "this-month"
	| "last-month"
	| "this-year"
	| "last-year";

const EMPTY_DATE_RANGE: TransactionDateRange = {
	startDate: "",
	endDate: "",
};

const DATE_PRESETS: ReadonlyArray<{
	value: DatePreset;
	label: string;
}> = [
	{ value: "last-7", label: "Last 7 days" },
	{ value: "last-14", label: "Last 14 days" },
	{ value: "last-30", label: "Last 30 days" },
	{ value: "this-month", label: "This month" },
	{ value: "last-month", label: "Last month" },
	{ value: "this-year", label: "This year" },
	{ value: "last-year", label: "Last year" },
];

function toIsoDate(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");

	return `${year}-${month}-${day}`;
}

function getDatePreset(preset: DatePreset): TransactionDateRange {
	const now = new Date();
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

	if (preset === "last-7" || preset === "last-14" || preset === "last-30") {
		const dayCount = preset === "last-7" ? 7 : preset === "last-14" ? 14 : 30;
		const start = new Date(today);
		start.setDate(start.getDate() - (dayCount - 1));

		return {
			startDate: toIsoDate(start),
			endDate: toIsoDate(today),
		};
	}

	if (preset === "this-month") {
		return {
			startDate: toIsoDate(new Date(today.getFullYear(), today.getMonth(), 1)),
			endDate: toIsoDate(
				new Date(today.getFullYear(), today.getMonth() + 1, 0),
			),
		};
	}

	if (preset === "last-month") {
		return {
			startDate: toIsoDate(
				new Date(today.getFullYear(), today.getMonth() - 1, 1),
			),
			endDate: toIsoDate(new Date(today.getFullYear(), today.getMonth(), 0)),
		};
	}

	const year =
		preset === "this-year" ? today.getFullYear() : today.getFullYear() - 1;

	return {
		startDate: `${year}-01-01`,
		endDate: `${year}-12-31`,
	};
}

function rangesEqual(
	first: TransactionDateRange,
	second: TransactionDateRange,
): boolean {
	return (
		first.startDate === second.startDate && first.endDate === second.endDate
	);
}

export function TopToolbar({
	searchQuery,
	setSearchQuery,
	dateRange,
	setDateRange,
	setShowUploader,
	onAddTransaction,
	isSummaryVisible,
	setIsSummaryVisible,
	hasActiveFilters,
	onClearAll,
	filters,
	filterData,
	onFiltersChange,
}: TopToolbarProps) {
	const searchInputRef = useRef<HTMLInputElement>(null);
	const [openPopover, setOpenPopover] = useState<OpenPopover>(null);
	const [draftSearch, setDraftSearch] = useState(searchQuery);
	const [draftDateRange, setDraftDateRange] =
		useState<TransactionDateRange>(dateRange);
	const [draftFilters, setDraftFilters] = useState<TransactionFilters>(filters);

	const resetDrafts = () => {
		setDraftSearch(searchQuery);
		setDraftDateRange(dateRange);
		setDraftFilters(filters);
	};

	const closeOpenPopover = () => {
		resetDrafts();
		setOpenPopover(null);
	};

	const toggleSearchPopover = () => {
		setDraftSearch(searchQuery);
		setOpenPopover((current) => (current === "search" ? null : "search"));
	};

	const toggleDatePopover = () => {
		setDraftDateRange(dateRange);
		setOpenPopover((current) => (current === "date" ? null : "date"));
	};

	const toggleFilterPopover = () => {
		setDraftFilters(filters);
		setOpenPopover((current) => (current === "filter" ? null : "filter"));
	};

	const handlePopoverPointerDownOutside: NonNullable<
		ComponentPropsWithoutRef<typeof Popover.Content>["onPointerDownOutside"]
	> = (event) => {
		const originalTarget = event.detail.originalEvent.target;

		if (
			originalTarget instanceof Element &&
			originalTarget.closest("[data-toolbar-popover-trigger]")
		) {
			/*
			 * Let the clicked Search/Date button toggle the shared state itself.
			 * Without this, Radix closes the current popover on pointerdown and
			 * the following click can reopen the wrong popover.
			 */
			event.preventDefault();
		}
	};

	const isSearchActive = searchQuery.trim().length > 0;
	const isDateActive = Boolean(dateRange.startDate || dateRange.endDate);
	const isFilterActive = hasTransactionFilters(filters);
	const activeFilterCount = countActiveTransactionFilters(filters);
	const invalidDateRange = Boolean(
		draftDateRange.startDate &&
		draftDateRange.endDate &&
		draftDateRange.startDate > draftDateRange.endDate,
	);
	const canApplySearch = draftSearch.trim() !== searchQuery.trim();
	const canApplyDate =
		!invalidDateRange && !rangesEqual(draftDateRange, dateRange);
	const canApplyFilters = !transactionFiltersEqual(draftFilters, filters);

	const handleToolbarPointerDownCapture = (
		event: ReactPointerEvent<HTMLDivElement>,
	) => {
		if (!openPopover) {
			return;
		}

		const target = event.target;
		const toolbar = event.currentTarget;

		if (!(target instanceof Element)) {
			return;
		}

		/*
		 * React events from Radix's portal still propagate through this
		 * component tree even though the popover is rendered under <body>.
		 * Only dismiss when the clicked element is an actual DOM descendant
		 * of the toolbar. This keeps clicks inside the portaled modal open.
		 */
		if (!toolbar.contains(target)) {
			return;
		}

		/*
		 * Search and Date triggers manage their own toggle/switch behavior.
		 * Every other pointer interaction inside TopToolbar dismisses the
		 * currently open popover before the clicked toolbar control runs.
		 */
		if (target.closest("[data-toolbar-popover-trigger]")) {
			return;
		}

		closeOpenPopover();
	};

	return (
		<div
			onPointerDownCapture={handleToolbarPointerDownCapture}
			className="
	relative z-30
	flex items-center justify-between
	overflow-visible
	border-b border-gray-200
	bg-white px-6 pt-5 pb-0
	transition-colors duration-200
	dark:border-white/5 dark:bg-[#191919]
"
		>
			<div className="flex items-center gap-8">
				<h1 className="pb-4 text-[22px] font-bold tracking-tight text-gray-900 dark:text-white">
					Transactions
				</h1>

				<div className="flex h-full gap-6 text-[15px] font-medium">
					<button
						type="button"
						className="border-b-[3px] border-[#FF5A35] pb-4 text-[#FF5A35]"
					>
						All
					</button>
					<button
						type="button"
						className="pb-4 text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
					>
						Receipts
					</button>
				</div>
			</div>

			<div className="flex items-center gap-3 pb-4">
				{hasActiveFilters && (
					<button
						type="button"
						onClick={onClearAll}
						className="mr-2 text-sm font-medium text-cyan-600 hover:text-cyan-700 dark:text-cyan-400"
					>
						Clear
					</button>
				)}

				<Popover.Root
					modal={false}
					open={openPopover === "search"}
					onOpenChange={(isOpen) => {
						if (!isOpen && openPopover === "search") {
							closeOpenPopover();
						}
					}}
				>
					<Popover.Anchor asChild>
						<ToolbarButton
							data-toolbar-popover-trigger="search"
							aria-expanded={openPopover === "search"}
							aria-haspopup="dialog"
							onClick={toggleSearchPopover}
							active={isSearchActive}
							icon={<Search size={18} strokeWidth={2.2} />}
							label="Search"
						/>
					</Popover.Anchor>

					<Popover.Portal>
						<Popover.Content
							side="bottom"
							align="end"
							sideOffset={14}
							collisionPadding={16}
							onPointerDownOutside={handlePopoverPointerDownOutside}
							onOpenAutoFocus={(event) => {
								event.preventDefault();

								window.requestAnimationFrame(() => {
									searchInputRef.current?.focus();
								});
							}}
							className="z-[9999] w-[min(712px,calc(100vw-32px))] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl outline-none dark:border-white/10 dark:bg-[#1B1B1B]"
						>
							<div className="px-7 pt-5 pb-4">
								<h2 className="text-xl font-semibold text-gray-900 dark:text-white">
									Search
								</h2>

								<input
									ref={searchInputRef}
									value={draftSearch}
									onChange={(event) => {
										setDraftSearch(event.target.value);
									}}
									onKeyDown={(event) => {
										if (event.key !== "Enter" || !canApplySearch) {
											return;
										}

										event.preventDefault();
										setSearchQuery(draftSearch.trim());
										setOpenPopover(null);
									}}
									placeholder="Enter a search term..."
									className="mt-4 h-16 w-full rounded-xl border-2 border-cyan-500 bg-transparent px-5 text-xl text-gray-900 outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-cyan-500/20 dark:text-white"
								/>

								<p className="mt-3 text-base leading-7 text-gray-500 dark:text-gray-400">
									We&apos;ll match your search term to merchant names,
									categories, original statements, amounts, notes, and tags.
								</p>
							</div>

							<PopoverFooter
								onClear={() => {
									setDraftSearch("");
									setSearchQuery("");
									setOpenPopover(null);
								}}
								onCancel={() => {
									setDraftSearch(searchQuery);
									setOpenPopover(null);
								}}
								onApply={() => {
									setSearchQuery(draftSearch.trim());
									setOpenPopover(null);
								}}
								clearDisabled={!draftSearch && !isSearchActive}
								applyDisabled={!canApplySearch}
							/>
						</Popover.Content>
					</Popover.Portal>
				</Popover.Root>

				<Popover.Root
					modal={false}
					open={openPopover === "date"}
					onOpenChange={(isOpen) => {
						if (!isOpen && openPopover === "date") {
							closeOpenPopover();
						}
					}}
				>
					<Popover.Anchor asChild>
						<ToolbarButton
							data-toolbar-popover-trigger="date"
							aria-expanded={openPopover === "date"}
							aria-haspopup="dialog"
							onClick={toggleDatePopover}
							active={isDateActive}
							icon={<Calendar size={17} strokeWidth={2} />}
							label="Date"
						/>
					</Popover.Anchor>

					<Popover.Portal>
						<Popover.Content
							side="bottom"
							align="end"
							sideOffset={14}
							collisionPadding={16}
							onPointerDownOutside={handlePopoverPointerDownOutside}
							className="z-[9999] w-[min(826px,calc(100vw-32px))] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl outline-none dark:border-white/10 dark:bg-[#1B1B1B]"
						>
							<div className="grid min-h-[535px] grid-cols-[230px_minmax(0,1fr)]">
								<div className="border-r border-gray-200 dark:border-white/10">
									<h2 className="border-b border-gray-200 px-7 py-6 text-xl font-semibold text-gray-900 dark:border-white/10 dark:text-white">
										Date Range
									</h2>

									<div className="flex flex-col px-4 py-4">
										{DATE_PRESETS.map((preset) => {
											const range = getDatePreset(preset.value);
											const selected = rangesEqual(range, draftDateRange);

											return (
												<button
													key={preset.value}
													type="button"
													onClick={() => {
														setDraftDateRange(range);
														setDateRange(range);
														setOpenPopover(null);
													}}
													className={`rounded-xl px-5 py-3 text-left text-base font-medium transition-colors ${
														selected
															? "bg-[#FF5A35]/10 text-[#FF5A35]"
															: "text-gray-800 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-white/5"
													}`}
												>
													{preset.label}
												</button>
											);
										})}
									</div>
								</div>

								<div className="px-8 py-14">
									<DateField
										id="transaction-start-date"
										label="Start date"
										value={draftDateRange.startDate}
										onChange={(startDate) => {
											setDraftDateRange((current) => ({
												...current,
												startDate,
											}));
										}}
									/>

									<div className="mt-14">
										<DateField
											id="transaction-end-date"
											label="End date"
											value={draftDateRange.endDate}
											onChange={(endDate) => {
												setDraftDateRange((current) => ({
													...current,
													endDate,
												}));
											}}
										/>

										{invalidDateRange && (
											<p className="mt-3 text-sm font-medium text-red-500">
												End date must be on or after the start date.
											</p>
										)}
									</div>
								</div>
							</div>

							<PopoverFooter
								onClear={() => {
									setDraftDateRange(EMPTY_DATE_RANGE);
									setDateRange(EMPTY_DATE_RANGE);
									setOpenPopover(null);
								}}
								onCancel={() => {
									setDraftDateRange(dateRange);
									setOpenPopover(null);
								}}
								onApply={() => {
									if (invalidDateRange) {
										return;
									}

									setDateRange(draftDateRange);
									setOpenPopover(null);
								}}
								clearDisabled={
									!draftDateRange.startDate &&
									!draftDateRange.endDate &&
									!isDateActive
								}
								applyDisabled={!canApplyDate}
							/>
						</Popover.Content>
					</Popover.Portal>
				</Popover.Root>

				<Popover.Root
					modal={false}
					open={openPopover === "filter"}
					onOpenChange={(isOpen) => {
						if (!isOpen && openPopover === "filter") {
							closeOpenPopover();
						}
					}}
				>
					<Popover.Anchor asChild>
						<ToolbarButton
							data-toolbar-popover-trigger="filter"
							aria-expanded={openPopover === "filter"}
							aria-haspopup="dialog"
							onClick={toggleFilterPopover}
							active={isFilterActive}
							icon={<Filter size={17} strokeWidth={2} />}
							label={
								activeFilterCount > 0
									? `Filters (${activeFilterCount})`
									: "Filters"
							}
						/>
					</Popover.Anchor>

					<Popover.Portal>
						<Popover.Content
							side="bottom"
							align="end"
							sideOffset={14}
							collisionPadding={16}
							onPointerDownOutside={handlePopoverPointerDownOutside}
							className="z-[9999] w-[min(900px,calc(100vw-24px))] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl outline-none dark:border-white/10 dark:bg-[#1B1B1B]"
						>
							<TransactionFilterPanel
								filters={draftFilters}
								setFilters={setDraftFilters}
								data={filterData}
								onClear={() => {
									setDraftFilters(EMPTY_TRANSACTION_FILTERS);
									onFiltersChange(EMPTY_TRANSACTION_FILTERS);
									setOpenPopover(null);
								}}
								onCancel={() => {
									setDraftFilters(filters);
									setOpenPopover(null);
								}}
								onApply={() => {
									onFiltersChange(draftFilters);
									setOpenPopover(null);
								}}
								applyDisabled={!canApplyFilters}
							/>
						</Popover.Content>
					</Popover.Portal>
				</Popover.Root>

				<div className="mx-1 h-6 w-px bg-gray-300 dark:bg-white/20" />

				<button
					type="button"
					onClick={() => {
						setShowUploader(true);
					}}
					className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 shadow-sm transition-all hover:bg-gray-50 active:scale-95 dark:border-white/10 dark:bg-[#121212] dark:text-gray-300 dark:hover:bg-white/5"
				>
					<Import size={16} />
					Import
				</button>

				<button
					type="button"
					onClick={onAddTransaction}
					className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#FF5A35] px-4 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#E04825]"
				>
					<Plus size={18} strokeWidth={2.5} />
					Add
				</button>

				<button
					type="button"
					onClick={() => {
						setIsSummaryVisible((previous) => !previous);
					}}
					className={`ml-1 flex h-10 w-10 items-center justify-center rounded-xl border transition-colors ${
						isSummaryVisible
							? "border-blue-600 bg-blue-50 text-blue-600 dark:border-[#38bdf8] dark:bg-[#0B4D56] dark:text-[#38bdf8]"
							: "border-gray-300 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:border-white/20 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white"
					}`}
				>
					<SidebarIcon size={18} strokeWidth={2} />
				</button>
			</div>
		</div>
	);
}

interface ToolbarButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	active?: boolean;
	icon: ReactNode;
	label: string;
}

const ToolbarButton = forwardRef<HTMLButtonElement, ToolbarButtonProps>(
	function ToolbarButton(
		{
			active = false,
			icon,
			label,
			className = "",
			type = "button",
			...buttonProps
		},
		ref,
	) {
		return (
			<button
				ref={ref}
				type={type}
				{...buttonProps}
				className={`relative flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-semibold shadow-sm transition-colors ${
					active
						? "border-[#FF5A35]/50 bg-[#FF5A35]/5 text-[#FF5A35]"
						: "border-gray-300 text-gray-900 hover:bg-gray-100 dark:border-white/20 dark:text-white dark:hover:bg-white/5"
				} ${className}`}
			>
				{icon}
				{label}

				{active && (
					<span
						aria-hidden="true"
						className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-[#FF5A35]"
					/>
				)}
			</button>
		);
	},
);

ToolbarButton.displayName = "ToolbarButton";

function DateField({
	id,
	label,
	value,
	onChange,
}: {
	id: string;
	label: string;
	value: string;
	onChange: (value: string) => void;
}) {
	return (
		<div>
			<div className="mb-4 flex items-center justify-between">
				<label
					htmlFor={id}
					className="text-lg font-semibold text-gray-900 dark:text-white"
				>
					{label}
				</label>
				<button
					type="button"
					onClick={() => {
						onChange("");
					}}
					className="text-base font-semibold text-cyan-600 hover:text-cyan-700 dark:text-cyan-400"
				>
					Clear
				</button>
			</div>
			<input
				id={id}
				type="date"
				value={value}
				onChange={(event) => {
					onChange(event.target.value);
				}}
				className="h-14 w-full rounded-xl border border-gray-300 bg-transparent px-5 text-lg text-gray-900 outline-none transition-colors focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-white/15 dark:text-white"
			/>
		</div>
	);
}

function PopoverFooter({
	onClear,
	onCancel,
	onApply,
	clearDisabled,
	applyDisabled,
}: {
	onClear: () => void;
	onCancel: () => void;
	onApply: () => void;
	clearDisabled: boolean;
	applyDisabled: boolean;
}) {
	return (
		<div className="flex items-center justify-between border-t border-gray-200 bg-gray-50/40 px-7 py-5 dark:border-white/10 dark:bg-black/10">
			<button
				type="button"
				onClick={onClear}
				disabled={clearDisabled}
				className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-base font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-[#222] dark:text-gray-200 dark:hover:bg-white/5"
			>
				Clear
			</button>
			<div className="flex items-center gap-4">
				<button
					type="button"
					onClick={onCancel}
					className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-base font-semibold text-gray-900 shadow-sm transition-colors hover:bg-gray-50 dark:border-white/10 dark:bg-[#222] dark:text-white dark:hover:bg-white/5"
				>
					Cancel
				</button>
				<button
					type="button"
					onClick={onApply}
					disabled={applyDisabled}
					className="rounded-xl bg-[#FF5A35] px-5 py-3 text-base font-bold text-white shadow-sm transition-colors hover:bg-[#E04825] disabled:cursor-not-allowed disabled:opacity-45"
				>
					Apply
				</button>
			</div>
		</div>
	);
}
