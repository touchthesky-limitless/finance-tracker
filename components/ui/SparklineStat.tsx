import { memo } from "react";

interface SparklineStatProps {
	title: string;
	amount: string;
	trend: string;
	isPositive: boolean;
	sparklineColor: string;
	path: string;
}

export const SparklineStat = memo(function SparklineStat({
	title,
	amount,
	trend,
	isPositive,
	sparklineColor,
	path,
}: SparklineStatProps) {
	const gradId = `grad-${title.replace(/\s/g, "")}`;

	return (
		<div className="flex flex-col min-w-0">
			<div className="flex justify-between items-start mb-1 gap-2">
				<p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate">
					{title}
				</p>
				<span
					className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
						isPositive
							? "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400"
							: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400"
					}`}
				>
					{trend}
				</span>
			</div>
			<h3 className="text-2xl @2xl:text-3xl font-black text-gray-900 dark:text-white truncate">
				{amount}
			</h3>

			<svg
				viewBox="0 0 100 30"
				className="w-full h-8 mt-3 shrink-0"
				preserveAspectRatio="none"
			>
				<defs>
					<linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
						<stop offset="0%" stopColor={sparklineColor} stopOpacity="0.25" />
						<stop offset="100%" stopColor={sparklineColor} stopOpacity="0" />
					</linearGradient>
				</defs>
				<path d={`${path} L 100 30 L 0 30 Z`} fill={`url(#${gradId})`} />
				<path
					d={path}
					fill="none"
					stroke={sparklineColor}
					strokeWidth="2.5"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
			</svg>
		</div>
	);
});