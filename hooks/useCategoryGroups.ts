"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { CustomCategory } from "@/store/useBudgetStore";
import type {
	CategoryPreferences,
	GroupPreferences,
} from "@/lib/categories/categoryPreferences";
import {
	buildCategoryGroupSeeds,
	type CategoryGroupRecord,
	type CategoryGroupUpdate,
} from "@/lib/categories/categoryGroups";
import {
	deleteCategoryGroupRecord,
	fetchOrCreateCategoryGroups,
	updateCategoryGroupRecord,
} from "@/lib/categories/categoryGroupsRepository";

export function useCategoryGroups({
	customCategories,
	categoryPreferences,
	groupPreferences,
}: {
	customCategories: CustomCategory[];
	categoryPreferences: CategoryPreferences;
	groupPreferences: GroupPreferences;
}) {
	const [groups, setGroups] = useState<CategoryGroupRecord[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const seeds = useMemo(() => {
		return buildCategoryGroupSeeds({
			customCategories,
			categoryPreferences,
			groupPreferences,
		});
	}, [categoryPreferences, customCategories, groupPreferences]);

	const refresh = useCallback(async (): Promise<CategoryGroupRecord[]> => {
		setError(null);

		try {
			const nextGroups = await fetchOrCreateCategoryGroups(seeds);
			setGroups(nextGroups);
			return nextGroups;
		} catch (refreshError) {
			setError(
				refreshError instanceof Error
					? refreshError.message
					: "Failed to load category groups.",
			);
			return [];
		} finally {
			setIsLoading(false);
		}
	}, [seeds]);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	const updateGroup = useCallback(
		async (
			groupId: string,
			updates: CategoryGroupUpdate,
		): Promise<CategoryGroupRecord> => {
			const updated = await updateCategoryGroupRecord(groupId, updates);
			setGroups((current) => {
				return current.map((group) => {
					return group.id === updated.id ? updated : group;
				});
			});
			return updated;
		},
		[],
	);

	const removeGroup = useCallback(async (groupId: string): Promise<void> => {
		await deleteCategoryGroupRecord(groupId);
		setGroups((current) => {
			return current.filter((group) => group.id !== groupId);
		});
	}, []);

	return {
		groups,
		isLoading,
		error,
		refresh,
		updateGroup,
		removeGroup,
	};
}
