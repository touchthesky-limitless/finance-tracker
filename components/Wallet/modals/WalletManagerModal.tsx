import * as Dialog from "@radix-ui/react-dialog";
import { X, Plus, Info } from "lucide-react";
import Image from "next/image";
import { CreditCard } from "@/store/useBudgetStore";
import { Category } from "@/types/wallet";
import React, { useState } from "react";

interface Props {
	isOpen: boolean;
	onClose: (open: boolean) => void;
	userWallet: CreditCard[];
	availableCards: CreditCard[];
	globalCards: CreditCard[];
	unifiedCategories: Category[];
	customRates: Record<string, Record<string, number>>;
	onAddCard: (id: string) => void;
	onRemoveCard: (id: string) => void;
}

// Helper: Group cards by issuer
function groupCardsByIssuer(cards: CreditCard[]) {
	return cards.reduce(
		(acc, card) => {
			const issuer = card.issuer || "Other";
			if (!acc[issuer]) acc[issuer] = [];
			acc[issuer].push(card);
			return acc;
		},
		{} as Record<string, CreditCard[]>,
	);
}

// Helper: Extract and sort multipliers
function getCardMultipliers(
	cardId: string,
	globalCards: CreditCard[],
	unifiedCategories: Category[],
	customRates: Record<string, Record<string, number>>,
) {
	const targetCard = globalCards.find((c) => c.id === cardId);
	if (!targetCard) return [];

	const multipliers: { category: Category; rate: number; isCustom: boolean }[] =
		[];
	unifiedCategories.forEach((category) => {
		const customRate = customRates[category.id]?.[cardId];
		const dbRate =
			targetCard.multipliers[category.id] ??
			targetCard.multipliers["CatchAll"] ??
			1;
		const finalRate = customRate !== undefined ? customRate : dbRate;
		if (finalRate > 1) {
			multipliers.push({
				category,
				rate: finalRate,
				isCustom: customRate !== undefined,
			});
		}
	});
	return multipliers.sort((a, b) => b.rate - a.rate);
}

