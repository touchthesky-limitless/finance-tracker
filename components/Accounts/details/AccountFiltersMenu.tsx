"use client";

import {
	useMemo,
	useState,
} from "react";
import * as Popover from "@radix-ui/react-popover";
import {
	ChevronDown,
} from "lucide-react";

import { AmountFilterFields } from "@/components/Accounts/details/AmountFilterFields";
import { MultiCategorySelectorField } from "@/components/Categories/MultiCategorySelectorField";
import { MultiMerchantSelectorField } from "@/components/Merchants/MultiMerchantSelectorField";
import {
	EMPTY_ACCOUNT_TRANSACTION_FILTERS,
	accountTransactionFiltersEqual,
	hasAccountTransactionFilters,
	isAccountAmountFilterValid,
	type AccountCategoryOption,
	type AccountTransactionFilters,
} from "@/components/Accounts/details/accountDetailsUtils";
import type { MerchantListItem } from "@/components/Merchants/types";
import { DateRangeButton } from "@/components/Transactions/DateRangeButton";

interface AccountFiltersMenuProps {
	filters: AccountTransactionFilters;
	categories: AccountCategoryOption[];
	merchants: MerchantListItem[];
	tags: string[];
	onApply: (filters: AccountTransactionFilters) => void;
	onReset: () => void;
}

