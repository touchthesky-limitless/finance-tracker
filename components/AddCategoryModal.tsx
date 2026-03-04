"use client";

import { useState, useMemo, useCallback } from "react";
import { X, Check, Loader2 } from "lucide-react";
import { CategoryIcon } from "@/components/CategoryIcon";
import { CATEGORY_COLORS } from "@/constants";
import { useBudgetStore } from "@/store/useBudgetStore";
import { useUnifiedCategories } from "@/hooks/useUnifiedCategories";
import { AVAILABLE_ICONS } from "@/constants/icons";

interface AddCategoryModalProps {
	isOpen: boolean;
	onClose: () => void;
	parentCategory?: string;
}

export function AddCategoryModal({
	isOpen,
	onClose,
	parentCategory,
}: AddCategoryModalProps) {
	// const iconOptions = useMemo(() => Object.keys(CATEGORY_HIERARCHY), []);
	const iconOptions = useMemo(() => AVAILABLE_ICONS, []);
	const colorOptions = useMemo(() => Object.keys(CATEGORY_COLORS), []);

	// --- State ---
	const [name, setName] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const addCustomCategory = useBudgetStore((state) => state.addCustomCategory);
	const { allUnifiedCategories } = useUnifiedCategories("Expense", "All");

	// Find the parent category's metadata
	const parentData = useMemo(() => {
		return allUnifiedCategories.find((cat) => cat.name === parentCategory);
	}, [allUnifiedCategories, parentCategory]);

	const [selectedIcon, setSelectedIcon] = useState(
		() => parentData?.icon || iconOptions[0] || "Banknote",
	);

	const [selectedColor, setSelectedColor] = useState(
		() => parentData?.theme?.colorKey || colorOptions[0] || "Gray",
	);

	// --- Derived Logic (Optimized with useMemo) ---
	const trimmedName = name.trim();
	const isSubCategory = !!parentCategory;

	const isDuplicate = useMemo(() => {
		if (!trimmedName) return false;
		return allUnifiedCategories.some(
			(cat) => cat.name.toLowerCase() === trimmedName.toLowerCase(),
		);
	}, [trimmedName, allUnifiedCategories]);

	const uiContent = useMemo(
		() => ({
			title: isSubCategory ? `Add Sub-Category` : "Add Primary Category",
			label: isSubCategory ? "Sub-Category Name" : "Primary Category Name",
			placeholder: isSubCategory
				? "e.g. Sushi, Gas, Rent..."
				: "e.g. Lifestyle, Work, Home...",
			button: isSubCategory ? "Add Sub-Category" : "Add Primary Category",
		}),
		[isSubCategory],
	);

	// --- Handlers ---
	const handleClose = useCallback(() => {
		setName("");
		setIsLoading(false);
		onClose();
	}, [onClose]);

	const handleAdd = async () => {
		if (!trimmedName || isDuplicate || isLoading) return;

		setIsLoading(true);
		try {
			await addCustomCategory({
				name: trimmedName,
				icon: selectedIcon,
				color: selectedColor,
				parent: parentCategory || undefined,
			});
			handleClose();
		} catch (error) {
			console.error("Failed to add category:", error);
			setIsLoading(false);
		}
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-110 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
			<div className="bg-[#0d0d0d] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
				{/* Header */}
				<div className="p-6 border-b border-white/5 flex justify-between items-center">
					<div>
						<h2 className="text-xl font-bold text-white">{uiContent.title}</h2>
						{isSubCategory && (
							<p className="text-xs text-gray-500 mt-1">
								Creating under{" "}
								<span className="text-orange-500 font-bold">
									{parentCategory}
								</span>
							</p>
						)}
					</div>
					<button
						onClick={handleClose}
						className="p-2 hover:bg-white/5 rounded-full text-gray-500 hover:text-white transition-colors"
					>
						<X size={20} />
					</button>
				</div>

				<div className="p-6 space-y-6">
					{/* Category Name Input */}
					<div className="space-y-2">
						<label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
							{uiContent.label}
						</label>
						<input
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder={uiContent.placeholder}
							disabled={isLoading}
							className={`w-full bg-black border rounded-xl px-4 py-3 text-white outline-none transition-all placeholder:text-gray-700 ${
								isDuplicate
									? "border-red-500 focus:border-red-500"
									: "border-white/10 focus:border-orange-500/50"
							}`}
							autoFocus
						/>
						{trimmedName && isDuplicate && (
							<p className="text-[10px] text-red-500 mt-1 font-bold uppercase tracking-wider animate-in shake">
								Duplicate Category Name
							</p>
						)}
					</div>

					<div className="grid grid-cols-2 gap-4">
						{/* Icon Selection */}
						<div className="space-y-2">
							<label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
								Visual Icon
							</label>
							<div className="bg-black border border-white/10 rounded-xl p-4 h-48 overflow-y-auto scrollbar-hide grid grid-cols-4 gap-3">
								{iconOptions.map((icon) => (
									<button
										key={icon}
										type="button"
										onClick={() => setSelectedIcon(icon)}
										className={`p-2 rounded-lg flex items-center justify-center transition-all ${
											selectedIcon === icon
												? "bg-orange-600/20 border border-orange-500/50 shadow-[0_0_15px_rgba(234,88,12,0.1)]"
												: "hover:bg-white/5 border border-transparent"
										}`}
									>
										<CategoryIcon
											name={icon}
											size={18}
											colorClass={
												selectedIcon === icon
													? "text-orange-500"
													: "text-gray-400"
											}
										/>
									</button>
								))}
							</div>
						</div>

						{/* Color Selection */}
						<div className="space-y-2">
							<label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
								Theme Color
							</label>
							<div className="bg-black border border-white/10 rounded-xl p-4 h-48 overflow-y-auto scrollbar-hide space-y-2">
								{colorOptions.map((colorKey) => (
									<button
										key={colorKey}
										type="button"
										onClick={() => setSelectedColor(colorKey)}
										className={`w-full flex items-center gap-3 p-2 rounded-lg transition-all ${
											selectedColor === colorKey
												? "bg-white/10"
												: "hover:bg-white/5"
										}`}
									>
										<div
											className={`w-3 h-3 rounded-full ${CATEGORY_COLORS[colorKey].bg}`}
										/>
										<span className="text-[11px] text-gray-400 font-medium">
											{colorKey}
										</span>
										{selectedColor === colorKey && (
											<Check size={12} className="ml-auto text-orange-500" />
										)}
									</button>
								))}
							</div>
						</div>
					</div>
				</div>

				{/* Footer Actions */}
				<div className="p-6 bg-white/2 border-t border-white/5 flex justify-end gap-3">
					<button
						onClick={handleClose}
						disabled={isLoading}
						className="px-6 py-2 text-sm font-bold text-gray-500 hover:text-white transition-colors disabled:opacity-50"
					>
						Cancel
					</button>
					<button
						onClick={handleAdd}
						disabled={!trimmedName || isDuplicate || isLoading}
						className="flex items-center gap-2 px-8 py-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-black rounded-xl transition-all shadow-lg shadow-orange-600/20 active:scale-95"
					>
						{isLoading && <Loader2 size={14} className="animate-spin" />}
						{uiContent.button}
					</button>
				</div>
			</div>
		</div>
	);
}
