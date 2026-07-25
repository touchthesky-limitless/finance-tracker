"use client";

import {
	useEffect,
	useMemo,
	useRef,
	useState,
	type Dispatch,
	type SetStateAction,
	type ReactNode,
} from "react";
import {
	Building2,
	Car,
	CircleX,
	CreditCard,
	Home,
	Landmark,
	LineChart,
	Search,
	Sparkles,
	Tag,
	WalletCards,
	X,
} from "lucide-react";

import { CATEGORY_HIERARCHY, getCategoryTheme } from "@/constants";
import { CUSTOM_ICON_MAP, SYSTEM_ICON_MAP } from "@/constants/icons";
import {
	countActiveTransactionFilters,
	type AmountFilterMode,
	type TransactionFilterData,
	type TransactionFilterOption,
	type TransactionFilters,
	type TransactionTypeFilter,
	type TriStateFilter,
} from "@/components/Transactions/transactionFilters";
import { MerchantOptionContent } from "@/components/Merchants/MerchantOptionContent";

export type TransactionFilterSection =
	| "categories"
	| "merchants"
	| "accounts"
	| "tags"
	| "goals"
	| "amount"
	| "other";

export interface TransactionFilterPanelCustomSection {
	id: string;
	label: string;
	selectedGroupLabel?: string;
	options: TransactionFilterOption[];
	selectedValues: string[];
	onToggle: (value: string) => void;
	onClear: () => void;
	emptyLabel?: string;
	showCounts?: boolean;
}

type MultiSelectFilterKey =
	| "categoryNames"
	| "merchantNames"
	| "accountNames"
	| "tags"
	| "goalIds";

export interface TransactionFilterPanelProps {
	filters: TransactionFilters;
	setFilters: Dispatch<SetStateAction<TransactionFilters>>;
	data: TransactionFilterData;
	onClear: () => void;
	onCancel: () => void;
	onApply: () => void;
	applyDisabled: boolean;
	visibleSections?: readonly TransactionFilterSection[];
	customSections?: readonly TransactionFilterPanelCustomSection[];
	sectionOrder?: readonly string[];
	initialSectionId?: string;
	allowEmptyClear?: boolean;
}

const FILTER_SECTIONS: ReadonlyArray<{
	id: TransactionFilterSection;
	label: string;
}> = [
	{ id: "categories", label: "Categories" },
	{ id: "merchants", label: "Merchants" },
	{ id: "accounts", label: "Accounts" },
	{ id: "tags", label: "Tags" },
	{ id: "goals", label: "Goals" },
	{ id: "amount", label: "Amount" },
	{ id: "other", label: "Other" },
];

const AMOUNT_OPTIONS: ReadonlyArray<{
	value: AmountFilterMode;
	label: string;
}> = [
	{ value: "greater-than", label: "Greater than" },
	{ value: "less-than", label: "Less than" },
	{ value: "equal-to", label: "Equal to" },
	{ value: "between", label: "Between" },
];

function normalize(value: string): string {
	return value.trim().toLowerCase();
}

interface CategoryGroup {
	parent: TransactionFilterOption;
	children: TransactionFilterOption[];
}

interface AccountSubgroup {
	name: string;
	options: TransactionFilterOption[];
}

interface AccountRootGroup {
	name: "Assets" | "Liabilities";
	subgroups: AccountSubgroup[];
}

const ACCOUNT_ROOT_ORDER = ["Assets", "Liabilities"] as const;

const ACCOUNT_SUBGROUP_ORDER: Record<
	(typeof ACCOUNT_ROOT_ORDER)[number],
	string[]
> = {
	Assets: [
		"Cash",
		"Investments",
		"Real Estate",
		"Vehicles",
		"Valuables",
		"Other Assets",
	],
	Liabilities: ["Credit Cards", "Mortgage", "Loans", "Other Liabilities"],
};

function parseAccountGroup(option: TransactionFilterOption): {
	root: "Assets" | "Liabilities";
	subgroup: string;
} {
	const rawGroup = option.group?.trim() ?? "";
	const [rawRoot, rawSubgroup] = rawGroup.split("::");
	const normalizedRoot = normalize(rawRoot);
	const normalizedSubgroup = normalize(rawSubgroup || rawRoot);

	const liabilitySubgroups = new Set([
		"credit cards",
		"credit card",
		"mortgage",
		"loans",
		"loan",
		"other liabilities",
	]);

	const root: "Assets" | "Liabilities" =
		normalizedRoot === "liabilities" ||
		liabilitySubgroups.has(normalizedSubgroup)
			? "Liabilities"
			: "Assets";

	let subgroup =
		rawSubgroup?.trim() ||
		rawRoot.trim() ||
		(root === "Assets" ? "Cash" : "Credit Cards");

	if (normalize(subgroup) === "accounts") {
		subgroup = root === "Assets" ? "Cash" : "Credit Cards";
	}

	return {
		root,
		subgroup,
	};
}

function buildAccountGroups(
	options: TransactionFilterOption[],
): AccountRootGroup[] {
	const grouped = new Map<
		"Assets" | "Liabilities",
		Map<string, TransactionFilterOption[]>
	>();

	for (const rootName of ACCOUNT_ROOT_ORDER) {
		grouped.set(rootName, new Map());
	}

	for (const option of options) {
		const { root, subgroup } = parseAccountGroup(option);
		const subgroupMap = grouped.get(root) ?? new Map();
		const subgroupOptions = subgroupMap.get(subgroup) ?? [];

		subgroupOptions.push(option);
		subgroupMap.set(subgroup, subgroupOptions);
		grouped.set(root, subgroupMap);
	}

	return ACCOUNT_ROOT_ORDER.map((rootName) => {
		const subgroupMap = grouped.get(rootName) ?? new Map();
		const preferredOrder = ACCOUNT_SUBGROUP_ORDER[rootName];
		const subgroupNames = [
			...preferredOrder.filter((name) => {
				return subgroupMap.has(name);
			}),
			...[...subgroupMap.keys()].filter((name) => {
				return !preferredOrder.includes(name);
			}),
		];

		return {
			name: rootName,
			subgroups: subgroupNames.map((name) => {
				return {
					name,
					options: [...(subgroupMap.get(name) ?? [])].sort((first, second) => {
						return first.label.localeCompare(second.label);
					}),
				};
			}),
		};
	}).filter((group) => {
		return group.subgroups.length > 0;
	});
}

