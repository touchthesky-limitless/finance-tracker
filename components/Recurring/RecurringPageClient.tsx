"use client";

import {
	useCallback,
	useEffect,
	useMemo,
	useState,
	useSyncExternalStore,
	type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Settings } from "lucide-react";

import {
	MerchantMergeDialog,
	type MerchantEditorValue,
} from "@/components/Merchants/MerchantEditorModal";

import { RecurringContent } from "@/components/Recurring/RecurringContent";
import { RecurringEditorDialog } from "@/components/Recurring/RecurringEditorDialog";
import { RecurringFilterPopover } from "@/components/Recurring/RecurringFilterPopover";
import { RecurringGroupingDropdown } from "@/components/Recurring/RecurringControls";
import { RecurringManagerDialog } from "@/components/Recurring/RecurringManagerDialog";
import { RecurringMerchantSearchDialog } from "@/components/Recurring/RecurringMerchantSearchDialog";
import { RecurringMonthlySummary } from "@/components/Recurring/RecurringMonthlySummary";
import { RecurringPageSkeleton } from "@/components/Recurring/RecurringPageSkeleton";
import { RecurringReviewDialog } from "@/components/Recurring/RecurringReviewDialog";
import type {
	AllRecurringGroupMode,
	RecurringCandidate,
	RecurringFilters,
	RecurringRecord,
	RecurringSortState,
	RecurringType,
} from "@/components/Recurring/types";
import { EMPTY_RECURRING_FILTERS } from "@/components/Recurring/types";
import {
	readRecurringFiltersFromSearchParams,
	writeRecurringFiltersToSearchParams,
} from "@/components/Recurring/recurringUrlState";
import {
	buildPredictedBillCandidates,
	buildRecurringCandidates,
	candidateFromMerchant,
	countRecurringFilters,
	getOccurrencesForMonth,
	matchesRecurringFilters,
	normalize,
} from "@/components/Recurring/recurringUtils";
import type { MerchantListItem } from "@/components/Merchants/types";
import type {
	TransactionFilterData,
	TransactionFilterOption,
} from "@/components/Transactions/transactionFilters";
import { CATEGORY_HIERARCHY } from "@/constants";
import { useBudgetData } from "@/hooks/useBudgetData";
import { useMerchantOptions } from "@/hooks/useMerchantOptions";
import { type Transaction, useBudgetStore } from "@/store/useBudgetStore";
import { deleteCustomMerchantRecord } from "@/lib/merchants/merchantRepository";
import { useRecurringStore } from "@/store/useRecurringStore";
import { appendNavigationSource } from "@/lib/navigation/breadcrumb";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { MOBILE_BREAKPOINT } from "@/config/breakpoints";

function subscribeToClient(): () => void {
	return () => {};
}
function getClientSnapshot(): boolean {
	return true;
}
function getServerSnapshot(): boolean {
	return false;
}

type ActiveDialog =
	| null
	| { type: "review" }
	| { type: "manager" }
	| {
			type: "search";
			defaultType: RecurringType;
	  }
	| {
			type: "editor";
			candidate: RecurringCandidate;
			existingRecord: RecurringRecord | null;
			returnTo: "search" | "page";
	  };

