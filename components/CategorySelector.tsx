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
	sub: string;
	parent: string;
	isSelected: boolean;
	onSelect: (sub: string, parent: string) => void;
}

// Optimized Left Pane Item
const ParentTab = memo(({ parent, isActive, onClick }: ParentTabProps) => (
	<button
		type="button"
		onClick={() => onClick(parent)}
		className={`w-full flex items-center gap-2 p-2.5 rounded-lg text-[11px] mb-1 transition-all ${
			isActive
				? "bg-orange-600/10 text-orange-500 font-bold border border-orange-500/20"
				: "text-gray-500 hover:text-gray-300"
		}`}
	>
		<CategoryIcon
			name={parent}
			size={14}
			colorClass={getCategoryTheme(parent).text}
		/>
		<span className="truncate">{parent}</span>
	</button>
));
ParentTab.displayName = "ParentTab";

// Optimized Right Pane Item
const SubCategoryRow = memo(
	({ sub, parent, isSelected, onSelect }: SubCategoryRowProps) => (
		<button
			type="button"
			onClick={() => onSelect(sub, parent)}
			className="w-full text-left px-4 py-3 rounded-lg flex items-center justify-between transition-colors group"
		>
			<div className="flex items-center gap-3">
				<CategoryIcon
					name={sub}
					size={14}
					colorClass={getCategoryTheme(parent).text}
				/>
				<span
					className={`text-xs ${isSelected ? "text-orange-400 font-bold" : "text-gray-400"}`}
				>
					{sub}
				</span>
			</div>
			{isSelected && <Check size={14} className="text-orange-500" />}
		</button>
	),
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

	// This creates a "low-priority" version of the query
	const deferredQuery = useDeferredValue(catQuery);

	// Initialize selectedParent based on current category
	const [selectedParent, setSelectedParent] = useState<string>(() => {
		const found = Object.keys(CATEGORY_HIERARCHY).find(
			(parent) =>
				CATEGORY_HIERARCHY[parent].includes(currentCategory) ||
				currentCategory.startsWith(parent),
		);
		return found || "Food & drink";
	});

	// Filtering Logic
	const visibleParents = useMemo(() => {
		const query = deferredQuery.toLowerCase().trim(); // Changed from catQuery
		if (!query) return Object.keys(CATEGORY_HIERARCHY);
		return Object.keys(CATEGORY_HIERARCHY).filter(
			(parent) =>
				parent.toLowerCase().includes(query) ||
				CATEGORY_HIERARCHY[parent].some((sub) =>
					sub.toLowerCase().includes(query),
				),
		);
	}, [deferredQuery]); // Dependency changed

	// Derived Active Parent (The Auto-Snap Fix)
	const activeParent = useMemo(() => {
		const query = deferredQuery.toLowerCase().trim(); // Changed from catQuery
		if (!query) return selectedParent;

		const currentHasMatch =
			selectedParent.toLowerCase().includes(query) ||
			CATEGORY_HIERARCHY[selectedParent]?.some((s) =>
				s.toLowerCase().includes(query),
			);

		if (currentHasMatch) return selectedParent;

		return visibleParents.length > 0 ? visibleParents[0] : selectedParent;
	}, [deferredQuery, visibleParents, selectedParent]); // Dependency changed

	// Helper to find the parent name
	const findParent = (name: string) => {
		return (
			Object.keys(CATEGORY_HIERARCHY).find(
				(parent) =>
					CATEGORY_HIERARCHY[parent].includes(name) || parent === name,
			) || "Uncategorized"
		);
	};

	const parentName = findParent(currentCategory);
	const subCategoryColor = getCategoryTheme(parentName);

	// 1. Initialize Floating UI logic
	const {
		// Destructure these specifically:
		refs: { setReference, setFloating },
		floatingStyles,
		context,
	} = useFloating({
		open: isOpen,
		onOpenChange: setIsOpen,
		whileElementsMounted: (reference, floating, update) =>
			autoUpdate(reference, floating, update, {
				animationFrame: false, // Keep this for maximum smoothness
				elementResize: true,
			}),
		middleware: [
			offset(8), // Gap between button and menu
			flip(), // Automatically flip up if no room below
			shift(), // Shift sideways if hitting screen edges
			size({
				apply({ rects, elements }) {
					Object.assign(elements.floating.style, {
						minWidth: `${Math.max(rects.reference.width, 300)}px`,
					});
				},
			}),
		],
		// whileElementsMounted: autoUpdate, // Crucial for following scroll
	});

	// 2. Set up interactions (click to open, esc to close)
	// const click = useClick(context);
	const dismiss = useDismiss(context, {
		outsidePress: true, // Handles "Click Outside"
		escapeKey: true, // Handles "ESC" key
	});

	const { getReferenceProps, getFloatingProps } = useInteractions([
		useClick(context),
		dismiss,
	]);

	const bestMatch = useMemo(() => searchCategories(catQuery), [catQuery]);

	return (
		<div className="relative">
			{variant === "form" && (
				<label className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-black mb-1 block">
					Category
				</label>
			)}

			{/* --- TRIGGER BUTTON --- */}
			<button
				ref={setReference} // ATTACH REF HERE
				{...getReferenceProps()} // ATTACH PROPS HERE
				type="button"
				onClick={() => setIsOpen(!isOpen)}
				className={
					variant === "filter"
						? "flex items-center gap-1 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-orange-500 transition-colors"
						: `w-full p-4 bg-[#F8F9FB] dark:bg-[#0d0d0d] border rounded-xl flex items-center justify-between transition-all`
				}
			>
				<div className="flex items-center gap-2">
					{variant === "filter" ? (
						<>
							<span>Category</span>
							<ChevronDown size={10} className={isOpen ? "rotate-180" : ""} />
						</>
					) : (
						<>
							<CategoryIcon
								name={currentCategory}
								size={18}
								colorClass={subCategoryColor.text}
							/>
							<span className="text-sm text-gray-900 dark:text-white font-medium">
								{currentCategory}
							</span>
						</>
					)}
				</div>
				{variant === "form" && (
					<ChevronRight
						size={18}
						className={isOpen ? "rotate-90 text-orange-500" : ""}
					/>
				)}
			</button>

			{/* --- PORTALED DROPDOWN --- */}
			{isOpen && (
				<FloatingPortal>
					<div
						ref={setFloating} // ATTACH REF HERE
						style={floatingStyles}
						{...getFloatingProps()} // ATTACH PROPS HERE
						className="z-200 bg-white dark:bg-[#0d0d0d] shadow-2xl rounded-xl border border-slate-200 dark:border-gray-800 overflow-hidden"
					>
						{/* SEARCH AREA */}
						<div className="p-3 border-b border-gray-800">
							<div className="flex items-center gap-2 bg-[#F8F9FB] dark:bg-[#1a1a1a] px-3 py-2 rounded-lg border border-gray-800 focus-within:border-orange-500/50">
								<Search size={14} className="text-gray-500" />
								<input
									autoFocus
									ref={inputRef}
									placeholder="Search all categories..."
									className="bg-transparent text-xs text-gray-900 dark:text-white outline-none w-full"
									value={catQuery}
									onChange={(e) => setCatQuery(e.target.value)}
								/>
								{/* CLEAR BUTTON */}
								{catQuery && (
									<button
										type="button"
										onClick={() => {
											setCatQuery("");
											inputRef.current?.focus();
										}}
										className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors text-gray-500 hover:text-gray-900 dark:hover:text-white"
									>
										<X size={14} />
									</button>
								)}
							</div>
							{/* SHOW BEST MATCH */}
							{bestMatch && catQuery && (
								<div className="mt-2 px-1 text-[10px] text-gray-500 italic">
									Best match:{" "}
									<span className="text-orange-500">{bestMatch}</span>
								</div>
							)}
						</div>

						<div
							className={`h-80 flex transition-opacity duration-200 ${catQuery !== deferredQuery ? "opacity-50" : "opacity-100"}`}
						>
							{/* LEFT PANE */}
							<div
								className="w-1/3 border-r border-gray-800 overflow-y-auto p-2 scrollbar-hide"
								style={{ scrollbarWidth: "none" }}
							>
								<button
									type="button"
									onClick={() => {
										onSelect("All", "All"); // Using "All" as both name and parent
										setIsOpen(false);
									}}
									className={`w-full flex items-center gap-2 p-2.5 rounded-lg text-[11px] mb-2 transition-all border ${
										currentCategory === "All"
											? "bg-orange-600/10 text-orange-500 font-bold border-orange-500/20"
											: "text-gray-400 border-transparent hover:bg-white/5"
									}`}
								>
									<div className="w-3.5 h-3.5 flex items-center justify-center">
										<LayoutGrid size={14} />
									</div>
									<span>All Categories</span>
								</button>
								<div className="h-px bg-gray-800 my-2 mx-1" />{" "}
								{/* Visual Divider */}
								{visibleParents.map((parent) => (
									<ParentTab
										key={parent}
										parent={parent}
										isActive={activeParent === parent}
										onClick={setSelectedParent}
									/>
								))}
							</div>

							{/* RIGHT PANE */}
							<div
								className="flex-1 bg-[#F8F9FB] dark:bg-[#090909] overflow-y-auto p-2 scrollbar-hide"
								style={{ scrollbarWidth: "none" }}
							>
								{(CATEGORY_HIERARCHY[activeParent] || [])
									.filter(
										(sub) =>
											!catQuery ||
											sub.toLowerCase().includes(catQuery.toLowerCase()),
									)
									.map((sub) => (
										<SubCategoryRow
											key={sub}
											sub={sub}
											parent={activeParent}
											isSelected={currentCategory === sub}
											onSelect={(s, p) => {
												onSelect(s, p);
												setIsOpen(false);
												setCatQuery("");
											}}
										/>
									))}
							</div>
						</div>
					</div>
				</FloatingPortal>
			)}
		</div>
	);
}
