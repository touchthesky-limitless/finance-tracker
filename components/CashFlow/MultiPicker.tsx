/**
 * MultiPicker – Dropdown multi-select component for picking multiple options.
 */
"use client";

import {
	useMemo,
	type KeyboardEvent,
	type MouseEvent,
	type PointerEvent,
} from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, ChevronDown, CircleX } from "lucide-react";

export function MultiPicker({
	label,
	placeholder,
	options,
	values,
	onChange,
}: {
	label: string;
	placeholder: string;
	options: Array<{ value: string; label: string }>;
	values: string[];
	onChange: (values: string[]) => void;
}) {
	const selectedLabelByValue = useMemo(
		() => new Map(options.map((opt) => [opt.value, opt.label] as const)),
		[options],
	);

	const handleTriggerKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		if (event.key === "Enter" || event.key === " ") {
			event.currentTarget.click();
		}
	};

	return (
		<div>
			<span className="mb-3 block text-base font-bold">{label}</span>
			<DropdownMenu.Root modal={false}>
				<DropdownMenu.Trigger asChild>
					<div
						role="button"
						tabIndex={0}
						onKeyDown={handleTriggerKeyDown}
						className="flex min-h-14 w-full cursor-pointer items-center gap-2 rounded-xl border border-gray-300 px-4 text-left outline-none transition-colors hover:bg-gray-50 focus:border-cyan-500 dark:border-white/15 dark:hover:bg-white/7"
					>
						{values.length === 0 ? (
							<span className="text-gray-500">{placeholder}</span>
						) : (
							<span className="flex flex-1 flex-wrap gap-2">
								{values.map((value) => (
									<span
										key={value}
										className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-semibold dark:bg-white/7"
									>
										{selectedLabelByValue.get(value) ?? value}
										<button
											type="button"
											aria-label={`Remove ${selectedLabelByValue.get(value) ?? value}`}
											onClick={(event: MouseEvent<HTMLButtonElement>) => {
												event.stopPropagation();
												onChange(values.filter((v) => v !== value));
											}}
											className="rounded-full text-gray-500 hover:text-gray-900 dark:hover:text-white"
										>
											<CircleX size={15} />
										</button>
									</span>
								))}
							</span>
						)}
						{values.length > 0 && (
							<button
								type="button"
								aria-label={`Clear all ${label.toLowerCase()}`}
								onPointerDown={(event: PointerEvent<HTMLButtonElement>) => {
									event.preventDefault();
									event.stopPropagation();
								}}
								onClick={(event: MouseEvent<HTMLButtonElement>) => {
									event.preventDefault();
									event.stopPropagation();
									onChange([]);
								}}
								className="ml-auto shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold text-cyan-600 transition-colors hover:bg-cyan-50 dark:text-cyan-400 dark:hover:bg-cyan-500/10"
							>
								Clear all
							</button>
						)}
						<ChevronDown
							size={17}
							className={values.length > 0 ? "shrink-0" : "ml-auto shrink-0"}
						/>
					</div>
				</DropdownMenu.Trigger>

				<DropdownMenu.Portal>
					<DropdownMenu.Content
						align="start"
						sideOffset={8}
						className="z-[900] max-h-72 w-[420px] max-w-[calc(100vw-32px)] overflow-y-auto rounded-xl border border-gray-200 bg-white p-2 shadow-2xl dark:border-white/10 dark:bg-[#232322]"
					>
						{options.map((option) => {
							const selected = values.includes(option.value);
							return (
								<DropdownMenu.CheckboxItem
									key={option.value}
									checked={selected}
									onCheckedChange={() => {
										onChange(
											selected
												? values.filter((v) => v !== option.value)
												: [...values, option.value],
										);
									}}
									className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 outline-none data-[highlighted]:bg-gray-100 dark:data-[highlighted]:bg-white/7"
								>
									<span
										className={`grid size-5 place-items-center rounded border ${
											selected
												? "border-[#FF6633] bg-[#FF6633] text-white"
												: "border-gray-400"
										}`}
									>
										{selected && <Check size={14} />}
									</span>
									<span className="truncate">{option.label}</span>
								</DropdownMenu.CheckboxItem>
							);
						})}
					</DropdownMenu.Content>
				</DropdownMenu.Portal>
			</DropdownMenu.Root>
		</div>
	);
}
