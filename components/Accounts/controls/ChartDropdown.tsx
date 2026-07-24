"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
	Check,
	ChevronDown,
} from "lucide-react";

export function Dropdown({
	label,
	open,
	onOpenChange,
	options,
	value,
	onChange,
	className = "",
}: {
	label: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	options: ReadonlyArray<{ value: string; label: string }>;
	value: string;
	onChange: (value: string) => void;
	className?: string;
}) {
	return (
		<DropdownMenu.Root
			open={open}
			onOpenChange={onOpenChange}
			modal={false}
		>
			<div className={className}>
				<DropdownMenu.Trigger asChild>
					<button
						type="button"
						className="flex h-11 w-full items-center justify-between gap-4 rounded-lg border border-gray-200 bg-white px-3 text-left text-sm font-medium text-gray-900 outline-none transition-colors hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-cyan-500/30 data-[state=open]:border-cyan-500 dark:border-white/10 dark:bg-[#202020] dark:text-white dark:hover:bg-[#292929]"
					>
						<span className="truncate">{label}</span>
						<ChevronDown
							size={15}
							className="shrink-0 transition-transform data-[state=open]:rotate-180"
						/>
					</button>
				</DropdownMenu.Trigger>

				<DropdownMenu.Portal>
					<DropdownMenu.Content
						align="end"
						side="bottom"
						sideOffset={8}
						collisionPadding={12}
						loop
						className="z-[120] min-w-[var(--radix-dropdown-menu-trigger-width)] overflow-hidden rounded-xl border border-gray-200 bg-white p-2 text-gray-900 shadow-2xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 dark:border-white/10 dark:bg-[#222] dark:text-white"
					>
						<DropdownMenu.RadioGroup
							value={value}
							onValueChange={onChange}
						>
							{options.map((option) => {
								const isSelected = value === option.value;

								return (
									<DropdownMenu.RadioItem
										key={option.value}
										value={option.value}
										textValue={option.label}
										className={`relative flex min-h-10 cursor-default select-none items-center justify-between gap-3 rounded-lg px-3 text-sm outline-none transition-colors data-[highlighted]:bg-gray-100 data-[highlighted]:text-gray-900 dark:data-[highlighted]:bg-white/5 dark:data-[highlighted]:text-white ${
											isSelected
												? "font-semibold text-gray-900 dark:text-white"
												: "text-gray-700 dark:text-zinc-300"
										}`}
									>
										<span>{option.label}</span>

										<DropdownMenu.ItemIndicator>
											<Check size={15} />
										</DropdownMenu.ItemIndicator>
									</DropdownMenu.RadioItem>
								);
							})}
						</DropdownMenu.RadioGroup>
					</DropdownMenu.Content>
				</DropdownMenu.Portal>
			</div>
		</DropdownMenu.Root>
	);
}
