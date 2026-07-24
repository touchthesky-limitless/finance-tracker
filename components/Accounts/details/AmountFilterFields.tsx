"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
	Check,
	ChevronDown,
} from "lucide-react";

import type {
	AccountAmountMode,
} from "@/components/Accounts/details/accountDetailsUtils";

interface AmountFilterFieldsProps {
	mode: AccountAmountMode;
	value: string;
	maxValue: string;
	onChange: (
		mode: AccountAmountMode,
		value: string,
		maxValue: string,
	) => void;
}

const AMOUNT_OPTIONS: ReadonlyArray<{
	value: AccountAmountMode;
	label: string;
}> = [
	{ value: "none", label: "All amounts" },
	{ value: "greater-than", label: "Greater than" },
	{ value: "less-than", label: "Less than" },
	{ value: "equal-to", label: "Equal to" },
	{ value: "between", label: "Between" },
];

function cleanAmountInput(value: string): string {
	const normalized = value
		.replaceAll(",", "")
		.replace(/[^0-9.]/g, "");
	const [whole, ...decimalParts] = normalized.split(".");

	return decimalParts.length > 0
		? `${whole}.${decimalParts.join("").slice(0, 2)}`
		: whole;
}

function AmountInput({
	value,
	placeholder,
	ariaLabel,
	onChange,
}: {
	value: string;
	placeholder: string;
	ariaLabel: string;
	onChange: (value: string) => void;
}) {
	return (
		<label className="relative block">
			<span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-base text-gray-500 dark:text-gray-400">
				$
			</span>
			<input
				value={value}
				onChange={(event) => {
					onChange(cleanAmountInput(event.target.value));
				}}
				inputMode="decimal"
				aria-label={ariaLabel}
				placeholder={placeholder}
				className="h-14 w-full rounded-xl border border-gray-300 bg-white pl-8 pr-4 text-base text-gray-900 outline-none transition-colors placeholder:text-gray-500 focus:border-[#00A8D2] focus:ring-2 focus:ring-[#00A8D2]/15 dark:border-white/15 dark:bg-[#222] dark:text-white dark:placeholder:text-gray-400"
			/>
		</label>
	);
}

function AmountModeButton({
	mode,
	onChange,
}: {
	mode: AccountAmountMode;
	onChange: (mode: AccountAmountMode) => void;
}) {
	const label =
		AMOUNT_OPTIONS.find((option) => option.value === mode)?.label ??
		"All amounts";

	return (
		<DropdownMenu.Root modal={false}>
			<DropdownMenu.Trigger asChild>
				<button
					type="button"
					className="flex h-14 w-full items-center justify-between rounded-xl border border-gray-300 bg-white px-4 text-left text-base text-gray-900 outline-none transition-colors hover:bg-gray-50 data-[state=open]:border-[#00A8D2] data-[state=open]:ring-2 data-[state=open]:ring-[#00A8D2]/15 dark:border-white/15 dark:bg-[#222] dark:text-white dark:hover:bg-[#292929]"
				>
					{label}
					<ChevronDown size={18} />
				</button>
			</DropdownMenu.Trigger>

			<DropdownMenu.Portal>
				<DropdownMenu.Content
					side="bottom"
					align="start"
					sideOffset={8}
					collisionPadding={12}
					onCloseAutoFocus={(event) => {
						event.preventDefault();
					}}
					className="z-[9999] w-[var(--radix-dropdown-menu-trigger-width)] min-w-[250px] rounded-2xl border border-gray-200 bg-white p-2 shadow-2xl outline-none dark:border-white/10 dark:bg-[#1E1E1E]"
				>
					{AMOUNT_OPTIONS.map((option) => {
						const selected = option.value === mode;

						return (
							<DropdownMenu.Item
								key={option.value}
								onSelect={() => {
									onChange(option.value);
								}}
								className={`flex cursor-pointer items-center justify-between rounded-xl px-4 py-3 text-base outline-none ${
									selected
										? "bg-gray-100 dark:bg-white/5"
										: "data-[highlighted]:bg-gray-100 dark:data-[highlighted]:bg-white/5"
								}`}
							>
								{option.label}
								{selected && (
									<Check
										size={18}
										strokeWidth={2.5}
										className="text-[#FF5A35]"
									/>
								)}
							</DropdownMenu.Item>
						);
					})}
				</DropdownMenu.Content>
			</DropdownMenu.Portal>
		</DropdownMenu.Root>
	);
}

export function AmountFilterFields({
	mode,
	value,
	maxValue,
	onChange,
}: AmountFilterFieldsProps) {
	const changeMode = (nextMode: AccountAmountMode): void => {
		if (nextMode === "none") {
			onChange("none", "", "");
			return;
		}

		onChange(
			nextMode,
			value,
			nextMode === "between" ? maxValue : "",
		);
	};

	if (mode === "between") {
		return (
			<div className="space-y-5">
				<AmountModeButton
					mode={mode}
					onChange={changeMode}
				/>

				<div className="grid grid-cols-2 gap-5">
					<label className="block">
						<span className="mb-3 block text-base font-semibold">
							Minimum
						</span>
						<AmountInput
							value={value}
							placeholder="1.00"
							ariaLabel="Minimum amount"
							onChange={(nextValue) => {
								onChange(mode, nextValue, maxValue);
							}}
						/>
					</label>

					<label className="block">
						<span className="mb-3 block text-base font-semibold">
							Maximum
						</span>
						<AmountInput
							value={maxValue}
							placeholder="100.00"
							ariaLabel="Maximum amount"
							onChange={(nextMaxValue) => {
								onChange(mode, value, nextMaxValue);
							}}
						/>
					</label>
				</div>
			</div>
		);
	}

	if (mode === "none") {
		return (
			<AmountModeButton
				mode={mode}
				onChange={changeMode}
			/>
		);
	}

	return (
		<div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-5">
			<AmountModeButton
				mode={mode}
				onChange={changeMode}
			/>

			<AmountInput
				value={value}
				placeholder="1.00"
				ariaLabel="Amount"
				onChange={(nextValue) => {
					onChange(mode, nextValue, "");
				}}
			/>
		</div>
	);
}
