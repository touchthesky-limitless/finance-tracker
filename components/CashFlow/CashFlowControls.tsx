/**
 * CashFlowControls – UI controls for timeframe, view, breakdown, and sharing.
 */
"use client";

import { useState, type ReactNode } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Popover from "@radix-ui/react-popover";
import { ChevronDown } from "lucide-react";
import { toPng } from "html-to-image";
import type {
	CashFlowBreakdown,
	CashFlowTimeframe,
	CashFlowView,
	SankeyBreakdown,
} from "./types";

const TIMEFRAME_OPTIONS: ReadonlyArray<{
	value: CashFlowTimeframe;
	label: string;
}> = [
	{ value: "month", label: "Monthly" },
	{ value: "quarter", label: "Quarterly" },
	{ value: "year", label: "Yearly" },
];

const BREAKDOWN_OPTIONS: ReadonlyArray<{
	value: CashFlowBreakdown;
	label: string;
}> = [
	{ value: "category", label: "Category" },
	{ value: "group", label: "Group" },
	{ value: "merchant", label: "Merchant" },
];

const SANKEY_OPTIONS: ReadonlyArray<{
	value: SankeyBreakdown;
	label: string;
}> = [
	{ value: "category", label: "Category" },
	{ value: "group", label: "Group" },
	{ value: "both", label: "Both" },
];

export function TimeframeTabs({
	value,
	onChange,
}: {
	value: CashFlowTimeframe;
	onChange: (value: CashFlowTimeframe) => void;
}) {
	return (
		<div className="flex items-center gap-1 sm:gap-2">
			{TIMEFRAME_OPTIONS.map((option) => {
				const isActive = value === option.value;

				return (
					<button
						key={option.value}
						type="button"
						onClick={() => {
							onChange(option.value);
						}}
						className={`rounded-full px-3 py-2 text-sm font-semibold transition-colors sm:px-4 ${
							isActive
								? "bg-gray-200 text-gray-900 dark:bg-white/15 dark:text-white"
								: "text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/7 dark:hover:text-white"
						}`}
					>
						{option.label}
					</button>
				);
			})}
		</div>
	);
}

export function ViewMenu({
	value,
	onChange,
}: {
	value: CashFlowView;
	onChange: (value: CashFlowView) => void;
}) {
	return (
		<DropdownMenu.Root modal={false}>
			<DropdownMenu.Trigger asChild>
				<button
					type="button"
					className="flex h-11 items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 font-semibold transition-colors hover:bg-gray-50 data-[state=open]:border-cyan-500 dark:border-white/15 dark:bg-[#232322] dark:hover:bg-white/7"
				>
					{value === "bar" ? "Bar Chart" : "Sankey Diagram"}
					<ChevronDown size={17} />
				</button>
			</DropdownMenu.Trigger>

			<DropdownMenu.Portal>
				<DropdownMenu.Content
					align="end"
					sideOffset={8}
					className="z-[900] min-w-56 rounded-xl border border-gray-200 bg-white p-2 shadow-2xl dark:border-white/10 dark:bg-[#232322]"
				>
					<MenuItem
						active={value === "bar"}
						onClick={() => {
							onChange("bar");
						}}
					>
						Bar Chart
					</MenuItem>
					<MenuItem
						active={value === "sankey"}
						onClick={() => {
							onChange("sankey");
						}}
					>
						Sankey Diagram
					</MenuItem>
				</DropdownMenu.Content>
			</DropdownMenu.Portal>
		</DropdownMenu.Root>
	);
}

type BreakdownTabsProps =
	| {
			sankey?: false;
			value: CashFlowBreakdown;
			onChange: (value: CashFlowBreakdown) => void;
	  }
	| {
			sankey: true;
			value: SankeyBreakdown;
			onChange: (value: SankeyBreakdown) => void;
	  };

export function BreakdownTabs(props: BreakdownTabsProps) {
	if (props.sankey) {
		return (
			<div className="flex items-center gap-1 sm:gap-2">
				{SANKEY_OPTIONS.map((option) => {
					const isActive = props.value === option.value;

					return (
						<button
							key={option.value}
							type="button"
							onClick={() => {
								props.onChange(option.value);
							}}
							className={`rounded-full px-3 py-2 text-sm font-semibold transition-colors sm:px-4 ${
								isActive
									? "bg-gray-200 text-gray-900 dark:bg-white/10 dark:text-white"
									: "text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/7 dark:hover:text-white"
							}`}
						>
							{option.label}
						</button>
					);
				})}
			</div>
		);
	}

	return (
		<div className="flex items-center gap-1 sm:gap-2">
			{BREAKDOWN_OPTIONS.map((option) => {
				const isActive = props.value === option.value;

				return (
					<button
						key={option.value}
						type="button"
						onClick={() => {
							props.onChange(option.value);
						}}
						className={`rounded-full px-3 py-2 text-sm font-semibold transition-colors sm:px-4 ${
							isActive
								? "bg-gray-200 text-gray-900 dark:bg-white/10 dark:text-white"
								: "text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/7 dark:hover:text-white"
						}`}
					>
						{option.label}
					</button>
				);
			})}
		</div>
	);
}

