"use client";

import { CategoryIcon } from "@/components/CategoryIcon";
import { findParentCategory, getCategoryTheme } from "@/constants";

type MerchantRuleToastVariant = "merchant" | "category";

interface MerchantRuleToastProps {
	show: boolean;
	variant: MerchantRuleToastVariant;
	updatedValue: string;
	onCreateRule: () => void;
	onDismiss: () => void;
}

export function MerchantRuleToast({
	show,
	variant,
	updatedValue,
	onCreateRule,
	onDismiss,
}: MerchantRuleToastProps) {
	if (!show) {
		return null;
	}

	const isCategoryUpdate = variant === "category";
	const categoryTheme = isCategoryUpdate
		? getCategoryTheme(findParentCategory(updatedValue))
		: null;

	return (
		<div
			role="status"
			aria-live="polite"
			className="
			fixed bottom-5 right-5 z-[9999]
			w-[min(520px,calc(100vw-40px))]
		"
		>
			{/* Soft ambient glow */}
			<div
				aria-hidden="true"
				className="
				pointer-events-none absolute -inset-1
				rounded-[20px]
				bg-orange-500/10 blur-xl
				dark:bg-orange-400/10
			"
			/>

			{/* Animated border layer */}
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
					bg-[conic-gradient(from_0deg,transparent_0deg,transparent_300deg,rgba(249,115,22,0.2)_315deg,#fb923c_328deg,#fff7ed_340deg,#fb923c_352deg,transparent_360deg)]
					motion-reduce:animate-none
				"
				/>
			</div>

			{/* Toast content */}
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
					<p className="flex min-w-0 items-center gap-2 text-base font-semibold">
						<span className="shrink-0">Updated to</span>

						{isCategoryUpdate && categoryTheme && (
							<CategoryIcon
								name={updatedValue}
								size={18}
								colorClass={categoryTheme.text}
							/>
						)}

						<span className="truncate">{updatedValue}</span>
					</p>

					<p className="mt-1 text-sm leading-5 text-gray-600 dark:text-gray-400">
						Create a rule to do this automatically in the future.
					</p>
				</div>

				<div
					className="
					grid w-40 shrink-0 grid-rows-2
					border-l border-gray-200
					dark:border-white/10
				"
				>
					<button
						type="button"
						onClick={onCreateRule}
						className="
						border-b border-gray-200 px-4
						text-sm font-semibold tracking-wide
						text-orange-600
						transition-colors
						hover:bg-orange-50
						focus-visible:outline-none
						focus-visible:ring-2
						focus-visible:ring-inset
						focus-visible:ring-orange-500
						dark:border-white/10
						dark:text-orange-400
						dark:hover:bg-orange-500/10
					"
					>
						CREATE RULE
					</button>

					<button
						type="button"
						onClick={onDismiss}
						className="
						px-4 text-sm font-semibold tracking-wide
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
