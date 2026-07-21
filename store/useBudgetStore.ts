import {
	CATEGORY_DICTIONARY,
	DEFAULT_CATEGORIES,
	type CategoryId,
} from "@/config/categoryDictionary";
import { CATEGORY_HIERARCHY } from "@/constants";
import { createClient } from "@/lib/supabase";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

const supabase = createClient();

const TRANSACTION_COLUMNS =
	"id, user_id, date, merchant, merchant_id, description, amount, category, account_id, account, needs_review, needs_subcat, created_at";
const CUSTOM_CATEGORY_COLUMNS =
	"id, user_id, name, parent_name, icon_name, color_key, created_at, is_system";
const DATABASE_BATCH_SIZE = 100;

const DEFAULT_WALLET_IDS = [
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
];

const normalize = (value?: string | null): string => {
	return value?.trim().toLowerCase() ?? "";
};

const BUILT_IN_CATEGORY_NAMES = new Set<string>();
const GENERIC_CATEGORY_NAMES = new Set<string>([normalize("Uncategorized")]);

for (const [parent, children] of Object.entries(CATEGORY_HIERARCHY)) {
	BUILT_IN_CATEGORY_NAMES.add(normalize(parent));
	GENERIC_CATEGORY_NAMES.add(normalize(parent));

	for (const child of children) {
		BUILT_IN_CATEGORY_NAMES.add(normalize(child));
	}
}

const CATEGORY_BY_ID = new Map(
	CATEGORY_DICTIONARY.map((category) => {
		return [category.id, category] as const;
	}),
);

export interface Transaction {
	id: string;
	date: string;
	merchant: string;
	merchant_id?: string | null;
	description?: string;
	amount: number;
	category: string;
	account: string;
	account_id?: string | null;
	needs_review: boolean;
	needs_subcat: boolean;
	user_id?: string;
	created_at?: string;
	tags?: string[];
	note?: string;
}

export interface Account {
	id: string;
	user_id: string;
	name: string;
	created_at: string;
}

export type TransactionUpdate = Partial<
	Pick<
		Transaction,
		| "date"
		| "merchant"
		| "merchant_id"
		| "description"
		| "amount"
		| "category"
		| "account"
		| "account_id"
		| "needs_review"
		| "needs_subcat"
	>
>;

interface TransactionFingerprintInput {
	date: string;
	merchant: string;
	amount: number;
	description?: string | null;
	account?: string | null;
	account_id?: string | null;
}

const getTransactionFingerprint = (
	transaction: TransactionFingerprintInput,
): string => {
	return [
		transaction.account_id ?? normalize(transaction.account),
		transaction.date,
		normalize(transaction.merchant),
		Number(transaction.amount).toFixed(2),
		normalize(transaction.description),
	].join("\u001f");
};

export interface Rule {
	keyword: string;
	category: string;
	matchCategory?: string;
}

export interface CustomCategory {
	id: string;
	user_id: string | null;
	name: string;
	parent_name: string | null;
	icon_name: string | null;
	color_key: string | null;
	created_at: string;
	is_system: boolean;
}

export interface Merchant {
	id: string;
	user_id: string | null;
	name: string;
	is_system: boolean;
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
	preferredCards: Record<string, string>;
	activeCategoryIds: CategoryId[];
	accounts: Account[];

	addActiveCategory: (id: CategoryId) => Promise<void>;
	removeActiveCategory: (id: CategoryId) => Promise<void>;
	reorderActiveCategories: (newOrder: CategoryId[]) => Promise<void>;
	fetchActiveCategories: () => Promise<void>;
	setPreferredCard: (
		categoryId: string,
		cardId: string | null,
	) => Promise<void>;
	fetchPreferredCards: () => Promise<void>;

	setHasHydrated: (state: boolean) => void;
	setToast: (toast: { count: number; snapshot: Transaction[] } | null) => void;
	setLoading: (loading: boolean) => void;
	setTransactions: (transactions: Transaction[]) => void;
	clearData: () => void;

	addTransactions: (transactions: Transaction[]) => Promise<void>;
	fetchTransactions: (force?: boolean) => Promise<void>;
	updateTransaction: (id: string, updates: TransactionUpdate) => Promise<void>;
	deleteTransaction: (id: string) => Promise<void>;
	bulkDeleteTransactions: (ids: string[]) => Promise<void>;
	undoDelete: (transactions: Transaction[]) => Promise<void>;
	undoBulkUpdate: (previousTransactions: Transaction[]) => void;
	getCategoryTotals: () => Record<string, number>;

