"use client";

import { useState, type FormEvent } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { LoaderCircle, Trash2, X } from "lucide-react";

import { formatDateRangeLabel } from "@/components/Reports/reportUtils";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type {
	ReportDateRange,
	SavedReportConfiguration,
} from "@/components/Reports/types";

function toIsoDate(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");

	return `${year}-${month}-${day}`;
}

function dateRangesEqual(
	first: ReportDateRange,
	second: ReportDateRange,
): boolean {
	return (
		first.startDate === second.startDate && first.endDate === second.endDate
	);
}

function getPresetDateRange(
	preset:
		| "last-7"
		| "last-30"
		| "this-month"
		| "last-month"
		| "this-year"
		| "last-year",
): ReportDateRange {
	const now = new Date();
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

	if (preset === "last-7" || preset === "last-30") {
		const dayCount = preset === "last-7" ? 7 : 30;
		const startDate = new Date(today);

		startDate.setDate(startDate.getDate() - (dayCount - 1));

		return {
			startDate: toIsoDate(startDate),
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

export function getSavedReportDateLabel(dateRange: ReportDateRange): string {
	if (!dateRange.startDate && !dateRange.endDate) {
		return "All time";
	}

	const presets = [
		["Last 7 days", getPresetDateRange("last-7")],
		["Last 30 days", getPresetDateRange("last-30")],
		["This month", getPresetDateRange("this-month")],
		["Last month", getPresetDateRange("last-month")],
		["This year", getPresetDateRange("this-year")],
		["Last year", getPresetDateRange("last-year")],
	] as const;

	for (const [label, range] of presets) {
		if (dateRangesEqual(dateRange, range)) {
			return label;
		}
	}

	return formatDateRangeLabel(dateRange.startDate, dateRange.endDate);
}

function titleCase(value: string): string {
	return value
		.split("-")
		.map((part) => {
			return part.charAt(0).toUpperCase() + part.slice(1);
		})
		.join(" ");
}

function getChartSettingLabels(
	configuration: SavedReportConfiguration,
): string[] {
	const chartLabel =
		configuration.tab === "cash-flow" && configuration.view === "breakdown"
			? "Sankey"
			: configuration.view === "breakdown"
				? titleCase(configuration.breakdownChart)
				: titleCase(configuration.trendChart);

	const groupingLabel =
		configuration.tab === "cash-flow" && configuration.grouping === "category"
			? "By category & group"
			: configuration.grouping === "fixed-flexible"
				? "By fixed / flexible"
				: `By ${configuration.grouping}`;

	return [
		titleCase(configuration.tab),
		titleCase(configuration.view),
		chartLabel,
		groupingLabel,
	];
}

export function SavedReportModal({
	open,
	onOpenChange,
	configuration,
	title = "Create saved report",
	submitLabel = "Save",
	initialName = "",
	initialIncludeChartSettings = true,
	isSaving,
	isDeleting = false,
	error,
	isReportNameTaken,
	onSave,
	onDelete,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	configuration: SavedReportConfiguration;
	title?: string;
	submitLabel?: string;
	initialName?: string;
	initialIncludeChartSettings?: boolean;
	isSaving: boolean;
	isDeleting?: boolean;
	error: string | null;
	isReportNameTaken: (name: string) => boolean;
	onSave: (name: string, includeChartSettings: boolean) => Promise<void>;
	onDelete?: () => Promise<void>;
}) {
	const [reportName, setReportName] = useState(initialName);
	const [includeChartSettings, setIncludeChartSettings] = useState(
		initialIncludeChartSettings,
	);
	const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

	const chartSettingLabels = getChartSettingLabels(configuration);
	const cleanName = reportName.trim();
	const duplicateName = Boolean(cleanName) && isReportNameTaken(cleanName);
	const isBusy = isSaving || isDeleting;

	const handleSubmit = async (
		event: FormEvent<HTMLFormElement>,
	): Promise<void> => {
		event.preventDefault();

		if (!cleanName || duplicateName || isBusy) {
			return;
		}

		await onSave(cleanName, includeChartSettings);
	};

	return (
		<>
			<Dialog.Root
				open={open}
				onOpenChange={(nextOpen) => {
					if (!isBusy) {
						onOpenChange(nextOpen);
					}
				}}
			>
				<Dialog.Portal>
					<Dialog.Overlay className="fixed inset-0 z-[190] bg-black/55 backdrop-blur-[1px] data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />

					<Dialog.Content
						onEscapeKeyDown={(event) => {
							if (isBusy) {
								event.preventDefault();
							}
						}}
						onPointerDownOutside={(event) => {
							if (isBusy) {
								event.preventDefault();
							}
						}}
						className="fixed left-1/2 top-1/2 z-[200] w-[min(760px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-gray-200 bg-white text-gray-950 shadow-2xl outline-none dark:border-white/10 dark:bg-[#202020] dark:text-white"
					>
						<form onSubmit={handleSubmit}>
							<header className="flex min-h-20 items-center justify-between border-b border-gray-200 px-7 dark:border-white/10">
								<Dialog.Title className="text-xl font-bold">
									{title}
								</Dialog.Title>

								<button
									type="button"
									disabled={isBusy}
									onClick={() => {
										onOpenChange(false);
									}}
									aria-label="Close saved report dialog"
									className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white"
								>
									<X size={24} />
								</button>
							</header>

							<div className="space-y-8 px-7 py-8">
								<label className="block text-base font-semibold">
									Report name
									<input
										value={reportName}
										onChange={(event) => {
											setReportName(event.target.value);
										}}
										autoFocus
										disabled={isBusy}
										placeholder="Enter report name"
										aria-invalid={duplicateName}
										className="mt-3 h-14 w-full rounded-xl border border-gray-200 bg-transparent px-4 text-base outline-none placeholder:text-gray-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15 disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-red-500 aria-invalid:focus:border-red-500 aria-invalid:focus:ring-red-500/15 dark:border-white/10"
									/>
									{duplicateName && (
										<span className="mt-2 block text-sm font-medium text-red-500 dark:text-red-300">
											A saved report with this name already exists.
										</span>
									)}
								</label>

								<section>
									<h3 className="text-base font-semibold">Dates</h3>

									<div className="mt-3">
										<span className="inline-flex rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-800 dark:bg-white/5 dark:text-gray-200">
											{getSavedReportDateLabel(configuration.dateRange)}
										</span>
									</div>
								</section>

								<section>
									<h3 className="text-base font-semibold">Other</h3>

									<div className="mt-3">
										<span className="inline-flex rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-800 dark:bg-white/5 dark:text-gray-200">
											Non-hidden transactions only
										</span>
									</div>
								</section>

								<section className="rounded-xl border border-gray-200 p-5 dark:border-white/10">
									<div className="flex items-center justify-between gap-5">
										<h3 className="text-base font-semibold">
											Include report chart settings
										</h3>

										<button
											type="button"
											role="switch"
											aria-checked={includeChartSettings}
											disabled={isBusy}
											onClick={() => {
												setIncludeChartSettings((current) => {
													return !current;
												});
											}}
											className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
												includeChartSettings
													? "bg-[#ff5a35]"
													: "bg-gray-300 dark:bg-white/15"
											}`}
										>
											<span
												className={`absolute top-1 size-5 rounded-full bg-white shadow transition-transform ${
													includeChartSettings
														? "translate-x-6"
														: "translate-x-1"
												}`}
											/>
										</button>
									</div>

									<div
										className={`mt-5 flex flex-wrap gap-2 transition-opacity ${
											includeChartSettings ? "opacity-100" : "opacity-40"
										}`}
									>
										{chartSettingLabels.map((label) => {
											return (
												<span
													key={label}
													className="rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 dark:bg-white/5 dark:text-gray-300"
												>
													{label}
												</span>
											);
										})}
									</div>
								</section>

								{error && (
									<p
										role="alert"
										className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300"
									>
										{error}
									</p>
								)}
							</div>

							<footer className="flex flex-col-reverse gap-3 border-t border-gray-200 px-7 py-5 sm:flex-row sm:items-center sm:justify-between dark:border-white/10">
								<div>
									{onDelete && (
										<button
											type="button"
											disabled={isBusy}
											onClick={() => {
												onOpenChange(false);
												setDeleteConfirmOpen(true);
											}}
											className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-5 py-3 text-base font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto dark:border-red-500/25 dark:bg-[#222] dark:text-red-300 dark:hover:bg-red-500/10"
										>
											<Trash2 size={17} />
											Delete
										</button>
									)}
								</div>

								<div className="flex flex-col-reverse gap-3 sm:flex-row">
									<button
										type="button"
										disabled={isBusy}
										onClick={() => {
											onOpenChange(false);
										}}
										className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-base font-semibold text-gray-900 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-[#222] dark:text-white dark:hover:bg-white/5"
									>
										Cancel
									</button>

									<button
										type="submit"
										disabled={!cleanName || duplicateName || isBusy}
										className="inline-flex min-w-24 items-center justify-center gap-2 rounded-xl bg-[#a94729] px-5 py-3 text-base font-bold text-white transition-colors hover:bg-[#92391f] disabled:cursor-not-allowed disabled:opacity-45"
									>
										{isSaving && (
											<LoaderCircle size={18} className="animate-spin" />
										)}

										{isSaving ? "Saving…" : submitLabel}
									</button>
								</div>
							</footer>
						</form>
					</Dialog.Content>
				</Dialog.Portal>
			</Dialog.Root>

			{deleteConfirmOpen && onDelete && (
				<ConfirmDialog
					title="Delete saved report?"
					description={
						<>
							This will permanently delete{" "}
							<strong className="font-semibold text-gray-900 dark:text-white">
								{initialName}
							</strong>
							. This action cannot be undone.
						</>
					}
					confirmLabel="Delete report"
					confirmVariant="danger"
					icon={<Trash2 size={20} />}
					isLoading={isDeleting}
					autoFocusConfirm={false}
					closeOnBackdrop={false}
					onCancel={() => {
						if (isDeleting) {
							return;
						}

						setDeleteConfirmOpen(false);
						onOpenChange(true);
					}}
					onConfirm={async () => {
						try {
							await onDelete();
							setDeleteConfirmOpen(false);
						} catch {
							setDeleteConfirmOpen(false);
							onOpenChange(true);
						}
					}}
				/>
			)}
		</>
	);
}
