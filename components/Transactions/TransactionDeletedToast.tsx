"use client";

import { useEffect } from "react";

interface TransactionDeletedToastProps {
	show: boolean;
	count: number;
	onDismiss: () => void;
}

export function TransactionDeletedToast({
	show,
	count,
	onDismiss,
}: TransactionDeletedToastProps) {
	useEffect(() => {
		if (!show || count <= 0) {
			return;
		}

		const timer = window.setTimeout(() => {
			onDismiss();
		}, 5000);

		return () => {
			window.clearTimeout(timer);
		};
	}, [count, onDismiss, show]);

	if (!show || count <= 0) {
		return null;
	}

	const transactionLabel = count === 1 ? "transaction" : "transactions";

	return (
		<div
			role="status"
			aria-live="polite"
			className="
			fixed bottom-5 right-5 z-[9999]
			w-[min(520px,calc(100vw-40px))]
		"
		>
			<div
				aria-hidden="true"
				className="
				pointer-events-none absolute -inset-1
				rounded-[20px]
				bg-red-500/10 blur-xl
				dark:bg-red-400/10
			"
			/>

			<div
				aria-hidden="true"
				className="
				pointer-events-none absolute inset-0
				overflow-hidden rounded-2xl
				bg-gray-200
				dark:bg-white/10
			"
			>
				<div
					className="
					absolute -inset-[80%]
					animate-[spin_3s_linear_infinite]
					bg-[conic-gradient(from_0deg,transparent_0deg,transparent_300deg,rgba(239,68,68,0.18)_315deg,#ef4444_328deg,#fef2f2_340deg,#ef4444_352deg,transparent_360deg)]
					motion-reduce:animate-none
				"
				/>
			</div>

			<div
				className="
				relative z-10 m-[1px]
				flex overflow-hidden rounded-[15px]
				bg-white/95 text-gray-950
				shadow-[0_20px_60px_rgba(0,0,0,0.16)]
				backdrop-blur-xl
				dark:bg-[#202020]/95 dark:text-white
				dark:shadow-[0_20px_60px_rgba(0,0,0,0.45)]
			"
			>
				<div className="min-w-0 flex-1 px-5 py-4">
					<p className="text-base font-semibold">
						Deleted {count} {transactionLabel}
					</p>

					<p className="mt-1 text-sm leading-5 text-gray-600 dark:text-gray-400">
						Permanently removed from all transaction lists, reports, and
						budgets.
					</p>
				</div>

				<div
					className="
					flex w-40 shrink-0 items-stretch
					border-l border-gray-200
					dark:border-white/10
				"
				>
					<button
						type="button"
						onClick={onDismiss}
						className="
						w-full px-4
						text-sm font-semibold tracking-wide
						text-gray-700
						transition-colors
						hover:bg-gray-100
						focus-visible:outline-none
						focus-visible:ring-2
						focus-visible:ring-inset
						focus-visible:ring-gray-400
						dark:text-gray-300
						dark:hover:bg-white/5
					"
					>
						DISMISS
					</button>
				</div>
			</div>
		</div>
	);
}
