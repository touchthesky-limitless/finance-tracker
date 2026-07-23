import { CategoryId } from "@/config/categoryDictionary";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { EllipsisVertical, SquarePen, Trash2 } from "lucide-react";
import React, { useCallback } from "react";

interface CardActionsMenuProps {
	categoryId: CategoryId;
	onEdit: (id: CategoryId) => void;
	onDelete: (id: CategoryId) => void;
}

type CategoryAction = (id: CategoryId) => void;

export function CardActionsMenu({
	categoryId,
	onEdit,
	onDelete,
}: CardActionsMenuProps) {
	const stopCardInteraction = useCallback(
		(event: React.SyntheticEvent): void => {
			// The surrounding wallet card is sortable and clickable. Keep menu
			// interactions from activating a drag or toggling the stacked card.
			event.stopPropagation();
		},
		[],
	);

	const handleAction = useCallback(
		(action: CategoryAction) =>
			(event: Event): void => {
				event.stopPropagation();

				// Let Radix close and clean up the dropdown before opening the
				// edit/delete dialog. This avoids overlapping focus/pointer locks.
				requestAnimationFrame(() => {
					action(categoryId);
				});
			},
		[categoryId],
	);

	return (
		<div
			className="absolute right-2 top-2 z-20"
			onPointerDown={stopCardInteraction}
			onClick={stopCardInteraction}
			onKeyDown={stopCardInteraction}
		>
			<DropdownMenu.Root modal={false}>
				<DropdownMenu.Trigger asChild>
					<button
						type="button"
						aria-label="More actions"
						onPointerDown={stopCardInteraction}
						onClick={stopCardInteraction}
						onKeyDown={stopCardInteraction}
						className="rounded-lg bg-gray-100 p-1.5 text-gray-600 backdrop-blur-md transition-colors hover:bg-gray-200 dark:bg-black/20 dark:text-white/70 dark:hover:bg-white/10"
					>
						<EllipsisVertical size={12} />
					</button>
				</DropdownMenu.Trigger>

				<DropdownMenu.Portal>
					<DropdownMenu.Content
						className="z-[1000] min-w-25 rounded-xl border border-gray-200 bg-white p-1 shadow-2xl outline-none dark:border-white/10 dark:bg-[#111]"
						sideOffset={5}
						collisionPadding={8}
						onCloseAutoFocus={(event) => event.preventDefault()}
						onPointerDown={stopCardInteraction}
						onClick={stopCardInteraction}
					>
						<DropdownMenu.Item
							onSelect={handleAction(onEdit)}
							className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-gray-900 outline-none hover:bg-gray-100 focus:bg-gray-100 dark:text-white dark:hover:bg-white/5 dark:focus:bg-white/5"
						>
							<SquarePen size={14} /> Edit Rates
						</DropdownMenu.Item>

						<DropdownMenu.Separator className="my-1 h-px bg-gray-200 dark:bg-white/10" />

						<DropdownMenu.Item
							onSelect={handleAction(onDelete)}
							className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-red-600 outline-none hover:bg-red-50 focus:bg-red-50 dark:text-red-500 dark:hover:bg-red-500/10 dark:focus:bg-red-500/10"
						>
							<Trash2 size={14} /> Remove
						</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Portal>
			</DropdownMenu.Root>
		</div>
	);
}