	saveRule: (rule: Rule, oldKeyword?: string) => Promise<void>;
	deleteRule: (keyword: string) => Promise<void>;

	addCustomTag: (tag: string) => void;
	fetchCustomCategories: () => Promise<void>;
	addCustomCategory: (category: {
		name: string;
		parent?: string;
		icon: string;
		color: string;
	}) => Promise<CustomCategory>;
	deleteCustomCategory: (id: string) => Promise<void>;
	updateCustomCategory: (
		id: string,
		updates: { name: string; icon: string; color: string },
	) => Promise<void>;
	resetCustomCategories: () => Promise<void>;

	confirmRecurring: (merchantName: string) => void;
	fetchGlobalCards: (force?: boolean) => Promise<void>;
	getVisibleCategories: () => (typeof CATEGORY_DICTIONARY)[number][];
	setWalletIds: (ids: string[]) => void;
	setCustomRates: (rates: Record<string, Record<string, number>>) => void;

	fetchAccounts: (force?: boolean) => Promise<void>;

	merchants: Merchant[];

	fetchMerchants: () => Promise<void>;

	addCustomMerchant: (name: string) => Promise<Merchant>;
}

interface PreparedRule extends Rule {
	normalizedKeyword: string;
	normalizedMatchCategory: string;
}

const uniqueStrings = (values: string[]): string[] => {
	const result: string[] = [];
	const seen = new Set<string>();

	for (const value of values) {
		const trimmed = value.trim();

		if (trimmed && !seen.has(trimmed)) {
			seen.add(trimmed);
			result.push(trimmed);
		}
	}

	return result;
};

const getUserId = async (): Promise<string | null> => {
	const {
		data: { session },
		error,
	} = await supabase.auth.getSession();

	if (error) {
		console.error("Failed to read session:", error.message);
		return null;
	}

	return session?.user.id ?? null;
};

const getOrCreateAccountId = async (
	userId: string,
	accountName: string,
): Promise<string> => {
	const name = accountName.trim();

	if (!name) {
		throw new Error("Account name is required.");
	}

	const { data: existingAccount, error: selectError } = await supabase
		.from("accounts")
		.select("id")
		.eq("user_id", userId)
		.eq("name", name)
		.maybeSingle();

	if (selectError) {
		throw selectError;
	}

	if (existingAccount) {
		return existingAccount.id;
	}

	const { data: createdAccount, error: insertError } = await supabase
		.from("accounts")
		.insert({
			user_id: userId,
			name,
		})
		.select("id")
		.single();

	if (insertError) {
		throw insertError;
	}

	return createdAccount.id;
};

const savePreferences = async (
	userId: string,
	updates: {
		active_categories?: string[];
		preferred_cards?: Record<string, string>;
	},
): Promise<void> => {
	const { error } = await supabase.from("user_preferences").upsert(
		{
			user_id: userId,
			...updates,
		},
		{ onConflict: "user_id" },
	);

	if (error) {
		throw error;
	}
};

const prepareRules = (rules: Rule[]): PreparedRule[] => {
	return rules
		.map((rule) => {
			return {
				...rule,
				normalizedKeyword: normalize(rule.keyword),
				normalizedMatchCategory: normalize(rule.matchCategory),
			};
		})
		.filter((rule) => rule.normalizedKeyword)
		.sort((a, b) => {
			return b.normalizedKeyword.length - a.normalizedKeyword.length;
		});
};

const matchesRule = (transaction: Transaction, rule: PreparedRule): boolean => {
	if (!normalize(transaction.merchant).includes(rule.normalizedKeyword)) {
		return false;
	}

	return (
		!rule.normalizedMatchCategory ||
		normalize(transaction.category) === rule.normalizedMatchCategory
	);
};

const applyRules = (
	transaction: Transaction,
	rules: PreparedRule[],
): Transaction => {
	for (const rule of rules) {
		if (!matchesRule(transaction, rule)) {
			continue;
		}

		const needsReview = GENERIC_CATEGORY_NAMES.has(normalize(rule.category));

		return {
			...transaction,
			category: rule.category,
			needs_review: needsReview,
			needs_subcat: needsReview,
		};
	}

	return transaction;
};