export function AccountFiltersMenu({
	filters,
	categories,
	merchants,
	tags,
	onApply,
	onReset,
}: AccountFiltersMenuProps) {
	const [open, setOpen] = useState(false);
	const [draft, setDraft] =
		useState<AccountTransactionFilters>(filters);

	const categoryById = useMemo(() => {
		return new Map(
			categories.map((category) => {
				return [category.value, category] as const;
			}),
		);
	}, [categories]);

	const categoryIdByName = useMemo(() => {
		return new Map(
			categories.map((category) => {
				return [
					category.label.trim().toLowerCase(),
					category.value,
				] as const;
			}),
		);
	}, [categories]);

	const selectedCategoryNames = useMemo(() => {
		return draft.categoryIds
			.map((categoryId) => {
				return categoryById.get(categoryId)?.label;
			})
			.filter((value): value is string => Boolean(value));
	}, [
		categoryById,
		draft.categoryIds,
	]);

	const hasAppliedFilters = hasAccountTransactionFilters(filters);
	const draftChanged = !accountTransactionFiltersEqual(draft, filters);
	const amountIsValid = isAccountAmountFilterValid(draft);
	const applyEnabled = draftChanged && amountIsValid;

	const draftIsEmpty = useMemo(() => {
		return accountTransactionFiltersEqual(
			draft,
			EMPTY_ACCOUNT_TRANSACTION_FILTERS,
		);
	}, [draft]);

	const updateDraft = <
		TKey extends keyof AccountTransactionFilters,
	>(
		key: TKey,
		value: AccountTransactionFilters[TKey],
	): void => {
		setDraft((current) => {
			return {
				...current,
				[key]: value,
			};
		});
	};

	const reset = (): void => {
		if (draftIsEmpty && !hasAppliedFilters) {
			setOpen(false);
			return;
		}

		setDraft(EMPTY_ACCOUNT_TRANSACTION_FILTERS);
		onReset();
		setOpen(false);
	};

	return (
		<Popover.Root
			open={open}
			onOpenChange={(nextOpen) => {
				if (nextOpen) {
					setDraft(filters);
				}

				setOpen(nextOpen);
			}}
			modal={false}
		>
			<Popover.Trigger asChild>
				<button
					type="button"
					className="relative flex h-10 items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-900 shadow-sm outline-none transition-colors hover:bg-gray-50 data-[state=open]:border-[#00A8D2] data-[state=open]:ring-2 data-[state=open]:ring-[#00A8D2]/25 dark:border-white/10 dark:bg-[#222220] dark:text-white dark:hover:bg-[#2A2A27]"
				>
					Filters
					<ChevronDown size={15} />

					{hasAppliedFilters && (
						<span className="absolute -right-1 -top-1 size-2.5 rounded-full border-2 border-white bg-[#00A8D2] dark:border-[#171716]" />
					)}
				</button>
			</Popover.Trigger>

			<Popover.Portal>
				<Popover.Content
					align="end"
					side="bottom"
					sideOffset={10}
					avoidCollisions
					collisionPadding={12}
					onCloseAutoFocus={(event) => {
						event.preventDefault();
					}}
					className="z-[130] w-[495px] max-w-[calc(100vw-24px)] overflow-hidden rounded-2xl border border-gray-200 bg-white text-gray-900 shadow-2xl outline-none dark:border-white/10 dark:bg-[#1E1E1E] dark:text-white"
				>
					<div className="flex items-center justify-between border-b border-gray-200 px-7 py-5 dark:border-white/10">
						<button
							type="button"
							onClick={reset}
							className="h-12 rounded-xl border border-gray-200 px-5 text-base font-semibold shadow-sm transition-colors hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5"
						>
							Reset
						</button>

						<button
							type="button"
							disabled={!applyEnabled}
							onClick={() => {
								if (!applyEnabled) {
									return;
								}

								onApply(draft);
								setOpen(false);
							}}
							className="h-12 rounded-xl px-6 text-base font-bold text-white transition-colors enabled:bg-[#FF5A35] enabled:hover:bg-[#E94A28] disabled:cursor-not-allowed disabled:bg-[#FFAA91]"
						>
							Apply
						</button>
					</div>

					<div className="max-h-[calc(100vh-150px)] space-y-7 overflow-y-auto px-7 py-7">
						<label className="block">
							<span className="mb-3 block text-base font-semibold">
								Search
							</span>
							<input
								value={draft.search}
								onChange={(event) => {
									updateDraft(
										"search",
										event.target.value,
									);
								}}
								placeholder="Find a transaction"
								className="h-14 w-full rounded-xl border border-gray-300 bg-white px-4 text-base text-gray-900 outline-none transition-colors placeholder:text-gray-500 focus:border-[#00A8D2] focus:ring-2 focus:ring-[#00A8D2]/15 dark:border-white/15 dark:bg-[#222] dark:text-white dark:placeholder:text-gray-400"
							/>
						</label>

						<div>
							<span className="mb-3 block text-base font-semibold">
								Categories
							</span>

							<MultiCategorySelectorField
								values={selectedCategoryNames}
								placeholder="Search categories…"
								clearAllLabel="Clear all"
								onChange={(categoryNames) => {
									const categoryIds = categoryNames
										.map((categoryName) => {
											return categoryIdByName.get(
												categoryName
													.trim()
													.toLowerCase(),
											);
										})
										.filter(
											(value): value is string =>
												Boolean(value),
										);

									updateDraft(
										"categoryIds",
										categoryIds,
									);
								}}
							/>
						</div>

						<div>
							<span className="mb-3 block text-base font-semibold">
								Merchants
							</span>

							<MultiMerchantSelectorField
								values={draft.merchantIds}
								merchants={merchants}
								placeholder="Search merchants…"
								clearAllLabel="Clear all"
								onChange={(merchantIds) => {
									updateDraft(
										"merchantIds",
										merchantIds,
									);
								}}
							/>
						</div>

						<div>
							<span className="mb-3 block text-base font-semibold">
								Amounts
							</span>

							<AmountFilterFields
								mode={draft.amountMode}
								value={draft.amountValue}
								maxValue={draft.amountMaxValue}
								onChange={(
									amountMode,
									amountValue,
									amountMaxValue,
								) => {
									setDraft((current) => {
										return {
											...current,
											amountMode,
											amountValue,
											amountMaxValue,
										};
									});
								}}
							/>
						</div>

						<label className="block">
							<span className="mb-3 block text-base font-semibold">
								Tags
							</span>
							<select
								value={draft.tag}
								onChange={(event) => {
									updateDraft(
										"tag",
										event.target.value,
									);
								}}
								className="h-14 w-full rounded-xl border border-gray-300 bg-white px-4 text-base text-gray-500 outline-none transition-colors focus:border-[#00A8D2] dark:border-white/15 dark:bg-[#222] dark:text-gray-400"
							>
								<option value="">All tags...</option>
								{tags.map((tag) => {
									return (
										<option key={tag} value={tag}>
											{tag}
										</option>
									);
								})}
							</select>
						</label>

						<div>
							<span className="mb-3 block text-base font-semibold">
								Date range
							</span>

							<DateRangeButton
								variant="filter"
								value={{
									startDate: draft.startDate,
									endDate: draft.endDate,
								}}
								onChange={(dateRange) => {
									setDraft((current) => {
										return {
											...current,
											...dateRange,
										};
									});
								}}
							/>
						</div>

						{!amountIsValid && (
							<p className="-mt-3 text-sm font-medium text-red-500">
								Enter a valid amount before applying the filters.
							</p>
						)}
					</div>
				</Popover.Content>
			</Popover.Portal>
		</Popover.Root>
	);
}
