import { useEffect, RefObject } from "react";

/**
 * Hook to handle click-outside and Escape key dismissal
 */
export function useOutsideClick(
	ref: RefObject<HTMLElement | null>,
	onClose: () => void,
	isOpen: boolean,
	// Pass the class name as a variable (defaulting to a generic dropdown class)
	portalSelector: string = "[data-category-selector]",
) {
	useEffect(() => {
		if (!isOpen) return;

		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as Node;

			// Check if click is outside the trigger element
			const isOutsideRef = ref.current && !ref.current.contains(target);

			// Check if click is outside the portaled menu using the variable class
			const portalElement = document.querySelector(portalSelector);
			const isOutsidePortal = !portalElement?.contains(target);

			if (isOutsideRef && isOutsidePortal) {
				onClose();
			}
		};

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				onClose();
			}
		};

		// Use 'true' for capture phase to ensure Escape key works reliably
		document.addEventListener("mousedown", handleClickOutside);
		document.addEventListener("keydown", handleKeyDown, true);

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
			document.removeEventListener("keydown", handleKeyDown, true);
		};
	}, [ref, onClose, isOpen, portalSelector]);
}
