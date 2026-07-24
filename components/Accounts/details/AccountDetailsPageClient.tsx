"use client";

import {
	useCallback,
	useEffect,
	useMemo,
	useState,
	type MouseEvent as ReactMouseEvent,
} from "react";
import dynamic from "next/dynamic";
import {
	useParams,
	usePathname,
	useRouter,
	useSearchParams,
} from "next/navigation";
import { ChevronRight, CreditCard, X } from "lucide-react";
import type { SortingState, VisibilityState } from "@tanstack/react-table";

import { AccountActionMenu } from "@/components/Accounts/details/AccountActionMenu";
import { AccountDetailsPageSkeleton } from "@/components/Accounts/details/AccountDetailsPageSkeleton";
import { AccountBalanceChart } from "@/components/Accounts/details/AccountBalanceChart";
import { AccountFiltersMenu } from "@/components/Accounts/details/AccountFiltersMenu";
import { AccountSummaryCards } from "@/components/Accounts/details/AccountSummaryCards";
import {
	buildBalanceData,
	downloadCsv,
	EMPTY_ACCOUNT_TRANSACTION_FILTERS,
	hasAccountTransactionFilters,
	inferAccountType,
	inferInstitution,
	matchesAccountTransactionFilters,
	normalizeAccountTimeframe,
	readAccountTransactionFilters,
	writeAccountTransactionFiltersToSearchParams,
	type AccountCategoryOption,
	type AccountTransactionFilterResolution,
	type AccountTransactionFilters,
} from "@/components/Accounts/details/accountDetailsUtils";
import { MoveTransactionsDialog } from "@/components/Accounts/details/MoveTransactionsDialog";
import CsvUploader from "@/components/CsvUploader";
import { DataTable } from "@/components/Transactions/DataTable";
import { TableToolbar } from "@/components/Transactions/TableToolbar";
import { TRANSACTION_RETURN_URL_KEY } from "@/lib/transactions/navigation";
import {
	type Account,
	type Transaction,
	useBudgetStore,
} from "@/store/useBudgetStore";
import { useMerchantOptions } from "@/hooks/useMerchantOptions";
import type { MerchantListItem } from "@/components/Merchants/types";
import { relativeTime } from "@/utils/formatters";

const AddTransactionModal = dynamic(
	() => {
		return import("@/components/Budget/AddTransactionModal");
	},
	{
		ssr: false,
	},
);

const BulkEditTransactionsDrawer = dynamic(
	() => {
		return import("@/components/Transactions/BulkEditTransactionsDrawer");
	},
	{
		ssr: false,
	},
);

type AccountWithDetails = Account & {
	institution?: string | null;
	account_type?: string | null;
	credit_limit?: number | null;
	current_balance?: number | null;
	updated_at?: string | null;
};

const DEFAULT_SORTING: SortingState = [
	{
		id: "date",
		desc: true,
	},
];

function normalizeLookupValue(value: string): string {
	return value.trim().toLowerCase();
}

function createBlankTransaction(
	accountId: string,
	accountName: string,
): Transaction {
	return {
		id: crypto.randomUUID(),
		date: new Date().toISOString().slice(0, 10),
		merchant: "",
		merchant_id: null,
		description: "",
		amount: 0,
		category: "Uncategorized",
		account: accountName,
		account_id: accountId,
		needs_review: true,
		needs_subcat: true,
		tags: [],
		note: "",
	};
}

