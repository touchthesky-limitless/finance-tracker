import { createClient } from "@/lib/supabase";
import {
	parseCategoryPreferences,
	parseGroupPreferences,
	type CategoryPreferences,
	type GroupPreferences,
} from "@/lib/categories/categoryPreferences";

const supabase = createClient();

interface CategoryPreferenceRow {
	category_group_preferences: unknown | null;
	category_preferences: unknown | null;
}

export interface CategoryPreferenceSnapshot {
	groupPreferences: GroupPreferences | null;
	categoryPreferences: CategoryPreferences | null;
}

export interface CategoryPreferenceSnapshotUpdate {
	groupPreferences?: GroupPreferences;
	categoryPreferences?: CategoryPreferences;
}

export async function fetchCategoryPreferenceSnapshot(
	userId: string,
): Promise<CategoryPreferenceSnapshot> {
	const { data, error } = await supabase
		.from("user_preferences")
		.select("category_group_preferences, category_preferences")
		.eq("user_id", userId)
		.maybeSingle();

	if (error) {
		throw error;
	}

	const row = data as CategoryPreferenceRow | null;

	return {
		groupPreferences:
			row?.category_group_preferences === null ||
			row?.category_group_preferences === undefined
				? null
				: parseGroupPreferences(row.category_group_preferences),
		categoryPreferences:
			row?.category_preferences === null ||
			row?.category_preferences === undefined
				? null
				: parseCategoryPreferences(row.category_preferences),
	};
}

export async function saveCategoryPreferenceSnapshot(
	userId: string,
	updates: CategoryPreferenceSnapshotUpdate,
): Promise<void> {
	const payload: Record<string, unknown> = {
		user_id: userId,
	};

	if (updates.groupPreferences !== undefined) {
		payload.category_group_preferences = parseGroupPreferences(
			updates.groupPreferences,
		);
	}

	if (updates.categoryPreferences !== undefined) {
		payload.category_preferences = parseCategoryPreferences(
			updates.categoryPreferences,
		);
	}

	if (Object.keys(payload).length === 1) {
		return;
	}

	const { error } = await supabase
		.from("user_preferences")
		.upsert(payload, { onConflict: "user_id" });

	if (error) {
		throw error;
	}
}
