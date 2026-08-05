"use client";

/**
 * Hook that builds the column definitions for the transaction table.
 * All dynamic values (callbacks, state, etc.) are passed as props.
 */

import { useMemo } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { Check, ArrowRight } from "lucide-react";

import { CategorySelector } from "@/components/CategorySelector";
import { MerchantCell } from "@/components/Transactions/MerchantCell";
import type { MerchantListItem } from "@/components/Merchants/types";
import type { Merchant, Transaction } from "@/store/useBudgetStore";
import { formatCurrency, truncateText } from "@/utils/formatters";
import { getTransactionMerchantId } from "@/hooks/useUnifiedMerchants";
import {
	appendNavigationSource,
	type NavigationSource,
} from "@/lib/navigation/breadcrumb";
import {
	AccountIcon,
	inferAccountSubgroup,
} from "@/components/Accounts/AccountIcon";
import type { MouseEvent as ReactMouseEvent } from "react";

const ACCOUNT_CHARACTER_LENGTH = 43;

interface Router {
	push: (url: string) => void;
}

interface UseTableColumnsProps {
	selectedIdSet: Set<string>;
	currentView: "all" | "review";
	isEditMode: boolean;
	onMarkReviewed?: (id: string) => void;
	onSelectRow: (id: string, event: ReactMouseEvent) => void;
	getCategoryId?: (categoryName: string) => string | undefined;
	isCategoryView: boolean;
	onCategoryChange?: (id: string, newCategory: string) => Promise<void> | void;
	navigateToCategory: (
		categoryName: string,
		targetId: string | undefined,
	) => void;
	resolveMerchantId: (merchantName: string) => string | undefined;
	isMerchantNavigationEnabled: boolean;
	navigationSource?: NavigationSource;
	source: NavigationSource;
	router: Router;
	onRowClick: (transaction: Transaction) => void;
	onMerchantChange?: (
		transactionId: string,
		merchant: Pick<Merchant, "id" | "name">,
	) => Promise<void> | void;
	merchantItems: MerchantListItem[];
	isMobile: boolean;
	onViewCategory?: (categoryName: string, targetId?: string) => void;
	columnWidths?: {
		merchant?: number;
		category?: number;
		amount?: number;
	};
	showCategoryChevron: boolean;
	merchantPopoverZIndex?: number;
	forceCategoryIconOnly: boolean;
}

