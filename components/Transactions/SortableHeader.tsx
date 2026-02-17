import React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';

// --- Types for Sorting ---
type SortKey = "date" | "category" | "name" | "amount" | "account";

// If you have a shared types file, import SortConfig from there instead
export interface SortConfig {
    key: SortKey;
    direction: 'asc' | 'desc';
}

interface SortableHeaderProps {
    label: string;
    activeKey: SortKey;
    sortPriority: SortConfig[];
    onClick: (key: SortKey, event: React.MouseEvent) => void;
    align?: "left" | "right";
}

export function SortableHeader({
    label,
    activeKey,
    sortPriority,
    onClick,
    align = "left",
}: SortableHeaderProps) {
    // Find if this specific header is part of the current sort priority
    const priorityIndex = sortPriority.findIndex(
        (s: SortConfig) => s.key === activeKey,
    );
    const config = sortPriority[priorityIndex];

    return (
        <th
            onClick={(e) => onClick(activeKey, e)}
            className={`py-4 px-2 cursor-pointer select-none group hover:text-white transition-colors ${
                align === "right" ? "text-right" : "text-left"
            }`}
        >
            <div
                className={`flex items-center gap-1 ${
                    align === "right" ? "justify-end" : "justify-start"
                }`}
            >
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                    {label}
                </span>
                {config && (
                    <div className="flex items-center text-orange-400">
                        {config.direction === "asc" ? (
                            <ArrowUp size={10} />
                        ) : (
                            <ArrowDown size={10} />
                        )}
                        {/* Multi-sort indicator: shows "1", "2", etc. if sorting by multiple columns */}
                        {sortPriority.length > 1 && (
                            <span className="text-[8px] font-black ml-0.5">
                                {priorityIndex + 1}
                            </span>
                        )}
                    </div>
                )}
            </div>
        </th>
    );
}

// function SortableHeader({
// 	label,
// 	activeKey,
// 	sortPriority,
// 	onClick,
// 	align = "left",
// }: SortableHeaderProps) {
// 	// Use the SortConfig interface to type the callback parameter 's'

// 	const priorityIndex = sortPriority.findIndex(
// 		(s: SortConfig) => s.key === activeKey,
// 	);
// 	const config = sortPriority[priorityIndex];

// 	return (
// 		<th
// 			onClick={(e) => onClick(activeKey, e)}
// 			className={`py-4 px-2 cursor-pointer select-none group hover:text-white transition-colors ${align === "right" ? "text-right" : "text-left"}`}
// 		>
// 			<div
// 				className={`flex items-center gap-1 ${align === "right" ? "justify-end" : "justify-start"}`}
// 			>
// 				<span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
// 					{label}
// 				</span>
// 				{config && (
// 					<div className="flex items-center text-orange-400">
// 						{config.direction === "asc" ? (
// 							<ArrowUp size={10} />
// 						) : (
// 							<ArrowDown size={10} />
// 						)}
// 						{sortPriority.length > 1 && (
// 							<span className="text-[8px] font-black ml-0.5">
// 								{priorityIndex + 1}
// 							</span>
// 						)}
// 					</div>
// 				)}
// 			</div>
// 		</th>
// 	);
// }
