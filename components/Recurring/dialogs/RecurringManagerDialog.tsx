/**
 * Dialog for adding recurring items via sync, manual, or search.
 */
"use client";

import type { ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { PlusCircle, RefreshCw, Search, X } from "lucide-react";
import type { RecurringType } from "../types";

interface RecurringManagerDialogProps {
	open: boolean;
	onClose: () => void;
	onOpenSearch: (defaultType: RecurringType) => void;
}

export function RecurringManagerDialog({
	open,
	onClose,
	onOpenSearch,
}: RecurringManagerDialogProps) {
	return (
		<Dialog.Root
			open={open}
			onOpenChange={(nextOpen) => {
				if (!nextOpen) {
					onClose();
				}
			}}
			modal
		>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 z-[1000] bg-black/70 backdrop-blur-[2px] data-[state=open]:animate-[recurring-overlay-in_180ms_ease-out] data-[state=closed]:animate-[recurring-overlay-out_150ms_ease-in]" />

				<Dialog.Content
					aria-describedby={undefined}
					onPointerDownOutside={(event) => {
						event.preventDefault();
						onClose();
					}}
					onEscapeKeyDown={(event) => {
						event.preventDefault();
						onClose();
					}}
					onCloseAutoFocus={(event) => {
						event.preventDefault();
					}}
					className="fixed left-1/2 top-1/2 z-[1001] max-h-[calc(100vh-32px)] w-[calc(100vw-32px)] max-w-[1120px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl outline-none will-change-[opacity,scale] data-[state=open]:animate-[recurring-dialog-in_180ms_cubic-bezier(0.16,1,0.3,1)] data-[state=closed]:animate-[recurring-dialog-out_130ms_ease-in] dark:border-white/10 dark:bg-[#232322]"
				>
					<header className="flex min-h-20 items-center border-b border-gray-200 px-8 dark:border-white/5">
						<Dialog.Title className="text-2xl font-bold text-gray-900 dark:text-white">
							Add recurring
						</Dialog.Title>

						<Dialog.Close asChild>
							<button
								type="button"
								onClick={onClose}
								aria-label="Close Add recurring"
								title="Close"
								className="ml-auto rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 dark:text-gray-300 dark:hover:bg-white/8"
							>
								<X size={26} />
							</button>
						</Dialog.Close>
					</header>

					<div className="grid gap-8 p-8 md:grid-cols-3">
						<ManagerCard
							icon={<RefreshCw size={31} />}
							title="Sync your liability accounts"
							onClick={() => {
								onOpenSearch("credit-card");
							}}
						/>
						<ManagerCard
							icon={<PlusCircle size={31} />}
							title="Add a recurring merchant manually"
							onClick={() => {
								onOpenSearch("expense");
							}}
						/>
						<ManagerCard
							icon={<Search size={32} />}
							title="Find recurring merchants in your accounts"
							onClick={() => {
								onOpenSearch("expense");
							}}
							muted
						/>
					</div>
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

function ManagerCard({
	icon,
	title,
	onClick,
	muted = false,
}: {
	icon: ReactNode;
	title: string;
	onClick: () => void;
	muted?: boolean;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={`group flex min-h-[184px] flex-col items-start justify-center gap-7 rounded-2xl border border-transparent px-8 py-7 text-left transition-colors hover:border-[#FF6633]/50 hover:bg-[#FF6633]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6633]/35 ${
				muted
					? "bg-gray-50 text-gray-500 dark:bg-white/[0.035] dark:text-gray-400"
					: "bg-gray-100 text-gray-900 dark:bg-white/[0.045] dark:text-white"
			}`}
		>
			<span
				className={`transition-colors ${
					muted ? "text-gray-500" : "text-[#FF6633]"
				}`}
			>
				{icon}
			</span>
			<span className="max-w-64 text-xl font-bold leading-relaxed transition-colors">
				{title}
			</span>
		</button>
	);
}
