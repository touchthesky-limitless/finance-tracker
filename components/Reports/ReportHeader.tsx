"use client";

import { useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Popover from "@radix-ui/react-popover";
import { Bookmark, Check, ChevronDown, Filter, Pencil } from "lucide-react";

import {
	DateRangeButton,
	EMPTY_DATE_RANGE,
} from "@/components/Transactions/DateRangeButton";
import { TransactionFilterPanel } from "@/components/Transactions/TransactionFilterPanel";
import {
	EMPTY_TRANSACTION_FILTERS,
	countActiveTransactionFilters,
	hasTransactionFilters,
	type TransactionFilterData,
	type TransactionFilters,
} from "@/components/Transactions/transactionFilters";
import {
	getSavedReportDateLabel,
	SavedReportModal,
} from "@/components/Reports/SavedReportModal";
import type {
	ReportDateRange,
	ReportTab,
	SavedReport,
	SavedReportConfiguration,
} from "@/components/Reports/types";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { MOBILE_BREAKPOINT } from "@/config/breakpoints";

function normalizeReportName(value: string): string {
	return value.trim().toLocaleLowerCase().replace(/\s+/g, " ");
}

export function ReportHeader({
	tab,
	onTabChange,
	dateRange,
	onDateRangeChange,
	filters,
	filterData,
	onFiltersChange,
	onClearAll,
	savedReports,
	currentConfiguration,
	onSaveReport,
	onEditSavedReport,
	onDeleteSavedReport,
	onLoadSavedReport,
	areSavedReportsLoading,
	isSavingReport,
	deletingReportId,
	savedReportError,
	onClearSavedReportError,
}: {
	tab: ReportTab;
	onTabChange: (value: ReportTab) => void;
	dateRange: ReportDateRange;
	onDateRangeChange: (value: ReportDateRange) => void;
	filters: TransactionFilters;
	filterData: TransactionFilterData;
	onFiltersChange: (value: TransactionFilters) => void;
	onClearAll: () => void;
	savedReports: SavedReport[];
	currentConfiguration: SavedReportConfiguration;
	onSaveReport: (name: string, includeChartSettings: boolean) => Promise<void>;
	onEditSavedReport: (
		reportId: string,
		name: string,
		configuration: SavedReportConfiguration,
	) => Promise<void>;
	onDeleteSavedReport: (reportId: string) => Promise<void>;
	onLoadSavedReport: (report: SavedReport) => void;
	areSavedReportsLoading: boolean;
	isSavingReport: boolean;
	deletingReportId: string | null;
	savedReportError: string | null;
	onClearSavedReportError: () => void;
}) {
	const [filterOpen, setFilterOpen] = useState(false);
	const [draftFilters, setDraftFilters] = useState<TransactionFilters>(filters);
	const [savedReportsOpen, setSavedReportsOpen] = useState(false);
	const [saveModalOpen, setSaveModalOpen] = useState(false);
	const [saveModalSession, setSaveModalSession] = useState(0);
	const [editingReport, setEditingReport] = useState<SavedReport | null>(null);

	const activeFilterCount = countActiveTransactionFilters(filters);
	const isDateActive = Boolean(dateRange.startDate || dateRange.endDate);
	const isFilterActive = hasTransactionFilters(filters);
	const hasActiveReportFilters = isDateActive || isFilterActive;
	
	const isMobile = useMediaQuery(MOBILE_BREAKPOINT);

	const openFilterPopover = (): void => {
		setDraftFilters(filters);
		setFilterOpen(true);
	};

	const openCreateModal = (): void => {
		onClearSavedReportError();
		setEditingReport(null);
		setSaveModalSession((current) => {
			return current + 1;
		});
		setSaveModalOpen(true);
	};

	const openEditModal = (report: SavedReport): void => {
		onClearSavedReportError();
		setSavedReportsOpen(false);
		setEditingReport(report);
		setSaveModalSession((current) => {
			return current + 1;
		});
		setSaveModalOpen(true);
	};

	const modalConfiguration = editingReport ?? currentConfiguration;

	const isReportNameTaken = (name: string): boolean => {
		const normalizedName = normalizeReportName(name);

		return savedReports.some((report) => {
			return (
				report.id !== editingReport?.id &&
				normalizeReportName(report.name) === normalizedName
			);
		});
	};

	return (
		<>
			<header className="sticky top-0 z-50 -mx-3 -mt-3 flex flex-col gap-4 border-b border-gray-200/80 bg-[#f6f5f3]/95 px-3 py-3 backdrop-blur-md sm:-mx-5 sm:-mt-5 sm:px-5 lg:flex-row lg:items-center lg:justify-between dark:border-white/10 dark:bg-[#121212]/95">
				<nav className="flex items-center gap-6 overflow-x-auto">
					{!isMobile && (
						<h1 className="text-xl font-bold text-gray-950 dark:text-white">
							Reports
						</h1>
					)}

					{(["cash-flow", "spending", "income"] as const).map((item) => {
						return (
							<button
								key={item}
								type="button"
								onClick={() => {
									onTabChange(item);
								}}
								className={`whitespace-nowrap border-b-2 py-2 text-base font-semibold capitalize ${
									tab === item
										? "border-[#ff5a35] text-[#ff5a35]"
										: "border-transparent text-gray-500 dark:text-zinc-400"
								}`}
							>
								{item.replace("-", " ")}
							</button>
						);
					})}
				</nav>

				<div className="flex flex-wrap items-center gap-3">
					{hasActiveReportFilters && (
						<button
							type="button"
							onClick={onClearAll}
							className="mr-1 text-sm font-semibold text-cyan-600 transition-colors hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300"
						>
							Clear
						</button>
					)}

					<DateRangeButton
						value={dateRange}
						onChange={onDateRangeChange}
						active={isDateActive}
						variant="toolbar"
						onBeforeOpen={() => {
							setFilterOpen(false);
						}}
					/>

					<Popover.Root
						open={filterOpen}
						onOpenChange={(nextOpen) => {
							if (nextOpen) {
								openFilterPopover();
								return;
							}

							setFilterOpen(false);
						}}
						modal={false}
					>
						<Popover.Trigger asChild>
							<button
								type="button"
								className={`relative flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-semibold shadow-sm outline-none transition-colors ${
									isFilterActive
										? "border-[#FF5A35]/50 bg-[#FF5A35]/5 text-[#FF5A35]"
										: "border-gray-300 text-gray-900 hover:bg-gray-100 dark:border-white/20 dark:text-white dark:hover:bg-white/5"
								}`}
							>
								<Filter size={17} strokeWidth={2} />

								{activeFilterCount > 0
									? `Filters (${activeFilterCount})`
									: "Filters"}

								{isFilterActive && (
									<span
										aria-hidden="true"
										className="absolute -right-1 -top-1 size-2.5 rounded-full bg-[#FF5A35]"
									/>
								)}
							</button>
						</Popover.Trigger>

						<Popover.Portal>
							<Popover.Content
								align="end"
								side="bottom"
								sideOffset={14}
								collisionPadding={16}
								className="z-[9999] w-[min(900px,calc(100vw-24px))] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl outline-none dark:border-white/10 dark:bg-[#1b1b1b]"
							>
								<TransactionFilterPanel
									filters={draftFilters}
									setFilters={setDraftFilters}
									data={filterData}
									onClear={() => {
										setDraftFilters(EMPTY_TRANSACTION_FILTERS);
										onFiltersChange(EMPTY_TRANSACTION_FILTERS);
										setFilterOpen(false);
									}}
									onCancel={() => {
										setDraftFilters(filters);
										setFilterOpen(false);
									}}
									onApply={() => {
										onFiltersChange(draftFilters);
										setFilterOpen(false);
									}}
									applyDisabled={false}
								/>
							</Popover.Content>
						</Popover.Portal>
					</Popover.Root>

					<div className="mx-1 h-6 w-px bg-gray-300 dark:bg-white/20" />

					<DropdownMenu.Root
						open={savedReportsOpen}
						onOpenChange={setSavedReportsOpen}
						modal={false}
					>
						<DropdownMenu.Trigger asChild>
							<button
								type="button"
								className="flex h-10 items-center gap-2 rounded-xl border border-gray-300 px-4 text-sm font-semibold text-gray-900 shadow-sm outline-none transition-colors hover:bg-gray-100 dark:border-white/20 dark:text-white dark:hover:bg-white/5"
							>
								Reports
								<ChevronDown size={16} />
							</button>
						</DropdownMenu.Trigger>

						<DropdownMenu.Portal>
							<DropdownMenu.Content
								align="end"
								sideOffset={8}
								collisionPadding={12}
								className="z-[9999] min-w-[290px] overflow-hidden rounded-xl border border-gray-200 bg-white p-1.5 text-gray-900 shadow-2xl outline-none dark:border-white/10 dark:bg-[#202020] dark:text-white"
							>
								<div className="px-3 pb-2 pt-1 text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
									Saved reports
								</div>

								{areSavedReportsLoading ? (
									<div className="px-3 py-4 text-sm text-gray-500 dark:text-zinc-400">
										Loading saved reports…
									</div>
								) : savedReportError && savedReports.length === 0 ? (
									<div className="px-3 py-4 text-sm text-red-500 dark:text-red-300">
										{savedReportError}
									</div>
								) : savedReports.length === 0 ? (
									<div className="px-3 py-4 text-sm text-gray-500 dark:text-zinc-400">
										No saved reports yet.
									</div>
								) : (
									savedReports.map((report) => {
										return (
											<div
												key={report.id}
												className="flex items-center gap-1 rounded-lg"
											>
												<DropdownMenu.Item
													onSelect={() => {
														onLoadSavedReport(report);
													}}
													className="group flex min-w-0 flex-1 cursor-default items-center justify-between gap-4 rounded-lg px-3 py-2.5 outline-none data-[highlighted]:bg-gray-100 dark:data-[highlighted]:bg-white/5"
												>
													<div className="min-w-0">
														<p className="truncate text-sm font-semibold">
															{report.name}
														</p>
														<p className="mt-0.5 truncate text-xs text-gray-500 dark:text-zinc-400">
															{getSavedReportDateLabel(report.dateRange)}
														</p>
													</div>

													<Check
														size={16}
														className="shrink-0 opacity-0 transition-opacity group-data-[highlighted]:opacity-100"
													/>
												</DropdownMenu.Item>

												<DropdownMenu.Item
													asChild
													onSelect={(event) => {
														event.preventDefault();
														openEditModal(report);
													}}
												>
													<button
														type="button"
														aria-label={`Edit ${report.name}`}
														title="Edit saved report"
														className="grid size-9 shrink-0 place-items-center rounded-lg text-gray-500 outline-none transition-colors hover:bg-gray-100 hover:text-gray-900 data-[highlighted]:bg-gray-100 data-[highlighted]:text-gray-900 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white dark:data-[highlighted]:bg-white/5 dark:data-[highlighted]:text-white"
													>
														<Pencil size={15} />
													</button>
												</DropdownMenu.Item>
											</div>
										);
									})
								)}

								<DropdownMenu.Separator className="my-1 h-px bg-gray-200 dark:bg-white/10" />

								<DropdownMenu.Item className="cursor-default rounded-lg px-3 py-2.5 text-sm outline-none data-[highlighted]:bg-gray-100 dark:data-[highlighted]:bg-white/5">
									Manage reports
								</DropdownMenu.Item>
							</DropdownMenu.Content>
						</DropdownMenu.Portal>
					</DropdownMenu.Root>

					<button
						type="button"
						onClick={openCreateModal}
						disabled={isSavingReport}
						className="flex h-10 items-center gap-2 rounded-xl bg-[#FF5A35] px-4 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#E04825] disabled:cursor-not-allowed disabled:opacity-60"
					>
						<Bookmark size={16} />
						Save
					</button>
				</div>
			</header>

			<SavedReportModal
				key={saveModalSession}
				open={saveModalOpen}
				onOpenChange={(nextOpen) => {
					if (!isSavingReport) {
						setSaveModalOpen(nextOpen);
					}
				}}
				configuration={modalConfiguration}
				title={editingReport ? "Edit saved report" : "Create saved report"}
				submitLabel={editingReport ? "Save changes" : "Save"}
				initialName={editingReport?.name ?? ""}
				initialIncludeChartSettings={
					editingReport?.includeChartSettings ?? true
				}
				isSaving={isSavingReport}
				isDeleting={
					editingReport ? deletingReportId === editingReport.id : false
				}
				error={savedReportError}
				isReportNameTaken={isReportNameTaken}
				onDelete={
					editingReport
						? async () => {
								await onDeleteSavedReport(editingReport.id);
								setSaveModalOpen(false);
								setEditingReport(null);
							}
						: undefined
				}
				onSave={async (name, includeChartSettings) => {
					if (editingReport) {
						await onEditSavedReport(editingReport.id, name, {
							tab: editingReport.tab,
							dateRange: editingReport.dateRange,
							filters: editingReport.filters,
							view: editingReport.view,
							grouping: editingReport.grouping,
							interval: editingReport.interval,
							breakdownChart: editingReport.breakdownChart,
							trendChart: editingReport.trendChart,
							includeChartSettings,
						});
					} else {
						await onSaveReport(name, includeChartSettings);
					}

					setSaveModalOpen(false);
					setEditingReport(null);
				}}
			/>
		</>
	);
}

export { EMPTY_DATE_RANGE };
