"use client";

import { useState, useEffect, useRef } from "react";
import { formatThousandWithCommas } from "@/utils/formatters";

export function PlanInput({
    value,
    onChange,
    onClick,
}: {
    value: number;
    onChange: (val: string) => void;
    onClick?: (e: React.MouseEvent<HTMLInputElement>) => void;
}) {
    const [displayValue, setDisplayValue] = useState<string>(
        formatThousandWithCommas(value),
    );
    const inputRef = useRef<HTMLInputElement>(null);

    // Sync external value when not focused
    useEffect(() => {
        if (document.activeElement !== inputRef.current) {
            setDisplayValue(formatThousandWithCommas(value));
        }
    }, [value]);

    const handleFocus = () => {
        // Keep the formatted display, just select all text
        requestAnimationFrame(() => {
            inputRef.current?.select();
        });
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Extract raw digits from the input (remove commas and non‑digits)
        const raw = e.target.value.replace(/[^0-9]/g, "");
        // Format with commas
        const formatted = raw.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

        // Preserve cursor position
        const input = e.target;
        const cursorPos = input.selectionStart || 0;
        let rawCharsBefore = 0;
        for (let i = 0; i < cursorPos; i++) {
            if (input.value[i] >= "0" && input.value[i] <= "9") {
                rawCharsBefore++;
            }
        }
        const formattedBefore = raw
            .slice(0, rawCharsBefore)
            .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        const newCursor = formattedBefore.length;

        setDisplayValue(formatted);

        // Restore cursor after DOM update
        requestAnimationFrame(() => {
            if (inputRef.current) {
                inputRef.current.setSelectionRange(newCursor, newCursor);
            }
        });
    };

    const handleBlur = () => {
        const clean = displayValue.replace(/[^0-9]/g, "");
        const numeric = parseInt(clean, 10) || 0;
        onChange(numeric.toString());
        // Format again to ensure consistency (already formatted)
        setDisplayValue(formatThousandWithCommas(numeric));
    };

    return (
        <input
            ref={inputRef}
            type="text"
            value={displayValue}
            onFocus={handleFocus}
            onChange={handleChange}
            onBlur={handleBlur}
            onClick={(e) => {
                e.currentTarget.select();
                if (onClick) onClick(e);
            }}
            className="w-24 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-center text-sm outline-none focus:border-blue-500 dark:border-white/10 dark:bg-[#232323] cursor-pointer"
        />
    );
}