import React from "react";
import {
	Search,
	Calendar,
	Filter,
	Import,
	Plus,
	Sidebar as SidebarIcon,
} from "lucide-react";

interface TopToolbarProps {
	searchQuery: string;
	setSearchQuery: (val: string) => void;
	setShowUploader: (val: boolean) => void;
	onAddTransaction: () => void;
	isSummaryVisible: boolean;
	setIsSummaryVisible: React.Dispatch<React.SetStateAction<boolean>>;
	hasActiveFilters: boolean;
	onClearAll: () => void;
}

export function TopToolbar({
	searchQuery,
	setSearchQuery,
	setShowUploader,
	onAddTransaction,
	isSummaryVisible,
	setIsSummaryVisible,
	hasActiveFilters,
	onClearAll,
}: TopToolbarProps) {
	return (
		<div className="flex items-center justify-between px-6 pt-5 pb-0 border-b border-gray-200 dark:border-white/5 bg-white dark:bg-[#191919] z-30 transition-colors duration-200">
			<div className="flex items-center gap-8">
				<h1 className="text-[22px] font-bold text-gray-900 dark:text-white tracking-tight pb-4">
					Transactions
				</h1>
				<div className="flex gap-6 text-[15px] font-medium h-full">
					<button className="text-[#FF5A35] border-b-[3px] border-[#FF5A35] pb-4">
						All
					</button>
					<button className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 pb-4 transition-colors">
						Receipts
					</button>
				</div>
			</div>

			<div className="flex items-center gap-3 pb-4">
				{hasActiveFilters && (
					<button
						onClick={onClearAll}
						className="text-blue-600 dark:text-[#38bdf8] hover:text-blue-800 dark:hover:text-[#7dd3fc] text-[14px] font-medium mr-2 transition-colors"
					>
						Clear
					</button>
				)}

				<div className="flex items-center bg-transparent border border-gray-300 dark:border-white/20 rounded-lg overflow-hidden h-9 focus-within:border-gray-500 dark:focus-within:border-white/40 transition-colors">
					<div className="pl-3 pr-2 text-gray-500 dark:text-gray-400">
						<Search size={16} strokeWidth={2.5} />
					</div>
					<input
						value={searchQuery}
						onChange={(e) => {
							setSearchQuery(e.target.value);
						}}
						placeholder="Search"
						className="w-40 bg-transparent text-gray-900 dark:text-white text-[14px] placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none h-full"
					/>
				</div>

				<button className="flex items-center gap-2 px-3 h-9 rounded-lg border border-gray-300 dark:border-white/20 text-[14px] font-medium text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
					<Calendar
						size={16}
						className="text-gray-500 dark:text-gray-400"
						strokeWidth={2}
					/>{" "}
					Date
				</button>

				<button className="flex items-center gap-2 px-3 h-9 rounded-lg border border-gray-300 dark:border-white/20 text-[14px] font-medium text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
					<Filter
						size={16}
						className="text-gray-500 dark:text-gray-400"
						strokeWidth={2}
					/>{" "}
					Filters
				</button>

				<div className="w-px h-6 bg-gray-300 dark:bg-white/20 mx-1" />

				<button
					className="flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-[#121212] border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-bold transition-all shadow-sm active:scale-95"
					onClick={() => {
						setShowUploader(true);
					}}
				>
					<Import size={16} />
					<span>Import</span>
				</button>
				<button
					onClick={onAddTransaction}
					className="flex items-center justify-center gap-1.5 px-4 h-9 rounded-lg bg-[#FF5A35] hover:bg-[#E04825] text-white text-[14px] font-bold transition-colors shadow-sm"
				>
					<Plus size={18} strokeWidth={2.5} /> Add
				</button>

				<button
					onClick={() => {
						setIsSummaryVisible((prev) => {
							return !prev;
						});
					}}
					className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-colors ml-1 ${
						isSummaryVisible
							? "border-blue-600 dark:border-[#38bdf8] text-blue-600 dark:text-[#38bdf8] bg-blue-50 dark:bg-[#0B4D56]"
							: "border-gray-300 dark:border-white/20 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"
					}`}
				>
					<SidebarIcon size={18} strokeWidth={2} />
				</button>
			</div>
		</div>
	);
}
