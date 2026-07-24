"use client";

import { Loader2, Trash2 } from "lucide-react";

interface DeleteConfirmModalProps {
	title: string;
	description: string;
	confirmLabel: string;
	isDeleting: boolean;
	onCancel: () => void;
	onConfirm: () => void;
}

export function DeleteConfirmModal({
	title,
	description,
	confirmLabel,
	isDeleting,
	onCancel,
	onConfirm,
}: DeleteConfirmModalProps) {
	return (
		<div
			className="fixed inset-0 z-[1000] grid place-items-center overflow-y-auto bg-black/55 p-3 backdrop-blur-[2px] sm:p-4"
			onKeyDown={(event) => {
				if (event.key === "Escape" && !isDeleting) {
					onCancel();
				}
			}}
		>
			<button
				type="button"
				aria-label="Close delete confirmation"
				className="absolute inset-0 cursor-default"
				onClick={() => {
					if (!isDeleting) {
						onCancel();
					}
				}}
			/>

			<section
				role="alertdialog"
				aria-modal="true"
				aria-labelledby="delete-confirm-title"
				aria-describedby="delete-confirm-description"
				className="relative my-auto w-full max-w-[520px] overflow-hidden rounded-2xl border border-black/10 bg-white text-[#282826] shadow-[0_28px_90px_rgba(0,0,0,0.34)] dark:border-white/10 dark:bg-[#242422] dark:text-white"
			>
				<div className="flex items-start gap-3 px-4 pb-4 pt-5 sm:gap-4 sm:px-7 sm:pb-5 sm:pt-7">
					<div className="grid size-11 shrink-0 place-items-center rounded-full bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-300">
						<Trash2 size={21} />
					</div>

					<div className="min-w-0">
						<h2
							id="delete-confirm-title"
							className="text-lg font-semibold tracking-[-0.01em] sm:text-xl"
						>
							{title}
						</h2>
						<p
							id="delete-confirm-description"
							className="mt-2 text-sm leading-6 text-[#686661] dark:text-[#b8b6b1]"
						>
							{description}
						</p>
					</div>
				</div>

				<footer className="flex flex-col-reverse items-stretch gap-3 border-t border-black/[0.06] px-4 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-7 sm:py-5 dark:border-white/10">
					<button
						type="button"
						onClick={onCancel}
						disabled={isDeleting}
						className="h-11 w-full rounded-xl border border-[#dedbd7] bg-white px-5 text-sm font-semibold shadow-sm transition hover:bg-[#f7f6f4] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto dark:border-white/15 dark:bg-[#242422] dark:hover:bg-white/5"
					>
						Cancel
					</button>

					<button
						type="button"
						autoFocus
						onClick={onConfirm}
						disabled={isDeleting}
						className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-400 sm:w-auto sm:min-w-32"
					>
						{isDeleting && <Loader2 size={17} className="animate-spin" />}
						{confirmLabel}
					</button>
				</footer>
			</section>
		</div>
	);
}
