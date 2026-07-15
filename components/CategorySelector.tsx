import { useState, useMemo, memo, useDeferredValue, useRef } from "react";
import {
	ChevronRight,
	Search,
	Check,
	X,
	ChevronDown,
	LayoutGrid,
} from "lucide-react";
import {
	CATEGORY_HIERARCHY,
	getCategoryTheme,
	searchCategories,
	UnifiedCategory,
} from "@/constants";
import {
	useFloating,
	offset,
	flip,
	shift,
	autoUpdate,
	useClick,
	useDismiss,
	useInteractions,
	FloatingPortal,
	size,
} from "@floating-ui/react";
import { CategoryIcon } from "@/components/CategoryIcon";
import { useUnifiedCategories } from "@/hooks/useUnifiedCategories";

interface CategorySelectorProps {
	currentCategory: string;
	onSelect: (category: string, parent: string) => void;
	variant?: "form" | "filter";
}

interface ParentTabProps {
	parent: string;
	isActive: boolean;
	onClick: (parent: string) => void;
}

interface SubCategoryRowProps {
	category: UnifiedCategory;
	parent: string;
	isSelected: boolean;
	onSelect: (sub: string, parent: string) => void;
}

// Optimized Left Pane Item
const ParentTab = memo(({ parent, isActive, onClick }: ParentTabProps) => {
	return (
		<button
			type="button"
			onClick={() => {
				onClick(parent);
			}}
			className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-[11px] mb-1 transition-all ${
				isActive
					? "bg-orange-600/10 text-orange-500 font-bold border border-orange-500/20 shadow-sm"
					: "text-gray-300 hover:text-gray-900 dark:hover:text-gray-200 border border-transparent"
			}`}
		>
			<CategoryIcon
				name={parent}
				size={16}
				colorClass={getCategoryTheme(parent).text}
			/>
			<span className="truncate">{parent}</span>
		</button>
	);
});
ParentTab.displayName = "ParentTab";

// Optimized Right Pane Item
const SubCategoryRow = memo(
	({ category, parent, isSelected, onSelect }: SubCategoryRowProps) => {
		return (
			<button
				type="button"
				onClick={() => {
					onSelect(category.name, parent);
				}}
				className="w-full text-left px-4 py-3.5 mb-1 rounded-xl flex items-center justify-between transition-colors group hover:bg-gray-100 dark:hover:bg-white/5"
			>
				<div className="flex items-center gap-3 min-w-0">
					<CategoryIcon
						name={category.icon || category.name}
						size={16}
						colorClass={getCategoryTheme(parent).text}
					/>
					<span
						className={`text-sm truncate ${
							isSelected
								? "text-orange-500 font-bold"
								: "text-gray-700 dark:text-gray-300 font-medium"
						}`}
					>
						{category.name}
					</span>
					{category.isCustom && (
						<span className="text-[9px] bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400 px-1.5 py-0.5 rounded uppercase font-black shrink-0">
							Custom
						</span>
					)}
				</div>
				{isSelected && (
					<Check size={16} className="text-orange-500 shrink-0 ml-2" />
				)}
			</button>
		);
	},
);
SubCategoryRow.displayName = "SubCategoryRow";

export function CategorySelector({
	currentCategory,
	onSelect,
	variant,
}: CategorySelectorProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [catQuery, setCatQuery] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);

	const { allUnifiedCategories } = useUnifiedCategories("Expense", "All");
	const deferredQuery = useDeferredValue(catQuery);

	const [selectedParent, setSelectedParent] = useState<string>(() => {
		const found = Object.keys(CATEGORY_HIERARCHY).find((parent) => {
			return (
				CATEGORY_HIERARCHY[parent].includes(currentCategory) ||
				currentCategory.startsWith(parent)
			);
		});
		return found || "Food & drink";
	});

	const selectedCategoryData = useMemo(() => {
		return allUnifiedCategories.find((cat) => {
			return cat.name === currentCategory;
		});
	}, [allUnifiedCategories, currentCategory]);

	const displayIcon = selectedCategoryData?.icon || currentCategory;
	const displayColorClass =
		selectedCategoryData?.theme?.text || "text-gray-400";

	const dynamicHierarchy = useMemo(() => {
		const base: Record<string, UnifiedCategory[]> = {};

		Object.keys(CATEGORY_HIERARCHY).forEach((parent) => {
			base[parent] = CATEGORY_HIERARCHY[parent].map((subName) => {
				const foundCat = allUnifiedCategories.find((c) => {
					return c.name === subName;
				});

				if (foundCat) {
					return foundCat;
				}

				return {
					name: subName,
					icon: subName,
					theme: getCategoryTheme(parent),
					isCustom: false,
				} as UnifiedCategory;
			});
		});

		allUnifiedCategories.forEach((cat) => {
			if (!cat.isCustom) {
				return;
			}

			if (cat.parentName && base[cat.parentName]) {
				const exists = base[cat.parentName].some((c) => {
					return c.name === cat.name;
				});
				if (!exists) {
					base[cat.parentName].push(cat);
				}
			} else if (!cat.parentName) {
				if (!base[cat.name]) {
					base[cat.name] = [];
				}
			}
		});

		return base;
	}, [allUnifiedCategories]);

	const visibleParents = useMemo(() => {
		const query = deferredQuery.toLowerCase().trim();
		const parents = Object.keys(dynamicHierarchy);

		if (!query) {
			return parents;
		}

		return parents.filter((parent) => {
			const matchesParent = parent.toLowerCase().includes(query);
			const matchesChild = dynamicHierarchy[parent].some((cat) => {
				return cat.name.toLowerCase().includes(query);
			});
			return matchesParent || matchesChild;
		});
	}, [deferredQuery, dynamicHierarchy]);

	const activeParent = useMemo(() => {
		const query = deferredQuery.toLowerCase().trim();
		if (!query) {
			return selectedParent;
		}

		const matchesParent = selectedParent.toLowerCase().includes(query);
		const matchesChild = CATEGORY_HIERARCHY[selectedParent]?.some((s) => {
			return s.toLowerCase().includes(query);
		});

		if (matchesParent || matchesChild) {
			return selectedParent;
		}

		if (visibleParents.length > 0) {
			return visibleParents[0];
		}

		return selectedParent;
	}, [deferredQuery, visibleParents, selectedParent]);

	const {
		refs: { setReference, setFloating },
		floatingStyles,
		context,
	} = useFloating({
		open: isOpen,
		onOpenChange: setIsOpen,
		whileElementsMounted: (reference, floating, update) => {
			return autoUpdate(reference, floating, update, {
				animationFrame: false,
				elementResize: true,
			});
		},
		middleware: [
			offset(8),
			flip(),
			shift({ padding: 16 }),
			size({
				apply({ rects, elements }) {
					Object.assign(elements.floating.style, {
						minWidth: `${Math.max(rects.reference.width, 360)}px`,
						maxWidth: "90vw",
					});
				},
			}),
		],
	});

	const dismiss = useDismiss(context, {
		outsidePress: true,
		escapeKey: true,
	});

	const { getReferenceProps, getFloatingProps } = useInteractions([
		useClick(context),
		dismiss,
	]);

	const bestMatch = useMemo(() => {
		return searchCategories(catQuery);
	}, [catQuery]);

	return (
		<div className="relative">
			{variant === "form" && (
				<label className="text-[10px] uppercase tracking-[0.2em] text-gray-300 font-black mb-1.5 block pl-1">
					Category
				</label>
			)}

			<button
				ref={setReference}
				{...getReferenceProps()}
				type="button"
				onClick={() => {
					setIsOpen(!isOpen);
				}}
				className={
					variant === "filter"
						? "flex items-center gap-1.5 text-xs font-black text-gray-400 uppercase tracking-widest hover:text-orange-500 transition-colors px-2 py-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
						: `w-full p-4 bg-[#F8F9FB] dark:bg-[#0d0d0d] border border-gray-200 dark:border-white/5 rounded-2xl flex items-center justify-between transition-all hover:border-gray-300 dark:hover:border-white/10 shadow-sm`
				}
			>
				<div className="flex items-center gap-3">
					{variant === "filter" ? (
						<span>{currentCategory || "Category"}</span>
					) : (
						<>
							<div className="p-1.5 bg-white dark:bg-[#1a1a1a] rounded-xl shadow-sm border border-gray-100 dark:border-white/5">
								<CategoryIcon
									name={displayIcon}
									size={18}
									colorClass={displayColorClass}
								/>
							</div>
							<span className="text-sm text-gray-900 dark:text-white font-bold">
								{currentCategory}
							</span>
						</>
					)}
				</div>
				<ChevronDown
					size={variant === "filter" ? 14 : 20}
					className={`transition-transform duration-300 shrink-0 ${
						isOpen ? "rotate-180 text-orange-500" : "text-gray-400"
					}`}
				/>
			</button>

			{isOpen && (
				<FloatingPortal>
					<div
						ref={setFloating}
						style={floatingStyles}
						{...getFloatingProps()}
						className="z-[200] bg-white dark:bg-[#121212] shadow-[0_10px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.5)] rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden flex flex-col"
					>
						<div className="p-4 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-[#0a0a0a]/50">
							<div className="flex items-center gap-3 bg-white dark:bg-[#1a1a1a] px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/20 transition-all shadow-sm">
								<Search size={16} className="text-gray-400" />
								<input
									autoFocus
									ref={inputRef}
									placeholder="Search categories..."
									className="bg-transparent text-sm text-gray-900 dark:text-white outline-none w-full placeholder:text-gray-400"
									value={catQuery}
									onChange={(e) => {
										setCatQuery(e.target.value);
									}}
								/>
								{catQuery && (
									<button
										type="button"
										onClick={() => {
											setCatQuery("");
											inputRef.current?.focus();
										}}
										className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-gray-900 dark:hover:text-white"
									>
										<X size={16} />
									</button>
								)}
							</div>
							{bestMatch && catQuery && (
								<div className="mt-3 px-2 text-xs text-gray-300 font-medium flex items-center gap-1.5">
									<span>Best match:</span>
									<span className="text-orange-500 font-bold bg-orange-50 dark:bg-orange-500/10 px-2 py-0.5 rounded-md">
										{bestMatch}
									</span>
								</div>
							)}
						</div>

						<div
							className={`h-96 flex transition-opacity duration-200 ${
								catQuery !== deferredQuery ? "opacity-50" : "opacity-100"
							}`}
						>
							<div className="w-2/5 flex flex-col border-r border-gray-100 dark:border-white/5 bg-white dark:bg-[#121212]">
								<div className="p-3 border-b border-gray-100 dark:border-white/5 shrink-0">
									<button
										type="button"
										onClick={() => {
											onSelect("All", "All");
											setIsOpen(false);
										}}
										className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-[11px] transition-all ${
											currentCategory === "All"
												? "bg-orange-600 text-white font-bold shadow-md shadow-orange-600/20"
												: "text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-200 dark:border-white/5"
										}`}
									>
										<LayoutGrid
											size={16}
											className={
												currentCategory === "All"
													? "text-white"
													: "text-gray-300"
											}
										/>
										<span className="uppercase tracking-wider">
											All Categories
										</span>
									</button>
								</div>

								<div
									className="flex-1 overflow-y-auto p-3 scrollbar-hide"
									style={{ scrollbarWidth: "none" }}
								>
									{visibleParents.map((parent) => {
										return (
											<ParentTab
												key={parent}
												parent={parent}
												isActive={activeParent === parent}
												onClick={setSelectedParent}
											/>
										);
									})}
								</div>
							</div>

							<div
								className="w-3/5 bg-gray-50 dark:bg-[#0a0a0a] overflow-y-auto p-3 scrollbar-hide"
								style={{ scrollbarWidth: "none" }}
							>
								{(dynamicHierarchy[activeParent] || [])
									.filter((cat) => {
										if (!catQuery) {
											return true;
										}
										return cat.name
											.toLowerCase()
											.includes(catQuery.toLowerCase());
									})
									.map((cat) => {
										return (
											<SubCategoryRow
												key={cat.id || cat.name}
												category={cat}
												parent={activeParent}
												isSelected={currentCategory === cat.name}
												onSelect={(s, p) => {
													onSelect(s, p);
													setIsOpen(false);
													setCatQuery("");
												}}
											/>
										);
									})}
							</div>
						</div>
					</div>
				</FloatingPortal>
			)}
		</div>
	);
}
