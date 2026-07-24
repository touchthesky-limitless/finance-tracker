"use client";

import {
	forwardRef,
	useCallback,
	useEffect,
	useRef,
	useState,
	type ButtonHTMLAttributes,
	type ComponentPropsWithoutRef,
	type Dispatch,
	type PointerEvent as ReactPointerEvent,
	type ReactNode,
	type SetStateAction,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
	Filter,
	Import,
	Plus,
	Search,
	Sidebar as SidebarIcon,
} from "lucide-react";
import * as Popover from "@radix-ui/react-popover";

import {
	DateRangeButton,
	EMPTY_DATE_RANGE,
	dateRangesEqual,
	readDateParam,
} from "@/components/Transactions/DateRangeButton";

export { DateRangeButton } from "@/components/Transactions/DateRangeButton";

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
	showAddTransaction?: boolean;
}

type OpenPopover = "search" | "filter" | null;

const TRANSACTION_URL_KEYS = [
	"search",
	"startDate",
	"endDate",
	"categoryNames",
	"merchantNames",
	"accountNames",
	"tags",
	"goalIds",
	"amountMode",
	"amountValue",
	"amountMaxValue",
	"transactionType",
	"needsReview",
	"recurring",
	"attachments",
	"split",
] as const;

interface SearchParamReader {
	get: (name: string) => string | null;
	getAll: (name: string) => string[];
}

function readStringList(
	searchParams: SearchParamReader,
	key:
		| "categoryNames"
		| "merchantNames"
		| "accountNames"
		| "tags"
		| "goalIds",
): string[] {
	const seen = new Set<string>();
	const values: string[] = [];

	for (const rawValue of searchParams.getAll(key)) {
		const value = rawValue.trim();

		if (!value || seen.has(value)) {
			continue;
		}

		seen.add(value);
		values.push(value);
	}

	return values;
}

function readEnumParam<TValue extends string>(
	searchParams: SearchParamReader,
	key: string,
	allowedValues: readonly TValue[],
	fallback: TValue,
): TValue {
	const value = searchParams.get(key);

	return value && allowedValues.includes(value as TValue)
		? (value as TValue)
		: fallback;
}

function readTransactionFiltersFromUrl(
	searchParams: SearchParamReader,
): TransactionFilters {
	return {
		categoryNames: readStringList(searchParams, "categoryNames"),
		merchantNames: readStringList(searchParams, "merchantNames"),
		accountNames: readStringList(searchParams, "accountNames"),
		tags: readStringList(searchParams, "tags"),
		goalIds: readStringList(searchParams, "goalIds"),
		amountMode: readEnumParam(
			searchParams,
			"amountMode",
			[
				"none",
				"greater-than",
				"less-than",
				"equal-to",
				"between",
			] as const,
			"none",
		),
		amountValue: searchParams.get("amountValue")?.trim() ?? "",
		amountMaxValue:
			searchParams.get("amountMaxValue")?.trim() ?? "",
		transactionType: readEnumParam(
			searchParams,
			"transactionType",
			["all", "debits", "credits"] as const,
			"all",
		),
		needsReview: readEnumParam(
			searchParams,
			"needsReview",
			["any", "yes", "no"] as const,
			"any",
		),
		recurring: readEnumParam(
			searchParams,
			"recurring",
			["any", "yes", "no"] as const,
			"any",
		),
		attachments: readEnumParam(
			searchParams,
			"attachments",
			["any", "yes", "no"] as const,
			"any",
		),
		split: readEnumParam(
			searchParams,
			"split",
			["any", "yes", "no"] as const,
			"any",
		),
	};
}

function appendStringList(
	searchParams: URLSearchParams,
	key:
		| "categoryNames"
		| "merchantNames"
		| "accountNames"
		| "tags"
		| "goalIds",
	values: string[],
): void {
	for (const rawValue of values) {
		const value = rawValue.trim();

		if (value) {
			searchParams.append(key, value);
		}
	}
}

