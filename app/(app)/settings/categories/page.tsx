"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DragDropProvider } from "@dnd-kit/react";
import { move } from "@dnd-kit/helpers";
import { useSortable } from "@dnd-kit/react/sortable";
import {
	AlertCircle,
	Check,
	ChevronDown,
	EyeOff,
	GripVertical,
	Info,
	Loader2,
	Plus,
	Search,
	Trash2,
	X,
} from "lucide-react";

import { CategoryEmojiPicker } from "@/components/Categories/CategoryEmojiPicker";
import {
	ConfirmDialog,
	type ConfirmDialogVariant,
} from "@/components/ui/ConfirmDialog";
import {
	CategoryGlyph,
	encodeEmojiIcon,
	getEmojiIcon,
} from "@/components/Categories/CategoryGlyph";
import { SettingsContentCard } from "@/components/Settings/SettingsShell";
import { CATEGORY_HIERARCHY, getCategoryTheme } from "@/constants";
import { type CustomCategory, useBudgetStore } from "@/store/useBudgetStore";
import {
	type CategoryPreference,
	type CategorySectionId,
	type GroupBudgetMode,
	type GroupPreference,
	getCategoryGroupPreferenceKey,
} from "@/lib/categories/categoryPreferences";

type EditorMode =
	| "create-group"
	| "edit-group"
	| "create-category"
	| "edit-category";

interface CategoryGroup {
	key: string;
	name: string;
	displayName: string;
	budgetMode: GroupBudgetMode;
	sectionId: CategorySectionId;
	order: number | null;
	hidden: boolean;
	record?: CustomCategory;
	children: CustomCategory[];
}

interface EditorState {
	mode: EditorMode;
	sectionId?: CategorySectionId;
	parentName?: string;
	category?: CustomCategory;
	group?: CategoryGroup;
}

interface ConfirmationState {
	title: string;
	description: string;
	confirmLabel: string;
	variant: ConfirmDialogVariant;
	icon: "delete" | "disable";
}

type ActiveDragType = "group" | "category";

type GroupOrder = Record<CategorySectionId, string[]>;
type CategoryOrder = Record<string, string[]>;

function getGroupDragId(groupKey: string): string {
	return `group:${groupKey}`;
}

function getCategoryDragId(categoryId: string): string {
	return `category:${categoryId}`;
}

function getGroupKeyFromDragId(id: string): string {
	return id.startsWith("group:") ? id.slice("group:".length) : id;
}

function getCategoryIdFromDragId(id: string): string {
	return id.startsWith("category:") ? id.slice("category:".length) : id;
}

function getSortableGroup(source: unknown): string | null {
	if (!source || typeof source !== "object") {
		return null;
	}

	const sortableSource = source as {
		initialGroup?: unknown;
		group?: unknown;
	};
	const group = sortableSource.initialGroup ?? sortableSource.group;

	return typeof group === "string" ? group : null;
}

function getCurrentSortableGroup(source: unknown): string | null {
	if (!source || typeof source !== "object") {
		return null;
	}

	const group = (source as { group?: unknown }).group;

	return typeof group === "string" ? group : null;
}

function arraysEqual(
	first: readonly string[],
	second: readonly string[],
): boolean {
	return (
		first.length === second.length &&
		first.every((value, index) => value === second[index])
	);
}

const DEFAULT_ICON = encodeEmojiIcon("❓");
const DEFAULT_COLOR = "slate";

const CATEGORY_SECTIONS: ReadonlyArray<{
	id: CategorySectionId;
	title: string;
}> = [
	{ id: "income", title: "Income" },
	{ id: "expenses", title: "Expenses" },
	{ id: "transfers", title: "Transfers" },
];

function normalize(value: string): string {
	return value.trim().toLowerCase();
}

function getDefaultSectionId(groupName: string): CategorySectionId {
	const normalizedName = normalize(groupName);

	if (normalizedName === "income") {
		return "income";
	}

	if (normalizedName.includes("transfer")) {
		return "transfers";
	}

	return "expenses";
}

