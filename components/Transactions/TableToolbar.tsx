import React from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown, PencilSparkles, Columns, Minus } from "lucide-react";
import { SortingState, VisibilityState } from "@tanstack/react-table";

interface TableToolbarProps {
	isEditMode: boolean;
	setIsEditMode: (value: boolean) => void;
	selectedIds: string[];
	setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
	visibleTransactionIds: string[];
	currentView: "all" | "review";
	setCurrentView: (view: "all" | "review") => void;
	filteredLength: number;
	sorting: SortingState;
	setSorting: (sorting: SortingState) => void;
	columnVisibility: VisibilityState;
	setColumnVisibility: React.Dispatch<React.SetStateAction<VisibilityState>>;
	onEditMultiple: () => void;
}

export function TableToolbar({
	isEditMode,
	setIsEditMode,
	selectedIds,
	setSelectedIds,
	visibleTransactionIds,
	currentView,
	setCurrentView,
	filteredLength,
	sorting,
	setSorting,
	columnVisibility,
	setColumnVisibility,
	onEditMultiple,
}: TableToolbarProps) {
	const sortOptions = [
		{ label: "Date (new to old)", id: "date", desc: true },
		{ label: "Date (old to new)", id: "date", desc: false },
		{ label: "Amount (high to low)", id: "amount", desc: true },
		{ label: "Amount (low to high)", id: "amount", desc: false },
	];

	const activeSortLabel = sortOptions.find((o) => {
		return o.id === sorting[0]?.id && o.desc === sorting[0]?.desc;
	})?.label;

	const isSortModified =
		sorting.length > 0 &&
		(sorting[0].id !== "date" || sorting[0].desc !== true);
	const isColumnsModified = Object.values(columnVisibility).some(
		(isVisible) => {
			return isVisible === false;
		},
	);
	const isViewModified = currentView !== "all";

	const allVisibleTransactionsSelected =
		visibleTransactionIds.length > 0 &&
		visibleTransactionIds.every((transactionId) => {
			return selectedIds.includes(transactionId);
		});

	const handleToggleSelectAll = () => {
		if (visibleTransactionIds.length === 0) {
			return;
		}

		const visibleIdSet = new Set(visibleTransactionIds);

		setSelectedIds((current) => {
			if (allVisibleTransactionsSelected) {
				return current.filter((transactionId) => {
					return !visibleIdSet.has(transactionId);
				});
			}

			return Array.from(new Set([...current, ...visibleTransactionIds]));
		});
	};

	const hasVisibleSelection = visibleTransactionIds.some((transactionId) => {
		return selectedIds.includes(transactionId);
	});

	return (
		<div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-white/5 relative z-50">
			<div className="flex items-center gap-4">
				{isEditMode ? (
					<div className="flex items-center gap-3">
						<button
							type="button"
							onClick={handleToggleSelectAll}
							disabled={visibleTransactionIds.length === 0}
							aria-label={
								allVisibleTransactionsSelected
									? "Deselect all visible transactions"
									: "Select all visible transactions"
							}
							title={
								allVisibleTransactionsSelected ? "Deselect all" : "Select all"
							}
							className={`
		flex h-6 w-6 items-center justify-center
		rounded border transition-colors
		focus-visible:outline-none
		focus-visible:ring-2
		focus-visible:ring-[#FF5A35]/40
		disabled:cursor-not-allowed
		disabled:opacity-40
		${
			hasVisibleSelection
				? "border-[#FF5A35] bg-[#FF5A35] text-white hover:bg-[#E04825]"
				: "border-gray-400 bg-white text-transparent hover:border-[#FF5A35] dark:border-gray-500 dark:bg-transparent"
		}
	`}
						>
							{hasVisibleSelection && <Minus size={16} strokeWidth={3} />}
						</button>
						<span className="text-gray-900 dark:text-white font-bold text-[15px]">
							{selectedIds.length} transaction
							{selectedIds.length !== 1 ? "s" : ""} selected{" "}
							<span className="text-gray-500 font-normal ml-1">(ESC)</span>
						</span>
					</div>
				) : (
					<div className="relative">
						<DropdownMenu.Root modal={false}>
							<DropdownMenu.Trigger asChild>
								<button className="relative flex items-center justify-between gap-2 px-3 h-9 min-w-45 rounded-lg border text-[14px] font-medium transition-colors border-gray-300 dark:border-white/20 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/5 data-[state=open]:border-blue-600 data-[state=open]:dark:border-[#38bdf8]">
									{currentView === "all" ? "All transactions" : "Anyone"}{" "}
									<ChevronDown
										size={16}
										className="text-gray-500 dark:text-gray-400"
									/>
									{isViewModified && (
										<div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 dark:bg-[#38bdf8] border-2 border-white dark:border-[#191919] rounded-full" />
									)}
								</button>
							</DropdownMenu.Trigger>
							<DropdownMenu.Portal>
								<DropdownMenu.Content
									align="start"
									sideOffset={8}
									className="z-50 w-64 bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden py-2 animate-in fade-in zoom-in-95"
								>
									<DropdownMenu.Item
										onSelect={() => {
											setCurrentView("all");
										}}
										className={`w-full text-left px-4 py-2.5 text-[15px] transition-colors outline-none cursor-pointer ${currentView === "all" ? "bg-blue-50 dark:bg-[#0B4D56] text-blue-600 dark:text-[#38bdf8]" : "text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/5 focus:bg-gray-100 dark:focus:bg-white/5"}`}
									>
										All transactions
									</DropdownMenu.Item>
									<div className="px-4 py-2 text-xs font-bold text-gray-500 mt-2">
										Needs Review by...
									</div>
									<DropdownMenu.Item
										onSelect={() => {
											setCurrentView("review");
										}}
										className={`w-full text-left px-4 py-2.5 text-[15px] transition-colors outline-none cursor-pointer ${currentView === "review" ? "bg-blue-50 dark:bg-[#0B4D56] text-blue-600 dark:text-[#38bdf8]" : "text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/5 focus:bg-gray-100 dark:focus:bg-white/5"}`}
									>
										Anyone
									</DropdownMenu.Item>
								</DropdownMenu.Content>
							</DropdownMenu.Portal>
						</DropdownMenu.Root>
					</div>
				)}
			</div>

			<div className="flex items-center gap-3">
				{isEditMode ? (
					<>
						<button
							onClick={() => {
								setIsEditMode(false);
								setSelectedIds([]);
							}}
							className="px-4 h-9 rounded-lg border border-gray-300 dark:border-white/20 text-[14px] font-medium text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
						>
							Cancel
						</button>
						<button
							type="button"
							onClick={onEditMultiple}
							disabled={selectedIds.length === 0}
							className="px-4 h-9 rounded-lg bg-[#FF5A35] hover:bg-[#E04825] text-[14px] font-bold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-[#FF5A35]"
						>
							Edit {selectedIds.length} transaction
							{selectedIds.length === 1 ? "" : "s"}
						</button>
					</>
				) : (
					<>
						<button
							onClick={() => {
								setIsEditMode(true);
							}}
							className="flex items-center gap-2 px-3 h-9 rounded-lg border border-gray-300 dark:border-white/20 text-[14px] font-medium text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
						>
							<PencilSparkles
								size={16}
								className="text-gray-500 dark:text-gray-400"
								strokeWidth={2.5}
							/>{" "}
							Edit multiple
						</button>
						{currentView === "review" && (
							<button className="px-4 h-9 rounded-lg bg-[#FF5A35] hover:bg-[#E04825] text-[14px] font-bold text-white transition-colors">
								Mark all {filteredLength} as reviewed
							</button>
						)}
					</>
				)}

				<div className="w-px h-6 bg-gray-300 dark:bg-white/20 mx-1" />

				<div className="relative">
					<DropdownMenu.Root modal={false}>
						<DropdownMenu.Trigger asChild>
							<button className="relative flex items-center gap-2 px-3 h-9 rounded-lg border border-gray-300 dark:border-white/20 text-[14px] font-medium text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors data-[state=open]:bg-gray-100 dark:data-[state=open]:bg-white/5 whitespace-nowrap">
								{isSortModified && activeSortLabel ? (
									<span className="flex items-center gap-1.5">
										Sort{" "}
										<span className="text-gray-300 dark:text-gray-600">|</span>{" "}
										<span className="text-blue-600 dark:text-[#38bdf8]">
											{activeSortLabel}
										</span>
									</span>
								) : (
									"Sort"
								)}
								<ChevronDown
									size={16}
									className="text-gray-500 dark:text-gray-400 shrink-0"
								/>
								{isSortModified && (
									<div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 dark:bg-[#38bdf8] border-2 border-white dark:border-[#191919] rounded-full" />
								)}
							</button>
						</DropdownMenu.Trigger>
						<DropdownMenu.Portal>
							<DropdownMenu.Content
								align="end"
								sideOffset={8}
								className="z-50 w-56 bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden py-2 animate-in fade-in zoom-in-95"
							>
								{sortOptions.map((opt) => {
									const isActive = activeSortLabel === opt.label;
									return (
										<DropdownMenu.Item
											key={opt.label}
											onSelect={() => {
												setSorting([{ id: opt.id, desc: opt.desc }]);
											}}
											className={`w-full text-left px-4 py-2.5 text-[15px] transition-colors outline-none cursor-pointer ${isActive ? "bg-blue-50 dark:bg-[#0B4D56] text-blue-600 dark:text-[#38bdf8]" : "text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/5 focus:bg-gray-100 dark:focus:bg-white/5"}`}
										>
											{opt.label}
										</DropdownMenu.Item>
									);
								})}
							</DropdownMenu.Content>
						</DropdownMenu.Portal>
					</DropdownMenu.Root>
				</div>

				<div className="relative">
					<DropdownMenu.Root modal={false}>
						<DropdownMenu.Trigger asChild>
							<button className="relative flex items-center gap-2 px-3 h-9 rounded-lg border border-gray-300 dark:border-white/20 text-[14px] font-medium text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors data-[state=open]:bg-gray-100 dark:data-[state=open]:bg-white/5">
								<Columns
									size={16}
									className="text-gray-500 dark:text-gray-400"
								/>{" "}
								Columns
								{isColumnsModified && (
									<div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 dark:bg-[#38bdf8] border-2 border-white dark:border-[#191919] rounded-full" />
								)}
							</button>
						</DropdownMenu.Trigger>
						<DropdownMenu.Portal>
							<DropdownMenu.Content
								align="end"
								sideOffset={8}
								className="z-50 w-56 bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl py-3 px-4 flex flex-col gap-4 animate-in fade-in zoom-in-95"
							>
								<div className="text-xs font-bold text-gray-500">
									{Object.values(columnVisibility).filter((v) => {
										return v !== false;
									}).length +
										(2 - Object.keys(columnVisibility).length)}{" "}
									of 2 visible
								</div>
								{["category", "account"].map((col) => {
									const isChecked = columnVisibility[col] !== false;
									return (
										<DropdownMenu.Item
											key={col}
											onSelect={(e) => {
												e.preventDefault();
												setColumnVisibility((prev) => {
													return { ...prev, [col]: !isChecked };
												});
											}}
											className="flex items-center justify-between outline-none cursor-pointer"
										>
											<span className="text-[15px] text-gray-900 dark:text-white capitalize">
												{col}
											</span>
											<button
												className={`w-10 h-5 rounded-full relative transition-colors pointer-events-none ${isChecked ? "bg-[#FF5A35]" : "bg-gray-300 dark:bg-gray-600"}`}
											>
												<div
													className={`w-3.5 h-3.5 rounded-full bg-white dark:bg-[#191919] absolute top-0.75 transition-all ${isChecked ? "right-1" : "left-1"}`}
												/>
											</button>
										</DropdownMenu.Item>
									);
								})}
							</DropdownMenu.Content>
						</DropdownMenu.Portal>
					</DropdownMenu.Root>
				</div>
			</div>
		</div>
	);
}
