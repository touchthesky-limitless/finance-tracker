import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
	EllipsisVertical,
	SquarePen,
	Trash2,
	CheckCircle2,
} from "lucide-react";
import Image from "next/image";
import { OptimizedCategory } from "@/types/wallet";

interface Props {
	item: OptimizedCategory;
	isHidden: boolean;
	onToggleHide: (id: string) => void;
	onEdit: (id: string) => void;
	onDelete: (id: string) => void;
}

export function BentoCard({
	item,
	isHidden,
	onToggleHide,
	onEdit,
	onDelete,
}: Props) {
	const hasCards = item.topCard !== null;
	const Icon = item.category.icon as React.ElementType;

	return (
		<div
			className={`bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-white/5 rounded-3xl p-6 relative overflow-hidden group flex flex-col min-h-37.5 hover:border-gray-300 dark:hover:border-white/10 transition-all ${isHidden ? "h-20 opacity-50" : ""}`}
		>
			<div className="absolute top-2 right-2 z-10">
				<DropdownMenu.Root>
					<DropdownMenu.Trigger asChild>
						<button className="p-1.5 rounded-lg bg-gray-100 dark:bg-black/20 hover:bg-gray-200 dark:hover:bg-white/10 backdrop-blur-md transition-colors text-gray-600 dark:text-white/70">
							<EllipsisVertical size={12} />
						</button>
					</DropdownMenu.Trigger>
					<DropdownMenu.Portal>
						<DropdownMenu.Content
							className="bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl p-1 shadow-2xl z-50 min-w-25"
							sideOffset={5}
						>
							<DropdownMenu.Item
								onClick={() => onEdit(item.category.id)}
								className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg cursor-pointer outline-none"
							>
								<SquarePen size={14} /> Edit Rates
							</DropdownMenu.Item>
							<DropdownMenu.Separator className="h-px bg-gray-200 dark:bg-white/10 my-1" />
							<DropdownMenu.Item
								onClick={() => onDelete(item.category.id)}
								className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-red-600 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg cursor-pointer outline-none"
							>
								<Trash2 size={14} /> Remove
							</DropdownMenu.Item>
						</DropdownMenu.Content>
					</DropdownMenu.Portal>
				</DropdownMenu.Root>
			</div>

			{isHidden ? (
				<div className="flex items-center justify-between h-full px-2">
					<span className="text-xs font-bold text-gray-500 dark:text-gray-400">
						{item.category.name}
					</span>
					<button
						onClick={() => onToggleHide(item.category.id)}
						className="text-[10px] font-bold text-emerald-600 dark:text-emerald-500 hover:text-emerald-500 dark:hover:text-emerald-400"
					>
						SHOW
					</button>
				</div>
			) : (
				<>
					<div className="flex items-center justify-between mb-6 relative z-10">
						<div className="flex items-center gap-2">
							<div
								className={`p-2 rounded-xl bg-gray-100 dark:bg-white/5 ${item.category.accent}`}
							>
								<Icon size={16} />
							</div>
							<h2 className="text-sm font-bold tracking-wide text-gray-900 dark:text-white">
								{item.category.name}
							</h2>
						</div>
						{hasCards && (
							<p className={`text-2xl font-black ${item.category.accent}`}>
								{item.topCard?.rate}x
							</p>
						)}
					</div>

					<div className="grow flex items-center justify-center relative z-10 my-auto">
						{!hasCards ? (
							<p className="text-xs text-gray-500 dark:text-gray-600 font-medium italic">
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
										className={`w-full h-full rounded-xl bg-linear-to-br ${item.topCard?.card.color} border border-gray-200 dark:border-white/20`}
									/>
								)}
							</div>
						)}
					</div>
				</>
			)}

			{!isHidden && hasCards && item.backupCard && (
				<div className="mt-auto pt-3 border-t border-gray-200 dark:border-white/5 relative z-10 flex items-center justify-between">
					<div className="flex items-center gap-1.5 text-gray-500">
						<CheckCircle2 size={10} />
						<span className="text-[9px] uppercase font-black tracking-widest">
							Backup
						</span>
					</div>
					<p className="text-[10px] font-medium text-gray-600 dark:text-gray-400">
						{item.backupCard.card.name}{" "}
						<span className="text-gray-400 dark:text-white/40 ml-1">
							({item.backupCard.rate}x)
						</span>
					</p>
				</div>
			)}
		</div>
	);
}
