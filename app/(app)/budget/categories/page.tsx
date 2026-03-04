"use client";

import { useState, useEffect } from "react";
import { useShallow } from "zustand/react/shallow";
import {
	RotateCcw,
	MoreVertical,
	Edit3,
	Trash2,
	Plus,
	LayoutGrid,
	Check,
	X,
	Menu,
} from "lucide-react";
import { CategoryIcon } from "@/components/CategoryIcon";
import { AddCategoryModal } from "@/components/AddCategoryModal";
import { useBudgetStore } from "@/store/useBudgetStore";
import { useUnifiedCategories } from "@/hooks/useUnifiedCategories";
import { PARENT_COLORS, UnifiedCategory } from "@/constants";
import confetti from "canvas-confetti";

type TransactionType = "Expense" | "Income" | "Transfer";

export default function CategoriesPage() {
	// --- UI States ---
	const [transactionType, setTransactionType] =
		useState<TransactionType>("Expense");
	const [activePrimary, setActivePrimary] = useState<string>("All");
	const [isAddModalOpen, setIsAddModalOpen] = useState(false);
	const [deletingCategory, setDeletingCategory] = useState<string | null>(null);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [tempName, setTempName] = useState("");
	const [isConfirmingReset, setIsConfirmingReset] = useState(false);
	const [showResetMenu, setShowResetMenu] = useState(false);
	const [showSuccess, setShowSuccess] = useState(false);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [lastSynced, setLastSynced] = useState<Date>(new Date());
	const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile Sidebar State

	const {
		customCategories,
		fetchCustomCategories,
		deleteCustomCategory,
		updateCustomCategory,
		resetCustomCategories,
	} = useBudgetStore(
		useShallow((state) => ({
			customCategories: state.customCategories,
			fetchCustomCategories: state.fetchCustomCategories,
			deleteCustomCategory: state.deleteCustomCategory,
			updateCustomCategory: state.updateCustomCategory,
			resetCustomCategories: state.resetCustomCategories,
		})),
	);

	const hasCustomCategories = customCategories.length > 0;

	const {
		allUnifiedCategories,
		primaryCategories,
		displayList,
		activeCategory,
		isShowingAll,
	} = useUnifiedCategories(transactionType, activePrimary);

	const handleRefresh = async () => {
		setIsRefreshing(true);
		await fetchCustomCategories();
		setLastSynced(new Date());
		setTimeout(() => setIsRefreshing(false), 700);
		confetti({
			particleCount: 150,
			spread: 70,
			origin: { y: 0.6 },
			colors: ["#ea580c", "#ffffff", "#000000"],
		});
	};

	const handleSaveInline = async (cat: UnifiedCategory) => {
		const trimmedName = tempName.trim();
		if (!trimmedName || trimmedName === cat.name) {
			setEditingId(null);
			return;
		}
		const isDuplicate = allUnifiedCategories.some(
			(existing) =>
				existing.name.toLowerCase() === trimmedName.toLowerCase() &&
				existing.id !== cat.id,
		);
		if (isDuplicate) {
			return;
		}
		try {
			await updateCustomCategory(cat.id!, {
				name: trimmedName,
				icon: cat.icon || cat.name,
				color:
					Object.keys(PARENT_COLORS).find(
						(k) => PARENT_COLORS[k].bg === cat.theme.bg,
					) || "Uncategorized",
			});
			setEditingId(null);
		} catch (err) {
			console.error(err);
		}
	};

	const handleReset = async () => {
		await resetCustomCategories();
		setIsConfirmingReset(false);
		setShowResetMenu(false);
		setShowSuccess(true);
		setTimeout(() => setShowSuccess(false), 2000);
	};

	useEffect(() => {
		fetchCustomCategories();
	}, [fetchCustomCategories]);

	return (
		<div className="flex h-full w-full bg-[#121212] text-gray-300 overflow-hidden relative">
			{/* MOBILE SIDEBAR OVERLAY */}
			{isSidebarOpen && (
				<div
					className="fixed inset-0 bg-black/60 backdrop-blur-sm z-100 lg:hidden"
					onClick={() => setIsSidebarOpen(false)}
				/>
			)}

			{/* LEFT SIDEBAR (Desktop: static, Mobile: fixed drawer) */}
			<div
				className={`
                fixed inset-y-0 left-0 z-101 w-64 bg-[#0d0d0d] border-r border-white/5 flex flex-col transition-transform duration-300 lg:relative lg:translate-x-0
                ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
            `}
			>
				<div className="p-4 border-b border-white/5 flex items-center justify-between">
					<span className="font-black text-xs uppercase tracking-widest text-orange-500">
						Categories
					</span>
					<button
						onClick={() => setIsSidebarOpen(false)}
						className="lg:hidden p-1"
					>
						<X size={20} />
					</button>
				</div>

				<div className="p-4 border-b border-white/5">
					<div className="flex flex-col rounded-lg border border-white/10 overflow-hidden text-sm font-medium">
						{(["Expense", "Income", "Transfer"] as TransactionType[]).map(
							(type) => (
								<button
									key={type}
									onClick={() => {
										setTransactionType(type);
										setActivePrimary("All");
										if (window.innerWidth < 1024) setIsSidebarOpen(false);
									}}
									className={`py-2.5 text-center transition-colors border-b border-white/5 last:border-b-0 ${transactionType === type ? "bg-orange-600/10 text-orange-500 font-bold" : "hover:bg-white/5 text-gray-400"}`}
								>
									{type}
								</button>
							),
						)}
					</div>
				</div>

				<div className="flex-1 overflow-y-auto scrollbar-hide py-4">
					<h3 className="px-4 text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] mb-2">
						Primary Categories
					</h3>
					<nav className="space-y-0.5">
						<button
							onClick={() => {
								setActivePrimary("All");
								setIsSidebarOpen(false);
							}}
							className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-all border-l-2 ${isShowingAll ? "border-orange-500 text-white bg-white/5 font-bold" : "border-transparent text-gray-400 hover:text-gray-200 hover:bg-white/5 font-medium"}`}
						>
							<LayoutGrid
								size={16}
								className={isShowingAll ? "text-orange-500" : "text-gray-500"}
							/>
							<span className="truncate">All Categories</span>
						</button>

						{primaryCategories.map((cat) => (
							<button
								key={cat.name}
								onClick={() => {
									setActivePrimary(cat.name);
									setIsSidebarOpen(false);
								}}
								className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-all border-l-2 ${activePrimary === cat.name ? "border-orange-500 text-white bg-white/5 font-bold" : "border-transparent text-gray-400 hover:text-gray-200 hover:bg-white/5 font-medium"}`}
							>
								<CategoryIcon
									name={cat.icon || cat.name}
									size={16}
									colorClass={
										activePrimary === cat.name
											? cat.theme.text
											: "text-gray-500"
									}
								/>
								<span className="truncate">{cat.name}</span>
							</button>
						))}
					</nav>
				</div>
			</div>

			{/* RIGHT CONTENT */}
			<div className="flex-1 flex flex-col h-full overflow-hidden w-full">
				{/* Header */}
				<div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-6 border-b border-white/5 bg-[#121212] gap-4">
					<div className="flex items-center justify-between sm:justify-start gap-4">
						<button
							onClick={() => setIsSidebarOpen(true)}
							className="lg:hidden p-2 bg-white/5 rounded-lg border border-white/10"
						>
							<Menu size={20} />
						</button>

						<div className="flex items-center gap-3">
							<div
								className={`hidden xs:flex p-2 rounded-xl ${isShowingAll ? "bg-orange-500/10 border-orange-500/20" : "bg-white/5 border-white/10"} border`}
							>
								{isShowingAll ? (
									<LayoutGrid size={20} className="text-orange-500" />
								) : (
									<CategoryIcon
										name={activeCategory?.icon || activePrimary}
										size={20}
										colorClass={activeCategory?.theme?.text}
									/>
								)}
							</div>
							<h1 className="text-lg sm:text-xl font-bold text-white tracking-tight truncate max-w-37.5 sm:max-w-none">
								{isShowingAll ? "All" : activePrimary}
							</h1>
						</div>

						<div className="hidden sm:block h-6 w-px bg-white/10 mx-2" />

						<button
							onClick={() => setIsAddModalOpen(true)}
							className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-orange-600/10"
						>
							<Plus size={14} strokeWidth={3} />
							<span className="hidden xs:inline">
								{isShowingAll ? "Add Category" : "Sub-Category"}
							</span>
							<span className="xs:hidden">Add</span>
						</button>
					</div>

					<div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4">
						<div className="flex flex-col items-end pr-2 border-r border-white/5">
							<span className="text-[7px] sm:text-[8px] font-black uppercase text-gray-600 tracking-[0.2em]">
								Sync
							</span>
							<span className="text-[9px] sm:text-[10px] font-bold text-orange-500/80 tabular-nums">
								{lastSynced.toLocaleTimeString([], {
									hour: "2-digit",
									minute: "2-digit",
								})}
							</span>
						</div>

						<div className="flex items-center gap-1 sm:gap-2">
							<button
								onClick={handleRefresh}
								disabled={isRefreshing}
								className="p-2 text-gray-500 hover:text-white bg-white/2 sm:bg-transparent rounded-xl border border-transparent hover:border-white/10 disabled:opacity-30"
							>
								<RotateCcw
									size={16}
									className={isRefreshing ? "animate-spin text-orange-500" : ""}
								/>
							</button>

							<div className="relative">
								<button
									disabled={showSuccess}
									onClick={() => {
										setShowResetMenu(!showResetMenu);
										setIsConfirmingReset(false);
									}}
									className={`p-2 rounded-xl transition-all border border-transparent ${showSuccess ? "text-green-500 bg-green-500/10 border-green-500/20" : "text-gray-500 hover:text-white bg-white/2 sm:bg-transparent hover:bg-white/5 hover:border-white/10"}`}
								>
									{showSuccess ? (
										<Check size={18} />
									) : (
										<MoreVertical size={18} />
									)}
								</button>
								{showResetMenu && (
									<>
										<div
											className="fixed inset-0 z-110"
											onClick={() => setShowResetMenu(false)}
										/>
										<div className="absolute right-0 mt-2 w-48 sm:w-56 bg-[#0d0d0d] border border-white/10 rounded-xl shadow-2xl z-111 overflow-hidden animate-in fade-in zoom-in-95">
											{isConfirmingReset ? (
												<div className="p-2 space-y-1">
													<p className="px-3 py-2 text-[10px] font-black uppercase text-red-500/60 tracking-tighter">
														Are you sure?
													</p>
													<button
														onClick={handleReset}
														className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs bg-red-500 text-white rounded-lg font-black uppercase tracking-tighter"
													>
														<Trash2 size={14} /> Wipe All
													</button>
													<button
														onClick={() => {
															setIsConfirmingReset(false);
															setShowResetMenu(false);
														}}
														className="w-full py-2 text-[10px] font-bold text-gray-500"
													>
														Cancel
													</button>
												</div>
											) : (
												<button
													disabled={!hasCustomCategories}
													onClick={(e) => {
														e.stopPropagation();
														setIsConfirmingReset(true);
													}}
													className="w-full flex items-center gap-2 px-2 py-2 text-sm font-bold disabled:opacity-30 text-red-500 hover:bg-red-500/10"
												>
													<RotateCcw size={16} /> Reset Custom Categories
												</button>
											)}
										</div>
									</>
								)}
							</div>
						</div>
					</div>
				</div>

				{/* Table Content */}
				<div className="flex-1 overflow-y-auto p-3 sm:p-6 scrollbar-hide">
					{/* Header Row */}
					<div className="flex items-center justify-between px-2 sm:px-4 pb-4 border-b border-white/5 text-[9px] sm:text-[11px] font-bold text-cyan-500/80 uppercase tracking-[0.2em] mb-2">
						<span>Category</span>
						<span className="pr-4 sm:pr-12">Action</span>
					</div>

					<div className="space-y-1">
						{displayList.map((cat) => {
							const isRowDuplicate = allUnifiedCategories.some(
								(existing) =>
									editingId === cat.id &&
									existing.name.toLowerCase() ===
										tempName.trim().toLowerCase() &&
									existing.id !== cat.id,
							);

							return (
								<div
									key={`row-${cat.isCustom ? cat.id : cat.name}-${cat.parentName || "primary"}`}
									onClick={() =>
										activePrimary === "All" &&
										editingId !== cat.id &&
										setActivePrimary(cat.name)
									}
									className={`flex items-center justify-between p-3 sm:p-4 rounded-xl border border-transparent hover:border-white/5 hover:bg-white/2 group ${activePrimary === "All" && editingId !== cat.id ? "cursor-pointer" : "cursor-default"}`}
								>
									<div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
										<div className="p-1.5 sm:p-2 rounded-lg bg-[#0d0d0d] border border-white/5 shrink-0">
											<CategoryIcon
												name={cat.icon || cat.name}
												size={16}
												colorClass={cat.theme.text}
											/>
										</div>

										<div className="flex items-center gap-2 flex-1 min-w-0">
											{editingId === cat.id ? (
												<div className="flex flex-col flex-1 max-w-30 sm:max-w-50">
													<input
														autoFocus
														value={tempName}
														onChange={(e) => setTempName(e.target.value)}
														className={`bg-white/5 border rounded px-2 py-1 text-xs sm:text-sm text-white focus:outline-none w-full ${isRowDuplicate ? "border-red-500" : "border-orange-500/50"}`}
													/>
												</div>
											) : (
												<>
													<span className="text-xs sm:text-sm font-medium text-gray-200 truncate">
														{cat.name}
													</span>
													{cat.isCustom && (
														<span className="hidden xs:inline text-[8px] font-black bg-orange-500/10 text-orange-500 px-1 py-0.5 rounded border border-orange-500/20 uppercase">
															Custom
														</span>
													)}
												</>
											)}
										</div>
									</div>

									<div
										className={`flex items-center gap-1 sm:gap-2 transition-all duration-200 ${
											editingId === cat.id
												? "opacity-100"
												: "opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
										}`}
										// 1. THIS IS THE KEY: Stop any clicks in this area from hitting the parent row
										onClick={(e) => e.stopPropagation()}
									>
										{cat.isCustom ? (
											editingId === cat.id ? (
												<div className="flex items-center gap-1 animate-in fade-in zoom-in duration-200">
													<button
														disabled={isRowDuplicate || !tempName.trim()}
														onClick={(e) => {
															e.stopPropagation();
															handleSaveInline(cat);
														}}
														className="p-1.5 text-green-500 hover:bg-green-500/10 rounded-lg"
													>
														<Check size={16} />
													</button>
													<button
														onClick={(e) => {
															e.stopPropagation();
															setEditingId(null);
														}}
														className="p-1.5 text-gray-500 hover:text-gray-300"
													>
														<X size={16} />
													</button>
												</div>
											) : deletingCategory === cat.name ? (
												<div className="flex items-center gap-1 animate-in fade-in zoom-in duration-200">
													<button
														onClick={(e) => {
															e.stopPropagation();
															setDeletingCategory(null);
														}}
														className="px-2 py-1 text-[10px] font-bold text-gray-500 hover:text-gray-300"
													>
														Cancel
													</button>
													<button
														onClick={async (e) => {
															e.stopPropagation(); // 2. Critical for the confirmation button
															if (cat.id) {
																await deleteCustomCategory(cat.id);
																setDeletingCategory(null);
															}
														}}
														className="px-3 py-1 bg-red-500 text-white text-[10px] font-black uppercase rounded-lg shadow-lg shadow-red-500/20 active:scale-95 transition-all"
													>
														Confirm
													</button>
												</div>
											) : (
												<>
													<button
														onClick={(e) => {
															e.stopPropagation();
															setEditingId(cat.id || null);
															setTempName(cat.name);
														}}
														className="p-2 text-gray-500 hover:text-orange-500 hover:bg-orange-500/10 rounded-lg"
													>
														<Edit3 size={16} />
													</button>
													<button
														onClick={(e) => {
															e.stopPropagation();
															setDeletingCategory(cat.name);
														}}
														className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg"
													>
														<Trash2 size={16} />
													</button>
												</>
											)
										) : (
											<span className="text-[7px] sm:text-[9px] font-black text-gray-600 uppercase tracking-widest pr-1">
												System Default
											</span>
										)}
									</div>
								</div>
							);
						})}
					</div>
				</div>
			</div>

			<AddCategoryModal
				isOpen={isAddModalOpen}
				onClose={() => setIsAddModalOpen(false)}
				parentCategory={isShowingAll ? undefined : activePrimary}
			/>
		</div>
	);
}
