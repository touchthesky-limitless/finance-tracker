import { supabase } from "@/lib/supabase";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { CATEGORY_HIERARCHY } from "@/constants";
import { CATEGORY_DICTIONARY } from "@/config/categoryDictionary";
import { DEFAULT_CATEGORIES } from "@/config/categoryDictionary";

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

export interface CustomCategory {
	id: string;
	user_id: string;
	name: string;
	parent_name: string | null;
	icon_name: string;
	color_key: string;
	created_at: string;
}

export interface CreditCard {
	id: string;
	name: string;
	issuer: string;
	network: string;
	color: string;
	currency: string;
	multipliers: Record<string, number>;
	image_url?: string;
}

interface BudgetState {
	transactions: Transaction[];
	isLoading: boolean;
	customTags: string[];
	customCategories: CustomCategory[];
	hasHydrated: boolean;
	rules: Rule[];
	toast: { count: number; snapshot: Transaction[] } | null;
	confirmedRecurringMerchants: string[];
	globalCards: CreditCard[];
	walletIds: string[];
	customRates: Record<string, Record<string, number>>;
	preferredCards: Record<string, string>; // Maps Category ID to Card ID
	activeCategoryIds: string[];
	addActiveCategory: (id: string) => void;
	setPreferredCard: (categoryId: string, cardId: string | null) => void;
	fetchCustomCategories: () => Promise<void>;
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
	addCustomCategory: (category: {
		name: string;
		parent?: string;
		icon: string;
		color: string;
	}) => Promise<void>;
	deleteCustomCategory: (id: string) => Promise<void>;
	updateCustomCategory: (
		id: string,
		updates: { name: string; icon: string; color: string },
	) => Promise<void>;
	resetCustomCategories: () => Promise<void>;
	confirmRecurring: (merchantName: string) => void;
	fetchGlobalCards: () => Promise<void>;
	fetchPreferredCards: () => Promise<void>;
	setWalletIds: (ids: string[]) => void;
	setCustomRates: (rates: Record<string, Record<string, number>>) => void;
	fetchActiveCategories: () => Promise<void>;
	removeActiveCategory: (id: string) => void;
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
			customCategories: [],
			rules: [],
			isLoading: false,
			hasHydrated: false,
			toast: null,
			confirmedRecurringMerchants: [],
			globalCards: [],
			preferredCards: {},

			// The state only holds strings now
			activeCategoryIds: DEFAULT_CATEGORIES,

			addActiveCategory: async (categoryId) => {
				const current = get().activeCategoryIds;

				if (current.includes(categoryId)) return;

				const updated = [...current, categoryId];

				// 1. Optimistic Update (UI updates instantly)
				set({ activeCategoryIds: updated });

				try {
					const { data } = await supabase.auth.getSession();
					if (!data.session) return;

					const { error } = await supabase.from("user_preferences").upsert({
						user_id: data.session.user.id,
						active_categories: updated,
					});

					if (error) {
						// 2. Rollback if Supabase fails (Safety Net)
						set({ activeCategoryIds: current });
						console.error("Supabase sync error:", error.message);
					}
				} catch (err) {
					// 2. Rollback on crash
					set({ activeCategoryIds: current });
					console.error("Failed to save category:", err);
				}
			},

			removeActiveCategory: async (categoryId: string) => {
				const current = get().activeCategoryIds;
				const updated = current.filter((id) => id !== categoryId);

				set({ activeCategoryIds: updated });

				const {
					data: { session },
				} = await supabase.auth.getSession();
				if (session) {
					await supabase.from("user_preferences").upsert({
						user_id: session.user.id,
						active_categories: updated,
					});
				}
			},

			fetchActiveCategories: async () => {
				set({ activeCategoryIds: [] });
				const {
					data: { session },
				} = await supabase.auth.getSession();
				if (!session) return;

				const { data, error } = await supabase
					.from("user_preferences")
					.select("active_categories")
					.eq("user_id", session.user.id)
					.single();

				if (error) {
					// If error is because no row exists (PGRST116), that's fine!
					// Otherwise, log it so you know why your app failed to load.
					if (error.code !== "PGRST116") {
						console.error("Error loading categories:", error.message);
					}
					return; // Stop here if there's no data to load
				}

				if (data && data.active_categories) {
					set({ activeCategoryIds: data.active_categories });
				}
			},

			// Put your 20 card IDs here so they are in your wallet by default!
			walletIds: [
				"amex-bce",
				"amex-ed",
				"amex-hilton-aspire",
				"amex-hilton-no-af",
				"amex-bbp",
				"boa-cash-rewards",
				"boa-alaska-biz",
				"c1-vx",
				"chase-csp",
				"chase-cfu",
				"chase-cff",
				"chase-cip",
				"chase-cic",
				"chase-united-biz",
				"citi-custom-cash",
				"citi-aa-biz",
				"citi-aa-plat",
				"discover-it",
				"usbank-triple-cash",
				"wf-signify",
			],
			customRates: {},

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

			fetchGlobalCards: async () => {
				// Make sure you import supabase at the top of the file!
				const { data, error } = await supabase.from("credit_cards").select("*");
				if (!error && data) {
					set({ globalCards: data as CreditCard[] });
				}
			},

