import { supabase } from "@/lib/supabase";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { CATEGORY_HIERARCHY } from "@/constants";

export interface Transaction {
	[key: string]: string | number | boolean | string[] | undefined;
	id: string;
	date: string; // Matches SQL 'date'
	merchant: string; // Matches SQL 'merchant'
	description?: string; // Matches SQL 'description' (Optional Note)
	amount: number; // Matches SQL 'amount'
	category: string; // Matches SQL 'category'
	account: string; // Matches SQL 'account'

	// UI State Flags (Aligned with SQL snake_case)
	needs_review: boolean;
	needs_subcat: boolean;

	// Metadata (Optional in TS, handled by DB)
	user_id?: string;
	created_at?: string;

	// App-specific (Not currently in your SQL schema)
	tags?: string[];
	note?: string;
}

interface BudgetState {
	transactions: Transaction[];
	isLoading: boolean;
	customTags: string[];
	hasHydrated: boolean;
	rules: { keyword: string; category: string }[];
	toast: { count: number; snapshot: Transaction[] } | null;
	setHasHydrated: (state: boolean) => void;
	setToast: (toast: { count: number; snapshot: Transaction[] } | null) => void;
	saveRule: (
		rule: { keyword: string; category: string },
		oldKeyword?: string,
	) => void;
	deleteRule: (keyword: string) => void;
	addCustomTag: (tag: string) => void;
	setLoading: (loading: boolean) => void;
	addTransactions: (newTxs: Transaction[]) => Promise<void>;
	fetchTransactions: () => Promise<void>;
	setTransactions: (txs: Transaction[]) => void;
	clearData: () => void;
	deleteTransaction: (id: string) => void;
	updateTransaction: (id: string, updates: Partial<Transaction>) => void;
	getCategoryTotals: () => Record<string, number>;
	undoBulkUpdate: (previousTransactions: Transaction[]) => void;
}

