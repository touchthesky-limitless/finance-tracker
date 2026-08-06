/**
 * CashFlowFilterMenu – Popover filter menu for accounts, tags, and hidden state.
 */
"use client";

import { useState, type ChangeEvent } from "react";
import * as Popover from "@radix-ui/react-popover";
import { ChevronDown } from "lucide-react";
import { MultiPicker } from "./MultiPicker";
import type { CashFlowFilters, HiddenMode } from "./types";
import type { Account } from "@/store/useBudgetStore";

const EMPTY_FILTERS: CashFlowFilters = {
	accountIds: [],
	tags: [],
	hidden: "visible",
};

function cloneFilters(filters: CashFlowFilters): CashFlowFilters {
	return {
		accountIds: [...filters.accountIds],
		tags: [...filters.tags],
		hidden: filters.hidden,
	};
}

function countFilters(filters: CashFlowFilters): number {
	return (
		filters.accountIds.length +
		filters.tags.length +
		(filters.hidden === "visible" ? 0 : 1)
	);
}

export function CashFlowFilterMenu({
	filters,
	accounts,
	tags,
	onApply,
}: {
	filters: CashFlowFilters;
	accounts: Account[];
	tags: string[];
	onApply: (filters: CashFlowFilters) => void;
}) {
	const [open, setOpen] = useState(false);
	const [draft, setDraft] = useState<CashFlowFilters>(() =>
		cloneFilters(filters),
	);
	const activeCount = countFilters(filters);

	const handleOpenChange = (nextOpen: boolean) => {
		setOpen(nextOpen);
		if (nextOpen) setDraft(cloneFilters(filters));
	};

	const handleReset = () => {
		setDraft(cloneFilters(EMPTY_FILTERS));
		if (activeCount > 0) onApply(cloneFilters(EMPTY_FILTERS));
		setOpen(false);
	};

	return (
		<Popover.Root open={open} onOpenChange={handleOpenChange}>
			<Popover.Trigger asChild>
				<button
					type="button"
					className="relative flex h-11 items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 font-semibold transition-colors hover:bg-gray-50 data-[state=open]:border-cyan-500 dark:border-white/15 dark:bg-[#232322] dark:hover:bg-white/7"
				>
					Filters
					<ChevronDown size={16} />
					{activeCount > 0 && (
						<span className="grid size-5 place-items-center rounded-full bg-[#FF6633] text-[11px] font-bold text-white">
							{activeCount}
						</span>
					)}
				</button>
			</Popover.Trigger>

			<Popover.Portal>
				<Popover.Content
					side="bottom"
					align="end"
					sideOffset={10}
					collisionPadding={12}
					className="z-[800] w-[500px] max-w-[calc(100vw-24px)] rounded-2xl border border-gray-200 bg-white shadow-2xl outline-none dark:border-white/10 dark:bg-[#232322]"
				>
					<div className="flex items-center justify-between border-b border-gray-200 px-6 py-5 dark:border-white/5">
						<button
							type="button"
							onClick={handleReset}
							className="rounded-xl border border-gray-300 px-4 py-2 font-semibold transition-colors hover:bg-gray-50 dark:border-white/15 dark:hover:bg-white/7"
						>
							Reset
						</button>
						<button
							type="button"
							onClick={() => {
								onApply(cloneFilters(draft));
								setOpen(false);
							}}
							className="rounded-xl bg-[#FF6633] px-5 py-2.5 font-bold text-white transition-colors hover:bg-[#E95424]"
						>
							Apply
						</button>
					</div>

					<div className="space-y-7 p-6">
						<MultiPicker
							label="Accounts"
							placeholder="All accounts"
							options={accounts
								.filter((a) => Boolean(a.id && a.name?.trim()))
								.map((a) => ({ value: a.id, label: a.name.trim() }))}
							values={draft.accountIds}
							onChange={(accountIds) =>
								setDraft((current) => ({ ...current, accountIds }))
							}
						/>

						<MultiPicker
							label="Tags"
							placeholder="All tags..."
							options={tags.map((tag) => ({ value: tag, label: tag }))}
							values={draft.tags}
							onChange={(nextTags) =>
								setDraft((current) => ({ ...current, tags: nextTags }))
							}
						/>

						<label className="block">
							<span className="mb-3 block text-base font-bold">Hidden</span>
							<select
								value={draft.hidden}
								onChange={(event: ChangeEvent<HTMLSelectElement>) => {
									setDraft((current) => ({
										...current,
										hidden: event.target.value as HiddenMode,
									}));
								}}
								className="h-14 w-full rounded-xl border border-gray-300 bg-transparent px-4 text-base outline-none transition-colors focus:border-cyan-500 dark:border-white/15 dark:bg-[#232322]"
							>
								<option value="visible">Not hidden only</option>
								<option value="hidden">Hidden only</option>
								<option value="all">Hidden and not hidden</option>
							</select>
						</label>
					</div>
				</Popover.Content>
			</Popover.Portal>
		</Popover.Root>
	);
}