export function ShareMenu({
	targetId,
	filename,
	hideAmounts,
	onHideAmountsChange,
}: {
	targetId: string;
	filename: string;
	hideAmounts: boolean;
	onHideAmountsChange: (hideAmounts: boolean) => void;
}) {
	const [transparent, setTransparent] = useState(false);
	const [isGenerating, setIsGenerating] = useState(false);

	const generate = async (): Promise<void> => {
		const node = document.getElementById(targetId);

		if (!node || isGenerating) {
			return;
		}

		setIsGenerating(true);
		const previousBackgroundColor = node.style.backgroundColor;

		if (transparent) {
			node.style.backgroundColor = "transparent";
		}

		try {
			await new Promise<void>((resolve) => {
				window.requestAnimationFrame(() => {
					resolve();
				});
			});

			const computedBackground = window.getComputedStyle(node).backgroundColor;
			const dataUrl = await toPng(node, {
				cacheBust: true,
				backgroundColor: transparent ? undefined : computedBackground,
				pixelRatio: 2,
			});
			const link = document.createElement("a");
			link.download = filename;
			link.href = dataUrl;
			link.click();
		} finally {
			node.style.backgroundColor = previousBackgroundColor;
			setIsGenerating(false);
		}
	};

	return (
		<Popover.Root>
			<Popover.Trigger asChild>
				<button
					type="button"
					className="flex h-11 items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 font-semibold transition-colors hover:bg-gray-50 data-[state=open]:border-cyan-500 dark:border-white/15 dark:bg-[#232322] dark:hover:bg-white/7"
				>
					Share
					<ChevronDown size={16} />
				</button>
			</Popover.Trigger>

			<Popover.Portal>
				<Popover.Content
					align="end"
					sideOffset={8}
					collisionPadding={12}
					className="z-[900] w-80 rounded-xl border border-gray-200 bg-white p-5 shadow-2xl outline-none dark:border-white/10 dark:bg-[#232322]"
				>
					<p className="text-base font-semibold leading-relaxed">
						Generate an image of this chart to share with others. You have the
						option to hide amounts.
					</p>

					<Toggle
						label="Hide amounts"
						active={hideAmounts}
						onChange={onHideAmountsChange}
					/>
					<Toggle
						label="Transparent background"
						active={transparent}
						onChange={setTransparent}
					/>

					<button
						type="button"
						onClick={() => {
							void generate();
						}}
						disabled={isGenerating}
						className="mt-4 w-full rounded-xl bg-[#FF6633] px-5 py-3 font-bold text-white transition-colors hover:bg-[#E95424] disabled:cursor-wait disabled:opacity-60"
					>
						{isGenerating ? "Generating…" : "Generate image"}
					</button>
				</Popover.Content>
			</Popover.Portal>
		</Popover.Root>
	);
}

function MenuItem({
	active,
	onClick,
	children,
}: {
	active: boolean;
	onClick: () => void;
	children: ReactNode;
}) {
	return (
		<DropdownMenu.Item
			onSelect={onClick}
			className={`cursor-pointer rounded-lg px-4 py-3 font-semibold outline-none ${
				active
					? "bg-cyan-600/20 text-cyan-600 dark:text-cyan-400"
					: "data-[highlighted]:bg-gray-100 dark:data-[highlighted]:bg-white/7"
			}`}
		>
			{children}
		</DropdownMenu.Item>
	);
}

function Toggle({
	label,
	active,
	onChange,
}: {
	label: string;
	active: boolean;
	onChange: (value: boolean) => void;
}) {
	return (
		<button
			type="button"
			onClick={() => {
				onChange(!active);
			}}
			className="mt-5 flex w-full items-center justify-between font-semibold"
		>
			<span>{label}</span>
			<span
				className={`relative h-6 w-11 rounded-full transition-colors ${
					active ? "bg-[#FF6633]" : "bg-gray-300 dark:bg-white/20"
				}`}
			>
				<span
					className={`absolute top-1 size-4 rounded-full bg-white transition-[left] ${
						active ? "left-6" : "left-1"
					}`}
				/>
			</span>
		</button>
	);
}
