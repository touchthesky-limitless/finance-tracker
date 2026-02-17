import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface Transaction {
	[key: string]: string | number | boolean | string[] | undefined;
	id: string;
	date: string;
	description: string;
	amount: number;
	category: string;
	account: string;
	tags?: string[];
	note?: string;
	needsReview?: boolean;
	needsSubcat?: boolean;
}

interface BudgetState {
	transactions: Transaction[];
	isLoading: boolean;
	customTags: string[];
	addCustomTag: (tag: string) => void;
	setLoading: (loading: boolean) => void;
	addTransactions: (newTxs: Transaction[]) => void;
	clearData: () => void;
	deleteTransaction: (id: string) => void;
	updateTransaction: (id: string, updates: Partial<Transaction>) => void;
	getCategoryTotals: () => Record<string, number>;
	undoBulkUpdate: (previousTransactions: Transaction[]) => void;
}

export const createBudgetStore = (versionKey: string) =>
	create<BudgetState>()(
		persist(
			(set, get) => ({
				transactions: [],
				customTags: [],
				isLoading: true,

				// For manual "Add"
				addTransactions: (newTxs) =>
					set((state) => ({
						transactions: [...state.transactions, ...newTxs],
					})),

				// For "Edit" - logic to update and clear flags
				updateTransaction: (id, updates) =>
					set((state) => ({
						transactions: state.transactions.map((t) =>
							t.id === id
								? {
										...t,
										...updates,
										// Automatically clear review flags when any update is made
										// (Or you can wrap this in an 'if' to check if updates.category exists)
										needsReview: false,
										needsSubcat: false,
									}
								: t,
						),
					})),

				//only want the badge to disappear when the category is changed
				// (and not just for notes or tags), you can do this:
				// updateTransaction: (id, updates) =>
				//     set((state) => ({
				//         transactions: state.transactions.map((t) => {
				//             if (t.id !== id) return t;

				//             const isCategoryUpdate = !!updates.category;
				//             return {
				//                 ...t,
				//                 ...updates,
				//                 needsReview: isCategoryUpdate ? false : t.needsReview,
				//                 needsSubcat: isCategoryUpdate ? false : t.needsSubcat,
				//             };
				//         }),
				//     })),

				deleteTransaction: (id) =>
					set((state) => ({
						transactions: state.transactions.filter((t) => t.id !== id),
					})),

				clearData: () => set({ transactions: [], customTags: [] }),

				setLoading: (loading) => set({ isLoading: loading }),

				getCategoryTotals: () => {
					const { transactions } = get();
					return transactions.reduce(
						(acc, tx) => {
							const cat = tx.category || "Uncategorized";
							acc[cat] = (acc[cat] || 0) + tx.amount;
							return acc;
						},
						{} as Record<string, number>,
					);
				},

				addCustomTag: (tag) =>
					set((state) => ({
						customTags: state.customTags.includes(tag)
							? state.customTags
							: [...state.customTags, tag],
					})),

				undoBulkUpdate: (previousTransactions) =>
					set({ transactions: previousTransactions }),
			}),
			{
				// 2. Use the versionKey to keep Simple and Advanced data separate
				name: `budget-storage-${versionKey}`,
				storage: createJSONStorage(() => localStorage),
				onRehydrateStorage: () => (state) => {
					state?.setLoading(false);
				},
			},
		),
	);
