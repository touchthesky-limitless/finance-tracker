import { useState, useMemo } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Search } from "lucide-react";
import Image from "next/image";
import { CategoryId } from "@/config/categoryDictionary";
import { CreditCard } from "@/store/useBudgetStore";
import { Category } from "@/types/wallet";

export interface TopCardsResult {
	topCard: { card: CreditCard; rate: number } | null;
	backupCard: { card: CreditCard; rate: number } | null;
}

export interface OptimizedCategory {
	category: Category;
	topCard: { card: CreditCard; rate: number } | null;
	backupCard: { card: CreditCard; rate: number } | null;
}

interface Props {
	isOpen: boolean;
	onClose: (open: boolean) => void;
	unifiedCategories: Category[];
	activeCategoryIds: string[];
	optimizedCategories: OptimizedCategory[];
	getTopCardsForCategory: (id: string) => TopCardsResult;
	onPinCategory: (id: CategoryId) => void;
}

export function QuickSearchModal({
	isOpen,
	onClose,
	unifiedCategories,
	activeCategoryIds,
	optimizedCategories,
	getTopCardsForCategory,
	onPinCategory,
}: Props) {
	const [searchQuery, setSearchQuery] = useState("");

	// Explicit loop logic for filtering and mapping search results
	const searchResults = useMemo(() => {
		const results = [];
		if (searchQuery.trim() !== "") {
			const query = searchQuery.toLowerCase();

			for (let i = 0; i < unifiedCategories.length; i++) {
				const cat = unifiedCategories[i];
				if (
					cat.name.toLowerCase().includes(query) ||
					cat.id.toLowerCase().includes(query)
				) {
					let isTracked = false;
					for (let j = 0; j < activeCategoryIds.length; j++) {
						if (activeCategoryIds[j] === cat.id) {
							isTracked = true;
							break;
						}
					}

					results.push({
						category: cat,
						topCard: getTopCardsForCategory(cat.id).topCard,
						isTracked: isTracked,
					});
				}
			}
		}
		return results;
	}, [
		searchQuery,
		unifiedCategories,
		activeCategoryIds,
		getTopCardsForCategory,
	]);

	// Construct search result elements explicitly
	const searchResultElements = [];
	for (let i = 0; i < searchResults.length; i++) {
		const item = searchResults[i];
		const Icon = item.category.icon as React.ElementType;

		searchResultElements.push(
			<div
				key={item.category.id}
				className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 cursor-default"
			>
				<div className="flex items-center gap-4">
					<div
						className={`p-2 rounded-lg bg-gray-100 dark:bg-white/5 ${item.category.accent}`}
					>
						<Icon size={18} />
					</div>
					<div>
						<p className="text-sm font-bold text-gray-900 dark:text-gray-300">
							{item.category.name}{" "}
							{!item.isTracked && (
								<button
									onClick={() => onPinCategory(item.category.id as CategoryId)}
									className="px-1.5 py-0.5 rounded text-[9px] font-black tracking-wider uppercase bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-emerald-500/20 dark:hover:bg-emerald-500/20"
								>
									+ Pin to Board
								</button>
							)}
						</p>
						<p className="text-xs text-gray-500 font-medium">
							{item.topCard ? item.topCard.card.name : "No cards available"}
						</p>
					</div>
				</div>
				{item.topCard && (
					<div className="flex items-center gap-4">
						<div className={`text-xl font-black ${item.category.accent}`}>
							{item.topCard.rate}x
						</div>
						{item.topCard.card.image_url ? (
							<Image
								src={item.topCard.card.image_url}
								alt={item.topCard.card.name}
								width={48}
								height={30}
								className="rounded shadow-sm object-cover border border-gray-200 dark:border-white/20"
							/>
						) : (
							<div
								className={`w-12 h-7.5 rounded shadow-sm border border-gray-200 dark:border-white/20 bg-linear-to-br ${item.topCard.card.color}`}
							/>
						)}
					</div>
				)}
			</div>,
		);
	}

	// Construct quick suggestion elements explicitly
	const suggestionElements = [];
	const suggestionLimit =
		optimizedCategories.length > 3 ? 3 : optimizedCategories.length;
	for (let i = 0; i < suggestionLimit; i++) {
		const item = optimizedCategories[i];
		suggestionElements.push(
			<button
				key={item.category.id}
				onClick={() => setSearchQuery(item.category.name)}
				className="px-3 py-1.5 rounded-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
			>
				{item.category.name}
			</button>,
		);
	}

	return (
		<Dialog.Root
			open={isOpen}
			onOpenChange={(open) => {
				onClose(open);
				if (!open) setSearchQuery("");
			}}
		>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 z-100 bg-gray-900/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" />
				<Dialog.Content className="fixed top-[10vh] left-1/2 -translate-x-1/2 z-100 w-[calc(100%-2rem)] max-w-xl bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.1)] dark:shadow-[0_0_50px_rgba(0,0,0,0.5)] outline-none animate-in fade-in zoom-in-95 duration-200">
					<Dialog.Title className="sr-only">Search Categories</Dialog.Title>

					<div className="flex items-center gap-3 px-4 py-4 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#111]">
						<Search size={20} className="text-emerald-500" />
						<input
							autoFocus
							type="text"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="Type a category (e.g., Dining, Gas)..."
							className="w-full bg-transparent border-none outline-none text-lg placeholder:text-gray-400 dark:placeholder:text-gray-600 font-medium text-gray-900 dark:text-white"
						/>
						<Dialog.Close asChild>
							<button
								onClick={() => setSearchQuery("")}
								className="bg-gray-200 hover:bg-gray-300 dark:bg-white/5 dark:hover:bg-white/10 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white text-[10px] font-black tracking-widest uppercase px-2 py-1 rounded"
							>
								Esc
							</button>
						</Dialog.Close>
					</div>

					{searchQuery.trim() !== "" ? (
						<div className="max-h-[60vh] overflow-y-auto custom-scrollbar p-2">
							{searchResults.length > 0 ? (
								<div className="space-y-2">{searchResultElements}</div>
							) : (
								<div className="py-12 text-center">
									<p className="text-gray-500 font-medium text-sm">
										No categories found.
									</p>
								</div>
							)}
						</div>
					) : (
						<div className="px-6 py-8 text-center bg-gray-50 dark:bg-[#050505]">
							<p className="text-xs font-bold text-gray-500 dark:text-gray-600 uppercase tracking-widest mb-4">
								Instant answers at the register
							</p>
							<div className="flex flex-wrap items-center justify-center gap-2">
								{suggestionElements}
							</div>
						</div>
					)}
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
