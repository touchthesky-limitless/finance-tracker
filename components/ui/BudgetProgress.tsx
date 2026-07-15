import { memo, ElementType } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/utils/formatters";

interface BudgetProgressProps {
	icon: ElementType;
	name: string;
	spent: number;
	limit: number;
	color: string;
}

export const BudgetProgress = memo(function BudgetProgress({
	icon: Icon,
	name,
	spent,
	limit,
	color,
}: BudgetProgressProps) {
	const router = useRouter();
	
	let percentage = 0;
	if (limit > 0) {
		percentage = Math.min((spent / limit) * 100, 100);
	}
	const isWarning = percentage > 90;

	const handleClick = () => {
		router.push(`/budget/transactions?category=${encodeURIComponent(name)}`);
	};

	return (
		<div
			onClick={handleClick}
			className="group cursor-pointer p-2 -m-2 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-all active:scale-[0.98]"
		>
			<div className="flex justify-between items-center mb-2 gap-2">
				<div className="flex items-center gap-2 truncate">
					<div
						className={`p-1.5 rounded-md text-white shadow-sm transition-transform group-hover:scale-110 shrink-0 ${color}`}
					>
						<Icon size={12} />
					</div>
					<span className="text-sm font-black text-gray-900 dark:text-white group-hover:text-orange-500 transition-colors truncate">
						{name}
					</span>
				</div>
				<div className="text-xs shrink-0">
					<span className="font-mono tabular-nums font-bold text-gray-900 dark:text-white">
						{formatCurrency(spent)}
					</span>
					<span className="font-mono tabular-nums text-gray-400 font-medium">
						{" "}
						/ {formatCurrency(limit)}
					</span>
				</div>
			</div>
			<div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden border border-transparent group-hover:border-white/5">
				<div
					className={`h-full rounded-full transition-all duration-700 ease-out ${isWarning ? "bg-red-500" : color}`}
					style={{ width: `${percentage}%` }}
				/>
			</div>
		</div>
	);
});