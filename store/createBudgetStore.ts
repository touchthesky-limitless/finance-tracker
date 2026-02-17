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
	rules: { keyword: string; category: string }[];
	saveRule: (rule: { keyword: string; category: string }) => void;
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
				rules: [],
				isLoading: true,

				// Rules - FUTURE TRANSACTIONS: Process them before they enter the state
				// For manual "Add"
				addTransactions: (newTxs) => {
					const currentRules = get().rules; // Get current rules from state
					console.log("Processing with rules 1111:", currentRules);
					const processedTxs = newTxs.map((tx) => {
						// Look for a rule where the description contains the keyword
						const matchingRule = currentRules.find((rule) =>
							tx.description.toLowerCase().includes(rule.keyword.toLowerCase()),
						);
						console.log("matchingRule:", matchingRule);
						if (matchingRule) {
							return {
								...tx,
								category: matchingRule.category,
								needsReview: false,
								needsSubcat: false,
							};
						}
						return tx;
					});

                    console.log("New Transaction Description:", newTxs[0].description);
					set((state) => ({
						transactions: [...state.transactions, ...processedTxs],
					}));
				},

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

				// RETROACTIVE: Apply rule to existing data when created
				saveRule: (newRule) => {
					set((state) => {
						const updatedRules = [...state.rules, newRule];

						// Apply this new rule to all existing transactions immediately
						const updatedTransactions = state.transactions.map((tx) => {
							if (
								tx.description
									.toLowerCase()
									.includes(newRule.keyword.toLowerCase())
							) {
								return {
									...tx,
									category: newRule.category,
									needsReview: false,
									needsSubcat: false,
								};
							}
							return tx;
						});

						return {
							rules: updatedRules,
							transactions: updatedTransactions,
						};
					});
				},
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
