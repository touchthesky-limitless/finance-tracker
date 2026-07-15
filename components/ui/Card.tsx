import { memo, ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";

interface CardProps {
	title: string;
	children: ReactNode;
	className?: string;
	action?: ReactNode;
}

export const Card = memo(function Card({
	title,
	children,
	className = "",
	action,
}: CardProps) {
	return (
		<div
			className={`bg-white dark:bg-[#121212] border border-gray-100 dark:border-gray-800/80 rounded-3xl p-6 shadow-sm min-w-0 ${className}`}
		>
			<div className="flex items-center justify-between mb-2">
				<div className="flex items-center gap-2 text-gray-900 dark:text-white font-bold truncate">
					<span className="w-1 h-4 bg-orange-500 rounded-full shrink-0"></span>
					<span className="truncate">{title}</span>
				</div>
				{action || (
					<button
						type="button"
						aria-label="More"
						className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 border border-gray-100 dark:border-gray-800 rounded-full shrink-0"
					>
						<MoreHorizontal size={16} />
					</button>
				)}
			</div>
			{children}
		</div>
	);
});