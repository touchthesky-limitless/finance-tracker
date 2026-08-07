/**
 * Main page component for the Recurring feature.
 * Renders the header, tabs, summary, content, and manages all dialogs.
 */
"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Settings } from "lucide-react";
import { ReactNode, useCallback, useMemo, useState } from "react";

import { Transaction, useBudgetStore } from "@/store/useBudgetStore";
import { useRecurringStore } from "@/store/useRecurringStore";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useMerchantOptions } from "@/hooks/useMerchantOptions";
import { useBudgetData } from "@/hooks/useBudgetData";
import { MOBILE_BREAKPOINT } from "@/config/breakpoints";
import { appendNavigationSource } from "@/lib/navigation/breadcrumb";

import { useRecurringFilters } from "./hooks/useRecurringFilters";
import { useRecurringDialogs } from "./hooks/useRecurringDialogs";
import { useReviewCandidates } from "./hooks/useReviewCandidates";
import { useRecurringPageData } from "./hooks/useRecurringPageData";

import { RecurringMonthlySummary } from "./views/RecurringMonthlySummary";
import { RecurringContent } from "./views/RecurringContent";
import { RecurringManagerDialog } from "./dialogs/RecurringManagerDialog";
import { RecurringMerchantSearchDialog } from "./dialogs/RecurringMerchantSearchDialog";
import { RecurringReviewDialog } from "./dialogs/RecurringReviewDialog";
import { RecurringEditorDialog } from "./dialogs/RecurringEditorDialog";
import { useShallow } from "zustand/react/shallow";
import {
	MerchantMergeDialog,
	type MerchantEditorValue,
} from "@/components/Merchants";
import { deleteCustomMerchantRecord } from "@/lib/merchants/merchantRepository";
import type {
	TransactionFilterData,
	TransactionFilterOption,
} from "@/components/Transactions/transactionFilters";
import { RecurringFilterPopover } from "./ui/RecurringFilterPopover";
import { CATEGORY_HIERARCHY } from "@/constants";
import { RecurringGroupingDropdown } from "./ui/RecurringControls";
import type { MerchantListItem } from "@/components/Merchants/types";
import {
	matchesRecurringFilters,
	getOccurrencesForMonth,
	candidateFromMerchant,
	normalize,
} from "./utils";
import {
	AllRecurringGroupMode,
	RecurringSortState,
	RecurringRecord,
	RecurringType,
	EMPTY_RECURRING_FILTERS,
} from "./types";

