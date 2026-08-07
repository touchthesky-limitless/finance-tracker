/**
 * Date picker component for selecting a starting date.
 */
"use client";

import { useMemo, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

interface RecurringDatePickerProps {
	value: string;
	onChange: (value: string) => void;
	disabled?: boolean;
}

interface CalendarCell {
	key: string;
	date: Date | null;
}

const MONTHS = Array.from({ length: 12 }, (_, monthIndex) => ({
	value: monthIndex,
	label: new Intl.DateTimeFormat("en-US", {
		month: "long",
		timeZone: "UTC",
	}).format(new Date(Date.UTC(2026, monthIndex, 1, 12))),
}));

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;

function toIsoDate(date: Date): string {
	return [
		date.getUTCFullYear(),
		String(date.getUTCMonth() + 1).padStart(2, "0"),
		String(date.getUTCDate()).padStart(2, "0"),
	].join("-");
}

function parseIsoDate(value: string): Date | null {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
	const [year, month, day] = value.split("-").map(Number);
	const date = new Date(Date.UTC(year, month - 1, day, 12));
	if (
		date.getUTCFullYear() !== year ||
		date.getUTCMonth() !== month - 1 ||
		date.getUTCDate() !== day
	)
		return null;
	return date;
}

function startOfMonth(date: Date): Date {
	return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 12));
}

function addMonths(date: Date, amount: number): Date {
	return new Date(
		Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1, 12),
	);
}

function sameDay(first: Date | null, second: Date | null): boolean {
	return Boolean(
		first &&
		second &&
		first.getUTCFullYear() === second.getUTCFullYear() &&
		first.getUTCMonth() === second.getUTCMonth() &&
		first.getUTCDate() === second.getUTCDate(),
	);
}

function buildCalendarCells(month: Date): CalendarCell[] {
	const year = month.getUTCFullYear();
	const monthIndex = month.getUTCMonth();
	const firstWeekday = new Date(Date.UTC(year, monthIndex, 1, 12)).getUTCDay();
	const dayCount = new Date(Date.UTC(year, monthIndex + 1, 0, 12)).getUTCDate();
	const cells: CalendarCell[] = [];
	for (let i = 0; i < firstWeekday; i++) {
		cells.push({ key: `leading-${i}`, date: null });
	}
	for (let day = 1; day <= dayCount; day++) {
		const date = new Date(Date.UTC(year, monthIndex, day, 12));
		cells.push({ key: toIsoDate(date), date });
	}
	while (cells.length % 7 !== 0) {
		cells.push({ key: `trailing-${cells.length}`, date: null });
	}
	return cells;
}

function formatDisplayDate(value: string): string {
	const date = parseIsoDate(value);
	if (!date) return "Select a starting date";
	return new Intl.DateTimeFormat("en-US", {
		month: "long",
		day: "numeric",
		year: "numeric",
		timeZone: "UTC",
	}).format(date);
}

