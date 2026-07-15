"use client";

import { memo, useMemo } from "react";
import { CATEGORY_HIERARCHY, getCategoryTheme } from "@/constants/categories";
import { Transaction } from "@/store/useBudgetStore";
import { NeedsReviewBadge } from "@/components/ui/NeedsReviewBadge";
import { CategoryIcon } from "@/components/CategoryIcon";
import { useUnifiedCategories } from "@/hooks/useUnifiedCategories";

// ==========================================
// 1. GLOBAL CACHE & STATIC HELPERS
// ==========================================
const PARENT_KEYS = Object.keys(CATEGORY_HIERARCHY);
const PARENT_KEY_SET = new Set(PARENT_KEYS);

const numberFormatter = new Intl.NumberFormat("en-US");

interface TransactionRowProps {
	transaction: Transaction;
	onRowClick: (transaction: Transaction) => void;
	isSelected?: boolean;
	onSelect?: (id: string, e: React.MouseEvent) => void;
}

// ==========================================
// 2. THE COMPONENT
// ==========================================
export const TransactionRow = memo(function TransactionRow({
	transaction,
	onRowClick,
	isSelected,
	onSelect,
}: TransactionRowProps) {
	const { allUnifiedCategories } = useUnifiedCategories("Expense", "All");

	const categoryData = useMemo(() => {
		const transactionCatName = transaction.category.toLowerCase();
		return allUnifiedCategories.find(
			(cat) => cat.name.toLowerCase() === transactionCatName,
		);
	}, [allUnifiedCategories, transaction.category]);

	const theme = categoryData?.theme || getCategoryTheme("Uncategorized");
	const iconName = categoryData?.icon || "HelpCircle";
	const isParentCat = PARENT_KEY_SET.has(transaction.category);
	const isUncategorized = transaction.category === "Uncategorized";

	const needsReview =
		transaction.needs_review || isUncategorized || isParentCat;

	// Enforce 10-character limit
	// let displayMerchant = transaction.merchant;
	// if (displayMerchant.length > 10) {
	// 	displayMerchant = displayMerchant.substring(0, 10) + "...";
	// }

	const isExpense = transaction.amount < 0;
	const amountColor = isExpense
		? "text-slate-900 dark:text-slate-100"
		: "text-emerald-500 dark:text-emerald-400";
	const formattedAmount = `${isExpense ? "-" : ""}$${numberFormatter.format(
		Math.abs(transaction.amount),
	)}`;

	const displayAccount =
		transaction.account?.length > 10
			? `${transaction.account.substring(0, 10)}...`
			: transaction.account;

	return (
		<tr
			onClick={() => onRowClick(transaction)}
			className={`hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-colors group border-b border-gray-100 dark:border-white/5 text-sm ${
				isSelected ? "bg-orange-50/50 dark:bg-orange-500/10" : ""
			}`}
		>
			{/* --- CHECKBOX CELL --- */}
			<td className="py-4 pl-2 md:pl-3 pr-0 w-8">
				<div
					onClick={(e) => {
						e.stopPropagation();
						if (onSelect) onSelect(transaction.id, e);
					}}
					className={`w-4 h-4 rounded border flex items-center justify-center transition-all cursor-pointer ${
						isSelected
							? "bg-orange-600 border-orange-600"
							: "border-gray-300 dark:border-gray-600 group-hover:border-orange-500"
					}`}
				>
					{isSelected && (
						<svg
							className="w-3 h-3 text-white"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={3}
								d="M5 13l4 4L19 7"
							/>
						</svg>
					)}
				</div>
			</td>

			{/* 1. Merchant */}
			<td className="py-4 pl-0 pr-2 align-middle">
				<div className="flex flex-col min-w-0 w-full">
					<span className="block w-full font-medium text-xs md:text-sm text-gray-900 dark:text-gray-200 uppercase tracking-tight truncate">
						{transaction.merchant}
					</span>
					{transaction.note && (
						<span className="block w-full text-[10px] text-gray-900 dark:text-gray-500 italic truncate">
							{transaction.note}
						</span>
					)}
				</div>
			</td>

			{/* 2. Category Column */}
			<td className="py-4 px-2">
				<div className="inline-flex items-center gap-2 px-3 py-1.5">
					<CategoryIcon name={iconName} size={16} colorClass={theme.text} />
					<span className="text-xs font-medium text-gray-700 dark:text-gray-300">
						{transaction.category}
					</span>
				</div>
			</td>

			{/* 3. AMOUNT */}
			<td className={`py-4 px-2 text-left font-bold ${amountColor}`}>
				{formattedAmount}
			</td>

			{/* 4. ACCOUNT */}
			<td className="py-4 px-2 text-gray-500 text-xs italic">
				{displayAccount}
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
