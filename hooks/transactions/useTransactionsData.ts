/**
 * @file useTransactionsData.ts
 * @description Loads all reference data required for transaction filtering and display
 * (categories, accounts, merchants). Builds the filter option structures (filterData)
 * and a lookup map (subcategoryIdByName) for category ID resolution.
 *
 * @returns { isLoading, filterData, getSubcategoryId }
 *   - isLoading: boolean indicating if initial data is still fetching.
 *   - filterData: structured options for the TransactionFilterPanel.
 *   - getSubcategoryId: callback to resolve a category name to its UUID.
 */
import { useMemo, useEffect, useState, useCallback } from "react";
import { useBudgetStore } from "@/store/useBudgetStore";
import { CATEGORY_HIERARCHY, findParentCategory } from "@/constants";
import {
	TransactionFilterData,
	TransactionFilterOption,
} from "@/components/Transactions/transactionFilters";
import { useMerchantOptions } from "@/hooks/useMerchantOptions";
import { normalizeCategoryName } from "@/utils/transactionUtils";

interface AccountFilterRecord {
	name: string;
	type?: string | null;
	account_type?: string | null;
	balance?: number | null;
	current_balance?: number | null;
}

function getAccountFilterGroup(
	account: AccountFilterRecord | undefined,
	accountName: string,
): string {
	const searchable = [accountName, account?.type, account?.account_type]
		.filter(Boolean)
		.join(" ")
		.toLowerCase();

	if (
		searchable.includes("credit") ||
		searchable.includes("card") ||
		searchable.includes("amex") ||
		searchable.includes("sapphire") ||
		searchable.includes("venture") ||
		searchable.includes("unlimited") ||
		searchable.includes("freedom")
	) {
		return "Liabilities::Credit Cards";
	}

	if (searchable.includes("mortgage")) {
		return "Liabilities::Mortgage";
	}

	if (searchable.includes("loan")) {
		return "Liabilities::Loans";
	}

	if (
		searchable.includes("401") ||
		searchable.includes("ira") ||
		searchable.includes("investment") ||
		searchable.includes("broker") ||
		searchable.includes("stock") ||
		searchable.includes("fidelity") ||
		searchable.includes("vanguard")
	) {
		return "Assets::Investments";
	}

	if (
		searchable.includes("real estate") ||
		searchable.includes("property") ||
		searchable.includes("home")
	) {
		return "Assets::Real Estate";
	}

	if (
		searchable.includes("vehicle") ||
		searchable.includes("car") ||
		searchable.includes("auto")
	) {
		return "Assets::Vehicles";
	}

	if (
		searchable.includes("valuable") ||
		searchable.includes("jewelry") ||
		searchable.includes("collectible")
	) {
		return "Assets::Valuables";
	}

	if (
		searchable.includes("checking") ||
		searchable.includes("saving") ||
		searchable.includes("cash")
	) {
		return "Assets::Cash";
	}

	const balance = account?.current_balance ?? account?.balance ?? 0;

	return balance < 0 ? "Liabilities::Other Liabilities" : "Assets::Cash";
}

export function useTransactionsData() {
	const [isLoading, setIsLoading] = useState(true);
	const fetchCustomCategories = useBudgetStore((s) => s.fetchCustomCategories);
	const fetchAccounts = useBudgetStore((s) => s.fetchAccounts);
	const fetchMerchants = useBudgetStore((s) => s.fetchMerchants);
	const customCategories = useBudgetStore((s) => s.customCategories);
	const accounts = useBudgetStore((s) => s.accounts);
	const customTags = useBudgetStore((s) => s.customTags);
	const transactions = useBudgetStore((s) => s.transactions);
	const merchantItems = useMerchantOptions();

	// Load reference data
	useEffect(() => {
		let active = true;
		const load = async () => {
			try {
				await Promise.all([
					fetchCustomCategories(),
					fetchAccounts(),
					fetchMerchants(),
				]);
			} finally {
				if (active) setIsLoading(false);
			}
		};
		void load();
		return () => {
			active = false;
		};
	}, [fetchCustomCategories, fetchAccounts, fetchMerchants]);

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

	// Build filterData
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
		const accountRecordByKey = new Map<string, AccountFilterRecord>();
		const transactionCountByAccountKey = new Map<string, number>();

		for (const account of accounts) {
			const accountRecord = account as AccountFilterRecord;
			const accountName = accountRecord.name.trim();

			if (!accountName) {
				continue;
			}

			const accountKey = accountName.toLowerCase();

			accountNameByKey.set(accountKey, accountName);
			accountRecordByKey.set(accountKey, accountRecord);
		}

		for (const transaction of transactions) {
			const accountName = transaction.account?.trim();

			if (!accountName) {
				continue;
			}

			const accountKey = accountName.toLowerCase();

			accountNameByKey.set(
				accountKey,
				accountNameByKey.get(accountKey) ?? accountName,
			);
			transactionCountByAccountKey.set(
				accountKey,
				(transactionCountByAccountKey.get(accountKey) ?? 0) + 1,
			);
		}

		const accountOptions = [...accountNameByKey.entries()]
			.map(([accountKey, accountName]) => {
				return {
					value: accountName,
					label: accountName,
					group: getAccountFilterGroup(
						accountRecordByKey.get(accountKey),
						accountName,
					),
					count: transactionCountByAccountKey.get(accountKey) ?? 0,
				};
			})
			.sort((first, second) => {
				return (
					String(first.group).localeCompare(String(second.group)) ||
					first.label.localeCompare(second.label)
				);
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

	// Build subcategory ID lookup
	const subcategoryIdByName = useMemo(() => {
		const lookup = new Map<string, string>();
		for (const cat of customCategories) {
			const key = normalizeCategoryName(cat.name);
			if (!lookup.has(key)) lookup.set(key, cat.id);
		}
		return lookup;
	}, [customCategories]);

	const getSubcategoryId = useCallback(
		(categoryName: string): string | undefined => {
			return subcategoryIdByName.get(normalizeCategoryName(categoryName));
		},
		[subcategoryIdByName],
	);

	return { isLoading, filterData, getSubcategoryId };
}
