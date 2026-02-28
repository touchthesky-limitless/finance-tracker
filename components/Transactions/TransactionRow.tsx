import { memo } from "react";
import { CATEGORY_HIERARCHY, getCategoryTheme } from "@/constants/categories";
import { Transaction } from "@/store/createBudgetStore";
import { NeedsReviewBadge } from "@/components/ui/NeedsReviewBadge";
import { CategoryIcon } from "@/components/CategoryIcon";

interface TransactionRowProps {
	transaction: Transaction;
	onUpdate?: () => void;
	onRowClick: (transaction: Transaction) => void;
}

export const TransactionRow = memo(function TransactionRow({
	transaction,
	onRowClick,
}: TransactionRowProps) {
	// Helper to find parent for the color
	const parentName =
		Object.keys(CATEGORY_HIERARCHY).find(
			(parent) =>
				CATEGORY_HIERARCHY[parent].includes(transaction.category) ||
				parent === transaction.category,
		) || "Uncategorized";

	const subCategoryColor = getCategoryTheme(parentName);

	// A transaction needs review if the flag is true
	// OR if the category is just a generic Parent name
	const needsReview =
		transaction.needsSubcat ||
		transaction.needsReview ||
		transaction.category === "Uncategorized" ||
		Object.keys(CATEGORY_HIERARCHY).includes(transaction.category);

	return (
		<tr
			onClick={() => onRowClick(transaction)}
			className="hover:bg-gray-100 dark:hover:bg-gray-800/40 cursor-pointer transition-colors group border-b border-gray-800/30 text-sm"
		>
			{/* 1. DESCRIPTION */}
			<td className="py-4 px-2">
				<div className="flex flex-col">
					<span className="font-medium text-gray-900 dark:text-gray-200 uppercase tracking-tight truncate max-w-75">
						{transaction.description}
					</span>

					{transaction.note && (
						<span className="text-[10px] text-gray-900 dark:text-gray-500 italic truncate max-w-50">
							{transaction.note}
						</span>
					)}
				</div>
			</td>

			{/* 2. Category Column */}
			<td className="py-4 px-2">
				<div className="inline-flex items-center gap-2 px-3 py-1.5">
					<CategoryIcon
						name={transaction.category}
						size={16}
						colorClass={subCategoryColor.text}
					/>
					<span className="text-xs font-medium text-gray-700 dark:text-gray-300">
						{transaction.category}
					</span>
				</div>
			</td>

			{/* 3. AMOUNT */}
			<td
				className={`py-4 px-2 text-right font-bold ${
					transaction.amount < 0
						? "text-slate-900 dark:text-slate-100"
						: "text-emerald-500 dark:text-emerald-400"
				}`}
			>
				{transaction.amount < 0 ? "-" : ""}$
				{Math.abs(transaction.amount).toLocaleString()}
			</td>

			{/* 4. ACCOUNT */}
			<td className="py-4 px-2 text-gray-500 text-xs italic">
				{transaction.account}
			</td>

			{/* 5: Tags Column */}
			<td className="py-4 px-2">
				<span className="text-[10px] text-gray-400 dark:text-gray-600 font-medium uppercase tracking-wider">
					Tags
				</span>
			</td>

			{/* 6: Status Column */}
			<td className="py-4 px-2">
				{needsReview ? (
					<NeedsReviewBadge />
				) : (
					<span className="text-[10px] text-gray-400 dark:text-gray-600 font-medium uppercase tracking-wider">
						Done
					</span>
				)}
			</td>
		</tr>
	);
});
