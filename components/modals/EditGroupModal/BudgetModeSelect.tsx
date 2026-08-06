/**
 * Dropdown menu for selecting the budget mode (by group or by category).
 * Used inside the EditGroupModal.
 */

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, ChevronDown } from "lucide-react";
import type { GroupBudgetMode } from "@/lib/categories/categoryPreferences";

interface BudgetModeSelectProps {
	value: GroupBudgetMode;
	onChange: (value: GroupBudgetMode) => void;
}

export function BudgetModeSelect({ value, onChange }: BudgetModeSelectProps) {
	const label = value === "group" ? "By group" : "By category";
	const options: ReadonlyArray<{ value: GroupBudgetMode; label: string }> = [
		{ value: "category", label: "By category" },
		{ value: "group", label: "By group" },
	];

	return (
		<DropdownMenu.Root modal={false}>
			<DropdownMenu.Trigger asChild>
				<button
					type="button"
					className="flex h-14 w-full items-center justify-between rounded-xl border border-gray-300 bg-transparent px-4 text-left text-lg font-semibold outline-none transition-colors focus:border-cyan-500 data-[state=open]:border-cyan-500 data-[state=open]:ring-2 data-[state=open]:ring-cyan-500/15 dark:border-white/15"
				>
					<span>{label}</span>
					<ChevronDown
						size={20}
						className="transition-transform data-[state=open]:rotate-180"
					/>
				</button>
			</DropdownMenu.Trigger>

			<DropdownMenu.Portal>
				<DropdownMenu.Content
					align="start"
					side="bottom"
					sideOffset={8}
					collisionPadding={16}
					className="z-[1300] w-[var(--radix-dropdown-menu-trigger-width)] rounded-xl border border-gray-200 bg-white p-2 shadow-2xl outline-none dark:border-white/10 dark:bg-[#2a2a28]"
				>
					{options.map((option) => {
						const selected = option.value === value;
						return (
							<DropdownMenu.Item
								key={option.value}
								onSelect={() => onChange(option.value)}
								className={`flex h-12 cursor-pointer items-center rounded-lg px-4 font-semibold outline-none transition-colors ${
									selected
										? "bg-cyan-50 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300"
										: "data-[highlighted]:bg-gray-50 dark:data-[highlighted]:bg-white/7"
								}`}
							>
								<span>{option.label}</span>
								{selected && <Check size={18} className="ml-auto" />}
							</DropdownMenu.Item>
						);
					})}
				</DropdownMenu.Content>
			</DropdownMenu.Portal>
		</DropdownMenu.Root>
	);
}