export default function AccountDetailsPageClient() {
	const params = useParams<{ accountId: string }>();
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const queryString = searchParams.toString();

	const accountId = params.accountId
		? decodeURIComponent(params.accountId)
		: "";

	const transactions = useBudgetStore((state) => {
		return state.transactions;
	});
	const accounts = useBudgetStore((state) => {
		return state.accounts;
	});
	const fetchTransactions = useBudgetStore((state) => {
		return state.fetchTransactions;
	});
	const fetchAccounts = useBudgetStore((state) => {
		return state.fetchAccounts;
	});
	const customCategories = useBudgetStore((state) => {
		return state.customCategories;
	});
	const fetchCustomCategories = useBudgetStore((state) => {
		return state.fetchCustomCategories;
	});
	const updateTransaction = useBudgetStore((state) => {
		return state.updateTransaction;
	});

	const [isEditMode, setIsEditMode] = useState(false);
	const [selectedIds, setSelectedIds] = useState<string[]>([]);
	const [sorting, setSorting] = useState<SortingState>(DEFAULT_SORTING);
	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
		date: false,
		merchant: true,
		category: true,
		account: false,
		amount: true,
	});
	const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
	const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
	const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
	const [showUploader, setShowUploader] = useState(false);
	const [isInitialDataLoading, setIsInitialDataLoading] = useState(true);
	const merchantItems = useMerchantOptions();

	useEffect(() => {
		let active = true;

		const loadInitialData = async (): Promise<void> => {
			try {
				await Promise.all([
					fetchTransactions(),
					fetchAccounts(),
					fetchCustomCategories(),
				]);
			} catch (error) {
				console.error("Failed to load account details data:", error);
			} finally {
				if (active) {
					setIsInitialDataLoading(false);
				}
			}
		};

		void loadInitialData();

		return () => {
			active = false;
		};
	}, [fetchAccounts, fetchCustomCategories, fetchTransactions]);

	useEffect(() => {
		const handleEscape = (event: KeyboardEvent): void => {
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

	const { account, accountName, accountTransactions } = useMemo(() => {
		const resolvedAccount = accounts.find((item) => {
			return item.id === accountId;
		}) as AccountWithDetails | undefined;

		const resolvedAccountName =
			resolvedAccount?.name ||
			transactions.find((transaction) => {
				return transaction.account_id === accountId;
			})?.account ||
			"Account";

		const resolvedAccountTransactions = transactions.filter((transaction) => {
			if (transaction.account_id) {
				return transaction.account_id === accountId;
			}

			return transaction.account === resolvedAccountName;
		});

		return {
			account: resolvedAccount,
			accountName: resolvedAccountName,
			accountTransactions: resolvedAccountTransactions,
		};
	}, [accountId, accounts, transactions]);

	const filters = useMemo(() => {
		return readAccountTransactionFilters(new URLSearchParams(queryString));
	}, [queryString]);

	const timeframe = normalizeAccountTimeframe(searchParams.get("range"));

	const filterResolution = useMemo<AccountTransactionFilterResolution>(() => {
		const categoryNameById = new Map<string, string>();
		const merchantNameById = new Map<string, string>();

		for (const category of customCategories) {
			const categoryId = category.id?.trim();
			const categoryName = category.name?.trim();

			if (categoryId && categoryName) {
				categoryNameById.set(categoryId, categoryName);
			}
		}

		for (const merchant of merchantItems) {
			const merchantId = merchant.id?.trim();
			const merchantName = merchant.name?.trim();

			if (merchantId && merchantName) {
				merchantNameById.set(merchantId, merchantName);
			}
		}

		for (const transaction of accountTransactions) {
			const merchantId = transaction.merchant_id?.trim();
			const merchantName = transaction.merchant?.trim();

			if (merchantId && merchantName && !merchantNameById.has(merchantId)) {
				merchantNameById.set(merchantId, merchantName);
			}
		}

		return {
			categoryNameById,
			merchantNameById,
		};
	}, [accountTransactions, customCategories, merchantItems]);

	const filteredTransactions = useMemo(() => {
		return accountTransactions.filter((transaction) => {
			return matchesAccountTransactionFilters(
				transaction,
				filters,
				filterResolution,
			);
		});
	}, [accountTransactions, filterResolution, filters]);

	const subcategoryIdByName = useMemo(() => {
		const lookup = new Map<string, string>();

		for (const category of customCategories) {
			if (!category.is_system) {
				continue;
			}

			lookup.set(normalizeLookupValue(category.name), category.id);
		}

		for (const category of customCategories) {
			if (category.is_system) {
				continue;
			}

			const key = normalizeLookupValue(category.name);

			if (!lookup.has(key)) {
				lookup.set(key, category.id);
			}
		}

		return lookup;
	}, [customCategories]);

	const getCategoryId = useCallback(
		(categoryName: string): string | undefined => {
			return subcategoryIdByName.get(normalizeLookupValue(categoryName));
		},
		[subcategoryIdByName],
	);

	const selectedTransactions = useMemo(() => {
		const selectedIdSet = new Set(selectedIds);

		return accountTransactions.filter((transaction) => {
			return selectedIdSet.has(transaction.id);
		});
	}, [accountTransactions, selectedIds]);

	const accountFilterOptions = useMemo(() => {
		const categoryById = new Map<string, AccountCategoryOption>();
		const merchantById = new Map<string, MerchantListItem>();
		const tags = new Set<string>();

		for (const category of customCategories) {
			const categoryName = category.name?.trim();

			if (!categoryName || !category.parent_name?.trim()) {
				continue;
			}

			const categoryId = category.id?.trim();

			if (!categoryId) {
				continue;
			}

			categoryById.set(categoryId, {
				value: categoryId,
				label: categoryName,
				iconName: category.icon_name?.trim() || categoryName,
				colorKey:
					category.color_key?.trim() ||
					category.parent_name?.trim() ||
					categoryName,
			});
		}

		for (const merchant of merchantItems) {
			const merchantName = merchant.name?.trim();

			if (!merchantName) {
				continue;
			}

			const merchantId = merchant.id?.trim();

			if (!merchantId) {
				continue;
			}

			merchantById.set(merchantId, {
				...merchant,
				id: merchantId,
				name: merchantName,
			});
		}

		const fallbackMerchantCounts = new Map<string, number>();

		for (const transaction of accountTransactions) {
			const categoryName = transaction.category?.trim();
			const merchantName = transaction.merchant?.trim();

			if (categoryName) {
				const categoryId = subcategoryIdByName.get(
					normalizeLookupValue(categoryName),
				);

				if (categoryId && !categoryById.has(categoryId)) {
					categoryById.set(categoryId, {
						value: categoryId,
						label: categoryName,
						iconName: categoryName,
						colorKey: categoryName,
					});
				}
			}

			const merchantId = transaction.merchant_id?.trim();

			if (merchantId && merchantName) {
				fallbackMerchantCounts.set(
					merchantId,
					(fallbackMerchantCounts.get(merchantId) ?? 0) + 1,
				);

				if (!merchantById.has(merchantId)) {
					merchantById.set(merchantId, {
						id: merchantId,
						name: merchantName,
						logoUrl: null,
						transactionCount: 0,
					});
				}
			}

			for (const tag of transaction.tags ?? []) {
				const tagName = tag.trim();

				if (tagName) {
					tags.add(tagName);
				}
			}
		}

		for (const [merchantId, transactionCount] of fallbackMerchantCounts) {
			const merchant = merchantById.get(merchantId);

			if (merchant && merchant.transactionCount === 0) {
				merchantById.set(merchantId, {
					...merchant,
					transactionCount,
				});
			}
		}

		return {
			categories: [...categoryById.values()].sort((first, second) => {
				return first.label.localeCompare(second.label);
			}),
			merchants: [...merchantById.values()].sort((first, second) => {
				return (
					second.transactionCount - first.transactionCount ||
					first.name.localeCompare(second.name)
				);
			}),
			tags: [...tags].sort(),
		};
	}, [
		accountTransactions,
		customCategories,
		merchantItems,
		subcategoryIdByName,
	]);

	useEffect(() => {
		const legacyParams = new URLSearchParams(queryString);
		const legacyCategoryNames = [
			...legacyParams.getAll("categoryNames"),
			...(legacyParams.get("category")
				? [legacyParams.get("category") as string]
				: []),
		]
			.flatMap((value) => value.split(","))
			.map((value) => value.trim())
			.filter(Boolean);
		const legacyMerchantName = legacyParams.get("merchant")?.trim() ?? "";

		if (legacyCategoryNames.length === 0 && !legacyMerchantName) {
			return;
		}

		const categoryIdByName = new Map(
			accountFilterOptions.categories.map((category) => {
				return [normalizeLookupValue(category.label), category.value] as const;
			}),
		);
		const categoryIds = [
			...new Set(
				legacyCategoryNames
					.map((categoryName) => {
						return categoryIdByName.get(normalizeLookupValue(categoryName));
					})
					.filter((value): value is string => Boolean(value)),
			),
		];

		const legacyCategoryCount = new Set(
			legacyCategoryNames.map(normalizeLookupValue),
		).size;

		if (categoryIds.length !== legacyCategoryCount) {
			return;
		}

		const merchantIds = legacyMerchantName
			? [
					accountFilterOptions.merchants.find((merchant) => {
						return (
							normalizeLookupValue(merchant.name) ===
							normalizeLookupValue(legacyMerchantName)
						);
					})?.id ?? "",
				].filter(Boolean)
			: [];

		if (legacyMerchantName && merchantIds.length === 0) {
			return;
		}

		legacyParams.delete("category");
		legacyParams.delete("categoryNames");
		legacyParams.delete("merchant");
		legacyParams.delete("categories");
		legacyParams.delete("merchants");

		for (const categoryId of categoryIds) {
			legacyParams.append("categories", categoryId);
		}

		for (const merchantId of merchantIds) {
			legacyParams.append("merchants", merchantId);
		}

		legacyParams.sort();

		const nextQuery = legacyParams.toString();

		if (nextQuery === queryString) {
			return;
		}

		router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
			scroll: false,
		});
	}, [accountFilterOptions, pathname, queryString, router]);

	const calculatedBalance = accountTransactions.reduce((total, transaction) => {
		return total + (Number(transaction.amount) || 0);
	}, 0);

	const currentBalance =
		account?.current_balance == null
			? calculatedBalance
			: Number(account.current_balance);

	const balanceData = useMemo(() => {
		return buildBalanceData(accountTransactions, timeframe);
	}, [accountTransactions, timeframe]);

	const institution =
		account?.institution?.trim() || inferInstitution(accountName);
	const accountType =
		account?.account_type?.trim() || inferAccountType(accountName);
	const creditLimit = Math.max(Number(account?.credit_limit) || 0, 0);
	const lastUpdated = relativeTime(
		account?.updated_at ?? new Date().toISOString(),
	);

	const updateUrl = useCallback(
		(mutator: (params: URLSearchParams) => void): void => {
			const nextParams = new URLSearchParams(searchParams.toString());
			mutator(nextParams);
			const nextQuery = nextParams.toString();

			router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
				scroll: false,
			});
		},
		[pathname, router, searchParams],
	);

	const applyFilters = useCallback(
		(nextFilters: AccountTransactionFilters): void => {
			setIsEditMode(false);
			setSelectedIds([]);

			updateUrl((nextParams) => {
				writeAccountTransactionFiltersToSearchParams(nextParams, nextFilters);
			});
		},
		[updateUrl],
	);

	const resetFilters = useCallback((): void => {
		setIsEditMode(false);
		setSelectedIds([]);

		updateUrl((nextParams) => {
			writeAccountTransactionFiltersToSearchParams(
				nextParams,
				EMPTY_ACCOUNT_TRANSACTION_FILTERS,
			);
		});
	}, [updateUrl]);

	const changeTimeframe = useCallback(
		(nextTimeframe: typeof timeframe): void => {
			updateUrl((nextParams) => {
				if (nextTimeframe === "all") {
					nextParams.delete("range");
				} else {
					nextParams.set("range", nextTimeframe);
				}
			});
		},
		[updateUrl],
	);

	const openTransaction = useCallback(
		(transaction: Transaction): void => {
			if (typeof window !== "undefined") {
				const returnUrl = [
					window.location.pathname,
					window.location.search,
					window.location.hash,
				].join("");

				window.sessionStorage.setItem(TRANSACTION_RETURN_URL_KEY, returnUrl);
			}

			router.push(`/transactions/${encodeURIComponent(transaction.id)}`, {
				scroll: false,
			});
		},
		[router],
	);

	const handleSelectRow = useCallback(
		(transactionId: string, event: ReactMouseEvent): void => {
			event.stopPropagation();

			setSelectedIds((current) => {
				return current.includes(transactionId)
					? current.filter((id) => {
							return id !== transactionId;
						})
					: [...current, transactionId];
			});
		},
		[],
	);

	const downloadTransactions = (): void => {
		downloadCsv(`${accountName}-transactions.csv`, [
			["Date", "Merchant", "Category", "Amount", "Account"],
			...accountTransactions.map((transaction) => {
				return [
					transaction.date,
					transaction.merchant,
					transaction.category,
					transaction.amount,
					transaction.account,
				];
			}),
		]);
	};

	const downloadBalanceHistory = (): void => {
		downloadCsv(`${accountName}-balance-history.csv`, [
			["Date", "Balance"],
			...balanceData.map((point) => {
				return [point.date, point.balance];
			}),
		]);
	};

	const copyBalanceHistory = async (): Promise<void> => {
		const value = balanceData
			.map((point) => {
				return `${point.date}\t${point.balance}`;
			})
			.join("\n");

		await navigator.clipboard.writeText(value);
	};

	const moveSelectedTransactions = async (
		targetAccountId: string,
	): Promise<void> => {
		const targetAccount = accounts.find((item) => {
			return item.id === targetAccountId;
		});

		if (!targetAccount) {
			return;
		}

		await Promise.all(
			selectedIds.map((transactionId) => {
				return updateTransaction(transactionId, {
					account_id: targetAccount.id,
					account: targetAccount.name,
				});
			}),
		);

		setSelectedIds([]);
		setIsEditMode(false);
	};

	const activeFilters = hasAccountTransactionFilters(filters);
	const hasNoFilteredTransactions =
		activeFilters && filteredTransactions.length === 0;

	if (isInitialDataLoading) {
		return <AccountDetailsPageSkeleton />;
	}

	return (
		<div className="flex min-h-screen flex-col bg-gray-50 p-3 text-gray-900 transition-colors md:p-5 dark:bg-[#171716] dark:text-[#F4F4F2]">
			<header className="mb-4 flex flex-wrap items-center justify-between gap-3 px-1">
				<div className="flex min-w-0 items-center gap-3">
					<button
						type="button"
						onClick={() => {
							router.push("/accounts");
						}}
						className="text-base font-semibold text-gray-500 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
					>
						Accounts
					</button>

					<ChevronRight
						size={18}
						className="text-gray-400 dark:text-gray-500"
					/>

					<div className="flex min-w-0 items-center gap-2">
						<div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#103B55] text-white ring-2 ring-[#4AB8FF]/20">
							<CreditCard size={15} />
						</div>

						<h1 className="truncate text-lg font-semibold text-gray-900 dark:text-white">
							{accountName}
						</h1>
					</div>
				</div>

				<div className="flex items-center gap-2">
					<AccountActionMenu
						onEditAccount={() => {
							router.push(
								`/accounts/details/${encodeURIComponent(accountId)}/edit`,
							);
						}}
						onInstitutionSettings={() => {
							router.push(
								`/accounts/details/${encodeURIComponent(accountId)}/edit#institution`,
							);
						}}
						onDownloadTransactions={downloadTransactions}
						onImportTransactions={() => {
							setShowUploader(true);
						}}
						onTransferData={() => {
							setSelectedIds(
								accountTransactions.map((transaction) => {
									return transaction.id;
								}),
							);
							setIsEditMode(true);
							setIsMoveDialogOpen(true);
						}}
						onCopyBalanceHistory={() => {
							void copyBalanceHistory();
						}}
						onDownloadBalanceHistory={downloadBalanceHistory}
						onImportBalanceHistory={() => {
							setShowUploader(true);
						}}
						onEditBalanceHistory={() => {
							router.push(
								`/accounts/details/${encodeURIComponent(accountId)}/edit#balance`,
							);
						}}
					/>

					<AccountFiltersMenu
						key={queryString}
						filters={filters}
						categories={accountFilterOptions.categories}
						merchants={accountFilterOptions.merchants}
						tags={accountFilterOptions.tags}
						onApply={applyFilters}
						onReset={resetFilters}
					/>
				</div>
			</header>

			<AccountBalanceChart
				currentBalance={currentBalance}
				balanceData={balanceData}
				timeframe={timeframe}
				onTimeframeChange={changeTimeframe}
			/>

			<div className="mt-4 grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2.2fr)_minmax(320px,0.95fr)]">
				<section className="flex min-h-[620px] min-w-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/5 dark:bg-[#222220]">
					{hasNoFilteredTransactions ? (
						<div className="flex min-h-14 items-center border-b border-gray-200 px-5 py-3 dark:border-white/5">
							<h2 className="text-lg font-semibold text-gray-900 dark:text-white">
								Transactions
							</h2>
						</div>
					) : (
						<TableToolbar
							title="Transactions"
							showViewSelector={false}
							showAddTransaction
							onAddTransaction={() => {
								setIsAddTransactionOpen(true);
							}}
							isEditMode={isEditMode}
							setIsEditMode={setIsEditMode}
							selectedIds={selectedIds}
							setSelectedIds={setSelectedIds}
							visibleTransactionIds={filteredTransactions.map((transaction) => {
								return transaction.id;
							})}
							filteredLength={filteredTransactions.length}
							sorting={sorting}
							setSorting={setSorting}
							columnVisibility={columnVisibility}
							setColumnVisibility={setColumnVisibility}
							columnOptions={[
								{ id: "merchant", label: "Merchant" },
								{ id: "category", label: "Category" },
								{ id: "amount", label: "Amount" },
							]}
							onEditMultiple={() => {
								if (selectedIds.length > 0) {
									setIsBulkEditOpen(true);
								}
							}}
							onMoveTransactions={() => {
								if (selectedIds.length > 0) {
									setIsMoveDialogOpen(true);
								}
							}}
						/>
					)}

					{hasNoFilteredTransactions ? (
						<div className="flex min-h-80 flex-1 flex-col items-center justify-center px-6 py-16 text-center">
							<h3 className="text-xl font-semibold text-gray-900 dark:text-white">
								No transactions found.
							</h3>

							<p className="mt-3 max-w-sm text-base leading-7 text-gray-600 dark:text-gray-400">
								We couldn&apos;t find any transactions matching your filters.
							</p>

							<div className="mt-7 flex flex-wrap items-center justify-center gap-3">
								<button
									type="button"
									onClick={() => {
										setIsAddTransactionOpen(true);
									}}
									className="h-12 rounded-xl bg-[#FF5A35] px-6 text-base font-bold text-white transition-colors hover:bg-[#E04825]"
								>
									Add transaction
								</button>

								<button
									type="button"
									onClick={resetFilters}
									className="h-12 rounded-xl border border-gray-300 bg-white px-6 text-base font-semibold text-gray-900 transition-colors hover:bg-gray-50 dark:border-white/15 dark:bg-transparent dark:text-white dark:hover:bg-white/5"
								>
									Reset filters
								</button>
							</div>
						</div>
					) : (
						<div className="min-h-0 flex-1">
							<DataTable
								transactions={filteredTransactions}
								selectedIds={selectedIds}
								onSelectRow={handleSelectRow}
								onRowClick={openTransaction}
								columnVisibility={columnVisibility}
								isEditMode={isEditMode}
								currentView="all"
								sorting={sorting}
								isCategoryView
								getCategoryId={getCategoryId}
								isMerchantNavigationEnabled
							/>
						</div>
					)}
				</section>

				<AccountSummaryCards
					institution={institution}
					accountType={accountType}
					creditLimit={creditLimit}
					totalTransactions={accountTransactions.length}
					lastUpdated={lastUpdated}
				/>
			</div>

			{showUploader && (
				<div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
					<button
						type="button"
						aria-label="Close CSV uploader"
						className="absolute inset-0 bg-black/60 backdrop-blur-sm"
						onClick={() => {
							setShowUploader(false);
						}}
					/>

					<div className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#121212]">
						<div className="flex items-center justify-between border-b border-gray-200 p-6 dark:border-white/5">
							<h3 className="text-lg font-black tracking-tight">
								Import CSV Statement
							</h3>

							<button
								type="button"
								aria-label="Close CSV uploader"
								onClick={() => {
									setShowUploader(false);
								}}
								className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-white/5"
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

			{isAddTransactionOpen && (
				<AddTransactionModal
					key={`new:${accountId}`}
					initialTransaction={createBlankTransaction(accountId, accountName)}
					isOpen
					onClose={() => {
						setIsAddTransactionOpen(false);
					}}
					onCreated={() => {
						setIsAddTransactionOpen(false);
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
					onDeleted={() => {
						setIsBulkEditOpen(false);
						setSelectedIds([]);
						setIsEditMode(false);
					}}
				/>
			)}

			<MoveTransactionsDialog
				open={isMoveDialogOpen}
				transactionCount={selectedIds.length}
				accounts={accounts}
				currentAccountId={accountId}
				onClose={() => {
					setIsMoveDialogOpen(false);
				}}
				onMove={moveSelectedTransactions}
			/>
		</div>
	);
}