export default function SettingsCategoriesPage() {
	const customCategories = useBudgetStore((state) => state.customCategories);
	const fetchCustomCategories = useBudgetStore(
		(state) => state.fetchCustomCategories,
	);
	const addCustomCategory = useBudgetStore((state) => state.addCustomCategory);
	const updateCustomCategory = useBudgetStore(
		(state) => state.updateCustomCategory,
	);
	const deleteCustomCategory = useBudgetStore(
		(state) => state.deleteCustomCategory,
	);
	const groupPreferences = useBudgetStore((state) => state.groupPreferences);
	const categoryPreferences = useBudgetStore(
		(state) => state.categoryPreferences,
	);
	const persistGroupPreferences = useBudgetStore(
		(state) => state.setGroupPreferences,
	);
	const persistCategoryPreferences = useBudgetStore(
		(state) => state.setCategoryPreferences,
	);

	const [editor, setEditor] = useState<EditorState | null>(null);
	const [name, setName] = useState("");
	const [icon, setIcon] = useState(DEFAULT_ICON);
	const [color, setColor] = useState(DEFAULT_COLOR);
	const [selectedParentName, setSelectedParentName] = useState("Income");
	const [excludeFromBudget, setExcludeFromBudget] = useState(false);
	const [budgetMode, setBudgetMode] = useState<GroupBudgetMode>("category");
	const [isSaving, setIsSaving] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [isReordering, setIsReordering] = useState(false);
	const [confirmation, setConfirmation] = useState<ConfirmationState | null>(
		null,
	);

	useEffect(() => {
		void fetchCustomCategories();
	}, [fetchCustomCategories]);

	const groups = useMemo<CategoryGroup[]>(() => {
		const parentByName = new Map<string, CustomCategory>();
		const childrenByParent = new Map<string, CustomCategory[]>();

		for (const category of customCategories) {
			const categoryName = category.name.trim();

			if (!categoryName) {
				continue;
			}

			const preferredParent =
				categoryPreferences[category.id]?.parentName?.trim();
			const parentName = preferredParent || category.parent_name?.trim();

			if (!parentName) {
				parentByName.set(categoryName, category);
				continue;
			}

			const children = childrenByParent.get(parentName) ?? [];
			children.push(category);
			childrenByParent.set(parentName, children);
		}

		const orderedParentNames = [
			"Income",
			...Object.keys(CATEGORY_HIERARCHY).filter((groupName) => {
				return groupName !== "Income";
			}),
		];
		const seen = new Set(orderedParentNames);

		for (const parentName of parentByName.keys()) {
			if (!seen.has(parentName)) {
				seen.add(parentName);
				orderedParentNames.push(parentName);
			}
		}

		for (const parentName of childrenByParent.keys()) {
			if (!seen.has(parentName)) {
				seen.add(parentName);
				orderedParentNames.push(parentName);
			}
		}

		return orderedParentNames
			.map((parentName) => {
				const record = parentByName.get(parentName);
				const key = getCategoryGroupPreferenceKey(
					parentName,
					record?.id,
					record?.is_system ?? true,
				);
				const preference = groupPreferences[key];
				const children = [...(childrenByParent.get(parentName) ?? [])];

				children.sort((first, second) => {
					const firstDisabled = categoryPreferences[first.id]?.hidden === true;
					const secondDisabled =
						categoryPreferences[second.id]?.hidden === true;

					if (firstDisabled !== secondDisabled) {
						return firstDisabled ? 1 : -1;
					}

					const firstOrder = categoryPreferences[first.id]?.order;
					const secondOrder = categoryPreferences[second.id]?.order;

					if (
						typeof firstOrder === "number" ||
						typeof secondOrder === "number"
					) {
						if (typeof firstOrder !== "number") {
							return 1;
						}

						if (typeof secondOrder !== "number") {
							return -1;
						}

						if (firstOrder !== secondOrder) {
							return firstOrder - secondOrder;
						}
					}

					const firstIndex = CATEGORY_HIERARCHY[parentName]?.indexOf(
						first.name,
					);
					const secondIndex = CATEGORY_HIERARCHY[parentName]?.indexOf(
						second.name,
					);

					if (firstIndex !== undefined && firstIndex >= 0) {
						if (secondIndex === undefined || secondIndex < 0) {
							return -1;
						}

						return firstIndex - secondIndex;
					}

					if (secondIndex !== undefined && secondIndex >= 0) {
						return 1;
					}

					return first.name.localeCompare(second.name);
				});

				const isSystemGroup = !record || record.is_system;

				return {
					key,
					name: parentName,
					displayName: isSystemGroup
						? parentName
						: preference?.name?.trim() || parentName,
					budgetMode: preference?.budgetMode ?? "category",
					sectionId: preference?.sectionId ?? getDefaultSectionId(parentName),
					order:
						typeof preference?.order === "number" ? preference.order : null,
					record,
					children,
					hidden: preference?.hidden === true,
				};
			})
			.filter((group) => {
				return Boolean(group.record || group.children.length > 0);
			});
	}, [categoryPreferences, customCategories, groupPreferences]);

	const groupsBySection = useMemo(() => {
		const result: Record<CategorySectionId, CategoryGroup[]> = {
			income: [],
			expenses: [],
			transfers: [],
		};

		for (const group of groups) {
			result[group.sectionId].push(group);
		}

		for (const section of CATEGORY_SECTIONS) {
			result[section.id].sort((first, second) => {
				if (first.hidden !== second.hidden) {
					return first.hidden ? 1 : -1;
				}

				if (first.order !== null || second.order !== null) {
					if (first.order === null) {
						return 1;
					}

					if (second.order === null) {
						return -1;
					}

					if (first.order !== second.order) {
						return first.order - second.order;
					}
				}

				return groups.indexOf(first) - groups.indexOf(second);
			});
		}

		return result;
	}, [groups]);

	const canonicalGroupOrder = useMemo<GroupOrder>(() => {
		return {
			income: groupsBySection.income.map((group) => getGroupDragId(group.key)),
			expenses: groupsBySection.expenses.map((group) =>
				getGroupDragId(group.key),
			),
			transfers: groupsBySection.transfers.map((group) =>
				getGroupDragId(group.key),
			),
		};
	}, [groupsBySection]);

	const canonicalCategoryOrder = useMemo<CategoryOrder>(() => {
		const result: CategoryOrder = {};

		for (const group of groups) {
			result[group.key] = group.children.map((category) =>
				getCategoryDragId(category.id),
			);
		}

		return result;
	}, [groups]);

	const [groupOrder, setGroupOrder] = useState<GroupOrder>(canonicalGroupOrder);
	const [categoryOrder, setCategoryOrder] = useState<CategoryOrder>(
		canonicalCategoryOrder,
	);
	const groupOrderRef = useRef(groupOrder);
	const categoryOrderRef = useRef(categoryOrder);
	const groupSnapshotRef = useRef(groupOrder);
	const categorySnapshotRef = useRef(categoryOrder);
	const activeDragTypeRef = useRef<ActiveDragType | null>(null);

	useEffect(() => {
		if (activeDragTypeRef.current) {
			return;
		}

		groupOrderRef.current = canonicalGroupOrder;
		categoryOrderRef.current = canonicalCategoryOrder;
		setGroupOrder(canonicalGroupOrder);
		setCategoryOrder(canonicalCategoryOrder);
	}, [canonicalCategoryOrder, canonicalGroupOrder]);

	const displayGroupsBySection = useMemo(() => {
		const groupByDragId = new Map(
			groups.map((group) => [getGroupDragId(group.key), group]),
		);
		const categoryByDragId = new Map(
			customCategories.map((category) => [
				getCategoryDragId(category.id),
				category,
			]),
		);
		const result: Record<CategorySectionId, CategoryGroup[]> = {
			income: [],
			expenses: [],
			transfers: [],
		};

		for (const section of CATEGORY_SECTIONS) {
			const orderedGroupIds = [...(groupOrder[section.id] ?? [])];

			for (const canonicalId of canonicalGroupOrder[section.id]) {
				if (!orderedGroupIds.includes(canonicalId)) {
					orderedGroupIds.push(canonicalId);
				}
			}

			result[section.id] = orderedGroupIds
				.map((groupId) => groupByDragId.get(groupId))
				.filter((group): group is CategoryGroup => Boolean(group))
				.map((group) => {
					const orderedCategoryIds = [...(categoryOrder[group.key] ?? [])];

					for (const canonicalId of canonicalCategoryOrder[group.key] ?? []) {
						if (!orderedCategoryIds.includes(canonicalId)) {
							orderedCategoryIds.push(canonicalId);
						}
					}

					return {
						...group,
						children: orderedCategoryIds
							.map((categoryId) => categoryByDragId.get(categoryId))
							.filter((category): category is CustomCategory =>
								Boolean(category),
							),
					};
				});
		}

		return result;
	}, [
		canonicalCategoryOrder,
		canonicalGroupOrder,
		categoryOrder,
		customCategories,
		groupOrder,
		groups,
	]);

	const updateGroupPreference = async (
		key: string,
		updater: (current: GroupPreference) => GroupPreference,
	): Promise<void> => {
		await persistGroupPreferences((current) => {
			return {
				...current,
				[key]: updater(current[key] ?? {}),
			};
		});
	};

	const removeGroupPreference = async (key: string): Promise<void> => {
		await persistGroupPreferences((current) => {
			const nextPreferences = { ...current };
			delete nextPreferences[key];
			return nextPreferences;
		});
	};

	const updateCategoryPreference = async (
		categoryId: string,
		updater: (current: CategoryPreference) => CategoryPreference,
	): Promise<void> => {
		await persistCategoryPreferences((current) => {
			return {
				...current,
				[categoryId]: updater(current[categoryId] ?? {}),
			};
		});
	};

	const removeCategoryPreference = async (
		categoryId: string,
	): Promise<void> => {
		await persistCategoryPreferences((current) => {
			const nextPreferences = { ...current };
			delete nextPreferences[categoryId];
			return nextPreferences;
		});
	};

	const saveGroupOrder = async (
		sectionId: CategorySectionId,
		orderedGroupKeys: string[],
	): Promise<void> => {
		await persistGroupPreferences((current) => {
			const nextPreferences = { ...current };

			orderedGroupKeys.forEach((groupKey, index) => {
				nextPreferences[groupKey] = {
					...(nextPreferences[groupKey] ?? {}),
					sectionId,
					order: index,
				};
			});

			return nextPreferences;
		});
	};

	const persistCategoryOrder = async (
		nextOrder: CategoryOrder,
		groupKeys: readonly string[],
	): Promise<void> => {
		const uniqueGroupKeys = [...new Set(groupKeys)];

		await persistCategoryPreferences((current) => {
			const nextPreferences = { ...current };

			for (const groupKey of uniqueGroupKeys) {
				const group = groups.find((item) => item.key === groupKey);

				if (!group) {
					continue;
				}

				for (const [index, dragId] of (nextOrder[groupKey] ?? []).entries()) {
					const categoryId = getCategoryIdFromDragId(dragId);
					nextPreferences[categoryId] = {
						...(nextPreferences[categoryId] ?? {}),
						parentName: group.name,
						order: index,
					};
				}
			}

			return nextPreferences;
		});
	};

	const reportPreferenceError = (error: unknown): void => {
		setErrorMessage(
			error instanceof Error
				? error.message
				: "Failed to save category preferences.",
		);
	};

	const openEditor = (nextEditor: EditorState) => {
		setEditor(nextEditor);
		setConfirmation(null);
		setErrorMessage(null);

		if (nextEditor.mode === "edit-group" && nextEditor.group) {
			setName(nextEditor.group.displayName);
			setBudgetMode(nextEditor.group.budgetMode);
			setIcon(DEFAULT_ICON);
			setColor(DEFAULT_COLOR);
			return;
		}

		if (nextEditor.mode === "create-group") {
			setName("");
			setBudgetMode("category");
			setIcon(DEFAULT_ICON);
			setColor(DEFAULT_COLOR);
			return;
		}

		const parentName =
			(nextEditor.category
				? categoryPreferences[nextEditor.category.id]?.parentName
				: undefined
			)?.trim() ||
			nextEditor.category?.parent_name?.trim() ||
			nextEditor.parentName?.trim() ||
			groups[0]?.name ||
			"Income";

		setName(nextEditor.category?.name ?? "");
		setIcon(nextEditor.category?.icon_name ?? DEFAULT_ICON);
		setColor(
			nextEditor.category?.color_key ??
				groups.find((group) => group.name === parentName)?.record?.color_key ??
				getCategoryTheme(parentName).colorKey ??
				DEFAULT_COLOR,
		);
		setSelectedParentName(parentName);
		setExcludeFromBudget(
			nextEditor.category
				? categoryPreferences[nextEditor.category.id]?.excludedFromBudget ===
						true
				: false,
		);
		setBudgetMode("category");
	};

	const closeEditor = () => {
		if (isSaving) {
			return;
		}

		setEditor(null);
		setConfirmation(null);
		setErrorMessage(null);
	};

	const validateGroupName = (
		cleanName: string,
		currentGroupKey?: string,
	): boolean => {
		const duplicate = groups.some((group) => {
			return (
				group.key !== currentGroupKey &&
				normalize(group.displayName) === normalize(cleanName)
			);
		});

		if (duplicate) {
			setErrorMessage("A group with this name already exists.");
			return false;
		}

		return true;
	};

	const handleSave = async () => {
		if (!editor || isSaving) {
			return;
		}

		const cleanName = name.trim();

		if (!cleanName) {
			setErrorMessage(
				editor.mode === "create-group" || editor.mode === "edit-group"
					? "Enter a group name."
					: "Enter a category name.",
			);
			return;
		}

		setIsSaving(true);
		setErrorMessage(null);

		try {
			if (editor.mode === "create-group") {
				if (!editor.sectionId) {
					throw new Error("Choose a category section.");
				}

				const sectionId = editor.sectionId;

				if (!validateGroupName(cleanName)) {
					return;
				}

				const createdGroup = await addCustomCategory({
					name: cleanName,
					icon: DEFAULT_ICON,
					color: DEFAULT_COLOR,
				});
				const groupKey = getCategoryGroupPreferenceKey(
					createdGroup.name,
					createdGroup.id,
					createdGroup.is_system,
				);

				await updateGroupPreference(groupKey, () => ({
					name: cleanName,
					budgetMode,
					sectionId,
					order: groupsBySection[sectionId].length,
				}));
			} else if (editor.mode === "edit-group" && editor.group) {
				const isSystemGroup =
					!editor.group.record || editor.group.record.is_system;

				if (!isSystemGroup && !validateGroupName(cleanName, editor.group.key)) {
					return;
				}

				await updateGroupPreference(editor.group.key, (current) => ({
					...current,
					...(isSystemGroup ? {} : { name: cleanName }),
					budgetMode,
					sectionId: editor.group?.sectionId,
				}));
			} else if (editor.mode === "edit-category" && editor.category) {
				if (!editor.category.is_system) {
					await updateCustomCategory(editor.category.id, {
						name: cleanName,
						icon: icon.trim() || DEFAULT_ICON,
						color: color.trim() || DEFAULT_COLOR,
					});
				}

				await updateCategoryPreference(editor.category.id, (current) => ({
					...current,
					excludedFromBudget: excludeFromBudget,
				}));
			} else if (editor.mode === "create-category") {
				const createdCategory = await addCustomCategory({
					name: cleanName,
					parent: selectedParentName,
					icon: icon.trim() || DEFAULT_ICON,
					color: color.trim() || DEFAULT_COLOR,
				});
				const selectedGroup = groups.find((group) => {
					return group.name === selectedParentName;
				});

				await updateCategoryPreference(createdCategory.id, () => ({
					excludedFromBudget: excludeFromBudget,
					parentName: selectedParentName,
					order: selectedGroup?.children.length ?? 0,
				}));
			}

			setEditor(null);
		} catch (error) {
			setErrorMessage(
				error instanceof Error ? error.message : "Failed to save changes.",
			);
		} finally {
			setIsSaving(false);
		}
	};

	const handleActivateCategory = async (): Promise<void> => {
		if (
			!editor ||
			editor.mode !== "edit-category" ||
			!editor.category?.is_system ||
			isSaving
		) {
			return;
		}

		setIsSaving(true);
		setErrorMessage(null);

		try {
			await updateCategoryPreference(editor.category.id, (current) => ({
				...current,
				hidden: false,
			}));
			setEditor(null);
		} catch (error) {
			setErrorMessage(
				error instanceof Error ? error.message : "Failed to activate category.",
			);
		} finally {
			setIsSaving(false);
		}
	};

	const handleActivateGroup = async (): Promise<void> => {
		if (
			!editor ||
			editor.mode !== "edit-group" ||
			!editor.group ||
			(editor.group.record && !editor.group.record.is_system) ||
			isSaving
		) {
			return;
		}

		setIsSaving(true);
		setErrorMessage(null);

		try {
			await updateGroupPreference(editor.group.key, (current) => ({
				...current,
				sectionId: editor.group?.sectionId,
				hidden: false,
			}));
			setEditor(null);
		} catch (error) {
			setErrorMessage(
				error instanceof Error ? error.message : "Failed to activate group.",
			);
		} finally {
			setIsSaving(false);
		}
	};

	const requestDelete = () => {
		if (!editor || isSaving) {
			return;
		}

		if (editor.mode === "edit-group" && editor.group) {
			const isBuiltIn = !editor.group.record || editor.group.record.is_system;

			setConfirmation({
				title: isBuiltIn
					? `Disable ${editor.group.displayName}?`
					: `Delete ${editor.group.displayName}?`,
				description: isBuiltIn
					? "This built-in group and its categories will be hidden from category settings and category selectors. Existing transactions will keep their current category values."
					: "This permanently deletes the group and all custom categories currently inside it. This action cannot be undone.",
				confirmLabel: isBuiltIn ? "Disable group" : "Delete group",
				variant: isBuiltIn ? "warning" : "danger",
				icon: isBuiltIn ? "disable" : "delete",
			});
			return;
		}

		if (editor.mode === "edit-category" && editor.category) {
			const isBuiltIn = editor.category.is_system;

			setConfirmation({
				title: isBuiltIn
					? `Disable ${editor.category.name}?`
					: `Delete ${editor.category.name}?`,
				description: isBuiltIn
					? "This built-in category will be hidden from category settings and category selectors. Existing transactions will keep their current category value."
					: "This permanently deletes the custom category. Existing transactions may need to be recategorized. This action cannot be undone.",
				confirmLabel: isBuiltIn ? "Disable category" : "Delete category",
				variant: isBuiltIn ? "warning" : "danger",
				icon: isBuiltIn ? "disable" : "delete",
			});
		}
	};

	const handleDelete = async () => {
		if (!editor || isSaving) {
			return;
		}

		setConfirmation(null);
		setIsSaving(true);
		setErrorMessage(null);

		try {
			if (editor.mode === "edit-group" && editor.group) {
				const customChildren = editor.group.children.filter((category) => {
					return !category.is_system;
				});
				const systemChildren = editor.group.children.filter((category) => {
					return category.is_system;
				});

				if (editor.group.record && !editor.group.record.is_system) {
					if (systemChildren.length > 0) {
						throw new Error(
							"This group contains built-in categories and cannot be deleted.",
						);
					}

					for (const category of customChildren) {
						await deleteCustomCategory(category.id);
						await removeCategoryPreference(category.id);
					}

					await deleteCustomCategory(editor.group.record.id);
					await removeGroupPreference(editor.group.key);
				} else {
					await updateGroupPreference(editor.group.key, (current) => ({
						...current,
						sectionId: editor.group?.sectionId,
						hidden: true,
					}));
				}
			} else if (editor.mode === "edit-category" && editor.category) {
				if (editor.category.is_system) {
					await updateCategoryPreference(editor.category.id, (current) => ({
						...current,
						hidden: true,
					}));
				} else {
					await deleteCustomCategory(editor.category.id);
					await removeCategoryPreference(editor.category.id);
				}
			}

			setEditor(null);
		} catch (error) {
			setErrorMessage(
				error instanceof Error ? error.message : "Failed to delete item.",
			);
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<SettingsContentCard title="Categories">
			<div className="min-w-0 p-4 sm:p-5 lg:p-6">
				<div className="mb-7 flex min-w-0 items-start gap-3 rounded-xl bg-cyan-50 px-4 py-3 text-sm leading-6 text-cyan-800 dark:bg-cyan-500/10 dark:text-cyan-300">
					<Info size={18} className="mt-0.5 shrink-0" />
					<p className="min-w-0 break-words">
						Changes you make to your groups and categories here are applied
						throughout the app. Customize the structure to match how you budget.
					</p>
				</div>

				<DragDropProvider
					onDragStart={(event) => {
						const source = event.operation.source;

						if (source?.type !== "group" && source?.type !== "category") {
							return;
						}

						activeDragTypeRef.current = source.type;
						groupSnapshotRef.current = groupOrderRef.current;
						categorySnapshotRef.current = categoryOrderRef.current;
						setErrorMessage(null);
					}}
					onDragEnd={(event) => {
						const source = event.operation.source;
						const dragType = activeDragTypeRef.current;
						activeDragTypeRef.current = null;

						if (!source || !dragType) {
							return;
						}

						const initialGroup = getSortableGroup(source);
						const currentGroup = getCurrentSortableGroup(source);

						if (!initialGroup) {
							return;
						}

						const restoreSnapshots = (): void => {
							groupOrderRef.current = groupSnapshotRef.current;
							categoryOrderRef.current = categorySnapshotRef.current;
							setGroupOrder(groupSnapshotRef.current);
							setCategoryOrder(categorySnapshotRef.current);
						};

						if (
							event.canceled ||
							(currentGroup !== null && initialGroup !== currentGroup)
						) {
							restoreSnapshots();
							return;
						}

						if (dragType === "group") {
							const sectionId = initialGroup;

							if (
								typeof sectionId !== "string" ||
								!CATEGORY_SECTIONS.some((section) => section.id === sectionId)
							) {
								restoreSnapshots();
								return;
							}

							const typedSectionId = sectionId as CategorySectionId;
							const currentIds = groupOrderRef.current[typedSectionId];
							const nextIds = move(currentIds, event);

							if (arraysEqual(currentIds, nextIds)) {
								return;
							}

							const nextGroupOrder = {
								...groupOrderRef.current,
								[typedSectionId]: nextIds,
							};
							groupOrderRef.current = nextGroupOrder;
							setGroupOrder(nextGroupOrder);
							setIsReordering(true);

							void saveGroupOrder(
								typedSectionId,
								nextIds.map(getGroupKeyFromDragId),
							)
								.catch((error: unknown) => {
									restoreSnapshots();
									reportPreferenceError(error);
								})
								.finally(() => setIsReordering(false));
							return;
						}

						const groupKey = initialGroup;

						if (typeof groupKey !== "string") {
							restoreSnapshots();
							return;
						}

						const currentIds = categoryOrderRef.current[groupKey] ?? [];
						const nextIds = move(currentIds, event);

						if (arraysEqual(currentIds, nextIds)) {
							return;
						}

						const previousOrder = categorySnapshotRef.current;
						const nextOrder = {
							...categoryOrderRef.current,
							[groupKey]: nextIds,
						};
						categoryOrderRef.current = nextOrder;
						setCategoryOrder(nextOrder);
						setIsReordering(true);

						void persistCategoryOrder(nextOrder, [groupKey])
							.catch((error: unknown) => {
								categoryOrderRef.current = previousOrder;
								setCategoryOrder(previousOrder);
								reportPreferenceError(error);
							})
							.finally(() => setIsReordering(false));
					}}
				>
					<div className="space-y-9">
						{CATEGORY_SECTIONS.map((section) => {
							const sectionGroups = displayGroupsBySection[section.id];

							return (
								<section key={section.id}>
									<div className="mb-4 flex min-w-0 flex-wrap items-center justify-between gap-3">
										<h2 className="text-xl font-semibold tracking-[-0.01em]">
											{section.title}
										</h2>

										<button
											type="button"
											onClick={() => {
												openEditor({
													mode: "create-group",
													sectionId: section.id,
												});
											}}
											className="text-sm font-semibold text-cyan-600 transition hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300"
										>
											Create group
										</button>
									</div>

									<div className="space-y-4">
										{sectionGroups.map((group, index) => (
											<SortableCategoryGroup
												key={group.key}
												group={group}
												index={index}
												dragDisabled={isReordering}
												categoryPreferences={categoryPreferences}
												onEditGroup={() => {
													openEditor({ mode: "edit-group", group });
												}}
												onCreateCategory={() => {
													openEditor({
														mode: "create-category",
														parentName: group.name,
													});
												}}
												onEditCategory={(category) => {
													openEditor({
														mode: "edit-category",
														category,
													});
												}}
											/>
										))}

										{sectionGroups.length === 0 && (
											<div className="rounded-2xl border border-dashed border-black/10 px-5 py-8 text-center text-sm text-[#777671] dark:border-white/10 dark:text-[#aaa9a4]">
												No groups in {section.title.toLowerCase()} yet.
											</div>
										)}
									</div>
								</section>
							);
						})}
					</div>
				</DragDropProvider>
			</div>

			{editor &&
				(editor.mode === "create-group" || editor.mode === "edit-group" ? (
					<GroupEditorModal
						mode={editor.mode}
						isSystemGroup={
							Boolean(editor.group) &&
							(!editor.group?.record || editor.group.record.is_system)
						}
						isDisabled={editor.group?.hidden === true}
						name={name}
						budgetMode={budgetMode}
						initialName={editor.group?.displayName ?? ""}
						initialBudgetMode={editor.group?.budgetMode ?? "category"}
						isSaving={isSaving}
						errorMessage={errorMessage}
						onNameChange={setName}
						onBudgetModeChange={setBudgetMode}
						onClose={closeEditor}
						onDelete={requestDelete}
						onActivate={() => void handleActivateGroup()}
						onSave={() => void handleSave()}
					/>
				) : (
					<CategoryEditorModal
						editor={editor}
						groups={groups}
						name={name}
						icon={icon}
						selectedParentName={selectedParentName}
						excludeFromBudget={excludeFromBudget}
						initialExcludeFromBudget={
							editor.category
								? categoryPreferences[editor.category.id]
										?.excludedFromBudget === true
								: false
						}
						isDisabled={
							editor.category
								? categoryPreferences[editor.category.id]?.hidden === true
								: false
						}
						isSaving={isSaving}
						errorMessage={errorMessage}
						onNameChange={setName}
						onIconChange={setIcon}
						onParentChange={(parentName) => {
							setSelectedParentName(parentName);

							const selectedGroup = groups.find((group) => {
								return group.name === parentName;
							});

							setColor(
								selectedGroup?.record?.color_key ??
									getCategoryTheme(parentName).colorKey ??
									DEFAULT_COLOR,
							);
						}}
						onExcludeFromBudgetChange={setExcludeFromBudget}
						onClose={closeEditor}
						onDelete={requestDelete}
						onActivate={() => void handleActivateCategory()}
						onSave={() => void handleSave()}
					/>
				))}

			{confirmation && (
				<ConfirmDialog
					title={confirmation.title}
					description={confirmation.description}
					confirmLabel={confirmation.confirmLabel}
					confirmVariant={confirmation.variant}
					icon={
						confirmation.icon === "disable" ? (
							<EyeOff size={21} />
						) : (
							<Trash2 size={21} />
						)
					}
					isLoading={isSaving}
					onCancel={() => {
						if (!isSaving) {
							setConfirmation(null);
						}
					}}
					onConfirm={handleDelete}
				/>
			)}
		</SettingsContentCard>
	);
}

interface SortableCategoryGroupProps {
	group: CategoryGroup;
	index: number;
	dragDisabled: boolean;
	categoryPreferences: Record<string, CategoryPreference>;
	onEditGroup: () => void;
	onCreateCategory: () => void;
	onEditCategory: (category: CustomCategory) => void;
}

function SortableCategoryGroup({
	group,
	index,
	dragDisabled,
	categoryPreferences,
	onEditGroup,
	onCreateCategory,
	onEditCategory,
}: SortableCategoryGroupProps) {
	const [element, setElement] = useState<Element | null>(null);
	const handleRef = useRef<HTMLButtonElement | null>(null);
	const { isDragging, isDropTarget } = useSortable({
		id: getGroupDragId(group.key),
		index,
		group: group.sectionId,
		element,
		handle: handleRef,
		type: "group",
		accept: (source) => {
			return (
				source.type === "group" && getSortableGroup(source) === group.sectionId
			);
		},
		disabled: dragDisabled,
	});
	const theme = getCategoryTheme(group.name);

	const openGroupEditor = (): void => {
		if (!isDragging) {
			onEditGroup();
		}
	};

	return (
		<div
			ref={setElement}
			data-shadow={isDragging || undefined}
			className={`min-w-0 overflow-hidden rounded-2xl transition-[box-shadow,background-color,color] ${
				group.hidden
					? "bg-[#eeeeeb] text-[#9b9a96] dark:bg-[#121210] dark:text-[#777671]"
					: "bg-[#f4f4f2] dark:bg-[#151513]"
			} ${
				isDragging
					? "relative z-20 shadow-[0_18px_50px_rgba(0,0,0,0.2)] ring-2 ring-cyan-500/20"
					: isDropTarget
						? "ring-2 ring-cyan-500/70"
						: ""
			}`}
		>
			<div
				role="button"
				tabIndex={0}
				aria-label={`Edit ${group.displayName} group`}
				onClick={openGroupEditor}
				onKeyDown={(event) => {
					if (event.target !== event.currentTarget) {
						return;
					}

					if (event.key === "Enter" || event.key === " ") {
						event.preventDefault();
						openGroupEditor();
					}
				}}
				className={`flex min-h-13 w-full min-w-0 items-center gap-2 border-b px-4 py-3 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-500/40 sm:gap-3 sm:px-5 ${
					group.hidden
						? "border-black/[0.04] bg-[#eeeeeb] text-[#9b9a96] hover:bg-[#e8e8e4] dark:border-white/[0.05] dark:bg-[#121210] dark:text-[#777671] dark:hover:bg-[#171715]"
						: "border-black/5 bg-transparent hover:bg-black/[0.025] dark:border-white/10 dark:bg-[#151513] dark:hover:bg-white/[0.035]"
				}`}
			>
				<button
					ref={handleRef}
					type="button"
					disabled={dragDisabled}
					onClick={(event) => event.stopPropagation()}
					className="grid size-8 shrink-0 cursor-grab touch-none place-items-center rounded-lg text-[#969691] outline-none transition hover:bg-black/[0.05] focus-visible:ring-2 focus-visible:ring-cyan-500/30 active:cursor-grabbing disabled:cursor-default disabled:opacity-50 dark:text-[#777671] dark:hover:bg-white/10"
					aria-label={`Move ${group.displayName} group`}
				>
					<GripVertical size={17} />
				</button>
				<CategoryGlyph
					name={group.record?.icon_name || group.name}
					size={18}
					colorClass={theme.text}
				/>
				<span className="min-w-0 flex-1 truncate font-semibold">
					{group.displayName}
				</span>
				{group.hidden && (
					<EyeOff
						size={18}
						className="shrink-0 text-[#aaa9a4] dark:text-[#777671]"
						aria-hidden="true"
					/>
				)}
				<button
					type="button"
					onClick={(event) => {
						event.stopPropagation();
						onEditGroup();
					}}
					className="relative z-10 shrink-0 rounded-lg px-2 py-1 text-sm text-[#73736f] transition hover:bg-black/[0.05] hover:text-[#222220] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40 dark:text-[#aaa9a4] dark:hover:bg-white/10 dark:hover:text-white"
				>
					Edit
				</button>
			</div>

			<div
				className={`min-w-0 p-3 sm:p-4 ${
					group.hidden
						? "bg-[#eeeeeb] dark:bg-[#121210]"
						: "bg-transparent dark:bg-[#151513]"
				}`}
			>
				{group.children.length === 0 ? (
					<div className="flex min-h-[190px] min-w-0 flex-col items-center justify-center rounded-xl border border-dashed border-black/[0.06] bg-white/45 px-4 py-8 text-center sm:min-h-[230px] sm:px-6 sm:py-10 dark:border-white/10 dark:bg-[#1d1d1b]">
						<h3 className="text-lg font-semibold text-[#2f2f2c] dark:text-white">
							No categories in this group
						</h3>
						<p className="mt-3 max-w-full text-sm leading-6 text-[#85837f] sm:text-base dark:text-[#aaa9a4]">
							Create a category to add it to this group
						</p>
						<button
							type="button"
							onClick={onCreateCategory}
							className="mt-8 rounded-xl bg-[#ff5a35] px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-[#e94c28]"
						>
							Create category
						</button>
					</div>
				) : (
					<div className="space-y-2">
						{group.children.map((category, categoryIndex) => (
							<SortableCategoryRow
								key={category.id}
								category={category}
								index={categoryIndex}
								group={group}
								dragDisabled={dragDisabled}
								excludedFromBudget={
									categoryPreferences[category.id]?.excludedFromBudget === true
								}
								isDisabled={categoryPreferences[category.id]?.hidden === true}
								onEdit={() => onEditCategory(category)}
							/>
						))}

						<button
							type="button"
							onClick={onCreateCategory}
							className="flex min-h-10 w-full items-center gap-2 rounded-lg px-1 text-left text-sm font-medium text-[#777671] hover:text-cyan-700 dark:text-[#aaa9a4] dark:hover:text-cyan-300"
						>
							<Plus size={15} />
							Create Category
						</button>
					</div>
				)}
			</div>
		</div>
	);
}

interface SortableCategoryRowProps {
	category: CustomCategory;
	index: number;
	group: CategoryGroup;
	dragDisabled: boolean;
	excludedFromBudget: boolean;
	isDisabled: boolean;
	onEdit: () => void;
}

function SortableCategoryRow({
	category,
	index,
	group,
	dragDisabled,
	excludedFromBudget,
	isDisabled,
	onEdit,
}: SortableCategoryRowProps) {
	const [element, setElement] = useState<Element | null>(null);
	const handleRef = useRef<HTMLButtonElement | null>(null);
	const { isDragging, isDropTarget } = useSortable({
		id: getCategoryDragId(category.id),
		index,
		group: group.key,
		element,
		handle: handleRef,
		type: "category",
		accept: (source) => {
			return (
				source.type === "category" && getSortableGroup(source) === group.key
			);
		},
		disabled: dragDisabled,
	});
	const theme = getCategoryTheme(group.name);

	const openCategoryEditor = (): void => {
		if (!isDragging) {
			onEdit();
		}
	};

	return (
		<div
			ref={setElement}
			role="button"
			tabIndex={0}
			aria-label={`Edit ${category.name}`}
			data-shadow={isDragging || undefined}
			onClick={openCategoryEditor}
			onKeyDown={(event) => {
				if (event.target !== event.currentTarget) {
					return;
				}

				if (event.key === "Enter" || event.key === " ") {
					event.preventDefault();
					openCategoryEditor();
				}
			}}
			className={`flex min-h-12 w-full min-w-0 items-center gap-2 rounded-xl border px-3 text-left shadow-sm outline-none transition-[border-color,box-shadow,background-color,color] sm:gap-3 ${
				isDragging
					? "relative z-20 border-cyan-500 shadow-[0_14px_36px_rgba(0,0,0,0.18)] ring-2 ring-cyan-500/15"
					: isDropTarget
						? "border-cyan-500 ring-2 ring-cyan-500/20"
						: isDisabled
							? "border-black/[0.03] bg-white/55 text-[#9b9a96] hover:border-black/10 hover:bg-white/75 focus-visible:ring-2 focus-visible:ring-cyan-500/40 dark:border-white/[0.04] dark:bg-[#1b1b19] dark:text-[#777671] dark:hover:bg-[#1e1e1c]"
							: "border-black/[0.03] bg-white hover:border-black/10 hover:bg-[#fbfbfa] focus-visible:ring-2 focus-visible:ring-cyan-500/40 dark:border-white/[0.04] dark:bg-[#222220] dark:hover:bg-[#282826]"
			}`}
		>
			<button
				ref={handleRef}
				type="button"
				disabled={dragDisabled}
				onClick={(event) => event.stopPropagation()}
				className="grid size-7 shrink-0 cursor-grab touch-none place-items-center rounded-md text-[#969691] outline-none transition hover:bg-black/[0.05] focus-visible:ring-2 focus-visible:ring-cyan-500/30 active:cursor-grabbing disabled:cursor-default disabled:opacity-50 dark:text-[#777671] dark:hover:bg-white/10"
				aria-label={`Move ${category.name}`}
			>
				<GripVertical size={16} />
			</button>
			<CategoryGlyph
				name={category.icon_name || category.name}
				size={17}
				colorClass={isDisabled ? "text-[#aaa9a4]" : theme.text}
			/>
			<span
				className={`min-w-0 flex-1 truncate text-[15px] ${
					isDisabled ? "text-[#9b9a96] dark:text-[#777671]" : ""
				}`}
			>
				{category.name}
			</span>

			{!category.is_system && (
				<span className="hidden text-xs font-medium text-[#6e6e69] sm:inline dark:text-[#aaa9a4]">
					Custom
				</span>
			)}
			{excludedFromBudget && !isDisabled && (
				<span className="hidden rounded-md bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-800 md:inline dark:bg-amber-500/15 dark:text-amber-300">
					Excluded
				</span>
			)}
			{isDisabled && (
				<EyeOff
					size={18}
					className="shrink-0 text-[#aaa9a4] dark:text-[#777671]"
					aria-hidden="true"
				/>
			)}
		</div>
	);
}

function GroupEditorModal({
	mode,
	isSystemGroup,
	isDisabled,
	name,
	budgetMode,
	initialName,
	initialBudgetMode,
	isSaving,
	errorMessage,
	onNameChange,
	onBudgetModeChange,
	onClose,
	onDelete,
	onActivate,
	onSave,
}: {
	mode: "create-group" | "edit-group";
	isSystemGroup: boolean;
	isDisabled: boolean;
	name: string;
	budgetMode: GroupBudgetMode;
	initialName: string;
	initialBudgetMode: GroupBudgetMode;
	isSaving: boolean;
	errorMessage: string | null;
	onNameChange: (value: string) => void;
	onBudgetModeChange: (value: GroupBudgetMode) => void;
	onClose: () => void;
	onDelete: () => void;
	onActivate: () => void;
	onSave: () => void;
}) {
	const isCreate = mode === "create-group";
	const hasChanges =
		isCreate ||
		(!isSystemGroup && name.trim() !== initialName.trim()) ||
		budgetMode !== initialBudgetMode;
	const canSave =
		Boolean(name.trim()) && hasChanges && !isSaving && !isDisabled;

	return (
		<div className="fixed inset-0 z-[300] grid place-items-center overflow-y-auto bg-black/45 p-2 backdrop-blur-[1px] sm:p-4">
			<button
				type="button"
				aria-label="Close group editor"
				className="absolute inset-0"
				onClick={onClose}
			/>

			<section className="relative my-auto flex max-h-[calc(100dvh-16px)] w-full max-w-[892px] min-w-0 flex-col overflow-hidden rounded-[16px] border border-black/10 bg-white text-[#282826] shadow-[0_28px_90px_rgba(0,0,0,0.28)] sm:max-h-[calc(100dvh-32px)] sm:rounded-[20px] dark:border-white/10 dark:bg-[#242422] dark:text-white">
				<header className="flex shrink-0 items-center justify-between gap-4 border-b border-black/[0.06] px-4 py-4 sm:px-6 sm:py-5 lg:px-10 lg:py-6 dark:border-white/10">
					<h2 className="min-w-0 truncate text-xl font-semibold tracking-[-0.02em] sm:text-2xl lg:text-[29px]">
						{isCreate ? "Create Group" : "Edit Group"}
					</h2>
					<button
						type="button"
						onClick={onClose}
						disabled={isSaving}
						className="grid size-9 shrink-0 place-items-center rounded-full transition hover:bg-black/[0.05] disabled:opacity-50 sm:size-11 dark:hover:bg-white/10"
						aria-label="Close"
					>
						<X size={31} strokeWidth={1.8} />
					</button>
				</header>

				<div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:space-y-7 sm:px-6 sm:py-7 lg:space-y-8 lg:px-10 lg:py-10">
					<label className="block">
						<span className="mb-2.5 block text-base font-semibold sm:mb-3 sm:text-lg lg:mb-4 lg:text-[23px]">
							Name
						</span>
						<input
							autoFocus={!isSystemGroup}
							disabled={isSystemGroup}
							value={name}
							onChange={(event) => onNameChange(event.target.value)}
							className="h-13 w-full min-w-0 rounded-[13px] border border-[#d8d6d2] bg-white px-4 text-lg outline-none transition focus:border-[#008eae] focus:ring-2 focus:ring-[#008eae]/15 disabled:cursor-not-allowed disabled:bg-[#f5f4f2] disabled:text-[#777671] sm:h-14 sm:rounded-[15px] sm:text-xl lg:h-[66px] lg:px-5 lg:text-[27px] dark:border-white/15 dark:bg-[#20201f] dark:disabled:bg-[#1b1b19] dark:disabled:text-[#8a8984]"
						/>
					</label>

					<div>
						<span className="mb-2.5 block text-base font-semibold sm:mb-3 sm:text-lg lg:mb-4 lg:text-[23px]">
							Budget
						</span>
						<BudgetModeSelect
							value={budgetMode}
							onChange={onBudgetModeChange}
						/>
						<p className="mt-3 text-sm leading-6 text-[#7d7b77] sm:text-base lg:mt-4 lg:text-[23px] lg:leading-8 dark:text-[#aaa9a4]">
							{budgetMode === "group"
								? "Budget with a single number for all categories within this group."
								: "Budget by individual categories within this group."}
						</p>
					</div>

					{errorMessage && (
						<div className="flex items-start gap-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
							<AlertCircle size={18} className="mt-0.5 shrink-0" />
							<span>{errorMessage}</span>
						</div>
					)}
				</div>

				<footer className="flex shrink-0 flex-col-reverse items-stretch gap-3 border-t border-black/[0.06] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-10 lg:py-5 dark:border-white/10">
					{!isCreate ? (
						<div className="flex w-full min-w-0 items-center gap-2 sm:w-auto sm:gap-4">
							<button
								type="button"
								onClick={isSystemGroup && isDisabled ? onActivate : onDelete}
								disabled={isSaving}
								className={`h-12 flex-1 rounded-[12px] border border-[#dedbd7] bg-white px-4 text-base font-semibold shadow-sm transition disabled:opacity-50 sm:flex-none lg:h-[58px] lg:rounded-[13px] lg:px-5 lg:text-[23px] dark:border-white/15 dark:bg-[#242422] ${
									isSystemGroup
										? "text-[#282826] hover:bg-[#f7f6f4] dark:text-white dark:hover:bg-white/5"
										: "text-[#de2529] hover:bg-red-50 dark:hover:bg-red-500/10"
								}`}
							>
								{isSystemGroup
									? isDisabled
										? "Activate"
										: "Disable"
									: "Delete"}
							</button>

							{isSystemGroup && (
								<DisableInfoTooltip
									text={
										isDisabled
											? "Activate restores this built-in group and its categories throughout the app."
											: "Disable keeps this built-in group visible here in a muted state while removing it from category selectors. Existing transactions keep their current category values."
									}
								/>
							)}
						</div>
					) : (
						<span />
					)}

					<div className="flex w-full min-w-0 items-center gap-2 sm:w-auto sm:gap-4 lg:gap-5">
						<button
							type="button"
							onClick={onClose}
							disabled={isSaving}
							className="h-12 flex-1 rounded-[12px] border border-[#dedbd7] bg-white px-4 text-base font-semibold shadow-sm transition hover:bg-[#f7f6f4] disabled:opacity-50 sm:flex-none lg:h-[58px] lg:rounded-[13px] lg:px-6 lg:text-[23px] dark:border-white/15 dark:bg-[#242422] dark:hover:bg-white/5"
						>
							Cancel
						</button>
						<button
							type="button"
							onClick={onSave}
							disabled={!canSave}
							className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-[12px] bg-[#ff5a35] px-4 text-base font-semibold text-white transition hover:bg-[#e94c28] disabled:cursor-not-allowed disabled:bg-[#ffad91] disabled:text-white/95 sm:min-w-24 sm:flex-none lg:h-[58px] lg:rounded-[13px] lg:px-5 lg:text-[23px]"
						>
							{isSaving && <Loader2 size={20} className="animate-spin" />}
							{isCreate ? "Create" : "Save"}
						</button>
					</div>
				</footer>
			</section>
		</div>
	);
}

function BudgetModeSelect({
	value,
	onChange,
}: {
	value: GroupBudgetMode;
	onChange: (value: GroupBudgetMode) => void;
}) {
	const [isOpen, setIsOpen] = useState(false);
	const options: ReadonlyArray<{
		value: GroupBudgetMode;
		label: string;
	}> = [
		{ value: "group", label: "By group" },
		{ value: "category", label: "By category" },
	];
	const selectedLabel =
		options.find((option) => option.value === value)?.label ?? "By category";

	return (
		<div className="relative">
			<button
				type="button"
				aria-haspopup="listbox"
				aria-expanded={isOpen}
				onClick={() => setIsOpen((current) => !current)}
				onKeyDown={(event) => {
					if (event.key === "Escape" && isOpen) {
						event.preventDefault();
						event.stopPropagation();
						setIsOpen(false);
					}
				}}
				className={`flex h-[66px] w-full items-center justify-between rounded-[15px] border bg-white px-5 text-left text-[27px] outline-none transition dark:bg-[#20201f] ${
					isOpen
						? "border-[#008eae] ring-2 ring-[#008eae]/15"
						: "border-[#d8d6d2] dark:border-white/15"
				}`}
			>
				<span>{selectedLabel}</span>
				<ChevronDown
					size={27}
					strokeWidth={1.8}
					className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
				/>
			</button>

			{isOpen && (
				<div
					role="listbox"
					className="absolute left-0 right-0 top-[calc(100%+12px)] z-20 rounded-[20px] border border-[#dfddd9] bg-white p-3 shadow-[0_18px_45px_rgba(0,0,0,0.18)] dark:border-white/15 dark:bg-[#2a2a28]"
				>
					{options.map((option) => {
						const selected = option.value === value;

						return (
							<button
								key={option.value}
								type="button"
								role="option"
								aria-selected={selected}
								onClick={() => {
									onChange(option.value);
									setIsOpen(false);
								}}
								className={`flex min-h-[66px] w-full items-center justify-between rounded-[14px] px-7 text-left text-[27px] transition ${
									selected
										? "bg-[#d4f3f7] text-[#0089a9] dark:bg-cyan-500/15 dark:text-cyan-300"
										: "hover:bg-[#f5f4f2] dark:hover:bg-white/5"
								}`}
							>
								<span>{option.label}</span>
								{selected && <Check size={23} className="sr-only" />}
							</button>
						);
					})}
				</div>
			)}
		</div>
	);
}

function CategoryEditorModal({
	editor,
	groups,
	name,
	icon,
	selectedParentName,
	excludeFromBudget,
	initialExcludeFromBudget,
	isDisabled,
	isSaving,
	errorMessage,
	onNameChange,
	onIconChange,
	onParentChange,
	onExcludeFromBudgetChange,
	onClose,
	onDelete,
	onActivate,
	onSave,
}: {
	editor: EditorState;
	groups: CategoryGroup[];
	name: string;
	icon: string;
	selectedParentName: string;
	excludeFromBudget: boolean;
	initialExcludeFromBudget: boolean;
	isDisabled: boolean;
	isSaving: boolean;
	errorMessage: string | null;
	onNameChange: (value: string) => void;
	onIconChange: (value: string) => void;
	onParentChange: (value: string) => void;
	onExcludeFromBudgetChange: (value: boolean) => void;
	onClose: () => void;
	onDelete: () => void;
	onActivate: () => void;
	onSave: () => void;
}) {
	const isEdit = editor.mode === "edit-category";
	const isSystemCategory = Boolean(isEdit && editor.category?.is_system);
	const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
	const selectedEmoji = getEmojiIcon(icon) ?? "❓";
	const initialIcon = editor.category?.icon_name ?? DEFAULT_ICON;
	const hasChanges =
		!isEdit ||
		name.trim() !== (editor.category?.name ?? "").trim() ||
		icon !== initialIcon ||
		excludeFromBudget !== initialExcludeFromBudget;

	return (
		<div className="fixed inset-0 z-[300] grid place-items-center overflow-y-auto bg-black/45 p-2 backdrop-blur-[1px] sm:p-4">
			<button
				type="button"
				aria-label="Close category editor"
				className="absolute inset-0"
				onClick={onClose}
			/>

			<section className="relative my-auto flex max-h-[calc(100dvh-16px)] w-full max-w-[892px] min-w-0 flex-col overflow-hidden rounded-[16px] border border-black/10 bg-white text-[#282826] shadow-[0_28px_90px_rgba(0,0,0,0.28)] sm:max-h-[calc(100dvh-32px)] sm:rounded-[20px] dark:border-white/10 dark:bg-[#242422] dark:text-white">
				<header className="flex shrink-0 items-center justify-between gap-4 border-b border-black/[0.06] px-4 py-4 sm:px-6 sm:py-5 lg:px-10 lg:py-6 dark:border-white/10">
					<h2 className="min-w-0 truncate text-xl font-semibold tracking-[-0.02em] sm:text-2xl lg:text-[29px]">
						{isEdit ? "Edit Category" : "Create Category"}
					</h2>
					<button
						type="button"
						onClick={onClose}
						disabled={isSaving}
						className="grid size-9 shrink-0 place-items-center rounded-full transition hover:bg-black/[0.05] disabled:opacity-50 sm:size-11 dark:hover:bg-white/10"
						aria-label="Close"
					>
						<X size={31} strokeWidth={1.8} />
					</button>
				</header>

				<div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:space-y-7 sm:px-6 sm:py-7 lg:space-y-8 lg:px-10 lg:py-10">
					<div>
						<span className="mb-2.5 block text-base font-semibold sm:mb-3 sm:text-lg lg:text-[23px]">
							Icon &amp; Name
						</span>
						<div className="relative">
							<div className="flex h-13 min-w-0 overflow-hidden rounded-[13px] border border-[#d8d6d2] bg-white focus-within:border-[#008eae] focus-within:ring-2 focus-within:ring-[#008eae]/15 sm:h-14 sm:rounded-[15px] lg:h-[66px] dark:border-white/15 dark:bg-[#20201f]">
								<button
									type="button"
									disabled={isSystemCategory}
									onClick={() => {
										setIsEmojiPickerOpen((current) => !current);
									}}
									aria-label="Choose category emoji"
									aria-expanded={isEmojiPickerOpen}
									className="grid w-13 shrink-0 place-items-center border-r border-[#d8d6d2] text-2xl transition hover:bg-[#f6f5f3] sm:w-16 sm:text-[28px] lg:w-[72px] lg:text-[31px] dark:border-white/15 dark:hover:bg-white/5"
								>
									{selectedEmoji}
								</button>
								<input
									autoFocus
									disabled={isSystemCategory}
									value={name}
									onChange={(event) => onNameChange(event.target.value)}
									placeholder="New Category"
									className="min-w-0 flex-1 bg-transparent px-3 text-lg outline-none placeholder:text-[#8d8b87] sm:px-4 sm:text-xl lg:px-5 lg:text-[27px]"
								/>
							</div>

							{isEmojiPickerOpen && !isSystemCategory && (
								<CategoryEmojiPicker
									selectedEmoji={selectedEmoji}
									onSelect={(emoji) => {
										onIconChange(encodeEmojiIcon(emoji));
										setIsEmojiPickerOpen(false);
									}}
									onClose={() => {
										setIsEmojiPickerOpen(false);
									}}
								/>
							)}
						</div>

						{isSystemCategory && (
							<p className="mt-3 text-sm leading-6 text-[#7d7b77] sm:text-base sm:leading-7 lg:text-[20px] lg:leading-8 dark:text-[#aaa9a4]">
								This system category automatically categorizes transactions
								related to {name}.
							</p>
						)}
					</div>

					<div>
						<span className="mb-2.5 block text-base font-semibold sm:mb-3 sm:text-lg lg:text-[23px]">
							Group
						</span>
						<CategoryGroupSelect
							value={selectedParentName}
							groups={groups}
							disabled={isEdit}
							onChange={onParentChange}
						/>
						{isEdit && (
							<p className="mt-3 text-sm text-[#7d7b77] dark:text-[#aaa9a4]">
								Moving an existing category requires the store update action to
								support changing its parent group.
							</p>
						)}
					</div>

					<div className="flex min-w-0 flex-col items-stretch gap-4 rounded-[13px] border border-[#dedbd7] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:rounded-[15px] sm:px-6 sm:py-6 lg:px-7 lg:py-7 dark:border-white/15">
						<div className="min-w-0">
							<h3 className="text-base font-semibold sm:text-lg lg:text-[22px]">
								Exclude this category from the budget
							</h3>
							<p className="mt-2 max-w-[620px] text-sm leading-6 text-[#55534f] sm:text-base sm:leading-7 lg:text-[20px] lg:leading-8 dark:text-[#c2c0bb]">
								This category and any transactions linked to it will be hidden
								from your budget.
							</p>
						</div>

						<button
							type="button"
							role="switch"
							aria-checked={excludeFromBudget}
							onClick={() => {
								onExcludeFromBudgetChange(!excludeFromBudget);
							}}
							className={`relative h-7 w-14 shrink-0 self-start rounded-full transition sm:self-auto ${
								excludeFromBudget
									? "bg-[#008eae]"
									: "bg-[#989793] dark:bg-[#66645f]"
							}`}
						>
							<span
								className={`absolute top-1 size-5 rounded-full bg-white shadow-sm transition-transform ${
									excludeFromBudget ? "translate-x-8" : "translate-x-1"
								}`}
							/>
						</button>
					</div>

					{errorMessage && (
						<div className="flex items-start gap-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
							<AlertCircle size={18} className="mt-0.5 shrink-0" />
							<span>{errorMessage}</span>
						</div>
					)}
				</div>

				<footer className="flex shrink-0 flex-col-reverse items-stretch gap-3 border-t border-black/[0.06] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-10 lg:py-5 dark:border-white/10">
					{isEdit && editor.category ? (
						<div className="flex w-full min-w-0 items-center gap-2 sm:w-auto sm:gap-4">
							<button
								type="button"
								onClick={isSystemCategory && isDisabled ? onActivate : onDelete}
								disabled={isSaving}
								className={`inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-[12px] border border-[#dedbd7] bg-white px-4 text-base font-semibold shadow-sm transition disabled:opacity-50 sm:flex-none lg:h-[58px] lg:rounded-[13px] lg:px-5 lg:text-[23px] dark:border-white/15 dark:bg-[#242422] ${
									isSystemCategory
										? "text-[#282826] hover:bg-[#f7f6f4] dark:text-white dark:hover:bg-white/5"
										: "text-[#de2529] hover:bg-red-50 dark:hover:bg-red-500/10"
								}`}
							>
								{!isSystemCategory && <Trash2 size={20} />}
								{isSystemCategory
									? isDisabled
										? "Activate"
										: "Disable"
									: "Delete"}
							</button>

							{isSystemCategory && (
								<DisableInfoTooltip
									text={
										isDisabled
											? "Activate restores this built-in category to category settings and category selectors."
											: "Disable keeps this built-in category visible here in a deactivated state, while hiding it from category selectors. Existing transactions keep their current category value."
									}
								/>
							)}
						</div>
					) : (
						<span />
					)}

					<div className="flex w-full min-w-0 items-center gap-2 sm:w-auto sm:gap-4 lg:gap-5">
						{isEdit && !isSystemCategory && (
							<button
								type="button"
								onClick={onClose}
								disabled={isSaving}
								className="h-12 flex-1 rounded-[12px] border border-[#dedbd7] bg-white px-4 text-base font-semibold shadow-sm transition hover:bg-[#f7f6f4] disabled:opacity-50 sm:flex-none lg:h-[58px] lg:rounded-[13px] lg:px-6 lg:text-[23px] dark:border-white/15 dark:bg-[#242422] dark:hover:bg-white/5"
							>
								Cancel
							</button>
						)}
						<button
							type="button"
							onClick={onSave}
							disabled={isSaving || !name.trim() || !hasChanges}
							className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-[12px] bg-[#ff5a35] px-4 text-base font-semibold text-white transition hover:bg-[#e94c28] disabled:cursor-not-allowed disabled:bg-[#ffad91] disabled:text-white/95 sm:min-w-24 sm:flex-none lg:h-[58px] lg:rounded-[13px] lg:px-5 lg:text-[23px]"
						>
							{isSaving && <Loader2 size={20} className="animate-spin" />}
							Save
						</button>
					</div>
				</footer>
			</section>
		</div>
	);
}

function CategoryGroupSelect({
	value,
	groups,
	disabled,
	onChange,
}: {
	value: string;
	groups: CategoryGroup[];
	disabled: boolean;
	onChange: (value: string) => void;
}) {
	const triggerRef = useRef<HTMLButtonElement | null>(null);
	const menuRef = useRef<HTMLDivElement | null>(null);
	const [isOpen, setIsOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [menuPosition, setMenuPosition] = useState<{
		top: number;
		left: number;
		width: number;
		maxHeight: number;
	} | null>(null);

	const selectedGroup = groups.find((group) => group.name === value);
	const normalizedSearch = searchQuery.trim().toLowerCase();
	const selectableGroups = groups.filter((group) => !group.hidden);
	const filteredGroups = normalizedSearch
		? selectableGroups.filter((group) => {
				return (
					group.displayName.toLowerCase().includes(normalizedSearch) ||
					group.name.toLowerCase().includes(normalizedSearch)
				);
			})
		: selectableGroups;

	const incomeGroups = filteredGroups.filter((group) => {
		return group.sectionId === "income";
	});
	const expenseGroups = filteredGroups.filter((group) => {
		return group.sectionId === "expenses";
	});
	const transferGroups = filteredGroups.filter((group) => {
		return group.sectionId === "transfers";
	});

	const calculateMenuPosition = useCallback(() => {
		const trigger = triggerRef.current;

		if (!trigger || typeof window === "undefined") {
			return null;
		}

		const bounds = trigger.getBoundingClientRect();
		const viewportPadding = 16;
		const gap = 10;
		const minimumHeight = 220;
		const preferredHeight = 500;
		const spaceBelow =
			window.innerHeight - bounds.bottom - gap - viewportPadding;
		const spaceAbove = bounds.top - gap - viewportPadding;
		const openAbove = spaceBelow < minimumHeight && spaceAbove > spaceBelow;
		const availableHeight = Math.max(
			minimumHeight,
			openAbove ? spaceAbove : spaceBelow,
		);
		const maxHeight = Math.min(preferredHeight, availableHeight);
		const width = Math.min(
			bounds.width,
			window.innerWidth - viewportPadding * 2,
		);
		const left = Math.min(
			Math.max(viewportPadding, bounds.left),
			window.innerWidth - viewportPadding - width,
		);
		const top = openAbove
			? Math.max(viewportPadding, bounds.top - gap - maxHeight)
			: Math.min(
					bounds.bottom + gap,
					window.innerHeight - viewportPadding - maxHeight,
				);

		return { top, left, width, maxHeight };
	}, []);

	const closeMenu = useCallback(() => {
		setIsOpen(false);
		setSearchQuery("");
	}, []);

	const openMenu = useCallback(() => {
		const nextPosition = calculateMenuPosition();

		if (!nextPosition) {
			return;
		}

		setMenuPosition(nextPosition);
		setSearchQuery("");
		setIsOpen(true);
	}, [calculateMenuPosition]);

	useEffect(() => {
		if (!isOpen) {
			return;
		}

		const updatePosition = () => {
			const nextPosition = calculateMenuPosition();

			if (nextPosition) {
				setMenuPosition(nextPosition);
			}
		};

		const handlePointerDown = (event: PointerEvent) => {
			const target = event.target;

			if (!(target instanceof Node)) {
				return;
			}

			if (
				triggerRef.current?.contains(target) ||
				menuRef.current?.contains(target)
			) {
				return;
			}

			closeMenu();
		};

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				event.preventDefault();
				closeMenu();
				triggerRef.current?.focus();
			}
		};

		window.addEventListener("resize", updatePosition);
		window.addEventListener("scroll", updatePosition, true);
		document.addEventListener("pointerdown", handlePointerDown);
		document.addEventListener("keydown", handleKeyDown);

		return () => {
			window.removeEventListener("resize", updatePosition);
			window.removeEventListener("scroll", updatePosition, true);
			document.removeEventListener("pointerdown", handlePointerDown);
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [calculateMenuPosition, closeMenu, isOpen]);

	const selectGroup = (nextValue: string) => {
		onChange(nextValue);
		closeMenu();
		triggerRef.current?.focus();
	};

	return (
		<div className="relative">
			<button
				ref={triggerRef}
				type="button"
				disabled={disabled}
				aria-haspopup="listbox"
				aria-expanded={isOpen}
				onClick={() => {
					if (isOpen) {
						closeMenu();
					} else {
						openMenu();
					}
				}}
				onKeyDown={(event) => {
					if ((event.key === "ArrowDown" || event.key === "Enter") && !isOpen) {
						event.preventDefault();
						openMenu();
					}
				}}
				className={`flex h-[66px] w-full items-center justify-between rounded-[15px] border bg-white px-5 text-left text-[27px] outline-none transition dark:bg-[#20201f] ${
					isOpen
						? "border-[#008eae] ring-2 ring-[#008eae]/15"
						: "border-[#d8d6d2] dark:border-white/15"
				} ${disabled ? "cursor-not-allowed opacity-70" : ""}`}
			>
				<span className="min-w-0 truncate">
					{selectedGroup?.displayName ?? value}
				</span>
				<ChevronDown
					size={27}
					strokeWidth={1.8}
					className={`shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
				/>
			</button>

			{isOpen &&
				!disabled &&
				menuPosition &&
				typeof document !== "undefined" &&
				createPortal(
					<div
						ref={menuRef}
						className="fixed z-[380] flex overflow-hidden rounded-[20px] border border-[#dfddd9] bg-white shadow-[0_24px_70px_rgba(0,0,0,0.24)] dark:border-white/15 dark:bg-[#2a2a28]"
						style={{
							top: menuPosition.top,
							left: menuPosition.left,
							width: menuPosition.width,
							maxHeight: menuPosition.maxHeight,
						}}
					>
						<div className="flex min-h-0 w-full flex-col">
							<div className="shrink-0 border-b border-black/[0.06] p-3 dark:border-white/10">
								<label className="flex h-12 items-center gap-3 rounded-[13px] border border-[#d8d6d2] bg-[#f7f6f4] px-4 focus-within:border-[#008eae] focus-within:ring-2 focus-within:ring-[#008eae]/15 dark:border-white/15 dark:bg-[#20201f]">
									<Search
										size={19}
										className="shrink-0 text-[#777570] dark:text-[#aaa9a4]"
									/>
									<input
										autoFocus
										value={searchQuery}
										onChange={(event) => setSearchQuery(event.target.value)}
										placeholder="Search groups"
										className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-[#8d8b87] dark:text-white"
									/>
								</label>
							</div>

							<div
								role="listbox"
								className="min-h-0 flex-1 overflow-y-auto py-3"
							>
								{filteredGroups.length > 0 ? (
									<>
										<GroupOptionSection
											label="Income"
											groups={incomeGroups}
											value={value}
											onChange={selectGroup}
										/>
										<GroupOptionSection
											label="Expenses"
											groups={expenseGroups}
											value={value}
											onChange={selectGroup}
										/>
										<GroupOptionSection
											label="Transfers"
											groups={transferGroups}
											value={value}
											onChange={selectGroup}
										/>
									</>
								) : (
									<div className="px-5 py-10 text-center text-sm text-[#777570] dark:text-[#aaa9a4]">
										No groups match “{searchQuery.trim()}”.
									</div>
								)}
							</div>
						</div>
					</div>,
					document.body,
				)}
		</div>
	);
}

function GroupOptionSection({
	label,
	groups,
	value,
	onChange,
}: {
	label: string;
	groups: CategoryGroup[];
	value: string;
	onChange: (value: string) => void;
}) {
	if (groups.length === 0) {
		return null;
	}

	return (
		<div className="px-3">
			<div className="px-5 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-[#777570] dark:text-[#aaa9a4] sm:text-base">
				{label}
			</div>
			{groups.map((group) => {
				const selected = group.name === value;

				return (
					<button
						key={group.key}
						type="button"
						role="option"
						aria-selected={selected}
						onClick={() => onChange(group.name)}
						className={`flex min-h-[54px] w-full items-center justify-between rounded-[14px] px-5 text-left text-base transition sm:min-h-[58px] sm:px-6 sm:text-lg lg:text-[22px] ${
							selected
								? "bg-[#f2f1ef] dark:bg-white/10"
								: "hover:bg-[#f7f6f4] dark:hover:bg-white/5"
						}`}
					>
						<span className="min-w-0 truncate">{group.displayName}</span>
						{selected && (
							<Check size={21} className="shrink-0 text-[#008eae]" />
						)}
					</button>
				);
			})}
		</div>
	);
}

function DisableInfoTooltip({ text }: { text: string }) {
	return (
		<div className="group/disable-tooltip relative">
			<button
				type="button"
				aria-label="About disabling this item"
				className="grid size-10 place-items-center rounded-full text-[#777570] transition hover:bg-black/[0.05] hover:text-[#282826] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40 dark:text-[#aaa9a4] dark:hover:bg-white/10 dark:hover:text-white"
			>
				<Info size={21} />
			</button>

			<div
				role="tooltip"
				className="pointer-events-none fixed bottom-20 left-4 right-4 z-[390] rounded-xl bg-[#282826] px-4 py-3 text-center text-sm font-semibold leading-5 text-white opacity-0 shadow-[0_16px_40px_rgba(0,0,0,0.3)] transition-opacity group-hover/disable-tooltip:opacity-100 group-focus-within/disable-tooltip:opacity-100 sm:absolute sm:bottom-[calc(100%+14px)] sm:left-1/2 sm:right-auto sm:w-[360px] sm:max-w-[calc(100vw-32px)] sm:-translate-x-1/2 sm:px-5 sm:py-4 sm:text-[15px] sm:leading-6"
			>
				{text}
				<span className="absolute left-1/2 top-full size-4 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-[#282826]" />
			</div>
		</div>
	);
}
