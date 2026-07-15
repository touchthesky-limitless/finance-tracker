import { memo } from "react";
import { AlertCircle } from "lucide-react";

interface ActionRowProps {
	day: string;
	month: string;
	title: string;
	subtitle: string;
	amount: string;
	status: "upcoming" | "alert";
}

export const ActionRow = memo(function ActionRow({
	day,
	month,
	title,
	subtitle,
	amount,
	status,
}: ActionRowProps) {
	return (
		<div className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-[#1a1a1a] rounded-xl cursor-pointer group transition-colors gap-2">
			<div className="flex items-center gap-4 min-w-0">
				<div
					className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl border shrink-0 ${status === "alert" ? "bg-red-50 border-red-100 dark:bg-red-500/10 dark:border-red-500/20 text-red-600" : "bg-white border-gray-200 dark:bg-[#121212] dark:border-gray-800 text-gray-900 dark:text-white"}`}
				>
					{status === "alert" ? (
						<AlertCircle size={20} />
					) : (
						<>
							<span className="text-[10px] font-bold uppercase leading-none mb-0.5">
								{month}
							</span>
							<span className="text-sm font-black leading-none">{day}</span>
						</>
					)}
				</div>
				<div className="truncate">
					<h4 className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-orange-500 transition-colors truncate">
						{title}
					</h4>
					<p className="text-xs text-gray-500 font-medium mt-0.5 truncate">{subtitle}</p>
				</div>
			</div>
			<div
				className={`text-sm @2xl:text-base font-bold shrink-0 ${status === "alert" ? "text-orange-500" : "text-gray-900 dark:text-white"}`}
			>
				{amount}
			</div>
		</div>
	);
});