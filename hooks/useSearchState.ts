import { useRef, useCallback } from "react";

export function useSearchState(setter: (val: string) => void) {
    const inputRef = useRef<HTMLInputElement>(null);

    const handleClear = useCallback(() => {
        setter("");
        // Ensure the state update processes before focusing
        setTimeout(() => inputRef.current?.focus(), 0);
    }, [setter]);

    return {
        inputRef,
        handleClear,
    };
}