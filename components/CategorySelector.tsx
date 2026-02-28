import { useState, useMemo } from "react";
import { ChevronRight, Search, Check } from "lucide-react";
import { CATEGORY_HIERARCHY, getParentColor } from "@/constants/categories";
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
}

export function CategorySelector({
	currentCategory,
	onSelect,
}: CategorySelectorProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [catQuery, setCatQuery] = useState("");
	// const containerRef = useRef<HTMLDivElement>(null);

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
		const query = catQuery.toLowerCase().trim();
		if (!query) return Object.keys(CATEGORY_HIERARCHY);
		return Object.keys(CATEGORY_HIERARCHY).filter(
			(parent) =>
				parent.toLowerCase().includes(query) ||
				CATEGORY_HIERARCHY[parent].some((sub) =>
					sub.toLowerCase().includes(query),
				),
		);
	}, [catQuery]);

	// Derived Active Parent (The Auto-Snap Fix)
	const activeParent = useMemo(() => {
		const query = catQuery.toLowerCase().trim();
		if (!query) return selectedParent;

		// Only change parent if the CURRENT one has zero matches for the search
		const currentHasMatch =
			selectedParent.toLowerCase().includes(query) ||
			CATEGORY_HIERARCHY[selectedParent]?.some((s) =>
				s.toLowerCase().includes(query),
			);

		if (currentHasMatch) return selectedParent;

		return visibleParents.length > 0 ? visibleParents[0] : selectedParent;
	}, [catQuery, visibleParents, selectedParent]);

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
	const subCategoryColor = getParentColor(parentName);

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
						width: `${rects.reference.width}px`,
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

	return (
		<div
			// data-category-selector
			//  ref={containerRef}
			className="relative"
		>
			<label className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-black">
				Category
			</label>

			{/* --- TRIGGER BUTTON --- */}
			<button
				ref={setReference} // ATTACH REF HERE
				{...getReferenceProps()} // ATTACH PROPS HERE
				type="button"
				onClick={() => setIsOpen(!isOpen)}
				className={`w-full p-4 bg-[#F8F9FB] dark:bg-[#0d0d0d] border rounded-xl flex items-center justify-between transition-all ${
					isOpen
						? "border-orange-500 ring-1 ring-orange-500/20"
						: "border-gray-800"
				}`}
			>
				<div className="flex items-center gap-3">
					{/* <CategoryIcon name={activeParent} size={18} /> */}
					<CategoryIcon
						name={currentCategory}
						size={18}
						colorClass={subCategoryColor}
					/>
					<span className="text-sm text-gray-900 dark:text-white font-medium">
						{currentCategory}
					</span>
				</div>
				<ChevronRight
					size={18}
					className={`transition-transform duration-200 ${isOpen ? "rotate-90 text-orange-500" : ""}`}
				/>
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
						{/* <div className="absolute z-100 top-full left-0 w-full mt-1 bg-white dark:bg-[#0d0d0d] shadow-2xl rounded-xl border border-slate-200 dark:border-gray-800 overflow-hidden"> */}
						{/* SEARCH AREA */}
						<div className="p-3 border-b border-gray-800">
							<div className="flex items-center gap-2 bg-[#F8F9FB] dark:bg-[#1a1a1a] px-3 py-2 rounded-lg border border-gray-800 focus-within:border-orange-500/50">
								<Search size={14} className="text-gray-500" />
								<input
									autoFocus
									placeholder="Search all categories..."
									className="bg-transparent text-xs text-gray-900 dark:text-white outline-none w-full"
									value={catQuery}
									onChange={(e) => setCatQuery(e.target.value)}
								/>
							</div>
						</div>

						<div className="h-80 flex">
							{/* LEFT PANE */}
							<div
								className="w-1/3 border-r border-gray-800 overflow-y-auto p-2 scrollbar-hide"
								style={{ scrollbarWidth: "none" }}
							>
								{visibleParents.map((parent) => (
									<button
										key={parent}
										type="button"
										onClick={() => setSelectedParent(parent)}
										className={`w-full flex items-center gap-2 p-2.5 rounded-lg text-[11px] mb-1 transition-all ${
											activeParent === parent
												? "bg-orange-600/10 text-orange-500 font-bold border border-orange-500/20"
												: "text-gray-500 hover:text-gray-300"
										}`}
									>
										<CategoryIcon
											name={parent}
											size={14}
											colorClass={getParentColor(parent)}
										/>
										<span className="truncate">{parent}</span>
									</button>
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
										<button
											key={sub}
											type="button"
											onClick={() => {
												onSelect(sub, activeParent);
												setIsOpen(false);
												setCatQuery("");
											}}
											className="w-full text-left px-4 py-3 rounded-lg flex items-center justify-between transition-colors group"
										>
											<div className="flex items-center gap-3">
												<CategoryIcon
													name={sub}
													size={14}
													colorClass={getParentColor(activeParent)}
												/>
												<span
													className={`text-xs ${currentCategory === sub ? "text-orange-400 font-bold" : "text-gray-400"}`}
												>
													{sub}
												</span>
											</div>
											{currentCategory === sub && (
												<Check size={14} className="text-orange-500" />
											)}
										</button>
									))}
							</div>
						</div>
					</div>
				</FloatingPortal>
			)}
		</div>
	);
}
