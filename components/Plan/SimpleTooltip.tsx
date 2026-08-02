"use client";

import { formatCurrencyInt } from "@/utils/formatters";
import { useRef, useState } from "react";

export function SimpleTooltip({
    children,
    label,
    planned,
    actual,
    remaining,
}: {
    children: React.ReactNode;
    label: string;
    planned: number;
    actual: number;
    remaining: number;
}) {
    const [show, setShow] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const ref = useRef<HTMLSpanElement>(null);

    const handleMouseEnter = () => {
        const rect = ref.current?.getBoundingClientRect();
        if (rect) {
            setCoords({
                top: rect.top - 10,
                left: rect.left + rect.width / 2,
            });
            setShow(true);
        }
    };

    const handleMouseLeave = () => setShow(false);

    return (
        <span
            ref={ref}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className="relative inline-block cursor-default"
        >
            {children}
            {show && (
                <div
                    className="fixed z-[300] min-w-[180px] rounded-xl bg-[#1a1a1a] p-4 text-white shadow-xl"
                    style={{
                        top: coords.top - 8,
                        left: coords.left - 90,
                        transform: "translateY(-100%)",
                    }}
                >
                    <div className="text-sm font-semibold mb-2">{label}</div>{" "}
                    {/* ← dynamic label */}
                    <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Planned</span>
                        <span>{formatCurrencyInt(planned)}</span>
                    </div>
                    <div className="flex justify-between text-xs mt-1">
                        <span className="text-gray-400">Actual</span>
                        <span>{formatCurrencyInt(actual)}</span>
                    </div>
                    <div className="flex justify-between text-xs mt-2 pt-2 border-t border-white/10">
                        <span className="text-gray-400">Remaining</span>
                        <span className="text-emerald-400">
                            {formatCurrencyInt(remaining)}
                        </span>
                    </div>
                </div>
            )}
        </span>
    );
}
