"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { CreditCard, useBudgetStore } from "@/store/useBudgetStore";
import { CATEGORY_DICTIONARY, CategoryId } from "@/config/categoryDictionary";
import {
	Tag,
	LayoutGrid,
	Layers,
	CheckCircle2,
	SquarePen,
	Trash2,
} from "lucide-react";
import { WalletHeader } from "@/components/Wallet/Header";
import { BentoCard } from "@/components/Wallet/BentoCard";
import { WalletManagerModal } from "@/components/Wallet/modals/WalletManagerModal";
import { EditRatesModal } from "@/components/Wallet/modals/EditRatesModal";
import { QuickSearchModal } from "@/components/Wallet/modals/QuickSearchModal";
import { DeleteCategoryModal } from "@/components/Wallet/modals/DeleteCategoryModal";
import Image from "next/image";

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
	const [viewMode, setViewMode] = useState<"grid" | "stack">("grid");

	// Modal Data States
	const [editingCategory, setEditingCategory] = useState<string | null>(null);
	const [deletingCategory, setDeletingCategory] = useState<string | null>(null);
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

	const optimizedCategories = useMemo(() => {
		const result = [];
		for (let i = 0; i < unifiedCategories.length; i++) {
			const category = unifiedCategories[i];
			if (activeCategoryIds.includes(category.id)) {
				result.push({
					category,
					...getTopCardsForCategory(category.id),
				});
			}
		}
		return result;
	}, [activeCategoryIds, unifiedCategories, getTopCardsForCategory]);

	// Handlers
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

	useEffect(() => {
		// Push the state update to the next tick to avoid React's synchronous render warning
		const timer = setTimeout(() => {
			if (window.innerWidth < 768) {
				setViewMode("stack");
			}
		}, 0);

		return () => clearTimeout(timer);
	}, []);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === "k") {
				e.preventDefault();
				setIsSearchOpen(true);
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, []);

	if (!hasHydrated)
		return <div className="min-h-screen bg-white dark:bg-[#050505]" />;

	return (
		<div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-12 min-h-screen text-gray-900 dark:text-white bg-white dark:bg-[#050505] relative transition-colors duration-300">
			<WalletHeader
				userWalletCount={userWallet.length}
				unifiedCategories={unifiedCategories}
				activeCategoryIds={activeCategoryIds}
				onOpenSearch={() => setIsSearchOpen(true)}
				onOpenWallet={() => setIsWalletManagerOpen(true)}
				onAddCategory={(id) => addActiveCategory(id)}
			/>
			<div className="flex items-center gap-1 bg-gray-100 dark:bg-[#0a0a0a] p-1 rounded-xl w-fit mb-4 md:mb-8 border border-gray-200 dark:border-white/5">
				<button
					type="button"
					onClick={() => setViewMode("grid")}
					className={`p-2 rounded-lg flex items-center gap-2 text-xs font-bold transition-all ${
						viewMode === "grid"
							? "bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white shadow-xs"
							: "text-gray-500 hover:text-gray-900 dark:hover:text-white"
					}`}
				>
					<LayoutGrid size={16} />
					GRID
				</button>
				<button
					type="button"
					onClick={() => setViewMode("stack")}
					className={`p-2 rounded-lg flex items-center gap-2 text-xs font-bold transition-all ${
						viewMode === "stack"
							? "bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white shadow-xs"
							: "text-gray-500 hover:text-gray-900 dark:hover:text-white"
					}`}
				>
					<Layers size={16} />
					STACK
				</button>
			</div>

			{viewMode === "grid" ? (
				// Your existing Grid Layout
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{optimizedCategories.map((item) => (
						<BentoCard
							key={item.category.id}
							item={item}
							isHidden={hiddenCategories.includes(item.category.id)}
							onToggleHide={(id) =>
								setHiddenCategories((prev) =>
									prev.includes(id)
										? prev.filter((c) => c !== id)
										: [...prev, id],
								)
							}
							onEdit={setEditingCategory}
							onDelete={setDeletingCategory}
						/>
					))}
				</div>
			) : (
				// The New Apple Wallet Stack Layout
				<div className="flex flex-col max-w-md mx-auto -space-y-30 md:-space-y-32 pb-40">
					{optimizedCategories.map((item, index) => {
						const Icon = item.category.icon as React.ElementType;
						const isActive = activeStackId === item.category.id;

						return (
							<div
								key={item.category.id}
								className="relative transition-all duration-500 ease-out flex flex-col"
								// Dynamically pop the active card to the absolute front
								style={{ zIndex: isActive ? 100 : index }}
							>
								{/* 1. The Physical Card */}
								<div
									onClick={() =>
										setActiveStackId(isActive ? null : item.category.id)
									}
									className={`relative z-10 w-full aspect-[1.58/1] rounded-2xl overflow-hidden border-t border-white/20 transition-all duration-500 cursor-pointer drop-shadow-2xl ${
										isActive
											? "-translate-y-4 scale-105 shadow-2xl shadow-black/40"
											: "hover:-translate-y-8 hover:pb-8"
									}`}
								>
									{item.topCard?.card.image_url ? (
										<Image
											src={item.topCard.card.image_url}
											alt="card"
											fill
											className="object-cover"
										/>
									) : (
										<div
											className={`w-full h-full bg-linear-to-br ${item.category.accent}`}
										/>
									)}

									{/* The iOS Glass Badge */}
									<div className="absolute top-4 right-4 flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white/50 dark:bg-white/10 backdrop-blur-2xl backdrop-saturate-150 border border-white/60 dark:border-white/20 shadow-xl shadow-black/10">
										<div className="flex items-center gap-1.5 text-gray-900 dark:text-white/90">
											<Icon size={12} className={item.category.accent} />
											<span className="text-[10px] uppercase font-bold tracking-widest mt-px">
												{item.category.name}
											</span>
										</div>
										<div className="w-px h-3 bg-gray-900/10 dark:bg-white/10" />
										<span
											className={`text-sm font-black drop-shadow-sm ${item.category.accent}`}
										>
											{item.topCard?.rate}x
										</span>
									</div>
								</div>

								{/* 2. The Hidden Control Panel */}
								<div
									className={`relative -z-10 transition-all duration-500 ease-in-out overflow-hidden mx-4 rounded-b-2xl bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 shadow-xl ${
										isActive
											? "max-h-48 opacity-100 -mt-4 pt-8 pb-4 px-4 translate-y-0 mb-8"
											: "max-h-0 opacity-0 -mt-16 pt-0 pb-0 px-4 -translate-y-8 mb-0 border-t-0"
									}`}
								>
									{/* Backup Card Info */}
									{item.backupCard && (
										<div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100 dark:border-white/5">
											<div className="flex items-center gap-1.5 text-gray-500">
												<CheckCircle2 size={12} />
												<span className="text-[10px] uppercase font-black tracking-widest">
													Backup
												</span>
											</div>
											<p className="text-xs font-bold text-gray-900 dark:text-white">
												{item.backupCard.card.name}
												<span className="text-gray-400 dark:text-white/40 ml-1 font-medium">
													({item.backupCard.rate}x)
												</span>
											</p>
										</div>
									)}

									{/* Action Buttons */}
									<div className="flex gap-2">
										<button
											type="button"
											onClick={(e) => {
												e.stopPropagation(); // Prevents the card from closing when clicked
												setEditingCategory(item.category.id);
											}}
											className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl text-xs font-bold text-gray-900 dark:text-white transition-colors"
										>
											<SquarePen size={14} /> Edit Rates
										</button>
										<button
											type="button"
											onClick={(e) => {
												e.stopPropagation(); // Prevents the card from closing when clicked
												setDeletingCategory(item.category.id);
											}}
											className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-xl text-xs font-bold text-red-600 dark:text-red-500 transition-colors"
										>
											<Trash2 size={14} /> Remove
										</button>
									</div>
								</div>
							</div>
						);
					})}
				</div>
			)}
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
