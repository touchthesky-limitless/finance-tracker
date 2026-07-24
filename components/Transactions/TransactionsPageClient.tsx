"use client";

import {
	useCallback,
	useEffect,
	useMemo,
	useState,
	useSyncExternalStore,
	type MouseEvent as ReactMouseEvent,
} from "react";
import dynamic from "next/dynamic";
import { SortingState, VisibilityState } from "@tanstack/react-table";
import { X } from "lucide-react";

import { CATEGORY_HIERARCHY, findParentCategory } from "@/constants";
import {
	type Merchant,
	type Transaction,
	useBudgetStore,
} from "@/store/useBudgetStore";
import { DataTable } from "@/components/Transactions/DataTable";
import { UndoToast } from "@/components/ui/UndoToast";
import { Shimmer } from "@/components/ui/Shimmer";
import CsvUploader from "@/components/CsvUploader";
import {
	TopToolbar,
	type TransactionDateRange,
} from "@/components/Transactions/TopToolbar";
import { TableToolbar } from "@/components/Transactions/TableToolbar";
import { SummarySidebar } from "@/components/Transactions/SummarySidebar";
import {
	EMPTY_TRANSACTION_FILTERS,
	hasTransactionFilters,
	matchesTransactionFilters,
	type TransactionFilterData,
	type TransactionFilterOption,
	type TransactionFilters,
} from "@/components/Transactions/transactionFilters";
import { useMerchantOptions } from "@/hooks/useMerchantOptions";
import type { RuleModalSeed } from "@/components/Transactions/RuleModal";
import type { TransactionRule } from "@/lib/rules/ruleEngine";
import { MerchantRuleToast } from "@/components/Transactions/MerchantRuleToast";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { TRANSACTION_RETURN_URL_KEY } from "@/lib/transactions/navigation";
import { useTransactionToastStore } from "@/store/useTransactionToastStore";
import BulkEditTransactionsDrawer from "@/components/Transactions/BulkEditTransactionsDrawer";

const DEFAULT_SORTING: SortingState = [
	{
		id: "date",
		desc: true,
	},
];

const AddTransactionModal = dynamic(
	() => {
		return import("@/components/Budget/AddTransactionModal");
	},
	{
		ssr: false,
	},
);

const TransactionDetailsDrawer = dynamic(
	() => {
		return import("@/components/Transactions/TransactionDetailsDrawer");
	},
	{
		ssr: false,
	},
);

const RuleModal = dynamic(
	() =>
		import("@/components/Transactions/RuleModal").then(
			(module) => module.RuleModal,
		),
	{ ssr: false },
);

function subscribeToClient(): () => void {
	return () => {};
}

function getClientSnapshot(): boolean {
	return true;
}

function getServerSnapshot(): boolean {
	return false;
}

function readLocalStorage<T>(key: string, fallback: T): T {
	if (typeof window === "undefined") {
		return fallback;
	}

	try {
		const storedValue = window.localStorage.getItem(key);

		if (!storedValue) {
			return fallback;
		}

		return JSON.parse(storedValue) as T;
	} catch (error) {
		console.error(`Failed to read localStorage key "${key}":`, error);

		window.localStorage.removeItem(key);

		return fallback;
	}
}

function writeLocalStorage(key: string, value: unknown): void {
	try {
		window.localStorage.setItem(key, JSON.stringify(value));
	} catch (error) {
		console.error(`Failed to write localStorage key "${key}":`, error);
	}
}

function normalizeCategoryName(name: string): string {
	return name.trim().toLowerCase();
}

function normalizeMerchantName(name: string): string {
	return name.trim().toLocaleLowerCase();
}

