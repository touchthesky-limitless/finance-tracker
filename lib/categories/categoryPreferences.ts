export type CategorySectionId = "income" | "expenses" | "transfers";
export type GroupBudgetMode = "group" | "category";

export interface GroupPreference {
	name?: string;
	budgetMode?: GroupBudgetMode;
	sectionId?: CategorySectionId;
	hidden?: boolean;
	order?: number;
}

export interface CategoryPreference {
	excludedFromBudget?: boolean;
	parentName?: string;
	order?: number;
	hidden?: boolean;
}

export type GroupPreferences = Record<string, GroupPreference>;
export type CategoryPreferences = Record<string, CategoryPreference>;

export const LEGACY_GROUP_PREFERENCES_STORAGE_KEY =
	"finance-category-group-preferences-v1";
export const LEGACY_CATEGORY_PREFERENCES_STORAGE_KEY =
	"finance-category-preferences-v1";

interface StorageReader {
	getItem(key: string): string | null;
}

interface StorageWriter {
	removeItem(key: string): void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getOptionalString(value: unknown): string | undefined {
	if (typeof value !== "string") {
		return undefined;
	}

	const trimmed = value.trim();
	return trimmed || undefined;
}

function getOptionalOrder(value: unknown): number | undefined {
	if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
		return undefined;
	}

	return Math.trunc(value);
}

function hasOwnPreferences(value: object): boolean {
	return Object.keys(value).length > 0;
}

export function parseGroupPreferences(value: unknown): GroupPreferences {
	if (!isRecord(value)) {
		return {};
	}

	const result: GroupPreferences = {};

	for (const [key, candidate] of Object.entries(value)) {
		if (!key.trim() || !isRecord(candidate)) {
			continue;
		}

		const preference: GroupPreference = {};
		const name = getOptionalString(candidate.name);
		const order = getOptionalOrder(candidate.order);

		if (name) {
			preference.name = name;
		}

		if (candidate.budgetMode === "group" || candidate.budgetMode === "category") {
			preference.budgetMode = candidate.budgetMode;
		}

		if (
			candidate.sectionId === "income" ||
			candidate.sectionId === "expenses" ||
			candidate.sectionId === "transfers"
		) {
			preference.sectionId = candidate.sectionId;
		}

		if (typeof candidate.hidden === "boolean") {
			preference.hidden = candidate.hidden;
		}

		if (order !== undefined) {
			preference.order = order;
		}

		if (hasOwnPreferences(preference)) {
			result[key] = preference;
		}
	}

	return result;
}

export function parseCategoryPreferences(value: unknown): CategoryPreferences {
	if (!isRecord(value)) {
		return {};
	}

	const result: CategoryPreferences = {};

	for (const [categoryId, candidate] of Object.entries(value)) {
		if (!categoryId.trim() || !isRecord(candidate)) {
			continue;
		}

		const preference: CategoryPreference = {};
		const parentName = getOptionalString(candidate.parentName);
		const order = getOptionalOrder(candidate.order);

		if (typeof candidate.excludedFromBudget === "boolean") {
			preference.excludedFromBudget = candidate.excludedFromBudget;
		}

		if (parentName) {
			preference.parentName = parentName;
		}

		if (order !== undefined) {
			preference.order = order;
		}

		if (typeof candidate.hidden === "boolean") {
			preference.hidden = candidate.hidden;
		}

		if (hasOwnPreferences(preference)) {
			result[categoryId] = preference;
		}
	}

	return result;
}

function readLegacyRecord(
	storage: StorageReader,
	storageKey: string,
): unknown {
	try {
		const storedValue = storage.getItem(storageKey);
		return storedValue ? (JSON.parse(storedValue) as unknown) : undefined;
	} catch (error) {
		console.error(`Failed to read ${storageKey}:`, error);
		return undefined;
	}
}

export function readLegacyGroupPreferences(
	storage: StorageReader,
): GroupPreferences {
	return parseGroupPreferences(
		readLegacyRecord(storage, LEGACY_GROUP_PREFERENCES_STORAGE_KEY),
	);
}

export function readLegacyCategoryPreferences(
	storage: StorageReader,
): CategoryPreferences {
	return parseCategoryPreferences(
		readLegacyRecord(storage, LEGACY_CATEGORY_PREFERENCES_STORAGE_KEY),
	);
}

export function clearLegacyCategoryPreferenceStorage(
	storage: StorageWriter,
): void {
	try {
		storage.removeItem(LEGACY_GROUP_PREFERENCES_STORAGE_KEY);
		storage.removeItem(LEGACY_CATEGORY_PREFERENCES_STORAGE_KEY);
	} catch (error) {
		console.error("Failed to clear legacy category preferences:", error);
	}
}

export function getCategoryGroupPreferenceKey(
	name: string,
	recordId?: string | null,
	isSystem = false,
): string {
	if (recordId && !isSystem) {
		return `category:${recordId}`;
	}

	return `system:${name}`;
}
