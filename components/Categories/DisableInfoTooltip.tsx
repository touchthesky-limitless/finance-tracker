/**
 * DisableInfoTooltip - Tooltip explaining the effect of disabling/activating a system category.
 */

"use client";

import { Info } from "lucide-react";

export function DisableInfoTooltip({ text }: { text: string }) {
	return (
		<div className="group/disable-tooltip relative">
			<button
				type="button"
				aria-label="About disabling this item"
				className="grid size-10 place-items-center rounded-full text-[#777570] transition hover:bg-black/[0.05] hover:text-[#282826] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40 dark:text-[#aaa9a4] dark:hover:bg-white/10 dark:hover:text-white"
			>
				<Info size={21} />
			</button>
			<div
				role="tooltip"
				className="pointer-events-none fixed bottom-20 left-4 right-4 z-[1090] rounded-xl bg-[#282826] px-4 py-3 text-center text-sm font-semibold leading-5 text-white opacity-0 shadow-[0_16px_40px_rgba(0,0,0,0.3)] transition-opacity group-hover/disable-tooltip:opacity-100 group-focus-within/disable-tooltip:opacity-100 sm:absolute sm:bottom-[calc(100%+14px)] sm:left-1/2 sm:right-auto sm:w-[360px] sm:max-w-[calc(100vw-32px)] sm:-translate-x-1/2 sm:px-5 sm:py-4 sm:text-[15px] sm:leading-6"
			>
				{text}
				<span className="absolute left-1/2 top-full size-4 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-[#282826]" />
			</div>
		</div>
	);
}
