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
	toast: { count: number; snapshot: Transaction[] } | null;
	setToast: (toast: { count: number; snapshot: Transaction[] } | null) => void;
	saveRule: (
		rule: { keyword: string; category: string },
		oldKeyword?: string,
	) => void;
	deleteRule: (keyword: string) => void;
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
				toast: null,
				// setToast: (toast) => set({ toast }),
				setToast: (toastValue) => {
					// console.log("🚀 Store is receiving toast data:", toastValue);
					set({ toast: toastValue });
				},

				addTransactions: (newTxs) => {
					// const currentRules = get().rules || []; // Defensive check
					const currentRules = [...get().rules].sort(
						(a, b) => b.keyword.length - a.keyword.length,
					);

					const processedTxs = newTxs.map((tx) => {
						// Ensure description exists before calling toLowerCase
						const desc = tx.description?.toLowerCase() || "";

						// Because we sorted by length, "Starbucks Coffee" will match before "Starbucks"
						const matchingRule = currentRules.find((rule) =>
							desc.includes(rule.keyword.toLowerCase()),
						);

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

					set((state) => ({
						transactions: [...state.transactions, ...processedTxs],
					}));
				},

				saveRule: (newRule, oldKeyword) => {
					set((state) => {
						const rules = state.rules || [];

						// Update: 1. Find the target index -
						// If we have oldKeyword, we look for that (renaming).
						// Otherwise, we look for newRule.keyword (updating category).
						const targetIndex = oldKeyword
							? rules.findIndex(
									(r) => r.keyword.toLowerCase() === oldKeyword.toLowerCase(),
								)
							: rules.findIndex(
									(r) =>
										r.keyword.toLowerCase() === newRule.keyword.toLowerCase(),
								);

						let updatedRules = [...rules];
						if (targetIndex > -1) {
							// REPLACE: Update or rename existing rule
							updatedRules[targetIndex] = newRule;
						} else {
							// ADD: Brand new rule
							updatedRules = [...rules, newRule];
						}

						// Retroactive update for transactions
						const updatedTransactions = state.transactions.map((tx) => {
							if (
								tx.description
									?.toLowerCase()
									.includes(newRule.keyword.toLowerCase())
							) {
								return {
									...tx,
									category: newRule.category,
									needsReview: false,
								};
							}
							return tx;
						});

						return { rules: updatedRules, transactions: updatedTransactions };
					});
				},

				deleteRule: (keyword) => {
					set((state) => ({
						rules: state.rules.filter((r) => r.keyword !== keyword),
					}));
				},

				// ... (Rest of your functions: updateTransaction, deleteTransaction, etc.)
				updateTransaction: (id, updates) =>
					set((state) => ({
						transactions: state.transactions.map((t) =>
							t.id === id
								? { ...t, ...updates, needsReview: false, needsSubcat: false }
								: t,
						),
					})),

				deleteTransaction: (id) =>
					set((state) => ({
						transactions: state.transactions.filter((t) => t.id !== id),
					})),

				clearData: () => set({ transactions: [], customTags: [], rules: [] }),

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
				name: `budget-storage-${versionKey}`,
				storage: createJSONStorage(() => localStorage),
				onRehydrateStorage: () => (state) => {
					state?.setLoading(false);
				},
			},
		),
	);
