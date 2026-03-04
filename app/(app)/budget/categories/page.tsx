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
	const [isError, setIsError] = useState(false);
	const [isConfirmingReset, setIsConfirmingReset] = useState(false);
	const [showResetMenu, setShowResetMenu] = useState(false);
	const [showSuccess, setShowSuccess] = useState(false);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [lastSynced, setLastSynced] = useState<Date>(new Date());

	// --- Store with Shallow Selector for Performance ---
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

	// --- Actions ---
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
			setIsError(true);
			setTimeout(() => setIsError(false), 2000);
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
			console.error("Update failed", err);
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
		<div className="flex h-full w-full bg-[#121212] text-gray-300">
			{/* LEFT SIDEBAR */}
			<div className="w-64 border-r border-white/5 flex flex-col shrink-0 bg-[#0d0d0d]">
				<div className="p-4 border-b border-white/5">
					<div className="flex flex-col rounded-lg border border-white/10 overflow-hidden text-sm font-medium">
						{(["Expense", "Income", "Transfer"] as TransactionType[]).map(
							(type) => (
								<button
									key={type}
									onClick={() => {
										setTransactionType(type);
										setActivePrimary("All");
									}}
									className={`py-2.5 text-center transition-colors border-b border-white/5 last:border-b-0 ${
										transactionType === type
											? "bg-orange-600/10 text-orange-500 font-bold"
											: "hover:bg-white/5 text-gray-400"
									}`}
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
							onClick={() => setActivePrimary("All")}
							className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-all border-l-2 ${
								isShowingAll
									? "border-orange-500 text-white bg-white/5 font-bold"
									: "border-transparent text-gray-400 hover:text-gray-200 hover:bg-white/5 font-medium"
							}`}
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
								onClick={() => setActivePrimary(cat.name)}
								className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-all border-l-2 ${
									activePrimary === cat.name
										? "border-orange-500 text-white bg-white/5 font-bold"
										: "border-transparent text-gray-400 hover:text-gray-200 hover:bg-white/5 font-medium"
								}`}
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
			<div className="flex-1 flex flex-col h-full overflow-hidden">
				<div className="flex items-center justify-between p-6 border-b border-white/5">
					<div className="flex items-center gap-4">
						<div className="flex items-center gap-3">
							<div
								className={`p-2 rounded-xl ${isShowingAll ? "bg-orange-500/10 border-orange-500/20" : "bg-white/5 border-white/10"} border`}
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
							<h1 className="text-xl font-bold text-white tracking-tight">
								{isShowingAll ? "All Categories" : activePrimary}
							</h1>
						</div>

						<div className="h-6 w-px bg-white/10 mx-2" />

						<button
							onClick={() => setIsAddModalOpen(true)}
							className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-orange-600/10 active:scale-95"
						>
							<Plus size={16} strokeWidth={3} />
							{isShowingAll ? "Add Category" : "Sub-Category"}
						</button>
					</div>

					<div className="flex items-center gap-4">
						<div className="flex flex-col items-end pr-2 border-r border-white/5">
							<span className="text-[8px] font-black uppercase text-gray-600 tracking-[0.2em] mb-0.5">
								Database Sync
							</span>
							<span className="text-[10px] font-bold text-orange-500/80 tabular-nums">
								{lastSynced.toLocaleTimeString([], { hour12: true })}
							</span>
						</div>

						<button
							onClick={handleRefresh}
							disabled={isRefreshing}
							className="p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-xl border border-transparent hover:border-white/10 transition-all active:scale-90 disabled:opacity-30"
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
								className={`p-2 rounded-xl transition-all duration-300 border border-transparent ${
									showSuccess
										? "text-green-500 bg-green-500/10 border-green-500/20 scale-110"
										: "text-gray-500 hover:text-white hover:bg-white/5 hover:border-white/10"
								}`}
							>
								{showSuccess ? <Check size={18} /> : <MoreVertical size={18} />}
							</button>

							{showResetMenu && (
								<>
									<div
										className="fixed inset-0 z-10"
										onClick={() => {
											setShowResetMenu(false);
											setIsConfirmingReset(false);
										}}
									/>
									<div className="absolute right-0 mt-2 w-56 bg-[#0d0d0d] border border-white/10 rounded-xl shadow-2xl z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
										{isConfirmingReset ? (
											<div className="p-2 space-y-1 animate-in slide-in-from-right-2 duration-200">
												<p className="px-3 py-2 text-[10px] font-black uppercase text-red-500/60 tracking-tighter">
													Are you absolutely sure?
												</p>
												<button
													onClick={handleReset}
													className="w-full flex items-center gap-2 px-3 py-2 text-sm bg-red-500 text-white rounded-lg font-black uppercase tracking-tighter shadow-lg shadow-red-500/20 active:scale-95 transition-all"
												>
													<Trash2 size={14} /> Yes, Delete All
												</button>
												<button
													onClick={() => {
														setIsConfirmingReset(false);
														setShowResetMenu(false);
													}}
													className="w-full text-center py-2 text-[10px] font-bold text-gray-500 hover:text-gray-300 transition-colors"
												>
													Nevermind, Cancel
												</button>
											</div>
										) : (
											<button
												disabled={!hasCustomCategories}
												onClick={(e) => {
													e.stopPropagation();
													setIsConfirmingReset(true);
												}}
												className="w-full flex items-center gap-2 px-4 py-3 text-sm transition-colors font-bold disabled:opacity-30 disabled:cursor-not-allowed text-red-500 hover:bg-red-500/10"
											>
												<RotateCcw size={16} /> Reset Categories
												{!hasCustomCategories && (
													<span className="ml-auto text-[9px] text-gray-600 uppercase">
														Empty
													</span>
												)}
											</button>
										)}
									</div>
								</>
							)}
						</div>
					</div>
				</div>

				<div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
					<div className="flex items-center justify-between px-4 pb-4 border-b border-white/5 text-[11px] font-bold text-cyan-500/80 uppercase tracking-[0.2em] mb-2">
						<span>Category Name</span>
						<span className="pr-12">Operation</span>
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
									className={`flex items-center justify-between p-4 rounded-xl border border-transparent hover:border-white/5 hover:bg-white/2 transition-all group ${activePrimary === "All" && editingId !== cat.id ? "cursor-pointer" : "cursor-default"}`}
								>
									<div className="flex items-center gap-3 flex-1">
										<div className="p-2 rounded-lg bg-[#0d0d0d] border border-white/5">
											<CategoryIcon
												name={cat.icon || cat.name}
												size={18}
												colorClass={cat.theme.text}
											/>
										</div>

										<div className="flex items-center gap-2 flex-1">
											{editingId === cat.id ? (
												<div className="flex flex-col flex-1 max-w-50">
													<input
														autoFocus
														value={tempName}
														onChange={(e) => {
															setTempName(e.target.value);
															if (isError) setIsError(false);
														}}
														onKeyDown={(e) => {
															if (e.key === "Enter" && !isRowDuplicate)
																handleSaveInline(cat);
															if (e.key === "Escape") setEditingId(null);
														}}
														className={`bg-white/5 border rounded px-2 py-1 text-sm text-white focus:outline-none w-full transition-colors ${
															isError || isRowDuplicate
																? "border-red-500 animate-shake"
																: "border-orange-500/50"
														}`}
													/>
													{isRowDuplicate && (
														<span className="text-[10px] text-red-500 font-bold uppercase mt-1 animate-in fade-in slide-in-from-top-1">
															Duplicate Category
														</span>
													)}
												</div>
											) : (
												<>
													<span className="text-sm font-medium text-gray-200">
														{cat.name}
													</span>
													{cat.isCustom && (
														<span className="text-[9px] font-black bg-orange-500/10 text-orange-500 px-1.5 py-0.5 rounded border border-orange-500/20 uppercase">
															Custom
														</span>
													)}
												</>
											)}
										</div>
									</div>

									<div
										className={`flex items-center gap-2 transition-all duration-200 ${editingId === cat.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
										onClick={(e) => e.stopPropagation()}
									>
										{cat.isCustom ? (
											editingId === cat.id ? (
												<div className="flex items-center gap-1 animate-in fade-in zoom-in duration-200">
													<button
														disabled={isRowDuplicate || !tempName.trim()}
														onClick={() => handleSaveInline(cat)}
														className="p-1.5 text-green-500 hover:bg-green-500/10 rounded-lg transition-all disabled:opacity-20"
													>
														<Check size={16} />
													</button>
													<button
														onClick={() => {
															setEditingId(null);
															setIsError(false);
														}}
														className="p-1.5 text-gray-500 hover:text-gray-300 transition-colors"
													>
														<X size={16} />
													</button>
												</div>
											) : deletingCategory === cat.name ? (
												<div className="flex items-center gap-1 animate-in fade-in zoom-in duration-200">
													<button
														onClick={() => setDeletingCategory(null)}
														className="px-2 py-1 text-[10px] font-bold text-gray-500 hover:text-gray-300"
													>
														Cancel
													</button>
													<button
														onClick={async () => {
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
														className="p-2 text-gray-500 hover:text-orange-500 hover:bg-orange-500/10 rounded-lg transition-all"
														title="Edit Name"
													>
														<Edit3 size={16} />
													</button>
													<button
														onClick={() => setDeletingCategory(cat.name)}
														className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
														title="Delete"
													>
														<Trash2 size={16} />
													</button>
												</>
											)
										) : (
											<span className="text-[9px] font-black text-gray-600 uppercase tracking-[0.2em] pr-2">
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
				key={isAddModalOpen ? `open-${activePrimary}` : "closed"}
				isOpen={isAddModalOpen}
				onClose={() => setIsAddModalOpen(false)}
				parentCategory={isShowingAll ? undefined : activePrimary}
			/>
		</div>
	);
}
