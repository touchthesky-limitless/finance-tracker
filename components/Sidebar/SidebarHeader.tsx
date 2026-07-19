"use client";

import { Search, Bell, Settings, PanelLeft, Pin } from "lucide-react";
import * as Tooltip from "@radix-ui/react-tooltip";
import Link from "next/link";
import Logo from "@/components/ui/Logo"; // Adjust if your path is different

interface SidebarHeaderProps {
    isCollapsed: boolean;
    onToggle: () => void;
}

export default function SidebarHeader({
    isCollapsed,
    onToggle,
}: SidebarHeaderProps) {
    return (
        <div
            // items-center here ensures the left and right sides are perfectly middle-aligned
            className={`flex pt-2 pb-2 transition-all duration-300 ${
                isCollapsed
                    ? "flex-col items-center gap-6 px-2"
                    : "items-center justify-between gap-4 px-4"
            }`}
        >
            {/* Logo Area */}
            <Link
                href="/dashboard"
                // flex items-center ensures the Link itself doesn't stretch or push the logo off-center
                className="flex items-center justify-center shrink-0"
            >
                {/* Bumped size up to 48 to offset the SVG's internal padding */}
                <Logo size={48} />
            </Link>

            {/* Utility Icons & Toggle Button */}
            <div
                // flex items-center keeps all the icons aligned in the middle
                className={`flex items-center text-gray-500 dark:text-gray-400 ${
                    isCollapsed ? "flex-col " : "gap-3.5 w-full justify-end"
                }`}
            >
                {!isCollapsed && (
                    <>
                        <button
                            type="button"
                            className="hover:text-gray-900 dark:hover:text-white transition-colors"
                            aria-label="Search"
                        >
                            <Search size={18} />
                        </button>
                        <div className="relative flex items-center justify-center">
                            <button
                                type="button"
                                className="hover:text-gray-900 dark:hover:text-white transition-colors"
                                aria-label="Notifications"
                            >
                                <Bell size={18} />
                            </button>
                            <div className="absolute -top-0.5 right-0.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-[#1c1c1c]" />
                        </div>
                        <button
                            type="button"
                            className="hover:text-gray-900 dark:hover:text-white transition-colors"
                            aria-label="Settings"
                        >
                            <Settings size={18} />
                        </button>

                        {/* Radix UI Tooltip - Now only rendered when NOT collapsed */}
                        <Tooltip.Provider delayDuration={200}>
                            <Tooltip.Root>
                                <Tooltip.Trigger asChild>
                                    <button
                                        type="button"
                                        onClick={onToggle}
                                        className="hover:text-gray-900 dark:hover:text-white transition-colors flex items-center justify-center"
                                        aria-label="Toggle Sidebar"
                                    >
                                        <PanelLeft size={18} />
                                    </button>
                                </Tooltip.Trigger>
                                <Tooltip.Portal>
                                    <Tooltip.Content
                                        side="top"
                                        sideOffset={8}
                                        className="px-2.5 py-1.5 bg-white dark:bg-[#2a2a2a] text-gray-900 dark:text-[#e0e0e0] text-[11px] font-bold tracking-wide rounded-md border border-gray-200 dark:border-[#3a3a3a] shadow-lg animate-in fade-in zoom-in-95 z-100"
                                    >
                                        <Pin size={12} className="text-gray-500 dark:text-gray-400" />
                                        <Tooltip.Arrow className="fill-gray-200 dark:fill-[#3a3a3a]" />
                                    </Tooltip.Content>
                                </Tooltip.Portal>
                            </Tooltip.Root>
                        </Tooltip.Provider>
                    </>
                )}
            </div>
        </div>
    );
}