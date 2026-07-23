"use client";

import { useEffect, useMemo, useState } from "react";
import {
	AlertCircle,
	Check,
	ChevronDown,
	GripVertical,
	Info,
	Loader2,
	Pencil,
	Plus,
	Search,
	Trash2,
	X,
} from "lucide-react";

import {
	CategoryGlyph,
	encodeEmojiIcon,
	getEmojiIcon,
} from "@/components/Categories/CategoryGlyph";
import { SettingsContentCard } from "@/components/Settings/SettingsShell";
import { CATEGORY_HIERARCHY, getCategoryTheme } from "@/constants";
import { type CustomCategory, useBudgetStore } from "@/store/useBudgetStore";

type EditorMode =
	| "create-group"
	| "edit-group"
	| "create-category"
	| "edit-category";

type GroupBudgetMode = "group" | "category";

interface GroupPreference {
	name?: string;
	budgetMode?: GroupBudgetMode;
	hidden?: boolean;
}

interface CategoryPreference {
	excludedFromBudget?: boolean;
}

interface CategoryGroup {
	key: string;
	name: string;
	displayName: string;
	budgetMode: GroupBudgetMode;
	record?: CustomCategory;
	children: CustomCategory[];
}

interface EditorState {
	mode: EditorMode;
	parentName?: string;
	category?: CustomCategory;
	group?: CategoryGroup;
}

const DEFAULT_ICON = encodeEmojiIcon("❓");
const DEFAULT_COLOR = "slate";
const GROUP_PREFERENCES_STORAGE_KEY = "finance-category-group-preferences-v1";
const CATEGORY_PREFERENCES_STORAGE_KEY = "finance-category-preferences-v1";

function readGroupPreferences(): Record<string, GroupPreference> {
	if (typeof window === "undefined") {
		return {};
	}

	try {
		const storedValue = window.localStorage.getItem(
			GROUP_PREFERENCES_STORAGE_KEY,
		);

		if (!storedValue) {
			return {};
		}

		const parsedValue = JSON.parse(storedValue) as unknown;

		if (!parsedValue || typeof parsedValue !== "object") {
			return {};
		}

		return parsedValue as Record<string, GroupPreference>;
	} catch (error) {
		console.error("Failed to read category group preferences:", error);
		return {};
	}
}

function writeGroupPreferences(
	preferences: Record<string, GroupPreference>,
): void {
	if (typeof window === "undefined") {
		return;
	}

	try {
		window.localStorage.setItem(
			GROUP_PREFERENCES_STORAGE_KEY,
			JSON.stringify(preferences),
		);
	} catch (error) {
		console.error("Failed to save category group preferences:", error);
	}
}

function readCategoryPreferences(): Record<string, CategoryPreference> {
	if (typeof window === "undefined") {
		return {};
	}

	try {
		const storedValue = window.localStorage.getItem(
			CATEGORY_PREFERENCES_STORAGE_KEY,
		);

		if (!storedValue) {
			return {};
		}

		const parsedValue = JSON.parse(storedValue) as unknown;

		if (!parsedValue || typeof parsedValue !== "object") {
			return {};
		}

		return parsedValue as Record<string, CategoryPreference>;
	} catch (error) {
		console.error("Failed to read category preferences:", error);
		return {};
	}
}

function writeCategoryPreferences(
	preferences: Record<string, CategoryPreference>,
): void {
	if (typeof window === "undefined") {
		return;
	}

	try {
		window.localStorage.setItem(
			CATEGORY_PREFERENCES_STORAGE_KEY,
			JSON.stringify(preferences),
		);
	} catch (error) {
		console.error("Failed to save category preferences:", error);
	}
}

function getGroupKey(name: string, record?: CustomCategory): string {
	return record?.id ? `category:${record.id}` : `system:${name}`;
}

