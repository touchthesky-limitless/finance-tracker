import { createClient } from "@/lib/supabase";
import type {
	CategoryGroupRecord,
	CategoryGroupSeed,
	CategoryGroupUpdate,
} from "@/lib/categories/categoryGroups";

const supabase = createClient();
const CATEGORY_GROUP_COLUMNS =
	"id, user_id, source_name, name, section_id, budget_mode, budget_type, monthly_rollover, hidden, is_system, sort_order, created_at, updated_at";

async function requireUserId(): Promise<string> {
	const {
		data: { user },
		error,
	} = await supabase.auth.getUser();

	if (error) {
		throw error;
	}

	if (!user) {
		throw new Error("You must be signed in to manage category groups.");
	}

	return user.id;
}

export async function fetchOrCreateCategoryGroups(
	seeds: CategoryGroupSeed[],
): Promise<CategoryGroupRecord[]> {
	const userId = await requireUserId();
	const { data: existingData, error: existingError } = await supabase
		.from("category_groups")
		.select(CATEGORY_GROUP_COLUMNS)
		.eq("user_id", userId)
		.order("sort_order", { ascending: true, nullsFirst: false })
		.order("name", { ascending: true });

	if (existingError) {
		throw existingError;
	}

	const existing = (existingData ?? []) as CategoryGroupRecord[];
	const existingSourceNames = new Set(
		existing.map((group) => group.source_name.trim().toLowerCase()),
	);
	const missingRows = seeds
		.filter((seed) => {
			return !existingSourceNames.has(seed.source_name.trim().toLowerCase());
		})
		.map((seed) => ({
			user_id: userId,
			...seed,
		}));

	if (missingRows.length > 0) {
		const { error: insertError } = await supabase
			.from("category_groups")
			.upsert(missingRows, {
				onConflict: "user_id,source_name",
				ignoreDuplicates: true,
			});

		if (insertError) {
			throw insertError;
		}
	}

	const { data, error } = await supabase
		.from("category_groups")
		.select(CATEGORY_GROUP_COLUMNS)
		.eq("user_id", userId)
		.order("sort_order", { ascending: true, nullsFirst: false })
		.order("name", { ascending: true });

	if (error) {
		throw error;
	}

	return (data ?? []) as CategoryGroupRecord[];
}

export async function updateCategoryGroupRecord(
	groupId: string,
	updates: CategoryGroupUpdate,
): Promise<CategoryGroupRecord> {
	const userId = await requireUserId();
	const normalizedUpdates: CategoryGroupUpdate = { ...updates };

	if (normalizedUpdates.budget_mode === "category") {
		normalizedUpdates.budget_type = null;
		normalizedUpdates.monthly_rollover = false;
	}

	const { data, error } = await supabase
		.from("category_groups")
		.update(normalizedUpdates)
		.eq("id", groupId)
		.eq("user_id", userId)
		.select(CATEGORY_GROUP_COLUMNS)
		.single();

	if (error) {
		throw error;
	}

	return data as CategoryGroupRecord;
}

export async function deleteCategoryGroupRecord(
	groupId: string,
): Promise<void> {
	const userId = await requireUserId();
	const { error } = await supabase
		.from("category_groups")
		.delete()
		.eq("id", groupId)
		.eq("user_id", userId);

	if (error) {
		throw error;
	}
}
