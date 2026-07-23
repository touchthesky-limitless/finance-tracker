"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Bell, PanelLeft, Search, Settings } from "lucide-react";
import * as Tooltip from "@radix-ui/react-tooltip";

import Logo from "@/components/ui/Logo";

interface SidebarHeaderProps {
	isCollapsed: boolean;
	onToggle: () => void;
}

export default function SidebarHeader({
	isCollapsed,
	onToggle,
}: SidebarHeaderProps) {
	if (isCollapsed) {
		return (
			<header className="flex shrink-0 justify-center p-2 pb-1">
				<Tooltip.Provider delayDuration={250}>
					<Tooltip.Root>
						<Tooltip.Trigger asChild>
							<div className="group relative h-10 w-10">
								<Link
									href="/dashboard"
									aria-label="Dashboard"
									className="absolute inset-0 flex items-center justify-center rounded-lg transition-opacity duration-150 group-hover:opacity-0 group-focus-within:opacity-0"
								>
									<Logo size={30} />
								</Link>

								<button
									type="button"
									onClick={onToggle}
									aria-label="Open sidebar"
									className="absolute inset-0 flex items-center justify-center rounded-lg bg-[#ececec] opacity-0 transition-all duration-150 hover:bg-[#e3e3e3] focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 group-hover:opacity-100 dark:bg-[#2a2a2a] dark:hover:bg-[#333333] dark:focus-visible:ring-white/20"
								>
									<PanelLeft size={20} strokeWidth={1.8} />
								</button>
							</div>
						</Tooltip.Trigger>

						<Tooltip.Portal>
							<Tooltip.Content
								side="right"
								sideOffset={8}
								className="z-[200] rounded-lg bg-[#212121] px-3 py-2 text-xs font-medium text-white shadow-lg dark:bg-[#f2f2f2] dark:text-[#171717]"
							>
								Open sidebar
								<Tooltip.Arrow className="fill-[#212121] dark:fill-[#f2f2f2]" />
							</Tooltip.Content>
						</Tooltip.Portal>
					</Tooltip.Root>
				</Tooltip.Provider>
			</header>
		);
	}

	return (
		<header className="flex h-12 shrink-0 items-center justify-between gap-2 px-3">
			<Link
				href="/dashboard"
				aria-label="Dashboard"
				className="flex h-9 min-w-0 items-center rounded-lg px-1.5 transition-colors hover:bg-[#ececec] dark:hover:bg-[#2a2a2a]"
			>
				<Logo size={32} />
			</Link>

			<div className="flex shrink-0 items-center gap-0.5">
				<HeaderIconButton label="Search">
					<Search size={19} strokeWidth={1.8} />
				</HeaderIconButton>

				<HeaderIconButton label="Notifications">
					<span className="relative">
						<Bell size={19} strokeWidth={1.8} />
						<span className="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-[#ff5a35]" />
					</span>
				</HeaderIconButton>

				<HeaderIconButton label="Settings" href="/settings/categories">
					<Settings size={19} strokeWidth={1.8} />
				</HeaderIconButton>

				<HeaderIconButton label="Close sidebar" onClick={onToggle}>
					<PanelLeft size={19} strokeWidth={1.8} />
				</HeaderIconButton>
			</div>
		</header>
	);
}

interface HeaderIconButtonProps {
	label: string;
	href?: string;
	onClick?: () => void;
	children: ReactNode;
}

function HeaderIconButton({
	label,
	href,
	onClick,
	children,
}: HeaderIconButtonProps) {
	const className =
		"flex h-9 w-9 items-center justify-center rounded-lg text-[#5d5d5d] transition-colors hover:bg-[#ececec] hover:text-[#0d0d0d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 dark:text-[#b4b4b4] dark:hover:bg-[#2a2a2a] dark:hover:text-[#ececec] dark:focus-visible:ring-white/20";

	return (
		<Tooltip.Provider delayDuration={350}>
			<Tooltip.Root>
				<Tooltip.Trigger asChild>
					{href ? (
						<Link href={href} aria-label={label} className={className}>
							{children}
						</Link>
					) : (
						<button
							type="button"
							onClick={onClick}
							aria-label={label}
							className={className}
						>
							{children}
						</button>
					)}
				</Tooltip.Trigger>

				<Tooltip.Portal>
					<Tooltip.Content
						side="bottom"
						sideOffset={6}
						className="z-[200] rounded-lg bg-[#212121] px-3 py-2 text-xs font-medium text-white shadow-lg dark:bg-[#f2f2f2] dark:text-[#171717]"
					>
						{label}
						<Tooltip.Arrow className="fill-[#212121] dark:fill-[#f2f2f2]" />
					</Tooltip.Content>
				</Tooltip.Portal>
			</Tooltip.Root>
		</Tooltip.Provider>
	);
}
