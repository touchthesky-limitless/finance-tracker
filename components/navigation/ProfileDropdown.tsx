"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Zap, Settings, ChevronDown, ChevronUp } from "lucide-react";

import ThemeToggle from "@/components/ThemeToggle";
import { LogoutButton } from "@/components/LogoutButton";

interface ProfileDropdownProps {
	isCollapsed?: boolean;
}

export default function ProfileDropdown({ isCollapsed }: ProfileDropdownProps) {
	return (
		<DropdownMenu.Root>
			<DropdownMenu.Trigger asChild>
				{/* Add 'group' here so children can detect the button's state */}
				<button
					className={`group flex items-center transition-colors outline-none
            bg-white hover:bg-gray-100 border border-transparent hover:border-gray-200
            dark:bg-[#2a2a2a] dark:hover:bg-[#333] dark:hover:border-[#3a3a3a]
            ${
							isCollapsed
								? "justify-center p-2 rounded-xl"
								: "justify-between w-full px-3 py-2.5 rounded-xl"
						}
        `}
				>
					<div className="flex items-center gap-3">
						<div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
							K
						</div>
						{!isCollapsed && (
							<span className="font-medium text-sm whitespace-nowrap text-gray-900 dark:text-[#e0e0e0]">
								User
							</span>
						)}
					</div>

					{!isCollapsed && (
						<div className="relative w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0">
							{/* Use group-data-[state=open] to check the parent button's state */}
							<ChevronDown
								size={16}
								className="absolute inset-0 transition-opacity duration-200 group-data-[state=open]:opacity-0"
							/>
							<ChevronUp
								size={16}
								className="absolute inset-0 opacity-0 transition-opacity duration-200 group-data-[state=open]:opacity-100"
							/>
						</div>
					)}
				</button>
			</DropdownMenu.Trigger>

			<DropdownMenu.Portal>
				<DropdownMenu.Content
					side="top"
					align={isCollapsed ? "center" : "start"}
					sideOffset={16}
					className="w-50 rounded-2xl shadow-2xl p-2 animate-in fade-in zoom-in-95 z-100
                        bg-white border border-gray-200
                        dark:bg-[#1e1e1e] dark:border-[#2a2a2a]"
				>
					{/* 1. Custom Appearance Section */}
					<div className="px-3 py-2 mb-2">
						<p className="text-[10px] uppercase tracking-[0.2em] font-black mb-4 text-gray-500 dark:text-gray-600">
							Appearance
						</p>
						<ThemeToggle />
					</div>

					<DropdownMenu.Separator className="h-px my-2 bg-gray-200 dark:bg-[#2a2a2a]" />

					{/* 2. Standard Dropdown Items */}
					<DropdownMenu.Item
						className="flex items-center gap-3 px-3 py-2.5 text-[15px] rounded-xl cursor-pointer outline-none transition-colors
                        text-gray-700 hover:bg-gray-100
                        dark:text-[#e0e0e0] dark:hover:bg-[#2a2a2a]"
					>
						<Zap size={18} className="text-gray-400" />
						<span>What&apos;s new</span>
					</DropdownMenu.Item>

					<DropdownMenu.Item
						className="flex items-center gap-3 px-3 py-2.5 text-[15px] rounded-xl cursor-pointer outline-none transition-colors
                        text-gray-700 hover:bg-gray-100
                        dark:text-[#e0e0e0] dark:hover:bg-[#2a2a2a]"
					>
						<Settings size={18} className="text-gray-400" />
						<span>Settings</span>
					</DropdownMenu.Item>

					<DropdownMenu.Separator className="h-px my-2 bg-gray-200 dark:bg-[#2a2a2a]" />

					{/* 3. Custom Logout Button */}
					<div className="px-1 pb-1">
						<LogoutButton />
					</div>
				</DropdownMenu.Content>
			</DropdownMenu.Portal>
		</DropdownMenu.Root>
	);
}
