"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, ChevronDown } from "lucide-react";

import type {
	AllRecurringGroupMode,
	RecurringSortKey,
	RecurringSortState,
} from "@/components/Recurring/types";

export function SortableHeader({
	label,
	sortKey,
	sort,
	onSortChange,
	className = "",
}: {
	label: string;
	sortKey: RecurringSortKey;
	sort: RecurringSortState;
	onSortChange: (sort: RecurringSortState) => void;
	className?: string;
}) {
	const active = sort.key === sortKey;
	return (
		<button
			type="button"
			onClick={() => {
				onSortChange({
					key: sortKey,
					direction: active && sort.direction === "asc" ? "desc" : "asc",
				});
			}}
			className={`inline-flex items-center gap-1 text-left text-sm font-semibold text-gray-500 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-white ${className}`}
		>
			{label}
			{active && <span aria-hidden="true">{sort.direction === "asc" ? "↑" : "↓"}</span>}
		</button>
	);
}

const GROUP_OPTIONS: ReadonlyArray<{
	value: AllRecurringGroupMode;
	label: string;
}> = [
	{ value: "status", label: "By status" },
	{ value: "category", label: "By category" },
	{ value: "frequency", label: "By frequency" },
];

export function RecurringGroupingDropdown({
	value,
	onChange,
}: {
	value: AllRecurringGroupMode;
	onChange: (value: AllRecurringGroupMode) => void;
}) {
	const currentLabel = GROUP_OPTIONS.find((option) => option.value === value)?.label;
	return (
		<DropdownMenu.Root>
			<DropdownMenu.Trigger asChild>
				<button
					type="button"
					className="flex h-[52px] items-center gap-2 rounded-xl border border-gray-300 bg-white px-5 text-base font-bold text-gray-900 outline-none transition hover:bg-gray-50 data-[state=open]:border-cyan-500 dark:border-white/15 dark:bg-[#222221] dark:text-white dark:hover:bg-white/5"
				>
					{currentLabel}
					<ChevronDown size={18} />
				</button>
			</DropdownMenu.Trigger>
			<DropdownMenu.Portal>
				<DropdownMenu.Content
					align="end"
					sideOffset={10}
					className="z-[800] min-w-72 rounded-2xl border border-gray-200 bg-white p-3 shadow-2xl outline-none dark:border-white/15 dark:bg-[#232322]"
				>
					{GROUP_OPTIONS.map((option) => (
						<DropdownMenu.Item
							key={option.value}
							onSelect={() => onChange(option.value)}
							className="flex min-h-14 cursor-pointer items-center justify-between rounded-xl px-5 text-lg font-semibold text-gray-900 outline-none transition hover:bg-gray-100 dark:text-white dark:hover:bg-white/7"
						>
							{option.label}
							{value === option.value && <Check size={19} className="text-[#FF6633]" />}
						</DropdownMenu.Item>
					))}
				</DropdownMenu.Content>
			</DropdownMenu.Portal>
		</DropdownMenu.Root>
	);
}
