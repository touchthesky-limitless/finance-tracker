"use client";

import { X } from "lucide-react";

interface MerchantRuleToastProps {
	show: boolean;
	merchantName: string;
	onCreateRule: () => void;
	onDismiss: () => void;
}

export function MerchantRuleToast({
	show,
	merchantName,
	onCreateRule,
	onDismiss,
}: MerchantRuleToastProps) {
	if (!show) {
		return null;
	}

	return (
		<div
			role="status"
			className="fixed bottom-5 right-5 z-250 flex w-[min(520px,calc(100vw-40px))] overflow-hidden rounded-2xl border border-white/5 bg-[#151514] text-white shadow-[0_20px_60px_rgba(0,0,0,0.42)]"
		>
			<div className="min-w-0 flex-1 px-5 py-4">
				<p className="truncate text-base font-semibold">
					Updated to {merchantName}
				</p>
				<p className="mt-1 text-sm leading-5 text-gray-400">
					Create a rule to do this automatically in the future.
				</p>
			</div>

			<div className="grid w-40 shrink-0 grid-rows-2 border-l border-white/10">
				<button
					type="button"
					onClick={onCreateRule}
					className="border-b border-white/10 px-4 text-sm font-semibold tracking-wide transition hover:bg-white/5"
				>
					CREATE RULE
				</button>
				<button
					type="button"
					onClick={onDismiss}
					className="px-4 text-sm font-semibold tracking-wide transition hover:bg-white/5"
				>
					DISMISS
				</button>
			</div>

			<button
				type="button"
				onClick={onDismiss}
				aria-label="Dismiss rule suggestion"
				className="absolute right-1 top-1 hidden size-7 place-items-center rounded-full text-gray-500 hover:bg-white/10 hover:text-white sm:grid"
			>
				<X size={14} />
			</button>
		</div>
	);
}