export default function RecurringPageClient() {
	const pathname = usePathname();
	const router = useRouter();
	const searchParams = useSearchParams();
	const searchParamsString = searchParams.toString();
	const isMobile = useMediaQuery(MOBILE_BREAKPOINT);
	const tab: "monthly" | "all" = pathname.endsWith("/all") ? "all" : "monthly";

	// Store bindings
	const {
		transactions,
		merchants,
		accounts,
		customCategories,
		fetchTransactions,
		fetchAccounts,
		fetchMerchants,
		fetchCustomCategories,
		updateTransaction,
		confirmRecurring,
	} = useBudgetStore(
		useShallow((state) => ({
			transactions: state.transactions,
			merchants: state.merchants,
			accounts: state.accounts,
			customCategories: state.customCategories,
			fetchTransactions: state.fetchTransactions,
			fetchAccounts: state.fetchAccounts,
			fetchMerchants: state.fetchMerchants,
			fetchCustomCategories: state.fetchCustomCategories,
			updateTransaction: state.updateTransaction,
			confirmRecurring: state.confirmRecurring,
		})),
	);

	const {
		records,
		dismissedCandidateKeys,
		suppressedSourceKeys,
		fetchRecurringData,
		upsertRecord,
		removeRecord,
		dismissCandidate,
	} = useRecurringStore(
		useShallow((state) => ({
			records: state.records,
			dismissedCandidateKeys: state.dismissedCandidateKeys,
			suppressedSourceKeys: state.suppressedSourceKeys,
			fetchRecurringData: state.fetchRecurringData,
			upsertRecord: state.upsertRecord,
			removeRecord: state.removeRecord,
			dismissCandidate: state.dismissCandidate,
		})),
	);

	// Convert arrays to sets
	const dismissedCandidateKeysSet = useMemo(
		() => new Set(dismissedCandidateKeys),
		[dismissedCandidateKeys],
	);
	const suppressedSourceKeysSet = useMemo(
		() => new Set(suppressedSourceKeys),
		[suppressedSourceKeys],
	);

	const merchantItems = useMerchantOptions();
	const { predictedBills } = useBudgetData("all");

	// Data loading
	useRecurringPageData({
		fetchTransactions,
		fetchAccounts,
		fetchMerchants,
		fetchCustomCategories,
		fetchRecurringData,
	});

	// Filters
	const { filters, activeFilterCount, applyFilters } = useRecurringFilters(
		searchParamsString,
		pathname,
		router,
	);
	const filteredRecords = useMemo(
		() => records.filter((r) => matchesRecurringFilters(r, filters)),
		[records, filters],
	);

	// View state
	const [view, setView] = useState<"list" | "calendar">("list");
	const [month, setMonth] = useState(() => {
		const now = new Date();
		return new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1, 12));
	});
	const [sort, setSort] = useState<RecurringSortState>({
		key: "date",
		direction: "asc",
	});
	const [groupMode, setGroupMode] = useState<AllRecurringGroupMode>("status");

	// Occurrences
	const occurrences = useMemo(
		() => getOccurrencesForMonth(filteredRecords, month, transactions),
		[filteredRecords, month, transactions],
	);

	// Candidates and review
	const { reviewCandidates, activeCandidate, setReviewIndex } =
		useReviewCandidates({
			transactions,
			merchantItems,
			accounts,
			customCategories,
			records,
			dismissedCandidateKeys: dismissedCandidateKeysSet,
			suppressedSourceKeys: suppressedSourceKeysSet,
			predictedBills,
		});

	// Dialogs
	const {
		activeDialog,
		setActiveDialog,
		replaceActiveDialog,
		mergeState,
		setMergeState,
	} = useRecurringDialogs();

	// Navigation
	const navigateToTab = (nextTab: "monthly" | "all") => {
		const nextPath =
			nextTab === "all" ? "/recurring/all" : "/recurring/upcoming";
		router.push(
			searchParamsString ? `${nextPath}?${searchParamsString}` : nextPath,
		);
	};

	// Handlers
	const openEditorForRecord = (record: RecurringRecord) => {
		const merchant = merchantItems.find((item) =>
			record.merchantId
				? item.id === record.merchantId
				: normalize(item.name) === normalize(record.merchantName),
		);
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
	) => {
		const candidate = candidateFromMerchant(
			merchant,
			transactions,
			defaultType,
			accounts,
			customCategories,
		);
		const existingRecord =
			records.find((r) => r.sourceKey === candidate.key) ?? null;
		replaceActiveDialog({
			type: "editor",
			candidate,
			existingRecord,
			returnTo: "search",
		});
	};

	const saveRecord = async (record: RecurringRecord) => {
		await upsertRecord(record);
		confirmRecurring(record.merchantName);
		setActiveDialog(null);
	};

	const saveReviewRecord = async (record: RecurringRecord) => {
		await upsertRecord(record);
		confirmRecurring(record.merchantName);
		setReviewIndex(0);
		if (reviewCandidates.length <= 1) setActiveDialog(null);
	};

	const markNotRecurring = (record: RecurringRecord) => {
		removeRecord(record.id, { suppressSourceKey: record.sourceKey })
			.then(() => setActiveDialog(null))
			.catch(console.error);
	};

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

	const openTransaction = useCallback(
		(transactionId: string) => {
			const basePath = `/transactions/${encodeURIComponent(transactionId)}`;
			router.push(appendNavigationSource(basePath, "recurring"));
		},
		[router],
	);

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
					onClick={() => navigateToTab("monthly")}
				>
					Monthly
				</TabButton>
				<TabButton active={tab === "all"} onClick={() => navigateToTab("all")}>
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
						onClick={() => applyFilters(EMPTY_RECURRING_FILTERS)}
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
						onClick={() => setActiveDialog({ type: "manager" })}
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
					onMonthChange={(offset) =>
						setMonth(
							(current) =>
								new Date(
									Date.UTC(
										current.getUTCFullYear(),
										current.getUTCMonth() + offset,
										1,
										12,
									),
								),
						)
					}
					onToday={() => {
						const now = new Date();
						setMonth(
							new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1, 12)),
						);
					}}
					onViewChange={setView}
					onAdd={(type) =>
						setActiveDialog({ type: "search", defaultType: type })
					}
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
				onManage={() => setActiveDialog({ type: "manager" })}
				onEdit={openEditorForRecord}
				onMarkNotRecurring={markNotRecurring}
				onOpenTransaction={openTransaction}
				navigationSource="recurring"
			/>

			{/* Dialogs */}
			{activeDialog?.type === "review" && (
				<RecurringReviewDialog
					open
					candidate={activeCandidate}
					remainingCount={Math.max(0, reviewCandidates.length - 1)}
					onClose={() => setActiveDialog(null)}
					onSkip={() => {
						if (reviewCandidates.length > 1) {
							setReviewIndex(
								(current) => (current + 1) % reviewCandidates.length,
							);
							return;
						}
						setActiveDialog(null);
					}}
					onNotRecurring={(candidate) => {
						dismissCandidate(candidate.key)
							.then(() => {
								setReviewIndex(0);
								if (reviewCandidates.length <= 1) setActiveDialog(null);
							})
							.catch(console.error);
					}}
					onSave={saveReviewRecord}
				/>
			)}

			{activeDialog?.type === "manager" && (
				<RecurringManagerDialog
					open
					onClose={() => setActiveDialog(null)}
					onOpenSearch={(defaultType) =>
						replaceActiveDialog({ type: "search", defaultType })
					}
				/>
			)}

			{activeDialog?.type === "search" && (
				<RecurringMerchantSearchDialog
					open
					merchantItems={merchantItems}
					onClose={() => setActiveDialog(null)}
					onSelect={(merchant) =>
						selectMerchant(merchant, activeDialog.defaultType)
					}
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
					onClose={() => setActiveDialog(null)}
					onSave={saveRecord}
					onRequestMerge={(source, record) => setMergeState({ source, record })}
				/>
			)}

			{mergeState && (
				<MerchantMergeDialog
					key={mergeState.source.id}
					source={mergeState.source}
					merchantItems={merchantItems}
					onClose={() => setMergeState(null)}
					onConfirm={(target) =>
						handleMergeMerchant(mergeState.source, target, mergeState.record)
					}
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