export function WalletManagerModal({
	isOpen,
	onClose,
	userWallet,
	availableCards,
	globalCards,
	unifiedCategories,
	customRates,
	onAddCard,
	onRemoveCard,
}: Props) {
	const [searchQuery, setSearchQuery] = useState("");

	// Step 1: Normalize the search query by removing accidental spaces and converting to lowercase
	const safeQuery = searchQuery.toLowerCase().trim();

	// 1. Filter the ACTIVE cards
	const filteredActive = userWallet.filter(
		(card) =>
			card.name.toLowerCase().includes(safeQuery) ||
			(card.issuer?.toLowerCase() || "").includes(safeQuery),
	);
	const groupedActive = groupCardsByIssuer(filteredActive);

	// 2. Filter the AVAILABLE cards
	const filteredAvailable = availableCards.filter(
		(card) =>
			card.name.toLowerCase().includes(safeQuery) ||
			(card.issuer?.toLowerCase() || "").includes(safeQuery),
	);

	// 2. Group the filtered results
	const groupedAvailable = groupCardsByIssuer(filteredAvailable);

	return (
		<Dialog.Root open={isOpen} onOpenChange={onClose}>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 z-100 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" />
				<Dialog.Content
					onOpenAutoFocus={(e) => e.preventDefault()}
					className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-100 w-[90vw] max-w-2xl max-h-[85vh] bg-[#0a0a0a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col outline-none animate-in fade-in zoom-in-95 duration-200"
				>
					<div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0 bg-[#111]">
						<div>
							<Dialog.Title className="text-lg font-black tracking-tight text-white">
								Manage Wallet
							</Dialog.Title>
							<Dialog.Description className="text-xs font-medium text-gray-500 mt-1">
								Add or remove cards from your active loadout.
							</Dialog.Description>
						</div>
						<div className="mt-4 relative">
							<input
								type="text"
								placeholder="Search..."
								className="w-full pr-10 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
							/>
							{/* Conditional Clear Button */}
							{searchQuery.length > 0 && (
								<button
									onClick={() => setSearchQuery("")}
									className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors p-1 rounded-md"
									aria-label="Clear search"
								>
									<X size={16} />
								</button>
							)}
						</div>
						<Dialog.Close asChild>
							<button
								aria-label="Close"
								className="text-gray-500 hover:text-white p-2 transition-colors"
							>
								<X size={20} />
							</button>
						</Dialog.Close>
					</div>

					<div className="p-6 overflow-y-auto space-y-8 grow custom-scrollbar">
						{/* ACTIVE CARDS */}
						{Object.keys(groupedActive).length > 0 && (
							<div className="space-y-6">
								<h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500">
									Active Cards ({userWallet.length})
								</h4>
								{Object.entries(groupedActive).map(([issuer, cards]) => (
									<div key={issuer} className="space-y-3">
										<h5 className="text-[10px] font-black uppercase tracking-widest text-orange-500/80">
											{issuer}
										</h5>
										<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
											{cards.map((card) => {
												const topMultipliers = getCardMultipliers(
													card.id,
													globalCards,
													unifiedCategories,
													customRates,
												);
												return (
													<div
														key={card.id}
														className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5"
													>
														<div className="flex items-center gap-3 min-w-0">
															{card.image_url ? (
																<Image
																	src={card.image_url}
																	alt={card.name}
																	width={40}
																	height={24}
																	className="w-10 h-6 rounded shadow-sm object-cover border border-white/20 shrink-0"
																/>
															) : (
																<div
																	className={`w-8 h-5 rounded shadow-sm border border-white/20 bg-linear-to-br ${card.color}`}
																/>
															)}
															<p className="text-sm font-bold truncate text-gray-100">
																{card.name}
															</p>
														</div>
														<div className="flex items-center gap-1 shrink-0">
															<Dialog.Root>
																<Dialog.Trigger asChild>
																	<button className="relative group text-gray-500 hover:text-blue-400 transition-colors rounded-md hover:bg-white/5">
																		<Info size={16} />
																		<span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-[#222] border border-white/10 text-gray-200 text-[10px] font-bold tracking-wide rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 shadow-xl">
																			See rates
																		</span>
																	</button>
																</Dialog.Trigger>
																<Dialog.Portal>
																	<Dialog.Overlay className="fixed inset-0 z-100 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" />
																	<Dialog.Content className="fixed z-100 bg-[#111] p-6 outline-none animate-in duration-300 shadow-2xl bottom-0 left-0 right-0 w-full border-t border-white/10 rounded-t-3xl slide-in-from-bottom-full sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-sm sm:border sm:border-white/10 sm:rounded-3xl sm:slide-in-from-bottom-0 sm:zoom-in-95 sm:fade-in">
																		<div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-6 sm:hidden" />
																		<div className="flex items-center justify-between mb-6">
																			<Dialog.Title className="text-lg font-black tracking-tight text-white">
																				{card.name}
																			</Dialog.Title>
																			<Dialog.Close asChild>
																				<button
																					aria-label="Close"
																					className="text-gray-500 hover:text-white p-2 rounded-full hover:bg-white/5"
																				>
																					<X size={20} />
																				</button>
																			</Dialog.Close>
																		</div>
																		<div className="space-y-2 mb-4 max-h-[50vh] overflow-y-auto custom-scrollbar">
																			{topMultipliers.length > 0 ? (
																				topMultipliers.map((item) => (
																					<div
																						key={item.category.id}
																						className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5"
																					>
																						<span className="text-sm font-bold text-gray-200">
																							{item.category.name}
																						</span>
																						<span
																							className={`text-lg font-black ${item.category.accent}`}
																						>
																							{item.rate}x
																						</span>
																					</div>
																				))
																			) : (
																				<p className="text-center text-sm text-gray-500">
																					No bonus categories.
																				</p>
																			)}
																		</div>
																		<div className="pt-4 border-t border-white/5 flex items-center justify-between">
																			<span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
																				Base Earning
																			</span>
																			<span className="text-sm font-black text-gray-400">
																				{card.multipliers["CatchAll"] || 1}x
																			</span>
																		</div>
																	</Dialog.Content>
																</Dialog.Portal>
															</Dialog.Root>
															<button
																onClick={() => onRemoveCard(card.id)}
																className="relative group text-gray-600 hover:text-red-400 transition-colors p-1.5 rounded-md hover:bg-white/5"
															>
																<X size={16} />
																<span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-[#222] border border-white/10 text-gray-200 text-[10px] font-bold tracking-wide rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 shadow-xl">
																	Remove
																</span>
															</button>
														</div>
													</div>
												);
											})}
										</div>
									</div>
								))}
							</div>
						)}

						{/* AVAILABLE CARDS SECTION */}
						{Object.keys(groupedAvailable).length > 0 && (
							<div className="space-y-4 pt-4 border-t border-white/5">
								<div className="flex items-center justify-between">
									<h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500">
										Add Cards
									</h4>
									{/* Search Input */}
									<div className="relative w-full sm:w-56 flex items-center">
										<input
											type="text"
											placeholder="Search..."
											className="w-full bg-white/5 border border-white/10 rounded-xl pl-3 pr-8 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
											value={searchQuery}
											onChange={(e) => setSearchQuery(e.target.value)}
										/>
										{searchQuery.length > 0 && (
											<button
												aria-label="Search"
												onClick={() => setSearchQuery("")}
												className="absolute right-2 top-0 bottom-0 flex items-center justify-center text-gray-500 hover:text-white transition-colors p-1"
											>
												<X size={14} />
											</button>
										)}
									</div>
								</div>

								{/* --- ADD THE CHECK HERE --- */}
								{Object.keys(groupedAvailable).length === 0 ? (
									<div className="py-10 text-center text-gray-500 text-sm">
										No cards found matching &quot;{searchQuery}&quot;
									</div>
								) : (
									Object.entries(groupedAvailable).map(([issuer, cards]) => (
										<div key={issuer} className="space-y-2">
											<h5 className="text-[10px] font-bold text-gray-600">
												{issuer}
											</h5>
											<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
												{cards.map((card) => (
													<button
														key={card.id}
														onClick={() => onAddCard(card.id)}
														className="flex items-center justify-between p-2.5 rounded-xl bg-[#111] border border-white/5 hover:border-emerald-500/50 transition-all text-left"
													>
														<div className="flex items-center gap-2 min-w-0">
															{card.image_url ? (
																<Image
																	src={card.image_url}
																	alt={card.name}
																	width={28}
																	height={18}
																	className="w-7 h-4 rounded shadow-sm object-cover opacity-50"
																/>
															) : (
																<div
																	className={`w-7 h-4 rounded bg-linear-to-br ${card.color} opacity-50`}
																/>
															)}
															<p className="text-xs font-bold text-gray-400 truncate">
																{card.name}
															</p>
														</div>
														<Plus size={14} className="text-emerald-500" />
													</button>
												))}
											</div>
										</div>
									))
								)}
							</div>
						)}
					</div>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
