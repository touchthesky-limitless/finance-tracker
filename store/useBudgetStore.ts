import { supabase } from "@/lib/supabase";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { CATEGORY_HIERARCHY } from "@/constants";

export interface Transaction {
	[key: string]: string | number | boolean | string[] | undefined;
	id: string;
	date: string;
	merchant: string;
	description?: string;
	amount: number;
	category: string;
	account: string;
	needs_review: boolean;
	needs_subcat: boolean;
	user_id?: string;
	created_at?: string;
	tags?: string[];
	note?: string;
}

export interface Rule {
	keyword: string;
	category: string;
	matchCategory?: string;
}

interface BudgetState {
	transactions: Transaction[];
	isLoading: boolean;
	customTags: string[];
	hasHydrated: boolean;
	rules: Rule[];
	toast: { count: number; snapshot: Transaction[] } | null;
	setHasHydrated: (state: boolean) => void;
	setToast: (toast: { count: number; snapshot: Transaction[] } | null) => void;
	saveRule: (rule: Rule, oldKeyword?: string) => Promise<void>;
	deleteRule: (keyword: string) => Promise<void>;
	addCustomTag: (tag: string) => void;
	setLoading: (loading: boolean) => void;
	addTransactions: (newTxs: Transaction[]) => Promise<void>;
	fetchTransactions: () => Promise<void>;
	setTransactions: (txs: Transaction[]) => void;
	clearData: () => void;
	deleteTransaction: (id: string) => Promise<void>;
	updateTransaction: (
		id: string,
		updates: Partial<Transaction>,
	) => Promise<void>;
	getCategoryTotals: () => Record<string, number>;
	undoBulkUpdate: (previousTransactions: Transaction[]) => void;
	bulkDeleteTransactions: (ids: string[]) => Promise<void>;
	undoDelete: (restoredTxs: Transaction[]) => Promise<void>;
}

const applyRulesToTransaction = (
	tx: Transaction,
	rules: Rule[],
): Transaction => {
	const updatedTx = { ...tx };

	// Sort rules by keyword length (descending) so "Amazon Prime" matches before "Amazon"
	const sortedRules = [...rules].sort(
		(a, b) => b.keyword.length - a.keyword.length,
	);

	for (const rule of sortedRules) {
		const nameMatch = updatedTx.merchant
			?.toLowerCase()
			.includes(rule.keyword.toLowerCase());
		const categoryMatch =
			!rule.matchCategory || updatedTx.category === rule.matchCategory;

		if (nameMatch && categoryMatch) {
			updatedTx.category = rule.category;
			updatedTx.needs_review = false;
			updatedTx.needs_subcat = false;
			break; // Stop after first match
		}
	}

	return updatedTx;
};

