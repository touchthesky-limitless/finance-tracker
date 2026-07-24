"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
	ChevronDown,
} from "lucide-react";

interface AccountActionMenuProps {
	onEditAccount: () => void;
	onInstitutionSettings: () => void;
	onDownloadTransactions: () => void;
	onImportTransactions: () => void;
	onTransferData: () => void;
	onCopyBalanceHistory: () => void;
	onDownloadBalanceHistory: () => void;
	onImportBalanceHistory: () => void;
	onEditBalanceHistory: () => void;
}

export function AccountActionMenu({
	onEditAccount,
	onInstitutionSettings,
	onDownloadTransactions,
	onImportTransactions,
	onTransferData,
	onCopyBalanceHistory,
	onDownloadBalanceHistory,
	onImportBalanceHistory,
	onEditBalanceHistory,
}: AccountActionMenuProps) {
	const items = [
		{ label: "Edit account", onSelect: onEditAccount },
		{ label: "Institution settings", onSelect: onInstitutionSettings },
		{ label: "Download transactions", onSelect: onDownloadTransactions },
		{ label: "Import transactions", onSelect: onImportTransactions },
		{ label: "Transfer data", onSelect: onTransferData },
		{ label: "Copy balance history", onSelect: onCopyBalanceHistory },
		{ label: "Download balance history", onSelect: onDownloadBalanceHistory },
		{ label: "Import balance history", onSelect: onImportBalanceHistory },
		{ label: "Edit balance history", onSelect: onEditBalanceHistory },
	];

	return (
		<DropdownMenu.Root modal={false}>
			<DropdownMenu.Trigger asChild>
				<button
					type="button"
					className="flex h-10 items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-900 shadow-sm outline-none transition-colors hover:bg-gray-50 data-[state=open]:border-[#00A8D2] data-[state=open]:ring-2 data-[state=open]:ring-[#00A8D2]/25 dark:border-white/10 dark:bg-[#222220] dark:text-white dark:hover:bg-[#2A2A27]"
				>
					Edit
					<ChevronDown size={15} />
				</button>
			</DropdownMenu.Trigger>

			<DropdownMenu.Portal>
				<DropdownMenu.Content
					align="end"
					sideOffset={8}
					className="z-[130] w-80 overflow-hidden rounded-2xl border border-gray-200 bg-white py-3 text-gray-900 shadow-2xl outline-none dark:border-white/10 dark:bg-[#1E1E1E] dark:text-white"
				>
					{items.map((item) => {
						return (
							<DropdownMenu.Item
								key={item.label}
								onSelect={item.onSelect}
								className="cursor-pointer px-8 py-3.5 text-[17px] outline-none transition-colors data-[highlighted]:bg-gray-100 dark:data-[highlighted]:bg-white/5"
							>
								{item.label}
							</DropdownMenu.Item>
						);
					})}
				</DropdownMenu.Content>
			</DropdownMenu.Portal>
		</DropdownMenu.Root>
	);
}
