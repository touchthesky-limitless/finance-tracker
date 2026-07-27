import { findParentCategory, getCategoryTheme } from "@/constants";
import type { MerchantListItem } from "@/components/Merchants/types";
import type {
	Account,
	CustomCategory,
	Transaction,
} from "@/store/useBudgetStore";
import type { CategoryPreferences } from "@/lib/categories/categoryPreferences";
import {
	getEffectiveCategoryParentName,
	type CategoryGroupRecord,
} from "@/lib/categories/categoryGroups";
import type {
	CashFlowBreakdown,
	CashFlowBreakdownItem,
	CashFlowFilters,
	CashFlowPeriod,
	CashFlowTimeframe,
	SankeyBreakdown,
	SankeyLinkDatum,
	SankeyNodeDatum,
} from "@/components/CashFlow/types";

const PALETTE = [
	"#f7be38",
	"#d846a3",
	"#4169e1",
	"#9b51e0",
	"#ef4b55",
	"#ff6b35",
	"#20b486",
	"#00a7c7",
	"#7a8b99",
	"#c68f53",
	"#72b01d",
	"#8f5bd7",
	"#de6f33",
	"#4b8f8c",
	"#d35d6e",
];

const DAY_MS = 86_400_000;

interface CategoryGroupIdentity {
	groupId: string | null;
	detailUrl: string | null;
}

export interface CashFlowCategoryGroupMatch {
	groupId: string;
	groupName: string;
	sourceName: string;
	groupRecord: CategoryGroupRecord;
	childCategories: CustomCategory[];
}

export function parseUtcDate(value: string | null | undefined): Date | null {
	if (!value) {
		return null;
	}

	const cleanValue = value.slice(0, 10);
	const date = new Date(`${cleanValue}T00:00:00.000Z`);

	return Number.isNaN(date.getTime()) ? null : date;
}

export function toDateParam(date: Date): string {
	return date.toISOString().slice(0, 10);
}

export function startOfPeriod(date: Date, timeframe: CashFlowTimeframe): Date {
	const year = date.getUTCFullYear();
	const month = date.getUTCMonth();

	if (timeframe === "year") {
		return new Date(Date.UTC(year, 0, 1));
	}

	if (timeframe === "quarter") {
		return new Date(Date.UTC(year, Math.floor(month / 3) * 3, 1));
	}

	return new Date(Date.UTC(year, month, 1));
}

export function endOfPeriod(date: Date, timeframe: CashFlowTimeframe): Date {
	const start = startOfPeriod(date, timeframe);

	if (timeframe === "year") {
		return new Date(
			Date.UTC(start.getUTCFullYear() + 1, 0, 0, 23, 59, 59, 999),
		);
	}

	if (timeframe === "quarter") {
		return new Date(
			Date.UTC(
				start.getUTCFullYear(),
				start.getUTCMonth() + 3,
				0,
				23,
				59,
				59,
				999,
			),
		);
	}

	return new Date(
		Date.UTC(
			start.getUTCFullYear(),
			start.getUTCMonth() + 1,
			0,
			23,
			59,
			59,
			999,
		),
	);
}

export function shiftPeriod(
	date: Date,
	timeframe: CashFlowTimeframe,
	offset: number,
): Date {
	const start = startOfPeriod(date, timeframe);

	if (timeframe === "year") {
		return new Date(Date.UTC(start.getUTCFullYear() + offset, 0, 1));
	}

	if (timeframe === "quarter") {
		return new Date(
			Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + offset * 3, 1),
		);
	}

	return new Date(
		Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + offset, 1),
	);
}

export function formatPeriodTitle(
	date: Date,
	timeframe: CashFlowTimeframe,
): string {
	const start = startOfPeriod(date, timeframe);

	if (timeframe === "year") {
		return String(start.getUTCFullYear());
	}

	if (timeframe === "quarter") {
		const end = endOfPeriod(start, timeframe);

		const firstMonth = new Intl.DateTimeFormat("en-US", {
			month: "long",
			timeZone: "UTC",
		}).format(start);

		const lastMonth = new Intl.DateTimeFormat("en-US", {
			month: "long",
			timeZone: "UTC",
		}).format(end);

		return `${firstMonth} - ${lastMonth} ` + `${start.getUTCFullYear()}`;
	}

	return new Intl.DateTimeFormat("en-US", {
		month: "long",
		year: "numeric",
		timeZone: "UTC",
	}).format(start);
}