function AccountOptionIcon({ subgroup }: { subgroup: string }) {
	const normalized = normalize(subgroup);
	const Icon =
		normalized === "cash"
			? Landmark
			: normalized === "investments"
				? LineChart
				: normalized === "real estate" || normalized === "mortgage"
					? Home
					: normalized === "vehicles"
						? Car
						: normalized === "valuables"
							? Sparkles
							: normalized === "credit cards"
								? CreditCard
								: normalized === "loans"
									? Building2
									: WalletCards;

	return (
		<span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
			<Icon size={11} strokeWidth={2} />
		</span>
	);
}

function getOption(
	options: TransactionFilterOption[],
	value: string,
): TransactionFilterOption | undefined {
	return options.find((option) => {
		return !option.isParent && option.value === value;
	});
}

function getOptionLabel(
	options: TransactionFilterOption[],
	value: string,
): string {
	return getOption(options, value)?.label ?? value;
}

function buildCategoryGroups(
	options: TransactionFilterOption[],
): CategoryGroup[] {
	const parentByKey = new Map<string, TransactionFilterOption>();
	const childrenByParentKey = new Map<string, TransactionFilterOption[]>();
	const discoveredParentNames: string[] = [];
	const discoveredParentKeys = new Set<string>();

	const rememberParentName = (parentName: string) => {
		const key = normalize(parentName);

		if (!key || discoveredParentKeys.has(key)) {
			return;
		}

		discoveredParentKeys.add(key);
		discoveredParentNames.push(parentName);
	};

	for (const option of options) {
		if (option.isParent) {
			const key = normalize(option.label);
			parentByKey.set(key, option);
			rememberParentName(option.label);
			continue;
		}

		const parentName = option.group?.trim() || "Other categories";
		const parentKey = normalize(parentName);
		const children = childrenByParentKey.get(parentKey) ?? [];
		children.push(option);
		childrenByParentKey.set(parentKey, children);
		rememberParentName(parentName);
	}

	const orderedParentNames: string[] = [];
	const orderedParentKeys = new Set<string>();

	const appendParent = (parentName: string) => {
		const key = normalize(parentName);

		if (
			!key ||
			orderedParentKeys.has(key) ||
			(!parentByKey.has(key) && !childrenByParentKey.has(key))
		) {
			return;
		}

		orderedParentKeys.add(key);
		orderedParentNames.push(parentName);
	};

	for (const parentName of Object.keys(CATEGORY_HIERARCHY)) {
		appendParent(parentName);
	}

	for (const parentName of discoveredParentNames) {
		appendParent(parentName);
	}

	return orderedParentNames.map((parentName) => {
		const parentKey = normalize(parentName);
		const parent = parentByKey.get(parentKey) ?? {
			value: `__parent__:${parentName}`,
			label: parentName,
			isParent: true,
			iconName: parentName,
			colorKey: parentName,
		};
		const children = [...(childrenByParentKey.get(parentKey) ?? [])];
		const hierarchyOrder = CATEGORY_HIERARCHY[parentName] ?? [];
		const hierarchyRank = new Map(
			hierarchyOrder.map((childName, index) => {
				return [normalize(childName), index] as const;
			}),
		);
		const originalIndex = new Map(
			children.map((child, index) => {
				return [child.value, index] as const;
			}),
		);

		children.sort((first, second) => {
			const firstRank = hierarchyRank.get(normalize(first.label));
			const secondRank = hierarchyRank.get(normalize(second.label));

			if (firstRank !== undefined || secondRank !== undefined) {
				return (
					(firstRank ?? Number.MAX_SAFE_INTEGER) -
					(secondRank ?? Number.MAX_SAFE_INTEGER)
				);
			}

			return (
				(originalIndex.get(first.value) ?? 0) -
				(originalIndex.get(second.value) ?? 0)
			);
		});

		return { parent, children };
	});
}

function CategoryIcon({
	option,
	size = 15,
}: {
	option: TransactionFilterOption;
	size?: number;
}) {
	const iconName = option.iconName?.trim() || option.label;
	const Icon =
		CUSTOM_ICON_MAP[iconName] ??
		SYSTEM_ICON_MAP[iconName] ??
		SYSTEM_ICON_MAP[option.label] ??
		SYSTEM_ICON_MAP[option.group?.trim() || ""] ??
		Tag;
	const theme = getCategoryTheme(
		option.colorKey?.trim() || option.group?.trim() || option.label,
	);

	return <Icon size={size} strokeWidth={2} className={theme.text} />;
}

