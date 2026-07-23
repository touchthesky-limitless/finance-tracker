"use client";

import { type DragEvent, useEffect, useMemo, useState } from "react";
import {
	AlertCircle,
	Check,
	ChevronDown,
	GripVertical,
	Info,
	Loader2,
	Pencil,
	Plus,
	Trash2,
	X,
} from "lucide-react";

import { CategoryEmojiPicker } from "@/components/Categories/CategoryEmojiPicker";
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
	readCategoryPreferences,
	readGroupPreferences,
	writeCategoryPreferences,
	writeGroupPreferences,
} from "@/lib/categories/categoryPreferences";

type EditorMode =
	| "create-group"
	| "edit-group"
	| "create-category"
	| "edit-category";

type DragState =
	| {
			type: "group";
			groupKey: string;
			sectionId: CategorySectionId;
	  }
	| {
			type: "category";
			categoryId: string;
	  };

interface CategoryGroup {
	key: string;
	name: string;
	displayName: string;
	budgetMode: GroupBudgetMode;
	sectionId: CategorySectionId;
	order: number | null;
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

interface DeleteConfirmation {
	title: string;
	description: string;
	confirmLabel: string;
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

function moveItem<T>(items: T[], fromIndex: number, toIndex: number): T[] {
	if (
		fromIndex < 0 ||
		toIndex < 0 ||
		fromIndex >= items.length ||
		toIndex >= items.length ||
		fromIndex === toIndex
	) {
		return items;
	}

	const nextItems = [...items];
	const [movedItem] = nextItems.splice(fromIndex, 1);
	nextItems.splice(toIndex, 0, movedItem);
	return nextItems;
}

let activeDragPreview: HTMLElement | null = null;

function removeOpaqueDragPreview(): void {
	activeDragPreview?.remove();
	activeDragPreview = null;
}

function beginOpaqueDragPreview(event: DragEvent<HTMLElement>): void {
	removeOpaqueDragPreview();

	const source = event.currentTarget;
	const bounds = source.getBoundingClientRect();
	const preview = source.cloneNode(true) as HTMLElement;
	const previewWidth = Math.min(bounds.width, 760);

	preview.setAttribute("aria-hidden", "true");
	Object.assign(preview.style, {
		position: "fixed",
		left: "0",
		top: "0",
		width: `${previewWidth}px`,
		maxHeight: "260px",
		overflow: "hidden",
		opacity: "1",
		filter: "none",
		transform: `translate3d(${event.clientX + 14}px, ${event.clientY + 14}px, 0)`,
		pointerEvents: "none",
		zIndex: "9999",
		boxShadow: "0 18px 50px rgba(0, 0, 0, 0.22)",
	});

	document.body.appendChild(preview);
	activeDragPreview = preview;

	const transparentImage = document.createElement("canvas");
	transparentImage.width = 1;
	transparentImage.height = 1;
	transparentImage.style.position = "fixed";
	transparentImage.style.left = "-100px";
	transparentImage.style.top = "-100px";
	document.body.appendChild(transparentImage);
	event.dataTransfer.setDragImage(transparentImage, 0, 0);

	window.requestAnimationFrame(() => {
		transparentImage.remove();
	});
}

function updateOpaqueDragPreview(event: DragEvent<HTMLElement>): void {
	if (!activeDragPreview || event.clientX === 0 || event.clientY === 0) {
		return;
	}

	activeDragPreview.style.transform = `translate3d(${event.clientX + 14}px, ${event.clientY + 14}px, 0)`;
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

	const [groupPreferences, setGroupPreferences] = useState<
		Record<string, GroupPreference>
	>(() => readGroupPreferences());
	const [categoryPreferences, setCategoryPreferences] = useState<
		Record<string, CategoryPreference>
	>(() => readCategoryPreferences());
	const [editor, setEditor] = useState<EditorState | null>(null);
	const [name, setName] = useState("");
	const [icon, setIcon] = useState(DEFAULT_ICON);
	const [color, setColor] = useState(DEFAULT_COLOR);
	const [selectedParentName, setSelectedParentName] = useState("Income");
	const [excludeFromBudget, setExcludeFromBudget] = useState(false);
	const [budgetMode, setBudgetMode] = useState<GroupBudgetMode>("category");
	const [isSaving, setIsSaving] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [dragState, setDragState] = useState<DragState | null>(null);
	const [dragOverKey, setDragOverKey] = useState<string | null>(null);
	const [deleteConfirmation, setDeleteConfirmation] =
		useState<DeleteConfirmation | null>(null);

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

				return {
					key,
					name: parentName,
					displayName: preference?.name?.trim() || parentName,
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
				return (
					!group.hidden && Boolean(group.record || group.children.length > 0)
				);
			})
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			.map(({ hidden: _hidden, ...group }) => group);
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

