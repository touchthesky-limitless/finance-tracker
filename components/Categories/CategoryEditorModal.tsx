/**
 * CategoryEditorModal - Modal for editing category details.
 */

"use client";

import { useEffect, useId, useState } from "react";
import { AlertCircle, Loader2, Trash2, X } from "lucide-react";
import { CategoryEmojiPicker } from "./CategoryEmojiPicker";
import { CategoryGroupSelect } from "./CategoryGroupSelect";
import { BudgetTypeOption } from "./BudgetTypeOption";
import { DisableInfoTooltip } from "./DisableInfoTooltip";
import { ModalPortal } from "./ModalPortal";
import { encodeEmojiIcon, getEmojiIcon } from "./CategoryGlyph";
import { formatCurrency } from "@/utils/formatters";
import type {
	CategoryBudgetType,
	CategoryEditorValue,
	CategoryEditorSaveValue,
	CategoryEditorGroupOption,
} from "./types";

const DEFAULT_ICON = encodeEmojiIcon("❓");

interface CategoryEditorModalProps {
	category: CategoryEditorValue;
	groups: CategoryEditorGroupOption[];
	childDialogOpen?: boolean;
	onClose: () => void;
	onSave: (value: CategoryEditorSaveValue) => Promise<void>;
	onDelete: () => void;
	onActivate: () => Promise<void> | void;
	isIncomeCategory?: boolean;
}

