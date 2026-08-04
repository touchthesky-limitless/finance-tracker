/**
 * @file useDrawerKeydown.ts
 * @description Handles the Escape key for a modal/drawer, delegating to different close handlers
 * depending on the current state (confirmation, split dialog, menu open, etc.).
 */
import { useEffect } from "react";

interface UseDrawerKeydownOptions {
	isOpen: boolean;
	showDeleteConfirm: boolean;
	setShowDeleteConfirm: (value: boolean) => void;
	showSplitDialog: boolean;
	setShowSplitDialog: (value: boolean) => void;
	isMoreMenuOpen: boolean;
	setIsMoreMenuOpen: (value: boolean) => void;
	tagOpen: boolean;
	setTagOpen: (value: boolean) => void;
	onClose: () => void;
}

export function useDrawerKeydown({
	isOpen,
	showDeleteConfirm,
	setShowDeleteConfirm,
	showSplitDialog,
	setShowSplitDialog,
	isMoreMenuOpen,
	setIsMoreMenuOpen,
	tagOpen,
	setTagOpen,
	onClose,
}: UseDrawerKeydownOptions) {
	useEffect(() => {
		if (!isOpen) return;

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key !== "Escape" || event.defaultPrevented) return;

			if (showDeleteConfirm) {
				setShowDeleteConfirm(false);
				return;
			}
			if (showSplitDialog) {
				setShowSplitDialog(false);
				return;
			}
			if (isMoreMenuOpen || tagOpen) {
				setIsMoreMenuOpen(false);
				setTagOpen(false);
				return;
			}
			onClose();
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [
		isOpen,
		showDeleteConfirm,
		setShowDeleteConfirm,
		showSplitDialog,
		setShowSplitDialog,
		isMoreMenuOpen,
		setIsMoreMenuOpen,
		tagOpen,
		setTagOpen,
		onClose,
	]);
}
