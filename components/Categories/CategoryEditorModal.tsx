"use client";

import {
	useCallback,
	useEffect,
	useId,
	useRef,
	useState,
	useSyncExternalStore,
	type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
	AlertCircle,
	Check,
	ChevronDown,
	Info,
	Loader2,
	Search,
	Trash2,
	X,
} from "lucide-react";

import { CategoryEmojiPicker } from "@/components/Categories/CategoryEmojiPicker";
import {
	encodeEmojiIcon,
	getEmojiIcon,
} from "@/components/Categories/CategoryGlyph";
import type { CategorySectionId } from "@/lib/categories/categoryPreferences";

const DEFAULT_ICON = encodeEmojiIcon("❓");

export interface CategoryEditorGroupOption {
	key: string;
	name: string;
	displayName: string;
	sectionId: CategorySectionId;
	hidden: boolean;
}

export type CategoryBudgetType = "fixed" | "flexible" | "non-monthly";

export interface CategoryEditorValue {
	id: string;
	name: string;
	icon: string;
	parentName: string;
	isSystem: boolean;
	excludedFromBudget: boolean;
	budgetType: CategoryBudgetType;
	monthlyRollover: boolean;
	hidden: boolean;
}

export interface CategoryEditorSaveValue {
	name: string;
	icon: string;
	parentName: string;
	excludedFromBudget: boolean;
	budgetType: CategoryBudgetType;
	monthlyRollover: boolean;
}

interface CategoryEditorModalProps {
	category: CategoryEditorValue;
	groups: CategoryEditorGroupOption[];
	childDialogOpen?: boolean;
	onClose: () => void;
	onSave: (value: CategoryEditorSaveValue) => Promise<void>;
	onDelete: () => void;
	onActivate: () => Promise<void> | void;
}

function subscribeToClient(): () => void {
	return () => {};
}

function getClientSnapshot(): boolean {
	return true;
}

function getServerSnapshot(): boolean {
	return false;
}

function ModalPortal({ children }: { children: ReactNode }) {
	const isClient = useSyncExternalStore(
		subscribeToClient,
		getClientSnapshot,
		getServerSnapshot,
	);

	if (!isClient) {
		return null;
	}

	return createPortal(children, document.body);
}

