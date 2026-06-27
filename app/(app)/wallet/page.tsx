"use client";

import { useState, useMemo, useEffect } from "react";
import { CreditCard, useBudgetStore } from "@/store/useBudgetStore";
import {
	X,
	CheckCircle2,
	Plus,
	SquarePen,
	Save,
	Wallet,
	Star,
	Search,
	Command,
	Tag,
	EllipsisVertical,
	Trash2,
} from "lucide-react";
import Image from "next/image";
import { CATEGORY_DICTIONARY, CategoryId } from "@/config/categoryDictionary";
import * as Popover from "@radix-ui/react-popover";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

export default function WalletRewardsPage() {
	// --- CONNECT TO ZUSTAND ---
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

	// Fetch global cards and custom categories from Supabase on load
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

	// --- UI TOGGLES ---
	const [isWalletManagerOpen, setIsWalletManagerOpen] = useState(false);
	const [isSearchOpen, setIsSearchOpen] = useState(false);
	const [hiddenCategories, setHiddenCategories] = useState<string[]>([]);
	const [deletingCategory, setDeletingCategory] = useState<string | null>(null);

	// --- STATE ---
	const [searchQuery, setSearchQuery] = useState("");
	const [editingCategory, setEditingCategory] = useState<string | null>(null);
	const [tempRates, setTempRates] = useState<
		Record<string, number | undefined>
	>({});

	// --- UNIFIED CATEGORY DICTIONARY ---
	const unifiedCategories = useMemo(() => {
		const formattedCustomCategories = customCategories.map((dbCat) => ({
			id: dbCat.id,
			name: dbCat.name,
			icon: Tag, // Or your dynamic icon resolver
			accent: dbCat.color_key || "text-emerald-400",
		}));

		return [...CATEGORY_DICTIONARY, ...formattedCustomCategories];
	}, [customCategories]);

	// --- SEPARATE WALLET (MEMOIZED) ---
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

	// --- BENTO BOX ENGINE ---
	const optimizedCategories = useMemo(() => {
		return unifiedCategories
			.filter((cat) => activeCategoryIds.includes(cat.id))
			.map((category) => {
				const rankedCards: { card: CreditCard; rate: number }[] = [];

				userWallet.forEach((card) => {
					const customRate = customRates[category.id]?.[card.id];
					const dbRate =
						card.multipliers[category.id] || card.multipliers["catchAll"] || 1;

					const finalRate = customRate !== undefined ? customRate : dbRate;
					rankedCards.push({ card, rate: finalRate });
				});

				// 3. Sort them (Preferred wins first, then highest rate wins)
				rankedCards.sort((a, b) => {
					const preferredId = preferredCards[category.id];

					// ABSOLUTE OVERRIDE: Starred card wins instantly
					if (a.card.id === preferredId) return -1;
					if (b.card.id === preferredId) return 1;

					// Otherwise, highest math wins
					return b.rate - a.rate;
				});

				return {
					category,
					topCard: rankedCards.length > 0 ? rankedCards[0] : null,
					backupCard: rankedCards.length > 1 ? rankedCards[1] : null,
				};
			});
	}, [
		activeCategoryIds,
		userWallet,
		preferredCards,
		customRates,
		unifiedCategories,
	]);

	// --- HANDLERS ---
	const handleRemoveCard = (id: string) => {
		const newWallet = walletIds.filter((walletId) => walletId !== id);
		setWalletIds(newWallet);
	};

	const handleAddCard = (id: string) => {
		setWalletIds([...walletIds, id]);
	};

	const openEditModal = (categoryId: string) => {
		setEditingCategory(categoryId);
		const existingRates = customRates[categoryId] || {};
		setTempRates({ ...existingRates });
	};

	const saveCustomRates = () => {
		if (!editingCategory) return;

		const finalRates: Record<string, Record<string, number>> = {
			...customRates,
		};

		if (!finalRates[editingCategory]) {
			finalRates[editingCategory] = {};
		}

		const cardIds = Object.keys(tempRates);
		for (let i = 0; i < cardIds.length; i++) {
			const cardId = cardIds[i];
			const val = tempRates[cardId];

			if (val === undefined) {
				delete finalRates[editingCategory][cardId];
			} else {
				finalRates[editingCategory][cardId] = val;
			}
		}

		setCustomRates(finalRates);
		setEditingCategory(null);
	};

	// --- KEYBOARD SHORTCUT (Cmd+K or Ctrl+K) ---
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

	// --- SEARCH LOGIC ---
	const searchResults = useMemo(() => {
		if (!searchQuery.trim()) return [];

		const query = searchQuery.toLowerCase();
		return optimizedCategories.filter((item) =>
			item.category.name.toLowerCase().includes(query),
		);
	}, [searchQuery, optimizedCategories]);

	if (!hasHydrated) {
		return <div className="min-h-screen bg-[#050505]" />;
	}

	return (
		<div className="p-8 max-w-7xl mx-auto space-y-12 min-h-screen text-white bg-[#050505] relative">
			{/* --- HEADER --- */}
			<div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-white/5 pb-8">
				<div className="space-y-2">
					<h1 className="text-3xl font-black tracking-tighter uppercase italic">
						Spend Optimizer
					</h1>
				</div>

				<div className="flex items-center gap-3">
					{/* QUICK SEARCH BUTTON */}
					<button
						onClick={() => setIsSearchOpen(true)}
						className="flex items-center gap-3 bg-[#111] border border-white/10 hover:border-gray-500/50 px-4 py-2.5 rounded-xl transition-all shadow-xl text-gray-400 hover:text-gray-400 group"
					>
						<Search size={18} />
						<div className="hidden sm:flex items-center gap-0.5 bg-white/5 px-1.5 py-0.5 rounded text-[10px] font-black tracking-widest border border-white/5 group-hover:border-gray-500/20">
							<Command size={10} /> K
						</div>
					</button>

					{/* WALLET MANAGER BUTTON */}
					<button
						onClick={() => setIsWalletManagerOpen(true)}
						className="flex items-center gap-3 bg-[#111] border border-white/20 hover:border-blue-500/50 px-4 py-2.5 rounded-xl transition-all shadow-xl"
					>
						<Wallet size={18} className="text-blue-400" />
						<span className="text-sm">Wallet</span>
						<span className="bg-white/10 text-white text-xs font-black px-2 py-0.5 rounded-full">
							{userWallet.length}
						</span>
					</button>

					{/* ADD CATEGORY POPOVER */}
					<Popover.Root>
						<Popover.Trigger asChild>
							<button className="flex items-center gap-2 bg-[#111] border border-white/20 hover:border-emerald-500/50 px-4 py-2.5 rounded-xl transition-all shadow-xl text-white text-sm">
								<Plus size={18} className="text-emerald-500" />
								Category
							</button>
						</Popover.Trigger>

						<Popover.Portal>
							<Popover.Content
								className="bg-[#111] border border-white/20 rounded-xl overflow-hidden z-50 shadow-2xl w-50 mt-2"
								sideOffset={5}
							>
								<div className="max-h-70 overflow-y-auto custom-scrollbar">
									{unifiedCategories.filter(
										(cat) => !activeCategoryIds.includes(cat.id),
									).length > 0 ? (
										unifiedCategories
											.filter((cat) => !activeCategoryIds.includes(cat.id))
											.map((cat) => {
												const Icon = cat.icon as React.ElementType;
												return (
													<div
														key={cat.id}
														onClick={() =>
															addActiveCategory(cat.id as CategoryId)
														}
														className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 cursor-pointer transition-colors"
													>
														<Icon size={16} className={cat.accent} />
														<span className="text-xs font-bold text-gray-200">
															{cat.name}
														</span>
													</div>
												);
											})
									) : (
										<div className="px-4 py-3 text-xs text-gray-500 italic">
											All tracked
										</div>
									)}
								</div>
							</Popover.Content>
						</Popover.Portal>
					</Popover.Root>
				</div>
			</div>

			{/* --- BENTO BOX GRID --- */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative">
				{optimizedCategories.map((item) => {
					const hasCards = item.topCard !== null;
					const Icon = item.category.icon as React.ElementType;
					const isHidden = hiddenCategories.includes(item.category.id);

					return (
						<div
							key={item.category.id}
							className={`bg-[#0a0a0a] border border-white/5 rounded-3xl p-6 relative overflow-hidden group flex flex-col min-h-37.5 hover:border-white/10 transition-all ${isHidden ? "h-20 opacity-50" : ""}`}
						>
							{/* Action Bar - Fixed positioning */}
							<div className="absolute top-2 right-2 z-10">
								<DropdownMenu.Root>
									<DropdownMenu.Trigger asChild>
										<button className="p-1.5 rounded-lg bg-black/20 hover:bg-white/10 backdrop-blur-md transition-colors text-white/70">
											<EllipsisVertical size={12} />
										</button>
									</DropdownMenu.Trigger>

									<DropdownMenu.Portal>
										<DropdownMenu.Content
											className="bg-[#111] border border-white/10 rounded-xl p-1 shadow-2xl z-50 min-w-25"
											sideOffset={5}
										>
											<DropdownMenu.Item
												onClick={() => openEditModal(item.category.id)}
												className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-white hover:bg-white/5 rounded-lg cursor-pointer outline-none"
											>
												<SquarePen size={14} /> Edit Rates
											</DropdownMenu.Item>

											<DropdownMenu.Separator className="h-px bg-white/10 my-1" />

											<DropdownMenu.Item
												onClick={() => setDeletingCategory(item.category.id)}
												className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-500/10 rounded-lg cursor-pointer outline-none"
											>
												<Trash2 size={14} /> Remove
											</DropdownMenu.Item>
										</DropdownMenu.Content>
									</DropdownMenu.Portal>
								</DropdownMenu.Root>
							</div>

							{isHidden ? (
								<div className="flex items-center justify-between h-full px-2">
									<span className="text-xs font-bold text-gray-400">
										{item.category.name}
									</span>
									<button
										onClick={() =>
											setHiddenCategories((prev) =>
												prev.filter((id) => id !== item.category.id),
											)
										}
										className="text-[10px] font-bold text-emerald-500 hover:text-emerald-400"
									>
										SHOW
									</button>
								</div>
							) : (
								<>
									<div className="flex items-center justify-between mb-6 relative z-10">
										<div className="flex items-center gap-2">
											<div
												className={`p-2 rounded-xl bg-white/5 ${item.category.accent}`}
											>
												<Icon size={16} />
											</div>
											<h2 className="text-sm font-bold tracking-wide">
												{item.category.name}
											</h2>
										</div>
										{hasCards && (
											<p
												className={`text-2xl font-black ${item.category.accent}`}
											>
												{item.topCard?.rate}x
											</p>
										)}
									</div>

									{/* Image Container - Fixed Flex Grow & Aspect Ratio */}
									<div className="grow flex items-center justify-center relative z-10 my-auto">
										{!hasCards ? (
											<p className="text-xs text-gray-600 font-medium italic">
												Wallet is empty
											</p>
										) : (
											<div className="relative w-full max-w-50 aspect-[1.58/1] transition-transform duration-500 group-hover:scale-105">
												{item.topCard?.card.image_url ? (
													<Image
														src={item.topCard.card.image_url}
														alt={item.topCard.card.name}
														fill
														sizes="(max-width: 768px) 200px, 200px"
														className="object-contain drop-shadow-2xl"
														priority
													/>
												) : (
													<div
														className={`w-full h-full rounded-xl bg-linear-to-br ${item.topCard?.card.color} border border-white/20`}
													/>
												)}
											</div>
										)}
									</div>
								</>
							)}
							{/* BACKUP CARD SECTION */}
							{hasCards && item.backupCard && (
								<div className="mt-auto pt-3 border-t border-white/5 relative z-10 flex items-center justify-between">
									<div className="flex items-center gap-1.5 text-gray-500">
										<CheckCircle2 size={10} />
										<span className="text-[9px] uppercase font-black tracking-widest">
											Backup
										</span>
									</div>
									<p className="text-[10px] font-medium text-gray-400">
										{item.backupCard.card.name}
										<span className="text-white/40 ml-1">
											({item.backupCard.rate}x)
										</span>
									</p>
								</div>
							)}
							{/* --- DELETE CONFIRMATION MODAL (GLASS STYLE) --- */}
							{deletingCategory && (
								<div className="fixed inset-0 z-100 flex items-center justify-center p-4">
									{/* Backdrop overlay */}
									<div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />

									{/* Glass Modal Card */}
									<div className="relative bg-white/3 border border-white/10 backdrop-blur-xl rounded-2xl p-6 w-full max-w-sm shadow-2xl">
										<h3 className="text-lg font-black text-white">
											Remove Category?
										</h3>
										<p className="text-sm text-gray-400 mt-2">
											This will remove{" "}
											<strong>
												{
													unifiedCategories.find(
														(c) => c.id === deletingCategory,
													)?.name
												}
											</strong>{" "}
											from your dashboard.
										</p>
										<div className="flex gap-3 mt-6">
											<button
												onClick={() => setDeletingCategory(null)}
												className="flex-1 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-bold transition-colors"
											>
												Cancel
											</button>
											<button
												onClick={() => {
													removeActiveCategory(deletingCategory);
													setDeletingCategory(null);
												}}
												className="flex-1 px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 text-sm font-bold transition-colors"
											>
												Confirm
											</button>
										</div>
									</div>
								</div>
							)}
						</div>
					);
				})}
			</div>

			{/* --- EDIT MULTIPLIERS MODAL --- */}
			{editingCategory && (
				<div className="fixed inset-0 z-100 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
					<div className="bg-[#0a0a0a] border border-white/10 rounded-3xl w-full max-w-lg flex flex-col shadow-2xl max-h-[65vh]">
						<div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0">
							<div>
								{(() => {
									const category = unifiedCategories.find(
										(c) => c.id === editingCategory,
									);
									if (!category) return null;

									const Icon = category.icon as React.ElementType;

									return (
										<div className="flex items-center gap-3 mb-6">
											<div
												className={`p-2 rounded-xl bg-white/5 ${category.accent}`}
											>
												<Icon size={20} />
											</div>
											<div>
												<h3 className="text-xl font-black tracking-tight">
													Edit Multipliers
												</h3>
												<p className="flex items-center gap-2 text-xs font-medium text-gray-500 mt-0.5">
													Set custom rates for
													<span className="flex items-center gap-1.5 text-white bg-white/5 px-2 py-0.5 rounded-md">
														{category.name}
														<Icon size={12} className={category.accent} />
													</span>
												</p>
											</div>
										</div>
									);
								})()}
							</div>
							<button
								onClick={() => setEditingCategory(null)}
								className="text-gray-500 hover:text-white p-2 rounded-full hover:bg-white/5 transition-colors"
							>
								<X size={20} />
							</button>
						</div>

						<div className="p-4 sm:p-6 overflow-y-auto space-y-1.5 custom-scrollbar">
							{[...userWallet]
								.sort((a, b) => {
									const catId = editingCategory;
									const rateA =
										customRates[catId]?.[a.id] ??
										a.multipliers[catId] ??
										a.multipliers["CatchAll"] ??
										1;
									const rateB =
										customRates[catId]?.[b.id] ??
										b.multipliers[catId] ??
										b.multipliers["CatchAll"] ??
										1;
									return rateB - rateA;
								})
								.map((card) => {
									const catId = editingCategory;
									// Get default rate using clean ID
									const defaultRate =
										card.multipliers[catId] ??
										card.multipliers["CatchAll"] ??
										1;
									const isPreferred = preferredCards[catId] === card.id;
									return (
										<div
											key={card.id}
											className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/3 border border-transparent hover:border-white/5 transition-colors group"
										>
											<div className="flex items-center gap-3 overflow-hidden pr-2">
												{card.image_url ? (
													<Image
														src={card.image_url}
														alt={card.name}
														width={40}
														height={24}
														sizes="(max-width: 768px) 200px, 200px"
														className="w-8 h-5 rounded shadow-sm object-cover border border-white/20"
														priority={true}
													/>
												) : (
													<div
														className={`w-1 h-8 rounded-full bg-linear-to-b ${card.color} shrink-0`}
													/>
												)}
												<div className="truncate">
													<p className="text-sm font-bold truncate">
														{card.name}
													</p>
													<p className="text-[10px] uppercase tracking-widest text-gray-500">
														Default: {defaultRate}x
													</p>
												</div>
											</div>

											<div className="flex items-center gap-2 shrink-0">
												<button
													onClick={() =>
														setPreferredCard(
															editingCategory,
															isPreferred ? null : card.id,
														)
													}
													className={`transition-colors p-1.5 rounded-md hover:bg-white/5 ${isPreferred ? "text-yellow-500 opacity-100" : "text-gray-600 hover:text-yellow-500/50 opacity-0 group-hover:opacity-100"}`}
													title="Set as tie-breaker"
												>
													<Star
														size={16}
														className={isPreferred ? "fill-yellow-500" : ""}
													/>
												</button>

												<div className="flex items-center gap-1.5 bg-[#111] border border-white/10 rounded-lg px-2 py-1.5 focus-within:border-emerald-500/50 transition-colors">
													<input
														type="number"
														step="0.5"
														min="0"
														value={tempRates[card.id] ?? ""}
														onChange={(e) => {
															const val = parseFloat(e.target.value);
															setTempRates({
																...tempRates,
																[card.id]: isNaN(val) ? undefined : val,
															});
														}}
														placeholder={`${defaultRate}`}
														className="w-12 sm:w-16 bg-transparent text-sm text-right outline-none font-medium placeholder:text-gray-600"
													/>
													<span className="text-gray-500 font-bold text-xs select-none">
														x
													</span>
												</div>
											</div>
										</div>
									);
								})}
						</div>

						<div className="p-5 sm:p-6 border-t border-white/5 bg-[#050505] shrink-0 flex justify-between items-center rounded-b-3xl">
							<button
								onClick={() => setTempRates({})}
								className="text-[10px] font-black text-gray-500 hover:text-gray-300 uppercase tracking-widest transition-colors"
							>
								Reset Form
							</button>
							<button
								onClick={saveCustomRates}
								className="flex items-center gap-2 bg-emerald-500 text-black px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest hover:bg-emerald-400 transition-colors shadow-[0_0_15px_rgba(16,185,129,0.15)]"
							>
								<Save size={16} /> Save
							</button>
						</div>
					</div>
				</div>
			)}

			{/* --- WALLET MANAGER MODAL --- */}
			{isWalletManagerOpen && (
				<div className="fixed inset-0 z-100 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
					<div className="bg-[#0a0a0a] border border-white/10 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
						<div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0">
							<div>
								<h3 className="text-lg font-black tracking-tight">
									Manage Wallet
								</h3>
								<p className="text-xs font-medium text-gray-500 mt-1">
									Add or remove cards from your active loadout.
								</p>
							</div>
							<button
								onClick={() => setIsWalletManagerOpen(false)}
								className="text-gray-500 hover:text-white p-2"
							>
								<X size={20} />
							</button>
						</div>

						<div className="p-6 overflow-y-auto space-y-8 grow custom-scrollbar">
							<div className="space-y-3">
								<h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500">
									Active Cards ({userWallet.length})
								</h4>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
									{userWallet.map((card) => (
										<div
											key={card.id}
											className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 group"
										>
											<div className="flex items-center gap-3">
												{card.image_url ? (
													<Image
														src={card.image_url}
														alt={card.name}
														width={40}
														height={24}
														sizes="(max-width: 768px) 200px, 200px"
														className="w-10 h-6 rounded shadow-sm object-cover border border-white/20 shrink-0"
														priority={true}
													/>
												) : (
													<div
														className={`w-8 h-5 rounded shadow-sm border border-white/20 bg-linear-to-br ${card.color}`}
													/>
												)}
												<p className="text-sm font-bold truncate max-w-50">
													{card.name}
												</p>
											</div>
											<button
												onClick={() => handleRemoveCard(card.id)}
												className="text-gray-600 hover:text-red-400 transition-colors"
											>
												<X size={16} />
											</button>
										</div>
									))}
								</div>
							</div>

							{availableCards.length > 0 && (
								<div className="space-y-3 pt-4 border-t border-white/5">
									<h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500">
										Add Cards
									</h4>
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
										{availableCards.map((card) => (
											<button
												key={card.id}
												onClick={() => handleAddCard(card.id)}
												className="flex items-center justify-between p-3 rounded-xl bg-[#111] border border-white/10 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all text-left"
											>
												<div className="flex items-center gap-3">
													{card.image_url ? (
														<Image
															src={card.image_url}
															alt={card.name}
															width={32}
															height={20}
															sizes="(max-width: 768px) 200px, 200px"
															className="w-8 h-5 rounded shadow-sm object-cover border border-white/20 opacity-50"
															priority={true}
														/>
													) : (
														<div
															className={`w-8 h-5 rounded shadow-sm border border-white/20 bg-linear-to-br ${card.color}`}
														/>
													)}
													<p className="text-sm font-bold text-gray-400 truncate max-w-35">
														{card.name}
													</p>
												</div>
												<Plus size={16} className="text-emerald-500" />
											</button>
										))}
									</div>
								</div>
							)}
						</div>
					</div>
				</div>
			)}

			{/* --- QUICK SEARCH MODAL --- */}
			{isSearchOpen && (
				<div className="fixed inset-0 z-100 flex items-start justify-center bg-black/80 backdrop-blur-sm p-4 pt-[10vh] animate-in fade-in duration-200">
					<div className="bg-[#0a0a0a] border border-white/10 rounded-2xl w-full max-w-xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
						<div className="flex items-center gap-3 px-4 py-4 border-b border-white/10 bg-[#111]">
							<Search size={20} className="text-emerald-500" />
							<input
								autoFocus
								type="text"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								placeholder="Type a category (e.g., Dining, Gas)..."
								className="w-full bg-transparent border-none outline-none text-lg placeholder:text-gray-600 font-medium text-white"
							/>
							<button
								onClick={() => {
									setIsSearchOpen(false);
									setSearchQuery("");
								}}
								className="bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white text-[10px] font-black tracking-widest uppercase px-2 py-1 rounded transition-colors"
							>
								Esc
							</button>
						</div>

						{searchQuery.trim() !== "" && (
							<div className="max-h-[60vh] overflow-y-auto custom-scrollbar p-2">
								{searchResults.length > 0 ? (
									<div className="space-y-2">
										{searchResults.map((item) => {
											const Icon = item.category.icon as React.ElementType;
											return (
												<div
													key={item.category.id}
													className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors cursor-default"
												>
													<div className="flex items-center gap-4">
														<div
															className={`p-2 rounded-lg bg-white/5 ${item.category.accent}`}
														>
															<Icon size={18} />
														</div>
														<div>
															<p className="text-sm font-bold text-gray-300">
																{item.category.name}
															</p>
															<p className="text-xs text-gray-500 font-medium">
																{item.topCard
																	? item.topCard.card.name
																	: "No cards available"}
															</p>
														</div>
													</div>

													{item.topCard && (
														<div className="flex items-center gap-4">
															<div
																className={`text-xl font-black ${item.category.accent}`}
															>
																{item.topCard.rate}x
															</div>
															{item.topCard.card.image_url ? (
																<Image
																	src={item.topCard.card.image_url}
																	alt={item.topCard.card.name}
																	width={48}
																	height={30}
																	className="rounded shadow-sm object-cover border border-white/20"
																/>
															) : (
																<div
																	className={`w-12 h-7.5 rounded shadow-sm border border-white/20 bg-linear-to-br ${item.topCard.card.color}`}
																/>
															)}
														</div>
													)}
												</div>
											);
										})}
									</div>
								) : (
									<div className="py-12 text-center">
										<p className="text-gray-500 font-medium text-sm">
											No categories found for &quot;{searchQuery}&quot;
										</p>
									</div>
								)}
							</div>
						)}

						{searchQuery.trim() === "" && (
							<div className="px-6 py-8 text-center bg-[#050505]">
								<p className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-4">
									Instant answers at the register
								</p>
								<div className="flex flex-wrap items-center justify-center gap-2">
									{optimizedCategories.slice(0, 3).map((item) => (
										<button
											key={item.category.id}
											onClick={() => setSearchQuery(item.category.name)}
											className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-gray-400 hover:text-white hover:border-white/30 transition-colors"
										>
											{item.category.name}
										</button>
									))}
								</div>
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
