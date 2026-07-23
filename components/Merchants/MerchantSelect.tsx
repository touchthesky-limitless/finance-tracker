/*
 *This is the reusable searchable dropdown that wraps MerchantOptionContent.
 *MerchantSelect.tsx
 *
 *It provides:
 *
 *Merchant search
 *Usage-based ordering
 *Duplicate-name removal
 *Merchant logos and transaction counts
 *Current-selection checkmark
 *Arrow-key navigation
 *Enter selection
 *Escape dismissal
 *Custom merchant creation
 *Loading and error handling
 *Floating dropdown that is not clipped by a drawer or modal
 *A controlled result containing both id and name
 *No state-resetting useEffect
 */

"use client";

import {
	useCallback,
	useId,
	useMemo,
	useState,
	type ChangeEvent,
	type KeyboardEvent,
} from "react";
import {
	autoUpdate,
	flip,
	FloatingPortal,
	offset,
	shift,
	size,
	useDismiss,
	useFloating,
	useInteractions,
	useRole,
} from "@floating-ui/react";
import { ChevronDown, Loader2, Plus, Search } from "lucide-react";

import { MerchantOptionContent } from "@/components/Merchants/MerchantOptionContent";
import type { MerchantListItem } from "@/components/Merchants/types";
import { useMerchantOptions } from "@/hooks/useMerchantOptions";
import { useBudgetStore } from "@/store/useBudgetStore";

export interface MerchantSelection {
	id: string;
	name: string;
}

export interface MerchantSelectProps {
	value: MerchantSelection | null;
	onChange: (merchant: MerchantSelection) => void;
	onInputChange?: (query: string) => void;
	merchantItems?: MerchantListItem[];
	placeholder?: string;
	ariaLabel?: string;
	disabled?: boolean;
	allowCreate?: boolean;
	showCount?: boolean;
	size?: "sm" | "md";
	maxOptions?: number;
	error?: string | null;
	className?: string;
	inputClassName?: string;
}

function normalizeMerchantName(value: string): string {
	return value.trim().toLocaleLowerCase().replace(/\s+/g, " ");
}