function normalize(value: string): string {
	return value.trim().toLowerCase();
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

			if (!category.parent_name?.trim()) {
				parentByName.set(categoryName, category);
				continue;
			}

			const parentName = category.parent_name.trim();
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
				const key = getGroupKey(parentName, record);
				const preference = groupPreferences[key];

				return {
					key,
					name: parentName,
					displayName: preference?.name?.trim() || parentName,
					budgetMode: preference?.budgetMode ?? "category",
					record,
					children: [...(childrenByParent.get(parentName) ?? [])].sort(
						(first, second) => {
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
						},
					),
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
	}, [customCategories, groupPreferences]);

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

	const openEditor = (nextEditor: EditorState) => {
		setEditor(nextEditor);
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
				if (!validateGroupName(cleanName)) {
					return;
				}

				const createdGroup = await addCustomCategory({
					name: cleanName,
					icon: DEFAULT_ICON,
					color: DEFAULT_COLOR,
				});
				const groupKey = getGroupKey(createdGroup.name, createdGroup);

				updateGroupPreference(groupKey, () => ({
					name: cleanName,
					budgetMode,
				}));
			} else if (editor.mode === "edit-group" && editor.group) {
				if (!validateGroupName(cleanName, editor.group.key)) {
					return;
				}

				updateGroupPreference(editor.group.key, (current) => ({
					...current,
					name: cleanName,
					budgetMode,
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

				updateCategoryPreference(createdCategory.id, () => ({
					excludedFromBudget: excludeFromBudget,
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

	const handleDelete = async () => {
		if (!editor || isSaving) {
			return;
		}

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
					}

					await deleteCustomCategory(editor.group.record.id);
					removeGroupPreference(editor.group.key);
				} else {
					updateGroupPreference(editor.group.key, (current) => ({
						...current,
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
			<div className="p-5 sm:p-6">
				<div className="mb-7 flex items-start gap-3 rounded-xl bg-cyan-50 px-4 py-3 text-sm leading-6 text-cyan-800 dark:bg-cyan-500/10 dark:text-cyan-300">
					<Info size={18} className="mt-0.5 shrink-0" />
					<p>
						Changes you make to your groups and categories here are applied
						throughout the app. Customize the structure to match how you budget.
					</p>
				</div>

				<div className="space-y-7">
					{groups.map((group, groupIndex) => {
						const theme = getCategoryTheme(group.name);
						const isIncome = group.name === "Income";

						return (
							<section key={group.key}>
								<div className="mb-3 flex items-center justify-between gap-4">
									<div className="flex min-w-0 items-center gap-3">
										<h3 className="truncate text-lg font-semibold">
											{isIncome
												? "Income"
												: groupIndex === 1
													? "Expenses"
													: group.displayName}
										</h3>

										{!isIncome && groupIndex === 1 && (
											<span className="sr-only">{group.displayName}</span>
										)}
									</div>

									<button
										type="button"
										onClick={() => {
											openEditor({ mode: "create-group" });
										}}
										className="text-sm font-semibold text-cyan-600 hover:text-cyan-700 dark:text-cyan-400"
									>
										Create group
									</button>
								</div>

								<div className="overflow-hidden rounded-2xl bg-[#f4f4f2] dark:bg-white/[0.04]">
									<div className="flex min-h-13 items-center gap-3 border-b border-black/5 px-5 dark:border-white/10">
										<CategoryGlyph
											name={group.record?.icon_name || group.name}
											size={18}
											colorClass={theme.text}
										/>
										<span className="font-semibold">{group.displayName}</span>

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

									<div className="space-y-2 p-4">
										{group.children.map((category) => (
											<div
												key={category.id}
												className="flex min-h-12 items-center gap-3 rounded-xl border border-black/[0.03] bg-white px-3 shadow-sm dark:border-white/[0.06] dark:bg-[#222220]"
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
														<span className="text-xs font-medium text-[#6e6e69] dark:text-[#aaa9a4]">
															Custom
														</span>
														{categoryPreferences[category.id]
															?.excludedFromBudget && (
															<span className="rounded-md bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
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
										))}

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
						onDelete={() => void handleDelete()}
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
						onDelete={() => void handleDelete()}
						onSave={() => void handleSave()}
					/>
				))}
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

interface EmojiOption {
	emoji: string;
	keywords: string[];
}

interface EmojiSection {
	id: string;
	label: string;
	tab: string;
	items: EmojiOption[];
}

const EMOJI_SECTIONS: EmojiSection[] = [
	{
		id: "frequent",
		label: "Frequently used",
		tab: "◷",
		items: [
			{ emoji: "👍", keywords: ["thumb", "like", "good"] },
			{ emoji: "😀", keywords: ["smile", "happy", "face"] },
			{ emoji: "😘", keywords: ["kiss", "love", "face"] },
			{ emoji: "😍", keywords: ["heart", "love", "face"] },
			{ emoji: "😆", keywords: ["laugh", "happy", "face"] },
			{ emoji: "😜", keywords: ["wink", "tongue", "face"] },
			{ emoji: "😱", keywords: ["shock", "surprised", "face"] },
			{ emoji: "😬", keywords: ["grimace", "face"] },
			{ emoji: "🙏", keywords: ["pray", "thanks", "hands"] },
			{ emoji: "💸", keywords: ["money", "spending", "cash"] },
			{ emoji: "💳", keywords: ["card", "credit", "payment"] },
			{ emoji: "🛒", keywords: ["shopping", "cart", "grocery"] },
		],
	},
	{
		id: "smileys",
		label: "Smileys & People",
		tab: "😀",
		items: [
			{ emoji: "😀", keywords: ["smile", "happy", "face"] },
			{ emoji: "😃", keywords: ["smile", "happy", "face"] },
			{ emoji: "😄", keywords: ["smile", "happy", "face"] },
			{ emoji: "😁", keywords: ["grin", "happy", "face"] },
			{ emoji: "😆", keywords: ["laugh", "happy", "face"] },
			{ emoji: "😅", keywords: ["sweat", "relief", "face"] },
			{ emoji: "😂", keywords: ["tears", "laugh", "face"] },
			{ emoji: "😊", keywords: ["blush", "happy", "face"] },
			{ emoji: "😇", keywords: ["angel", "face"] },
			{ emoji: "🙂", keywords: ["smile", "face"] },
			{ emoji: "😉", keywords: ["wink", "face"] },
			{ emoji: "😍", keywords: ["love", "heart", "face"] },
			{ emoji: "🥳", keywords: ["party", "celebration"] },
			{ emoji: "🤓", keywords: ["nerd", "glasses", "study"] },
			{ emoji: "🤠", keywords: ["cowboy", "hat"] },
			{ emoji: "🤝", keywords: ["handshake", "business"] },
			{ emoji: "👨‍👩‍👧‍👦", keywords: ["family", "household"] },
			{ emoji: "👶", keywords: ["baby", "child"] },
			{ emoji: "🧑‍⚕️", keywords: ["doctor", "medical", "health"] },
			{ emoji: "🧑‍💻", keywords: ["computer", "work", "developer"] },
		],
	},
	{
		id: "animals",
		label: "Animals & Nature",
		tab: "🐶",
		items: [
			{ emoji: "🐶", keywords: ["dog", "pet"] },
			{ emoji: "🐱", keywords: ["cat", "pet"] },
			{ emoji: "🐭", keywords: ["mouse", "pet"] },
			{ emoji: "🐹", keywords: ["hamster", "pet"] },
			{ emoji: "🐰", keywords: ["rabbit", "pet"] },
			{ emoji: "🦊", keywords: ["fox", "animal"] },
			{ emoji: "🐻", keywords: ["bear", "animal"] },
			{ emoji: "🐼", keywords: ["panda", "animal"] },
			{ emoji: "🐨", keywords: ["koala", "animal"] },
			{ emoji: "🐯", keywords: ["tiger", "animal"] },
			{ emoji: "🦁", keywords: ["lion", "animal"] },
			{ emoji: "🐮", keywords: ["cow", "farm"] },
			{ emoji: "🐷", keywords: ["pig", "farm"] },
			{ emoji: "🐸", keywords: ["frog", "animal"] },
			{ emoji: "🐵", keywords: ["monkey", "animal"] },
			{ emoji: "🌱", keywords: ["plant", "garden", "nature"] },
			{ emoji: "🌳", keywords: ["tree", "nature"] },
			{ emoji: "🌸", keywords: ["flower", "nature"] },
			{ emoji: "☀️", keywords: ["sun", "weather"] },
			{ emoji: "🌙", keywords: ["moon", "night"] },
		],
	},
	{
		id: "food",
		label: "Food & Drink",
		tab: "🍎",
		items: [
			{ emoji: "🍎", keywords: ["apple", "fruit", "food"] },
			{ emoji: "🍌", keywords: ["banana", "fruit", "food"] },
			{ emoji: "🥑", keywords: ["avocado", "food"] },
			{ emoji: "🥦", keywords: ["broccoli", "vegetable", "food"] },
			{ emoji: "🍞", keywords: ["bread", "food"] },
			{ emoji: "🧀", keywords: ["cheese", "food"] },
			{ emoji: "🍳", keywords: ["egg", "breakfast", "food"] },
			{ emoji: "🍔", keywords: ["burger", "restaurant", "food"] },
			{ emoji: "🍕", keywords: ["pizza", "restaurant", "food"] },
			{ emoji: "🍜", keywords: ["noodle", "restaurant", "food"] },
			{ emoji: "🍣", keywords: ["sushi", "restaurant", "food"] },
			{ emoji: "🍰", keywords: ["cake", "dessert", "food"] },
			{ emoji: "☕", keywords: ["coffee", "drink"] },
			{ emoji: "🧋", keywords: ["boba", "tea", "drink"] },
			{ emoji: "🍺", keywords: ["beer", "drink"] },
			{ emoji: "🍷", keywords: ["wine", "drink"] },
			{ emoji: "🍽️", keywords: ["dining", "restaurant"] },
			{ emoji: "🛒", keywords: ["grocery", "shopping", "food"] },
		],
	},
	{
		id: "travel",
		label: "Travel & Places",
		tab: "🚗",
		items: [
			{ emoji: "🚗", keywords: ["car", "auto", "transport"] },
			{ emoji: "🚕", keywords: ["taxi", "ride", "transport"] },
			{ emoji: "🚌", keywords: ["bus", "transit", "transport"] },
			{ emoji: "🚆", keywords: ["train", "transit", "transport"] },
			{ emoji: "✈️", keywords: ["plane", "flight", "travel"] },
			{ emoji: "🚢", keywords: ["ship", "cruise", "travel"] },
			{ emoji: "⛽", keywords: ["gas", "fuel", "car"] },
			{ emoji: "🅿️", keywords: ["parking", "car"] },
			{ emoji: "🏠", keywords: ["home", "house", "housing"] },
			{ emoji: "🏢", keywords: ["office", "business"] },
			{ emoji: "🏨", keywords: ["hotel", "travel"] },
			{ emoji: "🏥", keywords: ["hospital", "medical"] },
			{ emoji: "🏫", keywords: ["school", "education"] },
			{ emoji: "🏦", keywords: ["bank", "finance"] },
			{ emoji: "🏛️", keywords: ["government", "tax"] },
			{ emoji: "🏖️", keywords: ["beach", "vacation", "travel"] },
			{ emoji: "🗺️", keywords: ["map", "travel"] },
			{ emoji: "🧳", keywords: ["luggage", "travel"] },
		],
	},
	{
		id: "activities",
		label: "Activities",
		tab: "⚽",
		items: [
			{ emoji: "⚽", keywords: ["soccer", "sport"] },
			{ emoji: "🏀", keywords: ["basketball", "sport"] },
			{ emoji: "🏈", keywords: ["football", "sport"] },
			{ emoji: "⚾", keywords: ["baseball", "sport"] },
			{ emoji: "🎾", keywords: ["tennis", "sport"] },
			{ emoji: "🏋️", keywords: ["gym", "fitness", "sport"] },
			{ emoji: "🎮", keywords: ["game", "gaming", "entertainment"] },
			{ emoji: "🎬", keywords: ["movie", "cinema", "entertainment"] },
			{ emoji: "🎵", keywords: ["music", "audio"] },
			{ emoji: "🎨", keywords: ["art", "hobby"] },
			{ emoji: "📚", keywords: ["books", "reading", "education"] },
			{ emoji: "🎁", keywords: ["gift", "present"] },
			{ emoji: "🎉", keywords: ["party", "celebration"] },
			{ emoji: "🎟️", keywords: ["ticket", "event"] },
			{ emoji: "🏆", keywords: ["award", "achievement"] },
			{ emoji: "🧘", keywords: ["yoga", "wellness"] },
		],
	},
	{
		id: "objects",
		label: "Objects",
		tab: "💡",
		items: [
			{ emoji: "💡", keywords: ["light", "electricity", "idea"] },
			{ emoji: "📱", keywords: ["phone", "mobile"] },
			{ emoji: "💻", keywords: ["computer", "technology"] },
			{ emoji: "⌚", keywords: ["watch", "technology"] },
			{ emoji: "📺", keywords: ["tv", "entertainment"] },
			{ emoji: "📷", keywords: ["camera", "photo"] },
			{ emoji: "🔧", keywords: ["repair", "tool"] },
			{ emoji: "🧰", keywords: ["tool", "repair"] },
			{ emoji: "🧹", keywords: ["clean", "household"] },
			{ emoji: "🛏️", keywords: ["bed", "home"] },
			{ emoji: "🛋️", keywords: ["furniture", "home"] },
			{ emoji: "👕", keywords: ["shirt", "clothing"] },
			{ emoji: "👟", keywords: ["shoe", "clothing"] },
			{ emoji: "💊", keywords: ["medicine", "pharmacy"] },
			{ emoji: "🩺", keywords: ["medical", "health"] },
			{ emoji: "✂️", keywords: ["hair", "beauty", "service"] },
			{ emoji: "📝", keywords: ["note", "subscription"] },
			{ emoji: "📦", keywords: ["package", "shipping"] },
		],
	},
	{
		id: "symbols",
		label: "Symbols",
		tab: "🌐",
		items: [
			{ emoji: "💰", keywords: ["money", "income", "cash"] },
			{ emoji: "💵", keywords: ["cash", "money", "income"] },
			{ emoji: "💸", keywords: ["spending", "money", "expense"] },
			{ emoji: "💳", keywords: ["credit", "card", "payment"] },
			{ emoji: "🧾", keywords: ["receipt", "bill"] },
			{ emoji: "📈", keywords: ["investment", "growth"] },
			{ emoji: "📉", keywords: ["loss", "investment"] },
			{ emoji: "🏷️", keywords: ["tag", "price", "shopping"] },
			{ emoji: "🔒", keywords: ["security", "insurance"] },
			{ emoji: "❤️", keywords: ["heart", "love", "charity"] },
			{ emoji: "✅", keywords: ["check", "complete"] },
			{ emoji: "⚠️", keywords: ["warning", "alert"] },
			{ emoji: "❓", keywords: ["question", "other", "unknown"] },
			{ emoji: "⭐", keywords: ["star", "favorite"] },
			{ emoji: "♻️", keywords: ["recycle", "environment"] },
			{ emoji: "🌐", keywords: ["internet", "web", "global"] },
		],
	},
];

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
								<EmojiPicker
									selectedEmoji={selectedEmoji}
									onSelect={(emoji) => {
										onIconChange(encodeEmojiIcon(emoji));
										setIsEmojiPickerOpen(false);
									}}
									onClose={() => setIsEmojiPickerOpen(false)}
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
	const incomeGroups = groups.filter((group) => group.name === "Income");
	const expenseGroups = groups.filter((group) => group.name !== "Income");

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
				<span>{value}</span>
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
						label="Expense"
						groups={expenseGroups}
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

function EmojiPicker({
	selectedEmoji,
	onSelect,
	onClose,
}: {
	selectedEmoji: string;
	onSelect: (emoji: string) => void;
	onClose: () => void;
}) {
	const [activeSectionId, setActiveSectionId] = useState("frequent");
	const [query, setQuery] = useState("");

	const normalizedQuery = query.trim().toLowerCase();
	const visibleSections = useMemo(() => {
		if (!normalizedQuery) {
			return EMOJI_SECTIONS.filter((section) => {
				return section.id === activeSectionId;
			});
		}

		return EMOJI_SECTIONS.map((section) => ({
			...section,
			items: section.items.filter((item) => {
				return (
					item.emoji.includes(normalizedQuery) ||
					item.keywords.some((keyword) => {
						return keyword.includes(normalizedQuery);
					})
				);
			}),
		})).filter((section) => section.items.length > 0);
	}, [activeSectionId, normalizedQuery]);

	return (
		<div
			className="absolute left-0 top-[calc(100%+14px)] z-40 w-full max-w-[520px] overflow-hidden rounded-[20px] border border-[#ddd9d4] bg-white shadow-[0_22px_65px_rgba(0,0,0,0.24)] dark:border-white/15 dark:bg-[#2a2a28]"
			onKeyDown={(event) => {
				if (event.key === "Escape") {
					event.preventDefault();
					event.stopPropagation();
					onClose();
				}
			}}
		>
			<div className="flex items-center justify-between border-b border-black/[0.06] px-4 dark:border-white/10">
				<div className="flex min-w-0 flex-1 overflow-x-auto">
					{EMOJI_SECTIONS.map((section) => {
						const active = !normalizedQuery && section.id === activeSectionId;

						return (
							<button
								key={section.id}
								type="button"
								onClick={() => {
									setQuery("");
									setActiveSectionId(section.id);
								}}
								aria-label={section.label}
								className={`relative grid h-14 min-w-14 place-items-center text-[24px] transition hover:bg-[#f7f6f4] dark:hover:bg-white/5 ${
									active
										? "after:absolute after:inset-x-2 after:bottom-0 after:h-1 after:rounded-full after:bg-[#282826] dark:after:bg-white"
										: ""
								}`}
							>
								{section.tab}
							</button>
						);
					})}
				</div>
				<button
					type="button"
					onClick={onClose}
					className="grid size-10 shrink-0 place-items-center rounded-full hover:bg-[#f3f2ef] dark:hover:bg-white/10"
					aria-label="Close emoji picker"
				>
					<X size={19} />
				</button>
			</div>

			<div className="p-4">
				<label className="relative block">
					<Search
						size={22}
						className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#777570]"
					/>
					<input
						value={query}
						onChange={(event) => setQuery(event.target.value)}
						placeholder="Search"
						className="h-12 w-full rounded-[14px] border border-[#cfcac4] bg-white pl-12 pr-4 text-[20px] outline-none focus:border-[#008eae] focus:ring-2 focus:ring-[#008eae]/15 dark:border-white/15 dark:bg-[#20201f]"
					/>
				</label>

				<div className="mt-4 max-h-[310px] overflow-y-auto pr-1">
					{visibleSections.length === 0 ? (
						<div className="py-12 text-center text-sm text-[#777570]">
							No emoji found.
						</div>
					) : (
						visibleSections.map((section) => (
							<section key={section.id} className="mb-5 last:mb-0">
								<h4 className="mb-3 text-[20px] font-semibold">
									{section.label}
								</h4>
								<div className="grid grid-cols-8 gap-2">
									{section.items.map((item) => {
										const selected = item.emoji === selectedEmoji;

										return (
											<button
												key={`${section.id}-${item.emoji}`}
												type="button"
												onClick={() => onSelect(item.emoji)}
												className={`grid aspect-square place-items-center rounded-xl text-[28px] transition hover:bg-[#f2f1ef] dark:hover:bg-white/10 ${
													selected
														? "bg-[#d4f3f7] ring-2 ring-[#008eae]/30 dark:bg-cyan-500/15"
														: ""
												}`}
												aria-label={`Use ${item.emoji}`}
											>
												{item.emoji}
											</button>
										);
									})}
								</div>
							</section>
						))
					)}
				</div>
			</div>
		</div>
	);
}
