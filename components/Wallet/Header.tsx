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
	return (
		<div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-white/5 pb-8">
			<div className="space-y-2">
				<h1 className="text-3xl font-black tracking-tighter uppercase italic">
					Spend Optimizer
				</h1>
			</div>

			<div className="flex items-center gap-3">
				<button
					onClick={onOpenSearch}
					className="flex items-center gap-3 bg-[#111] border border-white/10 hover:border-gray-500/50 px-4 py-2.5 rounded-xl shadow-xl text-gray-400 group transition-all"
				>
					<Search size={18} />
					<div className="hidden sm:flex items-center gap-0.5 bg-white/5 px-1.5 py-0.5 rounded text-[10px] font-black tracking-widest border border-white/5 group-hover:border-gray-500/20">
						<Command size={10} /> K
					</div>
				</button>

				<button
					onClick={onOpenWallet}
					className="flex items-center gap-3 bg-[#111] border border-white/20 hover:border-blue-500/50 px-4 py-2.5 rounded-xl shadow-xl transition-all"
				>
					<Wallet size={18} className="text-blue-400" />
					<span className="text-sm">Wallet</span>
					<span className="bg-white/10 text-white text-xs font-black px-2 py-0.5 rounded-full">
						{userWalletCount}
					</span>
				</button>

				<Popover.Root>
					<Popover.Trigger asChild>
						<button className="flex items-center gap-2 bg-[#111] border border-white/20 hover:border-emerald-500/50 px-4 py-2.5 rounded-xl shadow-xl text-white text-sm transition-all">
							<Plus size={18} className="text-emerald-500" /> Category
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
													onClick={() => onAddCategory(cat.id as CategoryId)}
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
	);
}
