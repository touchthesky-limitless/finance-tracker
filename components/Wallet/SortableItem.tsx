import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ReactNode } from "react";

export function SortableItem({
	id,
	children,
	className,
	style,
}: {
	id: string;
	children: ReactNode;
	className?: string;
	style?: React.CSSProperties;
}) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id });

	const sortableStyle = {
		...style, // Spread this FIRST so dnd-kit can override it
		transform: CSS.Transform.toString(transform),
		transition,
		zIndex: isDragging ? 9999 : style?.zIndex || 1,
		// Item will stay at full opacity even while dragging
		// opacity: isDragging ? 0.5 : 1,
	};

	return (
		<div
			ref={setNodeRef}
			style={sortableStyle}
			className={className}
			{...attributes}
			{...listeners}
		>
			{children}
		</div>
	);
}
