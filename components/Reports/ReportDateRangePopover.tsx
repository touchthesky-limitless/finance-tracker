"use client";

import { useMemo, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Calendar } from "lucide-react";

import type { ReportDateRange } from "@/components/Reports/types";

type DateMode = "last" | "range";
type DateUnit = "day" | "week" | "month" | "quarter" | "year";
type DatePreset =
	| "last-7"
	| "last-30"
	| "this-month"
	| "last-month"
	| "this-year"
	| "last-year";

const EMPTY_DATE_RANGE: ReportDateRange = {
	startDate: "",
	endDate: "",
};

const DATE_PRESETS: ReadonlyArray<{
	value: DatePreset;
	label: string;
}> = [
	{ value: "last-7", label: "Last 7 days" },
	{ value: "last-30", label: "Last 30 days" },
	{ value: "this-month", label: "This month" },
	{ value: "last-month", label: "Last month" },
	{ value: "this-year", label: "This year" },
	{ value: "last-year", label: "Last year" },
];

const DATE_UNITS: ReadonlyArray<{
	value: DateUnit;
	label: string;
}> = [
	{ value: "day", label: "Day" },
	{ value: "week", label: "Week" },
	{ value: "month", label: "Month" },
	{ value: "quarter", label: "Quarter" },
	{ value: "year", label: "Year" },
];

function toIsoDate(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");

	return `${year}-${month}-${day}`;
}

function getToday(): Date {
	const now = new Date();

	return new Date(
		now.getFullYear(),
		now.getMonth(),
		now.getDate(),
	);
}

function rangesEqual(
	first: ReportDateRange,
	second: ReportDateRange,
): boolean {
	return (
		first.startDate === second.startDate &&
		first.endDate === second.endDate
	);
}

function getPresetRange(preset: DatePreset): ReportDateRange {
	const today = getToday();

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
			startDate: toIsoDate(
				new Date(today.getFullYear(), today.getMonth(), 1),
			),
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
			endDate: toIsoDate(
				new Date(today.getFullYear(), today.getMonth(), 0),
			),
		};
	}

	const year =
		preset === "this-year"
			? today.getFullYear()
			: today.getFullYear() - 1;

	return {
		startDate: `${year}-01-01`,
		endDate: `${year}-12-31`,
	};
}

function getLastRange(
	numberValue: number,
	unit: DateUnit,
): ReportDateRange {
	const count = Math.max(1, Math.floor(numberValue));
	const today = getToday();
	const startDate = new Date(today);

	if (unit === "day") {
		startDate.setDate(startDate.getDate() - (count - 1));
	}

	if (unit === "week") {
		startDate.setDate(startDate.getDate() - (count * 7 - 1));
	}

	if (unit === "month") {
		startDate.setMonth(startDate.getMonth() - count);
		startDate.setDate(startDate.getDate() + 1);
	}

	if (unit === "quarter") {
		startDate.setMonth(startDate.getMonth() - count * 3);
		startDate.setDate(startDate.getDate() + 1);
	}

	if (unit === "year") {
		startDate.setFullYear(startDate.getFullYear() - count);
		startDate.setDate(startDate.getDate() + 1);
	}

	return {
		startDate: toIsoDate(startDate),
		endDate: toIsoDate(today),
	};
}

function DateInput({
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
		<label
			htmlFor={id}
			className="block text-sm font-semibold text-gray-700 dark:text-gray-200"
		>
			{label}

			<span className="mt-2 flex w-full min-w-0 rounded-xl border border-gray-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#222]">
				<input
					id={id}
					type="date"
					value={value}
					onChange={(event) => {
						onChange(event.target.value);
					}}
					className="block w-full min-w-0 border-0 bg-transparent p-0 text-base text-gray-900 outline-none dark:text-white dark:[color-scheme:dark]"
				/>
			</span>
		</label>
	);
}

