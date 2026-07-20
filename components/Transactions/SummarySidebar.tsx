import { Sparkles } from "lucide-react";

interface SummarySidebarProps {
	isVisible: boolean;
	stats: {
		total: number;
		largestTx: number;
		largestEx: number;
	};
}

export function SummarySidebar({ isVisible, stats }: SummarySidebarProps) {
	if (!isVisible) {
		return null;
	}

	return (
		<div className="w-[320px] bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-white/5 rounded-2xl shadow-sm p-6 flex flex-col z-20 transition-colors duration-200">
			<div className="flex items-center justify-between mb-8">
				<h2 className="text-[18px] font-bold text-gray-900 dark:text-white tracking-tight">
					Summary
				</h2>
				<Sparkles size={18} className="text-gray-500 dark:text-gray-400" />
			</div>

			<div className="flex flex-col gap-6">
				<div className="flex items-center justify-between">
					<span className="text-[14px] text-gray-500 dark:text-gray-400 font-medium">
						Total transactions
					</span>
					<span className="text-[15px] text-gray-900 dark:text-white font-medium">
						{stats.total}
					</span>
				</div>
				<div className="flex items-center justify-between">
					<span className="text-[14px] text-gray-500 dark:text-gray-400 font-medium">
						Largest transaction
					</span>
					<span className="text-[15px] text-gray-900 dark:text-white font-medium">
						${stats.largestTx.toFixed(2)}
					</span>
				</div>
				<div className="flex items-center justify-between">
					<span className="text-[14px] text-gray-500 dark:text-gray-400 font-medium">
						Largest expense
					</span>
					<span className="text-[15px] text-gray-900 dark:text-white font-medium">
						${stats.largestEx.toFixed(2)}
					</span>
				</div>
			</div>
		</div>
	);
}