export function TransactionFilterPanel({
	filters,
	setFilters,
	data,
	onClear,
	onCancel,
	onApply,
	applyDisabled,
	visibleSections = FILTER_SECTIONS.map((section) => section.id),
	customSections = [],
	sectionOrder,
	initialSectionId,
	allowEmptyClear = false,
}: TransactionFilterPanelProps) {
	const availableSections = useMemo(() => {
		const builtInById = new Map(
			FILTER_SECTIONS.filter((section) => {
				return visibleSections.includes(section.id);
			}).map((section) => {
				return [section.id, section] as const;
			}),
		);
		const customById = new Map(
			customSections.map((section) => {
				return [section.id, section] as const;
			}),
		);
		const defaultOrder = [
			...visibleSections,
			...customSections.map((section) => section.id),
		];
		const order = sectionOrder ?? defaultOrder;
		const sections: Array<{ id: string; label: string }> = [];
		const seen = new Set<string>();

		for (const sectionId of order) {
			if (seen.has(sectionId)) {
				continue;
			}

			const section =
				builtInById.get(sectionId as TransactionFilterSection) ??
				customById.get(sectionId);

			if (section) {
				seen.add(sectionId);
				sections.push({ id: section.id, label: section.label });
			}
		}

		return sections;
	}, [customSections, sectionOrder, visibleSections]);
	const [activeSection, setActiveSection] = useState<string>(() => {
		return initialSectionId ?? availableSections[0]?.id ?? "categories";
	});
	const [query, setQuery] = useState("");
	const [explicitAccountSelectionKeys, setExplicitAccountSelectionKeys] =
		useState<Set<string>>(() => new Set());

	const transactionActiveCount = countActiveTransactionFilters(filters);
	const customActiveCount = customSections.reduce((count, section) => {
		return count + section.selectedValues.length;
	}, 0);
	const activeCount = transactionActiveCount + customActiveCount;

	const optionMaps = useMemo(() => {
		return {
			categoryNames: data.categories,
			merchantNames: data.merchants,
			accountNames: data.accounts,
			tags: data.tags,
			goalIds: data.goals,
		};
	}, [data]);

	const categoryGroups = useMemo(() => {
		return buildCategoryGroups(data.categories);
	}, [data.categories]);

	const toggleValue = (key: MultiSelectFilterKey, value: string) => {
		setFilters((current) => {
			const values = current[key];
			const nextValues = values.includes(value)
				? values.filter((currentValue) => currentValue !== value)
				: [...values, value];

			return {
				...current,
				[key]: nextValues,
			};
		});
	};

	const removeValue = (key: MultiSelectFilterKey, value: string) => {
		setFilters((current) => {
			return {
				...current,
				[key]: current[key].filter((currentValue) => {
					return currentValue !== value;
				}),
			};
		});
	};

	const renderCategorySection = () => {
		const normalizedQuery = normalize(query);
		const visibleGroups = categoryGroups
			.map((group) => {
				const parentMatches = normalize(group.parent.label).includes(
					normalizedQuery,
				);
				const children = normalizedQuery
					? parentMatches
						? group.children
						: group.children.filter((child) => {
								return [child.label, child.secondaryLabel, child.group].some(
									(value) => {
										return normalize(String(value ?? "")).includes(
											normalizedQuery,
										);
									},
								);
							})
					: group.children;

				return { ...group, children };
			})
			.filter((group) => {
				return group.children.length > 0;
			});
		const visibleChildren = visibleGroups.flatMap((group) => {
			return group.children.filter((child) => !child.disabled);
		});
		const selectedValues = filters.categoryNames;
		const allVisibleSelected =
			visibleChildren.length > 0 &&
			visibleChildren.every((child) => {
				return selectedValues.includes(child.value);
			});

		const someVisibleSelected = visibleChildren.some((child) => {
			return selectedValues.includes(child.value);
		});

		const updateChildren = (
			children: TransactionFilterOption[],
			shouldSelect: boolean,
		) => {
			const childValues = children
				.filter((child) => !child.disabled)
				.map((child) => child.value);

			setFilters((current) => {
				if (shouldSelect) {
					return {
						...current,
						categoryNames: [
							...new Set([...current.categoryNames, ...childValues]),
						],
					};
				}

				const valuesToRemove = new Set(childValues);

				return {
					...current,
					categoryNames: current.categoryNames.filter((value) => {
						return !valuesToRemove.has(value);
					}),
				};
			});
		};

		if (visibleGroups.length === 0) {
			return (
				<div className="flex h-full items-center justify-center px-6 text-center text-sm text-gray-500 dark:text-gray-400">
					No categories match this search.
				</div>
			);
		}

		return (
			<div className="px-3 py-2">
				<CheckboxRow
					checked={allVisibleSelected}
					indeterminate={!allVisibleSelected && someVisibleSelected}
					label="Select all"
					emphasized
					onChange={() => {
						updateChildren(visibleChildren, !allVisibleSelected);
					}}
				/>

				<div className="mt-1 space-y-1">
					{visibleGroups.map((group) => {
						const selectableChildren = group.children.filter((child) => {
							return !child.disabled;
						});
						const selectedChildCount = selectableChildren.filter((child) => {
							return selectedValues.includes(child.value);
						}).length;
						const allChildrenSelected =
							selectableChildren.length > 0 &&
							selectedChildCount === selectableChildren.length;
						const someChildrenSelected =
							selectedChildCount > 0 && !allChildrenSelected;

						return (
							<section key={group.parent.value}>
								<CheckboxRow
									checked={allChildrenSelected}
									indeterminate={someChildrenSelected}
									disabled={selectableChildren.length === 0}
									label={group.parent.label}
									icon={<CategoryIcon option={group.parent} size={16} />}
									emphasized
									onChange={() => {
										updateChildren(group.children, !allChildrenSelected);
									}}
								/>

								<div className="space-y-0.5">
									{group.children.map((child) => {
										return (
											<CheckboxRow
												key={child.value}
												checked={selectedValues.includes(child.value)}
												disabled={child.disabled}
												label={child.label}
												secondaryLabel={child.secondaryLabel}
												icon={<CategoryIcon option={child} />}
												indent
												onChange={() => {
													toggleValue("categoryNames", child.value);
												}}
											/>
										);
									})}
								</div>
							</section>
						);
					})}
				</div>
			</div>
		);
	};

	const renderListSection = ({
		key,
		options,
		showCounts = false,
		showGroups = false,
		emptyLabel,
	}: {
		key: MultiSelectFilterKey;
		options: TransactionFilterOption[];
		showCounts?: boolean;
		showGroups?: boolean;
		emptyLabel: string;
	}) => {
		const normalizedQuery = normalize(query);
		const visibleOptions = options.filter((option) => {
			if (!normalizedQuery) {
				return true;
			}

			return [option.label, option.group, option.secondaryLabel].some(
				(value) => {
					return normalize(String(value ?? "")).includes(normalizedQuery);
				},
			);
		});
		const selectableOptions = visibleOptions.filter((option) => {
			return !option.disabled;
		});
		const selectedValues = filters[key];
		const allVisibleSelected =
			selectableOptions.length > 0 &&
			selectableOptions.every((option) => {
				return selectedValues.includes(option.value);
			});

		const groupedOptions = new Map<string, TransactionFilterOption[]>();

		for (const option of visibleOptions) {
			const groupName = showGroups ? option.group?.trim() || "Other" : "";
			const currentOptions = groupedOptions.get(groupName) ?? [];
			currentOptions.push(option);
			groupedOptions.set(groupName, currentOptions);
		}

		if (visibleOptions.length === 0) {
			return (
				<div className="flex h-full items-center justify-center px-8 text-center text-sm text-gray-500 dark:text-gray-400">
					{emptyLabel}
				</div>
			);
		}

		return (
			<div className="px-3 py-2">
				<CheckboxRow
					checked={allVisibleSelected}
					label="Select all"
					onChange={() => {
						setFilters((current) => {
							const currentValues = current[key];
							const visibleValues = selectableOptions.map((option) => {
								return option.value;
							});

							if (allVisibleSelected) {
								return {
									...current,
									[key]: currentValues.filter((value) => {
										return !visibleValues.includes(value);
									}),
								};
							}

							return {
								...current,
								[key]: [...new Set([...currentValues, ...visibleValues])],
							};
						});
					}}
				/>

				{[...groupedOptions.entries()].map(([groupName, groupOptions]) => {
					return (
						<div key={groupName || "ungrouped"} className="mt-2">
							{showGroups && groupName && (
								<p className="px-2 pb-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
									{groupName}
								</p>
							)}

							<div className="space-y-1">
								{groupOptions.map((option) => {
									return (
										<CheckboxRow
											key={option.value}
											checked={selectedValues.includes(option.value)}
											disabled={option.disabled}
											label={option.label}
											secondaryLabel={option.secondaryLabel}
											content={
												key === "merchantNames" && option.merchant ? (
													<MerchantOptionContent
														merchant={option.merchant}
														size="sm"
													/>
												) : undefined
											}
											icon={
												key === "tags" ? (
													<Tag size={15} strokeWidth={1.8} />
												) : undefined
											}
											count={
												key !== "merchantNames" && showCounts
													? option.count
													: undefined
											}
											onChange={() => {
												toggleValue(key, option.value);
											}}
										/>
									);
								})}
							</div>
						</div>
					);
				})}
			</div>
		);
	};

	const renderAccountSection = () => {
		const normalizedQuery = normalize(query);
		const accountGroups = buildAccountGroups(data.accounts);
		const visibleGroups = accountGroups
			.map((rootGroup) => {
				const rootMatches = normalize(rootGroup.name).includes(normalizedQuery);

				const subgroups = rootGroup.subgroups
					.map((subgroup) => {
						const subgroupMatches = normalize(subgroup.name).includes(
							normalizedQuery,
						);

						const options =
							!normalizedQuery || rootMatches || subgroupMatches
								? subgroup.options
								: subgroup.options.filter((option) => {
										return [option.label, option.secondaryLabel].some(
											(value) => {
												return normalize(String(value ?? "")).includes(
													normalizedQuery,
												);
											},
										);
									});

						return {
							...subgroup,
							options,
						};
					})
					.filter((subgroup) => {
						return subgroup.options.length > 0;
					});

				return {
					...rootGroup,
					subgroups,
				};
			})
			.filter((rootGroup) => {
				return rootGroup.subgroups.length > 0;
			});

		const visibleOptions = visibleGroups.flatMap((rootGroup) => {
			return rootGroup.subgroups.flatMap((subgroup) => {
				return subgroup.options.filter((option) => {
					return !option.disabled;
				});
			});
		});
		const selectedValues = filters.accountNames;
		const selectAllKey = "account:all";
		const getRootKey = (rootName: AccountRootGroup["name"]): string => {
			return `account:root:${rootName}`;
		};
		const getSubgroupKey = (
			rootName: AccountRootGroup["name"],
			subgroupName: string,
		): string => {
			return `account:subgroup:${rootName}:${subgroupName}`;
		};

		const updateExplicitSelectionKeys = (
			keys: string[],
			shouldSelect: boolean,
		): void => {
			setExplicitAccountSelectionKeys((current) => {
				const next = new Set(current);

				for (const key of keys) {
					if (shouldSelect) {
						next.add(key);
					} else {
						next.delete(key);
					}
				}

				return next;
			});
		};

		const clearExplicitAncestorSelections = (
			rootName: AccountRootGroup["name"],
			subgroupName?: string,
		): void => {
			setExplicitAccountSelectionKeys((current) => {
				const next = new Set(current);

				next.delete(selectAllKey);
				next.delete(getRootKey(rootName));

				if (subgroupName) {
					next.delete(getSubgroupKey(rootName, subgroupName));
				}

				return next;
			});
		};

		const updateAccountOptions = (
			options: TransactionFilterOption[],
			shouldSelect: boolean,
		): void => {
			const optionValues = options
				.filter((option) => {
					return !option.disabled;
				})
				.map((option) => {
					return option.value;
				});

			setFilters((current) => {
				if (shouldSelect) {
					return {
						...current,
						accountNames: [
							...new Set([...current.accountNames, ...optionValues]),
						],
					};
				}

				const valuesToRemove = new Set(optionValues);

				return {
					...current,
					accountNames: current.accountNames.filter((value) => {
						return !valuesToRemove.has(value);
					}),
				};
			});
		};

		if (visibleGroups.length === 0) {
			return (
				<div className="flex h-full items-center justify-center px-8 text-center text-sm text-gray-500 dark:text-gray-400">
					No accounts match this search.
				</div>
			);
		}

		return (
			<div className="px-3 py-2">
				<CheckboxRow
					checked={explicitAccountSelectionKeys.has(selectAllKey)}
					label="Select all"
					emphasized
					indentLevel={0}
					onChange={() => {
						const shouldSelect =
							!explicitAccountSelectionKeys.has(selectAllKey);
						const hierarchyKeys = visibleGroups.flatMap((rootGroup) => {
							return [
								getRootKey(rootGroup.name),
								...rootGroup.subgroups.map((subgroup) => {
									return getSubgroupKey(rootGroup.name, subgroup.name);
								}),
							];
						});

						updateAccountOptions(visibleOptions, shouldSelect);
						updateExplicitSelectionKeys(
							[selectAllKey, ...hierarchyKeys],
							shouldSelect,
						);
					}}
				/>

				<div className="mt-1 space-y-1">
					{visibleGroups.map((rootGroup) => {
						const rootOptions = rootGroup.subgroups.flatMap((subgroup) => {
							return subgroup.options.filter((option) => {
								return !option.disabled;
							});
						});

						return (
							<section key={rootGroup.name}>
								<CheckboxRow
									checked={explicitAccountSelectionKeys.has(
										getRootKey(rootGroup.name),
									)}
									label={rootGroup.name}
									emphasized
									indentLevel={1}
									onChange={() => {
										const rootKey = getRootKey(rootGroup.name);
										const shouldSelect =
											!explicitAccountSelectionKeys.has(rootKey);
										const subgroupKeys = rootGroup.subgroups.map((subgroup) => {
											return getSubgroupKey(rootGroup.name, subgroup.name);
										});

										updateAccountOptions(rootOptions, shouldSelect);
										updateExplicitSelectionKeys(
											[rootKey, ...subgroupKeys],
											shouldSelect,
										);

										if (!shouldSelect) {
											updateExplicitSelectionKeys([selectAllKey], false);
										}
									}}
								/>

								{rootGroup.subgroups.map((subgroup) => {
									const subgroupOptions = subgroup.options.filter((option) => {
										return !option.disabled;
									});

									return (
										<div key={`${rootGroup.name}:${subgroup.name}`}>
											<CheckboxRow
												checked={explicitAccountSelectionKeys.has(
													getSubgroupKey(rootGroup.name, subgroup.name),
												)}
												label={subgroup.name}
												emphasized
												indentLevel={2}
												onChange={() => {
													const subgroupKey = getSubgroupKey(
														rootGroup.name,
														subgroup.name,
													);
													const shouldSelect =
														!explicitAccountSelectionKeys.has(subgroupKey);

													updateAccountOptions(subgroupOptions, shouldSelect);
													updateExplicitSelectionKeys(
														[subgroupKey],
														shouldSelect,
													);

													if (!shouldSelect) {
														clearExplicitAncestorSelections(rootGroup.name);
													}
												}}
											/>

											{subgroup.options.map((option) => {
												return (
													<CheckboxRow
														key={option.value}
														checked={selectedValues.includes(option.value)}
														disabled={option.disabled}
														label={option.label}
														secondaryLabel={option.secondaryLabel}
														icon={
															<AccountOptionIcon subgroup={subgroup.name} />
														}
														indentLevel={3}
														onChange={() => {
															toggleValue("accountNames", option.value);
															clearExplicitAncestorSelections(
																rootGroup.name,
																subgroup.name,
															);
														}}
													/>
												);
											})}
										</div>
									);
								})}
							</section>
						);
					})}
				</div>
			</div>
		);
	};

	const renderCustomSection = (
		section: TransactionFilterPanelCustomSection,
	) => {
		const normalizedQuery = normalize(query);
		const visibleOptions = section.options.filter((option) => {
			if (!normalizedQuery) {
				return true;
			}

			return [option.label, option.group, option.secondaryLabel].some(
				(value) => {
					return normalize(String(value ?? "")).includes(normalizedQuery);
				},
			);
		});
		const selectableOptions = visibleOptions.filter((option) => {
			return !option.disabled;
		});
		const allVisibleSelected =
			selectableOptions.length > 0 &&
			selectableOptions.every((option) => {
				return section.selectedValues.includes(option.value);
			});

		if (visibleOptions.length === 0) {
			return (
				<div className="flex h-full items-center justify-center px-8 text-center text-sm text-gray-500 dark:text-gray-400">
					{section.emptyLabel ?? "No options match this search."}
				</div>
			);
		}

		return (
			<div className="px-3 py-2">
				<CheckboxRow
					checked={allVisibleSelected}
					label="Select all"
					onChange={() => {
						for (const option of selectableOptions) {
							const isSelected = section.selectedValues.includes(option.value);

							if (allVisibleSelected ? isSelected : !isSelected) {
								section.onToggle(option.value);
							}
						}
					}}
				/>

				<div className="mt-1 space-y-1">
					{visibleOptions.map((option) => {
						return (
							<CheckboxRow
								key={option.value}
								checked={section.selectedValues.includes(option.value)}
								disabled={option.disabled}
								label={option.label}
								secondaryLabel={option.secondaryLabel}
								count={section.showCounts ? option.count : undefined}
								onChange={() => {
									section.onToggle(option.value);
								}}
							/>
						);
					})}
				</div>
			</div>
		);
	};

	const renderActiveSection = () => {
		const customSection = customSections.find((section) => {
			return section.id === activeSection;
		});

		if (customSection) {
			return renderCustomSection(customSection);
		}

		if (activeSection === "categories") {
			return renderCategorySection();
		}

		if (activeSection === "merchants") {
			return renderListSection({
				key: "merchantNames",
				options: data.merchants,
				showCounts: true,
				emptyLabel: "No merchants match this search.",
			});
		}

		if (activeSection === "accounts") {
			return renderAccountSection();
		}

		if (activeSection === "tags") {
			return renderListSection({
				key: "tags",
				options: data.tags,
				emptyLabel: "No tags match this search.",
			});
		}

		if (activeSection === "goals") {
			return renderListSection({
				key: "goalIds",
				options: data.goals,
				emptyLabel:
					"No goals are available yet. Pass goal options when goal data is added to the store.",
			});
		}

		if (activeSection === "amount") {
			return (
				<div className="space-y-5 px-4 py-3">
					<div>
						<p className="mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
							Amount
						</p>

						<div className="space-y-1">
							{AMOUNT_OPTIONS.map((option) => {
								return (
									<RadioRow
										key={option.value}
										checked={filters.amountMode === option.value}
										label={option.label}
										onChange={() => {
											setFilters((current) => ({
												...current,
												amountMode: option.value,
											}));
										}}
									/>
								);
							})}
						</div>

						{filters.amountMode !== "none" && (
							<div className="mt-3 flex items-center gap-2 pl-1">
								<AmountInput
									value={filters.amountValue}
									onChange={(amountValue) => {
										setFilters((current) => ({
											...current,
											amountValue,
										}));
									}}
								/>

								{filters.amountMode === "between" && (
									<>
										<span className="text-sm text-gray-500">and</span>
										<AmountInput
											value={filters.amountMaxValue}
											onChange={(amountMaxValue) => {
												setFilters((current) => ({
													...current,
													amountMaxValue,
												}));
											}}
										/>
									</>
								)}
							</div>
						)}
					</div>

					<TriStateRadioGroup<TransactionTypeFilter>
						label="Type"
						value={filters.transactionType}
						options={[
							{ value: "debits", label: "Debits only" },
							{ value: "credits", label: "Credits only" },
						]}
						onChange={(transactionType) => {
							setFilters((current) => ({
								...current,
								transactionType,
							}));
						}}
					/>
				</div>
			);
		}

		return (
			<div className="space-y-5 px-4 py-3">
				<TriStateRadioGroup<TriStateFilter>
					label="Needs review"
					value={filters.needsReview}
					options={[
						{ value: "yes", label: "Needs review" },
						{ value: "no", label: "Does not need review" },
					]}
					onChange={(needsReview) => {
						setFilters((current) => ({
							...current,
							needsReview,
						}));
					}}
				/>

				<TriStateRadioGroup<TriStateFilter>
					label="Recurring"
					value={filters.recurring}
					options={[
						{ value: "yes", label: "Recurring" },
						{ value: "no", label: "Not recurring" },
					]}
					onChange={(recurring) => {
						setFilters((current) => ({
							...current,
							recurring,
						}));
					}}
				/>

				<TriStateRadioGroup<TriStateFilter>
					label="Has attachments"
					value={filters.attachments}
					options={[
						{ value: "yes", label: "Has attachments" },
						{ value: "no", label: "No attachments" },
					]}
					onChange={(attachments) => {
						setFilters((current) => ({
							...current,
							attachments,
						}));
					}}
				/>

				<TriStateRadioGroup<TriStateFilter>
					label="Split"
					value={filters.split}
					options={[
						{ value: "yes", label: "Split" },
						{ value: "no", label: "Not split" },
					]}
					onChange={(split) => {
						setFilters((current) => ({
							...current,
							split,
						}));
					}}
				/>
			</div>
		);
	};

	const selectedItems = (() => {
		const items: Array<{
			id: string;
			section: string;
			label: string;
			icon?: ReactNode;
			onRemove: () => void;
		}> = [];

		const addMultiSelectItems = (
			key: MultiSelectFilterKey,
			section: string,
		) => {
			for (const value of filters[key]) {
				const option = getOption(optionMaps[key], value);

				items.push({
					id: `${key}:${value}`,
					section,
					label: getOptionLabel(optionMaps[key], value),
					icon:
						key === "categoryNames" && option ? (
							<CategoryIcon option={option} />
						) : undefined,
					onRemove: () => {
						removeValue(key, value);
					},
				});
			}
		};

		addMultiSelectItems("categoryNames", "Category");
		addMultiSelectItems("merchantNames", "Merchant");
		addMultiSelectItems("accountNames", "Account");
		addMultiSelectItems("tags", "Tag");
		addMultiSelectItems("goalIds", "Goal");

		if (filters.amountMode !== "none") {
			const amountModeLabel =
				AMOUNT_OPTIONS.find((option) => option.value === filters.amountMode)
					?.label ?? "Amount";
			const amountLabel =
				filters.amountMode === "between"
					? `${amountModeLabel} $${filters.amountValue || "…"} and $${
							filters.amountMaxValue || "…"
						}`
					: `${amountModeLabel} $${filters.amountValue || "…"}`;

			items.push({
				id: "amount",
				section: "Amount",
				label: amountLabel,
				onRemove: () => {
					setFilters((current) => ({
						...current,
						amountMode: "none",
						amountValue: "",
						amountMaxValue: "",
					}));
				},
			});
		}

		if (filters.transactionType !== "all") {
			items.push({
				id: "transaction-type",
				section: "Amount",
				label:
					filters.transactionType === "debits" ? "Debits only" : "Credits only",
				onRemove: () => {
					setFilters((current) => ({
						...current,
						transactionType: "all",
					}));
				},
			});
		}

		const addTriStateItem = (
			id: string,
			section: string,
			value: TriStateFilter,
			yesLabel: string,
			noLabel: string,
			clear: () => void,
		) => {
			if (value === "any") {
				return;
			}

			items.push({
				id,
				section,
				label: value === "yes" ? yesLabel : noLabel,
				onRemove: clear,
			});
		};

		addTriStateItem(
			"needs-review",
			"Other",
			filters.needsReview,
			"Needs review",
			"Does not need review",
			() => {
				setFilters((current) => ({ ...current, needsReview: "any" }));
			},
		);
		addTriStateItem(
			"recurring",
			"Other",
			filters.recurring,
			"Recurring",
			"Not recurring",
			() => {
				setFilters((current) => ({ ...current, recurring: "any" }));
			},
		);
		addTriStateItem(
			"attachments",
			"Other",
			filters.attachments,
			"Has attachments",
			"No attachments",
			() => {
				setFilters((current) => ({ ...current, attachments: "any" }));
			},
		);
		addTriStateItem(
			"split",
			"Other",
			filters.split,
			"Split",
			"Not split",
			() => {
				setFilters((current) => ({ ...current, split: "any" }));
			},
		);

		for (const section of customSections) {
			for (const value of section.selectedValues) {
				const option = section.options.find((candidate) => {
					return candidate.value === value;
				});

				items.push({
					id: `${section.id}:${value}`,
					section: `custom:${section.id}`,
					label: option?.label ?? value,
					onRemove: () => {
						section.onToggle(value);
					},
				});
			}
		}

		return items;
	})();

	const selectedGroups = [
		{ label: "Categories", itemSection: "Category" },
		{ label: "Merchants", itemSection: "Merchant" },
		{ label: "Accounts", itemSection: "Account" },
		{ label: "Tags", itemSection: "Tag" },
		{ label: "Goals", itemSection: "Goal" },
		{ label: "Amount", itemSection: "Amount" },
		{ label: "Other", itemSection: "Other" },
		...customSections.map((section) => ({
			label: section.selectedGroupLabel ?? section.label,
			itemSection: `custom:${section.id}`,
		})),
	]
		.map((group) => ({
			...group,
			items: selectedItems.filter((item) => item.section === group.itemSection),
		}))
		.filter((group) => group.items.length > 0);

	const clearSelectedGroup = (itemSection: string) => {
		if (itemSection.startsWith("custom:")) {
			const sectionId = itemSection.slice("custom:".length);
			customSections.find((section) => section.id === sectionId)?.onClear();
			return;
		}

		setFilters((current) => {
			if (itemSection === "Category") {
				return { ...current, categoryNames: [] };
			}

			if (itemSection === "Merchant") {
				return { ...current, merchantNames: [] };
			}

			if (itemSection === "Account") {
				return { ...current, accountNames: [] };
			}

			if (itemSection === "Tag") {
				return { ...current, tags: [] };
			}

			if (itemSection === "Goal") {
				return { ...current, goalIds: [] };
			}

			if (itemSection === "Amount") {
				return {
					...current,
					amountMode: "none",
					amountValue: "",
					amountMaxValue: "",
					transactionType: "all",
				};
			}

			return {
				...current,
				needsReview: "any",
				recurring: "any",
				attachments: "any",
				split: "any",
			};
		});
	};

	return (
		<div className="flex h-[min(610px,calc(100vh-96px))] min-h-[460px] flex-col">
			<div className="grid min-h-0 flex-1 grid-cols-[180px_350px_minmax(260px,1fr)]">
				<aside className="border-r border-gray-200 dark:border-white/10">
					<h2 className="flex h-14 items-center border-b border-gray-200 px-5 text-lg font-semibold text-gray-900 dark:border-white/10 dark:text-white">
						Filters
					</h2>

					<nav className="space-y-0.5 px-2 py-2">
						{availableSections.map((section) => {
							return (
								<button
									key={section.id}
									type="button"
									onClick={() => {
										setActiveSection(section.id);
										setQuery("");
									}}
									className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
										activeSection === section.id
											? "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300"
											: "text-gray-800 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-white/5"
									}`}
								>
									{section.label}
								</button>
							);
						})}
					</nav>
				</aside>

				<section className="flex min-h-0 flex-col border-r border-gray-200 dark:border-white/10">
					<label className="flex h-14 items-center gap-2.5 border-b border-gray-200 px-4 dark:border-white/10">
						<Search size={19} className="text-gray-500" strokeWidth={2} />
						<input
							value={query}
							onChange={(event) => {
								setQuery(event.target.value);
							}}
							placeholder="Search..."
							className="min-w-0 flex-1 bg-transparent text-base text-gray-900 outline-none placeholder:text-gray-400 dark:text-white"
						/>
						{query && (
							<button
								type="button"
								aria-label="Clear filter search"
								onClick={() => {
									setQuery("");
								}}
								className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/10 dark:hover:text-white"
							>
								<X size={17} />
							</button>
						)}
					</label>

					<div className="min-h-0 flex-1 overflow-y-auto">
						{renderActiveSection()}
					</div>
				</section>

				<section className="flex min-h-0 flex-col">
					<div className="flex h-14 items-center border-b border-gray-200 px-4 dark:border-white/10">
						<h3 className="text-base font-semibold text-gray-500 dark:text-gray-400">
							{activeCount} {activeCount === 1 ? "filter" : "filters"} selected
						</h3>
					</div>

					<div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
						{selectedGroups.length === 0 ? (
							<div className="flex h-full items-center justify-center text-center text-sm text-gray-400">
								Selected filters will appear here.
							</div>
						) : (
							<div className="space-y-4">
								{selectedGroups.map((group) => {
									return (
										<section key={group.itemSection}>
											<div className="mb-1.5 flex items-center justify-between gap-3">
												<h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400">
													{group.label}
												</h4>
												<button
													type="button"
													onClick={() => {
														clearSelectedGroup(group.itemSection);
													}}
													className="text-xs font-semibold text-cyan-600 transition-colors hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300"
												>
													Clear
												</button>
											</div>

											<div className="space-y-1">
												{group.items.map((item) => {
													return (
														<div
															key={item.id}
															className="flex min-h-9 items-center justify-between gap-3"
														>
															<div className="flex min-w-0 items-center gap-2">
																{item.icon && (
																	<span className="shrink-0">{item.icon}</span>
																)}
																<p className="min-w-0 truncate text-sm font-medium text-gray-900 dark:text-white">
																	{item.label}
																</p>
															</div>
															<button
																type="button"
																aria-label={`Remove ${item.label} filter`}
																onClick={item.onRemove}
																className="shrink-0 rounded-full text-gray-400 transition-colors hover:text-gray-700 dark:hover:text-gray-200"
															>
																<CircleX size={18} strokeWidth={2.2} />
															</button>
														</div>
													);
												})}
											</div>
										</section>
									);
								})}
							</div>
						)}
					</div>
				</section>
			</div>

			<div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-[#1B1B1B]">
				<button
					type="button"
					onClick={() => {
						setExplicitAccountSelectionKeys(new Set());
						onClear();
					}}
					disabled={activeCount === 0 && !allowEmptyClear}
					className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-45 dark:border-white/10 dark:bg-white/5 dark:text-gray-200 dark:hover:bg-white/10"
				>
					Clear
				</button>

				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={onCancel}
						className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm transition-colors hover:bg-gray-50 dark:border-white/10 dark:bg-[#222] dark:text-white dark:hover:bg-white/5"
					>
						Cancel
					</button>
					<button
						type="button"
						onClick={onApply}
						disabled={applyDisabled}
						className="rounded-lg bg-[#FF5A35] px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#E04825] disabled:cursor-not-allowed disabled:opacity-45"
					>
						Apply
					</button>
				</div>
			</div>
		</div>
	);
}

function CheckboxRow({
	checked,
	label,
	onChange,
	secondaryLabel,
	count,
	icon,
	content,
	disabled = false,
	indent = false,
	indentLevel,
	indeterminate = false,
	emphasized = false,
}: {
	checked: boolean;
	label: string;
	onChange: () => void;
	secondaryLabel?: string;
	count?: number;
	icon?: ReactNode;
	content?: ReactNode;
	disabled?: boolean;
	indent?: boolean;
	indentLevel?: 0 | 1 | 2 | 3;
	indeterminate?: boolean;
	emphasized?: boolean;
}) {
	const checkboxRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (!checkboxRef.current) {
			return;
		}

		checkboxRef.current.indeterminate = indeterminate;
	}, [indeterminate]);

	return (
		<label
			className={`flex min-h-9 items-center gap-2 rounded-md py-1.5 pr-2 transition-colors ${
				indentLevel === 3
					? "pl-16"
					: indentLevel === 2
						? "pl-12"
						: indentLevel === 1 || indent
							? "pl-7"
							: "pl-2"
			} ${
				disabled
					? "cursor-not-allowed opacity-45"
					: "cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5"
			}`}
		>
			<input
				ref={checkboxRef}
				type="checkbox"
				checked={checked}
				disabled={disabled}
				aria-checked={indeterminate ? "mixed" : checked}
				onChange={onChange}
				className="h-4 w-4 shrink-0 rounded border-gray-300 text-[#FF5A35] focus:ring-[#FF5A35]/30 dark:border-white/20 dark:bg-transparent"
			/>

			{content ? (
				<div className="min-w-0 flex-1">{content}</div>
			) : (
				<>
					{icon && <span className="shrink-0 text-gray-500">{icon}</span>}

					<div className="min-w-0 flex-1">
						<span
							className={`block truncate text-sm ${
								emphasized ? "font-semibold" : "font-normal"
							}`}
						>
							{label}
						</span>

						{secondaryLabel && (
							<p className="truncate text-xs text-gray-400">{secondaryLabel}</p>
						)}
					</div>

					{typeof count === "number" && (
						<span className="shrink-0 text-sm tabular-nums text-gray-500 dark:text-gray-400">
							{count}
						</span>
					)}
				</>
			)}
		</label>
	);
}

function RadioRow({
	checked,
	label,
	onChange,
}: {
	checked: boolean;
	label: string;
	onChange: () => void;
}) {
	return (
		<label className="flex min-h-9 cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-white/5">
			<input
				type="radio"
				checked={checked}
				onChange={onChange}
				className="h-4 w-4 border-gray-300 text-[#FF5A35] focus:ring-[#FF5A35]/30 dark:border-white/20 dark:bg-transparent"
			/>
			<span className="text-sm text-gray-900 dark:text-gray-100">{label}</span>
		</label>
	);
}

function AmountInput({
	value,
	onChange,
}: {
	value: string;
	onChange: (value: string) => void;
}) {
	return (
		<label className="flex h-9 w-32 items-center rounded-lg border border-gray-300 bg-white px-2.5 focus-within:border-cyan-500 focus-within:ring-2 focus-within:ring-cyan-500/15 dark:border-white/15 dark:bg-transparent">
			<span className="mr-1 text-gray-400">$</span>
			<input
				inputMode="decimal"
				value={value}
				onChange={(event) => {
					onChange(event.target.value.replace(/[^0-9.,]/g, ""));
				}}
				placeholder="0.00"
				className="min-w-0 flex-1 bg-transparent text-sm text-gray-900 outline-none dark:text-white"
			/>
		</label>
	);
}

function TriStateRadioGroup<T extends string>({
	label,
	value,
	options,
	onChange,
}: {
	label: string;
	value: T;
	options: ReadonlyArray<{ value: T; label: string }>;
	onChange: (value: T) => void;
}) {
	return (
		<div>
			<div className="mb-1 flex items-center justify-between">
				<p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
					{label}
				</p>
				{value !== "any" && value !== "all" && (
					<button
						type="button"
						onClick={() => {
							onChange(
								(value === "debits" || value === "credits"
									? "all"
									: "any") as T,
							);
						}}
						className="text-xs font-semibold text-cyan-600 hover:text-cyan-700 dark:text-cyan-400"
					>
						Clear
					</button>
				)}
			</div>
			<div className="space-y-1">
				{options.map((option) => {
					return (
						<RadioRow
							key={option.value}
							checked={value === option.value}
							label={option.label}
							onChange={() => {
								onChange(option.value);
							}}
						/>
					);
				})}
			</div>
		</div>
	);
}
