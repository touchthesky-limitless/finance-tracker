import { CategoryId } from "@/config/categoryDictionary";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { EllipsisVertical, SquarePen, Trash2 } from "lucide-react";
import React from "react";

interface CardActionsMenuProps {
	categoryId: CategoryId;
	onEdit: (id: CategoryId) => void;
	onDelete: (id: CategoryId) => void;
}

export function CardActionsMenu({
	categoryId,
	onEdit,
	onDelete,
}: CardActionsMenuProps) {
	const handleEdit = (e: React.MouseEvent) => {
		e.stopPropagation();
		onEdit(categoryId);
	};

	const handleDelete = (e: React.MouseEvent) => {
		e.stopPropagation();
		onDelete(categoryId);
	};

	return (
		<div className="absolute top-2 right-2 z-10">
			<DropdownMenu.Root>
				<DropdownMenu.Trigger asChild>
					<button
						type="button"
						aria-label="More actions"
						className="p-1.5 rounded-lg bg-gray-100 dark:bg-black/20 hover:bg-gray-200 dark:hover:bg-white/10 backdrop-blur-md transition-colors text-gray-600 dark:text-white/70"
					>
						<EllipsisVertical size={12} />
					</button>
				</DropdownMenu.Trigger>
				<DropdownMenu.Portal>
					<DropdownMenu.Content
						className="bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl p-1 shadow-2xl z-50 min-w-25"
						sideOffset={5}
					>
						<DropdownMenu.Item
							onClick={handleEdit}
							className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg cursor-pointer outline-none"
						>
							<SquarePen size={14} /> Edit Rates
						</DropdownMenu.Item>
						<DropdownMenu.Separator className="h-px bg-gray-200 dark:bg-white/10 my-1" />
						<DropdownMenu.Item
							onClick={handleDelete}
							className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-red-600 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg cursor-pointer outline-none"
						>
							<Trash2 size={14} /> Remove
						</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Portal>
			</DropdownMenu.Root>
		</div>
	);
}
