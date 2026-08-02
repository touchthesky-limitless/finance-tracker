"use client";

import {
	ChevronLeft,
	ChevronRight,
	Settings,
	ChevronDown,
} from "lucide-react";

interface PlanPageHeaderProps {
	currentMonthLabel: string;
	goToPreviousMonth: () => void;
	goToNextMonth: () => void;
	goToToday: () => void;
	viewMode: "month" | "year" | "decade";
	setViewMode: (mode: "month" | "year" | "decade") => void;
	allCollapsed: boolean;
	toggleAllCollapse: () => void;
	setSettingsOpen: (open: boolean) => void;
}

export function PlanPageHeader({
	currentMonthLabel,
	goToPreviousMonth,
	goToNextMonth,
	goToToday,
	viewMode,
	setViewMode,
	allCollapsed,
	toggleAllCollapse,
	setSettingsOpen,
}: PlanPageHeaderProps) {
	return (
		<header className="flex flex-wrap items-center justify-between border-b border-gray-200 bg-white/95 px-4 py-3 sm:px-6 backdrop-blur-sm dark:border-white/5 dark:bg-[#191919]/95">
			<h1 className="text-lg sm:text-xl font-semibold tracking-tight whitespace-nowrap">
				{currentMonthLabel}
			</h1>

			{/* Right side controls - tightly packed */}
			<div className="flex flex-wrap items-center justify-end gap-1.5">
				{/* Navigation arrows + Today */}
				<div className="flex items-center gap-1 text-gray-500">
					<button
						className="rounded-md p-1 hover:bg-gray-100 dark:hover:bg-white/5"
						onClick={goToPreviousMonth}
					>
						<ChevronLeft size={16} />
					</button>
					<button
						className="rounded-md p-1 hover:bg-gray-100 dark:hover:bg-white/5"
						onClick={goToNextMonth}
					>
						<ChevronRight size={16} />
					</button>
					<button
						className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-medium shadow-sm hover:bg-gray-50 dark:border-white/10 dark:bg-[#191919] dark:hover:bg-white/5"
						onClick={goToToday}
					>
						Today
					</button>
				</div>
				{/* Vertical Divider */}
				<div className="hidden h-5 w-px bg-gray-300 dark:bg-white/10 sm:block" />
				{/* View toggle (Month, Year, Decade) */}
				<div className="flex overflow-hidden rounded-lg border border-gray-200 bg-gray-50 text-xs font-medium dark:border-white/10 dark:bg-[#232323]">
					{["Month", "Year", "Decade"].map((view) => (
						<button
							key={view}
							onClick={() => setViewMode(view.toLowerCase() as typeof viewMode)}
							className={`px-2 py-1 transition-colors ${
								viewMode === view.toLowerCase()
									? "bg-white text-blue-600 shadow-sm dark:bg-[#191919] dark:text-blue-400"
									: "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
							}`}
						>
							{view}
						</button>
					))}
				</div>

				{/* Collapse All Button */}
				<button
					onClick={toggleAllCollapse}
					className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-medium shadow-sm hover:bg-gray-50 dark:border-white/10 dark:bg-[#191919] dark:hover:bg-white/5"
				>
					{allCollapsed ? (
						<ChevronRight size={14} />
					) : (
						<ChevronDown size={14} />
					)}
					<span className="hidden sm:inline">
						{allCollapsed ? "Expand all" : "Collapse all"}
					</span>
					<span className="sm:hidden">
						{allCollapsed ? "Expand" : "Collapse"}
					</span>
				</button>

				{/* Vertical Divider */}
				<div className="hidden h-5 w-px bg-gray-300 dark:bg-white/10 sm:block" />

				{/* Settings Button */}
				<button
					onClick={() => setSettingsOpen(true)}
					className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-medium shadow-sm hover:bg-gray-50 dark:border-white/10 dark:bg-[#191919] dark:hover:bg-white/5"
				>
					<Settings size={14} />
					<span className="hidden sm:inline">Settings</span>
				</button>
			</div>
		</header>
	);
}
