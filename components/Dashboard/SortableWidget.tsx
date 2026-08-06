/**
 * Wrapper for a dashboard widget that makes it draggable and sortable.
 * Used inside the main dashboard grid.
 */
"use client";

import { useSortable } from "@dnd-kit/react/sortable";

interface SortableWidgetProps {
	id: string;
	index: number;
	children: React.ReactNode;
	className?: string;
}

export function SortableWidget({
	id,
	index,
	children,
	className = "",
}: SortableWidgetProps) {
	const { ref, isDragging, isDropTarget } = useSortable({
		id,
		index,
		type: "widget",
	});

	return (
		<div
			ref={ref}
			className={`${className} ${isDragging ? "opacity-50" : ""} ${
				isDropTarget ? "ring-2 ring-cyan-500" : ""
			}`}
		>
			{children}
		</div>
	);
}
