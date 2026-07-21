import { useDeferredValue, useMemo, useRef, useState } from "react";
import {
	FloatingPortal,
	autoUpdate,
	flip,
	offset,
	shift,
	size,
	useClick,
	useDismiss,
	useFloating,
	useInteractions,
} from "@floating-ui/react";

import { CategoryDropdownMenu } from "@/components/CategoryDropdownMenu";
import { CategoryTrigger } from "@/components/CategoryTrigger";
import { searchCategories } from "@/constants";
import { findParentCategory } from "@/constants/categories";
import { useCategoryHierarchy } from "@/hooks/useCategoryHierarchy";

interface CategorySelectorProps {
	currentCategory: string;
	onSelect: (category: string, parent: string) => void;
	placeholder?: string;
	showChevron?: boolean;
	hideChevronUntilHover?: boolean;
	variant?: "form" | "filter";
}

export function CategorySelector({
	currentCategory,
	onSelect,
	variant = "form",
	placeholder = "Search categories...",
	showChevron = false,
	hideChevronUntilHover = false,
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
		selectedCategoryData?.theme?.text ?? "text-gray-400";

	const {
		refs: { setReference, setFloating },
		floatingStyles,
		context,
	} = useFloating({
		open: isOpen,

		onOpenChange(nextOpen) {
			setIsOpen(nextOpen);

			if (nextOpen) {
				setSelectedParent(findParentCategory(currentCategory));
				setCatQuery("");

				window.requestAnimationFrame(() => {
					inputRef.current?.focus();
				});
			}
		},

		whileElementsMounted(reference, floating, update) {
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
						maxWidth: "calc(100vw - 32px)",
					});
				},
			}),
		],
	});

	const click = useClick(context);

	const dismiss = useDismiss(context, {
		outsidePress: true,
		escapeKey: true,
	});

	const { getReferenceProps, getFloatingProps } = useInteractions([
		click,
		dismiss,
	]);

	const bestMatch = useMemo(() => {
		return searchCategories(catQuery);
	}, [catQuery]);

	return (
		<div className="group relative">
			<CategoryTrigger
				ref={setReference}
				{...getReferenceProps()}
				variant={variant}
				isOpen={isOpen}
				currentCategory={currentCategory}
				displayIcon={displayIcon}
				displayColorClass={displayColorClass}
				placeholder={placeholder}
				showChevron={showChevron}
	hideChevronUntilHover={hideChevronUntilHover}
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
