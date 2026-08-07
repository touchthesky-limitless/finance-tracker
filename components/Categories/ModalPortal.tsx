/**
 * ModalPortal - Renders children into a portal to the document body.
 */

"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";

function subscribe() {
	return () => {};
}
function getClientSnapshot() {
	return true;
}
function getServerSnapshot() {
	return false;
}

export function ModalPortal({ children }: { children: ReactNode }) {
	const isClient = useSyncExternalStore(
		subscribe,
		getClientSnapshot,
		getServerSnapshot,
	);
	if (!isClient) return null;
	return createPortal(children, document.body);
}