	const updateGroupPreference = (
		key: string,
		updater: (current: GroupPreference) => GroupPreference,
	) => {
		setGroupPreferences((current) => {
			const nextPreferences = {
				...current,
				[key]: updater(current[key] ?? {}),
			};

			writeGroupPreferences(nextPreferences);
			return nextPreferences;
		});
	};

	const removeGroupPreference = (key: string) => {
		setGroupPreferences((current) => {
			const nextPreferences = { ...current };
			delete nextPreferences[key];
			writeGroupPreferences(nextPreferences);
			return nextPreferences;
		});
	};

	const updateCategoryPreference = (
		categoryId: string,
		updater: (current: CategoryPreference) => CategoryPreference,
	) => {
		setCategoryPreferences((current) => {
			const nextPreferences = {
				...current,
				[categoryId]: updater(current[categoryId] ?? {}),
			};

			writeCategoryPreferences(nextPreferences);
			return nextPreferences;
		});
	};

	const removeCategoryPreference = (categoryId: string) => {
		setCategoryPreferences((current) => {
			const nextPreferences = { ...current };
			delete nextPreferences[categoryId];
			writeCategoryPreferences(nextPreferences);
			return nextPreferences;
		});
	};

	const saveGroupOrder = (
		sectionId: CategorySectionId,
		orderedGroupKeys: string[],
	) => {
		setGroupPreferences((current) => {
			const nextPreferences = { ...current };

			orderedGroupKeys.forEach((groupKey, index) => {
				nextPreferences[groupKey] = {
					...(nextPreferences[groupKey] ?? {}),
					sectionId,
					order: index,
				};
			});

			writeGroupPreferences(nextPreferences);
			return nextPreferences;
		});
	};

	const handleGroupDrop = (
		draggedGroupKey: string,
		targetGroupKey: string,
		sectionId: CategorySectionId,
	) => {
		const sectionGroups = groupsBySection[sectionId];
		const fromIndex = sectionGroups.findIndex((group) => {
			return group.key === draggedGroupKey;
		});
		const toIndex = sectionGroups.findIndex((group) => {
			return group.key === targetGroupKey;
		});

		const nextGroups = moveItem(sectionGroups, fromIndex, toIndex);
		saveGroupOrder(
			sectionId,
			nextGroups.map((group) => group.key),
		);
	};

	const moveCategoryToGroup = (
		categoryId: string,
		targetGroupKey: string,
		targetCategoryId?: string,
	) => {
		const sourceGroup = groups.find((group) => {
			return group.children.some((category) => category.id === categoryId);
		});
		const targetGroup = groups.find((group) => group.key === targetGroupKey);

		if (!sourceGroup || !targetGroup) {
			return;
		}

		const sourceIds = sourceGroup.children
			.map((category) => category.id)
			.filter((id) => id !== categoryId);
		const targetIds =
			sourceGroup.key === targetGroup.key
				? [...sourceIds]
				: targetGroup.children
						.map((category) => category.id)
						.filter((id) => id !== categoryId);

		let insertIndex = targetIds.length;

		if (targetCategoryId) {
			const requestedIndex = targetIds.indexOf(targetCategoryId);
			if (requestedIndex >= 0) {
				insertIndex = requestedIndex;
			}
		}

		targetIds.splice(insertIndex, 0, categoryId);

		setCategoryPreferences((current) => {
			const nextPreferences = { ...current };

			if (sourceGroup.key !== targetGroup.key) {
				sourceIds.forEach((id, index) => {
					nextPreferences[id] = {
						...(nextPreferences[id] ?? {}),
						order: index,
					};
				});
			}

			targetIds.forEach((id, index) => {
				nextPreferences[id] = {
					...(nextPreferences[id] ?? {}),
					parentName: targetGroup.name,
					order: index,
				};
			});

			writeCategoryPreferences(nextPreferences);
			return nextPreferences;
		});
	};