function getPeriodLabels(
	date: Date,
	timeframe: CashFlowTimeframe,
): {
	label: string;
	shortLabel: string;
} {
	if (timeframe === "year") {
		const year = String(date.getUTCFullYear());

		return {
			label: year,
			shortLabel: year,
		};
	}

	if (timeframe === "quarter") {
		const quarter = Math.floor(date.getUTCMonth() / 3) + 1;

		const firstMonth = new Intl.DateTimeFormat("en-US", {
			month: "long",
			timeZone: "UTC",
		}).format(date);

		const lastMonth = new Intl.DateTimeFormat("en-US", {
			month: "long",
			timeZone: "UTC",
		}).format(endOfPeriod(date, timeframe));

		return {
			label: `${firstMonth} - ${lastMonth} ` + `${date.getUTCFullYear()}`,
			shortLabel: `Q${quarter}`,
		};
	}

	return {
		label: new Intl.DateTimeFormat("en-US", {
			month: "long",
			year: "numeric",
			timeZone: "UTC",
		}).format(date),
		shortLabel: new Intl.DateTimeFormat("en-US", {
			month: "short",
			timeZone: "UTC",
		}).format(date),
	};
}

export function transactionMatchesCashFlowFilters(
	transaction: Transaction,
	filters: CashFlowFilters,
): boolean {
	if (filters.accountIds.length > 0) {
		const accountId = transaction.account_id ?? "";

		if (!filters.accountIds.includes(accountId)) {
			return false;
		}
	}

	if (filters.tags.length > 0) {
		const transactionTags = new Set(
			(transaction.tags ?? []).map((tag) => {
				return tag.trim().toLowerCase();
			}),
		);

		const matchesEveryTag = filters.tags.every((tag) => {
			return transactionTags.has(tag.trim().toLowerCase());
		});

		if (!matchesEveryTag) {
			return false;
		}
	}

	const isHidden = Boolean(transaction.is_hidden);

	if (filters.hidden === "visible" && isHidden) {
		return false;
	}

	if (filters.hidden === "hidden" && !isHidden) {
		return false;
	}

	return true;
}

export function buildCashFlowPeriods(
	transactions: Transaction[],
	anchorDate: Date,
	timeframe: CashFlowTimeframe,
	filters: CashFlowFilters,
): CashFlowPeriod[] {
	const startOffset = timeframe === "year" ? -2 : -5;

	const endOffset = timeframe === "year" ? 0 : 3;

	const now = new Date();
	const periods: CashFlowPeriod[] = [];

	for (let offset = startOffset; offset <= endOffset; offset += 1) {
		const start = startOfPeriod(
			shiftPeriod(anchorDate, timeframe, offset),
			timeframe,
		);

		const end = endOfPeriod(start, timeframe);

		let income = 0;
		let expenses = 0;

		for (const transaction of transactions) {
			if (!transactionMatchesCashFlowFilters(transaction, filters)) {
				continue;
			}

			const transactionDate = parseUtcDate(transaction.date);

			if (
				!transactionDate ||
				transactionDate < start ||
				transactionDate > end
			) {
				continue;
			}

			const amount = Number(transaction.amount) || 0;

			if (amount > 0) {
				income += amount;
			}

			if (amount < 0) {
				expenses += Math.abs(amount);
			}
		}

		const savings = income - expenses;

		const labels = getPeriodLabels(start, timeframe);

		periods.push({
			key: toDateParam(start),
			label: labels.label,
			shortLabel: labels.shortLabel,
			start,
			end,
			income,
			expenses,
			savings,
			savingsRate: income > 0 ? Math.max(0, (savings / income) * 100) : 0,
			forecast: start.getTime() > now.getTime(),
		});
	}

	return periods;
}

export function getSelectedPeriod(
	periods: CashFlowPeriod[],
	date: Date,
): CashFlowPeriod {
	const timestamp = date.getTime();

	const matchingPeriod = periods.find((period) => {
		return (
			timestamp >= period.start.getTime() && timestamp <= period.end.getTime()
		);
	});

	if (matchingPeriod) {
		return matchingPeriod;
	}

	const fallbackPeriod = periods[Math.floor(periods.length / 2)] ?? periods[0];

	if (!fallbackPeriod) {
		throw new Error("Cash flow periods cannot be empty.");
	}

	return fallbackPeriod;
}

function normalizeIdentity(value: string | null | undefined): string {
	return value?.trim().toLowerCase() ?? "";
}

export function getCategoryIdMap(
	customCategories: CustomCategory[],
): Map<string, string> {
	const categoryIdByName = new Map<string, string>();

	for (const category of customCategories) {
		const normalizedName = normalizeIdentity(category.name);

		if (normalizedName && !categoryIdByName.has(normalizedName)) {
			categoryIdByName.set(normalizedName, category.id);
		}
	}

	return categoryIdByName;
}

function colorFor(label: string, index: number): string {
	const theme = getCategoryTheme(label);

	const themeColor = (
		theme as {
			hex?: string;
		}
	).hex;

	return themeColor ?? PALETTE[index % PALETTE.length] ?? "#7a8b99";
}

