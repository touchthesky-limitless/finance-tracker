/**
 * cashFlowCategoryUtils – Category and group identity helpers.
 */
import { getCategoryTheme } from "@/constants";
import type { Account, CustomCategory } from "@/store/useBudgetStore";
import type { CategoryPreferences } from "@/lib/categories/categoryPreferences";
import {
	getEffectiveCategoryParentName,
	type CategoryGroupRecord,
} from "@/lib/categories/categoryGroups";

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

function normalizeIdentity(value: string | null | undefined): string {
	return value?.trim().toLowerCase() ?? "";
}

export function getCategoryIdMap(
	customCategories: CustomCategory[],
): Map<string, string> {
	const map = new Map<string, string>();
	for (const cat of customCategories) {
		const key = normalizeIdentity(cat.name);
		if (key && !map.has(key)) map.set(key, cat.id);
	}
	return map;
}

export function colorFor(label: string, index: number): string {
	const theme = getCategoryTheme(label) as { hex?: string };
	return theme?.hex ?? PALETTE[index % PALETTE.length] ?? "#7a8b99";
}

export function getCategoryGroupBySourceName(
	groupName: string,
	categoryGroups: CategoryGroupRecord[],
): CategoryGroupRecord | undefined {
	const norm = normalizeIdentity(groupName);
	return categoryGroups.find(
		(g) =>
			normalizeIdentity(g.source_name) === norm ||
			normalizeIdentity(g.name) === norm,
	);
}

export function resolveCategoryGroupIdentity(
	groupName: string,
	categoryGroups: CategoryGroupRecord[],
): { groupId: string | null; detailUrl: string | null } {
	const record = getCategoryGroupBySourceName(groupName, categoryGroups);
	if (!record) return { groupId: null, detailUrl: null };
	return {
		groupId: record.id,
		detailUrl: `/category-groups/${encodeURIComponent(record.id)}`,
	};
}

export interface CashFlowCategoryGroupMatch {
	groupId: string;
	groupName: string;
	sourceName: string;
	groupRecord: CategoryGroupRecord;
	childCategories: CustomCategory[];
}

export function findCashFlowCategoryGroupById(
	requestedGroupId: string,
	categoryGroups: CategoryGroupRecord[],
	customCategories: CustomCategory[],
	categoryPreferences: CategoryPreferences = {},
): CashFlowCategoryGroupMatch | null {
	const id = requestedGroupId.trim();
	if (!id) return null;

	const legacySourceName = id.startsWith("system:")
		? id.slice("system:".length).trim()
		: null;
	const normLegacy = normalizeIdentity(legacySourceName);
	const record = categoryGroups.find(
		(g) =>
			g.id === id ||
			(normLegacy && normalizeIdentity(g.source_name) === normLegacy),
	);
	if (!record) return null;

	const normSource = normalizeIdentity(record.source_name);
	const childCategories = customCategories.filter(
		(cat) =>
			normalizeIdentity(
				getEffectiveCategoryParentName(cat, categoryPreferences),
			) === normSource,
	);

	return {
		groupId: record.id,
		groupName: record.name,
		sourceName: record.source_name,
		groupRecord: record,
		childCategories,
	};
}

export function getAccountOptions(
	accounts: Account[],
): Array<{ value: string; label: string }> {
	return accounts
		.filter((a) => Boolean(a.id && a.name?.trim()))
		.map((a) => ({ value: a.id, label: a.name.trim() }))
		.sort((a, b) => a.label.localeCompare(b.label));
}