			fetchPreferredCards: async () => {
				try {
					// 1. Ask Supabase who is logged in
					const {
						data: { session },
					} = await supabase.auth.getSession();

					// 2. If no user, just exit silently
					if (!session) return;

					// 3. Fetch their specific row from the database
					const { data, error } = await supabase
						.from("user_preferences")
						.select("preferred_cards")
						.eq("user_id", session.user.id)
						.single(); // .single() because each user only has one row

					// 4. Handle errors (Ignore PGRST116, which just means "User has no row yet")
					if (error && error.code !== "PGRST116") {
						console.error("Error fetching preferences:", error.message);
						return;
					}

					// 5. If data exists, inject it into the Zustand store
					if (data && data.preferred_cards) {
						set({ preferredCards: data.preferred_cards });
					}
				} catch (err) {
					console.error("Failed to fetch preferences:", err);
				}
			},

			// The UI will call this to build the Bento Box
			getVisibleCategories: () => {
				const { activeCategoryIds } = get();
				// Reattach the icons and colors right before rendering
				return CATEGORY_DICTIONARY.filter((cat) =>
					activeCategoryIds.includes(cat.id),
				);
			},

			setWalletIds: (ids) => set({ walletIds: ids }),
			setCustomRates: (rates) => set({ customRates: rates }),
			setPreferredCard: async (categoryId, cardId) => {
				// 1. Get the current state
				const currentState = get().preferredCards;
				const updated = { ...currentState };

				// 2. Apply your existing logic
				if (cardId === null) {
					delete updated[categoryId]; // Un-starring
				} else {
					updated[categoryId] = cardId; // Starring
				}

				// 3. Update the UI instantly (Optimistic UI update)
				set({ preferredCards: updated });

				// 4. Persist to Supabase in the background
				try {
					// A. Ask Supabase who is currently logged in
					const {
						data: { session },
					} = await supabase.auth.getSession();

					// B. If nobody is logged in, stop here so we don't crash the database
					if (!session) {
						console.error("Cannot save: No user is logged in.");
						return;
					}

					// C. Grab their real, unique ID
					const activeUserId = session.user.id;

					// D. Save the data attached to their real ID
					const { error } = await supabase.from("user_preferences").upsert({
						user_id: activeUserId,
						preferred_cards: updated,
					});

					if (error) {
						console.error("Supabase update error:", error.message);
					}
				} catch (err) {
					console.error("Failed to sync preferred cards:", err);
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

			addCustomCategory: async (category) => {
				// 1. Get the current user
				const {
					data: { user },
				} = await supabase.auth.getUser();
				if (!user) return;

				// Get existing categories from the current store state
				const existing = get().customCategories;

				if (
					existing.some(
						(c) => c.name.toLowerCase() === category.name.toLowerCase(),
					)
				) {
					throw new Error("Category already exists");
				}

				// 2. Insert into your Supabase table
				const { data, error } = await supabase
					.from("custom_categories")
					.insert({
						user_id: user.id,
						name: category.name,
						parent_name: category.parent || null,
						icon_name: category.icon,
						color_key: category.color,
					})
					.select()
					.single(); //Get the created row back

				if (error) {
					console.error("Error adding category:", error);
					throw error;
				}

				// Update local state so the UI re-renders immediately
				if (data) {
					set((state) => ({
						customCategories: [
							...state.customCategories,
							data as CustomCategory,
						],
					}));
				}

				// 3. Optional: Trigger a re-fetch or manually update local state
				// If you want the UI to update immediately without a refresh,
				// you would merge this new data into your local hierarchy here.
				// console.log("Category added successfully:", data);
			},

			fetchCustomCategories: async () => {
				const { data, error } = await supabase
					.from("custom_categories")
					.select("*")
					.order("created_at", { ascending: true });

				if (!error && data) {
					set({ customCategories: data as CustomCategory[] });
				}

				if (error) {
					console.error("Error fetching categories:", error);
					return;
				}
			},

			deleteCustomCategory: async (id) => {
				const { error } = await supabase
					.from("custom_categories")
					.delete()
					.eq("id", id);

				if (error) throw error;

				// Update local state to remove the item
				set((state) => ({
					customCategories: state.customCategories.filter(
						(cat) => cat.id !== id,
					),
				}));
			},

			updateCustomCategory: async (id, updates) => {
				const { error } = await supabase
					.from("custom_categories")
					.update({
						name: updates.name,
						icon_name: updates.icon,
						color_key: updates.color,
					})
					.eq("id", id);

				if (error) throw error;

				// Update local state immediately
				set((state) => ({
					customCategories: state.customCategories.map((cat) =>
						cat.id === id
							? {
									...cat,
									...updates,
									icon_name: updates.icon,
									color_key: updates.color,
								}
							: cat,
					),
				}));
			},

			resetCustomCategories: async () => {
				// 1. Delete from Supabase
				const { error } = await supabase
					.from("custom_categories")
					.delete()
					.neq("id", "00000000-0000-0000-0000-000000000000"); // Standard way to delete all rows

				if (error) throw error;

				// 2. Clear local state
				set({ customCategories: [] });
			},

			confirmRecurring: (name: string) =>
				set((state) => ({
					confirmedRecurringMerchants: [
						...state.confirmedRecurringMerchants,
						name,
					],
				})),
		}),
		{
			name: `budget-storage`,
			version: 1,
			storage: createJSONStorage(() => localStorage), // Use localStorage
			onRehydrateStorage: () => (state) => {
				// Sets hydration to true once data is loaded from disk
				state?.setHasHydrated(true);
				//FORCE a fetch from Supabase whenever the app rehydrates
				state?.fetchActiveCategories();
			},
			// Optional: Only persist specific fields
			partialize: (state) => ({
				rules: state.rules,
				customTags: state.customTags,
				customCategories: state.customCategories,
				walletIds: state.walletIds,
				customRates: state.customRates,
				preferredCards: state.preferredCards,
			}),
		},
	),
);
