import { memo } from "react";

interface DonutLegendProps {
	color: string;
	label: string;
	value: string;
	amount: string;
}

export const DonutLegend = memo(function DonutLegend({
	color,
	label,
	value,
	amount,
}: DonutLegendProps) {
	return (
		<div className="flex items-center justify-between text-sm gap-2">
			<div className="flex items-center gap-2 truncate">
				<div className={`w-2.5 h-2.5 rounded-full shrink-0 ${color}`}></div>
				<span className="text-gray-500 dark:text-gray-400 font-medium truncate">
					{label}
				</span>
				<span className="text-[10px] font-bold text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded shrink-0">
					{value}
				</span>
			</div>
			<span className="font-bold text-gray-900 dark:text-white shrink-0">
				{amount}
			</span>
		</div>
	);
});