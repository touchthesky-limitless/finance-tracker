import { useState, memo } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Calendar, ChevronDown } from "lucide-react";
import {
	CURRENT_YEAR,
	DEFAULT_YEAR_FILTER,
	TIME_PRESETS,
	YEARS,
} from "@/utils/formatters";

interface DateRangeDropdownProps {
	compact?: boolean;
	onApply?: (month: string | null) => void;
}

export const DateRangeDropdown = memo(function DateRangeDropdown({
	compact = false,
	onApply,
}: DateRangeDropdownProps) {
	const [isOpen, setIsOpen] = useState(false);

	const [tempYear, setTempYear] = useState<number>(CURRENT_YEAR);
	const [tempMonth, setTempMonth] = useState<string | null>(null);
	const [activePreset, setActivePreset] = useState<string>(
		TIME_PRESETS.THIS_YEAR,
	);

	const presets = Object.values(TIME_PRESETS);
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
			const filterValue = tempMonth
				? `${tempMonth} ${tempYear}`
				: `Year ${tempYear}`;
			onApply(filterValue);
		}
	};

	const presetElements = [];
	for (let i = 0; i < presets.length; i++) {
		const p = presets[i];
		presetElements.push(
			<button
				key={p}
				onClick={() => {
					handlePresetClick(p);
				}}
				className={`text-left px-3 py-2 text-xs font-semibold rounded-lg transition-colors
                    ${activePreset === p ? "bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400" : "text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800"}
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
				className={`px-2.5 py-1 rounded-md text-[10px] font-black transition-all ${tempYear === year ? "bg-orange-500 text-white shadow-sm" : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"}`}
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
				onClick={() => {
					handleMonthSelect(m);
				}}
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

	return (
		<Popover.Root open={isOpen} onOpenChange={setIsOpen}>
			<Popover.Trigger asChild>
				<button
					className={`flex items-center gap-2 bg-white dark:bg-[#121212] border transition-all shadow-sm
                        ${compact ? "px-3 py-1.5 rounded-lg text-xs font-medium" : "px-4 py-2.5 rounded-xl text-sm font-semibold"}
                        ${isOpen ? "border-orange-500 text-orange-600 dark:text-orange-500" : "border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1a1a1a]"}
                    `}
				>
					<Calendar
						size={compact ? 14 : 16}
						className={isOpen ? "text-orange-500" : "text-gray-500"}
					/>
					<span>
						{tempMonth
							? `${tempMonth} ${tempYear}`
							: activePreset || `Year ${tempYear}`}
					</span>
					<ChevronDown
						size={compact ? 14 : 16}
						className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
					/>
				</button>
			</Popover.Trigger>

			<Popover.Portal>
				<Popover.Content
					sideOffset={8}
					align="end"
					className="z-10000 w-[calc(100vw-2rem)] sm:w-120 max-w-[480px] bg-white dark:bg-[#121212] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl flex flex-col sm:flex-row overflow-hidden animate-in fade-in zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=closed]:zoom-out-95"
				>
					{/* --- LEFT: PRESETS --- */}
					<div className="w-full sm:w-1/3 bg-gray-50 dark:bg-[#0d0d0d] border-b sm:border-b-0 sm:border-r border-gray-200 dark:border-gray-800 p-2 flex flex-col gap-1">
						<p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-3 pt-2 pb-1">
							Presets
						</p>
						{presetElements}
					</div>

					{/* --- RIGHT: DYNAMIC SELECTOR --- */}
					<div className="w-full sm:w-2/3 p-4">
						<div className="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-gray-800 pb-3">
							<span className="text-[10px] font-bold text-gray-400 uppercase">
								Custom Year
							</span>
							<div className="flex gap-1.5">{yearOptionsElements}</div>
						</div>
						<div className="grid grid-cols-3 gap-2">{monthGridElements}</div>

						<div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
							<button
								onClick={() => {
									setTempMonth(null);
									setTempYear(CURRENT_YEAR);
								}}
								className="text-[10px] font-bold text-gray-400 hover:text-red-500"
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