export function useTableColumns({
	selectedIdSet,
	currentView,
	isEditMode,
	onMarkReviewed,
	onSelectRow,
	getCategoryId,
	isCategoryView,
	onCategoryChange,
	navigateToCategory,
	resolveMerchantId,
	isMerchantNavigationEnabled,
	navigationSource,
	source,
	router,
	onRowClick,
	onMerchantChange,
	merchantItems,
	isMobile,
	onViewCategory,
	columnWidths,
	showCategoryChevron,
	merchantPopoverZIndex,
	forceCategoryIconOnly,
}: UseTableColumnsProps) {
	const columns = useMemo(() => {
		const columnHelper = createColumnHelper<Transaction>();
		return [
			columnHelper.accessor("date", {
				id: "date",
			}),

			columnHelper.display({
				id: "select",
				size: 40,
				cell: (info) => {
					const transactionId = info.row.original.id;
					const isSelected = selectedIdSet.has(transactionId);

					if (currentView === "review" && !isEditMode) {
						return (
							<div className="flex items-center justify-center w-full h-full">
								<button
									type="button"
									onClick={(event) => {
										event.stopPropagation();
										onMarkReviewed?.(transactionId);
									}}
									disabled={!onMarkReviewed}
									aria-label="Mark transaction as reviewed"
									className="group w-5 h-5 rounded-full border border-gray-300 dark:border-gray-500 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-white disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
								>
									<Check
										size={12}
										strokeWidth={3}
										aria-hidden="true"
										className="opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
									/>
								</button>
							</div>
						);
					}

					if (isEditMode) {
						return (
							<div className="flex items-center justify-center w-full h-full">
								<button
									type="button"
									onClick={(event) => {
										event.stopPropagation();
										onSelectRow(transactionId, event);
									}}
									aria-label={
										isSelected ? "Deselect transaction" : "Select transaction"
									}
									aria-pressed={isSelected}
									className={`w-5 h-5 rounded-sm border-2 flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
										isSelected
											? "bg-[#FF5A35] border-[#FF5A35]"
											: "border-gray-300 dark:border-gray-600"
									}`}
								>
									<Check
										size={14}
										aria-hidden="true"
										className={isSelected ? "text-white" : "text-transparent"}
									/>
								</button>
							</div>
						);
					}

					return null;
				},
			}),

			columnHelper.accessor("merchant", {
				size: columnWidths?.merchant ?? (isMobile ? 222 : 350),
				minSize: isMobile ? 140 : 160,
				cell: (info) => {
					const transaction = info.row.original;
					const merchantName = String(info.getValue() || "Unknown merchant");
					const merchantId =
						getTransactionMerchantId(transaction) ??
						resolveMerchantId(merchantName);

					const handleMerchantNavigation = () => {
						if (!merchantId) {
							return;
						}
						const activeSource = navigationSource || source;
						router.push(
							appendNavigationSource(`/merchants/${merchantId}`, activeSource),
						);
					};

					return (
						<MerchantCell
							transaction={transaction}
							merchantId={merchantId}
							merchantItems={merchantItems}
							showNavigation={isMerchantNavigationEnabled}
							onNavigate={handleMerchantNavigation}
							onOpenEditor={() => {
								onRowClick(transaction);
							}}
							onMerchantChange={onMerchantChange}
							isMobile={isMobile}
							popoverZIndex={merchantPopoverZIndex}
						/>
					);
				},
			}),

			columnHelper.accessor("category", {
				size: columnWidths?.category ?? (isMobile ? 20 : 300),
				minSize: isMobile ? 50 : 120,
				cell: (info) => {
					const categoryName = String(info.getValue() || "Uncategorized");
					const targetId = getCategoryId?.(categoryName);
					const categoryIconOnly = isMobile || forceCategoryIconOnly;

					return (
						<div
							onClick={(event) => {
								event.stopPropagation();
							}}
							className={`group flex items-center w-full h-full ${
								isMobile ? "justify-center" : "gap-1.5 pr-2"
							}`}
						>
							<div className="flex-1 min-w-0">
								<CategorySelector
									currentCategory={categoryName}
									variant="form"
									showChevron={showCategoryChevron}
									hideChevronUntilHover={showCategoryChevron}
									iconOnly={categoryIconOnly}
									onSelect={(newCategory) => {
										if (newCategory === categoryName) return;
										void onCategoryChange?.(info.row.original.id, newCategory);
									}}
								/>
							</div>

							{/* Hide View Category button on mobile */}
							{isCategoryView && !isMobile && (
								<button
									type="button"
									onClick={(event) => {
										event.stopPropagation();
										if (onViewCategory) {
											onViewCategory(categoryName, targetId);
										} else {
											navigateToCategory(categoryName, targetId);
										}
									}}
									aria-disabled={!targetId}
									aria-label={`View ${categoryName} category`}
									title={
										targetId
											? `View ${categoryName}`
											: `Category ID unavailable for ${categoryName}`
									}
									className={`
              flex items-center justify-center shrink-0 transition-all
              ${
								!isMobile
									? "w-6 h-6 rounded-lg border border-transparent opacity-0 group-hover:opacity-100 group-hover:border-gray-300 dark:group-hover:border-white/20 hover:bg-gray-100 dark:hover:bg-white/5"
									: "hidden"
							}
              ${targetId ? "cursor-pointer" : "cursor-not-allowed"}
            `}
								>
									<ArrowRight
										size={12}
										strokeWidth={2}
										className="text-gray-500 dark:text-gray-400"
										aria-hidden="true"
									/>
								</button>
							)}
						</div>
					);
				},
			}),
			columnHelper.accessor("account", {
				size: isMobile ? 40 : 300,
				minSize: isMobile ? 40 : 100,
				cell: (info) => {
					const transaction = info.row.original;
					const accountName = transaction.account?.trim() || "Unknown account";
					const accountId = transaction.account_id;
					const canNavigate = Boolean(accountId);
					const subgroup = inferAccountSubgroup(accountName);

					return (
						<button
							type="button"
							disabled={!canNavigate}
							onClick={(event) => {
								event.stopPropagation();
								if (!accountId) return;
								const activeSource = navigationSource || source;
								const url = appendNavigationSource(
									`/accounts/details/${encodeURIComponent(accountId)}`,
									activeSource,
								);
								router.push(url);
							}}
							aria-label={`View ${accountName} account`}
							title={
								canNavigate ? `View ${accountName}` : "Account ID unavailable"
							}
							className={`
  group flex h-10 w-full min-w-0 items-center gap-2 rounded-lg border border-transparent text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E94F2D]
  ${!isMobile ? "px-2 py-1 hover:border-gray-300 hover:bg-gray-50 dark:hover:border-white/20 dark:hover:bg-white/5" : "p-0 justify-center"}
  ${!canNavigate ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
`}
						>
							{/* ✅ Always render the icon */}
							<AccountIcon subgroup={subgroup} />

							{/* ✅ Desktop: Show text and arrow. Mobile: Hide them. */}
							{!isMobile && (
								<>
									<span
										className="min-w-0 flex-1 truncate text-[15px] text-gray-900 dark:text-white"
										title={accountName}
									>
										{truncateText(accountName, ACCOUNT_CHARACTER_LENGTH)}
									</span>
									{canNavigate && (
										<ArrowRight
											size={16}
											strokeWidth={2}
											aria-hidden="true"
											className="shrink-0 text-gray-500 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 dark:text-gray-400"
										/>
									)}
								</>
							)}
						</button>
					);
				},
			}),

			columnHelper.accessor("amount", {
				size: columnWidths?.amount ?? (isMobile ? 80 : 140),
				minSize: isMobile ? 60 : 80,
				sortingFn: (rowA, rowB, columnId) => {
					const firstAmount = Number(rowA.getValue(columnId));
					const secondAmount = Number(rowB.getValue(columnId));
					const safeAmountA = Number.isFinite(firstAmount)
						? Math.abs(firstAmount)
						: 0;
					const safeAmountB = Number.isFinite(secondAmount)
						? Math.abs(secondAmount)
						: 0;
					return safeAmountA - safeAmountB;
				},
				sortUndefined: "last",
				cell: (info) => {
					const parsedAmount = Number(info.getValue());
					const amount = Number.isFinite(parsedAmount) ? parsedAmount : 0;
					const isPositive = amount > 0;

					return (
						<div
							className={`flex items-center justify-end w-full ${isMobile ? "pr-2" : "pr-6"}`}
						>
							<span
								className={`text-right font-mono text-[15px] font-medium tabular-nums ${
									isPositive
										? "text-emerald-600 dark:text-emerald-400"
										: "text-gray-900 dark:text-white"
								}`}
							>
								{isPositive ? "+" : ""}
								{formatCurrency(amount)}
							</span>
						</div>
					);
				},
			}),
		];
	}, [
		selectedIdSet,
		currentView,
		isEditMode,
		onMarkReviewed,
		onSelectRow,
		getCategoryId,
		isCategoryView,
		onCategoryChange,
		navigateToCategory,
		resolveMerchantId,
		isMerchantNavigationEnabled,
		navigationSource,
		source,
		router,
		onRowClick,
		onMerchantChange,
		merchantItems,
		isMobile,
		onViewCategory,
		columnWidths,
		showCategoryChevron,
		merchantPopoverZIndex,
		forceCategoryIconOnly,
	]);

	return columns;
}
