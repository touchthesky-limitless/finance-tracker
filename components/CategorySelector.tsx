import { useState, useMemo, useDeferredValue, useRef } from "react";
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
import { useCategoryHierarchy } from "@/hooks/useCategoryHierarchy";
import { CategoryDropdownMenu } from "@/components/CategoryDropdownMenu";
import { CategoryTrigger } from "@/components/CategoryTrigger";

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
			<CategoryTrigger
				ref={setReference}
				{...getReferenceProps()}
				variant={variant}
				isOpen={isOpen}
				onClick={() => {
					setIsOpen(!isOpen);
				}}
				currentCategory={currentCategory}
				displayIcon={displayIcon}
				displayColorClass={displayColorClass}
			/>

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