function writeTransactionStateToUrl(
	searchParams: URLSearchParams,
	searchQuery: string,
	dateRange: TransactionDateRange,
	filters: TransactionFilters,
): void {
	for (const key of TRANSACTION_URL_KEYS) {
		searchParams.delete(key);
	}

	const cleanSearch = searchQuery.trim();

	if (cleanSearch) {
		searchParams.set("search", cleanSearch);
	}

	if (dateRange.startDate) {
		searchParams.set("startDate", dateRange.startDate);
	}

	if (dateRange.endDate) {
		searchParams.set("endDate", dateRange.endDate);
	}

	appendStringList(
		searchParams,
		"categoryNames",
		filters.categoryNames,
	);
	appendStringList(
		searchParams,
		"merchantNames",
		filters.merchantNames,
	);
	appendStringList(
		searchParams,
		"accountNames",
		filters.accountNames,
	);
	appendStringList(searchParams, "tags", filters.tags);
	appendStringList(searchParams, "goalIds", filters.goalIds);

	if (filters.amountMode !== "none") {
		searchParams.set("amountMode", filters.amountMode);
	}

	if (filters.amountValue.trim()) {
		searchParams.set(
			"amountValue",
			filters.amountValue.trim(),
		);
	}

	if (filters.amountMaxValue.trim()) {
		searchParams.set(
			"amountMaxValue",
			filters.amountMaxValue.trim(),
		);
	}

	if (filters.transactionType !== "all") {
		searchParams.set(
			"transactionType",
			filters.transactionType,
		);
	}

	if (filters.needsReview !== "any") {
		searchParams.set("needsReview", filters.needsReview);
	}

	if (filters.recurring !== "any") {
		searchParams.set("recurring", filters.recurring);
	}

	if (filters.attachments !== "any") {
		searchParams.set("attachments", filters.attachments);
	}

	if (filters.split !== "any") {
		searchParams.set("split", filters.split);
	}

	searchParams.sort();
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
	showAddTransaction = true,
}: TopToolbarProps) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const searchParamsString = searchParams.toString();

	const searchInputRef = useRef<HTMLInputElement>(null);
	const hydratedUrlRef = useRef<string | null>(null);
	const [openPopover, setOpenPopover] = useState<OpenPopover>(null);
	const [draftSearch, setDraftSearch] = useState(searchQuery);
	const [draftFilters, setDraftFilters] = useState<TransactionFilters>(filters);

	const replaceUrlState = useCallback(
		(
			nextSearchQuery: string,
			nextDateRange: TransactionDateRange,
			nextFilters: TransactionFilters,
		) => {
			const nextSearchParams = new URLSearchParams(searchParamsString);

			writeTransactionStateToUrl(
				nextSearchParams,
				nextSearchQuery,
				nextDateRange,
				nextFilters,
			);

			const nextQueryString = nextSearchParams.toString();
			const nextUrl = nextQueryString
				? `${pathname}?${nextQueryString}`
				: pathname;

			router.replace(nextUrl, {
				scroll: false,
			});
		},
		[pathname, router, searchParamsString],
	);

	useEffect(() => {
		if (hydratedUrlRef.current === searchParamsString) {
			return;
		}

		hydratedUrlRef.current = searchParamsString;

		const nextSearchParams = new URLSearchParams(searchParamsString);
		const nextSearchQuery = nextSearchParams.get("search")?.trim() ?? "";
		const nextDateRange: TransactionDateRange = {
			startDate: readDateParam(nextSearchParams, "startDate"),
			endDate: readDateParam(nextSearchParams, "endDate"),
		};
		const nextFilters = readTransactionFiltersFromUrl(nextSearchParams);

		if (nextSearchQuery !== searchQuery) {
			setSearchQuery(nextSearchQuery);
		}

		if (!dateRangesEqual(nextDateRange, dateRange)) {
			setDateRange(nextDateRange);
		}

		if (!transactionFiltersEqual(nextFilters, filters)) {
			onFiltersChange(nextFilters);
		}
	}, [
		dateRange,
		filters,
		onFiltersChange,
		searchParamsString,
		searchQuery,
		setDateRange,
		setSearchQuery,
	]);

	const resetDrafts = () => {
		setDraftSearch(searchQuery);
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
	const canApplySearch = draftSearch.trim() !== searchQuery.trim();
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
						onClick={() => {
							onClearAll();
							setDraftSearch("");
							setDateRange(EMPTY_DATE_RANGE);
							setDraftFilters(EMPTY_TRANSACTION_FILTERS);
							replaceUrlState("", EMPTY_DATE_RANGE, EMPTY_TRANSACTION_FILTERS);
						}}
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

										const nextSearchQuery = draftSearch.trim();

										setSearchQuery(nextSearchQuery);
										replaceUrlState(nextSearchQuery, dateRange, filters);
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
									replaceUrlState("", dateRange, filters);
									setOpenPopover(null);
								}}
								onCancel={() => {
									setDraftSearch(searchQuery);
									setOpenPopover(null);
								}}
								onApply={() => {
									const nextSearchQuery = draftSearch.trim();

									setSearchQuery(nextSearchQuery);
									replaceUrlState(nextSearchQuery, dateRange, filters);
									setOpenPopover(null);
								}}
								clearDisabled={!draftSearch && !isSearchActive}
								applyDisabled={!canApplySearch}
							/>
						</Popover.Content>
					</Popover.Portal>
				</Popover.Root>

				<DateRangeButton
					value={dateRange}
					onChange={(nextDateRange) => {
						setDateRange(nextDateRange);
						replaceUrlState(searchQuery, nextDateRange, filters);
					}}
					active={isDateActive}
					variant="toolbar"
					onBeforeOpen={() => {
						setOpenPopover(null);
					}}
				/>

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
									replaceUrlState(
										searchQuery,
										dateRange,
										EMPTY_TRANSACTION_FILTERS,
									);
									setOpenPopover(null);
								}}
								onCancel={() => {
									setDraftFilters(filters);
									setOpenPopover(null);
								}}
								onApply={() => {
									onFiltersChange(draftFilters);
									replaceUrlState(searchQuery, dateRange, draftFilters);
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

				{showAddTransaction && (
					<button
						type="button"
						onClick={onAddTransaction}
						className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#FF5A35] px-4 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#E04825]"
					>
						<Plus size={18} strokeWidth={2.5} />
						Add transaction
					</button>
				)}

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
