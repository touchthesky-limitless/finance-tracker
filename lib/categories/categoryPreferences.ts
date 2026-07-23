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

export const GROUP_PREFERENCES_STORAGE_KEY =
	"finance-category-group-preferences-v1";
export const CATEGORY_PREFERENCES_STORAGE_KEY =
	"finance-category-preferences-v1";
export const CATEGORY_PREFERENCES_CHANGED_EVENT =
	"finance-category-preferences-changed";

function readRecord<T>(storageKey: string): Record<string, T> {
	if (typeof window === "undefined") {
		return {};
	}

	try {
		const storedValue = window.localStorage.getItem(storageKey);

		if (!storedValue) {
			return {};
		}

		const parsedValue = JSON.parse(storedValue) as unknown;

		if (!parsedValue || typeof parsedValue !== "object") {
			return {};
		}

		return parsedValue as Record<string, T>;
	} catch (error) {
		console.error(`Failed to read ${storageKey}:`, error);
		return {};
	}
}

function notifyPreferenceChange(): void {
	if (typeof window === "undefined") {
		return;
	}

	window.setTimeout(() => {
		window.dispatchEvent(new Event(CATEGORY_PREFERENCES_CHANGED_EVENT));
	}, 0);
}

function writeRecord<T>(
	storageKey: string,
	preferences: Record<string, T>,
): void {
	if (typeof window === "undefined") {
		return;
	}

	try {
		window.localStorage.setItem(storageKey, JSON.stringify(preferences));
		notifyPreferenceChange();
	} catch (error) {
		console.error(`Failed to save ${storageKey}:`, error);
	}
}

export function readGroupPreferences(): Record<string, GroupPreference> {
	return readRecord<GroupPreference>(GROUP_PREFERENCES_STORAGE_KEY);
}

export function writeGroupPreferences(
	preferences: Record<string, GroupPreference>,
): void {
	writeRecord(GROUP_PREFERENCES_STORAGE_KEY, preferences);
}

export function readCategoryPreferences(): Record<
	string,
	CategoryPreference
> {
	return readRecord<CategoryPreference>(CATEGORY_PREFERENCES_STORAGE_KEY);
}

export function writeCategoryPreferences(
	preferences: Record<string, CategoryPreference>,
): void {
	writeRecord(CATEGORY_PREFERENCES_STORAGE_KEY, preferences);
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
