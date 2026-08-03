/**
 * @file useTransactionsSelection.ts
 * @description Handles multi-selection of transaction rows, edit mode toggle,
 * and the keyboard shortcut (Escape) to exit edit mode and clear selections.
 * Provides the state, a callback for row clicks, and an exit function.
 */
import { useState, useCallback, useEffect } from "react";
import { MouseEvent as ReactMouseEvent } from "react";

export function useTransactionsSelection() {
	const [selectedIds, setSelectedIds] = useState<string[]>([]);
	const [isEditMode, setIsEditMode] = useState(false);

	const handleSelectRow = useCallback((id: string, event: ReactMouseEvent) => {
		event.stopPropagation();
		setSelectedIds((prev) =>
			prev.includes(id)
				? prev.filter((selected) => selected !== id)
				: [...prev, id],
		);
	}, []);

	const exitEditMode = useCallback(() => {
		setIsEditMode(false);
		setSelectedIds([]);
	}, []);

	useEffect(() => {
		const onEscape = (e: KeyboardEvent) => {
			if (e.key === "Escape") exitEditMode();
		};
		window.addEventListener("keydown", onEscape);
		return () => window.removeEventListener("keydown", onEscape);
	}, [exitEditMode]);

	return {
		selectedIds,
		setSelectedIds,
		isEditMode,
		setIsEditMode,
		handleSelectRow,
		exitEditMode,
	};
}
