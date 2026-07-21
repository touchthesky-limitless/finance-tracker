import { CheckCircle2 } from "lucide-react";
import Image from "next/image";
import type { ElementType } from "react";

import { CardActionsMenu } from "@/components/Wallet/CardActionsMenu";
import type { CategoryId } from "@/config/categoryDictionary";
import type { OptimizedCategory } from "@/types/wallet";

interface BentoCardProps {
	item: OptimizedCategory;
	isHidden: boolean;
	onToggleHide: (id: CategoryId) => void;
	onEdit: (id: CategoryId) => void;
	onDelete: (id: CategoryId) => void;
	priority?: boolean;
}

export function BentoCard({
	item,
	isHidden,
	onToggleHide,
	onEdit,
	onDelete,
	priority = false,
}: BentoCardProps) {
	const categoryId = item.category.id as CategoryId;
	const hasCards = item.topCard !== null;
	const Icon = item.category.icon as ElementType;

	return (
		<div
			className={`relative flex min-h-37.5 flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white p-6 transition-all group hover:border-gray-300 dark:border-white/5 dark:bg-[#0a0a0a] dark:hover:border-white/10 ${
				isHidden ? "h-20 opacity-50" : ""
			}`}
		>
			<CardActionsMenu
				categoryId={categoryId}
				onEdit={onEdit}
				onDelete={onDelete}
			/>

			{isHidden ? (
				<div className="flex h-full items-center justify-between px-2">
					<span className="text-xs font-bold text-gray-500 dark:text-gray-400">
						{item.category.name}
					</span>

					<button
						type="button"
						onClick={() => {
							onToggleHide(categoryId);
						}}
						className="text-[10px] font-bold text-emerald-600 hover:text-emerald-500 dark:text-emerald-500 dark:hover:text-emerald-400"
					>
						SHOW
					</button>
				</div>
			) : (
				<>
					<div className="relative z-10 mb-6 flex items-center justify-between">
						<div className="flex items-center gap-2">
							<div
								className={`rounded-xl bg-gray-100 p-2 dark:bg-white/5 ${item.category.accent}`}
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

					<div className="relative z-10 my-auto flex grow items-center justify-center">
						{!hasCards ? (
							<p className="text-xs font-medium italic text-gray-500 dark:text-gray-600">
								Wallet is empty
							</p>
						) : (
							<div className="relative aspect-[1.58/1] w-full max-w-50 transition-transform duration-500 group-hover:scale-105">
								{item.topCard?.card.image_url ? (
									<Image
										src={item.topCard.card.image_url}
										alt={item.topCard.card.name}
										fill
										sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
										className="object-contain drop-shadow-2xl"
										priority={priority}
									/>
								) : (
									<div
										className={`h-full w-full rounded-xl border border-gray-200 bg-linear-to-br dark:border-white/20 ${item.topCard?.card.color}`}
									/>
								)}
							</div>
						)}
					</div>
				</>
			)}

			{!isHidden && hasCards && item.backupCard && (
				<div className="relative z-10 mt-auto flex items-center justify-between border-t border-gray-200 pt-3 dark:border-white/5">
					<div className="flex items-center gap-1.5 text-gray-500">
						<CheckCircle2 size={10} />

						<span className="text-[9px] font-black uppercase tracking-widest">
							Backup
						</span>
					</div>

					<p className="text-[10px] font-medium text-gray-600 dark:text-gray-400">
						{item.backupCard.card.name}

						<span className="ml-1 text-gray-400 dark:text-white/40">
							({item.backupCard.rate}x)
						</span>
					</p>
				</div>
			)}
		</div>
	);
}
