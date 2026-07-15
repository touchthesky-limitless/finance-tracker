import { memo, ElementType } from "react";
import { Home, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { BudgetProgress } from "@/components/ui/BudgetProgress";

interface CategoryDataPoint {
	name: string;
	icon?: ElementType;
	value: number;
	color: string;
}

interface TopBudgetsListProps {
	categoryData: CategoryDataPoint[];
	unreviewedCount: number;
}

export const TopBudgetsList = memo(function TopBudgetsList({
	categoryData,
	unreviewedCount,
}: TopBudgetsListProps) {
	const topCategoriesElements = [];
	let catLimit = categoryData.length;
	if (catLimit > 5) {
		catLimit = 5;
	}
	
	for (let i = 0; i < catLimit; i++) {
		const cat = categoryData[i];
		topCategoriesElements.push(
			<BudgetProgress
				key={cat.name}
				icon={cat.icon || Home}
				name={cat.name}
				spent={cat.value}
				limit={cat.value + 200}
				color={cat.color}
			/>,
		);
	}

	return (
		<Card className="@5xl:col-span-1 flex flex-col" title="Top Budgets">
			<div className="flex-1 flex flex-col gap-5 mt-4">
				{categoryData.length > 0 ? (
					topCategoriesElements
				) : (
					<div className="text-sm text-gray-500 italic mt-4 text-center">
						No transactions found.
					</div>
				)}
				{unreviewedCount > 0 && (
					<div className="mt-2 p-3 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-xl flex gap-3 cursor-pointer">
						<AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
						<div>
							<h4 className="text-xs font-bold text-red-700 dark:text-red-400">
								Action Required
							</h4>
							<p className="text-[10px] text-red-600 dark:text-red-300 mt-0.5">
								{unreviewedCount} transactions need review.
							</p>
						</div>
					</div>
				)}
			</div>
		</Card>
	);
});