export default function RecurringPageClient() {
	const isClient = useSyncExternalStore(
		subscribeToClient,
		getClientSnapshot,
		getServerSnapshot,
	);
	const pathname = usePathname();
	const router = useRouter();
	const searchParams = useSearchParams();
	const searchParamsString = searchParams.toString();
	const isMobile = useMediaQuery(MOBILE_BREAKPOINT);
	const tab: "monthly" | "all" = pathname.endsWith("/all") ? "all" : "monthly";
	const transactions = useBudgetStore((state) => {
		return state.transactions;
	});
	const merchants = useBudgetStore((state) => {
		return state.merchants;
	});
	const accounts = useBudgetStore((state) => {
		return state.accounts;
	});
	const customCategories = useBudgetStore((state) => {
		return state.customCategories;
	});
	const fetchTransactions = useBudgetStore((state) => {
		return state.fetchTransactions;
	});
	const fetchAccounts = useBudgetStore((state) => {
		return state.fetchAccounts;
	});
	const fetchMerchants = useBudgetStore((state) => {
		return state.fetchMerchants;
	});
	const fetchCustomCategories = useBudgetStore((state) => {
		return state.fetchCustomCategories;
	});
	const updateTransaction = useBudgetStore((state) => {
		return state.updateTransaction;
	});
	const confirmRecurring = useBudgetStore((state) => {
		return state.confirmRecurring;
	});
	const records = useRecurringStore((state) => {
		return state.records;
	});
	const dismissedCandidateKeys = useRecurringStore((state) => {
		return state.dismissedCandidateKeys;
	});
	const suppressedSourceKeys = useRecurringStore((state) => {
		return state.suppressedSourceKeys;
	});
	const recurringHydrated = useRecurringStore((state) => {
		return state.hasHydrated;
	});
	const fetchRecurringData = useRecurringStore((state) => {
		return state.fetchRecurringData;
	});
	const upsertRecord = useRecurringStore((state) => {
		return state.upsertRecord;
	});
	const removeRecord = useRecurringStore((state) => {
		return state.removeRecord;
	});
	const dismissCandidate = useRecurringStore((state) => {
		return state.dismissCandidate;
	});
	const merchantItems = useMerchantOptions();
	const { predictedBills } = useBudgetData("all");

	const [isInitialDataLoading, setIsInitialDataLoading] = useState(true);
	const [view, setView] = useState<"list" | "calendar">("list");
	const [month, setMonth] = useState(() => {
		const now = new Date();
		return new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1, 12));
	});
	const filters = useMemo(() => {
		return readRecurringFiltersFromSearchParams(
			new URLSearchParams(searchParamsString),
		);
	}, [searchParamsString]);
	const activeFilterCount = countRecurringFilters(filters);
	const [sort, setSort] = useState<RecurringSortState>({
		key: "date",
		direction: "asc",
	});
	const [groupMode, setGroupMode] = useState<AllRecurringGroupMode>("status");
	const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);
	const [reviewIndex, setReviewIndex] = useState(0);
	const [mergeState, setMergeState] = useState<{
		source: MerchantEditorValue;
		record: RecurringRecord;
	} | null>(null);

	const replaceActiveDialog = (
		nextDialog: Exclude<ActiveDialog, null>,
	): void => {
		setActiveDialog(nextDialog);
	};

	const navigateToTab = (nextTab: "monthly" | "all"): void => {
		const nextPath =
			nextTab === "all" ? "/recurring/all" : "/recurring/upcoming";

		router.push(
			searchParamsString ? `${nextPath}?${searchParamsString}` : nextPath,
		);
	};

	const applyFilters = (nextFilters: RecurringFilters): void => {
		const nextSearchParams = new URLSearchParams(searchParamsString);

		writeRecurringFiltersToSearchParams(nextSearchParams, nextFilters);

		const nextQuery = nextSearchParams.toString();

		router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
			scroll: false,
		});
	};

	useEffect(() => {
		let active = true;
		void Promise.all([
			fetchTransactions(),
			fetchAccounts(),
			fetchMerchants(),
			fetchCustomCategories(),
			fetchRecurringData(),
		])
			.catch((error) => {
				console.error("Failed to load recurring data:", error);
			})
			.finally(() => {
				if (active) setIsInitialDataLoading(false);
			});
		return () => {
			active = false;
		};
	}, [
		fetchAccounts,
		fetchCustomCategories,
		fetchMerchants,
		fetchRecurringData,
		fetchTransactions,
	]);

	const allRecords = records;

	const filteredRecords = useMemo(() => {
		return allRecords.filter((record) => {
			return matchesRecurringFilters(record, filters);
		});
	}, [allRecords, filters]);

	const occurrences = useMemo(() => {
		return getOccurrencesForMonth(filteredRecords, month, transactions);
	}, [filteredRecords, month, transactions]);

	const knownSourceKeys = useMemo(() => {
		return new Set(
			records.map((record) => {
				return record.sourceKey;
			}),
		);
	}, [records]);

	const hiddenSourceKeys = useMemo(() => {
		return new Set([...dismissedCandidateKeys, ...suppressedSourceKeys]);
	}, [dismissedCandidateKeys, suppressedSourceKeys]);

	const reviewCandidates = useMemo(() => {
		const candidateByKey = new Map<string, RecurringCandidate>();

		for (const candidate of buildRecurringCandidates(
			transactions,
			merchantItems,
			knownSourceKeys,
			hiddenSourceKeys,
			accounts,
			customCategories,
		)) {
			candidateByKey.set(candidate.key, candidate);
		}

		/*
		 * Dashboard bill predictions are also suggestions,
		 * never confirmed records. They override matching
		 * inferred suggestions because they carry a more
		 * specific predicted amount and due date.
		 */
		for (const candidate of buildPredictedBillCandidates(
			predictedBills,
			merchantItems,
			transactions,
			knownSourceKeys,
			hiddenSourceKeys,
			accounts,
			customCategories,
		)) {
			candidateByKey.set(candidate.key, candidate);
		}

		return [...candidateByKey.values()]
			.sort((first, second) => {
				return (
					second.transactions.length - first.transactions.length ||
					first.merchantName.localeCompare(second.merchantName, "en-US", {
						sensitivity: "base",
					})
				);
			})
			.slice(0, 12);
	}, [
		accounts,
		customCategories,
		hiddenSourceKeys,
		knownSourceKeys,
		merchantItems,
		predictedBills,
		transactions,
	]);
	const activeCandidate =
		reviewCandidates[reviewIndex] ?? reviewCandidates[0] ?? null;

	const categoryOptions = useMemo<TransactionFilterOption[]>(() => {
		const options: TransactionFilterOption[] = [];
		const roots = new Map(
			customCategories
				.filter((category) => {
					return !category.parent_name;
				})
				.map((category) => {
					return [normalize(category.name), category];
				}),
		);
		for (const [parentName] of Object.entries(CATEGORY_HIERARCHY)) {
			const root = roots.get(normalize(parentName));
			options.push({
				value: root?.id ?? `parent:${normalize(parentName)}`,
				label: parentName,
				isParent: true,
				iconName: root?.icon_name ?? parentName,
				colorKey: root?.color_key ?? parentName,
			});
			for (const category of customCategories.filter((item) => {
				return normalize(item.parent_name) === normalize(parentName);
			})) {
				options.push({
					value: category.id,
					label: category.name,
					group: parentName,
					iconName: category.icon_name ?? category.name,
					colorKey: category.color_key ?? parentName,
				});
			}
		}
		for (const category of customCategories) {
			if (
				!category.parent_name ||
				options.some((option) => {
					return option.value === category.id;
				})
			) {
				continue;
			}
			options.push({
				value: category.id,
				label: category.name,
				group: category.parent_name,
				iconName: category.icon_name ?? category.name,
				colorKey: category.color_key ?? category.parent_name,
			});
		}
		return options;
	}, [customCategories]);

	const accountOptions = useMemo<TransactionFilterOption[]>(() => {
		return accounts.map((account) => {
			return {
				value: account.id,
				label: account.name,
				group: "Assets::Cash",
			};
		});
	}, [accounts]);

	const filterData = useMemo<TransactionFilterData>(() => {
		return {
			categories: categoryOptions,
			merchants: [],
			accounts: accountOptions,
			tags: [],
			goals: [],
		};
	}, [accountOptions, categoryOptions]);

	const transactionMatchesMerchant = (
		transaction: Transaction,
		merchant: Pick<MerchantEditorValue, "id" | "name">,
	): boolean => {
		if (transaction.merchant_id && transaction.merchant_id === merchant.id) {
			return true;
		}

		return normalize(transaction.merchant) === normalize(merchant.name);
	};

	const replaceRecurringMerchantName = (
		sourceName: string,
		targetName: string,
	): void => {
		useBudgetStore.setState((state) => {
			const sourceKey = normalize(sourceName);
			const targetKey = normalize(targetName);
			const remaining = state.confirmedRecurringMerchants.filter((name) => {
				const key = normalize(name);

				return key !== sourceKey && key !== targetKey;
			});

			return {
				confirmedRecurringMerchants: [...remaining, targetName],
			};
		});
	};

	const handleMergeMerchant = async (
		source: MerchantEditorValue,
		target: {
			id: string;
			name: string;
		},
		sourceRecord: RecurringRecord,
	): Promise<void> => {
		if (source.id === target.id) {
			throw new Error("Choose a different merchant.");
		}

		const sourceTransactions = transactions.filter((transaction) => {
			return transactionMatchesMerchant(transaction, source);
		});

		await Promise.all(
			sourceTransactions.map((transaction) => {
				return updateTransaction(transaction.id, {
					merchant: target.name,
					merchant_id: target.id,
				});
			}),
		);

		const sourceMerchantRecord = merchants.find((merchant) => {
			return merchant.id === source.id;
		});

		if (sourceMerchantRecord && !sourceMerchantRecord.is_system) {
			await deleteCustomMerchantRecord(source.id);
		}

		const targetMerchant = merchantItems.find((merchant) => {
			return merchant.id === target.id;
		});
		const targetSourceKey = `merchant:${target.id}`;
		const targetRecurringRecord = records.find((record) => {
			return (
				record.id !== sourceRecord.id &&
				(record.sourceKey === targetSourceKey ||
					record.merchantId === target.id)
			);
		});

		if (targetRecurringRecord) {
			await removeRecord(sourceRecord.id, {
				suppressSourceKey: sourceRecord.sourceKey,
			});
		} else {
			await upsertRecord(
				{
					...sourceRecord,
					sourceKey: targetSourceKey,
					merchantId: target.id,
					merchantName: target.name,
					logoUrl: targetMerchant?.logoUrl ?? sourceRecord.logoUrl,
					updatedAt: new Date().toISOString(),
				},
				{
					suppressSourceKey: sourceRecord.sourceKey,
				},
			);
		}

		replaceRecurringMerchantName(source.name, target.name);

		await Promise.all([fetchTransactions(true), fetchMerchants()]);

		setMergeState(null);
		setActiveDialog(null);
	};

	const saveRecord = async (record: RecurringRecord): Promise<void> => {
		await upsertRecord(record);
		confirmRecurring(record.merchantName);
		setActiveDialog(null);
	};

	const saveReviewRecord = async (record: RecurringRecord): Promise<void> => {
		const hasMoreCandidates = reviewCandidates.length > 1;

		await upsertRecord(record);
		confirmRecurring(record.merchantName);
		setReviewIndex(0);

		if (!hasMoreCandidates) {
			setActiveDialog(null);
		}
	};

	const markNotRecurring = (record: RecurringRecord): void => {
		void removeRecord(record.id, {
			suppressSourceKey: record.sourceKey,
		})
			.then(() => {
				setActiveDialog(null);
			})
			.catch((error) => {
				console.error("Failed to remove recurring record:", error);
			});
	};

	const openEditorForRecord = (record: RecurringRecord): void => {
		const merchant = merchantItems.find((item) => {
			return record.merchantId
				? item.id === record.merchantId
				: normalize(item.name) === normalize(record.merchantName);
		});
		const candidate = candidateFromMerchant(
			merchant ?? {
				id: record.merchantId ?? record.id,
				name: record.merchantName,
				logoUrl: record.logoUrl,
				transactionCount: 0,
			},
			transactions,
			record.type,
			accounts,
			customCategories,
		);
		replaceActiveDialog({
			type: "editor",
			candidate,
			existingRecord: record,
			returnTo: "page",
		});
	};

	const selectMerchant = (
		merchant: MerchantListItem,
		defaultType: RecurringType,
	): void => {
		const candidate = candidateFromMerchant(
			merchant,
			transactions,
			defaultType,
			accounts,
			customCategories,
		);
		const existingRecord =
			allRecords.find((record) => {
				return record.sourceKey === candidate.key;
			}) ?? null;
		replaceActiveDialog({
			type: "editor",
			candidate,
			existingRecord,
			returnTo: "search",
		});
	};

	const openTransaction = useCallback(
		(transactionId: string): void => {
			const basePath = `/transactions/${encodeURIComponent(transactionId)}`;
			const pathWithContext = appendNavigationSource(basePath, "recurring");

			router.push(pathWithContext);
		},
		[router],
	);

	if (!isClient || !recurringHydrated || isInitialDataLoading) {
		return <RecurringPageSkeleton />;
	}

	return (
		<div className="min-h-screen bg-gray-50 p-3 text-gray-900 md:p-4 dark:bg-[#171716] dark:text-white">
			<header className="flex min-h-16 flex-wrap items-center gap-8 pb-5">
				{!isMobile && (
					<h1 className="text-[30px] font-bold leading-none tracking-tight">
						Recurring
					</h1>
				)}
				<TabButton
					active={tab === "monthly"}
					onClick={() => {
						navigateToTab("monthly");
					}}
				>
					Monthly
				</TabButton>
				<TabButton
					active={tab === "all"}
					onClick={() => {
						navigateToTab("all");
					}}
				>
					All recurring
				</TabButton>
				<div className="ml-auto flex items-center gap-3">
					{tab === "all" && (
						<RecurringGroupingDropdown
							value={groupMode}
							onChange={setGroupMode}
						/>
					)}

					<button
						type="button"
						onClick={() => {
							applyFilters(EMPTY_RECURRING_FILTERS);
						}}
						disabled={activeFilterCount === 0}
						className="h-[52px] rounded-xl border border-gray-300 bg-white px-4 text-sm font-bold text-gray-900 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/15 dark:bg-[#222221] dark:text-white dark:hover:bg-white/5"
					>
						Clear
					</button>

					<RecurringFilterPopover
						filters={filters}
						data={filterData}
						onApply={applyFilters}
					/>

					<div className="h-7 w-px bg-gray-300 dark:bg-white/15" />

					<button
						type="button"
						onClick={() => {
							setActiveDialog({
								type: "manager",
							});
						}}
						className="flex h-[52px] items-center gap-3 rounded-xl bg-[#FF6633] px-5 text-base font-bold text-white transition hover:bg-[#f35724]"
					>
						<Settings size={20} />
						Manage recurring
					</button>
				</div>
			</header>

			{reviewCandidates.length > 0 && (
				<div className="mb-5 flex min-h-15 items-center justify-between gap-4 rounded-xl bg-[#FF6633] px-5 py-3 text-white">
					<p className="text-base font-bold">
						There are {reviewCandidates.length} new recurring merchants and
						accounts for you to review
					</p>
					<button
						type="button"
						onClick={() => {
							setReviewIndex(0);
							setActiveDialog({ type: "review" });
						}}
						className="text-base font-bold underline underline-offset-2"
					>
						Review now
					</button>
				</div>
			)}

			{tab === "monthly" && (
				<RecurringMonthlySummary
					month={month}
					occurrences={occurrences}
					view={view}
					onMonthChange={(offset) => {
						setMonth((current) => {
							return new Date(
								Date.UTC(
									current.getUTCFullYear(),
									current.getUTCMonth() + offset,
									1,
									12,
								),
							);
						});
					}}
					onToday={() => {
						const now = new Date();
						setMonth(
							new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1, 12)),
						);
					}}
					onViewChange={setView}
					onAdd={(type) => {
						setActiveDialog({ type: "search", defaultType: type });
					}}
				/>
			)}

			<RecurringContent
				records={filteredRecords}
				occurrences={occurrences}
				transactions={transactions}
				view={view}
				month={month}
				tab={tab}
				sort={sort}
				onSortChange={setSort}
				groupMode={groupMode}
				onManage={() => {
					setActiveDialog({ type: "manager" });
				}}
				onEdit={openEditorForRecord}
				onMarkNotRecurring={markNotRecurring}
				onOpenTransaction={openTransaction}
				navigationSource="recurring"
			/>
			{activeDialog?.type === "review" && (
				<RecurringReviewDialog
					open
					candidate={activeCandidate}
					remainingCount={Math.max(0, reviewCandidates.length - 1)}
					onClose={() => {
						setActiveDialog(null);
					}}
					onSkip={() => {
						if (reviewCandidates.length > 1) {
							setReviewIndex((current) => {
								return (current + 1) % reviewCandidates.length;
							});
							return;
						}

						setActiveDialog(null);
					}}
					onNotRecurring={(candidate) => {
						const hasMoreCandidates = reviewCandidates.length > 1;

						void dismissCandidate(candidate.key)
							.then(() => {
								setReviewIndex(0);

								if (!hasMoreCandidates) {
									setActiveDialog(null);
								}
							})
							.catch((error) => {
								console.error("Failed to dismiss recurring candidate:", error);
							});
					}}
					onSave={saveReviewRecord}
				/>
			)}

			{activeDialog?.type === "manager" && (
				<RecurringManagerDialog
					open
					onClose={() => {
						setActiveDialog(null);
					}}
					onOpenSearch={(defaultType) => {
						replaceActiveDialog({
							type: "search",
							defaultType,
						});
					}}
				/>
			)}

			{activeDialog?.type === "search" && (
				<RecurringMerchantSearchDialog
					open
					merchantItems={merchantItems}
					onClose={() => {
						setActiveDialog(null);
					}}
					onSelect={(merchant) => {
						selectMerchant(merchant, activeDialog.defaultType);
					}}
				/>
			)}

			{activeDialog?.type === "editor" && (
				<RecurringEditorDialog
					open
					isCovered={Boolean(mergeState)}
					candidate={activeDialog.candidate}
					existingRecord={activeDialog.existingRecord}
					accounts={accounts}
					categories={customCategories}
					merchantItems={merchantItems}
					onClose={() => {
						setActiveDialog(null);
					}}
					onSave={saveRecord}
					onRequestMerge={(source, record) => {
						setMergeState({
							source,
							record,
						});
					}}
				/>
			)}

			{mergeState && (
				<MerchantMergeDialog
					key={mergeState.source.id}
					source={mergeState.source}
					merchantItems={merchantItems}
					onClose={() => {
						setMergeState(null);
					}}
					onConfirm={(target) => {
						return handleMergeMerchant(
							mergeState.source,
							target,
							mergeState.record,
						);
					}}
				/>
			)}
		</div>
	);
}

function TabButton({
	active,
	onClick,
	children,
}: {
	active: boolean;
	onClick: () => void;
	children: ReactNode;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={`border-b-[3px] pb-3 pt-1 text-[26px] font-semibold leading-none transition-colors ${
				active
					? "border-[#FF6633] text-[#FF6633]"
					: "border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
			}`}
		>
			{children}
		</button>
	);
}