export function ReportDateRangePopover({
	value,
	onChange,
}: {
	value: ReportDateRange;
	onChange: (value: ReportDateRange) => void;
}) {
	const [open, setOpen] = useState(false);
	const [mode, setMode] = useState<DateMode>("last");
	const [numberValue, setNumberValue] = useState("1");
	const [unit, setUnit] = useState<DateUnit>("month");
	const [draftRange, setDraftRange] =
		useState<ReportDateRange>(value);

	const invalidRange =
		Boolean(draftRange.startDate) &&
		Boolean(draftRange.endDate) &&
		draftRange.startDate > draftRange.endDate;

	const activePreset = useMemo(() => {
		return DATE_PRESETS.find((preset) => {
			return rangesEqual(getPresetRange(preset.value), draftRange);
		})?.value;
	}, [draftRange]);

	const initializeDraft = (): void => {
		setDraftRange(value);
		setMode("last");
		setNumberValue("1");
		setUnit("month");
	};

	const updateLastRange = (
		nextNumber: string,
		nextUnit: DateUnit,
	): void => {
		setNumberValue(nextNumber);
		setUnit(nextUnit);

		const parsedNumber = Number(nextNumber);

		if (!Number.isFinite(parsedNumber) || parsedNumber < 1) {
			return;
		}

		setDraftRange(getLastRange(parsedNumber, nextUnit));
	};

	return (
		<Popover.Root
			open={open}
			onOpenChange={(nextOpen) => {
				if (nextOpen) {
					initializeDraft();
				}

				setOpen(nextOpen);
			}}
			modal={false}
		>
			<Popover.Trigger asChild>
				<button
					type="button"
					aria-label="Choose report date range"
					className="flex h-11 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-900 shadow-sm outline-none transition-colors hover:bg-gray-50 data-[state=open]:border-cyan-500 data-[state=open]:ring-2 data-[state=open]:ring-cyan-500/15 dark:border-white/10 dark:bg-[#202020] dark:text-white dark:hover:bg-[#292929]"
				>
					<Calendar size={17} strokeWidth={2} />
					Date
				</button>
			</Popover.Trigger>

			<Popover.Portal>
				<Popover.Content
					align="end"
					side="bottom"
					sideOffset={8}
					collisionPadding={12}
					className="z-[140] w-[min(505px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-gray-200 bg-white text-gray-900 shadow-2xl outline-none dark:border-white/10 dark:bg-[#202020] dark:text-white"
				>
					<div className="flex h-14 items-center border-b border-gray-200 px-5 text-base font-bold dark:border-white/10">
						Date Range
					</div>

					<div className="grid min-h-[390px] grid-cols-[168px_minmax(0,1fr)]">
						<aside className="border-r border-gray-200 p-3 dark:border-white/10">
							<div className="space-y-1">
								<button
									type="button"
									onClick={() => {
										setMode("last");
									}}
									className={`w-full rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors ${
										mode === "last"
											? "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300"
											: "text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-white/5"
									}`}
								>
									Last
								</button>

								<button
									type="button"
									onClick={() => {
										setMode("range");
									}}
									className={`w-full rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors ${
										mode === "range"
											? "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300"
											: "text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-white/5"
									}`}
								>
									Range
								</button>
							</div>

							<div className="my-3 border-t border-gray-200 dark:border-white/10" />

							<div className="space-y-1">
								{DATE_PRESETS.map((preset) => {
									const selected =
										activePreset === preset.value;

									return (
										<button
											key={preset.value}
											type="button"
											onClick={() => {
												setMode("last");
												setDraftRange(
													getPresetRange(preset.value),
												);
											}}
											className={`w-full rounded-lg px-2 py-2 text-left text-sm font-semibold transition-colors ${
												selected
													? "bg-gray-100 text-gray-950 dark:bg-white/10 dark:text-white"
													: "text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-white/5"
											}`}
										>
											{preset.label}
										</button>
									);
								})}
							</div>
						</aside>

						<section className="p-5">
							{mode === "last" ? (
								<div>
									<label
										htmlFor="report-date-number"
										className="block text-sm font-semibold text-gray-700 dark:text-gray-200"
									>
										Number

										<input
											id="report-date-number"
											type="number"
											min={1}
											inputMode="numeric"
											value={numberValue}
											onChange={(event) => {
												updateLastRange(
													event.target.value,
													unit,
												);
											}}
											placeholder="Enter number"
											className="mt-2 h-12 w-full rounded-xl border border-gray-200 bg-transparent px-4 text-base outline-none placeholder:text-gray-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15 dark:border-white/10"
										/>
									</label>

									<fieldset className="mt-7">
										<legend className="text-sm font-semibold text-gray-700 dark:text-gray-200">
											Unit
										</legend>

										<div className="mt-2 space-y-3">
											{DATE_UNITS.map((option) => {
												return (
													<label
														key={option.value}
														className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-gray-700 dark:text-gray-200"
													>
														<input
															type="radio"
															name="report-date-unit"
															value={option.value}
															checked={
																unit === option.value
															}
															onChange={() => {
																updateLastRange(
																	numberValue,
																	option.value,
																);
															}}
															className="size-5 border-gray-300 text-[#ff5a35] focus:ring-[#ff5a35]/25 dark:border-white/20 dark:bg-transparent"
														/>

														{option.label}
													</label>
												);
											})}
										</div>
									</fieldset>
								</div>
							) : (
								<div className="space-y-5">
									<DateInput
										id="report-start-date"
										label="Start date"
										value={draftRange.startDate}
										onChange={(startDate) => {
											setDraftRange((current) => ({
												...current,
												startDate,
											}));
										}}
									/>

									<DateInput
										id="report-end-date"
										label="End date"
										value={draftRange.endDate}
										onChange={(endDate) => {
											setDraftRange((current) => ({
												...current,
												endDate,
											}));
										}}
									/>

									{invalidRange && (
										<p className="text-sm font-medium text-red-500">
											End date must be on or after the start date.
										</p>
									)}
								</div>
							)}
						</section>
					</div>

					<footer className="flex items-center justify-between border-t border-gray-200 px-5 py-4 dark:border-white/10">
						<button
							type="button"
							onClick={() => {
								setDraftRange(EMPTY_DATE_RANGE);
								onChange(EMPTY_DATE_RANGE);
								setOpen(false);
							}}
							className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100 dark:border-white/10 dark:bg-white/5 dark:text-gray-200 dark:hover:bg-white/10"
						>
							Clear
						</button>

						<div className="flex items-center gap-3">
							<button
								type="button"
								onClick={() => {
									setDraftRange(value);
									setOpen(false);
								}}
								className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-50 dark:border-white/10 dark:bg-[#222] dark:text-white dark:hover:bg-white/5"
							>
								Cancel
							</button>

							<button
								type="button"
								disabled={invalidRange}
								onClick={() => {
									onChange(draftRange);
									setOpen(false);
								}}
								className="rounded-lg bg-[#A94729] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#92391f] disabled:cursor-not-allowed disabled:opacity-45"
							>
								Apply
							</button>
						</div>
					</footer>
				</Popover.Content>
			</Popover.Portal>
		</Popover.Root>
	);
}