	const clearDragState = () => {
		removeOpaqueDragPreview();
		setDragState(null);
		setDragOverKey(null);
	};

	const openEditor = (nextEditor: EditorState) => {
		setEditor(nextEditor);
		setDeleteConfirmation(null);
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
		setDeleteConfirmation(null);
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
				// 1. Extract the sectionId to a local constant
				const targetSectionId = editor.sectionId;

				// 2. The guard clause now narrows the local constant to a strict CategorySectionId
				if (!targetSectionId) {
					throw new Error("Choose a category section.");
				}

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

				// 3. Use the local constant in your callback!
				// TypeScript now knows this is 100% defined.
				updateGroupPreference(groupKey, () => ({
					name: cleanName,
					budgetMode,
					sectionId: targetSectionId,
					order: groupsBySection[targetSectionId].length,
				}));
			} else if (editor.mode === "edit-group" && editor.group) {
				if (!validateGroupName(cleanName, editor.group.key)) {
					return;
				}

				updateGroupPreference(editor.group.key, (current) => ({
					...current,
					name: cleanName,
					budgetMode,
					sectionId: editor.group?.sectionId,
					hidden: false,
				}));
			} else if (editor.mode === "edit-category" && editor.category) {
				await updateCustomCategory(editor.category.id, {
					name: cleanName,
					icon: icon.trim() || DEFAULT_ICON,
					color: color.trim() || DEFAULT_COLOR,
				});

				updateCategoryPreference(editor.category.id, (current) => ({
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

				updateCategoryPreference(createdCategory.id, () => ({
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

	const requestDelete = () => {
		if (!editor || isSaving) {
			return;
		}

		if (editor.mode === "edit-group" && editor.group) {
			const isBuiltIn = !editor.group.record || editor.group.record.is_system;
			setDeleteConfirmation({
				title: `Delete ${editor.group.displayName}?`,
				description: isBuiltIn
					? "This built-in group will be hidden from your category settings. You can restore it later by clearing the saved category preferences."
					: "This permanently deletes the group and all custom categories currently inside it. This action cannot be undone.",
				confirmLabel: "Delete group",
			});
			return;
		}

		if (editor.mode === "edit-category" && editor.category) {
			setDeleteConfirmation({
				title: `Delete ${editor.category.name}?`,
				description:
					"This permanently deletes the custom category. Existing transactions may need to be recategorized. This action cannot be undone.",
				confirmLabel: "Delete category",
			});
		}
	};

	const handleDelete = async () => {
		if (!editor || isSaving) {
			return;
		}

		setDeleteConfirmation(null);
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
						removeCategoryPreference(category.id);
					}

					await deleteCustomCategory(editor.group.record.id);
					removeGroupPreference(editor.group.key);
				} else {
					updateGroupPreference(editor.group.key, (current) => ({
						...current,
						sectionId: editor.group?.sectionId,
						hidden: true,
					}));
				}
			} else if (
				editor.mode === "edit-category" &&
				editor.category &&
				!editor.category.is_system
			) {
				await deleteCustomCategory(editor.category.id);
				removeCategoryPreference(editor.category.id);
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

				<div className="space-y-9">
					{CATEGORY_SECTIONS.map((section) => {
						const sectionGroups = groupsBySection[section.id];

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
									{sectionGroups.map((group) => {
										const theme = getCategoryTheme(group.name);
										const groupDragKey = `group:${group.key}`;
										const groupBodyDragKey = `group-body:${group.key}`;

										return (
											<div
												key={group.key}
												draggable
												onDragStart={(event) => {
													beginOpaqueDragPreview(event);
													event.dataTransfer.effectAllowed = "move";
													event.dataTransfer.setData("text/plain", group.key);
													setDragState({
														type: "group",
														groupKey: group.key,
														sectionId: section.id,
													});
												}}
												onDrag={updateOpaqueDragPreview}
												onDragEnd={clearDragState}
												onDragOver={(event) => {
													if (
														dragState?.type !== "group" ||
														dragState.sectionId !== section.id
													) {
														return;
													}

													event.preventDefault();
													event.dataTransfer.dropEffect = "move";
													setDragOverKey(groupDragKey);
												}}
												onDrop={(event) => {
													if (
														dragState?.type !== "group" ||
														dragState.sectionId !== section.id
													) {
														return;
													}

													event.preventDefault();
													handleGroupDrop(
														dragState.groupKey,
														group.key,
														section.id,
													);
													clearDragState();
												}}
												className={`min-w-0 overflow-hidden rounded-2xl bg-[#f4f4f2] opacity-100 transition dark:bg-white/[0.04] ${
													dragOverKey === groupDragKey
														? "ring-2 ring-cyan-500/70"
														: ""
												}`}
											>
												<div className="flex min-h-13 min-w-0 flex-wrap items-center gap-2 border-b border-black/5 px-4 py-3 sm:flex-nowrap sm:gap-3 sm:px-5 dark:border-white/10">
													<GripVertical
														size={17}
														className="shrink-0 cursor-grab text-[#969691] active:cursor-grabbing"
													/>
													<CategoryGlyph
														name={group.record?.icon_name || group.name}
														size={18}
														colorClass={theme.text}
													/>
													<span className="min-w-0 flex-1 truncate font-semibold sm:flex-none">
														{group.displayName}
													</span>

													<button
														type="button"
														onClick={() => {
															openEditor({ mode: "edit-group", group });
														}}
														className="text-sm text-[#73736f] hover:text-[#222220] dark:hover:text-white"
													>
														Edit
													</button>
												</div>

												<div
													onDragOver={(event) => {
														if (dragState?.type !== "category") {
															return;
														}

														event.preventDefault();
														event.stopPropagation();
														event.dataTransfer.dropEffect = "move";
														setDragOverKey(groupBodyDragKey);
													}}
													onDrop={(event) => {
														if (dragState?.type !== "category") {
															return;
														}

														event.preventDefault();
														event.stopPropagation();
														moveCategoryToGroup(
															dragState.categoryId,
															group.key,
														);
														clearDragState();
													}}
													className={`min-w-0 p-3 transition sm:p-4 ${
														dragOverKey === groupBodyDragKey
															? "bg-cyan-500/[0.08]"
															: ""
													}`}
												>
													{group.children.length === 0 ? (
														<div className="flex min-h-[190px] min-w-0 flex-col items-center justify-center rounded-xl border border-dashed border-black/[0.06] bg-white/45 px-4 py-8 text-center sm:min-h-[230px] sm:px-6 sm:py-10 dark:border-white/10 dark:bg-black/10">
															<h3 className="text-lg font-semibold text-[#2f2f2c] dark:text-white">
																No categories in this group
															</h3>
															<p className="mt-3 max-w-full text-sm leading-6 text-[#85837f] sm:text-base dark:text-[#aaa9a4]">
																Drag categories into this group or create new
																ones
															</p>
															<button
																type="button"
																onClick={() => {
																	openEditor({
																		mode: "create-category",
																		parentName: group.name,
																	});
																}}
																className="mt-8 rounded-xl bg-[#ff5a35] px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-[#e94c28]"
															>
																Create category
															</button>
														</div>
													) : (
														<div className="space-y-2">
															{group.children.map((category) => {
																const categoryDragKey = `category:${category.id}`;

																return (
																	<div
																		key={category.id}
																		draggable
																		onDragStart={(event) => {
																			event.stopPropagation();
																			beginOpaqueDragPreview(event);
																			event.dataTransfer.effectAllowed = "move";
																			event.dataTransfer.setData(
																				"text/plain",
																				category.id,
																			);
																			setDragState({
																				type: "category",
																				categoryId: category.id,
																			});
																		}}
																		onDrag={updateOpaqueDragPreview}
																		onDragEnd={clearDragState}
																		onDragOver={(event) => {
																			if (dragState?.type !== "category") {
																				return;
																			}

																			event.preventDefault();
																			event.stopPropagation();
																			setDragOverKey(categoryDragKey);
																		}}
																		onDrop={(event) => {
																			if (dragState?.type !== "category") {
																				return;
																			}

																			event.preventDefault();
																			event.stopPropagation();
																			moveCategoryToGroup(
																				dragState.categoryId,
																				group.key,
																				category.id,
																			);
																			clearDragState();
																		}}
																		className={`flex min-h-12 min-w-0 cursor-grab items-center gap-2 rounded-xl border bg-white px-3 opacity-100 shadow-sm transition active:cursor-grabbing sm:gap-3 dark:bg-[#222220] ${
																			dragOverKey === categoryDragKey
																				? "border-cyan-500 ring-2 ring-cyan-500/20"
																				: "border-black/[0.03] dark:border-white/[0.06]"
																		}`}
																	>
																		<GripVertical
																			size={16}
																			className="shrink-0 text-[#969691]"
																		/>
																		<CategoryGlyph
																			name={category.icon_name || category.name}
																			size={17}
																			colorClass={theme.text}
																		/>
																		<span className="min-w-0 flex-1 truncate text-[15px]">
																			{category.name}
																		</span>

																		{!category.is_system && (
																			<>
																				<span className="hidden text-xs font-medium text-[#6e6e69] sm:inline dark:text-[#aaa9a4]">
																					Custom
																				</span>
																				{categoryPreferences[category.id]
																					?.excludedFromBudget && (
																					<span className="hidden rounded-md bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-800 md:inline dark:bg-amber-500/15 dark:text-amber-300">
																						Excluded
																					</span>
																				)}
																				<button
																					type="button"
																					onClick={() => {
																						openEditor({
																							mode: "edit-category",
																							category,
																						});
																					}}
																					className="grid size-8 place-items-center rounded-lg text-[#777671] hover:bg-black/[0.05] hover:text-[#222220] dark:hover:bg-white/10 dark:hover:text-white"
																					aria-label={`Edit ${category.name}`}
																				>
																					<Pencil size={15} />
																				</button>
																			</>
																		)}
																	</div>
																);
															})}

															<button
																type="button"
																onClick={() => {
																	openEditor({
																		mode: "create-category",
																		parentName: group.name,
																	});
																}}
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
									})}

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
			</div>

			{editor &&
				(editor.mode === "create-group" || editor.mode === "edit-group" ? (
					<GroupEditorModal
						mode={editor.mode}
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
						onSave={() => void handleSave()}
					/>
				))}

			{deleteConfirmation && (
				<DeleteConfirmModal
					title={deleteConfirmation.title}
					description={deleteConfirmation.description}
					confirmLabel={deleteConfirmation.confirmLabel}
					isDeleting={isSaving}
					onCancel={() => {
						if (!isSaving) {
							setDeleteConfirmation(null);
						}
					}}
					onConfirm={() => void handleDelete()}
				/>
			)}
		</SettingsContentCard>
	);
}

function GroupEditorModal({
	mode,
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
	onSave,
}: {
	mode: "create-group" | "edit-group";
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
	onSave: () => void;
}) {
	const isCreate = mode === "create-group";
	const hasChanges =
		isCreate ||
		name.trim() !== initialName.trim() ||
		budgetMode !== initialBudgetMode;
	const canSave = Boolean(name.trim()) && hasChanges && !isSaving;

	return (
		<div className="fixed inset-0 z-[300] grid place-items-center bg-black/45 p-4 backdrop-blur-[1px]">
			<button
				type="button"
				aria-label="Close group editor"
				className="absolute inset-0"
				onClick={onClose}
			/>

			<section className="relative w-full max-w-[892px] overflow-visible rounded-[20px] border border-black/10 bg-white text-[#282826] shadow-[0_28px_90px_rgba(0,0,0,0.28)] dark:border-white/10 dark:bg-[#242422] dark:text-white">
				<header className="flex min-h-28 items-center justify-between border-b border-black/[0.06] px-10 dark:border-white/10">
					<h2 className="text-[29px] font-semibold tracking-[-0.02em]">
						{isCreate ? "Create Group" : "Edit Group"}
					</h2>
					<button
						type="button"
						onClick={onClose}
						disabled={isSaving}
						className="grid size-11 place-items-center rounded-full transition hover:bg-black/[0.05] disabled:opacity-50 dark:hover:bg-white/10"
						aria-label="Close"
					>
						<X size={31} strokeWidth={1.8} />
					</button>
				</header>

				<div className="space-y-8 px-10 py-10">
					<label className="block">
						<span className="mb-4 block text-[23px] font-semibold">Name</span>
						<input
							autoFocus
							value={name}
							onChange={(event) => onNameChange(event.target.value)}
							className="h-[66px] w-full rounded-[15px] border border-[#d8d6d2] bg-white px-5 text-[27px] outline-none transition focus:border-[#008eae] focus:ring-2 focus:ring-[#008eae]/15 dark:border-white/15 dark:bg-[#20201f]"
						/>
					</label>

					<div>
						<span className="mb-4 block text-[23px] font-semibold">Budget</span>
						<BudgetModeSelect
							value={budgetMode}
							onChange={onBudgetModeChange}
						/>
						<p className="mt-4 text-[23px] leading-8 text-[#7d7b77] dark:text-[#aaa9a4]">
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

				<footer className="flex min-h-28 items-center justify-between border-t border-black/[0.06] px-10 dark:border-white/10">
					{!isCreate ? (
						<button
							type="button"
							onClick={onDelete}
							disabled={isSaving}
							className="h-[58px] rounded-[13px] border border-[#dedbd7] bg-white px-5 text-[23px] font-semibold text-[#de2529] shadow-sm transition hover:bg-red-50 disabled:opacity-50 dark:border-white/15 dark:bg-[#242422] dark:hover:bg-red-500/10"
						>
							Delete
						</button>
					) : (
						<span />
					)}

					<div className="flex items-center gap-5">
						<button
							type="button"
							onClick={onClose}
							disabled={isSaving}
							className="h-[58px] rounded-[13px] border border-[#dedbd7] bg-white px-6 text-[23px] font-semibold shadow-sm transition hover:bg-[#f7f6f4] disabled:opacity-50 dark:border-white/15 dark:bg-[#242422] dark:hover:bg-white/5"
						>
							Cancel
						</button>
						<button
							type="button"
							onClick={onSave}
							disabled={!canSave}
							className="inline-flex h-[58px] min-w-24 items-center justify-center gap-2 rounded-[13px] bg-[#ff5a35] px-5 text-[23px] font-semibold text-white transition hover:bg-[#e94c28] disabled:cursor-not-allowed disabled:bg-[#ffad91] disabled:text-white/95"
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
	isSaving,
	errorMessage,
	onNameChange,
	onIconChange,
	onParentChange,
	onExcludeFromBudgetChange,
	onClose,
	onDelete,
	onSave,
}: {
	editor: EditorState;
	groups: CategoryGroup[];
	name: string;
	icon: string;
	selectedParentName: string;
	excludeFromBudget: boolean;
	isSaving: boolean;
	errorMessage: string | null;
	onNameChange: (value: string) => void;
	onIconChange: (value: string) => void;
	onParentChange: (value: string) => void;
	onExcludeFromBudgetChange: (value: boolean) => void;
	onClose: () => void;
	onDelete: () => void;
	onSave: () => void;
}) {
	const isEdit = editor.mode === "edit-category";
	const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
	const selectedEmoji = getEmojiIcon(icon) ?? "❓";

	return (
		<div className="fixed inset-0 z-[300] grid place-items-center bg-black/45 p-4 backdrop-blur-[1px]">
			<button
				type="button"
				aria-label="Close category editor"
				className="absolute inset-0"
				onClick={onClose}
			/>

			<section className="relative w-full max-w-[892px] overflow-visible rounded-[20px] border border-black/10 bg-white text-[#282826] shadow-[0_28px_90px_rgba(0,0,0,0.28)] dark:border-white/10 dark:bg-[#242422] dark:text-white">
				<header className="flex min-h-28 items-center justify-between border-b border-black/[0.06] px-10 dark:border-white/10">
					<h2 className="text-[29px] font-semibold tracking-[-0.02em]">
						{isEdit ? "Edit Category" : "Create Category"}
					</h2>
					<button
						type="button"
						onClick={onClose}
						disabled={isSaving}
						className="grid size-11 place-items-center rounded-full transition hover:bg-black/[0.05] disabled:opacity-50 dark:hover:bg-white/10"
						aria-label="Close"
					>
						<X size={31} strokeWidth={1.8} />
					</button>
				</header>

				<div className="space-y-8 px-10 py-10">
					<div>
						<span className="mb-3 block text-[23px] font-semibold">
							Icon &amp; Name
						</span>
						<div className="relative">
							<div className="flex h-[66px] overflow-hidden rounded-[15px] border border-[#d8d6d2] bg-white focus-within:border-[#008eae] focus-within:ring-2 focus-within:ring-[#008eae]/15 dark:border-white/15 dark:bg-[#20201f]">
								<button
									type="button"
									onClick={() => {
										setIsEmojiPickerOpen((current) => !current);
									}}
									aria-label="Choose category emoji"
									aria-expanded={isEmojiPickerOpen}
									className="grid w-[72px] shrink-0 place-items-center border-r border-[#d8d6d2] text-[31px] transition hover:bg-[#f6f5f3] dark:border-white/15 dark:hover:bg-white/5"
								>
									{selectedEmoji}
								</button>
								<input
									autoFocus
									value={name}
									onChange={(event) => onNameChange(event.target.value)}
									placeholder="New Category"
									className="min-w-0 flex-1 bg-transparent px-5 text-[27px] outline-none placeholder:text-[#8d8b87]"
								/>
							</div>

							{isEmojiPickerOpen && (
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
					</div>

					<div>
						<span className="mb-3 block text-[23px] font-semibold">Group</span>
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

					<div className="flex items-center justify-between gap-6 rounded-[15px] border border-[#dedbd7] px-7 py-7 dark:border-white/15">
						<div className="min-w-0">
							<h3 className="text-[22px] font-semibold">
								Exclude this category from the budget
							</h3>
							<p className="mt-2 max-w-[620px] text-[20px] leading-8 text-[#55534f] dark:text-[#c2c0bb]">
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
							className={`relative h-7 w-14 shrink-0 rounded-full transition ${
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

				<footer className="flex min-h-28 items-center justify-between border-t border-black/[0.06] px-10 dark:border-white/10">
					{isEdit && editor.category && !editor.category.is_system ? (
						<button
							type="button"
							onClick={onDelete}
							disabled={isSaving}
							className="inline-flex h-[58px] items-center gap-2 rounded-[13px] border border-[#dedbd7] bg-white px-5 text-[23px] font-semibold text-[#de2529] shadow-sm transition hover:bg-red-50 disabled:opacity-50 dark:border-white/15 dark:bg-[#242422] dark:hover:bg-red-500/10"
						>
							<Trash2 size={20} />
							Delete
						</button>
					) : (
						<span />
					)}

					<div className="flex items-center gap-5">
						{isEdit && (
							<button
								type="button"
								onClick={onClose}
								disabled={isSaving}
								className="h-[58px] rounded-[13px] border border-[#dedbd7] bg-white px-6 text-[23px] font-semibold shadow-sm transition hover:bg-[#f7f6f4] disabled:opacity-50 dark:border-white/15 dark:bg-[#242422] dark:hover:bg-white/5"
							>
								Cancel
							</button>
						)}
						<button
							type="button"
							onClick={onSave}
							disabled={isSaving || !name.trim()}
							className="inline-flex h-[58px] min-w-24 items-center justify-center gap-2 rounded-[13px] bg-[#ff5a35] px-5 text-[23px] font-semibold text-white transition hover:bg-[#e94c28] disabled:cursor-not-allowed disabled:bg-[#ffad91] disabled:text-white/95"
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
	const [isOpen, setIsOpen] = useState(false);
	const incomeGroups = groups.filter((group) => {
		return group.sectionId === "income";
	});
	const expenseGroups = groups.filter((group) => {
		return group.sectionId === "expenses";
	});
	const transferGroups = groups.filter((group) => {
		return group.sectionId === "transfers";
	});
	const selectedGroup = groups.find((group) => group.name === value);

	return (
		<div className="relative">
			<button
				type="button"
				disabled={disabled}
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
				} ${disabled ? "cursor-not-allowed opacity-70" : ""}`}
			>
				<span>{selectedGroup?.displayName ?? value}</span>
				<ChevronDown
					size={27}
					strokeWidth={1.8}
					className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
				/>
			</button>

			{isOpen && !disabled && (
				<div
					role="listbox"
					className="absolute left-0 right-0 top-[calc(100%+12px)] z-30 max-h-[420px] overflow-y-auto rounded-[20px] border border-[#dfddd9] bg-white py-3 shadow-[0_18px_45px_rgba(0,0,0,0.18)] dark:border-white/15 dark:bg-[#2a2a28]"
				>
					<GroupOptionSection
						label="Income"
						groups={incomeGroups}
						value={value}
						onChange={(nextValue) => {
							onChange(nextValue);
							setIsOpen(false);
						}}
					/>
					<GroupOptionSection
						label="Expenses"
						groups={expenseGroups}
						value={value}
						onChange={(nextValue) => {
							onChange(nextValue);
							setIsOpen(false);
						}}
					/>
					<GroupOptionSection
						label="Transfers"
						groups={transferGroups}
						value={value}
						onChange={(nextValue) => {
							onChange(nextValue);
							setIsOpen(false);
						}}
					/>
				</div>
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
			<div className="px-5 py-3 text-[21px] font-semibold text-[#777570] dark:text-[#aaa9a4]">
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
						className={`flex min-h-[58px] w-full items-center justify-between rounded-[14px] px-6 text-left text-[24px] transition ${
							selected
								? "bg-[#f2f1ef] dark:bg-white/10"
								: "hover:bg-[#f7f6f4] dark:hover:bg-white/5"
						}`}
					>
						<span>{group.displayName}</span>
						{selected && <Check size={21} className="text-[#008eae]" />}
					</button>
				);
			})}
		</div>
	);
}

function DeleteConfirmModal({
	title,
	description,
	confirmLabel,
	isDeleting,
	onCancel,
	onConfirm,
}: {
	title: string;
	description: string;
	confirmLabel: string;
	isDeleting: boolean;
	onCancel: () => void;
	onConfirm: () => void;
}) {
	return (
		<div className="fixed inset-0 z-[360] grid place-items-center bg-black/55 p-4 backdrop-blur-[2px]">
			<button
				type="button"
				aria-label="Close delete confirmation"
				className="absolute inset-0"
				onClick={onCancel}
			/>

			<section
				role="alertdialog"
				aria-modal="true"
				aria-labelledby="delete-confirm-title"
				aria-describedby="delete-confirm-description"
				className="relative w-full max-w-[520px] overflow-hidden rounded-[20px] border border-black/10 bg-white text-[#282826] shadow-[0_28px_90px_rgba(0,0,0,0.34)] dark:border-white/10 dark:bg-[#242422] dark:text-white"
			>
				<div className="flex items-start gap-4 px-7 pb-5 pt-7">
					<div className="grid size-11 shrink-0 place-items-center rounded-full bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-300">
						<Trash2 size={21} />
					</div>
					<div className="min-w-0">
						<h2
							id="delete-confirm-title"
							className="text-xl font-semibold tracking-[-0.01em]"
						>
							{title}
						</h2>
						<p
							id="delete-confirm-description"
							className="mt-2 text-sm leading-6 text-[#686661] dark:text-[#b8b6b1]"
						>
							{description}
						</p>
					</div>
				</div>

				<footer className="flex items-center justify-end gap-3 border-t border-black/[0.06] px-7 py-5 dark:border-white/10">
					<button
						type="button"
						onClick={onCancel}
						disabled={isDeleting}
						className="h-11 rounded-xl border border-[#dedbd7] bg-white px-5 text-sm font-semibold shadow-sm transition hover:bg-[#f7f6f4] disabled:opacity-50 dark:border-white/15 dark:bg-[#242422] dark:hover:bg-white/5"
					>
						Cancel
					</button>
					<button
						type="button"
						onClick={onConfirm}
						disabled={isDeleting}
						className="inline-flex h-11 min-w-32 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-400"
					>
						{isDeleting && <Loader2 size={17} className="animate-spin" />}
						{confirmLabel}
					</button>
				</footer>
			</section>
		</div>
	);
}
