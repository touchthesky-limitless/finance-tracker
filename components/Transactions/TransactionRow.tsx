import { CategorySelector } from "@/components/CategorySelector";
import { CATEGORY_HIERARCHY } from "@/constants/categories";
import { useBudgetStore } from "@/hooks/useBudgetStore";
import { Transaction } from "@/store/createBudgetStore";
import { NeedsReviewBadge } from "@/components/ui/NeedsReviewBadge";

interface TransactionRowProps {
	transaction: Transaction;
	onUpdate?: () => void;
	onRowClick: () => void;
}

// interface TransactionRowProps {
//     transaction: Transaction;
//     onUpdate: (id: string, updates: Partial<Transaction>) => void;
//     onRowClick: () => void;
// }

export function TransactionRow({
	transaction,
	onUpdate,
	onRowClick,
}: TransactionRowProps) {
	// 1. Get the store hook
	const useStore = useBudgetStore();

	// 2. Select the update action
	const updateTransaction = useStore((state) => state.updateTransaction);

	// A transaction needs review if the flag is true
	// OR if the category is just a generic Parent name
const needsReview = 
    transaction.needsSubcat || 
    transaction.needsReview || 
    transaction.category === "Uncategorized" || // Add this
    Object.keys(CATEGORY_HIERARCHY).includes(transaction.category);
    console.log("needsReview:",needsReview);
    console.log(`Desc: ${transaction.description} | Cat: ${transaction.category} | NeedsSubcat: ${transaction.needsSubcat}`);

	return (
		<tr
			onClick={onRowClick}
			className="hover:bg-gray-100 dark:hover:bg-gray-800/40 cursor-pointer transition-colors group border-b border-gray-800/30 text-sm"
		>
			{/* 1. DESCRIPTION (Expanded space) */}
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

			<td className="py-4 px-2" onClick={(e) => e.stopPropagation()}>
				<div className="flex items-center">
					<div className="min-w-80">
						<CategorySelector
							currentCategory={transaction.category}
							onSelect={(sub) => {
								//update the transaction in the database
								updateTransaction(transaction.id, { category: sub });
								onUpdate?.();
							}}
						/>
					</div>
                    {needsReview && <NeedsReviewBadge />}
				</div>
			</td>

			{/* 3. AMOUNT */}
			<td
				className={`py-4 px-2 text-right font-bold ${transaction.amount < 0 ? "text-slate-900 dark:text-slate-100" 
        : "text-emerald-500 dark:text-emerald-400"}`}
			>
				{transaction.amount < 0 ? "-" : ""}$
				{Math.abs(transaction.amount).toLocaleString()}
			</td>

			{/* 4. ACCOUNT */}
			<td className="py-4 px-2 text-gray-500 text-xs italic">
				{transaction.account}
			</td>
		</tr>
	);
}
