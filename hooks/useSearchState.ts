import { useRef, useCallback } from "react";

export function useSearchState(setter: (val: string) => void) {
	const inputRef = useRef<HTMLInputElement>(null);

	const handleClear = useCallback(() => {
		setter("");
		// Focus logic removed to prevent mobile keyboard from blocking the screen
	}, [setter]);

	return {
		inputRef,
		handleClear,
	};
}
