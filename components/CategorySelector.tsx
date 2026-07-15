import { useState, useMemo, useDeferredValue, useRef } from "react";
import { ChevronDown } from "lucide-react";
import { searchCategories } from "@/constants";
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
import { useCategoryHierarchy } from "@/hooks/useCategoryHierarchy";
import { CategoryDropdownMenu } from "@/components/CategoryDropdownMenu";

interface CategorySelectorProps {
	currentCategory: string;
	onSelect: (category: string, parent: string) => void;
	variant?: "form" | "filter";
}

export function CategorySelector({
	currentCategory,
	onSelect,
	variant,
}: CategorySelectorProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [catQuery, setCatQuery] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);
	const deferredQuery = useDeferredValue(catQuery);

	const {
		selectedCategoryData,
		dynamicHierarchy,
		visibleParents,
		activeParent,
		setSelectedParent,
	} = useCategoryHierarchy(currentCategory, deferredQuery);

	const displayIcon = selectedCategoryData?.icon || currentCategory;
	const displayColorClass =
		selectedCategoryData?.theme?.text || "text-gray-400";

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
				<label className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-black mb-1.5 block pl-1">
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
					<CategoryDropdownMenu
						setFloating={setFloating}
						floatingStyles={floatingStyles}
						getFloatingProps={getFloatingProps}
						catQuery={catQuery}
						setCatQuery={setCatQuery}
						inputRef={inputRef}
						bestMatch={bestMatch}
						deferredQuery={deferredQuery}
						currentCategory={currentCategory}
						onSelect={onSelect}
						setIsOpen={setIsOpen}
						activeParent={activeParent}
						setSelectedParent={setSelectedParent}
						visibleParents={visibleParents}
						dynamicHierarchy={dynamicHierarchy}
					/>
				</FloatingPortal>
			)}
		</div>
	);
}