export const useBudgetStore = create<BudgetState>()(
	persist(
		(set, get) => ({
			transactions: [],
			customTags: [],
			rules: [],
			isLoading: false,
			hasHydrated: false,
			toast: null,

			setToast: (toastValue) => set({ toast: toastValue }),
			setHasHydrated: (state: boolean) => set({ hasHydrated: state }),
			setTransactions: (txs) => set({ transactions: txs }),
			setLoading: (loading) => set({ isLoading: loading }),

			addTransactions: async (newTxs: Transaction[]) => {
				const {
					data: { user },
				} = await supabase.auth.getUser();
				if (!user) return;

				const { rules } = get(); // Get existing rules from the store

				const txsToInsert = newTxs.map((tx) => {
					// --- THE FIX: Apply rules here before sending to DB ---
					const processedTx = applyRulesToTransaction(tx, rules);

					return {
						user_id: user.id,
						date: processedTx.date,
						merchant: processedTx.merchant,
						amount: processedTx.amount,
						category: processedTx.category || "Uncategorized",
						account: processedTx.account,
						description: processedTx.description || "",
						needs_review: processedTx.needs_review ?? true,
						needs_subcat: processedTx.needs_subcat ?? true,
					};
				});

				const { data, error } = await supabase
					.from("transactions")
					.insert(txsToInsert)
					.select();

				if (error) throw error;

				set((state) => ({
					transactions: [...(data as Transaction[]), ...state.transactions],
				}));
			},

			fetchTransactions: async () => {
				const { transactions, isLoading } = get();
				if (transactions.length > 0 || isLoading) return;

				set({ isLoading: true });

				try {
					const {
						data: { user },
					} = await supabase.auth.getUser();
					if (!user) {
						set({ isLoading: false, hasHydrated: true });
						return;
					}

					const [txResponse, rulesResponse] = await Promise.all([
						supabase
							.from("transactions")
							.select("*")
							.order("date", { ascending: false }),
						supabase.from("rules").select("keyword, category, match_category"),
					]);

					// Map snake_case from DB back to camelCase for local state
					const mappedRules: Rule[] = (rulesResponse.data || []).map((r) => ({
						keyword: r.keyword,
						category: r.category,
						matchCategory: r.match_category,
					}));

					set({
						transactions: (txResponse.data as Transaction[]) || [],
						rules: mappedRules,
						isLoading: false,
						hasHydrated: true,
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

				if (oldKeyword && oldKeyword !== newRule.keyword) {
					await supabase.from("rules").delete().eq("keyword", oldKeyword);
				}

				const { error } = await supabase.from("rules").upsert(
					{
						user_id: user.id,
						keyword: newRule.keyword,
						category: newRule.category,
						match_category: newRule.matchCategory,
					},
					{ onConflict: "user_id,keyword" },
				);

				if (error) {
					console.error("Rule Sync Error:", error.message);
					return;
				}

				set((state) => {
					const updatedTransactions = state.transactions.map((tx) => {
						const nameMatches = tx.merchant
							?.toLowerCase()
							.includes(newRule.keyword.toLowerCase());
						const categoryMatches =
							!newRule.matchCategory || tx.category === newRule.matchCategory;

						if (nameMatches && categoryMatches) {
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

					const otherRules = state.rules.filter(
						(r) => r.keyword !== (oldKeyword || newRule.keyword),
					);

					return {
						rules: [...otherRules, newRule],
						transactions: updatedTransactions,
					};
				});
			},

			deleteRule: async (keyword) => {
				const { error } = await supabase
					.from("rules")
					.delete()
					.eq("keyword", keyword);
				if (error) return;
				set((state) => ({
					rules: state.rules.filter((r) => r.keyword !== keyword),
				}));
			},

			updateTransaction: async (id, updates) => {
				set((state) => ({
					transactions: state.transactions.map((t) =>
						t.id === id ? { ...t, ...updates } : t,
					),
				}));

				const { error } = await supabase
					.from("transactions")
					.update(updates)
					.eq("id", id);
				if (error) get().fetchTransactions();
			},

			deleteTransaction: async (id) => {
				set((state) => ({
					transactions: state.transactions.filter((t) => t.id !== id),
				}));
				await supabase.from("transactions").delete().eq("id", id);
			},

			bulkDeleteTransactions: async (ids) => {
				set((state) => ({
					transactions: state.transactions.filter((t) => !ids.includes(t.id)),
				}));
				await supabase.from("transactions").delete().in("id", ids);
			},

			undoDelete: async (restoredTxs) => {
				set((state) => ({
					transactions: [...restoredTxs, ...state.transactions],
				}));
				await supabase.from("transactions").insert(restoredTxs);
			},

			clearData: () => set({ transactions: [], customTags: [], rules: [] }),

			getCategoryTotals: () => {
				const { transactions } = get();
				const totals: Record<string, number> = {};
				transactions.forEach((tx) => {
					if (tx.category === "Income" || tx.category === "Debt payments")
						return;
					const cat = tx.category || "Uncategorized";
					totals[cat] = (totals[cat] || 0) + Math.abs(tx.amount || 0);
				});
				return totals;
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
				state?.setHasHydrated(true);
			},
			storage: createJSONStorage(() => localStorage),
			partialize: (state) => ({
				rules: state.rules,
				customTags: state.customTags,
			}),
		},
	),
);
