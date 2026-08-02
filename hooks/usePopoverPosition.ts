import { useLayoutEffect, useState, useRef } from "react";

export function usePopoverPosition(
	open: boolean,
	anchorRef: HTMLElement | null,
	popoverWidth: number = 280,
) {
	const [position, setPosition] = useState<{
		top: number;
		left: number;
	} | null>(null);
	const positionRef = useRef<{ top: number; left: number } | null>(null);

	useLayoutEffect(() => {
		if (!open || !anchorRef) {
			if (positionRef.current !== null) {
				positionRef.current = null;
				setPosition(null);
			}
			return;
		}
		const rect = anchorRef.getBoundingClientRect();
		const newPosition = {
			top: rect.bottom + 8,
			left: rect.left + rect.width / 2 - popoverWidth / 2,
		};
		if (
			!positionRef.current ||
			positionRef.current.top !== newPosition.top ||
			positionRef.current.left !== newPosition.left
		) {
			positionRef.current = newPosition;
			setPosition(newPosition);
		}
	}, [open, anchorRef, popoverWidth]);

	return position;
}
