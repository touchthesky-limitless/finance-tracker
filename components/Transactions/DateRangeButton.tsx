"use client";

import { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

export interface DateRangeValue {
	startDate: string;
	endDate: string;
}

export interface DateRangeButtonProps {
	value: DateRangeValue;
	onChange: (value: DateRangeValue) => void;
	active?: boolean;
	variant?: "toolbar" | "filter";
	onBeforeOpen?: () => void;
}

type DatePreset =
	| "last-7"
	| "last-14"
	| "last-30"
	| "this-month"
	| "last-month"
	| "this-year"
	| "last-year";

interface CalendarDay {
	key: string;
	date: Date | null;
}

export const EMPTY_DATE_RANGE: DateRangeValue = {
	startDate: "",
	endDate: "",
};

const DATE_PRESETS: ReadonlyArray<{ value: DatePreset; label: string }> = [
	{ value: "last-7", label: "Last 7 days" },
	{ value: "last-14", label: "Last 14 days" },
	{ value: "last-30", label: "Last 30 days" },
	{ value: "this-month", label: "This month" },
	{ value: "last-month", label: "Last month" },
	{ value: "this-year", label: "This year" },
	{ value: "last-year", label: "Last year" },
];

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, monthIndex) => ({
	value: monthIndex,
	label: new Intl.DateTimeFormat("en-US", { month: "long" }).format(
		new Date(2026, monthIndex, 1),
	),
}));

function toIsoDate(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

interface DateSearchParamReader {
	get: (name: string) => string | null;
}

export function readDateParam(
	searchParams: DateSearchParamReader,
	key: "startDate" | "endDate",
): string {
	const value = searchParams.get(key)?.trim() ?? "";

	return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
}

function parseIsoDate(value: string): Date | null {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
		return null;
	}

	const [year, month, day] = value.split("-").map(Number);
	const date = new Date(year, month - 1, day);

	return Number.isNaN(date.getTime()) ? null : date;
}

