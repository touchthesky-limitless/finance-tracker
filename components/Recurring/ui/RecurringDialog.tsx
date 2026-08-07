/**
 * Reusable dialog component for recurring‑related modals.
 */
"use client";

import type { ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";

interface RecurringDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	children: ReactNode;
	maxWidthClass?: string;
	showClose?: boolean;
	contentClassName?: string;
	modal?: boolean;
	position?: "center" | "top";
}

export function RecurringDialog({
	open,
	onOpenChange,
	title,
	children,
	maxWidthClass = "max-w-[820px]",
	showClose = true,
	contentClassName = "",
	modal = true,
	position = "center",
}: RecurringDialogProps) {
	const positionClass =
		position === "top"
			? "top-6 -translate-y-0 sm:top-8"
			: "top-1/2 -translate-y-1/2";

	const requestClose = (): void => {
		onOpenChange(false);
	};

	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange} modal={modal}>
			<Dialog.Portal>
				<Dialog.Overlay
					onPointerDown={(event) => {
						if (modal && event.target === event.currentTarget) {
							requestClose();
						}
					}}
					className="fixed inset-0 z-[1000] bg-black/70 backdrop-blur-[2px] data-[state=open]:animate-[recurring-overlay-in_180ms_ease-out] data-[state=closed]:animate-[recurring-overlay-out_150ms_ease-in]"
				/>

				<Dialog.Content
					onCloseAutoFocus={(event) => {
						event.preventDefault();
					}}
					onEscapeKeyDown={() => {
						if (modal) {
							requestClose();
						}
					}}
					className={`fixed left-1/2 z-[1001] max-h-[calc(100vh-32px)] w-[calc(100vw-32px)] -translate-x-1/2 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl outline-none will-change-[opacity,scale] data-[state=open]:animate-[recurring-dialog-in_180ms_cubic-bezier(0.16,1,0.3,1)] data-[state=closed]:animate-[recurring-dialog-out_130ms_ease-in] dark:border-white/10 dark:bg-[#232322] ${positionClass} ${maxWidthClass} ${contentClassName}`}
				>
					<header className="flex min-h-20 items-center border-b border-gray-200 px-8 dark:border-white/5">
						<Dialog.Title className="text-2xl font-bold text-gray-900 dark:text-white">
							{title}
						</Dialog.Title>

						{showClose && (
							<button
								type="button"
								onClick={requestClose}
								aria-label="Close"
								title="Close"
								className="ml-auto rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-white/8 dark:hover:text-white"
							>
								<X size={26} />
							</button>
						)}
					</header>

					{children}
				</Dialog.Content>

				<style jsx global>{`
					@keyframes recurring-overlay-in {
						from {
							opacity: 0;
						}
						to {
							opacity: 1;
						}
					}
					@keyframes recurring-overlay-out {
						from {
							opacity: 1;
						}
						to {
							opacity: 0;
						}
					}
					@keyframes recurring-dialog-in {
						from {
							opacity: 0;
							scale: 0.97;
						}
						to {
							opacity: 1;
							scale: 1;
						}
					}
					@keyframes recurring-dialog-out {
						from {
							opacity: 1;
							scale: 1;
						}
						to {
							opacity: 0;
							scale: 0.98;
						}
					}
				`}</style>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