function getCategoryGroupBySourceName(
	groupName: string,
	categoryGroups: CategoryGroupRecord[],
): CategoryGroupRecord | undefined {
	const normalizedGroupName = normalizeIdentity(groupName);

	return categoryGroups.find((group) => {
		return (
			normalizeIdentity(group.source_name) === normalizedGroupName ||
			normalizeIdentity(group.name) === normalizedGroupName
		);
	});
}

function resolveCategoryGroupIdentity(
	groupName: string,
	categoryGroups: CategoryGroupRecord[],
): CategoryGroupIdentity {
	const groupRecord = getCategoryGroupBySourceName(groupName, categoryGroups);

	if (!groupRecord) {
		return {
			groupId: null,
			detailUrl: null,
		};
	}

	return {
		groupId: groupRecord.id,
		detailUrl: `/category-groups/${encodeURIComponent(groupRecord.id)}`,
	};
}

export function findCashFlowCategoryGroupById(
	requestedGroupId: string,
	categoryGroups: CategoryGroupRecord[],
	customCategories: CustomCategory[],
	categoryPreferences: CategoryPreferences = {},
): CashFlowCategoryGroupMatch | null {
	const requestedId = requestedGroupId.trim();

	if (!requestedId) {
		return null;
	}

	const legacySourceName = requestedId.startsWith("system:")
		? requestedId.slice("system:".length).trim()
		: null;
	const normalizedLegacySourceName = normalizeIdentity(legacySourceName);
	const groupRecord = categoryGroups.find((group) => {
		return (
			group.id === requestedId ||
			(Boolean(normalizedLegacySourceName) &&
				normalizeIdentity(group.source_name) === normalizedLegacySourceName)
		);
	});

	if (!groupRecord) {
		return null;
	}

	const normalizedSourceName = normalizeIdentity(groupRecord.source_name);
	const childCategories = customCategories.filter((category) => {
		return (
			normalizeIdentity(
				getEffectiveCategoryParentName(category, categoryPreferences),
			) === normalizedSourceName
		);
	});

	return {
		groupId: groupRecord.id,
		groupName: groupRecord.name,
		sourceName: groupRecord.source_name,
		groupRecord,
		childCategories,
	};
}

function addCashFlowSource(url: string | null): string | null {
	if (!url) {
		return null;
	}

	const separator = url.includes("?") ? "&" : "?";

	return `${url}${separator}from=cash-flow`;
}