export function CategoryEditorModal({
	category,
	groups,
	childDialogOpen = false,
	onClose,
	onSave,
	onDelete,
	onActivate,
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
		monthlyRollover !== category.monthlyRollover;

	useEffect(() => {
		const previousOverflow = document.body.style.overflow;
		const previouslyFocused =
			document.activeElement instanceof HTMLElement
				? document.activeElement
				: null;

		document.body.style.overflow = "hidden";

		const handleKeyDown = (event: KeyboardEvent): void => {
			if (event.key === "Escape" && !isSaving && !childDialogOpen) {
				event.preventDefault();
				onClose();
			}
		};

		window.addEventListener("keydown", handleKeyDown);

		return () => {
			window.removeEventListener("keydown", handleKeyDown);
			document.body.style.overflow = previousOverflow;
			previouslyFocused?.focus();
		};
	}, [childDialogOpen, isSaving, onClose]);

	const handleSave = async (): Promise<void> => {
		if (!cleanName || !selectedParentName || !hasChanges || isSaving) {
			return;
		}

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
			});
		} catch (error) {
			setErrorMessage(
				error instanceof Error
					? error.message
					: "The category could not be saved.",
			);
		} finally {
			setIsSaving(false);
		}
	};

	const handleActivate = async (): Promise<void> => {
		if (isSaving) {
			return;
		}

		setIsSaving(true);
		setErrorMessage(null);

		try {
			await onActivate();
		} catch (error) {
			setErrorMessage(
				error instanceof Error
					? error.message
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
				onPointerDown={(event) => {
					if (
						event.target === event.currentTarget &&
						!isSaving &&
						!childDialogOpen
					) {
						onClose();
					}
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
						<div>
							<span className="mb-2.5 block text-base font-semibold sm:mb-3 sm:text-lg lg:text-[23px]">
								Icon &amp; Name
							</span>
							<div className="relative">
								<div className="flex h-13 min-w-0 overflow-hidden rounded-[13px] border border-[#d8d6d2] bg-white focus-within:border-[#008eae] focus-within:ring-2 focus-within:ring-[#008eae]/15 sm:h-14 sm:rounded-[15px] lg:h-[66px] dark:border-white/15 dark:bg-[#20201f]">
									<button
										type="button"
										disabled={category.isSystem || isSaving}
										onClick={() => {
											setIsEmojiPickerOpen((current) => !current);
										}}
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
										onChange={(event) => {
											setName(event.target.value);
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

						<div>
							<span className="mb-2.5 block text-base font-semibold sm:mb-3 sm:text-lg lg:text-[23px]">
								Group
							</span>
							<CategoryGroupSelect
								value={selectedParentName}
								groups={groups}
								disabled={isSaving}
								onChange={(nextParent) => {
									setSelectedParentName(nextParent);
									setErrorMessage(null);
								}}
							/>
						</div>

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
									<div className="mt-4 flex items-center justify-between gap-4 rounded-xl bg-[#f5f4f2] px-4 py-4 dark:bg-white/5">
										<div>
											<p className="font-semibold">
												Make this category a rollover fund
											</p>
											<p className="mt-1 text-sm leading-6 text-[#55534f] dark:text-[#c2c0bb]">
												Carry over remaining balances or set due dates to better
												plan for future expenses.
											</p>
										</div>
										<button
											type="button"
											role="switch"
											aria-checked={monthlyRollover}
											onClick={(event) => {
												event.stopPropagation();
												setMonthlyRollover((current) => !current);
											}}
											className={`relative h-7 w-14 shrink-0 rounded-full transition ${monthlyRollover ? "bg-[#ff6633]" : "bg-[#989793] dark:bg-[#66645f]"}`}
										>
											<span
												className={`absolute top-1 size-5 rounded-full bg-white shadow-sm transition-transform ${monthlyRollover ? "translate-x-8" : "translate-x-1"}`}
											/>
										</button>
									</div>
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
								onClick={() => setExcludeFromBudget((current) => !current)}
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

function BudgetTypeOption({
	value,
	selected,
	title,
	description,
	onSelect,
	children,
}: {
	value: CategoryBudgetType;
	selected: boolean;
	title: string;
	description: string;
	onSelect: (value: CategoryBudgetType) => void;
	children?: ReactNode;
}) {
	return (
		<div
			role="radio"
			aria-checked={selected}
			tabIndex={0}
			onClick={() => onSelect(value)}
			onKeyDown={(event) => {
				if (event.key === "Enter" || event.key === " ") {
					event.preventDefault();
					onSelect(value);
				}
			}}
			className="flex w-full cursor-pointer items-start gap-4 border-b border-[#eceae7] px-5 py-5 text-left outline-none last:border-b-0 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#ff6633]/40 dark:border-white/10"
		>
			<span
				className={`mt-1 grid size-6 shrink-0 place-items-center rounded-full border ${selected ? "border-[#ff6633]" : "border-[#d8d6d2] dark:border-white/20"}`}
			>
				{selected && <span className="size-3 rounded-full bg-[#ff6633]" />}
			</span>
			<span className="min-w-0 flex-1">
				<span className="block text-lg font-semibold">{title}</span>
				<span className="mt-1 block text-sm leading-6 text-[#55534f] dark:text-[#c2c0bb]">
					{description}
				</span>
				{children}
			</span>
		</div>
	);
}

function CategoryGroupSelect({
	value,
	groups,
	disabled,
	onChange,
}: {
	value: string;
	groups: CategoryEditorGroupOption[];
	disabled: boolean;
	onChange: (value: string) => void;
}) {
	const triggerRef = useRef<HTMLButtonElement | null>(null);
	const menuRef = useRef<HTMLDivElement | null>(null);
	const [isOpen, setIsOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [menuPosition, setMenuPosition] = useState<{
		top: number;
		left: number;
		width: number;
		maxHeight: number;
	} | null>(null);

	const selectedGroup = groups.find((group) => group.name === value);
	const normalizedSearch = searchQuery.trim().toLowerCase();
	const selectableGroups = groups.filter((group) => !group.hidden);
	const filteredGroups = normalizedSearch
		? selectableGroups.filter((group) => {
				return (
					group.displayName.toLowerCase().includes(normalizedSearch) ||
					group.name.toLowerCase().includes(normalizedSearch)
				);
			})
		: selectableGroups;

	const calculateMenuPosition = useCallback(() => {
		const trigger = triggerRef.current;

		if (!trigger || typeof window === "undefined") {
			return null;
		}

		const bounds = trigger.getBoundingClientRect();
		const viewportPadding = 16;
		const gap = 10;
		const minimumHeight = 220;
		const preferredHeight = 500;
		const spaceBelow =
			window.innerHeight - bounds.bottom - gap - viewportPadding;
		const spaceAbove = bounds.top - gap - viewportPadding;
		const openAbove = spaceBelow < minimumHeight && spaceAbove > spaceBelow;
		const availableHeight = Math.max(
			minimumHeight,
			openAbove ? spaceAbove : spaceBelow,
		);
		const maxHeight = Math.min(preferredHeight, availableHeight);
		const width = Math.min(
			bounds.width,
			window.innerWidth - viewportPadding * 2,
		);
		const left = Math.min(
			Math.max(viewportPadding, bounds.left),
			window.innerWidth - viewportPadding - width,
		);
		const top = openAbove
			? Math.max(viewportPadding, bounds.top - gap - maxHeight)
			: Math.min(
					bounds.bottom + gap,
					window.innerHeight - viewportPadding - maxHeight,
				);

		return { top, left, width, maxHeight };
	}, []);

	const closeMenu = useCallback(() => {
		setIsOpen(false);
		setSearchQuery("");
	}, []);

	const openMenu = useCallback(() => {
		const nextPosition = calculateMenuPosition();

		if (!nextPosition) {
			return;
		}

		setMenuPosition(nextPosition);
		setSearchQuery("");
		setIsOpen(true);
	}, [calculateMenuPosition]);

	useEffect(() => {
		if (!isOpen) {
			return;
		}

		const updatePosition = (): void => {
			const nextPosition = calculateMenuPosition();

			if (nextPosition) {
				setMenuPosition(nextPosition);
			}
		};

		const handlePointerDown = (event: PointerEvent): void => {
			const target = event.target;

			if (!(target instanceof Node)) {
				return;
			}

			if (
				triggerRef.current?.contains(target) ||
				menuRef.current?.contains(target)
			) {
				return;
			}

			closeMenu();
		};

		const handleKeyDown = (event: KeyboardEvent): void => {
			if (event.key === "Escape") {
				event.preventDefault();
				event.stopPropagation();
				closeMenu();
				triggerRef.current?.focus();
			}
		};

		window.addEventListener("resize", updatePosition);
		window.addEventListener("scroll", updatePosition, true);
		document.addEventListener("pointerdown", handlePointerDown);
		document.addEventListener("keydown", handleKeyDown, true);

		return () => {
			window.removeEventListener("resize", updatePosition);
			window.removeEventListener("scroll", updatePosition, true);
			document.removeEventListener("pointerdown", handlePointerDown);
			document.removeEventListener("keydown", handleKeyDown, true);
		};
	}, [calculateMenuPosition, closeMenu, isOpen]);

	const selectGroup = (nextValue: string): void => {
		onChange(nextValue);
		closeMenu();
		triggerRef.current?.focus();
	};

	return (
		<div className="relative">
			<button
				ref={triggerRef}
				type="button"
				disabled={disabled}
				aria-haspopup="listbox"
				aria-expanded={isOpen}
				onClick={() => {
					if (isOpen) {
						closeMenu();
					} else {
						openMenu();
					}
				}}
				onKeyDown={(event) => {
					if ((event.key === "ArrowDown" || event.key === "Enter") && !isOpen) {
						event.preventDefault();
						openMenu();
					}
				}}
				className={`flex h-13 w-full items-center justify-between rounded-[13px] border bg-white px-4 text-left text-lg outline-none transition sm:h-14 sm:rounded-[15px] sm:px-5 sm:text-xl lg:h-[66px] lg:text-[27px] dark:bg-[#20201f] ${
					isOpen
						? "border-[#008eae] ring-2 ring-[#008eae]/15"
						: "border-[#d8d6d2] dark:border-white/15"
				} ${disabled ? "cursor-not-allowed opacity-70" : ""}`}
			>
				<span className="min-w-0 truncate">
					{selectedGroup?.displayName ?? value}
				</span>
				<ChevronDown
					size={27}
					strokeWidth={1.8}
					className={`shrink-0 transition-transform ${
						isOpen ? "rotate-180" : ""
					}`}
				/>
			</button>

			{isOpen &&
				!disabled &&
				menuPosition &&
				typeof document !== "undefined" &&
				createPortal(
					<div
						ref={menuRef}
						className="fixed z-[1050] flex overflow-hidden rounded-[20px] border border-[#dfddd9] bg-white shadow-[0_24px_70px_rgba(0,0,0,0.24)] dark:border-white/15 dark:bg-[#2a2a28]"
						style={{
							top: menuPosition.top,
							left: menuPosition.left,
							width: menuPosition.width,
							maxHeight: menuPosition.maxHeight,
						}}
					>
						<div className="flex min-h-0 w-full flex-col">
							<div className="shrink-0 border-b border-black/[0.06] p-3 dark:border-white/10">
								<label className="flex h-12 items-center gap-3 rounded-[13px] border border-[#d8d6d2] bg-[#f7f6f4] px-4 focus-within:border-[#008eae] focus-within:ring-2 focus-within:ring-[#008eae]/15 dark:border-white/15 dark:bg-[#20201f]">
									<Search
										size={19}
										className="shrink-0 text-[#777570] dark:text-[#aaa9a4]"
									/>
									<input
										autoFocus
										value={searchQuery}
										onChange={(event) => setSearchQuery(event.target.value)}
										placeholder="Search groups"
										className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-[#8d8b87] dark:text-white"
									/>
								</label>
							</div>

							<div
								role="listbox"
								className="min-h-0 flex-1 overflow-y-auto py-3"
							>
								{filteredGroups.length > 0 ? (
									<>
										<GroupOptionSection
											label="Income"
											groups={filteredGroups.filter(
												(group) => group.sectionId === "income",
											)}
											value={value}
											onChange={selectGroup}
										/>
										<GroupOptionSection
											label="Expenses"
											groups={filteredGroups.filter(
												(group) => group.sectionId === "expenses",
											)}
											value={value}
											onChange={selectGroup}
										/>
										<GroupOptionSection
											label="Transfers"
											groups={filteredGroups.filter(
												(group) => group.sectionId === "transfers",
											)}
											value={value}
											onChange={selectGroup}
										/>
									</>
								) : (
									<div className="px-5 py-10 text-center text-sm text-[#777570] dark:text-[#aaa9a4]">
										No groups match “{searchQuery.trim()}”.
									</div>
								)}
							</div>
						</div>
					</div>,
					document.body,
				)}
		</div>
	);
}

function GroupOptionSection({
	label,
	groups,
	value,
	onChange,
}: {
	label: string;
	groups: CategoryEditorGroupOption[];
	value: string;
	onChange: (value: string) => void;
}) {
	if (groups.length === 0) {
		return null;
	}

	return (
		<div className="px-3">
			<div className="px-5 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-[#777570] dark:text-[#aaa9a4] sm:text-base">
				{label}
			</div>
			{groups.map((group) => {
				const selected = group.name === value;

				return (
					<button
						key={group.key}
						type="button"
						role="option"
						aria-selected={selected}
						onClick={() => onChange(group.name)}
						className={`flex min-h-[54px] w-full items-center justify-between rounded-[14px] px-5 text-left text-base transition sm:min-h-[58px] sm:px-6 sm:text-lg lg:text-[22px] ${
							selected
								? "bg-[#f2f1ef] dark:bg-white/10"
								: "hover:bg-[#f7f6f4] dark:hover:bg-white/5"
						}`}
					>
						<span className="min-w-0 truncate">{group.displayName}</span>
						{selected && (
							<Check size={21} className="shrink-0 text-[#008eae]" />
						)}
					</button>
				);
			})}
		</div>
	);
}

function DisableInfoTooltip({ text }: { text: string }) {
	return (
		<div className="group/disable-tooltip relative">
			<button
				type="button"
				aria-label="About disabling this item"
				className="grid size-10 place-items-center rounded-full text-[#777570] transition hover:bg-black/[0.05] hover:text-[#282826] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40 dark:text-[#aaa9a4] dark:hover:bg-white/10 dark:hover:text-white"
			>
				<Info size={21} />
			</button>

			<div
				role="tooltip"
				className="pointer-events-none fixed bottom-20 left-4 right-4 z-[1090] rounded-xl bg-[#282826] px-4 py-3 text-center text-sm font-semibold leading-5 text-white opacity-0 shadow-[0_16px_40px_rgba(0,0,0,0.3)] transition-opacity group-hover/disable-tooltip:opacity-100 group-focus-within/disable-tooltip:opacity-100 sm:absolute sm:bottom-[calc(100%+14px)] sm:left-1/2 sm:right-auto sm:w-[360px] sm:max-w-[calc(100vw-32px)] sm:-translate-x-1/2 sm:px-5 sm:py-4 sm:text-[15px] sm:leading-6"
			>
				{text}
				<span className="absolute left-1/2 top-full size-4 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-[#282826]" />
			</div>
		</div>
	);
}
