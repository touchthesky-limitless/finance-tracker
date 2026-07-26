"use client";

import {
	useMemo,
	useState,
	type ChangeEvent,
	type KeyboardEvent,
	type MouseEvent as ReactMouseEvent,
	type PointerEvent as ReactPointerEvent,
} from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Popover from "@radix-ui/react-popover";
import { Check, ChevronDown, CircleX } from "lucide-react";

import type { CashFlowFilters, HiddenMode } from "@/components/CashFlow/types";
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
	const [draft, setDraft] = useState<CashFlowFilters>(() => {
		return cloneFilters(filters);
	});
	const activeCount = countFilters(filters);

	const handleOpenChange = (nextOpen: boolean): void => {
		setOpen(nextOpen);

		if (nextOpen) {
			setDraft(cloneFilters(filters));
		}
	};

	const handleReset = (): void => {
		setDraft(cloneFilters(EMPTY_FILTERS));

		if (activeCount > 0) {
			onApply(cloneFilters(EMPTY_FILTERS));
		}

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
								.filter((account) => {
									return Boolean(account.id && account.name?.trim());
								})
								.map((account) => {
									return {
										value: account.id,
										label: account.name.trim(),
									};
								})}
							values={draft.accountIds}
							onChange={(accountIds) => {
								setDraft((current) => {
									return { ...current, accountIds };
								});
							}}
						/>

						<MultiPicker
							label="Tags"
							placeholder="All tags..."
							options={tags.map((tag) => {
								return { value: tag, label: tag };
							})}
							values={draft.tags}
							onChange={(nextTags) => {
								setDraft((current) => {
									return { ...current, tags: nextTags };
								});
							}}
						/>

						<label className="block">
							<span className="mb-3 block text-base font-bold">Hidden</span>
							<select
								value={draft.hidden}
								onChange={(event: ChangeEvent<HTMLSelectElement>) => {
									setDraft((current) => {
										return {
											...current,
											hidden: event.target.value as HiddenMode,
										};
									});
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

function MultiPicker({
	label,
	placeholder,
	options,
	values,
	onChange,
}: {
	label: string;
	placeholder: string;
	options: Array<{ value: string; label: string }>;
	values: string[];
	onChange: (values: string[]) => void;
}) {
	const selectedLabelByValue = useMemo(() => {
		return new Map(
			options.map((option) => {
				return [option.value, option.label] as const;
			}),
		);
	}, [options]);

	const handleTriggerKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
		if (event.key === "Enter" || event.key === " ") {
			event.currentTarget.click();
		}
	};

	return (
		<div>
			<span className="mb-3 block text-base font-bold">{label}</span>
			<DropdownMenu.Root modal={false}>
				<DropdownMenu.Trigger asChild>
					<div
						role="button"
						tabIndex={0}
						onKeyDown={handleTriggerKeyDown}
						className="flex min-h-14 w-full cursor-pointer items-center gap-2 rounded-xl border border-gray-300 px-4 text-left outline-none transition-colors hover:bg-gray-50 focus:border-cyan-500 dark:border-white/15 dark:hover:bg-white/7"
					>
						{values.length === 0 ? (
							<span className="text-gray-500">{placeholder}</span>
						) : (
							<span className="flex flex-1 flex-wrap gap-2">
								{values.map((value) => {
									return (
										<span
											key={value}
											className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-semibold dark:bg-white/7"
										>
											{selectedLabelByValue.get(value) ?? value}
											<button
												type="button"
												aria-label={`Remove ${selectedLabelByValue.get(value) ?? value}`}
												onClick={(event: ReactMouseEvent<HTMLButtonElement>) => {
													event.stopPropagation();
													onChange(
														values.filter((item) => {
															return item !== value;
														}),
													);
												}}
												className="rounded-full text-gray-500 hover:text-gray-900 dark:hover:text-white"
											>
												<CircleX size={15} />
											</button>
										</span>
									);
								})}
							</span>
						)}
						{values.length > 0 && (
							<button
								type="button"
								aria-label={`Clear all ${label.toLowerCase()}`}
								onPointerDown={(event: ReactPointerEvent<HTMLButtonElement>) => {
									event.preventDefault();
									event.stopPropagation();
								}}
								onClick={(event: ReactMouseEvent<HTMLButtonElement>) => {
									event.preventDefault();
									event.stopPropagation();
									onChange([]);
								}}
								className="ml-auto shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold text-cyan-600 transition-colors hover:bg-cyan-50 dark:text-cyan-400 dark:hover:bg-cyan-500/10"
							>
								Clear all
							</button>
						)}
						<ChevronDown
							size={17}
							className={values.length > 0 ? "shrink-0" : "ml-auto shrink-0"}
						/>
					</div>
				</DropdownMenu.Trigger>

				<DropdownMenu.Portal>
					<DropdownMenu.Content
						align="start"
						sideOffset={8}
						className="z-[900] max-h-72 w-[420px] max-w-[calc(100vw-32px)] overflow-y-auto rounded-xl border border-gray-200 bg-white p-2 shadow-2xl dark:border-white/10 dark:bg-[#232322]"
					>
						{options.map((option) => {
							const selected = values.includes(option.value);

							return (
								<DropdownMenu.CheckboxItem
									key={option.value}
									checked={selected}
									onCheckedChange={() => {
										onChange(
											selected
												? values.filter((value) => {
														return value !== option.value;
													})
												: [...values, option.value],
										);
									}}
									className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 outline-none data-[highlighted]:bg-gray-100 dark:data-[highlighted]:bg-white/7"
								>
									<span
										className={`grid size-5 place-items-center rounded border ${
											selected
												? "border-[#FF6633] bg-[#FF6633] text-white"
												: "border-gray-400"
										}`}
									>
										{selected && <Check size={14} />}
									</span>
									<span className="truncate">{option.label}</span>
								</DropdownMenu.CheckboxItem>
							);
						})}
					</DropdownMenu.Content>
				</DropdownMenu.Portal>
			</DropdownMenu.Root>
		</div>
	);
}
