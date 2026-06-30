"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { CreditCard, useBudgetStore } from "@/store/useBudgetStore";
import { CATEGORY_DICTIONARY } from "@/config/categoryDictionary";
import { Tag } from "lucide-react";
import { WalletHeader } from "@/components/Wallet/Header";
import { BentoCard } from "@/components/Wallet/BentoCard";
import { WalletManagerModal } from "@/components/Wallet/modals/WalletManagerModal";
import { EditRatesModal } from "@/components/Wallet/modals/EditRatesModal";
import { QuickSearchModal } from "@/components/Wallet/modals/QuickSearchModal";
import { DeleteCategoryModal } from "@/components/Wallet/modals/DeleteCategoryModal";

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

	// Modal Data States
	const [editingCategory, setEditingCategory] = useState<string | null>(null);
	const [deletingCategory, setDeletingCategory] = useState<string | null>(null);

	// Derived Data
	const unifiedCategories = useMemo(() => {
		const formattedCustom = customCategories.map((c) => ({
			id: c.id,
			name: c.name,
			icon: Tag,
			accent: c.color_key || "text-emerald-400",
		}));
		return [...CATEGORY_DICTIONARY, ...formattedCustom];
	}, [customCategories]);

	const { userWallet, availableCards } = useMemo(() => {
		const user: CreditCard[] = [];
		const available: CreditCard[] = [];
		globalCards.forEach((card) =>
			walletIds.includes(card.id) ? user.push(card) : available.push(card),
		);
		return { userWallet: user, availableCards: available };
	}, [globalCards, walletIds]);

	const getTopCardsForCategory = useCallback(
		(categoryId: string) => {
			const rankedCards = userWallet.map((card) => ({
				card,
				rate:
					customRates[categoryId]?.[card.id] ??
					card.multipliers[categoryId] ??
					card.multipliers["catchAll"] ??
					1,
			}));
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
		return unifiedCategories
			.filter((cat) => activeCategoryIds.includes(cat.id))
			.map((category) => ({
				category,
				...getTopCardsForCategory(category.id),
			}));
	}, [activeCategoryIds, unifiedCategories, getTopCardsForCategory]);

	// Handlers
	const handleSaveRates = (
		id: string,
		rates: Record<string, number | undefined>,
	) => {
		const finalRates = { ...customRates };
		if (!finalRates[id]) finalRates[id] = {};
		Object.keys(rates).forEach((cardId) =>
			rates[cardId] === undefined
				? delete finalRates[id][cardId]
				: (finalRates[id][cardId] = rates[cardId]),
		);
		setCustomRates(finalRates);
		setEditingCategory(null);
	};

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

	if (!hasHydrated) return <div className="min-h-screen bg-[#050505]" />;

	return (
		<div className="p-8 max-w-7xl mx-auto space-y-12 min-h-screen text-white bg-[#050505] relative">
			<WalletHeader
				userWalletCount={userWallet.length}
				unifiedCategories={unifiedCategories}
				activeCategoryIds={activeCategoryIds}
				onOpenSearch={() => setIsSearchOpen(true)}
				onOpenWallet={() => setIsWalletManagerOpen(true)}
				onAddCategory={(id) => addActiveCategory(id)}
			/>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative">
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
