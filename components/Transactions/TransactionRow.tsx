import { memo } from "react";
import { CATEGORY_HIERARCHY, getCategoryTheme } from "@/constants/categories";
import { Transaction } from "@/store/useBudgetStore";
import { NeedsReviewBadge } from "@/components/ui/NeedsReviewBadge";
import { CategoryIcon } from "@/components/CategoryIcon";

// ==========================================
// 1. GLOBAL CACHE & STATIC HELPERS
// ==========================================
// Move expensive calculations OUTSIDE the component so they don't run 500x per render.
const PARENT_KEYS = Object.keys(CATEGORY_HIERARCHY);
const PARENT_KEY_SET = new Set(PARENT_KEYS); // Set.has() is O(1), much faster than Array.includes()

const categoryCache = new Map<string, string>();

const getParentCategory = (category: string) => {
	// Return cached result instantly if we've seen this category before
	if (categoryCache.has(category)) return categoryCache.get(category)!;

	const parentName =
		PARENT_KEYS.find(
			(parent) =>
				CATEGORY_HIERARCHY[parent].includes(category) || parent === category,
		) || "Uncategorized";

	// Save for next time
	categoryCache.set(category, parentName);
	return parentName;
};

// Instantiating this once is ~10x faster than calling .toLocaleString() in a loop
const numberFormatter = new Intl.NumberFormat("en-US");

interface TransactionRowProps {
	transaction: Transaction;
	onRowClick: (transaction: Transaction) => void;
}

// ==========================================
// 2. THE COMPONENT
// ==========================================
export const TransactionRow = memo(function TransactionRow({
	transaction,
	onRowClick,
}: TransactionRowProps) {
	// Now these lookups are basically instant O(1) reads
	const parentName = getParentCategory(transaction.category);
	const subCategoryColor = getCategoryTheme(parentName);

	const isParentCat = PARENT_KEY_SET.has(transaction.category);
	const isUncategorized = transaction.category === "Uncategorized";

	const needsReview =
		transaction.needs_review || isUncategorized || isParentCat;

	return (
		<tr
			onClick={() => onRowClick(transaction)}
			className="hover:bg-gray-100 dark:hover:bg-gray-800/40 cursor-pointer transition-colors group border-b border-gray-800/30 text-sm"
		>
			{/* 1. Merchant */}
			<td className="py-4 px-2">
				<div className="flex flex-col">
					<span className="font-medium text-gray-900 dark:text-gray-200 uppercase tracking-tight truncate max-w-75">
						{transaction.merchant}
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
				{numberFormatter.format(Math.abs(transaction.amount))}
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
