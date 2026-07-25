"use client";

import { useMemo, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Filter } from "lucide-react";

import { TransactionFilterPanel } from "@/components/Transactions/TransactionFilterPanel";
import {
	EMPTY_TRANSACTION_FILTERS,
	type TransactionFilterData,
	type TransactionFilterOption,
	type TransactionFilters,
} from "@/components/Transactions/transactionFilters";
import type {
	RecurringFilters,
	RecurringFrequency,
	RecurringType,
} from "@/components/Recurring/types";
import { EMPTY_RECURRING_FILTERS } from "@/components/Recurring/types";
import {
	countRecurringFilters,
	getFrequencyLabel,
	getTypeLabel,
	RECURRING_FREQUENCIES,
} from "@/components/Recurring/recurringUtils";

interface RecurringFilterPopoverProps {
	filters: RecurringFilters;
	data: TransactionFilterData;
	onApply: (filters: RecurringFilters) => void;
}

export function RecurringFilterPopover({
	filters,
	data,
	onApply,
}: RecurringFilterPopoverProps) {
	const [open, setOpen] = useState(false);
	const appliedCount = countRecurringFilters(filters);
	const signature = JSON.stringify(filters);
	return (
		<Popover.Root open={open} onOpenChange={setOpen}>
			<Popover.Trigger asChild>
				<button
					type="button"
					className="flex h-[52px] items-center gap-3 rounded-xl border border-gray-300 bg-white px-5 text-base font-bold text-gray-900 outline-none transition hover:bg-gray-50 data-[state=open]:border-cyan-500 dark:border-white/15 dark:bg-[#222221] dark:text-white dark:hover:bg-white/5"
				>
					<Filter size={19} /> Filters
					{appliedCount > 0 && (
						<span className="grid size-5 place-items-center rounded-full bg-[#FF6633] text-[11px] font-bold text-white">
							{appliedCount}
						</span>
					)}
				</button>
			</Popover.Trigger>
			<Popover.Portal>
				<Popover.Content
					side="bottom"
					align="end"
					sideOffset={12}
					collisionPadding={12}
					className="z-[700] w-[min(780px,calc(100vw-24px))] max-h-[min(680px,calc(100vh-96px))] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl outline-none dark:border-white/10 dark:bg-[#222221]"
				>
					<RecurringFilterSession
						key={signature}
						filters={filters}
						data={data}
						onApply={(next) => {
							onApply(next);
							setOpen(false);
						}}
						onCancel={() => setOpen(false)}
					/>
				</Popover.Content>
			</Popover.Portal>
		</Popover.Root>
	);
}

function RecurringFilterSession({
	filters,
	data,
	onApply,
	onCancel,
}: RecurringFilterPopoverProps & { onCancel: () => void }) {
	const [draft, setDraft] = useState(filters);
	const [transactionDraft, setTransactionDraft] = useState<TransactionFilters>(
		() => ({
			...EMPTY_TRANSACTION_FILTERS,
			categoryNames: filters.categoryIds,
			accountNames: filters.accountIds,
		}),
	);
	const typeOptions = useMemo<TransactionFilterOption[]>(
		() =>
			(["income", "expense", "credit-card"] as const).map((value) => ({
				value,
				label: getTypeLabel(value),
			})),
		[],
	);
	const frequencyOptions = useMemo<TransactionFilterOption[]>(
		() =>
			RECURRING_FREQUENCIES.map((value) => ({
				value,
				label: getFrequencyLabel(value),
			})),
		[],
	);
	const toggle = <T extends string>(values: T[], value: T): T[] =>
		values.includes(value)
			? values.filter((item) => item !== value)
			: [...values, value];
	const customSections = [
		{
			id: "recurring-type",
			label: "Type",
			selectedGroupLabel: "Type",
			options: typeOptions,
			selectedValues: draft.types,
			onToggle: (value: string) =>
				setDraft((current) => ({
					...current,
					types: toggle(current.types, value as RecurringType),
				})),
			onClear: () => setDraft((current) => ({ ...current, types: [] })),
		},
		{
			id: "recurring-frequency",
			label: "Frequency",
			selectedGroupLabel: "Frequency",
			options: frequencyOptions,
			selectedValues: draft.frequencies,
			onToggle: (value: string) =>
				setDraft((current) => ({
					...current,
					frequencies: toggle(current.frequencies, value as RecurringFrequency),
				})),
			onClear: () => setDraft((current) => ({ ...current, frequencies: [] })),
		},
	];
	const combinedDraft: RecurringFilters = {
		...draft,
		accountIds: transactionDraft.accountNames,
		categoryIds: transactionDraft.categoryNames,
	};
	const dirty = JSON.stringify(combinedDraft) !== JSON.stringify(filters);
	return (
		<TransactionFilterPanel
			filters={transactionDraft}
			setFilters={setTransactionDraft}
			data={data}
			visibleSections={["accounts", "categories"]}
			customSections={customSections}
			sectionOrder={[
				"recurring-type",
				"accounts",
				"categories",
				"recurring-frequency",
			]}
			initialSectionId="recurring-type"
			allowEmptyClear
			onClear={() => {
				setDraft(EMPTY_RECURRING_FILTERS);
				setTransactionDraft(EMPTY_TRANSACTION_FILTERS);
				if (countRecurringFilters(combinedDraft) === 0) onCancel();
			}}
			onCancel={onCancel}
			onApply={() => onApply(combinedDraft)}
			applyDisabled={!dirty}
		/>
	);
}
