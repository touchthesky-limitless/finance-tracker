"use client";

import { useState, useMemo, useEffect } from "react";
import {
	CreditCard,
	RewardCategory,
	useBudgetStore,
} from "@/store/useBudgetStore";
import * as LucideIcons from "lucide-react";
import {
	Plus,
	X,
	Wifi,
	CheckCircle2,
	PlusCircle,
	Settings2,
	Save,
	Wallet,
	Star,
} from "lucide-react";
import Image from "next/image";

export default function WalletRewardsPage() {
	// --- CONNECT TO ZUSTAND ---
	const {
		globalCards,
		walletIds,
		rewardCategories,
		customRates,
		preferredCards,
		hasHydrated,
		customCategories,
		fetchGlobalCards,
		setWalletIds,
		setRewardCategories,
		setCustomRates,
		setPreferredCard,
		fetchCustomCategories,
		fetchPreferredCards,
	} = useBudgetStore();

	// Fetch global cards and custom categories from Supabase on load
	useEffect(() => {
		fetchGlobalCards();
		fetchCustomCategories();
		fetchPreferredCards();
	}, [fetchGlobalCards, fetchCustomCategories, fetchPreferredCards]);

	// --- UI TOGGLES ---
	const [isAddingCategory, setIsAddingCategory] = useState(false);
	const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
	const [isWalletManagerOpen, setIsWalletManagerOpen] = useState(false);
	const [newCategoryName, setNewCategoryName] = useState("");
	const [editingCategory, setEditingCategory] = useState<string | null>(null);
	const [tempRates, setTempRates] = useState<
		Record<string, number | undefined>
	>({});

	// --- PREPARE DATABASE CATEGORIES ---
	const availableDatabaseCategories = useMemo(() => {
		const result = [];

		for (let i = 0; i < customCategories.length; i++) {
			const dbCat = customCategories[i];
			let alreadyAdded = false;

			for (let j = 0; j < rewardCategories.length; j++) {
				if (rewardCategories[j].id === dbCat.id) {
					alreadyAdded = true;
					break;
				}
			}

			if (!alreadyAdded) {
				result.push({
					id: dbCat.id,
					name: dbCat.name,
					iconName: dbCat.icon_name || "Tag",
					accent: dbCat.color_key || "text-emerald-400",
				});
			}
		}

		return result;
	}, [customCategories, rewardCategories]);

	const handleSelectDatabaseCategory = (cat: RewardCategory) => {
		const newCategories = [];

		// Push the selected database category first
		newCategories.push({
			id: cat.id,
			name: cat.name,
			iconName: cat.iconName,
			accent: cat.accent,
		});

		// Append existing categories
		for (let i = 0; i < rewardCategories.length; i++) {
			newCategories.push(rewardCategories[i]);
		}

		setRewardCategories(newCategories);
		setIsCategoryDropdownOpen(false);
	};

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
		const result = [];

		for (let i = 0; i < rewardCategories.length; i++) {
			const category = rewardCategories[i];
			const rankedCards = [];

			// Map the string icon name to the actual Lucide component
			const IconComponent = (LucideIcons[
				category.iconName as keyof typeof LucideIcons
			] || LucideIcons.Tag) as unknown as React.ElementType;

			for (let j = 0; j < userWallet.length; j++) {
				const card = userWallet[j];

				let rate = customRates[category.id]?.[card.id];

				if (rate === undefined) {
					rate = card.multipliers[category.id as keyof typeof card.multipliers];
				}
				if (rate === undefined) {
					rate = card.multipliers["CatchAll"];
				}
				if (rate === undefined) {
					rate = 1;
				}

				rankedCards.push({ card, rate });
			}

			// 🌟 UPGRADED ENGINE: Override First, Math Second 🌟
			rankedCards.sort((a, b) => {
				const preferredId = preferredCards[category.id];

				// 1. ABSOLUTE OVERRIDE: If a card is starred, it instantly wins #1.
				if (a.card.id === preferredId) return -1;
				if (b.card.id === preferredId) return 1;

				// 2. STANDARD MATH: If neither is starred, sort by the highest multiplier.
				return b.rate - a.rate;
			});

			let topCard = null;
			let backupCard = null;

			if (rankedCards.length > 0) topCard = rankedCards[0];
			if (rankedCards.length > 1) backupCard = rankedCards[1];

			result.push({
				category: { ...category, icon: IconComponent },
				topCard,
				backupCard,
			});
		}

		return result;
	}, [userWallet, rewardCategories, customRates, preferredCards]);

	const handleRemoveCard = (id: string) => {
		const newWallet = [];
		for (let i = 0; i < walletIds.length; i++) {
			if (walletIds[i] !== id) {
				newWallet.push(walletIds[i]);
			}
		}
		setWalletIds(newWallet);
	};

	const handleAddCategory = (e: React.FormEvent) => {
		e.preventDefault();
		if (!newCategoryName.trim()) return;

		const newCategory = {
			id: newCategoryName.replace(/\s+/g, ""),
			name: newCategoryName,
			iconName: "Tag", // Saving string representation
			accent: "text-teal-400",
		};

		const newCategories = [newCategory];
		for (let i = 0; i < rewardCategories.length; i++) {
			newCategories.push(rewardCategories[i]);
		}

		setRewardCategories(newCategories);
		setNewCategoryName("");
		setIsAddingCategory(false);
	};

	const openEditModal = (categoryId: string) => {
		setEditingCategory(categoryId);
		const existingRates = customRates[categoryId] || {};
		setTempRates({ ...existingRates });
	};

	const saveCustomRates = () => {
		// 1. Safety check: Exit if we somehow click save without a category selected
		if (!editingCategory) return;

		const finalRates: Record<string, Record<string, number>> = {
			...customRates,
		};

		// 2. Use editingCategory instead of selectedCategoryId
		if (!finalRates[editingCategory]) {
			finalRates[editingCategory] = {};
		}

		const cardIds = Object.keys(tempRates);
		for (let i = 0; i < cardIds.length; i++) {
			const cardId = cardIds[i];
			const val = tempRates[cardId];

			if (val === undefined) {
				// Remove the override if the user cleared it out
				delete finalRates[editingCategory][cardId];
			} else {
				// Save the valid numerical rate
				finalRates[editingCategory][cardId] = val;
			}
		}

		setCustomRates(finalRates);
		setEditingCategory(null);
	};

	const handleAddCard = (id: string) => {
		const newWallet = [];

		// Copy the existing wallet IDs safely
		for (let i = 0; i < walletIds.length; i++) {
			newWallet.push(walletIds[i]);
		}

		// Add the newly clicked card ID
		newWallet.push(id);

		// Update the global store
		setWalletIds(newWallet);
	};

	if (!hasHydrated) {
		return <div className="min-h-screen bg-[#050505]" />;
	}

	return (
		<div className="p-8 max-w-7xl mx-auto space-y-12 min-h-screen text-white bg-[#050505] relative">
			{/* --- HEADER & MANAGERS --- */}
			<div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-white/5 pb-8">
				<div className="space-y-2">
					<h1 className="text-3xl font-black tracking-tighter uppercase italic">
						Spend Optimizer
					</h1>
					<p className="text-sm font-medium text-gray-500">
						At the register? Here is the exact card you should use.
					</p>
				</div>

				<div className="flex items-center gap-6">
					{/* Add Category Button/Input */}
					<div className="relative z-50">
						{!isAddingCategory ? (
							<button
								onClick={() =>
									setIsCategoryDropdownOpen(!isCategoryDropdownOpen)
								}
								className="flex items-center gap-1 text-gray-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest"
							>
								<PlusCircle size={14} /> New Category
							</button>
						) : (
							<form
								onSubmit={handleAddCategory}
								className="flex items-center gap-2"
							>
								<input
									autoFocus
									type="text"
									value={newCategoryName}
									onChange={(e) => setNewCategoryName(e.target.value)}
									placeholder="e.g. Online Shopping"
									className="bg-[#111] border border-white/20 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-emerald-500 transition-colors w-40"
								/>
								<button
									type="submit"
									className="bg-emerald-500 text-black px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-emerald-400 transition-colors"
								>
									Add
								</button>
								<button
									type="button"
									onClick={() => setIsAddingCategory(false)}
									className="text-gray-500 hover:text-white"
								>
									<X size={16} />
								</button>
							</form>
						)}

						{/* --- THE NEW DROPDOWN --- */}
						{isCategoryDropdownOpen && !isAddingCategory && (
							<div className="absolute top-full mt-4 right-0 w-64 bg-[#111] border border-white/10 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl">
								<div className="p-3 border-b border-white/5 bg-[#0a0a0a]">
									<p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
										From Database
									</p>
								</div>

								<div className="max-h-50 overflow-y-auto custom-scrollbar p-1">
									{availableDatabaseCategories.length > 0 ? (
										availableDatabaseCategories.map((cat) => {
											const Icon = (LucideIcons[
												cat.iconName as keyof typeof LucideIcons
											] || LucideIcons.Tag) as unknown as React.ElementType;
											return (
												<button
													key={cat.id}
													onClick={() => handleSelectDatabaseCategory(cat)}
													className="w-full text-left px-3 py-2.5 text-sm font-bold hover:bg-white/5 rounded-xl transition-colors flex items-center gap-3 group"
												>
													<div
														className={`p-1.5 rounded-lg bg-white/5 ${cat.accent}`}
													>
														<Icon size={14} />
													</div>
													<span className="truncate">{cat.name}</span>
													<Plus
														size={14}
														className="ml-auto text-gray-600 group-hover:text-emerald-500 transition-colors"
													/>
												</button>
											);
										})
									) : (
										<div className="px-4 py-6 text-center">
											<p className="text-xs text-gray-500 font-medium">
												All database categories added.
											</p>
										</div>
									)}
								</div>

								<div className="p-2 border-t border-white/5 bg-[#050505]">
									<button
										onClick={() => {
											setIsCategoryDropdownOpen(false);
											setIsAddingCategory(true);
										}}
										className="w-full px-3 py-2.5 text-xs font-bold hover:bg-emerald-500/10 transition-colors flex items-center justify-center gap-2 text-emerald-400 rounded-xl border border-dashed border-emerald-500/20 hover:border-emerald-500/50"
									>
										<Plus size={14} />
										Add Manually
									</button>
								</div>
							</div>
						)}
					</div>

					<div className="w-px h-8 bg-white/10" />

					{/* NEW: Clean Wallet Manager Button */}
					<button
						onClick={() => setIsWalletManagerOpen(true)}
						className="flex items-center gap-3 bg-[#111] border border-white/20 hover:border-white/50 px-5 py-2.5 rounded-xl transition-all shadow-xl"
					>
						<Wallet size={18} className="text-gray-400" />
						<span className="text-sm font-bold">My Wallet</span>
						<span className="bg-white/10 text-white text-xs font-black px-2 py-0.5 rounded-full">
							{userWallet.length}
						</span>
					</button>
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative">
				{optimizedCategories.map((item) => {
					const hasCards = item.topCard !== null;

					return (
						<div
							key={item.category.id}
							className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-6 relative overflow-hidden group flex flex-col min-h-37.5 hover:border-white/10 transition-colors"
						>
							<button
								onClick={() => openEditModal(item.category.id)}
								className="absolute top-6 right-6 z-20 text-gray-600 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 p-2 rounded-full backdrop-blur-md"
							>
								<Settings2 size={16} />
							</button>

							<div className="flex items-center justify-between mb-8 relative z-10">
								<div className="flex items-center gap-2">
									<div
										className={`p-2 rounded-xl bg-white/5 ${item.category.accent}`}
									>
										{(() => {
											const Icon = item.category.icon as React.ElementType;
											return <Icon size={16} />;
										})()}
									</div>
									<h2 className="text-sm font-bold tracking-wide pr-8">
										{item.category.name}
									</h2>
								</div>

								{hasCards && (
									<div className="text-right">
										<p
											className={`text-2xl font-black ${item.category.accent}`}
										>
											{item.topCard?.rate}x
										</p>
									</div>
								)}
							</div>

							{/* Center Content: The Winning Card */}
							<div className="grow flex items-center justify-center relative z-10 mb-6">
								{!hasCards ? (
									<p className="text-xs text-gray-600 font-medium italic">
										Wallet is empty
									</p>
								) : (
									<div className="relative w-full max-w-50 aspect-[1.58/1] transform group-hover:scale-105 transition-transform duration-500 rounded-xl shadow-2xl">
										{item.topCard?.card.image_url ? (
											/* Render Real Optimized Image */
											<Image
												src={item.topCard.card.image_url}
												alt={item.topCard.card.name}
												fill
												sizes="(max-width: 768px) 200px, 200px"
												className="object-contain drop-shadow-2xl rounded-xl"
												priority={true} // Speeds up Largest Contentful Paint (LCP)
											/>
										) : (
											/* Fallback: CSS Gradient */
											<div
												className={`w-full h-full rounded-xl p-4 flex flex-col justify-between border border-white/20 bg-linear-to-br ${item.topCard?.card.color}`}
											>
												<div className="flex justify-between items-start">
													<div className="w-8 h-6 rounded bg-black/20 flex items-center justify-center">
														<div className="w-4 h-3 border border-yellow-500/50 rounded-sm grid grid-cols-3 gap-0.5 p-0.5">
															<div className="bg-yellow-500/40 rounded-sm" />
															<div className="bg-yellow-500/40 rounded-sm" />
															<div className="bg-yellow-500/40 rounded-sm" />
														</div>
													</div>
													<Wifi size={14} className="text-white/50 rotate-90" />
												</div>
												<div>
													<p className="text-xs font-bold text-white shadow-black drop-shadow-md truncate">
														{item.topCard?.card.name}
													</p>
													<p className="text-[9px] font-medium text-white/70 uppercase tracking-widest mt-0.5">
														{item.topCard?.card.network}
													</p>
												</div>
											</div>
										)}
									</div>
								)}
							</div>

							{hasCards && item.backupCard && (
								<div className="mt-auto pt-4 border-t border-white/5 relative z-10 flex items-center justify-between">
									<div className="flex items-center gap-2 text-gray-500">
										<CheckCircle2 size={12} className="text-gray-600" />
										<span className="text-[10px] uppercase font-bold tracking-widest">
											Backup
										</span>
									</div>
									<p className="text-xs font-medium text-gray-400">
										{item.backupCard.card.name}{" "}
										<span className="text-white/50 ml-1">
											({item.backupCard.rate}x)
										</span>
									</p>
								</div>
							)}

							{hasCards && (
								<div
									className={`absolute -top-20 -right-20 w-48 h-48 rounded-full bg-linear-to-br ${item.topCard?.card.color} opacity-10 blur-[50px] pointer-events-none group-hover:opacity-20 transition-opacity duration-700`}
								/>
							)}
						</div>
					);
				})}
			</div>

			{/* --- EDIT MULTIPLIERS MODAL --- */}
			{editingCategory && (
				<div className="fixed inset-0 z-100 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
					<div className="bg-[#0a0a0a] border border-white/10 rounded-3xl w-full max-w-lg flex flex-col shadow-2xl max-h-[35vh]">
						{/* 1. Header (Fixed at Top) */}
						<div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0">
							<div>
								<h3 className="text-xl font-black tracking-tight">
									Edit Multipliers
								</h3>
								<p className="text-xs font-medium text-gray-500 mt-1">
									Set custom rates for{" "}
									<span className="text-white">
										{
											rewardCategories.find((c) => c.id === editingCategory)
												?.name
										}
									</span>
									.
								</p>
							</div>
							<button
								onClick={() => setEditingCategory(null)}
								className="text-gray-500 hover:text-white p-2 rounded-full hover:bg-white/5 transition-colors"
							>
								<X size={20} />
							</button>
						</div>

						{/* 2. Body (Scrollable, High-Density List) */}
						<div className="p-4 sm:p-6 overflow-y-auto space-y-1.5 custom-scrollbar">
							{/* SMART SORT: Highest multipliers for this category float to the top */}
							{[...userWallet]
								.sort((a, b) => {
									const rateA =
										customRates[editingCategory]?.[a.id] ??
										a.multipliers[
											editingCategory as keyof typeof a.multipliers
										] ??
										a.multipliers["CatchAll"] ??
										1;
									const rateB =
										customRates[editingCategory]?.[b.id] ??
										b.multipliers[
											editingCategory as keyof typeof b.multipliers
										] ??
										b.multipliers["CatchAll"] ??
										1;
									return rateB - rateA;
								})
								.map((card) => {
									const defaultRate =
										card.multipliers[
											editingCategory as keyof typeof card.multipliers
										] ??
										card.multipliers["CatchAll"] ??
										1;
									const isPreferred =
										preferredCards[editingCategory] === card.id;

									return (
										<div
											key={card.id}
											className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/3 border border-transparent hover:border-white/5 transition-colors group"
										>
											<div className="flex items-center gap-3 overflow-hidden pr-2">
												{/* Sleek color indicator instead of chunky block */}
												{card.image_url ? (
													<Image
														src={card.image_url}
														alt={card.name}
														fill
														sizes="(max-width: 768px) 200px, 200px"
														className="w-8 h-5 rounded shadow-sm object-cover border border-white/20"
														priority={true} // Speeds up Largest Contentful Paint (LCP)
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
												{/* Star only visible on hover to reduce clutter */}
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

												{/* Compact Input */}
												<div className="flex items-center gap-1.5 bg-[#111] border border-white/10 rounded-lg px-2 py-1.5 focus-within:border-emerald-500/50 transition-colors">
													<input
														type="number"
														step="0.5"
														min="0"
														value={
															tempRates[card.id] !== undefined
																? tempRates[card.id]
																: ""
														}
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

						{/* 3. Footer (Fixed at Bottom) */}
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

						{/* Scrollable Content Area */}
						<div className="p-6 overflow-y-auto space-y-8 grow custom-scrollbar">
							{/* Active Cards Grid */}
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
														fill
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

							{/* Available Cards Section */}
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
															fill
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
		</div>
	);
}
