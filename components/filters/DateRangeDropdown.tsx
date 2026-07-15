import { useState, memo } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, DateRange } from "react-day-picker";
import { format } from "date-fns";
import {
	CURRENT_YEAR,
	DEFAULT_YEAR_FILTER,
	TIME_PRESETS,
	YEARS,
} from "@/utils/formatters";

interface DateRangeDropdownProps {
	compact?: boolean;
	onApply?: (filterValue: string) => void;
}

export const DateRangeDropdown = memo(function DateRangeDropdown({
	compact = false,
	onApply,
}: DateRangeDropdownProps) {
	const [isOpen, setIsOpen] = useState(false);

	// Original Grid State
	const [tempYear, setTempYear] = useState<number>(CURRENT_YEAR);
	const [tempMonth, setTempMonth] = useState<string | null>(null);

	// New Range Picker State
	const [dateRange, setDateRange] = useState<DateRange | undefined>();
	const [activePreset, setActivePreset] = useState<string>(
		TIME_PRESETS.THIS_YEAR,
	);

	// Inject "Custom Range" into our local presets array
	const presets = [...Object.values(TIME_PRESETS), "Custom Range"];
	const months = [
		"Jan",
		"Feb",
		"Mar",
		"Apr",
		"May",
		"Jun",
		"Jul",
		"Aug",
		"Sep",
		"Oct",
		"Nov",
		"Dec",
	];

	const handlePresetClick = (preset: string) => {
		setActivePreset(preset);
		setTempMonth(null);

		// If they want a custom range, keep the popover open to let them pick dates
		if (preset === "Custom Range") {
			return;
		}

		setIsOpen(false);
		let filterValue = preset;

		if (preset === TIME_PRESETS.TODAY || preset === TIME_PRESETS.THIS_WEEK) {
			filterValue = `${preset}:${CURRENT_YEAR}`;
		} else if (preset === TIME_PRESETS.THIS_YEAR) {
			filterValue = DEFAULT_YEAR_FILTER;
		}

		if (onApply) {
			onApply(filterValue);
		}
	};

	const handleMonthSelect = (month: string) => {
		setTempMonth(month);
		setActivePreset("");
	};

	const handleApply = () => {
		setIsOpen(false);
		if (onApply) {
			if (activePreset === "Custom Range") {
				if (dateRange?.from) {
					const fromStr = format(dateRange.from, "MMM d, yyyy");
					const toStr = dateRange.to ? format(dateRange.to, "MMM d, yyyy") : "";
					onApply(toStr ? `${fromStr} - ${toStr}` : fromStr);
				} else {
					onApply(DEFAULT_YEAR_FILTER);
				}
			} else {
				const filterValue = tempMonth
					? `${tempMonth} ${tempYear}`
					: `Year ${tempYear}`;
				onApply(filterValue);
			}
		}
	};

	const handleReset = () => {
		if (activePreset === "Custom Range") {
			setDateRange(undefined);
		} else {
			setTempMonth(null);
			setTempYear(CURRENT_YEAR);
		}
	};

	// Generate Elements
	const presetElements = [];
	for (let i = 0; i < presets.length; i++) {
		const p = presets[i];
		presetElements.push(
			<button
				key={p}
				onClick={() => handlePresetClick(p)}
				className={`text-left px-3 py-2 text-xs font-semibold rounded-lg transition-colors
                    ${
											activePreset === p
												? "bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400"
												: "text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800"
										}
                `}
			>
				{p}
			</button>,
		);
	}

	const yearOptionsElements = [];
	for (let i = 0; i < YEARS.length; i++) {
		const year = YEARS[i];
		yearOptionsElements.push(
			<button
				key={year}
				onClick={() => {
					setTempYear(year);
					setActivePreset("");
				}}
				className={`px-2.5 py-1 rounded-md text-[10px] font-black transition-all ${
					tempYear === year
						? "bg-orange-500 text-white shadow-sm"
						: "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
				}`}
			>
				{year}
			</button>,
		);
	}

	const monthGridElements = [];
	for (let i = 0; i < months.length; i++) {
		const m = months[i];
		monthGridElements.push(
			<button
				key={m}
				onClick={() => handleMonthSelect(m)}
				className={`py-2 rounded-xl text-xs font-semibold transition-all border
                    ${
											tempMonth === m
												? "bg-orange-500 border-orange-500 text-white shadow-md"
												: "bg-white dark:bg-[#1a1a1a] border-gray-100 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
										}
                `}
			>
				{m}
			</button>,
		);
	}

	// Calculate Button Display Label
	let displayLabel = activePreset;
	if (activePreset === "Custom Range" && dateRange?.from) {
		if (dateRange.to) {
			displayLabel = `${format(dateRange.from, "MMM d")} - ${format(dateRange.to, "MMM d")}`;
		} else {
			displayLabel = format(dateRange.from, "MMM d, yyyy");
		}
	} else if (tempMonth) {
		displayLabel = `${tempMonth} ${tempYear}`;
	} else if (
		!activePreset ||
		(activePreset === "Custom Range" && !dateRange?.from)
	) {
		displayLabel = `Year ${CURRENT_YEAR}`;
	}

	return (
		<Popover.Root open={isOpen} onOpenChange={setIsOpen}>
			<Popover.Trigger asChild>
				<button
					className={`flex items-center gap-2 bg-white dark:bg-[#121212] border transition-all shadow-sm
                        ${compact ? "px-3 py-1.5 rounded-lg text-xs font-medium" : "px-4 py-2.5 rounded-xl text-sm font-semibold"}
                        ${
													isOpen
														? "border-orange-500 text-orange-600 dark:text-orange-500"
														: "border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1a1a1a]"
												}
                    `}
				>
					<Calendar
						size={compact ? 14 : 16}
						className={isOpen ? "text-orange-500" : "text-gray-500"}
					/>
					<span>{displayLabel}</span>
					<ChevronDown
						size={compact ? 14 : 16}
						className={`transition-transform duration-200 ${
							isOpen ? "rotate-180" : ""
						}`}
					/>
				</button>
			</Popover.Trigger>

			<Popover.Portal>
				<Popover.Content
					sideOffset={8}
					align="end"
					className="z-100 w-[calc(100vw-2rem)] sm:w-120 bg-white dark:bg-[#121212] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl flex flex-col sm:flex-row overflow-hidden animate-in fade-in zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=closed]:zoom-out-95"
				>
					{/* --- LEFT: PRESETS --- */}
					<div className="w-full sm:w-1/3 bg-gray-50 dark:bg-[#0d0d0d] border-b sm:border-b-0 sm:border-r border-gray-200 dark:border-gray-800 p-2 flex flex-col gap-1">
						<p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-3 pt-2 pb-1">
							Filters
						</p>
						{presetElements}
					</div>

					{/* --- RIGHT: DYNAMIC CONTENT --- */}
					<div className="w-full sm:w-2/3 p-4 flex flex-col h-full justify-between">
						{activePreset === "Custom Range" ? (
							<div className="flex justify-center mb-4 pb-2 border-b border-gray-100 dark:border-gray-800">
								<DayPicker
									mode="range"
									selected={dateRange}
									onSelect={setDateRange}
									showOutsideDays={true}
									// 1. THE FIX: Added "relative" here so buttons anchor to the calendar!
									className="font-sans relative"
									classNames={{
										months:
											"flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
										month: "space-y-4",
										month_caption:
											"flex justify-center relative items-center h-9",
										caption_label:
											"text-sm font-medium text-gray-900 dark:text-white",
										nav: "space-x-1 flex items-center",

										// 2. Updated to left-0/right-0 and top-1 for perfect alignment
										button_previous:
											"absolute left-0 top-1 z-10 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 border border-gray-200 dark:border-gray-700 rounded-md flex items-center justify-center",
										button_next:
											"absolute right-0 top-1 z-10 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 border border-gray-200 dark:border-gray-700 rounded-md flex items-center justify-center",

										// ... (Keep the rest of your table and day classes exactly the same)
										month_grid: "w-full border-collapse space-y-1",
										weekdays: "flex",
										weekday:
											"text-gray-500 rounded-md w-9 font-normal text-[0.8rem]",
										week: "flex w-full mt-2",
										day: "text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
										day_button:
											"h-9 w-9 p-0 font-normal rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100 transition-colors",
										selected:
											"bg-orange-600 text-white hover:bg-orange-600 focus:bg-orange-600 rounded-md",
										range_middle:
											"bg-orange-50 dark:bg-orange-500/20 text-orange-900 dark:text-orange-100 rounded-none",
										today:
											"bg-gray-100 dark:bg-gray-800 font-bold text-orange-600",
										outside: "text-gray-400 opacity-50",
										disabled: "text-gray-400 opacity-50",
									}}
									components={{
										Chevron: (props) => {
											if (props.orientation === "left") {
												return <ChevronLeft className="h-4 w-4" />;
											}
											return <ChevronRight className="h-4 w-4" />;
										},
									}}
								/>
							</div>
						) : (
							<div className="mb-4">
								<div className="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-gray-800 pb-3">
									<span className="text-[10px] font-bold text-gray-400 uppercase">
										Custom Year
									</span>
									<div className="flex gap-1.5">{yearOptionsElements}</div>
								</div>
								<div className="grid grid-cols-3 gap-2">
									{monthGridElements}
								</div>
							</div>
						)}

						{/* --- ACTION ROW --- */}
						<div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center mt-auto">
							<button
								onClick={handleReset}
								className="text-[10px] font-bold text-gray-400 hover:text-red-500 transition-colors"
							>
								Reset
							</button>
							<button
								onClick={handleApply}
								className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-bold rounded-lg hover:opacity-90 transition-opacity"
							>
								Apply Filter
							</button>
						</div>
					</div>
				</Popover.Content>
			</Popover.Portal>
		</Popover.Root>
	);
});