function getTransactionIdFromPathname(pathname: string): string | null {
	const match = pathname.match(/^\/transactions\/([^/?#]+)\/?$/);

	if (!match?.[1]) {
		return null;
	}

	try {
		return decodeURIComponent(match[1]);
	} catch {
		return match[1];
	}
}

function createBlankTransaction(): Transaction {
	return {
		id: crypto.randomUUID(),
		date: new Date().toISOString().slice(0, 10),
		merchant: "",
		merchant_id: null,
		description: "",
		amount: 0,
		category: "Uncategorized",
		account: "",
		account_id: null,
		needs_review: true,
		needs_subcat: true,
		tags: [],
		note: "",
	};
}

function TransactionsPageSkeleton() {
	return (
		<div
			role="status"
			aria-label="Loading transactions page"
			aria-live="polite"
			className="flex h-screen flex-col bg-gray-50 font-sans text-gray-900 dark:bg-[#121212] dark:text-gray-200"
		>
			<span className="sr-only">Loading transactions…</span>

			<header
				aria-hidden="true"
				className="flex h-20 shrink-0 items-center gap-4 border-b border-gray-200 bg-white px-6 dark:border-white/5 dark:bg-[#191919]"
			>
				<Shimmer className="h-10 w-36 rounded-xl" />
				<Shimmer className="ml-auto h-10 w-[min(38vw,420px)] rounded-xl" />
				<Shimmer className="h-10 w-28 rounded-xl" />
				<Shimmer className="size-10 rounded-xl" />
			</header>

			<div
				aria-hidden="true"
				className="flex min-h-0 flex-1 gap-6 overflow-hidden p-6"
			>
				<div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/5 dark:bg-[#191919]">
					<div className="flex h-16 shrink-0 items-center gap-3 border-b border-gray-200 px-5 dark:border-white/5">
						<Shimmer className="h-9 w-28 rounded-xl" />
						<Shimmer className="h-9 w-24 rounded-xl" />
						<Shimmer className="ml-auto h-9 w-36 rounded-xl" />
					</div>

					<div className="min-h-0 flex-1 overflow-hidden">
						<div className="flex h-12 items-center justify-between border-b border-gray-200 bg-[#f9fafb] px-6 dark:border-white/5 dark:bg-[#232323]">
							<Shimmer className="h-4 w-36 rounded-md" />
							<Shimmer className="h-4 w-24 rounded-md" />
						</div>

						{Array.from({ length: 8 }, (_, rowIndex) => (
							<div
								key={rowIndex}
								className="flex h-14 items-center gap-5 border-b border-gray-100 px-6 dark:border-white/5"
							>
								<Shimmer className="size-8 shrink-0 rounded-full" />
								<Shimmer
									className={`h-4 rounded-md ${
										rowIndex % 2 === 0 ? "w-44" : "w-32"
									}`}
								/>
								<Shimmer className="ml-auto h-4 w-24 rounded-md" />
							</div>
						))}
					</div>
				</div>

				<aside className="hidden w-80 shrink-0 space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm xl:block dark:border-white/5 dark:bg-[#191919]">
					<Shimmer className="h-6 w-28 rounded-md" />
					<Shimmer className="h-24 w-full rounded-2xl" />
					<Shimmer className="h-24 w-full rounded-2xl" />
					<Shimmer className="h-24 w-full rounded-2xl" />
				</aside>
			</div>
		</div>
	);
}

interface TransactionsPageClientProps {
	initialTransactionId?: string;
}

export default function TransactionsPageClient({
	initialTransactionId,
}: TransactionsPageClientProps) {
	const isClient = useSyncExternalStore(
		subscribeToClient,
		getClientSnapshot,
		getServerSnapshot,
	);
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	type AddTransactionMode = "new" | "duplicate";

	const [addTransactionState, setAddTransactionState] = useState<{
		mode: AddTransactionMode;
		transaction: Transaction;
	} | null>(null);
	// Store selectors
	const transactions = useBudgetStore((state) => state.transactions);

	const pathnameTransactionId = getTransactionIdFromPathname(pathname);

	const activeTransactionId = initialTransactionId ?? pathnameTransactionId;

	const selectedTransaction = useMemo(() => {
		if (!activeTransactionId) {
			return null;
		}

		return (
			transactions.find((transaction) => {
				return transaction.id === activeTransactionId;
			}) ?? null
		);
	}, [activeTransactionId, transactions]);

	const updateTransaction = useBudgetStore((state) => state.updateTransaction);

	const setToast = useBudgetStore((state) => state.setToast);

	const toast = useBudgetStore((state) => state.toast);

	const customCategories = useBudgetStore((state) => state.customCategories);

	const fetchCustomCategories = useBudgetStore(
		(state) => state.fetchCustomCategories,
	);

	const reportDeletedTransactions = useTransactionToastStore((state) => {
		return state.reportDeletedTransactions;
	});

	const accounts = useBudgetStore((state) => state.accounts);

	const fetchAccounts = useBudgetStore((state) => state.fetchAccounts);

	const fetchMerchants = useBudgetStore((state) => state.fetchMerchants);

	const customTags = useBudgetStore((state) => state.customTags);

	const saveRule = useBudgetStore((state) => state.saveRule);
	const deleteRule = useBudgetStore((state) => state.deleteRule);

	const confirmedRecurringMerchants = useBudgetStore(
		(state) => state.confirmedRecurringMerchants,
	);

	const merchants = useBudgetStore((state) => {
		return state.merchants;
	});

	// Page state
	const [searchQuery, setSearchQuery] = useState("");

	const [dateRange, setDateRange] = useState<TransactionDateRange>({
		startDate: "",
		endDate: "",
	});

	const merchantItems = useMerchantOptions();

	const [transactionFilters, setTransactionFilters] =
		useState<TransactionFilters>(EMPTY_TRANSACTION_FILTERS);

	const [selectedIds, setSelectedIds] = useState<string[]>([]);

	const [currentView, setCurrentView] = useState<"all" | "review">("all");

	const [isEditMode, setIsEditMode] = useState(false);

	const [isSummaryVisible, setIsSummaryVisible] = useState(false);

	const [showUploader, setShowUploader] = useState(false);

	const [isInitialDataLoading, setIsInitialDataLoading] = useState(true);

	const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);

	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
		() => {
			return readLocalStorage<VisibilityState>("sort_cols", {});
		},
	);

	type TransactionRuleSuggestion =
		| {
				type: "merchant";
				transaction: Transaction;
				merchant: Pick<Merchant, "id" | "name">;
		  }
		| {
				type: "category";
				transaction: Transaction;
				category: string;
		  };

	const openAddTransaction = useCallback(() => {
		setAddTransactionState({
			mode: "new",
			transaction: createBlankTransaction(),
		});
	}, []);

	const [transactionRuleSuggestion, setTransactionRuleSuggestion] =
		useState<TransactionRuleSuggestion | null>(null);

	const [ruleModalState, setRuleModalState] = useState<{
		rule?: TransactionRule | null;
		seed?: RuleModalSeed | null;
	} | null>(null);

	const [sorting, setSorting] = useState<SortingState>(() => {
		return readLocalStorage<SortingState>("custom_sort", DEFAULT_SORTING);
	});

	const selectedTransactions = useMemo(() => {
		const selectedIdSet = new Set(selectedIds);

		return transactions.filter((transaction) => {
			return selectedIdSet.has(transaction.id);
		});
	}, [selectedIds, transactions]);

	const merchantFilterOptions = useMemo<TransactionFilterOption[]>(() => {
		return merchantItems.map((merchant) => {
			return {
				value: merchant.name,
				label: merchant.name,
				count: merchant.transactionCount,
				merchant,
			};
		});
	}, [merchantItems]);

	const getTransactionUrl = useCallback(
		(transactionId?: string) => {
			const query = searchParams.toString();

			const pathname = transactionId
				? `/transactions/${encodeURIComponent(transactionId)}`
				: "/transactions";

			return query ? `${pathname}?${query}` : pathname;
		},
		[searchParams],
	);

	const openTransaction = useCallback(
		(transaction: Transaction) => {
			router.push(getTransactionUrl(transaction.id), {
				scroll: false,
			});
		},
		[getTransactionUrl, router],
	);

	const closeTransaction = useCallback(() => {
		const fallbackUrl = getTransactionUrl();

		const returnUrl =
			typeof window === "undefined"
				? null
				: window.sessionStorage.getItem(TRANSACTION_RETURN_URL_KEY);

		if (typeof window !== "undefined") {
			window.sessionStorage.removeItem(TRANSACTION_RETURN_URL_KEY);
		}

		router.replace(returnUrl || fallbackUrl, {
			scroll: false,
		});
	}, [getTransactionUrl, router]);

	const handleOpenBulkEdit = useCallback(() => {
		if (selectedIds.length === 0) {
			return;
		}

		setIsBulkEditOpen(true);
	}, [selectedIds.length]);

	// Load the reference data used by transaction rows and filters.
	useEffect(() => {
		let active = true;

		const loadReferenceData = async (): Promise<void> => {
			try {
				await Promise.all([
					fetchCustomCategories(),
					fetchAccounts(),
					fetchMerchants(),
				]);
			} catch (error) {
				console.error("Failed to load transaction reference data:", error);
			} finally {
				if (active) {
					setIsInitialDataLoading(false);
				}
			}
		};

		void loadReferenceData();

		return () => {
			active = false;
		};
	}, [fetchAccounts, fetchCustomCategories, fetchMerchants]);

	const openDuplicateTransaction = useCallback((transaction: Transaction) => {
		setAddTransactionState({
			mode: "duplicate",
			transaction: {
				...transaction,
				id: crypto.randomUUID(),
				created_at: undefined,
				user_id: undefined,
				is_hidden: false,
				tags: [...(transaction.tags ?? [])],
			},
		});
	}, []);

	// Persist sorting
	useEffect(() => {
		writeLocalStorage("custom_sort", sorting);
	}, [sorting]);

	// Persist column visibility
	useEffect(() => {
		writeLocalStorage("sort_cols", columnVisibility);
	}, [columnVisibility]);

	// Escape exits edit mode
	useEffect(() => {
		const handleEscape = (event: KeyboardEvent) => {
			if (event.key !== "Escape") {
				return;
			}

			setIsEditMode(false);
			setSelectedIds([]);
		};

		window.addEventListener("keydown", handleEscape);

		return () => {
			window.removeEventListener("keydown", handleEscape);
		};
	}, []);

	const filterData = useMemo<TransactionFilterData>(() => {
		const categoryOptions: TransactionFilterOption[] = [];
		const seenLeafNames = new Set<string>();
		const seenParentNames = new Set<string>();

		const categoryRecordsByParent = new Map<string, typeof customCategories>();
		const rootCategoryByName = new Map<
			string,
			(typeof customCategories)[number]
		>();

		for (const category of customCategories) {
			const categoryName = category.name.trim();

			if (!categoryName) {
				continue;
			}

			if (!category.parent_name?.trim()) {
				rootCategoryByName.set(normalizeCategoryName(categoryName), category);
				continue;
			}

			const parentKey = normalizeCategoryName(category.parent_name);
			const children = categoryRecordsByParent.get(parentKey) ?? [];
			children.push(category);
			categoryRecordsByParent.set(parentKey, children);
		}

		const addParentOption = (
			parentName: string,
			source?: (typeof customCategories)[number],
		) => {
			const normalizedParent = normalizeCategoryName(parentName);

			if (!parentName || seenParentNames.has(normalizedParent)) {
				return;
			}

			seenParentNames.add(normalizedParent);
			categoryOptions.push({
				value: `__parent__:${parentName}`,
				label: parentName,
				isParent: true,
				iconName: source?.icon_name?.trim() || parentName,
				colorKey: source?.color_key?.trim() || parentName,
			});
		};

		const addLeafOption = (
			categoryName: string,
			parentName: string,
			source?: (typeof customCategories)[number],
		) => {
			const normalizedName = normalizeCategoryName(categoryName);

			if (!categoryName || seenLeafNames.has(normalizedName)) {
				return;
			}

			seenLeafNames.add(normalizedName);
			categoryOptions.push({
				value: categoryName,
				label: categoryName,
				group: parentName,
				iconName: source?.icon_name?.trim() || categoryName,
				colorKey: source?.color_key?.trim() || parentName,
				secondaryLabel: source && !source.is_system ? "Custom" : undefined,
			});
		};

		/*
		 * CATEGORY_HIERARCHY is the canonical display order. Database-backed
		 * categories still provide the current names, icons, colors, and custom
		 * additions shown in Settings.
		 */
		for (const [parentName, hierarchyChildren] of Object.entries(
			CATEGORY_HIERARCHY,
		)) {
			const parentKey = normalizeCategoryName(parentName);
			const parentRecord = rootCategoryByName.get(parentKey);
			const configuredChildren = categoryRecordsByParent.get(parentKey) ?? [];

			addParentOption(parentName, parentRecord);

			const configuredChildByName = new Map(
				configuredChildren.map((category) => {
					return [normalizeCategoryName(category.name), category] as const;
				}),
			);

			/*
			 * Once Settings data is loaded, it is the source of truth. The static
			 * hierarchy is only a fallback before those records are available.
			 */
			const useStaticFallback = configuredChildren.length === 0;

			for (const childName of hierarchyChildren) {
				const configuredChild = configuredChildByName.get(
					normalizeCategoryName(childName),
				);

				if (!configuredChild && !useStaticFallback) {
					continue;
				}

				addLeafOption(
					configuredChild?.name.trim() || childName,
					parentName,
					configuredChild,
				);
			}

			// Custom children follow the built-in children without alphabetizing.
			for (const child of configuredChildren) {
				addLeafOption(child.name.trim(), parentName, child);
			}
		}

		// Append custom parent groups after the built-in hierarchy.
		for (const category of customCategories) {
			if (category.parent_name?.trim()) {
				continue;
			}

			const parentName = category.name.trim();

			if (
				!parentName ||
				seenParentNames.has(normalizeCategoryName(parentName))
			) {
				continue;
			}

			addParentOption(parentName, category);

			const children =
				categoryRecordsByParent.get(normalizeCategoryName(parentName)) ?? [];

			for (const child of children) {
				addLeafOption(child.name.trim(), parentName, child);
			}
		}

		// Keep transaction-only legacy categories available at the end.
		for (const transaction of transactions) {
			const categoryName = transaction.category?.trim();

			if (
				!categoryName ||
				seenLeafNames.has(normalizeCategoryName(categoryName))
			) {
				continue;
			}

			const resolvedParent = findParentCategory(categoryName);
			const parentName =
				resolvedParent !== categoryName || CATEGORY_HIERARCHY[resolvedParent]
					? resolvedParent
					: "Other categories";

			addParentOption(parentName);
			addLeafOption(categoryName, parentName);
		}

		const accountNameByKey = new Map<string, string>();

		for (const account of accounts) {
			const accountName = account.name.trim();

			if (accountName) {
				accountNameByKey.set(accountName.toLowerCase(), accountName);
			}
		}

		for (const transaction of transactions) {
			const accountName = transaction.account?.trim();

			if (accountName) {
				accountNameByKey.set(
					accountName.toLowerCase(),
					accountNameByKey.get(accountName.toLowerCase()) ?? accountName,
				);
			}
		}

		const accountOptions = [...accountNameByKey.values()]
			.sort((first, second) => first.localeCompare(second))
			.map((accountName) => {
				return {
					value: accountName,
					label: accountName,
					group: "Accounts",
				};
			});

		const tagNameByKey = new Map<string, string>();

		for (const tag of customTags) {
			const tagName = tag.trim();

			if (tagName) {
				tagNameByKey.set(tagName.toLowerCase(), tagName);
			}
		}

		for (const transaction of transactions) {
			for (const tag of transaction.tags ?? []) {
				const tagName = tag.trim();

				if (tagName) {
					tagNameByKey.set(
						tagName.toLowerCase(),
						tagNameByKey.get(tagName.toLowerCase()) ?? tagName,
					);
				}
			}
		}

		const tagOptions = [...tagNameByKey.values()]
			.sort((first, second) => first.localeCompare(second))
			.map((tagName) => {
				return {
					value: tagName,
					label: tagName,
				};
			});

		return {
			categories: categoryOptions,
			merchants: merchantFilterOptions,
			accounts: accountOptions,
			tags: tagOptions,
			goals: [],
		};
	}, [
		accounts,
		customCategories,
		customTags,
		merchantFilterOptions,
		transactions,
	]);

	const ruleCategoryNames = useMemo(() => {
		return filterData.categories
			.filter((option) => !option.isParent)
			.map((option) => option.value);
	}, [filterData.categories]);

	const normalizedRecurringMerchants = useMemo(() => {
		return new Set(
			confirmedRecurringMerchants.map((merchantName) => {
				return merchantName.trim().toLowerCase();
			}),
		);
	}, [confirmedRecurringMerchants]);

	// Filter visible transactions
	const filteredTransactions = useMemo(() => {
		const normalizedSearch = searchQuery.trim().toLowerCase();

		let filtered = transactions.filter((transaction) => {
			if (normalizedSearch) {
				const searchableValues = [
					transaction.merchant,
					transaction.category,
					transaction.description,
					transaction.account,
					transaction.note,
					String(transaction.amount),
					String(Math.abs(Number(transaction.amount))),
					...(transaction.tags ?? []),
				];

				const matchesSearch = searchableValues.some((value) => {
					return String(value ?? "")
						.toLowerCase()
						.includes(normalizedSearch);
				});

				if (!matchesSearch) {
					return false;
				}
			}

			const transactionDate = transaction.date.slice(0, 10);

			if (dateRange.startDate && transactionDate < dateRange.startDate) {
				return false;
			}

			if (dateRange.endDate && transactionDate > dateRange.endDate) {
				return false;
			}

			if (
				!matchesTransactionFilters(
					transaction,
					transactionFilters,
					normalizedRecurringMerchants,
				)
			) {
				return false;
			}

			return true;
		});

		if (currentView === "review") {
			filtered = filtered.filter((transaction) => {
				return (
					transaction.needs_review || transaction.category === "Uncategorized"
				);
			});
		}

		return filtered;
	}, [
		transactions,
		searchQuery,
		dateRange,
		transactionFilters,
		normalizedRecurringMerchants,
		currentView,
	]);

	// Summary statistics for the complete transaction list
	const summaryStats = useMemo(() => {
		let largestTransaction = 0;
		let largestExpense = 0;

		for (let index = 0; index < transactions.length; index++) {
			const transaction = transactions[index];

			const absoluteAmount = Math.abs(transaction.amount);

			if (absoluteAmount > largestTransaction) {
				largestTransaction = absoluteAmount;
			}

			if (transaction.amount < 0 && absoluteAmount > largestExpense) {
				largestExpense = absoluteAmount;
			}
		}

		return {
			total: transactions.length,
			largestTx: largestTransaction,
			largestEx: largestExpense,
		};
	}, [transactions]);

	// Build category name -> UUID lookup
	const subcategoryIdByName = useMemo(() => {
		const lookup = new Map<string, string>();

		/*
		 * Add system categories first.
		 * In the event of bad duplicate data,
		 * the system category keeps priority.
		 */
		for (let index = 0; index < customCategories.length; index++) {
			const category = customCategories[index];

			if (!category.is_system) {
				continue;
			}

			const key = normalizeCategoryName(category.name);

			lookup.set(key, category.id);
		}

		// Add user-created categories second.
		for (let index = 0; index < customCategories.length; index++) {
			const category = customCategories[index];

			if (category.is_system) {
				continue;
			}

			const key = normalizeCategoryName(category.name);

			const existingId = lookup.get(key);

			if (existingId) {
				console.warn(`Duplicate category name detected: "${category.name}".`);

				continue;
			}

			lookup.set(key, category.id);
		}

		return lookup;
	}, [customCategories]);

	const getSubcategoryId = useCallback(
		(categoryName: string): string | undefined => {
			return subcategoryIdByName.get(normalizeCategoryName(categoryName));
		},
		[subcategoryIdByName],
	);

	// Row selection
	const handleSelectRow = useCallback((id: string, event: ReactMouseEvent) => {
		event.stopPropagation();

		setSelectedIds((previousSelectedIds) => {
			if (previousSelectedIds.includes(id)) {
				return previousSelectedIds.filter((selectedId) => {
					return selectedId !== id;
				});
			}

			return [...previousSelectedIds, id];
		});
	}, []);

	const handleMerchantChange = useCallback(
		async (transactionId: string, merchant: Pick<Merchant, "id" | "name">) => {
			const originalTransaction = transactions.find((transaction) => {
				return transaction.id === transactionId;
			});

			if (!originalTransaction) {
				return;
			}

			const isSameMerchant = originalTransaction.merchant_id
				? originalTransaction.merchant_id === merchant.id
				: normalizeMerchantName(originalTransaction.merchant) ===
					normalizeMerchantName(merchant.name);

			if (isSameMerchant) {
				return;
			}

			await updateTransaction(transactionId, {
				merchant: merchant.name,
				merchant_id: merchant.id,
			});

			setTransactionRuleSuggestion({
				type: "merchant",
				transaction: originalTransaction,
				merchant,
			});
		},
		[transactions, updateTransaction],
	);

	// Update only the category field
	const handleCategoryChange = useCallback(
		async (transactionId: string, newCategory: string) => {
			const originalTransaction = transactions.find((transaction) => {
				return transaction.id === transactionId;
			});

			if (!originalTransaction) {
				return;
			}

			if (originalTransaction.category.trim() === newCategory.trim()) {
				return;
			}

			await updateTransaction(transactionId, {
				category: newCategory,
			});

			setTransactionRuleSuggestion({
				type: "category",
				transaction: originalTransaction,
				category: newCategory,
			});
		},
		[transactions, updateTransaction],
	);

	const isDefaultSorting =
		sorting.length === 1 &&
		sorting[0]?.id === "date" &&
		sorting[0]?.desc === true;

	const isSortModified = !isDefaultSorting;

	const isColumnsModified = Object.values(columnVisibility).some(
		(isVisible) => {
			return isVisible === false;
		},
	);

	const hasDateFilter = Boolean(dateRange.startDate || dateRange.endDate);

	const hasActiveFilters =
		Boolean(searchQuery) ||
		hasDateFilter ||
		hasTransactionFilters(transactionFilters) ||
		isSortModified ||
		isColumnsModified ||
		currentView !== "all";

	const handleClearAll = useCallback(() => {
		setSearchQuery("");
		setCurrentView("all");
		setSorting(DEFAULT_SORTING);
		setColumnVisibility({});
		setDateRange({
			startDate: "",
			endDate: "",
		});
		setTransactionFilters(EMPTY_TRANSACTION_FILTERS);
	}, []);

	if (!isClient) {
		return <TransactionsPageSkeleton />;
	}

	return (
		<div className="flex flex-col h-screen font-sans bg-gray-50 dark:bg-[#121212] text-gray-900 dark:text-gray-200 transition-colors duration-200">
			<TopToolbar
				searchQuery={searchQuery}
				setSearchQuery={setSearchQuery}
				dateRange={dateRange}
				setDateRange={setDateRange}
				setShowUploader={setShowUploader}
				onAddTransaction={openAddTransaction}
				isSummaryVisible={isSummaryVisible}
				setIsSummaryVisible={setIsSummaryVisible}
				hasActiveFilters={hasActiveFilters}
				onClearAll={handleClearAll}
				filters={transactionFilters}
				filterData={filterData}
				onFiltersChange={setTransactionFilters}
				showAddTransaction
			/>

			<div className="flex flex-1 min-h-0 overflow-hidden p-6 gap-6">
				<div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#191919] border border-gray-200 dark:border-white/5 rounded-2xl shadow-sm overflow-hidden transition-colors duration-200">
					<TableToolbar
						isEditMode={isEditMode}
						setIsEditMode={setIsEditMode}
						selectedIds={selectedIds}
						setSelectedIds={setSelectedIds}
						visibleTransactionIds={filteredTransactions.map((transaction) => {
							return transaction.id;
						})}
						currentView={currentView}
						setCurrentView={setCurrentView}
						filteredLength={filteredTransactions.length}
						sorting={sorting}
						setSorting={setSorting}
						columnVisibility={columnVisibility}
						setColumnVisibility={setColumnVisibility}
						onEditMultiple={handleOpenBulkEdit}
						showAddTransaction={false}
					/>

					<div className="flex-1 overflow-hidden relative">
						<DataTable
							isLoading={isInitialDataLoading}
							transactions={filteredTransactions}
							selectedIds={selectedIds}
							merchantItems={merchantItems}
							onSelectRow={handleSelectRow}
							onRowClick={openTransaction}
							onMerchantChange={handleMerchantChange}
							columnVisibility={columnVisibility}
							isEditMode={isEditMode}
							currentView={currentView}
							sorting={sorting}
							onCategoryChange={handleCategoryChange}
							getCategoryId={getSubcategoryId}
						/>
					</div>
				</div>

				<SummarySidebar isVisible={isSummaryVisible} stats={summaryStats} />
			</div>

			{showUploader && (
				<div className="fixed inset-0 z-100 flex items-center justify-center p-4">
					<button
						type="button"
						aria-label="Close CSV uploader"
						className="absolute inset-0 bg-black/60 backdrop-blur-md transform-gpu"
						onClick={() => {
							setShowUploader(false);
						}}
					/>

					<div className="relative bg-white dark:bg-[#121212] border border-gray-200 dark:border-white/10 w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden">
						<div className="p-6 border-b border-gray-200 dark:border-white/5 flex justify-between items-center">
							<h3 className="text-lg font-black tracking-tight text-gray-900 dark:text-white">
								Import CSV Statement
							</h3>

							<button
								type="button"
								aria-label="Close CSV uploader"
								onClick={() => {
									setShowUploader(false);
								}}
								className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors"
							>
								<X size={20} />
							</button>
						</div>

						<div className="p-8">
							<CsvUploader
								onComplete={() => {
									setShowUploader(false);
								}}
							/>
						</div>
					</div>
				</div>
			)}

			{selectedTransaction && (
				<TransactionDetailsDrawer
					key={selectedTransaction.id}
					transaction={selectedTransaction}
					isOpen
					onClose={closeTransaction}
					onDeleted={reportDeletedTransactions}
					onDuplicate={openDuplicateTransaction}
					onCreateRule={(transaction) => {
						setRuleModalState({
							seed: {
								sourceTransaction: transaction,
							},
						});
					}}
				/>
			)}

			{addTransactionState && (
				<AddTransactionModal
					key={`${addTransactionState.mode}:${addTransactionState.transaction.id}`}
					initialTransaction={addTransactionState.transaction}
					isOpen
					allowDuplicate={addTransactionState.mode === "duplicate"}
					onClose={() => {
						setAddTransactionState(null);
					}}
					onCreated={() => {
						setAddTransactionState(null);
					}}
				/>
			)}
			{transactionRuleSuggestion && (
				<MerchantRuleToast
					key={[
						transactionRuleSuggestion.type,
						transactionRuleSuggestion.transaction.id,
						transactionRuleSuggestion.type === "merchant"
							? transactionRuleSuggestion.merchant.id
							: transactionRuleSuggestion.category,
					].join(":")}
					show
					variant={transactionRuleSuggestion.type}
					updatedValue={
						transactionRuleSuggestion.type === "merchant"
							? transactionRuleSuggestion.merchant.name
							: transactionRuleSuggestion.category
					}
					onDismiss={() => {
						setTransactionRuleSuggestion(null);
					}}
					onCreateRule={() => {
						if (transactionRuleSuggestion.type === "merchant") {
							setRuleModalState({
								seed: {
									sourceTransaction: transactionRuleSuggestion.transaction,
									renameMerchant: transactionRuleSuggestion.merchant,
								},
							});
						} else {
							setRuleModalState({
								seed: {
									sourceTransaction: transactionRuleSuggestion.transaction,
									updateCategory: transactionRuleSuggestion.category,
								},
							});
						}

						setTransactionRuleSuggestion(null);
					}}
				/>
			)}
			{ruleModalState && (
				<RuleModal
					key={
						ruleModalState.rule?.id ??
						[
							"new",
							ruleModalState.seed?.sourceTransaction?.id ?? "",
							ruleModalState.seed?.renameMerchant?.id ?? "",
							ruleModalState.seed?.updateCategory ?? "",
						].join(":")
					}
					isOpen
					initialRule={ruleModalState.rule ?? null}
					seed={ruleModalState.seed ?? null}
					transactions={transactions}
					accounts={accounts}
					merchants={merchants}
					categories={ruleCategoryNames}
					tags={customTags}
					onClose={() => {
						setRuleModalState(null);
					}}
					onSave={async (rule, options) => {
						const result = await saveRule(rule, options.applyToExisting);

						if (result.count > 0) {
							setToast({
								count: result.count,
								snapshot: result.snapshot,
							});
						}
					}}
					onDelete={async (rule) => {
						await deleteRule(rule.id);
					}}
				/>
			)}

			{toast && (
				<UndoToast
					show={true}
					message={`Updated ${toast.count} transactions`}
					onUndo={() => {
						useBudgetStore.getState().undoBulkUpdate(toast.snapshot);

						setToast(null);
					}}
					onClose={() => {
						setToast(null);
					}}
				/>
			)}

			{isBulkEditOpen && (
				<BulkEditTransactionsDrawer
					key={selectedIds.slice().sort().join(":")}
					transactions={selectedTransactions}
					isOpen
					onClose={() => {
						setIsBulkEditOpen(false);
					}}
					onSaved={() => {
						setIsBulkEditOpen(false);
						setSelectedIds([]);
						setIsEditMode(false);
					}}
					onDeleted={(count) => {
						reportDeletedTransactions(count);
						setIsBulkEditOpen(false);
						setSelectedIds([]);
						setIsEditMode(false);
					}}
				/>
			)}
		</div>
	);
}