export function MerchantSelect({
	value,
	onChange,
	onInputChange,
	merchantItems,
	placeholder = "Search merchants or enter a new one",
	ariaLabel = "Merchant",
	disabled = false,
	allowCreate = true,
	showCount = true,
	size: optionSize = "md",
	maxOptions = 20,
	error = null,
	className = "",
	inputClassName = "",
}: MerchantSelectProps) {
	const defaultMerchantItems = useMerchantOptions();
	const addCustomMerchant = useBudgetStore((state) => {
		return state.addCustomMerchant;
	});

	const listboxId = useId();
	const [isOpen, setIsOpen] = useState(false);
	const [draftQuery, setDraftQuery] = useState<string | null>(null);
	const [activeIndex, setActiveIndex] = useState(0);
	const [isCreating, setIsCreating] = useState(false);
	const [createError, setCreateError] = useState<string | null>(null);

	const query = draftQuery ?? value?.name ?? "";
	const sourceItems = merchantItems ?? defaultMerchantItems;

	const selectedMerchantId = value?.id ?? null;
	const selectedMerchantName = value?.name ?? "";

	const options = useMemo(() => {
		const merchantByName = new Map<string, MerchantListItem>();

		for (const merchant of sourceItems) {
			const normalizedName = normalizeMerchantName(merchant.name);

			if (!normalizedName) {
				continue;
			}

			const existing = merchantByName.get(normalizedName);

			if (!existing || merchant.transactionCount > existing.transactionCount) {
				merchantByName.set(normalizedName, merchant);
			}
		}

		const trimmedSelectedMerchantName = selectedMerchantName.trim();

		if (selectedMerchantId && trimmedSelectedMerchantName) {
			const normalizedValueName = normalizeMerchantName(
				trimmedSelectedMerchantName,
			);

			if (!merchantByName.has(normalizedValueName)) {
				merchantByName.set(normalizedValueName, {
					id: selectedMerchantId,
					name: trimmedSelectedMerchantName,
					logoUrl: null,
					transactionCount: 0,
				});
			}
		}

		return Array.from(merchantByName.values()).sort((first, second) => {
			return (
				second.transactionCount - first.transactionCount ||
				first.name.localeCompare(second.name)
			);
		});
	}, [sourceItems, selectedMerchantId, selectedMerchantName]);

	const visibleMerchants = useMemo(() => {
		const normalizedQuery = normalizeMerchantName(query);

		const matches = normalizedQuery
			? options.filter((merchant) => {
					return normalizeMerchantName(merchant.name).includes(normalizedQuery);
				})
			: options;

		return matches.slice(0, maxOptions);
	}, [maxOptions, options, query]);

	const exactMerchant = useMemo(() => {
		const normalizedQuery = normalizeMerchantName(query);

		if (!normalizedQuery) {
			return null;
		}

		return (
			options.find((merchant) => {
				return normalizeMerchantName(merchant.name) === normalizedQuery;
			}) ?? null
		);
	}, [options, query]);

	const canCreate =
		allowCreate && query.trim().length > 0 && exactMerchant === null;

	const optionCount = visibleMerchants.length + (canCreate ? 1 : 0);

	const { refs, floatingStyles, context } = useFloating({
		open: isOpen,
		onOpenChange: (nextOpen) => {
			setIsOpen(nextOpen);

			if (!nextOpen) {
				setDraftQuery(null);
				setActiveIndex(0);
				setCreateError(null);
			}
		},
		placement: "bottom-start",
		strategy: "fixed",
		whileElementsMounted: autoUpdate,
		middleware: [
			offset(6),
			flip({
				padding: 12,
			}),
			shift({
				padding: 12,
			}),
			size({
				padding: 12,
				apply({ rects, elements, availableHeight, availableWidth }) {
					Object.assign(elements.floating.style, {
						width: `${Math.min(rects.reference.width, availableWidth)}px`,
						maxHeight: `${Math.min(384, availableHeight)}px`,
					});
				},
			}),
		],
	});

	const dismiss = useDismiss(context);
	const role = useRole(context, {
		role: "listbox",
	});

	const { getReferenceProps, getFloatingProps } = useInteractions([
		dismiss,
		role,
	]);

	const setReferenceElement = useCallback(
		(element: HTMLInputElement | null) => {
			refs.setReference(element);
		},
		[refs],
	);

	const setFloatingElement = useCallback(
		(element: HTMLDivElement | null) => {
			refs.setFloating(element);
		},
		[refs],
	);

	const openDropdown = () => {
		if (disabled) {
			return;
		}

		setDraftQuery(value?.name ?? "");
		setActiveIndex(0);
		setCreateError(null);
		setIsOpen(true);
	};

	const selectMerchant = (merchant: MerchantListItem) => {
		onChange({
			id: merchant.id,
			name: merchant.name,
		});

		setDraftQuery(null);
		setActiveIndex(0);
		setCreateError(null);
		setIsOpen(false);
	};

	const createMerchant = async () => {
		const cleanName = query.trim();

		if (!cleanName || !canCreate || isCreating) {
			return;
		}

		setIsCreating(true);
		setCreateError(null);

		try {
			const merchant = await addCustomMerchant(cleanName);

			onChange({
				id: merchant.id,
				name: merchant.name,
			});

			setDraftQuery(null);
			setActiveIndex(0);
			setIsOpen(false);
		} catch (caughtError) {
			console.error("Failed to create merchant:", caughtError);

			setCreateError(
				caughtError instanceof Error
					? caughtError.message
					: "Failed to create merchant.",
			);
		} finally {
			setIsCreating(false);
		}
	};

	const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
		const nextQuery = event.target.value;

		setDraftQuery(nextQuery);
		setActiveIndex(0);
		setCreateError(null);
		setIsOpen(true);
		onInputChange?.(nextQuery);
	};

	const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		if (event.key === "ArrowDown") {
			event.preventDefault();

			if (!isOpen) {
				setIsOpen(true);
			}

			setActiveIndex((current) => {
				if (optionCount === 0) {
					return 0;
				}

				return (current + 1) % optionCount;
			});

			return;
		}

		if (event.key === "ArrowUp") {
			event.preventDefault();

			if (!isOpen) {
				setIsOpen(true);
			}

			setActiveIndex((current) => {
				if (optionCount === 0) {
					return 0;
				}

				return (current - 1 + optionCount) % optionCount;
			});

			return;
		}

		if (event.key === "Escape") {
			event.preventDefault();
			setIsOpen(false);
			setDraftQuery(null);
			setActiveIndex(0);
			setCreateError(null);
			return;
		}

		if (event.key !== "Enter") {
			return;
		}

		event.preventDefault();

		const activeMerchant = visibleMerchants[activeIndex];

		if (activeMerchant) {
			selectMerchant(activeMerchant);
			return;
		}

		if (canCreate && activeIndex === visibleMerchants.length) {
			void createMerchant();
			return;
		}

		if (exactMerchant) {
			selectMerchant(exactMerchant);
			return;
		}

		if (canCreate) {
			void createMerchant();
		}
	};

	const activeOptionId =
		isOpen && optionCount > 0
			? `${listboxId}-option-${activeIndex}`
			: undefined;

	return (
		<div className={`min-w-0 ${className}`}>
			<div className="relative">
				<Search
					size={17}
					aria-hidden="true"
					className="
						pointer-events-none absolute
						left-3 top-1/2 z-10
						-translate-y-1/2 text-gray-400
					"
				/>

				<input
					ref={setReferenceElement}
					{...getReferenceProps()}
					type="search"
					role="combobox"
					aria-label={ariaLabel}
					aria-expanded={isOpen}
					aria-controls={listboxId}
					aria-activedescendant={activeOptionId}
					aria-autocomplete="list"
					aria-invalid={Boolean(error)}
					autoComplete="off"
					disabled={disabled}
					value={query}
					placeholder={placeholder}
					onFocus={openDropdown}
					onClick={openDropdown}
					onChange={handleInputChange}
					onKeyDown={handleInputKeyDown}
					className={`
						h-12 w-full rounded-xl border
						bg-white pl-10 pr-10 text-sm
						text-gray-900 outline-none
						transition
						placeholder:text-gray-400
						focus:ring-4
						disabled:cursor-not-allowed
						disabled:opacity-50
						dark:bg-white/3 dark:text-white
						${
							error
								? "border-red-500 focus:border-red-500 focus:ring-red-500/10"
								: "border-gray-200 focus:border-[#FF5A35] focus:ring-[#FF5A35]/10 dark:border-white/10"
						}
						${inputClassName}
					`}
				/>

				{isCreating ? (
					<Loader2
						size={17}
						aria-label="Creating merchant"
						className="
							absolute right-3 top-1/2
							-translate-y-1/2 animate-spin
							text-gray-400
						"
					/>
				) : (
					<ChevronDown
						size={16}
						aria-hidden="true"
						className={`
							pointer-events-none absolute
							right-3 top-1/2
							-translate-y-1/2
							text-gray-400
							transition-transform
							${isOpen ? "rotate-180" : ""}
						`}
					/>
				)}
			</div>

			{error && <p className="mt-1.5 text-sm text-red-500">{error}</p>}

			{isOpen && (
				<FloatingPortal>
					<div
						ref={setFloatingElement}
						{...getFloatingProps()}
						id={listboxId}
						style={floatingStyles}
						className="
							z-[10000] overflow-y-auto
							rounded-xl border border-gray-200
							bg-white p-1.5
							shadow-[0_18px_50px_rgba(0,0,0,0.22)]
							outline-none
							dark:border-white/10
							dark:bg-[#202020]
						"
					>
						{visibleMerchants.map((merchant, index) => {
							const selected = value?.id === merchant.id;
							const active = activeIndex === index;

							return (
								<button
									key={merchant.id}
									id={`${listboxId}-option-${index}`}
									type="button"
									role="option"
									aria-selected={selected}
									onMouseEnter={() => {
										setActiveIndex(index);
									}}
									onMouseDown={(event) => {
										event.preventDefault();
									}}
									onClick={() => {
										selectMerchant(merchant);
									}}
									className={`
											flex w-full items-center
											rounded-lg px-3 py-2
											text-left outline-none
											transition-colors
											${
												active
													? "bg-gray-100 dark:bg-white/8"
													: "hover:bg-gray-100 dark:hover:bg-white/8"
											}
										`}
								>
									<MerchantOptionContent
										merchant={merchant}
										showCount={showCount}
										size={optionSize}
										selected={selected}
									/>
								</button>
							);
						})}

						{canCreate && (
							<button
								id={`${listboxId}-option-${visibleMerchants.length}`}
								type="button"
								role="option"
								aria-selected={false}
								disabled={isCreating}
								onMouseEnter={() => {
									setActiveIndex(visibleMerchants.length);
								}}
								onMouseDown={(event) => {
									event.preventDefault();
								}}
								onClick={() => {
									void createMerchant();
								}}
								className={`
									mt-1 flex w-full items-center
									gap-3 rounded-lg px-3 py-2.5
									text-left text-sm font-semibold
									text-[#FF5A35] outline-none
									transition-colors
									hover:bg-[#FF5A35]/8
									disabled:cursor-not-allowed
									disabled:opacity-50
									${activeIndex === visibleMerchants.length ? "bg-[#FF5A35]/8" : ""}
								`}
							>
								<span
									className="
										grid size-8 shrink-0
										place-items-center rounded-lg
										bg-[#FF5A35]/10
									"
								>
									{isCreating ? (
										<Loader2 size={16} className="animate-spin" />
									) : (
										<Plus size={16} />
									)}
								</span>

								<span className="min-w-0 truncate">
									Create “{query.trim()}”
								</span>
							</button>
						)}

						{visibleMerchants.length === 0 && !canCreate && (
							<p
								className="
										px-3 py-4 text-center
										text-sm text-gray-500
										dark:text-gray-400
									"
							>
								No merchants found.
							</p>
						)}

						{createError && (
							<p
								className="
									mt-1 border-t border-gray-200
									px-3 py-2 text-sm text-red-500
									dark:border-white/10
								"
							>
								{createError}
							</p>
						)}
					</div>
				</FloatingPortal>
			)}
		</div>
	);
}
