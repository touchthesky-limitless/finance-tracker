"use client";

import {
	type KeyboardEvent as ReactKeyboardEvent,
	type ReactNode,
	useEffect,
	useId,
	useRef,
	useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { Loader2 } from "lucide-react";

export type ConfirmDialogVariant = "primary" | "warning" | "danger";

export interface ConfirmDialogProps {
	title: string;
	description: ReactNode;
	confirmLabel: string;
	onCancel: () => void;
	onConfirm: () => void | Promise<void>;
	cancelLabel?: string;
	icon?: ReactNode;
	confirmVariant?: ConfirmDialogVariant;
	isLoading?: boolean;
	confirmDisabled?: boolean;
	autoFocusConfirm?: boolean;
	closeOnBackdrop?: boolean;
}

const VARIANT_STYLES: Record<
	ConfirmDialogVariant,
	{ icon: string; confirmButton: string }
> = {
	primary: {
		icon: "bg-orange-100 text-[#e94c28] dark:bg-orange-500/15 dark:text-orange-300",
		confirmButton:
			"bg-[#ff5a35] hover:bg-[#e94c28] disabled:bg-[#ffad91] disabled:text-white/95",
	},
	warning: {
		icon: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
		confirmButton:
			"bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 dark:bg-amber-500 dark:hover:bg-amber-600 dark:disabled:bg-amber-500/50",
	},
	danger: {
		icon: "bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-300",
		confirmButton:
			"bg-red-600 hover:bg-red-700 disabled:bg-red-400 dark:bg-red-600 dark:hover:bg-red-700 dark:disabled:bg-red-500/50",
	},
};

function subscribeToClient(): () => void {
	return () => {};
}

function getClientSnapshot(): boolean {
	return true;
}

function getServerSnapshot(): boolean {
	return false;
}

const FOCUSABLE_SELECTOR = [
	"button:not([disabled])",
	"[href]",
	"input:not([disabled])",
	"select:not([disabled])",
	"textarea:not([disabled])",
	'[tabindex]:not([tabindex="-1"])',
].join(",");

export function ConfirmDialog({
	title,
	description,
	confirmLabel,
	onCancel,
	onConfirm,
	cancelLabel = "Cancel",
	icon,
	confirmVariant = "primary",
	isLoading = false,
	confirmDisabled = false,
	autoFocusConfirm = true,
	closeOnBackdrop = true,
}: ConfirmDialogProps) {
	const isClient = useSyncExternalStore(
		subscribeToClient,
		getClientSnapshot,
		getServerSnapshot,
	);
	const portalNode = isClient ? document.body : null;
	const dialogRef = useRef<HTMLElement | null>(null);
	const cancelButtonRef = useRef<HTMLButtonElement | null>(null);
	const confirmButtonRef = useRef<HTMLButtonElement | null>(null);
	const onCancelRef = useRef(onCancel);
	const isLoadingRef = useRef(isLoading);
	const titleId = useId();
	const descriptionId = useId();
	const styles = VARIANT_STYLES[confirmVariant];

	useEffect(() => {
		onCancelRef.current = onCancel;
	}, [onCancel]);

	useEffect(() => {
		isLoadingRef.current = isLoading;
	}, [isLoading]);


	useEffect(() => {
		if (!portalNode) {
			return;
		}

		const previouslyFocusedElement =
			document.activeElement instanceof HTMLElement
				? document.activeElement
				: null;
		const previousBodyOverflow = document.body.style.overflow;

		document.body.style.overflow = "hidden";

		const focusTimer = window.setTimeout(() => {
			if (autoFocusConfirm && !confirmDisabled) {
				confirmButtonRef.current?.focus();
				return;
			}

			cancelButtonRef.current?.focus();
		}, 0);

		const handleDocumentKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape" && !isLoadingRef.current) {
				event.preventDefault();
				onCancelRef.current();
			}
		};

		document.addEventListener("keydown", handleDocumentKeyDown);

		return () => {
			window.clearTimeout(focusTimer);
			document.removeEventListener("keydown", handleDocumentKeyDown);
			document.body.style.overflow = previousBodyOverflow;
			previouslyFocusedElement?.focus();
		};
	}, [autoFocusConfirm, confirmDisabled, portalNode]);

	const handleDialogKeyDown = (
		event: ReactKeyboardEvent<HTMLElement>,
	): void => {
		if (event.key !== "Tab") {
			return;
		}

		const focusableElements = Array.from(
			dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? [],
		);

		if (focusableElements.length === 0) {
			event.preventDefault();
			return;
		}

		const firstElement = focusableElements[0];
		const lastElement = focusableElements[focusableElements.length - 1];

		if (event.shiftKey && document.activeElement === firstElement) {
			event.preventDefault();
			lastElement.focus();
			return;
		}

		if (!event.shiftKey && document.activeElement === lastElement) {
			event.preventDefault();
			firstElement.focus();
		}
	};

	if (!portalNode) {
		return null;
	}

	return createPortal(
		<div
			className="fixed inset-0 z-[1000] grid place-items-center overflow-y-auto bg-black/55 p-3 backdrop-blur-[2px] sm:p-4"
			onPointerDown={(event) => {
				if (
					closeOnBackdrop &&
					!isLoading &&
					event.target === event.currentTarget
				) {
					onCancel();
				}
			}}
		>
			<section
				ref={dialogRef}
				role="alertdialog"
				aria-modal="true"
				aria-busy={isLoading}
				aria-labelledby={titleId}
				aria-describedby={descriptionId}
				onKeyDown={handleDialogKeyDown}
				className="relative my-auto w-full max-w-[520px] overflow-hidden rounded-2xl border border-black/10 bg-white text-[#282826] shadow-[0_28px_90px_rgba(0,0,0,0.34)] dark:border-white/10 dark:bg-[#242422] dark:text-white"
			>
				<div className="flex items-start gap-3 px-4 pb-4 pt-5 sm:gap-4 sm:px-7 sm:pb-5 sm:pt-7">
					{icon && (
						<div
							className={`grid size-11 shrink-0 place-items-center rounded-full ${styles.icon}`}
							aria-hidden="true"
						>
							{icon}
						</div>
					)}

					<div className="min-w-0">
						<h2
							id={titleId}
							className="text-lg font-semibold tracking-[-0.01em] sm:text-xl"
						>
							{title}
						</h2>
						<div
							id={descriptionId}
							className="mt-2 text-sm leading-6 text-[#686661] dark:text-[#b8b6b1]"
						>
							{description}
						</div>
					</div>
				</div>

				<footer className="flex flex-col-reverse items-stretch gap-3 border-t border-black/[0.06] px-4 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-7 sm:py-5 dark:border-white/10">
					<button
						ref={cancelButtonRef}
						type="button"
						onClick={onCancel}
						disabled={isLoading}
						className="h-11 w-full rounded-xl border border-[#dedbd7] bg-white px-5 text-sm font-semibold shadow-sm transition hover:bg-[#f7f6f4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto dark:border-white/15 dark:bg-[#242422] dark:hover:bg-white/5"
					>
						{cancelLabel}
					</button>

					<button
						ref={confirmButtonRef}
						type="button"
						onClick={() => void onConfirm()}
						disabled={isLoading || confirmDisabled}
						className={`inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed sm:w-auto sm:min-w-32 dark:focus-visible:ring-offset-[#242422] ${styles.confirmButton}`}
					>
						{isLoading && <Loader2 size={17} className="animate-spin" />}
						{confirmLabel}
					</button>
				</footer>
			</section>
		</div>,
		portalNode,
	);
}