const splitIntoBatches = <T>(values: T[]): T[][] => {
	const batches: T[][] = [];

	for (let index = 0; index < values.length; index += DATABASE_BATCH_SIZE) {
		batches.push(values.slice(index, index + DATABASE_BATCH_SIZE));
	}

	return batches;
};

const mergeTransactionsById = (
	incoming: Transaction[],
	current: Transaction[],
): Transaction[] => {
	const result: Transaction[] = [];
	const seen = new Set<string>();

	for (const transaction of [...incoming, ...current]) {
		if (!transaction.id || seen.has(transaction.id)) {
			continue;
		}

		seen.add(transaction.id);
		result.push(transaction);
	}

	return result;
};

function uniqueCategoryIds(ids: readonly CategoryId[]): CategoryId[] {
	return Array.from(new Set(ids));
}

function isCategoryId(value: unknown): value is CategoryId {
	return typeof value === "string" && CATEGORY_BY_ID.has(value as CategoryId);
}

function parseCategoryIds(value: unknown): CategoryId[] {
	if (!Array.isArray(value)) {
		return [];
	}

	const result: CategoryId[] = [];
	const seen = new Set<CategoryId>();

	for (const item of value) {
		if (!isCategoryId(item)) {
			continue;
		}

		if (seen.has(item)) {
			continue;
		}

		seen.add(item);
		result.push(item);
	}

	return result;
}

