// @/hooks/useSearchState.ts
import { useRef, useCallback } from "react";

export function useSearchState(setter: (val: string) => void) {
    const inputRef = useRef<HTMLInputElement>(null);

    const handleClear = useCallback(() => {
        setter("");
        // Standard focus logic
        setTimeout(() => inputRef.current?.focus(), 0);
    }, [setter]);

    return {
        inputRef, // Return the clean ref object
        handleClear,
    };
}