export const useBudgetStore = create<BudgetState>()(
	persist(
		(set, get) => ({
			transactions: [],
			customTags: [],
			rules: [],
			isLoading: false,
			hasHydrated: false,
			toast: null,
			// setToast: (toast) => set({ toast }),
			setToast: (toastValue) => {
				// console.log("🚀 Store is receiving toast data:", toastValue);
				set({ toast: toastValue });
			},

			setHasHydrated: (state: boolean) => set({ hasHydrated: state }),

			addTransactions: async (newTxs: Transaction[]) => {
				// 1. Get the current user
				const {
					data: { user },
				} = await supabase.auth.getUser();

				if (!user) {
					console.error("Auth required to add transactions");
					return;
				}

				// 2. Map local transactions to match SQL columns (snake_case)
				const txsToInsert = newTxs.map((tx) => ({
					user_id: user.id,
					date: tx.date,
					merchant: tx.merchant,
					amount: tx.amount,
					category: tx.category || "Uncategorized",
					account: tx.account,
					description: tx.description || "",
					needs_review: tx.needs_review ?? true,
					needs_subcat: tx.needs_subcat ?? true,
				}));

				// 3. Push to Supabase
				const { data, error } = await supabase
					.from("transactions")
					.insert(txsToInsert)
					.select(); // Returns the created rows with their new DB IDs

				if (error) {
					console.error("Supabase Insert Error:", error.message);
					throw error;
				}

				// 4. Update the local Zustand state with the DB-confirmed data
				set((state) => ({
					transactions: [...(data as Transaction[]), ...state.transactions],
				}));
			},

			setTransactions: (txs) => set({ transactions: txs }),

			fetchTransactions: async () => {
				// 1. SILENT ABORT: Check state BEFORE calling set({ isLoading: true })
				// This prevents a wasted re-render when navigating between pages.
				const { transactions, isLoading } = get();
				if (transactions.length > 0 || isLoading) return;

				// 2. START FETCH: Now we notify the UI to show the Shimmer
				set({ isLoading: true });

				try {
					// Use getSession() instead of getUser() if you want it even faster (reads from cookie)
					const {
						data: { user },
					} = await supabase.auth.getUser();

					if (!user) {
						set({ isLoading: false, hasHydrated: true });
						return;
					}

					// 3. PARALLEL FETCH: Keep your Promise.all, it's efficient.
					const [txResponse, rulesResponse] = await Promise.all([
						supabase
							.from("transactions")
							.select("*")
							.order("date", { ascending: false }),
						supabase.from("rules").select("keyword, category"),
					]);

					// 4. BATCHED UPDATE: Final state change
					set({
						transactions: (txResponse.data as Transaction[]) || [],
						rules: rulesResponse.data || [],
						isLoading: false,
						hasHydrated: true, // Mark as finished for the Global Shimmer
					});
				} catch (error) {
					console.error("Fetch Error:", error);
					set({ isLoading: false, hasHydrated: true });
				}
			},

			saveRule: async (newRule, oldKeyword) => {
				const {
					data: { user },
				} = await supabase.auth.getUser();
				if (!user) return;

				// 1. Sync to Supabase (Upsert based on keyword)
				// If oldKeyword exists, we delete the old one first to handle renames
				if (oldKeyword && oldKeyword !== newRule.keyword) {
					await supabase.from("rules").delete().eq("keyword", oldKeyword);
				}

				const { error } = await supabase.from("rules").upsert(
					{
						user_id: user.id,
						keyword: newRule.keyword,
						category: newRule.category,
					},
					{ onConflict: "user_id,keyword" },
				);

				if (error) {
					console.error("Rule Sync Error:", error.message);
					return;
				}

				// 2. Update local state (keep your existing logic for retroactive transaction updates)
				set((state) => {
					const rules = state.rules || [];
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
						updatedRules[targetIndex] = newRule;
					} else {
						updatedRules = [...rules, newRule];
					}

					const updatedTransactions = state.transactions.map((tx) => {
						if (
							tx.merchant?.toLowerCase().includes(newRule.keyword.toLowerCase())
						) {
							const isGenericParent =
								Object.keys(CATEGORY_HIERARCHY).includes(newRule.category) ||
								newRule.category === "Uncategorized";
							return {
								...tx,
								category: newRule.category,
								needs_subcat: isGenericParent,
								needs_review: isGenericParent,
							};
						}
						return tx;
					});

					return { rules: updatedRules, transactions: updatedTransactions };
				});
			},

			deleteRule: async (keyword) => {
				// 1. Sync to Supabase
				const { error } = await supabase
					.from("rules")
					.delete()
					.eq("keyword", keyword);

				if (error) {
					console.error("Delete Rule Error:", error.message);
					return;
				}

				// 2. Update local state
				set((state) => ({
					rules: state.rules.filter((r) => r.keyword !== keyword),
				}));
			},

			updateTransaction: async (id: string, updates: Partial<Transaction>) => {
				// 1. Optimistic Update (Optional: updates UI immediately)
				set((state) => ({
					transactions: state.transactions.map((t) =>
						t.id === id ? { ...t, ...updates } : t,
					),
				}));

				// 2. Sync to Supabase
				const { error } = await supabase
					.from("transactions")
					.update(updates)
					.eq("id", id);

				if (error) {
					// Optional: Re-fetch on error to sync state
					get().fetchTransactions();
				}
			},

			deleteTransaction: async (id: string) => {
				// 1. Local Update
				set((state) => ({
					transactions: state.transactions.filter((t) => t.id !== id),
				}));

				// 2. Cloud Update
				const { error } = await supabase
					.from("transactions")
					.delete()
					.eq("id", id);

				if (error) console.error("Deletion failed:", error.message);
			},

			clearData: () => set({ transactions: [], customTags: [], rules: [] }),

			setLoading: (loading) => set({ isLoading: loading }),

			getCategoryTotals: () => {
				const { transactions } = get();
				const totals: Record<string, number> = {};

				transactions.forEach((tx) => {
					// We only want to chart "Spending" (Negative numbers)
					// Skip Income or Debt Payments for a pure Spending Chart
					if (tx.category === "Income" || tx.category === "Debt payments")
						return;

					const cat = tx.category || "Uncategorized";

					// Use Math.abs to turn -50.00 into 50.00 for the chart
					const amount = Math.abs(tx.amount || 0);

					totals[cat] = (totals[cat] || 0) + amount;
				});
				return totals;
			},

			getNetCashFlow: () => {
				const { transactions } = get();
				return transactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);
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
			name: `budget-storage`,
			onRehydrateStorage: () => (state) => {
                // This runs as soon as localStorage is read
                state?.setHasHydrated(true);
            },
			storage: createJSONStorage(() => localStorage),
			// 3. Optional: Only persist rules and tags, let Supabase handle transactions
			partialize: (state) => ({
				rules: state.rules,
				customTags: state.customTags,
			}),
		},
	),
);
