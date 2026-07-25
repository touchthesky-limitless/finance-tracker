"use client";

import { useState, type ReactNode } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Eye, MoreHorizontal, Pencil, X } from "lucide-react";

import type { RecurringRecord } from "@/components/Recurring/types";

export function RecurringRowMenu({
	record,
	onViewMerchant,
	onEdit,
	onMarkNotRecurring,
}: {
	record: RecurringRecord;
	onViewMerchant: (record: RecurringRecord) => void;
	onEdit: (record: RecurringRecord) => void;
	onMarkNotRecurring: (record: RecurringRecord) => void;
}) {
	const [open, setOpen] = useState(false);

	const runAfterMenuCloses = (
		action: (record: RecurringRecord) => void,
	): void => {
		setOpen(false);

		window.requestAnimationFrame(() => {
			action(record);
		});
	};

	return (
		<DropdownMenu.Root open={open} onOpenChange={setOpen} modal={false}>
			<DropdownMenu.Trigger asChild>
				<button
					type="button"
					aria-label={`Actions for ${record.merchantName}`}
					className="grid size-11 place-items-center rounded-full border border-transparent text-gray-700 outline-none transition-colors hover:border-cyan-500 hover:bg-gray-100 data-[state=open]:border-cyan-500 dark:text-white dark:hover:bg-white/7"
				>
					<MoreHorizontal size={22} />
				</button>
			</DropdownMenu.Trigger>

			<DropdownMenu.Portal>
				<DropdownMenu.Content
					align="end"
					sideOffset={8}
					onCloseAutoFocus={(event) => {
						event.preventDefault();
					}}
					className="z-[1120] min-w-80 rounded-2xl border border-gray-200 bg-white p-3 shadow-2xl outline-none dark:border-white/15 dark:bg-[#232322]"
				>
					<MenuItem
						icon={<Eye size={19} />}
						label="View merchant"
						onSelect={() => {
							runAfterMenuCloses(onViewMerchant);
						}}
					/>

					<MenuItem
						icon={<Pencil size={18} />}
						label="Edit merchant details"
						onSelect={() => {
							runAfterMenuCloses(onEdit);
						}}
					/>

					<MenuItem
						danger
						icon={<X size={18} />}
						label="Mark merchant as not recurring"
						onSelect={() => {
							runAfterMenuCloses(onMarkNotRecurring);
						}}
					/>
				</DropdownMenu.Content>
			</DropdownMenu.Portal>
		</DropdownMenu.Root>
	);
}

function MenuItem({
	icon,
	label,
	onSelect,
	danger = false,
}: {
	icon: ReactNode;
	label: string;
	onSelect: () => void;
	danger?: boolean;
}) {
	return (
		<DropdownMenu.Item
			onSelect={(event) => {
				event.preventDefault();
				onSelect();
			}}
			className={`flex min-h-14 cursor-pointer items-center gap-4 rounded-xl px-4 text-base font-semibold outline-none transition-colors data-[highlighted]:bg-gray-100 dark:data-[highlighted]:bg-white/7 ${
				danger ? "text-red-500" : "text-gray-900 dark:text-white"
			}`}
		>
			{icon}
			{label}
		</DropdownMenu.Item>
	);
}
