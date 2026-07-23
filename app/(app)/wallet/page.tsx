"use client";

import {
	useState,
	useMemo,
	useEffect,
	useCallback,
	type CSSProperties,
	type ReactNode,
} from "react";
import { CreditCard, useBudgetStore } from "@/store/useBudgetStore";
import { CATEGORY_DICTIONARY, CategoryId } from "@/config/categoryDictionary";
import { Tag, CheckCircle2, SquarePen, Trash2, X } from "lucide-react";
import { WalletHeader } from "@/components/Wallet/Header";
import { BentoCard } from "@/components/Wallet/BentoCard";
import { WalletManagerModal } from "@/components/Wallet/modals/WalletManagerModal";
import { EditRatesModal } from "@/components/Wallet/modals/EditRatesModal";
import { QuickSearchModal } from "@/components/Wallet/modals/QuickSearchModal";
import { DeleteCategoryModal } from "@/components/Wallet/modals/DeleteCategoryModal";
import Image from "next/image";
import { DragDropProvider } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { move } from "@dnd-kit/helpers";
import ViewToggle from "@/components/ViewToggle";

export default function WalletRewardsPage() {
	const {
		globalCards,
		walletIds,
		activeCategoryIds,
		customRates,
		preferredCards,
		hasHydrated,
		customCategories,
		fetchGlobalCards,
		setWalletIds,
		setCustomRates,
		setPreferredCard,
		fetchCustomCategories,
		fetchPreferredCards,
		addActiveCategory,
		fetchActiveCategories,
		removeActiveCategory,
		reorderActiveCategories,
	} = useBudgetStore();

	useEffect(() => {
		fetchGlobalCards();
		fetchCustomCategories();
		fetchPreferredCards();
		fetchActiveCategories();
	}, [
		fetchGlobalCards,
		fetchCustomCategories,
		fetchPreferredCards,
		fetchActiveCategories,
	]);

	// UI State
	const [isWalletManagerOpen, setIsWalletManagerOpen] = useState(false);
	const [isSearchOpen, setIsSearchOpen] = useState(false);
	const [hiddenCategories, setHiddenCategories] = useState<string[]>([]);
	const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
		if (typeof window === "undefined") {
			return "grid";
		}

		return window.matchMedia("(max-width: 767px)").matches ? "list" : "grid";
	});
	const [pendingCategoryOrder, setPendingCategoryOrder] = useState<
		CategoryId[] | null
	>(null);
	const [reorderError, setReorderError] = useState<string | null>(null);
	const [isReordering, setIsReordering] = useState(false);

	// Modal Data States
	const [editingCategory, setEditingCategory] = useState<string | null>(null);
	const [deletingCategory, setDeletingCategory] = useState<CategoryId | null>(
		null,
	);
	const [activeStackId, setActiveStackId] = useState<string | null>(null);

	// Derived Data
	const unifiedCategories = useMemo(() => {
		const categories = [...CATEGORY_DICTIONARY];
		for (let i = 0; i < customCategories.length; i++) {
			const c = customCategories[i];
			categories.push({
				id: c.id as CategoryId,
				name: c.name,
				icon: Tag,
				accent: c.color_key || "text-emerald-400",
			});
		}
		return categories;
	}, [customCategories]);

	const { userWallet, availableCards } = useMemo(() => {
		const user: CreditCard[] = [];
		const available: CreditCard[] = [];

		for (let i = 0; i < globalCards.length; i++) {
			const card = globalCards[i];
			if (walletIds.includes(card.id)) {
				user.push(card);
			} else {
				available.push(card);
			}
		}
		return { userWallet: user, availableCards: available };
	}, [globalCards, walletIds]);

	const getTopCardsForCategory = useCallback(
		(categoryId: string) => {
			const rankedCards = [];
			for (let i = 0; i < userWallet.length; i++) {
				const card = userWallet[i];
				rankedCards.push({
					card,
					rate:
						customRates[categoryId]?.[card.id] ??
						card.multipliers[categoryId] ??
						card.multipliers["catchAll"] ??
						1,
				});
			}

			rankedCards.sort((a, b) => {
				const pref = preferredCards[categoryId];
				if (a.card.id === pref) return -1;
				if (b.card.id === pref) return 1;
				return b.rate - a.rate;
			});

			return {
				topCard: rankedCards[0] || null,
				backupCard: rankedCards[1] || null,
			};
		},
		[userWallet, customRates, preferredCards],
	);

	const sortableCategoryIds = pendingCategoryOrder ?? activeCategoryIds;

	const optimizedCategories = useMemo(() => {
		const result = [];

		for (let i = 0; i < sortableCategoryIds.length; i++) {
			const currentId = sortableCategoryIds[i];
			let foundCategory = null;

			// Find the matching category object
			for (let j = 0; j < unifiedCategories.length; j++) {
				if (unifiedCategories[j].id === currentId) {
					foundCategory = unifiedCategories[j];
					break;
				}
			}

			if (foundCategory) {
				result.push({
					category: foundCategory,
					...getTopCardsForCategory(foundCategory.id),
				});
			}
		}

		return result;
	}, [sortableCategoryIds, unifiedCategories, getTopCardsForCategory]);

	// Handlers
	const releaseFocusedElement = useCallback((): void => {
		const focusedElement = document.activeElement;

		if (focusedElement instanceof HTMLElement) {
			focusedElement.blur();
		}
	}, []);

	const openWalletManager = useCallback((): void => {
		releaseFocusedElement();
		setIsWalletManagerOpen(true);
	}, [releaseFocusedElement]);

	const openSearch = useCallback((): void => {
		releaseFocusedElement();
		setIsSearchOpen(true);
	}, [releaseFocusedElement]);

	const openEditRates = useCallback(
		(categoryId: string): void => {
			releaseFocusedElement();
			setEditingCategory(categoryId);
		},
		[releaseFocusedElement],
	);

	const openDeleteCategory = useCallback(
		(categoryId: CategoryId): void => {
			releaseFocusedElement();
			setDeletingCategory(categoryId);
		},
		[releaseFocusedElement],
	);

	const handleSaveRates = (
		id: string,
		rates: Record<string, number | undefined>,
	) => {
		const finalRates = { ...customRates };
		if (!finalRates[id]) finalRates[id] = {};

		const cardIds = Object.keys(rates);
		for (let i = 0; i < cardIds.length; i++) {
			const cardId = cardIds[i];
			if (rates[cardId] === undefined) {
				delete finalRates[id][cardId];
			} else {
				finalRates[id][cardId] = rates[cardId] as number;
			}
		}
		setCustomRates(finalRates);
		setEditingCategory(null);
	};

	const handleDragEnd = (event: Parameters<typeof move>[1]): void => {
		if (isReordering) {
			return;
		}

		const previousOrder = sortableCategoryIds;
		const nextOrder = move(previousOrder, event) as CategoryId[];

		if (
			nextOrder.length !== previousOrder.length ||
			nextOrder.every((id, index) => id === previousOrder[index])
		) {
			return;
		}

		setPendingCategoryOrder(nextOrder);
		setReorderError(null);
		setIsReordering(true);

		void reorderActiveCategories(nextOrder)
			.then(() => {
				setPendingCategoryOrder(null);
			})
			.catch((error: unknown) => {
				setPendingCategoryOrder(null);
				setReorderError(
					error instanceof Error
						? error.message
						: "The category order could not be saved.",
				);
			})
			.finally(() => {
				setIsReordering(false);
			});
	};

	useEffect(() => {
		// Only fetch if we don't have categories yet
		if (activeCategoryIds.length === 0) {
			fetchActiveCategories();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []); // Empty array ensures this only runs once on mount

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === "k") {
				e.preventDefault();
				openSearch();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [openSearch]);

	if (!hasHydrated)
		return <div className="min-h-screen bg-white dark:bg-[#050505]" />;

	return (
		<div className="relative isolate min-h-screen w-full max-w-none space-y-5 bg-white px-3 py-4 text-gray-900 transition-colors duration-300 dark:bg-[#050505] dark:text-white sm:space-y-6 sm:px-4 sm:py-6 md:space-y-8 md:px-5 lg:space-y-10 lg:px-6 xl:px-7 2xl:px-8">
			<WalletHeader
				userWalletCount={userWallet.length}
				unifiedCategories={unifiedCategories}
				activeCategoryIds={activeCategoryIds}
				onOpenSearch={openSearch}
				onOpenWallet={openWalletManager}
				onAddCategory={(id) => addActiveCategory(id)}
			/>
			<div className="flex w-full items-center justify-end overflow-x-auto pb-1">
				<ViewToggle
					viewMode={viewMode}
					setViewMode={setViewMode}
					iconSize={20}
				/>
			</div>

			{reorderError && (
				<div className="flex items-start justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
					<span>{reorderError}</span>
					<button
						type="button"
						onClick={() => setReorderError(null)}
						aria-label="Dismiss reorder error"
					>
						<X size={16} />
					</button>
				</div>
			)}

			<DragDropProvider onDragEnd={handleDragEnd}>
				{viewMode === "grid" ? (
					<div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,19rem),1fr))] gap-4 sm:gap-5 lg:gap-6">
						{optimizedCategories.map((item, index) => (
							<WalletSortableItem
								key={item.category.id}
								id={item.category.id}
								index={index}
								disabled={isReordering}
							>
								<BentoCard
									item={item}
									priority={index < 4}
									isHidden={hiddenCategories.includes(item.category.id)}
									onToggleHide={(id) =>
										setHiddenCategories((previous) =>
											previous.includes(id)
												? previous.filter((categoryId) => categoryId !== id)
												: [...previous, id],
										)
									}
									onEdit={openEditRates}
									onDelete={openDeleteCategory}
								/>
							</WalletSortableItem>
						))}
					</div>
				) : (
					<div className="mx-auto flex w-full max-w-[34rem] flex-col pb-28 sm:pb-36 md:pb-44 [&>*+*]:-mt-14 sm:[&>*+*]:-mt-20 md:[&>*+*]:-mt-24 lg:[&>*+*]:-mt-28">
						{optimizedCategories.map((item, index) => {
							const Icon = item.category.icon as React.ElementType;
							const isActive = activeStackId === item.category.id;

							return (
								<WalletSortableItem
									key={item.category.id}
									id={item.category.id}
									index={index}
									disabled={isReordering}
									className="relative flex w-full flex-col"
									style={{ zIndex: isActive ? 100 : index }}
								>
									<div
										onClick={() =>
											setActiveStackId(isActive ? null : item.category.id)
										}
										className={`relative z-10 aspect-[1.58/1] w-full cursor-grab overflow-hidden rounded-xl border-t border-white/20 drop-shadow-2xl transition-transform duration-300 active:cursor-grabbing sm:rounded-2xl sm:duration-500 ${
											isActive
												? "-translate-y-2 scale-[1.02] shadow-2xl shadow-black/40 sm:-translate-y-4 sm:scale-105"
												: "md:hover:-translate-y-6 lg:hover:-translate-y-8"
										}`}
									>
										{item.topCard?.card.image_url ? (
											<Image
												src={item.topCard.card.image_url}
												alt={`${item.topCard.card.name} card`}
												fill
												loading="eager"
												fetchPriority={index === 0 ? "high" : "auto"}
												sizes="(max-width: 640px) calc(100vw - 24px), (max-width: 1024px) 34rem, 544px"
												className="object-cover"
											/>
										) : (
											<div
												className={`h-full w-full bg-linear-to-br ${item.category.accent}`}
											/>
										)}

										<div className="absolute right-2.5 top-2.5 flex max-w-[calc(100%-1.25rem)] items-center gap-1.5 rounded-full border border-white/60 bg-white/50 px-2.5 py-1 shadow-xl shadow-black/10 backdrop-blur-2xl backdrop-saturate-150 dark:border-white/20 dark:bg-white/10 sm:right-4 sm:top-4 sm:gap-2.5 sm:px-3 sm:py-1.5">
											<div className="flex min-w-0 items-center gap-1.5 text-gray-900 dark:text-white/90">
												<Icon size={12} className={item.category.accent} />
												<span className="mt-px truncate text-[9px] font-bold uppercase tracking-wider sm:text-[10px] sm:tracking-widest">
													{item.category.name}
												</span>
											</div>
											<div className="h-3 w-px bg-gray-900/10 dark:bg-white/10" />
											<span
												className={`shrink-0 text-xs font-black drop-shadow-sm sm:text-sm ${item.category.accent}`}
											>
												{item.topCard?.rate}x
											</span>
										</div>
									</div>

									<div
										className={`relative -z-10 mx-2 overflow-hidden rounded-b-xl border border-gray-200 bg-white shadow-xl transition-all duration-300 ease-in-out dark:border-white/10 dark:bg-[#111] sm:mx-4 sm:rounded-b-2xl sm:duration-500 ${
											isActive
												? "-mt-3 mb-5 max-h-64 translate-y-0 px-3 pb-3 pt-7 sm:-mt-4 sm:mb-8 sm:px-4 sm:pb-4 sm:pt-8"
												: "-mt-12 mb-0 max-h-0 -translate-y-6 border-t-0 px-3 pb-0 pt-0 sm:-mt-16 sm:-translate-y-8 sm:px-4"
										}`}
									>
										{item.backupCard && (
											<div className="mb-3 flex flex-col gap-1.5 border-b border-gray-100 pb-3 sm:mb-4 sm:flex-row sm:items-center sm:justify-between sm:pb-4 dark:border-white/5">
												<div className="flex items-center gap-1.5 text-gray-500">
													<CheckCircle2 size={12} />
													<span className="text-[10px] font-black uppercase tracking-widest">
														Backup
													</span>
												</div>
												<p className="min-w-0 truncate text-xs font-bold text-gray-900 dark:text-white">
													{item.backupCard.card.name}
													<span className="ml-1 font-medium text-gray-400 dark:text-white/40">
														({item.backupCard.rate}x)
													</span>
												</p>
											</div>
										)}

										<div className="flex flex-col gap-2 sm:flex-row">
											<button
												type="button"
												onClick={(event) => {
													event.stopPropagation();
													openEditRates(item.category.id);
												}}
												className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gray-100 px-3 py-2 text-xs font-bold text-gray-900 transition-colors hover:bg-gray-200 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
											>
												<SquarePen size={14} /> Edit Rates
											</button>
											<button
												type="button"
												onClick={(event) => {
													event.stopPropagation();
													openDeleteCategory(item.category.id);
												}}
												className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-600 transition-colors hover:bg-red-100 dark:bg-red-500/10 dark:text-red-500 dark:hover:bg-red-500/20"
											>
												<Trash2 size={14} /> Remove
											</button>
										</div>
									</div>
								</WalletSortableItem>
							);
						})}
					</div>
				)}
			</DragDropProvider>

			<WalletManagerModal
				isOpen={isWalletManagerOpen}
				onClose={setIsWalletManagerOpen}
				userWallet={userWallet}
				availableCards={availableCards}
				globalCards={globalCards}
				unifiedCategories={unifiedCategories}
				customRates={customRates}
				onAddCard={(id) => setWalletIds([...walletIds, id])}
				onRemoveCard={(id) =>
					setWalletIds(walletIds.filter((wId) => wId !== id))
				}
			/>

			<EditRatesModal
				key={editingCategory || "none"}
				categoryId={editingCategory}
				category={unifiedCategories.find((c) => c.id === editingCategory)}
				userWallet={userWallet}
				customRates={customRates}
				preferredCards={preferredCards}
				onClose={() => setEditingCategory(null)}
				onSave={handleSaveRates}
				onSetPreferred={setPreferredCard}
			/>

			<QuickSearchModal
				isOpen={isSearchOpen}
				onClose={setIsSearchOpen}
				unifiedCategories={unifiedCategories}
				activeCategoryIds={activeCategoryIds}
				optimizedCategories={optimizedCategories}
				getTopCardsForCategory={getTopCardsForCategory}
				onPinCategory={addActiveCategory}
			/>

			<DeleteCategoryModal
				isOpen={!!deletingCategory}
				categoryName={
					unifiedCategories.find((c) => c.id === deletingCategory)?.name
				}
				onClose={() => setDeletingCategory(null)}
				onConfirm={() => {
					if (deletingCategory) removeActiveCategory(deletingCategory);
					setDeletingCategory(null);
				}}
			/>
		</div>
	);
}

interface WalletSortableItemProps {
	id: CategoryId;
	index: number;
	disabled?: boolean;
	children: ReactNode;
	className?: string;
	style?: CSSProperties;
}

function WalletSortableItem({
	id,
	index,
	disabled = false,
	children,
	className = "",
	style,
}: WalletSortableItemProps) {
	const [element, setElement] = useState<Element | null>(null);
	useSortable({
		id,
		index,
		element,
		disabled,
	});

	return (
		<div
			ref={setElement}
			style={style}
			className={`relative min-w-0 touch-pan-y select-none ${className}`}
		>
			{children}
		</div>
	);
}