export const useBudgetStore = create<BudgetState>()(
	persist(
		(set, get) => ({
			transactions: [],
			isLoading: false,
			customTags: [],
			customCategories: [],
			hasHydrated: false,
			rules: [],
			toast: null,
			confirmedRecurringMerchants: [],
			globalCards: [],
			walletIds: [...DEFAULT_WALLET_IDS],
			customRates: {},
			preferredCards: {},
			activeCategoryIds: [...DEFAULT_CATEGORIES],
			accounts: [],
			merchants: [],

			reorderActiveCategories: async (newOrder: CategoryId[]) => {
				const previous = get().activeCategoryIds;

				const updated = uniqueCategoryIds(newOrder);

				if (
					updated.length === previous.length &&
					updated.every((id, index) => {
						return id === previous[index];
					})
				) {
					return;
				}

				set({
					activeCategoryIds: updated,
				});

				try {
					const userId = await getUserId();

					if (!userId) {
						throw new Error("No authenticated user.");
					}

					await savePreferences(userId, {
						active_categories: updated,
					});
				} catch (error) {
					set({
						activeCategoryIds: previous,
					});

					console.error("Failed to reorder categories:", error);
				}
			},

			addActiveCategory: async (categoryId: CategoryId) => {
				const previous = get().activeCategoryIds;

				if (previous.includes(categoryId)) {
					return;
				}

				const updated: CategoryId[] = [...previous, categoryId];

				set({
					activeCategoryIds: updated,
				});

				try {
					const userId = await getUserId();

					if (!userId) {
						throw new Error("No authenticated user.");
					}

					await savePreferences(userId, {
						active_categories: updated,
					});
				} catch (error) {
					set({
						activeCategoryIds: previous,
					});

					console.error("Failed to add category:", error);
				}
			},

			removeActiveCategory: async (categoryId: CategoryId) => {
				const previous = get().activeCategoryIds;

				const updated = previous.filter((id) => {
					return id !== categoryId;
				});

				if (updated.length === previous.length) {
					return;
				}

				set({
					activeCategoryIds: updated,
				});

				try {
					const userId = await getUserId();

					if (!userId) {
						throw new Error("No authenticated user.");
					}

					await savePreferences(userId, {
						active_categories: updated,
					});
				} catch (error) {
					set({
						activeCategoryIds: previous,
					});

					console.error("Failed to remove category:", error);
				}
			},

			fetchActiveCategories: async () => {
				const userId = await getUserId();

				if (!userId) {
					return;
				}

				const { data, error } = await supabase
					.from("user_preferences")
					.select("active_categories")
					.eq("user_id", userId)
					.maybeSingle();

				if (error) {
					console.error("Failed to load categories:", error.message);

					return;
				}

				const activeCategoryIds = parseCategoryIds(data?.active_categories);

				set({
					activeCategoryIds,
				});
			},

			setPreferredCard: async (categoryId, cardId) => {
				const previous = get().preferredCards;
				const updated = { ...previous };

				if (cardId === null) {
					delete updated[categoryId];
				} else {
					updated[categoryId] = cardId;
				}

				set({ preferredCards: updated });

				try {
					const userId = await getUserId();

					if (!userId) {
						throw new Error("No authenticated user.");
					}

					await savePreferences(userId, {
						preferred_cards: updated,
					});
				} catch (error) {
					set({ preferredCards: previous });
					console.error("Failed to save preferred card:", error);
				}
			},

			fetchPreferredCards: async () => {
				const userId = await getUserId();

				if (!userId) {
					return;
				}

				const { data, error } = await supabase
					.from("user_preferences")
					.select("preferred_cards")
					.eq("user_id", userId)
					.maybeSingle();

				if (error) {
					console.error("Failed to load preferred cards:", error.message);
					return;
				}

				if (data?.preferred_cards) {
					set({ preferredCards: data.preferred_cards });
				}
			},

			setToast: (toast) => set({ toast }),
			setHasHydrated: (hasHydrated) => set({ hasHydrated }),
			setTransactions: (transactions) => set({ transactions }),
			setLoading: (isLoading) => set({ isLoading }),

			addTransactions: async (newTransactions) => {
				if (newTransactions.length === 0) {
					return;
				}

				const userId = await getUserId();

				if (!userId) {
					throw new Error("You must be signed in to add transactions.");
				}

				const rules = prepareRules(get().rules);

				const preparedTransactions = newTransactions.map((transaction) => {
					const processed = applyRules(transaction, rules);

					const accountName = processed.account?.trim();

					if (!accountName) {
						throw new Error(
							"An account must be selected for every transaction.",
						);
					}

					return {
						processed,
						accountName,
					};
				});

				const unresolvedAccountNames = Array.from(
					new Set(
						preparedTransactions
							.filter(({ processed }) => {
								return !processed.account_id;
							})
							.map(({ accountName }) => {
								return accountName;
							}),
					),
				);

				const accountEntries = await Promise.all(
					unresolvedAccountNames.map(async (accountName) => {
						const accountId = await getOrCreateAccountId(userId, accountName);

						return [normalize(accountName), accountId] as const;
					}),
				);

				const accountIdByName = new Map(accountEntries);

				const rows = preparedTransactions.map(({ processed, accountName }) => {
					const accountId =
						processed.account_id ?? accountIdByName.get(normalize(accountName));

					if (!accountId) {
						throw new Error(
							`Could not resolve account ID for "${accountName}".`,
						);
					}

					return {
						user_id: userId,
						date: processed.date,
						merchant: processed.merchant,
						description: processed.description ?? "",
						amount: processed.amount,
						category: processed.category || "Uncategorized",
						account: accountName,
						account_id: accountId,
						needs_review: processed.needs_review ?? true,
						needs_subcat: processed.needs_subcat ?? true,
					};
				});

				const dates = rows.map((row) => row.date).sort();

				const minDate = dates[0];
				const maxDate = dates[dates.length - 1];

				const accountIds = Array.from(
					new Set(rows.map((row) => row.account_id)),
				);

				const { data: existingRows, error: existingRowsError } = await supabase
					.from("transactions")
					.select("date, merchant, description, amount, account, account_id")
					.eq("user_id", userId)
					.in("account_id", accountIds)
					.gte("date", minDate)
					.lte("date", maxDate);

				if (existingRowsError) {
					throw existingRowsError;
				}

				const existingCounts = new Map<string, number>();

				for (const transaction of existingRows ?? []) {
					const fingerprint = getTransactionFingerprint(transaction);

					existingCounts.set(
						fingerprint,
						(existingCounts.get(fingerprint) ?? 0) + 1,
					);
				}

				const incomingCounts = new Map<string, number>();

				const rowsToInsert = rows.filter((row) => {
					const fingerprint = getTransactionFingerprint(row);

					const occurrence = (incomingCounts.get(fingerprint) ?? 0) + 1;

					incomingCounts.set(fingerprint, occurrence);

					const existingOccurrences = existingCounts.get(fingerprint) ?? 0;

					return occurrence > existingOccurrences;
				});

				if (rowsToInsert.length === 0) {
					console.info("No new transactions to import.");

					return;
				}

				const { data, error } = await supabase
					.from("transactions")
					.insert(rowsToInsert)
					.select(TRANSACTION_COLUMNS);

				if (error) {
					throw error;
				}

				const insertedTransactions = (data ?? []) as Transaction[];

				set((state) => ({
					transactions: mergeTransactionsById(
						insertedTransactions,
						state.transactions,
					),
				}));

				await get().fetchAccounts(true);
			},

			fetchTransactions: async (force = false) => {
				const { transactions, isLoading } = get();

				if (isLoading || (!force && transactions.length > 0)) {
					return;
				}

				set({ isLoading: true });

				try {
					const userId = await getUserId();

					if (!userId) {
						set({ transactions: [], rules: [], isLoading: false });
						return;
					}

					const [transactionResponse, ruleResponse] = await Promise.all([
						supabase
							.from("transactions")
							.select(TRANSACTION_COLUMNS)
							.order("date", { ascending: false })
							.order("created_at", { ascending: false }),
						supabase.from("rules").select("keyword, category, match_category"),
					]);

					if (transactionResponse.error) {
						throw transactionResponse.error;
					}

					if (ruleResponse.error) {
						throw ruleResponse.error;
					}

					set({
						transactions: mergeTransactionsById(
							(transactionResponse.data ?? []) as Transaction[],
							[],
						),
						rules: (ruleResponse.data ?? []).map((rule) => ({
							keyword: rule.keyword,
							category: rule.category,
							matchCategory: rule.match_category ?? undefined,
						})),
						isLoading: false,
					});
				} catch (error) {
					console.error("Failed to fetch transactions:", error);
					set({ isLoading: false });
				}
			},

			updateTransaction: async (id, updates) => {
				const original = get().transactions.find((transaction) => {
					return transaction.id === id;
				});

				if (!original || Object.keys(updates).length === 0) {
					return;
				}

				set((state) => ({
					transactions: state.transactions.map((transaction) => {
						return transaction.id === id
							? { ...transaction, ...updates }
							: transaction;
					}),
				}));

				const { error } = await supabase
					.from("transactions")
					.update(updates)
					.eq("id", id);

				if (error) {
					set((state) => ({
						transactions: state.transactions.map((transaction) => {
							return transaction.id === id ? original : transaction;
						}),
					}));
					throw error;
				}
			},

			deleteTransaction: async (id) => {
				const previous = get().transactions;
				const next = previous.filter((transaction) => transaction.id !== id);

				if (next.length === previous.length) {
					return;
				}

				set({ transactions: next });

				const { error } = await supabase
					.from("transactions")
					.delete()
					.eq("id", id);

				if (error) {
					set({ transactions: previous });
					throw error;
				}
			},

			bulkDeleteTransactions: async (ids) => {
				const uniqueIds = uniqueStrings(ids);

				if (uniqueIds.length === 0) {
					return;
				}

				const idSet = new Set(uniqueIds);
				const previous = get().transactions;

				set({
					transactions: previous.filter((transaction) => {
						return !idSet.has(transaction.id);
					}),
				});

				for (const batch of splitIntoBatches(uniqueIds)) {
					const { error } = await supabase
						.from("transactions")
						.delete()
						.in("id", batch);

					if (error) {
						set({ transactions: previous });
						throw error;
					}
				}
			},

			undoDelete: async (restoredTransactions) => {
				if (restoredTransactions.length === 0) {
					return;
				}

				const userId = await getUserId();

				if (!userId) {
					throw new Error("You must be signed in to restore transactions.");
				}

				const previous = get().transactions;
				set({ transactions: [...restoredTransactions, ...previous] });

				const rows = restoredTransactions.map((transaction) => ({
					id: transaction.id,
					user_id: userId,
					date: transaction.date,
					merchant: transaction.merchant,
					description: transaction.description ?? "",
					amount: transaction.amount,
					category: transaction.category,
					account: transaction.account,
					needs_review: transaction.needs_review,
					needs_subcat: transaction.needs_subcat,
				}));

				const { error } = await supabase.from("transactions").insert(rows);

				if (error) {
					set({ transactions: previous });
					throw error;
				}
			},

			clearData: () => {
				set({ transactions: [], customTags: [], rules: [], toast: null });
			},

			getCategoryTotals: () => {
				const totals: Record<string, number> = {};

				for (const transaction of get().transactions) {
					if (
						normalize(transaction.category) === normalize("Income") ||
						normalize(transaction.category) === normalize("Debt payments")
					) {
						continue;
					}

					const category = transaction.category || "Uncategorized";
					totals[category] =
						(totals[category] ?? 0) + Math.abs(transaction.amount || 0);
				}

				return totals;
			},

			undoBulkUpdate: (previousTransactions) => {
				set({ transactions: previousTransactions });
			},

			saveRule: async (newRule, oldKeyword) => {
				const rule: Rule = {
					keyword: newRule.keyword.trim(),
					category: newRule.category.trim(),
					matchCategory: newRule.matchCategory?.trim() || undefined,
				};

				if (!rule.keyword || !rule.category) {
					throw new Error("Rule keyword and category are required.");
				}

				const userId = await getUserId();

				if (!userId) {
					throw new Error("You must be signed in to save a rule.");
				}

				const preparedRule = prepareRules([rule])[0];
				const needsReview = GENERIC_CATEGORY_NAMES.has(
					normalize(rule.category),
				);
				const matchingIds = get()
					.transactions.filter((transaction) => {
						return matchesRule(transaction, preparedRule);
					})
					.map((transaction) => transaction.id);

				const { error: saveError } = await supabase.from("rules").upsert(
					{
						user_id: userId,
						keyword: rule.keyword,
						category: rule.category,
						match_category: rule.matchCategory ?? null,
					},
					{ onConflict: "user_id,keyword" },
				);

				if (saveError) {
					throw saveError;
				}

				for (const batch of splitIntoBatches(matchingIds)) {
					const { error } = await supabase
						.from("transactions")
						.update({
							category: rule.category,
							needs_review: needsReview,
							needs_subcat: needsReview,
						})
						.in("id", batch);

					if (error) {
						throw error;
					}
				}

				if (oldKeyword && normalize(oldKeyword) !== normalize(rule.keyword)) {
					const { error } = await supabase
						.from("rules")
						.delete()
						.eq("user_id", userId)
						.eq("keyword", oldKeyword);

					if (error) {
						throw error;
					}
				}

				set((state) => ({
					rules: [
						...state.rules.filter((existingRule) => {
							return (
								normalize(existingRule.keyword) !== normalize(rule.keyword) &&
								normalize(existingRule.keyword) !== normalize(oldKeyword)
							);
						}),
						rule,
					],
					transactions: state.transactions.map((transaction) => {
						if (!matchesRule(transaction, preparedRule)) {
							return transaction;
						}

						return {
							...transaction,
							category: rule.category,
							needs_review: needsReview,
							needs_subcat: needsReview,
						};
					}),
				}));
			},

			deleteRule: async (keyword) => {
				const userId = await getUserId();

				if (!userId) {
					throw new Error("You must be signed in to delete a rule.");
				}

				const { error } = await supabase
					.from("rules")
					.delete()
					.eq("user_id", userId)
					.eq("keyword", keyword);

				if (error) {
					throw error;
				}

				set((state) => ({
					rules: state.rules.filter((rule) => {
						return normalize(rule.keyword) !== normalize(keyword);
					}),
				}));
			},

			addCustomTag: (tag) => {
				const value = tag.trim();

				if (!value) {
					return;
				}

				set((state) => {
					if (
						state.customTags.some((existing) => {
							return normalize(existing) === normalize(value);
						})
					) {
						return {};
					}

					return { customTags: [...state.customTags, value] };
				});
			},

			addCustomCategory: async (category) => {
				const userId = await getUserId();

				if (!userId) {
					throw new Error("You must be signed in to create a category.");
				}

				const name = category.name.trim();
				const normalizedName = normalize(name);

				if (!normalizedName) {
					throw new Error("Category name is required.");
				}

				if (BUILT_IN_CATEGORY_NAMES.has(normalizedName)) {
					throw new Error(`"${name}" is already a built-in category.`);
				}

				const duplicate = get().customCategories.some((existing) => {
					return (
						!existing.is_system &&
						existing.user_id === userId &&
						normalize(existing.name) === normalizedName
					);
				});

				if (duplicate) {
					throw new Error("Category already exists.");
				}

				const { data, error } = await supabase
					.from("custom_categories")
					.insert({
						user_id: userId,
						name,
						parent_name: category.parent?.trim() || null,
						icon_name: category.icon.trim() || name,
						color_key: category.color.trim() || null,
						is_system: false,
					})
					.select(CUSTOM_CATEGORY_COLUMNS)
					.single();

				if (error) {
					throw error;
				}

				const createdCategory = data as CustomCategory;

				set((state) => ({
					customCategories: [...state.customCategories, createdCategory],
				}));

				return createdCategory;
			},

			fetchCustomCategories: async () => {
				const userId = await getUserId();

				if (!userId) {
					set({ customCategories: [] });
					return;
				}

				const { data, error } = await supabase
					.from("custom_categories")
					.select(CUSTOM_CATEGORY_COLUMNS)
					.or(`is_system.eq.true,user_id.eq.${userId}`)
					.order("parent_name", { ascending: true })
					.order("name", { ascending: true });

				if (error) {
					console.error("Failed to fetch categories:", error.message);
					return;
				}

				set({ customCategories: (data ?? []) as CustomCategory[] });
			},

			deleteCustomCategory: async (id) => {
				const category = get().customCategories.find((item) => item.id === id);

				if (!category) {
					return;
				}

				if (category.is_system) {
					throw new Error("Built-in categories cannot be deleted.");
				}

				const userId = await getUserId();

				if (!userId) {
					throw new Error("You must be signed in to delete a category.");
				}

				const { error } = await supabase
					.from("custom_categories")
					.delete()
					.eq("id", id)
					.eq("user_id", userId)
					.eq("is_system", false);

				if (error) {
					throw error;
				}

				set((state) => ({
					customCategories: state.customCategories.filter((item) => {
						return item.id !== id;
					}),
				}));
			},

			updateCustomCategory: async (id, updates) => {
				const userId = await getUserId();
				const current = get().customCategories.find((item) => item.id === id);

				if (!userId) {
					throw new Error("You must be signed in to update a category.");
				}

				if (!current || current.is_system) {
					throw new Error("Category cannot be edited.");
				}

				const name = updates.name.trim();
				const normalizedName = normalize(name);

				if (!normalizedName) {
					throw new Error("Category name is required.");
				}

				if (BUILT_IN_CATEGORY_NAMES.has(normalizedName)) {
					throw new Error(`"${name}" is already a built-in category.`);
				}

				const duplicate = get().customCategories.some((item) => {
					return (
						item.id !== id &&
						!item.is_system &&
						item.user_id === userId &&
						normalize(item.name) === normalizedName
					);
				});

				if (duplicate) {
					throw new Error("Category already exists.");
				}

				const { data, error } = await supabase
					.from("custom_categories")
					.update({
						name,
						icon_name: updates.icon.trim() || name,
						color_key: updates.color.trim() || null,
					})
					.eq("id", id)
					.eq("user_id", userId)
					.eq("is_system", false)
					.select(CUSTOM_CATEGORY_COLUMNS)
					.single();

				if (error) {
					throw error;
				}

				const updatedCategory = data as CustomCategory;

				set((state) => ({
					customCategories: state.customCategories.map((item) => {
						return item.id === id ? updatedCategory : item;
					}),
				}));
			},

			resetCustomCategories: async () => {
				const userId = await getUserId();

				if (!userId) {
					throw new Error("You must be signed in to reset categories.");
				}

				const { error } = await supabase
					.from("custom_categories")
					.delete()
					.eq("user_id", userId)
					.eq("is_system", false);

				if (error) {
					throw error;
				}

				set((state) => ({
					customCategories: state.customCategories.filter((category) => {
						return category.is_system;
					}),
				}));
			},

			fetchMerchants: async () => {
				const {
					data: { user },
					error: authError,
				} = await supabase.auth.getUser();

				if (authError) {
					console.error("Failed to load current user:", authError.message);
					return;
				}

				if (!user) {
					set({ merchants: [] });
					return;
				}

				const { data, error } = await supabase
					.from("merchants")
					.select("id, user_id, name, is_system, created_at")
					.or(`is_system.eq.true,user_id.eq.${user.id}`)
					.order("name", { ascending: true });

				if (error) {
					console.error("Failed to fetch merchants:", error.message);
					return;
				}

				set({
					merchants: (data ?? []) as Merchant[],
				});
			},

			addCustomMerchant: async (merchantName) => {
				const name = merchantName.trim();

				if (!name) {
					throw new Error("Merchant name is required.");
				}

				const {
					data: { user },
					error: authError,
				} = await supabase.auth.getUser();

				if (authError) {
					throw authError;
				}

				if (!user) {
					throw new Error("You must be signed in to create a merchant.");
				}

				const duplicate = get().merchants.some((merchant) => {
					return merchant.name.trim().toLowerCase() === name.toLowerCase();
				});

				if (duplicate) {
					throw new Error("Merchant already exists.");
				}

				const { data, error } = await supabase
					.from("merchants")
					.insert({
						user_id: user.id,
						name,
						is_system: false,
					})
					.select("id, user_id, name, is_system, created_at")
					.single();

				if (error) {
					throw error;
				}

				const createdMerchant = data as Merchant;

				set((state) => ({
					merchants: [...state.merchants, createdMerchant],
				}));

				return createdMerchant;
			},

			confirmRecurring: (merchantName) => {
				const name = merchantName.trim();

				if (!name) {
					return;
				}

				set((state) => {
					if (
						state.confirmedRecurringMerchants.some((existing) => {
							return normalize(existing) === normalize(name);
						})
					) {
						return {};
					}

					return {
						confirmedRecurringMerchants: [
							...state.confirmedRecurringMerchants,
							name,
						],
					};
				});
			},

			fetchGlobalCards: async (force = false) => {
				if (!force && get().globalCards.length > 0) {
					return;
				}

				const { data, error } = await supabase
					.from("credit_cards")
					.select(
						"id, name, issuer, network, color, currency, multipliers, image_url",
					);

				if (error) {
					console.error("Failed to fetch cards:", error.message);
					return;
				}

				set({ globalCards: (data ?? []) as CreditCard[] });
			},

			getVisibleCategories: () => {
				const result: (typeof CATEGORY_DICTIONARY)[number][] = [];

				for (const id of get().activeCategoryIds) {
					const category = CATEGORY_BY_ID.get(id);

					if (category) {
						result.push(category);
					}
				}

				return result;
			},

			setWalletIds: (ids) => set({ walletIds: uniqueStrings(ids) }),
			setCustomRates: (customRates) => {
				set({ customRates: { ...customRates } });
			},

			fetchAccounts: async (force = false) => {
				if (!force && get().accounts.length > 0) {
					return;
				}

				const userId = await getUserId();

				if (!userId) {
					set({
						accounts: [],
					});

					return;
				}

				const { data, error } = await supabase
					.from("accounts")
					.select("id, user_id, name, created_at")
					.eq("user_id", userId)
					.order("name", {
						ascending: true,
					});

				if (error) {
					console.error("Failed to fetch accounts:", error.message);

					return;
				}

				set({
					accounts: (data ?? []) as Account[],
				});
			},
		}),
		{
			name: "budget-storage",
			version: 2,
			storage: createJSONStorage(() => localStorage),
			migrate: (persistedState) => {
				const state = persistedState as Partial<BudgetState>;

				return {
					customTags: state.customTags ?? [],
					confirmedRecurringMerchants: state.confirmedRecurringMerchants ?? [],
					walletIds: state.walletIds ?? [...DEFAULT_WALLET_IDS],
					customRates: state.customRates ?? {},
					preferredCards: state.preferredCards ?? {},
					activeCategoryIds: state.activeCategoryIds ?? [...DEFAULT_CATEGORIES],
				};
			},
			onRehydrateStorage: () => {
				return (state, error) => {
					if (error) {
						console.error("Failed to rehydrate budget store:", error);

						return;
					}

					state?.setHasHydrated(true);

					void state?.fetchTransactions(true);
					void state?.fetchAccounts(true);
					void state?.fetchActiveCategories();
					void state?.fetchPreferredCards();
					void state?.fetchCustomCategories();
					void state?.fetchMerchants();
				};
			},
			partialize: (state) => ({
				customTags: state.customTags,
				confirmedRecurringMerchants: state.confirmedRecurringMerchants,
				walletIds: state.walletIds,
				customRates: state.customRates,
				preferredCards: state.preferredCards,
				activeCategoryIds: state.activeCategoryIds,
			}),
		},
	),
);