export function RecurringDatePicker({
	value,
	onChange,
	disabled = false,
}: RecurringDatePickerProps) {
	const selectedDate = parseIsoDate(value);
	const [open, setOpen] = useState(false);
	const [visibleMonth, setVisibleMonth] = useState(() =>
		startOfMonth(selectedDate ?? new Date()),
	);

	const years = useMemo(() => {
		const currentYear = new Date().getFullYear();
		const selectedYear = selectedDate?.getUTCFullYear() ?? currentYear;
		const firstYear = Math.min(currentYear - 15, selectedYear - 8);
		const lastYear = Math.max(currentYear + 15, selectedYear + 8);
		return Array.from(
			{ length: lastYear - firstYear + 1 },
			(_, i) => firstYear + i,
		);
	}, [selectedDate]);

	const today = new Date();
	const utcToday = new Date(
		Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 12),
	);

	const selectDate = (date: Date): void => {
		onChange(toIsoDate(date));
		setOpen(false);
	};

	return (
		<Popover.Root
			open={open}
			onOpenChange={(nextOpen) => {
				if (nextOpen) {
					setVisibleMonth(startOfMonth(parseIsoDate(value) ?? utcToday));
				}
				setOpen(nextOpen);
			}}
			modal={false}
		>
			<Popover.Trigger asChild>
				<button
					type="button"
					disabled={disabled}
					className={`flex h-[60px] w-full items-center justify-between gap-4 rounded-xl border bg-white px-4 text-left text-lg font-semibold outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#20201f] ${
						open
							? "border-cyan-500 ring-2 ring-cyan-500/20"
							: "border-gray-300 hover:border-gray-400 dark:border-white/10 dark:hover:border-white/20"
					}`}
				>
					<span
						className={
							selectedDate
								? "text-gray-900 dark:text-white"
								: "text-gray-500 dark:text-gray-400"
						}
					>
						{formatDisplayDate(value)}
					</span>
					<CalendarDays
						size={21}
						className="shrink-0 text-gray-500 dark:text-gray-400"
					/>
				</button>
			</Popover.Trigger>

			<Popover.Portal>
				<Popover.Content
					side="bottom"
					align="start"
					sideOffset={10}
					collisionPadding={16}
					onCloseAutoFocus={(event) => event.preventDefault()}
					className="z-[1050] w-[360px] max-w-[calc(100vw-32px)] rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl outline-none dark:border-white/10 dark:bg-[#1d1d1c]"
				>
					<div className="flex items-center gap-2">
						<button
							type="button"
							aria-label="Previous month"
							onClick={() =>
								setVisibleMonth((current) => addMonths(current, -1))
							}
							className="grid size-10 shrink-0 place-items-center rounded-xl transition-colors hover:bg-gray-100 dark:hover:bg-white/7"
						>
							<ChevronLeft size={20} />
						</button>
						<select
							value={visibleMonth.getUTCMonth()}
							onChange={(event) => {
								setVisibleMonth(
									new Date(
										Date.UTC(
											visibleMonth.getUTCFullYear(),
											Number(event.target.value),
											1,
											12,
										),
									),
								);
							}}
							className="h-10 min-w-0 flex-1 rounded-xl border border-gray-300 bg-white px-3 text-sm font-semibold outline-none focus:border-cyan-500 dark:border-white/10 dark:bg-[#262625]"
						>
							{MONTHS.map((month) => (
								<option key={month.value} value={month.value}>
									{month.label}
								</option>
							))}
						</select>
						<select
							value={visibleMonth.getUTCFullYear()}
							onChange={(event) => {
								setVisibleMonth(
									new Date(
										Date.UTC(
											Number(event.target.value),
											visibleMonth.getUTCMonth(),
											1,
											12,
										),
									),
								);
							}}
							className="h-10 w-24 rounded-xl border border-gray-300 bg-white px-3 text-sm font-semibold outline-none focus:border-cyan-500 dark:border-white/10 dark:bg-[#262625]"
						>
							{years.map((year) => (
								<option key={year} value={year}>
									{year}
								</option>
							))}
						</select>
						<button
							type="button"
							aria-label="Next month"
							onClick={() =>
								setVisibleMonth((current) => addMonths(current, 1))
							}
							className="grid size-10 shrink-0 place-items-center rounded-xl transition-colors hover:bg-gray-100 dark:hover:bg-white/7"
						>
							<ChevronRight size={20} />
						</button>
					</div>

					<div className="mt-4 grid grid-cols-7 text-center text-xs font-semibold text-gray-500 dark:text-gray-400">
						{WEEKDAYS.map((weekday) => (
							<span key={weekday} className="py-2">
								{weekday}
							</span>
						))}
					</div>

					<div className="grid grid-cols-7 gap-1">
						{buildCalendarCells(visibleMonth).map((cell) => {
							if (!cell.date)
								return <span key={cell.key} className="aspect-square" />;
							const selected = sameDay(cell.date, selectedDate);
							const isToday = sameDay(cell.date, utcToday);
							return (
								<button
									key={cell.key}
									type="button"
									onClick={() => selectDate(cell.date as Date)}
									className={`grid aspect-square place-items-center rounded-xl text-sm font-semibold transition-colors ${
										selected
											? "bg-[#FF6633] text-white"
											: isToday
												? "border border-[#FF6633] text-[#FF6633] hover:bg-[#FF6633]/10"
												: "hover:bg-gray-100 dark:hover:bg-white/7"
									}`}
								>
									{cell.date.getUTCDate()}
								</button>
							);
						})}
					</div>

					<div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4 dark:border-white/10">
						<button
							type="button"
							onClick={() => selectDate(utcToday)}
							className="rounded-xl px-3 py-2 text-sm font-semibold text-cyan-600 transition-colors hover:bg-cyan-50 dark:text-cyan-400 dark:hover:bg-cyan-500/10"
						>
							Today
						</button>
						<Popover.Close asChild>
							<button
								type="button"
								className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold transition-colors hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/7"
							>
								Close
							</button>
						</Popover.Close>
					</div>

					<Popover.Arrow className="fill-white dark:fill-[#1d1d1c]" />
				</Popover.Content>
			</Popover.Portal>
		</Popover.Root>
	);
}
