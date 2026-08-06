/**
 * A reusable wrapper for dashboard widgets.
 * Renders a title, optional subtitle, a dropdown slot, and the children.
 * Handles responsive padding and dark mode styles.
 */
"use client";

import { GripVertical, Sparkles } from "lucide-react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { MOBILE_BREAKPOINT } from "@/config/breakpoints";

interface WidgetShellProps {
	title: string;
	subtitle?: string | React.ReactNode;
	dropdown?: React.ReactNode;
	className?: string;
	children: React.ReactNode;
}

export function WidgetShell({
	title,
	subtitle,
	dropdown,
	className = "",
	children,
}: WidgetShellProps) {
	const isMobile = useMediaQuery(MOBILE_BREAKPOINT);

	return (
		<div
			className={`rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/5 dark:bg-[#232322] ${
				isMobile ? "p-4" : "p-5"
			} ${className}`}
		>
			<div className="mb-4 flex items-center justify-between">
				<div className="flex items-center gap-2">
					<GripVertical
						className="text-gray-300 dark:text-gray-600"
						size={18}
					/>
					<h3
						className={`font-bold text-gray-900 dark:text-white ${
							isMobile ? "text-[15px]" : "text-[17px]"
						}`}
					>
						{title}
						{subtitle && (
							<span
								className={`ml-2 text-sm font-medium text-gray-500 dark:text-gray-400 ${
									isMobile ? "text-xs" : "text-sm"
								}`}
							>
								{subtitle}
							</span>
						)}
					</h3>
					<Sparkles size={16} className="text-orange-400" />
				</div>
				{dropdown && <div className="shrink-0">{dropdown}</div>}
			</div>
			{children}
		</div>
	);
}
