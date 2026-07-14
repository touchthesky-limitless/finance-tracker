import * as Popover from "@radix-ui/react-popover";
import { Search, Command, Wallet, Plus } from "lucide-react";
import { CategoryId } from "@/config/categoryDictionary";
import { Category } from "@/types/wallet";

interface Props {
	userWalletCount: number;
	unifiedCategories: Category[];
	activeCategoryIds: string[];
	onOpenSearch: () => void;
	onOpenWallet: () => void;
	onAddCategory: (id: CategoryId) => void;
}

export function WalletHeader({
	userWalletCount,
	unifiedCategories,
	activeCategoryIds,
	onOpenSearch,
	onOpenWallet,
	onAddCategory,
}: Props) {
	// Explicit loop for identifying untracked categories
	const untrackedCategories = [];
	for (let i = 0; i < unifiedCategories.length; i++) {
		const cat = unifiedCategories[i];
		let isTracked = false;

		for (let j = 0; j < activeCategoryIds.length; j++) {
			if (activeCategoryIds[j] === cat.id) {
				isTracked = true;
				break;
			}
		}

		if (!isTracked) {
			untrackedCategories.push(cat);
		}
	}

	// Explicit loop for generating category dropdown elements
	const untrackedElements = [];
	for (let i = 0; i < untrackedCategories.length; i++) {
		const cat = untrackedCategories[i];
		const Icon = cat.icon as React.ElementType;

		untrackedElements.push(
			<div
				key={cat.id}
				onClick={() => onAddCategory(cat.id as CategoryId)}
				className="flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-white/5 cursor-pointer transition-colors"
			>
				<Icon size={16} className={cat.accent} />
				<span className="text-xs font-bold text-gray-700 dark:text-gray-200">
					{cat.name}
				</span>
			</div>,
		);
	}

return (
		<div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-8 border-b border-gray-200 dark:border-white/5 pb-5 md:pb-8">
			<div>
				<h1 className="text-xl md:text-3xl leading-none font-black tracking-tighter uppercase italic text-gray-900 dark:text-white">
					Spend Optimizer
				</h1>
			</div>

			{/* Added flex-wrap to prevent horizontal overflow on smaller devices */}
			<div className="flex flex-wrap items-center gap-2 md:gap-3">
				<button
					onClick={onOpenSearch}
					className="flex items-center gap-2 md:gap-3 bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 hover:border-gray-400 dark:hover:border-gray-500/50 px-3 py-2 md:px-4 md:py-2.5 rounded-xl shadow-xl text-gray-500 dark:text-gray-400 group transition-all"
				>
					<Search size={18} />
					<div className="hidden sm:flex items-center gap-0.5 bg-gray-100 dark:bg-white/5 px-1.5 py-0.5 rounded text-[10px] font-black tracking-widest border border-gray-200 dark:border-white/5 group-hover:border-gray-300 dark:group-hover:border-gray-500/20">
						<Command size={10} /> K
					</div>
				</button>

				<button
					onClick={onOpenWallet}
					className="flex items-center gap-2 md:gap-3 bg-white dark:bg-[#111] border border-gray-200 dark:border-white/20 hover:border-blue-400 dark:hover:border-blue-500/50 px-3 py-2 md:px-4 md:py-2.5 rounded-xl shadow-xl transition-all text-gray-900 dark:text-white"
				>
					<Wallet size={18} className="text-blue-500 dark:text-blue-400" />
					<span className="text-sm font-bold">Wallet</span>
					<span className="bg-gray-200 dark:bg-white/10 text-gray-900 dark:text-white text-xs font-black px-2 py-0.5 rounded-full">
						{userWalletCount}
					</span>
				</button>

				<Popover.Root>
					<Popover.Trigger asChild>
						<button className="flex items-center gap-2 bg-white dark:bg-[#111] border border-gray-200 dark:border-white/20 hover:border-emerald-400 dark:hover:border-emerald-500/50 px-3 py-2 md:px-4 md:py-2.5 rounded-xl shadow-xl text-gray-900 dark:text-white text-sm font-bold transition-all">
							<Plus size={18} className="text-emerald-500" />
							<span className="text-sm font-bold">Category</span>
						</button>
					</Popover.Trigger>
					<Popover.Portal>
						<Popover.Content
							className="bg-white dark:bg-[#111] border border-gray-200 dark:border-white/20 rounded-xl overflow-hidden z-50 shadow-2xl w-50 mt-2"
							sideOffset={5}
						>
							<div className="max-h-70 overflow-y-auto custom-scrollbar">
								{untrackedCategories.length > 0 ? (
									untrackedElements
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
	);
}