export function resolveCashFlowDetailUrl(
	entity: Pick<
		CashFlowBreakdownItem,
		"detailUrl" | "entityKind" | "entityId" | "parentEntityId"
	>,
): string | null {
	if (entity.entityKind === "group") {
		const url = entity.entityId
			? `/category-groups/${encodeURIComponent(entity.entityId)}`
			: entity.detailUrl;

		return addCashFlowSource(url);
	}

	if (entity.entityKind === "category") {
		const url = entity.entityId
			? `/categories/${encodeURIComponent(entity.entityId)}`
			: entity.detailUrl;

		return addCashFlowSource(url);
	}

	if (entity.entityKind === "merchant") {
		const url = entity.entityId
			? `/merchants/${encodeURIComponent(entity.entityId)}`
			: entity.detailUrl;

		return addCashFlowSource(url);
	}

	return addCashFlowSource(entity.detailUrl ?? null);
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
		customCategories.map((category) => {
			return [normalizeIdentity(category.name), category] as const;
		}),
	);
	const categoryGroupBySourceName = new Map(
		categoryGroups.map((group) => {
			return [normalizeIdentity(group.source_name), group] as const;
		}),
	);

	const merchantByName = new Map(
		merchantItems.map((merchant) => {
			return [normalizeIdentity(merchant.name), merchant] as const;
		}),
	);

	for (const transaction of transactions) {
		if (!transactionMatchesCashFlowFilters(transaction, filters)) {
			continue;
		}

		const transactionDate = parseUtcDate(transaction.date);

		if (
			!transactionDate ||
			transactionDate < period.start ||
			transactionDate > period.end
		) {
			continue;
		}

		const amount = Number(transaction.amount) || 0;

		if (kind === "income" && amount <= 0) {
			continue;
		}

		if (kind === "expense" && amount >= 0) {
			continue;
		}

		const category = transaction.category?.trim() || "Uncategorized";

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

		const merchant = transaction.merchant?.trim() || "Unknown merchant";

		let aggregationKey = category;
		let label = category;
		let parentLabel = group;
		let iconName = category;
		let detailUrl: string | null = null;

		let entityKind: CashFlowBreakdownItem["entityKind"] = "category";

		let entityId: string | null = null;

		let parentEntityId: string | null = null;

		if (breakdown === "group") {
			const groupIdentity = resolveCategoryGroupIdentity(
				groupSourceName,
				categoryGroups,
			);

			aggregationKey = groupIdentity.groupId ?? groupSourceName;
			label = group;
			parentLabel = group;
			iconName = group;
			entityKind = "group";
			entityId = groupIdentity.groupId;
			parentEntityId = null;
			detailUrl = groupIdentity.detailUrl;
		} else if (breakdown === "merchant") {
			const merchantItem = transaction.merchant_id
				? merchantItems.find((candidate) => {
						return candidate.id === transaction.merchant_id;
					})
				: merchantByName.get(normalizeIdentity(merchant));

			aggregationKey = merchant;
			label = merchant;
			parentLabel = group;
			iconName = merchant;
			entityKind = "merchant";

			entityId = merchantItem?.id ?? transaction.merchant_id ?? null;

			detailUrl = entityId
				? `/merchants/${encodeURIComponent(entityId)}`
				: null;
		} else {
			const groupIdentity = resolveCategoryGroupIdentity(
				groupSourceName,
				categoryGroups,
			);

			entityKind = "category";
			entityId = categoryId;
			parentEntityId = groupIdentity.groupId;

			detailUrl = entityId
				? `/categories/${encodeURIComponent(entityId)}`
				: null;
		}

		const existingItem = totals.get(aggregationKey);

		if (existingItem) {
			existingItem.amount += Math.abs(amount);

			if (!existingItem.entityId && entityId) {
				existingItem.entityId = entityId;
			}

			if (!existingItem.parentEntityId && parentEntityId) {
				existingItem.parentEntityId = parentEntityId;
			}

			if (!existingItem.detailUrl && detailUrl) {
				existingItem.detailUrl = detailUrl;
			}

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

	const total = [...totals.values()].reduce((sum, item) => {
		return sum + item.amount;
	}, 0);

	return [...totals.entries()]
		.map(([aggregationKey, item], index) => {
			return {
				id: aggregationKey,
				...item,
				share: total > 0 ? (item.amount / total) * 100 : 0,
				color: colorFor(item.parentLabel || item.label, index),
			};
		})
		.sort((first, second) => {
			return second.amount - first.amount;
		});
}

export function buildSankeyData(
	expenseItemsByCategory: CashFlowBreakdownItem[],
	expenseItemsByGroup: CashFlowBreakdownItem[],
	mode: SankeyBreakdown,
): {
	nodes: SankeyNodeDatum[];
	links: SankeyLinkDatum[];
} {
	const total = expenseItemsByCategory.reduce((sum, item) => {
		return sum + item.amount;
	}, 0);

	const root: SankeyNodeDatum = {
		id: "expenses",
		label: "Expenses",
		amount: total,
		share: 100,
		color: "#235c48",
		level: 0,
		entityKind: "root",
		entityId: null,
		parentEntityId: null,
		detailUrl: null,
	};

	const nodes: SankeyNodeDatum[] = [root];

	const links: SankeyLinkDatum[] = [];

	if (mode === "category") {
		for (const item of expenseItemsByCategory) {
			const nodeId = `category:${item.id}`;

			nodes.push({
				...item,
				id: nodeId,
				level: 1,
			});

			links.push({
				source: root.id,
				target: nodeId,
				value: item.amount,
				color: item.color,
			});
		}

		return {
			nodes,
			links,
		};
	}

	const groupNodeIdByLabel = new Map<string, string>();

	for (const item of expenseItemsByGroup) {
		const nodeId = `group:${item.id}`;

		groupNodeIdByLabel.set(normalizeIdentity(item.label), nodeId);

		nodes.push({
			...item,
			id: nodeId,
			level: 1,
		});

		links.push({
			source: root.id,
			target: nodeId,
			value: item.amount,
			color: item.color,
		});
	}

	if (mode === "group") {
		return {
			nodes,
			links,
		};
	}

	for (const item of expenseItemsByCategory) {
		const nodeId = `category:${item.id}`;

		nodes.push({
			...item,
			id: nodeId,
			level: 2,
		});

		const sourceNodeId =
			groupNodeIdByLabel.get(normalizeIdentity(item.parentLabel)) ?? root.id;

		links.push({
			source: sourceNodeId,
			target: nodeId,
			value: item.amount,
			color: item.color,
		});
	}

	return {
		nodes,
		links,
	};
}

export function getAccountOptions(accounts: Account[]): Array<{
	value: string;
	label: string;
}> {
	return accounts
		.filter((account) => {
			return Boolean(account.id && account.name?.trim());
		})
		.map((account) => {
			return {
				value: account.id,
				label: account.name.trim(),
			};
		})
		.sort((first, second) => {
			return first.label.localeCompare(second.label);
		});
}

export function daysBetween(first: Date, second: Date): number {
	return Math.round((second.getTime() - first.getTime()) / DAY_MS);
}
