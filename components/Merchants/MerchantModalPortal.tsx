/**
 * Portal and modal effect hooks shared by merchant modals.
 */
"use client";

import { type ReactNode, type RefObject, useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

function subscribeToClient(): () => void {
  return () => {};
}

function getClientSnapshot(): boolean {
  return true;
}

function getServerSnapshot(): boolean {
  return false;
}

/**
 * Renders children into a portal to the document body only on the client.
 */
export function ModalPortal({ children }: { children: ReactNode }) {
  const isClient = useSyncExternalStore(
    subscribeToClient,
    getClientSnapshot,
    getServerSnapshot
  );
  if (!isClient) return null;
  return createPortal(children, document.body);
}

/**
 * Modal effect: locks scroll, focuses initial element, handles Escape key.
 */
export function useModalEffects(
  isBusy: boolean,
  onClose: () => void,
  initialFocusRef?: RefObject<HTMLElement | null>
): void {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    document.body.style.overflow = "hidden";

    const focusFrame = window.requestAnimationFrame(() => {
      initialFocusRef?.current?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isBusy) {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [initialFocusRef, isBusy, onClose]);
}