function startOfMonth(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, amount: number): Date {
	return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function sameDate(first: Date | null, second: Date | null): boolean {
	return Boolean(
		first && second &&
		first.getFullYear() === second.getFullYear() &&
		first.getMonth() === second.getMonth() &&
		first.getDate() === second.getDate(),
	);
}

function isInsideRange(date: Date, start: Date | null, end: Date | null): boolean {
	if (!start || !end) return false;
	return date.getTime() > start.getTime() && date.getTime() < end.getTime();
}

export function dateRangesEqual(
	first: DateRangeValue,
	second: DateRangeValue,
): boolean {
	return (
		first.startDate === second.startDate &&
		first.endDate === second.endDate
	);
}

function getDatePreset(preset: DatePreset): DateRangeValue {
	const now = new Date();
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	if (preset === "last-7" || preset === "last-14" || preset === "last-30") {
		const count = preset === "last-7" ? 7 : preset === "last-14" ? 14 : 30;
		const start = new Date(today);
		start.setDate(start.getDate() - (count - 1));
		return { startDate: toIsoDate(start), endDate: toIsoDate(today) };
	}
	if (preset === "this-month") {
		return {
			startDate: toIsoDate(new Date(today.getFullYear(), today.getMonth(), 1)),
			endDate: toIsoDate(new Date(today.getFullYear(), today.getMonth() + 1, 0)),
		};
	}
	if (preset === "last-month") {
		return {
			startDate: toIsoDate(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
			endDate: toIsoDate(new Date(today.getFullYear(), today.getMonth(), 0)),
		};
	}
	const year = preset === "this-year" ? today.getFullYear() : today.getFullYear() - 1;
	return { startDate: `${year}-01-01`, endDate: `${year}-12-31` };
}

function buildCalendarDays(month: Date): CalendarDay[] {
	const year = month.getFullYear();
	const monthIndex = month.getMonth();
	const firstWeekday = new Date(year, monthIndex, 1).getDay();
	const count = new Date(year, monthIndex + 1, 0).getDate();
	const cells: CalendarDay[] = [];
	for (let index = 0; index < firstWeekday; index += 1) {
		cells.push({ key: `start-${index}`, date: null });
	}
	for (let day = 1; day <= count; day += 1) {
		const date = new Date(year, monthIndex, day);
		cells.push({ key: toIsoDate(date), date });
	}
	while (cells.length % 7 !== 0) cells.push({ key: `end-${cells.length}`, date: null });
	return cells;
}

function formatLabel(value: string, fallback: string): string {
	const date = parseIsoDate(value);
	if (!date) return fallback;
	return new Intl.DateTimeFormat("en-US", {
		month: "short", day: "numeric", year: "numeric",
	}).format(date);
}

function CalendarMonth({ month, draft, onMonthChange, onSelectDate }: {
	month: Date;
	draft: DateRangeValue;
	onMonthChange: (month: Date) => void;
	onSelectDate: (date: Date) => void;
}) {
	const start = parseIsoDate(draft.startDate);
	const end = parseIsoDate(draft.endDate);
	const years = Array.from({ length: 15 }, (_, index) => new Date().getFullYear() - 7 + index);
	return (
		<div className="min-w-0">
			<div className="mb-6 grid grid-cols-2 gap-3">
				<select value={month.getMonth()} onChange={(event) => {
					onMonthChange(new Date(month.getFullYear(), Number(event.target.value), 1));
				}} className="h-11 rounded-xl border border-gray-300 bg-white px-4 text-base font-semibold outline-none dark:border-white/15 dark:bg-[#222]">
					{MONTH_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
				</select>
				<select value={month.getFullYear()} onChange={(event) => {
					onMonthChange(new Date(Number(event.target.value), month.getMonth(), 1));
				}} className="h-11 rounded-xl border border-gray-300 bg-white px-4 text-base font-semibold outline-none dark:border-white/15 dark:bg-[#222]">
					{years.map((year) => <option key={year} value={year}>{year}</option>)}
				</select>
			</div>
			<div className="grid grid-cols-7 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
				{["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => <span key={day} className="py-2">{day}</span>)}
			</div>
			<div className="grid grid-cols-7">
				{buildCalendarDays(month).map((cell) => {
					if (!cell.date) return <span key={cell.key} className="aspect-square" />;
					const selected = sameDate(cell.date, start) || sameDate(cell.date, end);
					const inside = isInsideRange(cell.date, start, end);
					return (
						<button key={cell.key} type="button" onClick={() => onSelectDate(cell.date as Date)} className={`aspect-square border border-gray-200 text-base transition-colors dark:border-white/10 ${selected ? "bg-[#00A8D2] font-bold text-white" : inside ? "bg-cyan-50 text-cyan-900 dark:bg-cyan-500/15 dark:text-cyan-100" : "hover:bg-gray-100 dark:hover:bg-white/5"}`}>
							{cell.date.getDate()}
						</button>
					);
				})}
			</div>
		</div>
	);
}

export function DateRangeButton({ value, onChange, active = Boolean(value.startDate || value.endDate), variant = "toolbar", onBeforeOpen }: DateRangeButtonProps) {
	const [open, setOpen] = useState(false);
	const [draft, setDraft] = useState<DateRangeValue>(value);
	const [leftMonth, setLeftMonth] = useState(() => startOfMonth(parseIsoDate(value.startDate) ?? new Date()));
	const invalid = Boolean(draft.startDate && draft.endDate && draft.startDate > draft.endDate);

	const selectDate = (date: Date): void => {
		const iso = toIsoDate(date);
		setDraft((current) => {
			if (!current.startDate || current.endDate) return { startDate: iso, endDate: "" };
			if (iso < current.startDate) return { startDate: iso, endDate: current.startDate };
			return { ...current, endDate: iso };
		});
	};

	return (
		<Popover.Root open={open} onOpenChange={(nextOpen) => {
			if (nextOpen) {
				onBeforeOpen?.();
				setDraft(value);
				setLeftMonth(startOfMonth(parseIsoDate(value.startDate) ?? new Date()));
			}
			setOpen(nextOpen);
		}} modal={false}>
			<Popover.Trigger asChild>
				{variant === "toolbar" ? (
					<button data-toolbar-popover-trigger="date" type="button" className={`relative flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-semibold shadow-sm transition-colors ${active ? "border-[#FF5A35]/50 bg-[#FF5A35]/5 text-[#FF5A35]" : "border-gray-300 hover:bg-gray-100 dark:border-white/20 dark:hover:bg-white/5"}`}>
						<Calendar size={17} /><span>Date</span>
						{active && <span className="absolute -right-1 -top-1 size-2.5 rounded-full bg-[#FF5A35]" />}
					</button>
				) : (
					<button type="button" className={`grid h-13 w-full grid-cols-[1fr_auto_1fr] items-center rounded-xl border bg-white text-left text-base outline-none dark:bg-[#222] ${open ? "border-[#00A8D2] ring-2 ring-[#00A8D2]/15" : "border-gray-300 dark:border-white/15"}`}>
						<span className="truncate px-4 text-gray-500 dark:text-gray-400">{formatLabel(value.startDate, "Start date")}</span>
						<span className="text-xl text-gray-500">→</span>
						<span className="truncate px-4 text-gray-500 dark:text-gray-400">{formatLabel(value.endDate, "End date")}</span>
					</button>
				)}
			</Popover.Trigger>
			<Popover.Portal>
				<Popover.Content side="bottom" align={variant === "toolbar" ? "end" : "start"} sideOffset={10} collisionPadding={16} className="z-[9999] w-[min(930px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl outline-none dark:border-white/10 dark:bg-[#1B1B1B]">
					<div className="grid min-h-[500px] md:grid-cols-[205px_minmax(0,1fr)]">
						<div className="border-b border-gray-200 px-4 py-5 md:border-b-0 md:border-r dark:border-white/10">
							{DATE_PRESETS.map((preset) => {
								const range = getDatePreset(preset.value);
								return <button key={preset.value} type="button" onClick={() => { onChange(range); setDraft(range); setOpen(false); }} className={`block w-full rounded-lg px-3 py-2.5 text-left text-base font-medium ${dateRangesEqual(range, draft) ? "bg-[#FF5A35]/10 text-[#FF5A35]" : "hover:bg-gray-100 dark:hover:bg-white/5"}`}>{preset.label}</button>;
							})}
						</div>
						<div className="min-w-0 p-6">
							<div className="mb-4 flex justify-between">
								<button type="button" aria-label="Previous month" onClick={() => setLeftMonth((current) => addMonths(current, -1))} className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-white/5"><ChevronLeft size={20} /></button>
								<button type="button" aria-label="Next month" onClick={() => setLeftMonth((current) => addMonths(current, 1))} className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-white/5"><ChevronRight size={20} /></button>
							</div>
							<div className="grid gap-8 lg:grid-cols-2">
								<CalendarMonth month={leftMonth} draft={draft} onMonthChange={setLeftMonth} onSelectDate={selectDate} />
								<CalendarMonth month={addMonths(leftMonth, 1)} draft={draft} onMonthChange={(right) => setLeftMonth(addMonths(right, -1))} onSelectDate={selectDate} />
							</div>
							{invalid && <p className="mt-4 text-sm font-medium text-red-500">End date must be on or after the start date.</p>}
						</div>
					</div>
					<div className="flex items-center justify-between border-t border-gray-200 px-6 py-4 dark:border-white/10">
						<button type="button" onClick={() => { setDraft(EMPTY_DATE_RANGE); onChange(EMPTY_DATE_RANGE); setOpen(false); }} className="rounded-xl border border-gray-200 px-5 py-3 font-semibold dark:border-white/10">Clear</button>
						<div className="flex gap-3">
							<button type="button" onClick={() => { setDraft(value); setOpen(false); }} className="rounded-xl border border-gray-200 px-5 py-3 font-semibold dark:border-white/10">Cancel</button>
							<button type="button" disabled={invalid || dateRangesEqual(draft, value)} onClick={() => { if (!invalid) { onChange(draft); setOpen(false); } }} className="rounded-xl bg-[#FF5A35] px-5 py-3 font-bold text-white disabled:opacity-45">Apply</button>
						</div>
					</div>
				</Popover.Content>
			</Popover.Portal>
		</Popover.Root>
	);
}