export function CategoryEditorModal({
	category,
	groups,
	childDialogOpen = false,
	onClose,
	onSave,
	onDelete,
	onActivate,
	isIncomeCategory = false,
}: CategoryEditorModalProps) {
	const titleId = useId();
	const [name, setName] = useState(category.name);
	const [icon, setIcon] = useState(category.icon || DEFAULT_ICON);
	const [selectedParentName, setSelectedParentName] = useState(
		category.parentName,
	);
	const [excludeFromBudget, setExcludeFromBudget] = useState(
		category.excludedFromBudget,
	);
	const [budgetType, setBudgetType] = useState<CategoryBudgetType>(
		category.budgetType,
	);
	const [monthlyRollover, setMonthlyRollover] = useState(
		category.monthlyRollover,
	);
	const [rolloverStartMonth, setRolloverStartMonth] = useState<
		string | undefined
	>(category.rolloverStartMonth);
	const [rolloverStartingBalance, setRolloverStartingBalance] = useState<
		number | undefined
	>(category.rolloverStartingBalance);
	const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	const selectedEmoji = getEmojiIcon(icon) ?? "❓";
	const cleanName = name.trim();
	const hasChanges =
		cleanName !== category.name.trim() ||
		icon !== category.icon ||
		selectedParentName !== category.parentName ||
		excludeFromBudget !== category.excludedFromBudget ||
		budgetType !== category.budgetType ||
		monthlyRollover !== category.monthlyRollover ||
		rolloverStartMonth !== category.rolloverStartMonth ||
		rolloverStartingBalance !== category.rolloverStartingBalance;

	useEffect(() => {
		const prevOverflow = document.body.style.overflow;
		const prevFocus =
			document.activeElement instanceof HTMLElement
				? document.activeElement
				: null;
		document.body.style.overflow = "hidden";
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && !isSaving && !childDialogOpen) {
				e.preventDefault();
				onClose();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
			document.body.style.overflow = prevOverflow;
			prevFocus?.focus();
		};
	}, [childDialogOpen, isSaving, onClose]);

	const handleSave = async () => {
		if (!cleanName || !selectedParentName || !hasChanges || isSaving) return;
		setIsSaving(true);
		setErrorMessage(null);
		try {
			await onSave({
				name: cleanName,
				icon,
				parentName: selectedParentName,
				excludedFromBudget: excludeFromBudget,
				budgetType,
				monthlyRollover,
				rolloverStartMonth,
				rolloverStartingBalance,
			});
		} catch (err) {
			setErrorMessage(
				err instanceof Error ? err.message : "The category could not be saved.",
			);
		} finally {
			setIsSaving(false);
		}
	};

	const handleActivate = async () => {
		if (isSaving) return;
		setIsSaving(true);
		setErrorMessage(null);
		try {
			await onActivate();
		} catch (err) {
			setErrorMessage(
				err instanceof Error
					? err.message
					: "The category could not be activated.",
			);
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<ModalPortal>
			<div
				className="fixed inset-0 z-[900] grid place-items-center overflow-y-auto bg-black/45 p-2 backdrop-blur-[1px] sm:p-4"
				onPointerDown={(e) => {
					if (e.target === e.currentTarget && !isSaving && !childDialogOpen)
						onClose();
				}}
			>
				<section
					role="dialog"
					aria-modal="true"
					aria-labelledby={titleId}
					className="relative my-auto flex max-h-[calc(100dvh-16px)] w-full max-w-[892px] min-w-0 flex-col overflow-hidden rounded-[16px] border border-black/10 bg-white text-[#282826] shadow-[0_28px_90px_rgba(0,0,0,0.28)] sm:max-h-[calc(100dvh-32px)] sm:rounded-[20px] dark:border-white/10 dark:bg-[#242422] dark:text-white"
				>
					<header className="flex shrink-0 items-center justify-between gap-4 border-b border-black/[0.06] px-4 py-4 sm:px-6 sm:py-5 lg:px-10 lg:py-6 dark:border-white/10">
						<h2
							id={titleId}
							className="min-w-0 truncate text-xl font-semibold tracking-[-0.02em] sm:text-2xl lg:text-[29px]"
						>
							Edit Category
						</h2>
						<button
							type="button"
							onClick={onClose}
							disabled={isSaving || childDialogOpen}
							className="grid size-9 shrink-0 place-items-center rounded-full transition hover:bg-black/[0.05] disabled:opacity-50 sm:size-11 dark:hover:bg-white/10"
							aria-label="Close"
						>
							<X size={31} strokeWidth={1.8} />
						</button>
					</header>

					<div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:space-y-7 sm:px-6 sm:py-7 lg:space-y-8 lg:px-10 lg:py-10">
						{/* Icon & Name */}
						<div>
							<span className="mb-2.5 block text-base font-semibold sm:mb-3 sm:text-lg lg:text-[23px]">
								Icon &amp; Name
							</span>
							<div className="relative">
								<div className="flex h-13 min-w-0 overflow-hidden rounded-[13px] border border-[#d8d6d2] bg-white focus-within:border-[#008eae] focus-within:ring-2 focus-within:ring-[#008eae]/15 sm:h-14 sm:rounded-[15px] lg:h-[66px] dark:border-white/15 dark:bg-[#20201f]">
									<button
										type="button"
										disabled={category.isSystem || isSaving}
										onClick={() => setIsEmojiPickerOpen((prev) => !prev)}
										aria-label="Choose category emoji"
										aria-expanded={isEmojiPickerOpen}
										className="grid w-13 shrink-0 place-items-center border-r border-[#d8d6d2] text-2xl transition hover:bg-[#f6f5f3] disabled:cursor-not-allowed disabled:opacity-70 sm:w-16 sm:text-[28px] lg:w-[72px] lg:text-[31px] dark:border-white/15 dark:hover:bg-white/5"
									>
										{selectedEmoji}
									</button>
									<input
										autoFocus
										disabled={category.isSystem || isSaving}
										value={name}
										onChange={(e) => {
											setName(e.target.value);
											setErrorMessage(null);
										}}
										placeholder="Category name"
										className="min-w-0 flex-1 bg-transparent px-3 text-lg outline-none placeholder:text-[#8d8b87] disabled:cursor-not-allowed disabled:opacity-70 sm:px-4 sm:text-xl lg:px-5 lg:text-[27px]"
									/>
								</div>
								{isEmojiPickerOpen && !category.isSystem && (
									<CategoryEmojiPicker
										selectedEmoji={selectedEmoji}
										onSelect={(emoji) => {
											setIcon(encodeEmojiIcon(emoji));
											setIsEmojiPickerOpen(false);
										}}
										onClose={() => setIsEmojiPickerOpen(false)}
									/>
								)}
							</div>
							{category.isSystem && (
								<p className="mt-3 text-sm leading-6 text-[#7d7b77] sm:text-base sm:leading-7 lg:text-[20px] lg:leading-8 dark:text-[#aaa9a4]">
									This system category keeps its built-in icon and name. You can
									still change its group and budget behavior.
								</p>
							)}
						</div>

						{/* Group */}
						<div>
							<span className="mb-2.5 block text-base font-semibold sm:mb-3 sm:text-lg lg:text-[23px]">
								Group
							</span>
							<CategoryGroupSelect
								value={selectedParentName}
								groups={groups}
								disabled={isIncomeCategory || isSaving}
								onChange={(next) => {
									setSelectedParentName(next);
									setErrorMessage(null);
								}}
							/>
						</div>

						{/* Type */}
						{!isIncomeCategory && (
							<div>
								<span className="mb-3 block text-base font-semibold sm:text-lg lg:text-[23px]">
									Type
								</span>
								<div className="overflow-hidden rounded-[15px] border border-[#dedbd7] dark:border-white/15">
									<BudgetTypeOption
										value="fixed"
										selected={budgetType === "fixed"}
										title="Fixed"
										description="Spending is usually the same every month and cannot be easily reduced. Great for utilities, mortgage, bills, etc."
										onSelect={setBudgetType}
									/>
									<BudgetTypeOption
										value="flexible"
										selected={budgetType === "flexible"}
										title="Flexible"
										description="Spending changes monthly, and can be reduced when you want to save more money. Great for restaurants, entertainment, etc."
										onSelect={setBudgetType}
									>
										{budgetType === "flexible" && (
											<div className="mt-4 rounded-xl bg-[#f5f4f2] p-4 dark:bg-white/5">
												<div className="flex items-center justify-between">
													<div>
														<p className="font-semibold">
															Make this category a rollover fund
														</p>
														<p className="mt-1 text-sm leading-6 text-[#55534f] dark:text-[#c2c0bb]">
															Carry over remaining balances or set due dates to
															better plan for future expenses.
														</p>
													</div>
													<button
														type="button"
														role="switch"
														aria-checked={monthlyRollover}
														onClick={(e) => {
															e.stopPropagation();
															setMonthlyRollover((prev) => {
																if (!prev) {
																	const now = new Date();
																	const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
																	setRolloverStartMonth(defaultMonth);
																	setRolloverStartingBalance(0);
																} else {
																	setRolloverStartMonth(undefined);
																	setRolloverStartingBalance(undefined);
																}
																return !prev;
															});
														}}
														className={`relative h-7 w-14 shrink-0 rounded-full transition ${
															monthlyRollover
																? "bg-[#ff6633]"
																: "bg-[#989793] dark:bg-[#66645f]"
														}`}
													>
														<span
															className={`absolute top-1 size-5 rounded-full bg-white shadow-sm transition-transform ${
																monthlyRollover
																	? "translate-x-8"
																	: "translate-x-1"
															}`}
														/>
													</button>
												</div>
												{monthlyRollover && (
													<div className="mt-5 space-y-4">
														<div>
															<label className="mb-1 block text-sm font-semibold">
																Starting Month
															</label>
															<select
																value={rolloverStartMonth || ""}
																onChange={(e) =>
																	setRolloverStartMonth(e.target.value)
																}
																className="w-full rounded-lg border border-[#d8d6d2] bg-white px-3 py-2 text-sm outline-none focus:border-[#008eae] focus:ring-2 focus:ring-[#008eae]/15 dark:border-white/15 dark:bg-[#20201f]"
															>
																{Array.from({ length: 12 }, (_, i) => {
																	const d = new Date();
																	d.setMonth(d.getMonth() + i);
																	const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
																	const label = d.toLocaleDateString("en-US", {
																		month: "long",
																		year: "numeric",
																	});
																	return (
																		<option key={val} value={val}>
																			{label}
																		</option>
																	);
																})}
															</select>
															<p className="mt-2 text-sm text-[#55534f] dark:text-[#c2c0bb]">
																Your rollover balance will start carrying over
																from this month onward. Any excess budget
																amounts from before this date will not rollover.
															</p>
														</div>
														<div>
															<label className="mb-1 block text-sm font-semibold">
																Starting Balance
															</label>
															<div className="relative">
																<span className="absolute inset-y-0 left-3 flex items-center text-gray-500">
																	$
																</span>
																<input
																	type="text"
																	value={
																		rolloverStartingBalance != null
																			? formatCurrency(rolloverStartingBalance)
																			: ""
																	}
																	onChange={(e) => {
																		const raw = e.target.value.replace(
																			/[^0-9.]/g,
																			"",
																		);
																		const parsed = parseFloat(raw);
																		setRolloverStartingBalance(
																			isNaN(parsed) ? undefined : parsed,
																		);
																	}}
																	onBlur={() => {
																		if (
																			rolloverStartingBalance == null ||
																			isNaN(rolloverStartingBalance)
																		) {
																			setRolloverStartingBalance(0);
																		}
																	}}
																	inputMode="decimal"
																	placeholder="0.00"
																	className="w-full rounded-lg border border-[#d8d6d2] bg-white px-8 py-2 text-sm outline-none focus:border-[#008eae] focus:ring-2 focus:ring-[#008eae]/15 dark:border-white/15 dark:bg-[#20201f]"
																/>
															</div>
															<p className="mt-2 text-sm text-[#55534f] dark:text-[#c2c0bb]">
																You can start with a pre-allocated balance which
																will start with the amount you enter above, and
																accrue going forward from the starting month.
															</p>
														</div>
													</div>
												)}
											</div>
										)}
									</BudgetTypeOption>
									<BudgetTypeOption
										value="non-monthly"
										selected={budgetType === "non-monthly"}
										title="Non-Monthly"
										description="Spending typically happens yearly, or less frequently than monthly. Great for annual bills, quarterly payments, etc."
										onSelect={setBudgetType}
									/>
								</div>
							</div>
						)}

						{/* Exclude from budget */}
						<div className="flex min-w-0 flex-col items-stretch gap-4 rounded-[13px] border border-[#dedbd7] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:rounded-[15px] sm:px-6 sm:py-6 lg:px-7 lg:py-7 dark:border-white/15">
							<div className="min-w-0">
								<h3 className="text-base font-semibold sm:text-lg lg:text-[22px]">
									Exclude this category from the budget
								</h3>
								<p className="mt-2 max-w-[620px] text-sm leading-6 text-[#55534f] sm:text-base sm:leading-7 lg:text-[20px] lg:leading-8 dark:text-[#c2c0bb]">
									This category and transactions linked to it will be hidden
									from your budget.
								</p>
							</div>
							<button
								type="button"
								role="switch"
								aria-checked={excludeFromBudget}
								disabled={isSaving}
								onClick={() => setExcludeFromBudget((prev) => !prev)}
								className={`relative h-7 w-14 shrink-0 self-start rounded-full transition disabled:opacity-60 sm:self-auto ${
									excludeFromBudget
										? "bg-[#008eae]"
										: "bg-[#989793] dark:bg-[#66645f]"
								}`}
							>
								<span
									className={`absolute top-1 size-5 rounded-full bg-white shadow-sm transition-transform ${
										excludeFromBudget ? "translate-x-8" : "translate-x-1"
									}`}
								/>
							</button>
						</div>

						{errorMessage && (
							<div className="flex items-start gap-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
								<AlertCircle size={18} className="mt-0.5 shrink-0" />
								<span>{errorMessage}</span>
							</div>
						)}
					</div>

					<footer className="flex shrink-0 flex-col-reverse items-stretch gap-3 border-t border-black/[0.06] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-10 lg:py-5 dark:border-white/10">
						<div className="flex w-full min-w-0 items-center gap-2 sm:w-auto sm:gap-4">
							<button
								type="button"
								onClick={
									category.isSystem && category.hidden
										? () => void handleActivate()
										: onDelete
								}
								disabled={isSaving || childDialogOpen}
								className={`inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-[12px] border border-[#dedbd7] bg-white px-4 text-base font-semibold shadow-sm transition disabled:opacity-50 sm:flex-none lg:h-[58px] lg:rounded-[13px] lg:px-5 lg:text-[23px] dark:border-white/15 dark:bg-[#242422] ${
									category.isSystem
										? "text-[#282826] hover:bg-[#f7f6f4] dark:text-white dark:hover:bg-white/5"
										: "text-[#de2529] hover:bg-red-50 dark:hover:bg-red-500/10"
								}`}
							>
								{!category.isSystem && <Trash2 size={20} />}
								{category.isSystem
									? category.hidden
										? "Activate"
										: "Disable"
									: "Delete"}
							</button>
							{category.isSystem && (
								<DisableInfoTooltip
									text={
										category.hidden
											? "Activate restores this built-in category to category settings and category selectors."
											: "Disable hides this built-in category from category selectors. Existing transactions retain the current category value."
									}
								/>
							)}
						</div>

						<div className="flex w-full min-w-0 items-center gap-2 sm:w-auto sm:gap-4 lg:gap-5">
							<button
								type="button"
								onClick={onClose}
								disabled={isSaving || childDialogOpen}
								className="h-12 flex-1 rounded-[12px] border border-[#dedbd7] bg-white px-4 text-base font-semibold shadow-sm transition hover:bg-[#f7f6f4] disabled:opacity-50 sm:flex-none lg:h-[58px] lg:rounded-[13px] lg:px-6 lg:text-[23px] dark:border-white/15 dark:bg-[#242422] dark:hover:bg-white/5"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={() => void handleSave()}
								disabled={
									isSaving ||
									childDialogOpen ||
									!cleanName ||
									!selectedParentName ||
									!hasChanges
								}
								className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-[12px] bg-[#ff5a35] px-4 text-base font-semibold text-white transition hover:bg-[#e94c28] disabled:cursor-not-allowed disabled:bg-[#ffad91] disabled:text-white/95 sm:min-w-24 sm:flex-none lg:h-[58px] lg:rounded-[13px] lg:px-5 lg:text-[23px]"
							>
								{isSaving && <Loader2 size={20} className="animate-spin" />}
								Save
							</button>
						</div>
					</footer>
				</section>
			</div>
		</ModalPortal>
	);
}
