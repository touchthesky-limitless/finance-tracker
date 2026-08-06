/**
 * useResponsiveWidth – Returns the measured width of a container element
 * with debounced updates via ResizeObserver and requestAnimationFrame.
 */
"use client";

import { useEffect, useState, type RefObject } from "react";

export function useResponsiveWidth(
	containerRef: RefObject<HTMLDivElement | null>,
): number {
	const [width, setWidth] = useState(0);

	useEffect(() => {
		const element = containerRef.current;
		if (!element) return;

		let frameId = 0;
		const updateWidth = (nextWidth: number) => {
			cancelAnimationFrame(frameId);
			frameId = requestAnimationFrame(() => {
				setWidth((prev) =>
					prev === Math.floor(nextWidth) ? prev : Math.floor(nextWidth),
				);
			});
		};

		updateWidth(element.getBoundingClientRect().width);

		if (typeof ResizeObserver !== "undefined") {
			const observer = new ResizeObserver((entries) => {
				const entry = entries[0];
				if (entry) updateWidth(entry.contentRect.width);
			});
			observer.observe(element);
			return () => observer.disconnect();
		} else {
			const handleResize = () =>
				updateWidth(element.getBoundingClientRect().width);
			window.addEventListener("resize", handleResize);
			return () => window.removeEventListener("resize", handleResize);
		}
	}, [containerRef]);

	return width;
}
