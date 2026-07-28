"use client";

import { useSyncExternalStore } from "react";

export function useMediaQuery(query: string): boolean {
	const getSnapshot = () => {
		// Guard against SSR
		if (typeof window === "undefined") return false;
		return window.matchMedia(query).matches;
	};

	const subscribe = (callback: () => void) => {
		// Guard against SSR (returns a no-op cleanup)
		if (typeof window === "undefined") return () => {};

		const mediaQuery = window.matchMedia(query);
		mediaQuery.addEventListener("change", callback);
		return () => {
			mediaQuery.removeEventListener("change", callback);
		};
	};

	const getServerSnapshot = () => false;

	return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
