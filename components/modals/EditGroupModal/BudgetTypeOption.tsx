/**
 * Radio‑style option for selecting a budget type (fixed / flexible / non‑monthly).
 * Used inside the EditGroupModal when budget mode is "group".
 */

import type { GroupBudgetType } from "@/lib/categories/categoryPreferences";

interface BudgetTypeOptionProps {
	value: GroupBudgetType;
	selected: boolean;
	title: string;
	description: string;
	onSelect: (value: GroupBudgetType) => void;
}

export function BudgetTypeOption({
	value,
	selected,
	title,
	description,
	onSelect,
}: BudgetTypeOptionProps) {
	return (
		<button
			type="button"
			role="radio"
			aria-checked={selected}
			onClick={() => onSelect(value)}
			className="flex w-full items-start gap-4 border-b border-gray-200 p-5 text-left last:border-b-0 hover:bg-gray-50 dark:border-white/5 dark:hover:bg-white/[0.035]"
		>
			<span
				className={`mt-1 grid size-7 shrink-0 place-items-center rounded-full border ${
					selected ? "border-[#FF6633] bg-[#FF6633]" : "border-gray-400"
				}`}
			>
				{selected && <span className="size-2.5 rounded-full bg-[#232322]" />}
			</span>
			<span>
				<span className="block text-lg font-bold">{title}</span>
				<span className="mt-1 block text-base leading-7 text-gray-600 dark:text-gray-300">
					{description}
				</span>
			</span>
		</button>
	);
}
