/**
 * cashFlowBreakdownUtils – Build breakdown items for a period and breakdown type.
 */
import type { CustomCategory, Transaction } from "@/store/useBudgetStore";
import type { MerchantListItem } from "@/components/Merchants/types";
import type { CategoryPreferences } from "@/lib/categories/categoryPreferences";
import type { CategoryGroupRecord } from "@/lib/categories/categoryGroups";
import { getEffectiveCategoryParentName } from "@/lib/categories/categoryGroups";
import { findParentCategory } from "@/constants";
import type {
	CashFlowBreakdown,
	CashFlowBreakdownItem,
	CashFlowPeriod,
	CashFlowFilters,
} from "../types";
import { parseUtcDate } from "./cashFlowDateUtils";
import { transactionMatchesCashFlowFilters } from "./cashFlowFilterUtils";
import { getCategoryIdMap, colorFor, resolveCategoryGroupIdentity } from "./cashFlowCategoryUtils";

function normalizeIdentity(value: string | null | undefined): string {
	return value?.trim().toLowerCase() ?? "";
}

export function buildBreakdownItems(
	transactions: Transaction[],
	period: CashFlowPeriod,
	breakdown: CashFlowBreakdown,
	kind: "income" | "expense",
	filters: CashFlowFilters,
	customCategories: CustomCategory[],
	merchantItems: MerchantListItem[],
	categoryGroups: CategoryGroupRecord[],
	categoryPreferences: CategoryPreferences = {},
): CashFlowBreakdownItem[] {
	const totals = new Map<
		string,
		{
			label: string;
			parentLabel: string;
			amount: number;
			iconName: string;
			detailUrl: string | null;
			entityKind: CashFlowBreakdownItem["entityKind"];
			entityId: string | null;
			parentEntityId: string | null;
		}
	>();

	const categoryIdByName = getCategoryIdMap(customCategories);
	const categoryRecordByName = new Map(
		customCategories.map((cat) => [normalizeIdentity(cat.name), cat] as const),
	);
	const categoryGroupBySourceName = new Map(
		categoryGroups.map((g) => [normalizeIdentity(g.source_name), g] as const),
	);
	const merchantByName = new Map(
		merchantItems.map((m) => [normalizeIdentity(m.name), m] as const),
	);

	for (const tx of transactions) {
		if (!transactionMatchesCashFlowFilters(tx, filters)) continue;
		const txDate = parseUtcDate(tx.date);
		if (!txDate || txDate < period.start || txDate > period.end) continue;

		const amount = Number(tx.amount) || 0;
		if (kind === "income" && amount <= 0) continue;
		if (kind === "expense" && amount >= 0) continue;

		const category = tx.category?.trim() || "Uncategorized";
		const categoryId =
			categoryIdByName.get(normalizeIdentity(category)) ?? null;
		const categoryRecord = categoryRecordByName.get(
			normalizeIdentity(category),
		);
		const groupSourceName =
			(categoryRecord
				? getEffectiveCategoryParentName(categoryRecord, categoryPreferences)
				: null) ||
			findParentCategory(category) ||
			"Other";
		const categoryGroup = categoryGroupBySourceName.get(
			normalizeIdentity(groupSourceName),
		);
		const group = categoryGroup?.name.trim() || groupSourceName;

		const merchant = tx.merchant?.trim() || "Unknown merchant";
		let aggregationKey = category;
		let label = category;
		let parentLabel = group;
		let iconName = category;
		let detailUrl: string | null = null;
		let entityKind: CashFlowBreakdownItem["entityKind"] = "category";
		let entityId: string | null = null;
		let parentEntityId: string | null = null;

		if (breakdown === "group") {
			const identity = resolveCategoryGroupIdentity(
				groupSourceName,
				categoryGroups,
			);
			aggregationKey = identity.groupId ?? groupSourceName;
			label = group;
			parentLabel = group;
			iconName = group;
			entityKind = "group";
			entityId = identity.groupId;
			parentEntityId = null;
			detailUrl = identity.detailUrl;
		} else if (breakdown === "merchant") {
			const merchantItem = tx.merchant_id
				? merchantItems.find((m) => m.id === tx.merchant_id)
				: merchantByName.get(normalizeIdentity(merchant));
			aggregationKey = merchant;
			label = merchant;
			parentLabel = group;
			iconName = merchant;
			entityKind = "merchant";
			entityId = merchantItem?.id ?? tx.merchant_id ?? null;
			detailUrl = entityId
				? `/merchants/${encodeURIComponent(entityId)}`
				: null;
		} else {
			const identity = resolveCategoryGroupIdentity(
				groupSourceName,
				categoryGroups,
			);
			entityKind = "category";
			entityId = categoryId;
			parentEntityId = identity.groupId;
			detailUrl = entityId
				? `/categories/${encodeURIComponent(entityId)}`
				: null;
		}

		const existing = totals.get(aggregationKey);
		if (existing) {
			existing.amount += Math.abs(amount);
			if (!existing.entityId && entityId) existing.entityId = entityId;
			if (!existing.parentEntityId && parentEntityId)
				existing.parentEntityId = parentEntityId;
			if (!existing.detailUrl && detailUrl) existing.detailUrl = detailUrl;
			continue;
		}

		totals.set(aggregationKey, {
			label,
			parentLabel,
			amount: Math.abs(amount),
			iconName,
			detailUrl,
			entityKind,
			entityId,
			parentEntityId,
		});
	}

	const total = Array.from(totals.values()).reduce(
		(sum, item) => sum + item.amount,
		0,
	);

	return Array.from(totals.entries())
		.map(([key, item], index) => ({
			id: key,
			...item,
			share: total > 0 ? (item.amount / total) * 100 : 0,
			color: colorFor(item.parentLabel || item.label, index),
		}))
		.sort((a, b) => b.amount - a.amount);
}
