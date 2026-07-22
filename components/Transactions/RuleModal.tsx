"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
	autoUpdate,
	flip,
	offset,
	shift,
	size,
	useDismiss,
	useFloating,
	useInteractions,
} from "@floating-ui/react";
import {
	AlertCircle,
	Check,
	ChevronDown,
	CircleMinus,
	CirclePlus,
	Loader2,
	Plus,
	Search,
	Trash2,
	X,
} from "lucide-react";

import { CategorySelector } from "@/components/CategorySelector";
import { CategoryIcon } from "@/components/CategoryIcon";
import { MerchantOptionContent } from "@/components/Merchants/MerchantOptionContent";
import type { MerchantListItem } from "@/components/Merchants/types";
import { findParentCategory, getCategoryTheme } from "@/constants";
import { useMerchantOptions } from "@/hooks/useMerchantOptions";
import {
	type Account,
	type Merchant,
	type Transaction,
	useBudgetStore,
} from "@/store/useBudgetStore";
import {
	describeRuleChanges,
	getOriginalStatement,
	hasRuleActions,
	hasRuleCriteria,
	matchesTransactionRule,
	type RuleAmountDirection,
	type RuleAmountOperator,
	type RuleReviewStatus,
	type RuleTextOperator,
	type TransactionRule,
} from "@/lib/rules/ruleEngine";

export interface RuleModalSeed {
	sourceTransaction?: Transaction | null;
	renameMerchant?: Pick<Merchant, "id" | "name"> | null;
	updateCategory?: string | null;
}

interface RuleModalSaveOptions {
	applyToExisting: boolean;
	matchingTransactions: Transaction[];
}

interface RuleModalProps {
	isOpen: boolean;
	initialRule?: TransactionRule | null;
	seed?: RuleModalSeed | null;
	transactions: Transaction[];
	accounts: Account[];
	merchants: Merchant[];
	categories: string[];
	tags: string[];
	onClose: () => void;
	onSave: (
		rule: TransactionRule,
		options: RuleModalSaveOptions,
	) => Promise<void> | void;
	onDelete?: (rule: TransactionRule) => Promise<void> | void;
}

type RuleModalTab = "settings" | "preview";

interface TextCriterionConditionDraft {
	id: string;
	operator: RuleTextOperator;
	value: string;
}

interface TextCriterionDraft {
	enabled: boolean;
	conditions: TextCriterionConditionDraft[];
}

interface AmountCriterionDraft {
	enabled: boolean;
	direction: RuleAmountDirection;
	operator: RuleAmountOperator;
	value: string;
}

interface MultiCriterionDraft {
	enabled: boolean;
	values: string[];
}

interface RenameMerchantDraft {
	enabled: boolean;
	merchantId: string;
	name: string;
}

interface RuleDraft {
	id: string;
	name: string;
	originalStatement: TextCriterionDraft;
	merchantName: TextCriterionDraft;
	amount: AmountCriterionDraft;
	categories: MultiCriterionDraft;
	accounts: MultiCriterionDraft;
	renameMerchant: RenameMerchantDraft;
	updateCategory: {
		enabled: boolean;
		value: string;
	};
	addTags: MultiCriterionDraft;
	hideTransaction: {
		enabled: boolean;
	};
	reviewStatus: {
		enabled: boolean;
		value: RuleReviewStatus;
	};
}

interface ValidationErrors {
	criteria?: string;
	actions?: string;
	originalStatement?: string;
	merchantName?: string;
	amount?: string;
	categories?: string;
	accounts?: string;
	renameMerchant?: string;
	updateCategory?: string;
	addTags?: string;
}

interface Option {
	value: string;
	label: string;
}

function createId(): string {
	if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
		return crypto.randomUUID();
	}

	return `rule-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function createTextCondition(
	value = "",
	operator: RuleTextOperator = "contains",
): TextCriterionConditionDraft {
	return {
		id: createId(),
		operator,
		value,
	};
}

function normalize(value?: string | null): string {
	return value?.trim().toLowerCase().replace(/\s+/g, " ") ?? "";
}

function uniqueStrings(values: string[]): string[] {
	const result: string[] = [];
	const seen = new Set<string>();

	for (const value of values) {
		const trimmed = value.trim();
		const key = normalize(trimmed);

		if (!key || seen.has(key)) {
			continue;
		}

		seen.add(key);
		result.push(trimmed);
	}

	return result;
}

function createDraft(
	initialRule?: TransactionRule | null,
	seed?: RuleModalSeed | null,
): RuleDraft {
	if (initialRule) {
		return {
			id: initialRule.id,
			name: initialRule.name,
			originalStatement: {
				enabled: Boolean(initialRule.criteria.originalStatement),
				conditions: [
					createTextCondition(
						initialRule.criteria.originalStatement?.value ?? "",
						initialRule.criteria.originalStatement?.operator ?? "contains",
					),
				],
			},
			merchantName: {
				enabled: Boolean(initialRule.criteria.merchantName),
				conditions: [
					createTextCondition(
						initialRule.criteria.merchantName?.value ?? "",
						initialRule.criteria.merchantName?.operator ?? "contains",
					),
				],
			},
			amount: {
				enabled: Boolean(initialRule.criteria.amount),
				direction: initialRule.criteria.amount?.direction ?? "debit",
				operator: initialRule.criteria.amount?.operator ?? "greater_than",
				value:
					initialRule.criteria.amount?.value !== undefined
						? String(initialRule.criteria.amount.value)
						: "",
			},
			categories: {
				enabled: Boolean(initialRule.criteria.categories?.length),
				values: [...(initialRule.criteria.categories ?? [])],
			},
			accounts: {
				enabled: Boolean(initialRule.criteria.accountIds?.length),
				values: [...(initialRule.criteria.accountIds ?? [])],
			},
			renameMerchant: {
				enabled: Boolean(initialRule.actions.renameMerchant),
				merchantId: initialRule.actions.renameMerchant?.merchantId ?? "",
				name: initialRule.actions.renameMerchant?.name ?? "",
			},
			updateCategory: {
				enabled: Boolean(initialRule.actions.updateCategory),
				value: initialRule.actions.updateCategory ?? "",
			},
			addTags: {
				enabled: Boolean(initialRule.actions.addTags?.length),
				values: [...(initialRule.actions.addTags ?? [])],
			},
			hideTransaction: {
				enabled: initialRule.actions.hideTransaction === true,
			},
			reviewStatus: {
				enabled: Boolean(initialRule.actions.reviewStatus),
				value: initialRule.actions.reviewStatus ?? "needs_review",
			},
		};
	}

	const source = seed?.sourceTransaction ?? null;
	const renamedMerchant = seed?.renameMerchant ?? null;
	const requestedCategory = seed?.updateCategory?.trim() ?? "";
	const originalStatement = source ? getOriginalStatement(source) : "";
	const sourceMerchant = source?.merchant?.trim() ?? "";
	const sourceCategory = source?.category?.trim() ?? "";
	const isMerchantRename = Boolean(renamedMerchant);
	const isCategoryUpdate = Boolean(requestedCategory);

	return {
		id: createId(),
		name: isMerchantRename
			? `Rename ${originalStatement || sourceMerchant}`
			: isCategoryUpdate
				? `Categorize ${sourceMerchant} as ${requestedCategory}`
				: sourceMerchant
					? `${sourceMerchant} rule`
					: "New transaction rule",
		originalStatement: {
			enabled: Boolean(isMerchantRename && originalStatement),
			conditions: [
				createTextCondition(isMerchantRename ? originalStatement : ""),
			],
		},
		merchantName: {
			enabled: Boolean(!isMerchantRename && sourceMerchant),
			conditions: [
				createTextCondition(!isMerchantRename ? sourceMerchant : ""),
			],
		},
		amount: {
			enabled: false,
			direction:
				source?.amount !== undefined && source.amount >= 0 ? "credit" : "debit",
			operator: "greater_than",
			value: "",
		},
		categories: {
			enabled: false,
			values: [],
		},
		accounts: {
			enabled: false,
			values: [],
		},
		renameMerchant: {
			enabled: isMerchantRename,
			merchantId: renamedMerchant?.id ?? "",
			name: renamedMerchant?.name ?? "",
		},
		updateCategory: {
			enabled: Boolean(
				!isMerchantRename && (requestedCategory || sourceCategory),
			),
			value: isCategoryUpdate
				? requestedCategory
				: !isMerchantRename
					? sourceCategory
					: "",
		},
		addTags: {
			enabled: false,
			values: [],
		},
		hideTransaction: {
			enabled: false,
		},
		reviewStatus: {
			enabled: false,
			value: "needs_review",
		},
	};
}

function getTextCriteriaOptions(
	criterion: TextCriterionDraft,
): Array<{ operator: RuleTextOperator; value: string } | undefined> {
	if (!criterion.enabled) {
		return [undefined];
	}

	const conditions = criterion.conditions
		.map((condition) => ({
			operator: condition.operator,
			value: condition.value.trim(),
		}))
		.filter((condition) => condition.value.length > 0);

	return conditions.length > 0 ? conditions : [undefined];
}

/*
 * TransactionRule currently stores one original-statement criterion and one
 * merchant-name criterion. Multiple rows are therefore saved as rule variants:
 * OR within each text section, AND across different sections.
 */
function buildRuleVariants(
	draft: RuleDraft,
	options: { createPersistentIds?: boolean } = {},
): TransactionRule[] {
	const amountValue = Number(draft.amount.value);
	const originalStatements = getTextCriteriaOptions(draft.originalStatement);
	const merchantNames = getTextCriteriaOptions(draft.merchantName);
	const baseName = draft.name.trim() || "Untitled rule";
	const rules: TransactionRule[] = [];

	for (const originalStatement of originalStatements) {
		for (const merchantName of merchantNames) {
			const ruleIndex = rules.length;

			rules.push({
				id:
					ruleIndex === 0
						? draft.id
						: options.createPersistentIds
							? createId()
							: `${draft.id}-preview-${ruleIndex}`,
				name: ruleIndex === 0 ? baseName : `${baseName} (${ruleIndex + 1})`,
				criteria: {
					originalStatement,
					merchantName,
					amount: draft.amount.enabled
						? {
								direction: draft.amount.direction,
								operator: draft.amount.operator,
								value: amountValue,
							}
						: undefined,
					categories: draft.categories.enabled
						? uniqueStrings(draft.categories.values)
						: undefined,
					accountIds: draft.accounts.enabled
						? uniqueStrings(draft.accounts.values)
						: undefined,
				},
				actions: {
					renameMerchant: draft.renameMerchant.enabled
						? {
								merchantId: draft.renameMerchant.merchantId || null,
								name: draft.renameMerchant.name.trim(),
							}
						: undefined,
					updateCategory: draft.updateCategory.enabled
						? draft.updateCategory.value.trim()
						: undefined,
					addTags: draft.addTags.enabled
						? uniqueStrings(draft.addTags.values)
						: undefined,
					hideTransaction: draft.hideTransaction.enabled ? true : undefined,
					reviewStatus: draft.reviewStatus.enabled
						? draft.reviewStatus.value
						: undefined,
				},
			});
		}
	}

	return rules;
}

function buildRule(draft: RuleDraft): TransactionRule {
	return buildRuleVariants(draft)[0];
}

function validateDraft(draft: RuleDraft): ValidationErrors {
	const errors: ValidationErrors = {};
	const rule = buildRule(draft);

	if (!hasRuleCriteria(rule)) {
		errors.criteria = "Turn on at least one matching criterion.";
	}

	if (!hasRuleActions(rule)) {
		errors.actions = "Turn on at least one update.";
	}

	if (
		draft.originalStatement.enabled &&
		draft.originalStatement.conditions.some((condition) => {
			return !condition.value.trim();
		})
	) {
		errors.originalStatement = "Original statement is a required field.";
	}

	if (
		draft.merchantName.enabled &&
		draft.merchantName.conditions.some((condition) => {
			return !condition.value.trim();
		})
	) {
		errors.merchantName = "Merchant name is a required field.";
	}

	if (draft.amount.enabled) {
		const amount = Number(draft.amount.value);

		if (!draft.amount.value.trim() || !Number.isFinite(amount) || amount < 0) {
			errors.amount = "Enter a valid non-negative amount.";
		}
	}

	if (draft.categories.enabled && draft.categories.values.length === 0) {
		errors.categories = "Select at least one category.";
	}

	if (draft.accounts.enabled && draft.accounts.values.length === 0) {
		errors.accounts = "Select at least one account.";
	}

	if (draft.renameMerchant.enabled && !draft.renameMerchant.name.trim()) {
		errors.renameMerchant = "Select a merchant.";
	}

	if (draft.updateCategory.enabled && !draft.updateCategory.value.trim()) {
		errors.updateCategory = "Select a category.";
	}

	if (draft.addTags.enabled && draft.addTags.values.length === 0) {
		errors.addTags = "Select at least one tag.";
	}

	return errors;
}

function hasErrors(errors: ValidationErrors): boolean {
	return Object.values(errors).some(Boolean);
}

export function RuleModal({
	isOpen,
	initialRule,
	seed,
	transactions,
	accounts,
	tags,
	onClose,
	onSave,
	onDelete,
}: RuleModalProps) {
	const merchantItems = useMerchantOptions();

	const [draft, setDraft] = useState(() => {
		return createDraft(initialRule, seed);
	});
	const [tab, setTab] = useState<RuleModalTab>("settings");
	const [applyToExisting, setApplyToExisting] = useState(false);
	const [attemptedSave, setAttemptedSave] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [deleteArmed, setDeleteArmed] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);
	const [floatingLayerElement, setFloatingLayerElement] =
		useState<HTMLDivElement | null>(null);

	useEffect(() => {
		if (!isOpen) {
			return;
		}

		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape" && !isSaving && !isDeleting) {
				onClose();
			}
		};

		window.addEventListener("keydown", handleKeyDown);

		return () => {
			document.body.style.overflow = previousOverflow;
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [isOpen, isDeleting, isSaving, onClose]);

	const validation = useMemo(() => {
		return validateDraft(draft);
	}, [draft]);

	const ruleVariants = useMemo(() => {
		return buildRuleVariants(draft);
	}, [draft]);

	const matchingTransactions = useMemo(() => {
		if (hasErrors(validation)) {
			return [];
		}

		return transactions.filter((transaction) => {
			return ruleVariants.some((candidateRule) => {
				return matchesTransactionRule(transaction, candidateRule);
			});
		});
	}, [ruleVariants, transactions, validation]);

	const accountOptions = useMemo<Option[]>(() => {
		return accounts
			.filter((account) => account.id && account.name.trim())
			.map((account) => ({
				value: account.id,
				label: account.name.trim(),
			}))
			.sort((first, second) => first.label.localeCompare(second.label));
	}, [accounts]);

	const tagOptions = useMemo<Option[]>(() => {
		return uniqueStrings(tags)
			.sort((first, second) => first.localeCompare(second))
			.map((tag) => ({ value: tag, label: tag }));
	}, [tags]);

	const handleSave = async () => {
		setAttemptedSave(true);
		setSaveError(null);

		if (hasErrors(validation)) {
			setTab("settings");
			return;
		}

		setIsSaving(true);

		try {
			const rulesToSave = buildRuleVariants(draft, {
				createPersistentIds: true,
			});

			for (const ruleToSave of rulesToSave) {
				const variantMatches = transactions.filter((transaction) => {
					return matchesTransactionRule(transaction, ruleToSave);
				});

				await onSave(ruleToSave, {
					applyToExisting,
					matchingTransactions: variantMatches,
				});
			}

			onClose();
		} catch (error) {
			console.error("Failed to save rule:", error);
			setSaveError(
				error instanceof Error ? error.message : "Failed to save the rule.",
			);
		} finally {
			setIsSaving(false);
		}
	};

	const handleDelete = async () => {
		if (!initialRule || !onDelete) {
			return;
		}

		if (!deleteArmed) {
			setDeleteArmed(true);
			return;
		}

		setIsDeleting(true);
		setSaveError(null);

		try {
			await onDelete(initialRule);
			onClose();
		} catch (error) {
			console.error("Failed to delete rule:", error);
			setSaveError(
				error instanceof Error ? error.message : "Failed to delete the rule.",
			);
		} finally {
			setIsDeleting(false);
			setDeleteArmed(false);
		}
	};

	if (!isOpen || typeof document === "undefined") {
		return null;
	}

	return createPortal(
		<div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4">
			<button
				type="button"
				aria-label="Close rule dialog"
				className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
				onClick={() => {
					if (!isSaving && !isDeleting) {
						onClose();
					}
				}}
			/>

			<section
				role="dialog"
				aria-modal="true"
				aria-labelledby="rule-modal-title"
				className="relative flex h-[min(94vh,980px)] w-full max-w-[1500px] flex-col overflow-hidden rounded-2xl border border-black/10 bg-[#f6f6f4] text-gray-900 shadow-[0_30px_120px_rgba(0,0,0,0.42)] dark:border-white/10 dark:bg-[#1b1b1a] dark:text-white"
			>
				<div
					ref={setFloatingLayerElement}
					className="pointer-events-none absolute inset-0 z-[300]"
					data-rule-modal-floating-layer
				/>

				<header className="shrink-0 border-b border-gray-200 bg-white/90 px-5 pt-4 backdrop-blur dark:border-white/10 dark:bg-[#20201f]/95 sm:px-7">
					<div className="flex items-start justify-between gap-4">
						<div className="min-w-0 flex-1">
							<h2
								id="rule-modal-title"
								className="text-lg font-semibold tracking-tight sm:text-xl"
							>
								{initialRule ? "Edit rule" : "New rule"}
							</h2>
							<input
								type="text"
								value={draft.name}
								onChange={(event) => {
									setDraft((current) => ({
										...current,
										name: event.target.value,
									}));
								}}
								aria-label="Rule name"
								className="mt-1 w-full max-w-xl bg-transparent text-sm text-gray-500 outline-none placeholder:text-gray-400 dark:text-gray-400"
								placeholder="Rule name"
							/>
						</div>

						<button
							type="button"
							onClick={onClose}
							disabled={isSaving || isDeleting}
							className="grid size-10 shrink-0 place-items-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white"
							aria-label="Close"
						>
							<X size={20} />
						</button>
					</div>

					<nav className="mt-4 flex gap-6" aria-label="Rule modal tabs">
						<TabButton
							active={tab === "settings"}
							label="Settings"
							onClick={() => setTab("settings")}
						/>
						<TabButton
							active={tab === "preview"}
							label="Preview changes"
							count={matchingTransactions.length}
							onClick={() => setTab("preview")}
						/>
					</nav>
				</header>

				{tab === "settings" ? (
					<div className="min-h-0 flex-1 overflow-y-auto">
						<div className="grid min-h-full grid-cols-1 xl:grid-cols-2">
							<div className="border-b border-gray-200 p-4 dark:border-white/10 sm:p-5 xl:border-b-0 xl:border-r">
								<h3 className="mb-3 text-sm font-semibold">
									If transaction matches criteria…
								</h3>

								{attemptedSave && validation.criteria && (
									<div className="mb-3">
										<ValidationBanner message={validation.criteria} />
									</div>
								)}

								<div className="space-y-3">
									<TextCriteriaEditor
										title="Original statement"
										required
										placeholder="Original statement…"
										criterion={draft.originalStatement}
										error={
											attemptedSave ? validation.originalStatement : undefined
										}
										onChange={(originalStatement) => {
											setDraft((current) => ({
												...current,
												originalStatement,
											}));
										}}
									/>

									<TextCriteriaEditor
										title="Merchant name"
										required
										placeholder="Merchant name…"
										criterion={draft.merchantName}
										error={attemptedSave ? validation.merchantName : undefined}
										onChange={(merchantName) => {
											setDraft((current) => ({
												...current,
												merchantName,
											}));
										}}
									/>

									<RuleCard
										title="Amount"
										enabled={draft.amount.enabled}
										onEnabledChange={(enabled) => {
											setDraft((current) => ({
												...current,
												amount: { ...current.amount, enabled },
											}));
										}}
										error={attemptedSave ? validation.amount : undefined}
									>
										<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
											<SelectField
												value={draft.amount.direction}
												onChange={(value) => {
													setDraft((current) => ({
														...current,
														amount: {
															...current.amount,
															direction: value as RuleAmountDirection,
														},
													}));
												}}
												options={[
													{ value: "debit", label: "Debit" },
													{ value: "credit", label: "Credit" },
													{ value: "any", label: "Debit or credit" },
												]}
											/>
											<SelectField
												value={draft.amount.operator}
												onChange={(value) => {
													setDraft((current) => ({
														...current,
														amount: {
															...current.amount,
															operator: value as RuleAmountOperator,
														},
													}));
												}}
												options={[
													{ value: "greater_than", label: "Greater than" },
													{
														value: "greater_than_or_equal",
														label: "Greater than or equal",
													},
													{ value: "less_than", label: "Less than" },
													{
														value: "less_than_or_equal",
														label: "Less than or equal",
													},
													{ value: "equals", label: "Exactly equals" },
												]}
											/>
										</div>
										<div className="relative mt-2">
											<span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
												$
											</span>
											<input
												type="text"
												inputMode="decimal"
												value={draft.amount.value}
												onChange={(event) => {
													const value = event.target.value.replace(
														/[^0-9.]/g,
														"",
													);
													setDraft((current) => ({
														...current,
														amount: { ...current.amount, value },
													}));
												}}
												placeholder="0.00"
												className={`${fieldClass(Boolean(attemptedSave && validation.amount))} pl-7`}
											/>
										</div>
									</RuleCard>

									<RuleCard
										title="Categories"
										enabled={draft.categories.enabled}
										onEnabledChange={(enabled) => {
											setDraft((current) => ({
												...current,
												categories: { ...current.categories, enabled },
											}));
										}}
										error={attemptedSave ? validation.categories : undefined}
									>
										<CategoryCriteriaField
											values={draft.categories.values}
											onChange={(values) => {
												setDraft((current) => ({
													...current,
													categories: { ...current.categories, values },
												}));
											}}
										/>
									</RuleCard>

									<RuleCard
										title="Accounts"
										enabled={draft.accounts.enabled}
										onEnabledChange={(enabled) => {
											setDraft((current) => ({
												...current,
												accounts: { ...current.accounts, enabled },
											}));
										}}
										error={attemptedSave ? validation.accounts : undefined}
									>
										<MultiSelectField
											values={draft.accounts.values}
											options={accountOptions}
											placeholder="Account equals…"
											onChange={(values) => {
												setDraft((current) => ({
													...current,
													accounts: { ...current.accounts, values },
												}));
											}}
										/>
									</RuleCard>
								</div>
							</div>

							<div className="p-4 sm:p-5">
								<h3 className="mb-3 text-sm font-semibold">
									Then apply these updates…
								</h3>

								{attemptedSave && validation.actions && (
									<ValidationBanner message={validation.actions} />
								)}

								<div className="space-y-3">
									<RuleCard
										title="Rename merchant"
										enabled={draft.renameMerchant.enabled}
										onEnabledChange={(enabled) => {
											setDraft((current) => ({
												...current,
												renameMerchant: {
													...current.renameMerchant,
													enabled,
												},
											}));
										}}
										error={
											attemptedSave ? validation.renameMerchant : undefined
										}
									>
										<MerchantSearchField
											portalRoot={floatingLayerElement}
											boundaryElement={floatingLayerElement}
											merchantItems={merchantItems}
											selectedMerchantId={draft.renameMerchant.merchantId}
											selectedMerchantName={draft.renameMerchant.name}
											error={Boolean(
												attemptedSave && validation.renameMerchant,
											)}
											onChange={(merchant) => {
												setDraft((current) => ({
													...current,
													renameMerchant: {
														...current.renameMerchant,
														enabled: true,
														merchantId: merchant.id,
														name: merchant.name,
													},
												}));
											}}
										/>
									</RuleCard>

									<RuleCard
										title="Update category"
										enabled={draft.updateCategory.enabled}
										onEnabledChange={(enabled) => {
											setDraft((current) => ({
												...current,
												updateCategory: {
													...current.updateCategory,
													enabled,
												},
											}));
										}}
										error={
											attemptedSave ? validation.updateCategory : undefined
										}
									>
										<div
											className={`rounded-xl border bg-white dark:bg-[#1f1f1e] ${
												attemptedSave && validation.updateCategory
													? "border-red-500 dark:border-red-500"
													: "border-gray-200 dark:border-white/10"
											}`}
										>
											<CategorySelector
												currentCategory={draft.updateCategory.value}
												placeholder="Change category to…"
												showChevron
												onSelect={(value) => {
													setDraft((current) => ({
														...current,
														updateCategory: {
															...current.updateCategory,
															enabled: true,
															value,
														},
													}));
												}}
											/>
										</div>
									</RuleCard>

									<RuleCard
										title="Add tags"
										enabled={draft.addTags.enabled}
										onEnabledChange={(enabled) => {
											setDraft((current) => ({
												...current,
												addTags: { ...current.addTags, enabled },
											}));
										}}
										error={attemptedSave ? validation.addTags : undefined}
									>
										<MultiSelectField
											values={draft.addTags.values}
											options={tagOptions}
											placeholder="Search tags…"
											onChange={(values) => {
												setDraft((current) => ({
													...current,
													addTags: { ...current.addTags, values },
												}));
											}}
										/>
									</RuleCard>

									<CompactActionCard
										title="Hide transaction"
										description="Matching transactions will be hidden from normal views."
										enabled={draft.hideTransaction.enabled}
										onEnabledChange={(enabled) => {
											setDraft((current) => ({
												...current,
												hideTransaction: { enabled },
											}));
										}}
									/>

									<RuleCard
										title="Review status"
										enabled={draft.reviewStatus.enabled}
										onEnabledChange={(enabled) => {
											setDraft((current) => ({
												...current,
												reviewStatus: {
													...current.reviewStatus,
													enabled,
												},
											}));
										}}
									>
										<SelectField
											value={draft.reviewStatus.value}
											onChange={(value) => {
												setDraft((current) => ({
													...current,
													reviewStatus: {
														...current.reviewStatus,
														value: value as RuleReviewStatus,
													},
												}));
											}}
											options={[
												{ value: "needs_review", label: "Needs review" },
												{ value: "reviewed", label: "Reviewed" },
											]}
										/>
									</RuleCard>
								</div>
							</div>
						</div>
					</div>
				) : (
					<PreviewPanel
						transactions={matchingTransactions}
						rules={ruleVariants}
						accountNameById={
							new Map(accounts.map((account) => [account.id, account.name]))
						}
					/>
				)}

				<footer className="shrink-0 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-white/10 dark:bg-[#20201f]/95 sm:px-5">
					{saveError && (
						<div className="mb-3 flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
							<AlertCircle size={17} className="mt-0.5 shrink-0" />
							<span>{saveError}</span>
						</div>
					)}

					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
							<input
								type="checkbox"
								checked={applyToExisting}
								onChange={(event) => {
									setApplyToExisting(event.target.checked);
								}}
								className="size-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
							/>
							Update existing transactions
						</label>

						<div className="flex items-center justify-end gap-2">
							<span className="mr-auto text-sm text-gray-500 sm:mr-3 dark:text-gray-400">
								{matchingTransactions.length === 1
									? "1 matching transaction"
									: `${matchingTransactions.length} matching transactions`}
							</span>

							{initialRule && onDelete && (
								<button
									type="button"
									onClick={() => {
										void handleDelete();
									}}
									disabled={isSaving || isDeleting}
									className={`inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-semibold transition disabled:opacity-50 ${
										deleteArmed
											? "border-red-600 bg-red-600 text-white hover:bg-red-500"
											: "border-gray-200 text-red-600 hover:bg-red-50 dark:border-white/10 dark:hover:bg-red-500/10"
									}`}
								>
									{isDeleting ? (
										<Loader2 size={16} className="animate-spin" />
									) : (
										<Trash2 size={16} />
									)}
									{deleteArmed ? "Confirm delete" : "Delete"}
								</button>
							)}

							<button
								type="button"
								onClick={() => {
									void handleSave();
								}}
								disabled={isSaving || isDeleting}
								className="inline-flex h-10 min-w-24 items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
							>
								{isSaving && <Loader2 size={16} className="animate-spin" />}
								{isSaving ? "Saving…" : "Save"}
							</button>
						</div>
					</div>
				</footer>
			</section>
		</div>,
		document.body,
	);
}

interface TabButtonProps {
	active: boolean;
	label: string;
	count?: number;
	onClick: () => void;
}

function TabButton({ active, label, count, onClick }: TabButtonProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={`relative flex items-center gap-2 pb-3 text-sm font-semibold transition ${
				active
					? "text-orange-600 dark:text-orange-400"
					: "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
			}`}
		>
			{label}
			{count !== undefined && (
				<span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-white/5 dark:text-gray-400">
					{count}
				</span>
			)}
			{active && (
				<span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-orange-500" />
			)}
		</button>
	);
}

interface RuleCardProps {
	title: string;
	required?: boolean;
	enabled: boolean;
	onEnabledChange: (enabled: boolean) => void;
	children: React.ReactNode;
	error?: string;
}

function RuleCard({
	title,
	required = false,
	enabled,
	onEnabledChange,
	children,
	error,
}: RuleCardProps) {
	return (
		<section
			className={`overflow-hidden rounded-2xl border transition ${
				error
					? "border-red-400 dark:border-red-500/70"
					: "border-gray-200 dark:border-white/10"
			} bg-white dark:bg-[#252523]`}
		>
			<button
				type="button"
				role="switch"
				aria-checked={enabled}
				onClick={() => onEnabledChange(!enabled)}
				className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-500/40 dark:hover:bg-white/[0.03]"
			>
				<h4 className="text-sm font-semibold">
					{title}
					{required && (
						<span className="ml-1 text-red-500" aria-hidden="true">
							*
						</span>
					)}
				</h4>
				<Toggle checked={enabled} />
			</button>
			{enabled && (
				<div className="border-t border-gray-200 p-3.5 dark:border-white/10">
					{children}
					{error && (
						<p className="mt-2 flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
							<AlertCircle size={13} />
							{error}
						</p>
					)}
				</div>
			)}
		</section>
	);
}

interface TextCriteriaEditorProps {
	title: string;
	required?: boolean;
	placeholder: string;
	criterion: TextCriterionDraft;
	onChange: (criterion: TextCriterionDraft) => void;
	error?: string;
}

function TextCriteriaEditor({
	title,
	required = false,
	placeholder,
	criterion,
	onChange,
	error,
}: TextCriteriaEditorProps) {
	const updateCondition = (
		conditionId: string,
		patch: Partial<TextCriterionConditionDraft>,
	) => {
		onChange({
			...criterion,
			conditions: criterion.conditions.map((condition) => {
				return condition.id === conditionId
					? { ...condition, ...patch }
					: condition;
			}),
		});
	};

	const removeCondition = (conditionId: string) => {
		const remaining = criterion.conditions.filter((condition) => {
			return condition.id !== conditionId;
		});

		onChange({
			...criterion,
			conditions: remaining.length > 0 ? remaining : [createTextCondition()],
		});
	};

	return (
		<RuleCard
			title={title}
			required={required}
			enabled={criterion.enabled}
			onEnabledChange={(enabled) => {
				onChange({ ...criterion, enabled });
			}}
			error={error}
		>
			<div className="space-y-2.5">
				{criterion.conditions.map((condition, index) => {
					const isLastCondition = index === criterion.conditions.length - 1;
					const canRemoveCondition = criterion.conditions.length > 1;

					return (
						<React.Fragment key={condition.id}>
							{index > 0 && (
								<p className="px-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
									Or
								</p>
							)}

							<div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
								<div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-[minmax(150px,0.8fr)_minmax(0,1.5fr)]">
									<TextOperatorSelect
										value={condition.operator}
										onChange={(operator) => {
											updateCondition(condition.id, { operator });
										}}
									/>
									<input
										type="text"
										required={required && criterion.enabled}
										aria-required={required && criterion.enabled}
										aria-invalid={Boolean(error)}
										value={condition.value}
										onChange={(event) => {
											updateCondition(condition.id, {
												value: event.target.value,
											});
										}}
										placeholder={placeholder}
										className={fieldClass(Boolean(error))}
									/>
								</div>

								<div className="flex items-center justify-end gap-0.5">
									{isLastCondition && canRemoveCondition && (
										<button
											type="button"
											onClick={() => removeCondition(condition.id)}
											className="grid h-9 w-9 place-items-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/30 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white"
											aria-label={`Remove ${title.toLowerCase()} condition`}
										>
											<CircleMinus size={20} />
										</button>
									)}

									{isLastCondition && (
										<button
											type="button"
											onClick={() => {
												onChange({
													...criterion,
													enabled: true,
													conditions: [
														...criterion.conditions,
														createTextCondition(),
													],
												});
											}}
											className="grid h-9 w-9 place-items-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/30 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white"
											aria-label={`Add ${title.toLowerCase()} condition`}
										>
											<CirclePlus size={20} />
										</button>
									)}
								</div>
							</div>
						</React.Fragment>
					);
				})}
			</div>
		</RuleCard>
	);
}

interface MerchantSearchFieldProps {
	portalRoot: HTMLElement | null;
	boundaryElement: HTMLElement | null;
	merchantItems: MerchantListItem[];
	selectedMerchantId: string;
	selectedMerchantName: string;
	error?: boolean;
	onChange: (merchant: Pick<Merchant, "id" | "name">) => void;
}

function MerchantSearchField({
	portalRoot,
	boundaryElement,
	merchantItems,
	selectedMerchantId,
	selectedMerchantName,
	error = false,
	onChange,
}: MerchantSearchFieldProps) {
	const addCustomMerchant = useBudgetStore((state) => {
		return state.addCustomMerchant;
	});

	const [query, setQuery] = useState(() => selectedMerchantName);
	const [isOpen, setIsOpen] = useState(false);
	const [isCreating, setIsCreating] = useState(false);
	const [createError, setCreateError] = useState<string | null>(null);

	const [referenceElement, setReferenceElement] =
		useState<HTMLInputElement | null>(null);

	const [floatingElement, setFloatingElement] = useState<HTMLDivElement | null>(
		null,
	);

	const handleReferenceElement = useCallback(
		(node: HTMLInputElement | null) => {
			setReferenceElement(node);
		},
		[],
	);

	const handleFloatingElement = useCallback((node: HTMLDivElement | null) => {
		setFloatingElement(node);
	}, []);

	const { floatingStyles, context } = useFloating({
		elements: {
			reference: referenceElement,
			floating: floatingElement,
		},
		open: isOpen,
		onOpenChange: (nextOpen) => {
			setIsOpen(nextOpen);

			if (!nextOpen) {
				setQuery(selectedMerchantName);
				setCreateError(null);
			}
		},
		placement: "bottom-start",
		strategy: "absolute",
		whileElementsMounted: autoUpdate,
		middleware: [
			offset(6),
			flip({
				boundary: boundaryElement ?? undefined,
				padding: 8,
			}),
			shift({
				boundary: boundaryElement ?? undefined,
				padding: 8,
			}),
			size({
				boundary: boundaryElement ?? undefined,
				padding: 8,
				apply({ rects, elements, availableHeight, availableWidth }) {
					const width = Math.min(
						rects.reference.width,
						Math.max(0, availableWidth),
					);

					Object.assign(elements.floating.style, {
						width: `${width}px`,
						maxWidth: `${Math.max(0, availableWidth)}px`,
						maxHeight: `${Math.max(0, Math.min(384, availableHeight))}px`,
					});
				},
			}),
		],
	});

	const dismiss = useDismiss(context);

	const { getReferenceProps, getFloatingProps } = useInteractions([dismiss]);

	const options = useMemo(() => {
		const hasSelectedMerchant = merchantItems.some((merchant) => {
			return merchant.id === selectedMerchantId;
		});

		if (
			hasSelectedMerchant ||
			!selectedMerchantId ||
			!selectedMerchantName.trim()
		) {
			return merchantItems;
		}

		return [
			...merchantItems,
			{
				id: selectedMerchantId,
				name: selectedMerchantName.trim(),
				logoUrl: null,
				transactionCount: 0,
			},
		];
	}, [merchantItems, selectedMerchantId, selectedMerchantName]);

	const visibleMerchants = useMemo(() => {
		const normalizedQuery = normalize(query);
		const filtered = normalizedQuery
			? options.filter((merchant) => {
					return normalize(merchant.name).includes(normalizedQuery);
				})
			: options;

		return [...filtered]
			.sort((first, second) => {
				return (
					second.transactionCount - first.transactionCount ||
					first.name.localeCompare(second.name)
				);
			})
			.slice(0, 20);
	}, [options, query]);

	const exactMerchantExists = useMemo(() => {
		const normalizedQuery = normalize(query);

		if (!normalizedQuery) {
			return false;
		}

		return options.some((merchant) => {
			return normalize(merchant.name) === normalizedQuery;
		});
	}, [options, query]);

	const selectMerchant = (merchant: MerchantListItem) => {
		onChange({
			id: merchant.id,
			name: merchant.name,
		});
		setQuery(merchant.name);
		setIsOpen(false);
		setCreateError(null);
	};

	const createMerchant = async () => {
		const cleanName = query.trim();

		if (!cleanName || exactMerchantExists || isCreating) {
			return;
		}

		setIsCreating(true);
		setCreateError(null);

		try {
			const merchant = await addCustomMerchant(cleanName);

			onChange({
				id: merchant.id,
				name: merchant.name,
			});
			setQuery(merchant.name);
			setIsOpen(false);
		} catch (caughtError) {
			console.error("Failed to create merchant:", caughtError);
			setCreateError(
				caughtError instanceof Error
					? caughtError.message
					: "Failed to create merchant.",
			);
		} finally {
			setIsCreating(false);
		}
	};

	return (
		<div className="relative">
			<div className="relative">
				<Search
					size={17}
					aria-hidden="true"
					className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
				/>
				<input
					ref={handleReferenceElement}
					{...getReferenceProps()}
					type="search"
					role="combobox"
					aria-expanded={isOpen}
					aria-controls="rule-merchant-options"
					aria-autocomplete="list"
					aria-invalid={error}
					autoComplete="off"
					value={query}
					onFocus={() => {
						setIsOpen(true);
					}}
					onChange={(event) => {
						setQuery(event.target.value);
						setIsOpen(true);
						setCreateError(null);
					}}
					onKeyDown={(event) => {
						if (event.key === "Escape") {
							event.preventDefault();
							setIsOpen(false);
							setQuery(selectedMerchantName);
							return;
						}

						if (event.key !== "Enter") {
							return;
						}

						event.preventDefault();

						const exactMerchant = options.find((merchant) => {
							return normalize(merchant.name) === normalize(query);
						});

						if (exactMerchant) {
							selectMerchant(exactMerchant);
							return;
						}

						if (visibleMerchants[0] && !query.trim()) {
							selectMerchant(visibleMerchants[0]);
							return;
						}

						void createMerchant();
					}}
					placeholder="Search merchants…"
					className={`${fieldClass(error)} pl-10 pr-9`}
				/>
				<ChevronDown
					size={16}
					aria-hidden="true"
					className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-transform ${
						isOpen ? "rotate-180" : ""
					}`}
				/>
			</div>

			{isOpen && portalRoot
				? createPortal(
						<div
							ref={handleFloatingElement}
							style={floatingStyles}
							{...getFloatingProps()}
							id="rule-merchant-options"
							role="listbox"
							className="pointer-events-auto z-[1000] flex min-w-[280px] max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_18px_50px_rgba(0,0,0,0.20)] dark:border-white/10 dark:bg-[#202020]"
						>
							<div className="min-h-0 flex-1 overflow-y-auto p-2">
								{visibleMerchants.map((merchant) => {
									const isSelected = merchant.id === selectedMerchantId;

									return (
										<button
											key={merchant.id}
											type="button"
											role="option"
											aria-selected={isSelected}
											disabled={isCreating}
											onClick={() => {
												selectMerchant(merchant);
											}}
											className={`flex w-full items-center gap-2 rounded-xl px-3 py-3 text-left transition-colors hover:bg-gray-100 disabled:cursor-wait disabled:opacity-60 dark:hover:bg-white/5 ${
												isSelected
													? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400"
													: ""
											}`}
										>
											<MerchantOptionContent merchant={merchant} size="sm" />
											{isSelected && (
												<Check size={16} className="shrink-0 text-orange-500" />
											)}
										</button>
									);
								})}

								{visibleMerchants.length === 0 && !query.trim() && (
									<p className="px-3 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
										No merchants found.
									</p>
								)}
							</div>

							{query.trim() && !exactMerchantExists && (
								<div className="shrink-0 border-t border-gray-200 bg-white p-2 dark:border-white/10 dark:bg-[#202020]">
									<button
										type="button"
										disabled={isCreating}
										onClick={() => {
											void createMerchant();
										}}
										className="flex min-h-11 w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-cyan-600 transition-colors hover:bg-cyan-50 disabled:cursor-wait disabled:opacity-60 dark:text-cyan-400 dark:hover:bg-cyan-500/10"
									>
										{isCreating ? (
											<Loader2 size={17} className="animate-spin" />
										) : (
											<Plus size={17} />
										)}
										<span className="truncate">
											Create new &quot;{query.trim()}&quot; merchant
										</span>
									</button>
								</div>
							)}

							{createError && (
								<p className="shrink-0 border-t border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
									{createError}
								</p>
							)}
						</div>,
						portalRoot,
					)
				: null}
		</div>
	);
}

interface CategoryCriteriaFieldProps {
	values: string[];
	onChange: (values: string[]) => void;
}

function CategoryCriteriaField({
	values,
	onChange,
}: CategoryCriteriaFieldProps) {
	return (
		<div className="overflow-visible rounded-xl border border-gray-200 bg-white dark:border-white/10 dark:bg-[#1f1f1e]">
			{values.length > 0 && (
				<div className="flex flex-wrap gap-1.5 p-2 pb-0">
					{values.map((value) => {
						const parentCategory = findParentCategory(value);

						return (
							<span
								key={value}
								className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-2 py-1.5 text-xs font-medium text-gray-700 dark:bg-white/10 dark:text-gray-200"
							>
								<CategoryIcon
									name={value}
									size={14}
									colorClass={getCategoryTheme(parentCategory).text}
								/>
								<span>{value}</span>
								<button
									type="button"
									onClick={() => {
										onChange(values.filter((item) => item !== value));
									}}
									className="rounded p-0.5 text-gray-400 transition hover:bg-black/10 hover:text-gray-800 dark:hover:bg-white/10 dark:hover:text-white"
									aria-label={`Remove ${value}`}
								>
									<X size={12} />
								</button>
							</span>
						);
					})}
				</div>
			)}

			<div
				className={
					values.length > 0
						? "mt-2 border-t border-gray-100 dark:border-white/5"
						: ""
				}
			>
				<CategorySelector
					currentCategory=""
					placeholder="Search categories…"
					showChevron
					onSelect={(category) => {
						const alreadySelected = values.some((value) => {
							return normalize(value) === normalize(category);
						});

						if (!alreadySelected) {
							onChange([...values, category]);
						}
					}}
				/>
			</div>
		</div>
	);
}

interface CompactActionCardProps {
	title: string;
	description: string;
	enabled: boolean;
	onEnabledChange: (enabled: boolean) => void;
}

function CompactActionCard({
	title,
	description,
	enabled,
	onEnabledChange,
}: CompactActionCardProps) {
	return (
		<button
			type="button"
			role="switch"
			aria-checked={enabled}
			onClick={() => onEnabledChange(!enabled)}
			className="flex w-full items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-left transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 dark:border-white/10 dark:bg-[#252523] dark:hover:bg-white/[0.03]"
		>
			<div>
				<h4 className="text-sm font-semibold">{title}</h4>
				<p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
					{description}
				</p>
			</div>
			<Toggle checked={enabled} />
		</button>
	);
}

interface ToggleProps {
	checked: boolean;
}

function Toggle({ checked }: ToggleProps) {
	return (
		<span
			aria-hidden="true"
			className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
				checked ? "bg-orange-500" : "bg-gray-300 dark:bg-gray-600"
			}`}
		>
			<span
				className={`absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow transition-transform ${
					checked ? "translate-x-5" : "translate-x-0"
				}`}
			/>
		</span>
	);
}

interface TextOperatorSelectProps {
	value: RuleTextOperator;
	onChange: (operator: RuleTextOperator) => void;
}

function TextOperatorSelect({ value, onChange }: TextOperatorSelectProps) {
	return (
		<SelectField
			value={value}
			onChange={(nextValue) => onChange(nextValue as RuleTextOperator)}
			options={[
				{ value: "contains", label: "Contains" },
				{ value: "equals", label: "Exactly matches" },
				{ value: "starts_with", label: "Starts with" },
				{ value: "ends_with", label: "Ends with" },
			]}
		/>
	);
}

interface SelectFieldProps {
	value: string;
	onChange: (value: string) => void;
	options: Option[];
	placeholder?: string;
	error?: boolean;
}

function SelectField({
	value,
	onChange,
	options,
	placeholder,
	error = false,
}: SelectFieldProps) {
	return (
		<div className="relative">
			<select
				value={value}
				onChange={(event) => onChange(event.target.value)}
				className={`${fieldClass(error)} appearance-none pr-9`}
			>
				{placeholder && <option value="">{placeholder}</option>}
				{options.map((option) => (
					<option key={option.value} value={option.value}>
						{option.label}
					</option>
				))}
			</select>
			<ChevronDown
				size={16}
				className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
			/>
		</div>
	);
}

interface MultiSelectFieldProps {
	values: string[];
	options: Option[];
	placeholder: string;
	onChange: (values: string[]) => void;
}

function MultiSelectField({
	values,
	options,
	placeholder,
	onChange,
}: MultiSelectFieldProps) {
	const selectedSet = new Set(values);
	const available = options.filter((option) => !selectedSet.has(option.value));
	const labelByValue = new Map(
		options.map((option) => [option.value, option.label]),
	);

	return (
		<div className="rounded-xl border border-gray-200 bg-white p-2 dark:border-white/10 dark:bg-[#1f1f1e]">
			{values.length > 0 && (
				<div className="mb-2 flex flex-wrap gap-1.5">
					{values.map((value) => (
						<span
							key={value}
							className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-1 text-xs font-medium dark:bg-white/10"
						>
							{labelByValue.get(value) ?? value}
							<button
								type="button"
								onClick={() => {
									onChange(values.filter((item) => item !== value));
								}}
								className="rounded p-0.5 text-gray-400 hover:bg-black/10 hover:text-gray-800 dark:hover:bg-white/10 dark:hover:text-white"
								aria-label={`Remove ${labelByValue.get(value) ?? value}`}
							>
								<X size={12} />
							</button>
						</span>
					))}
				</div>
			)}

			<div className="relative">
				<Plus
					size={15}
					className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
				/>
				<select
					value=""
					onChange={(event) => {
						const value = event.target.value;

						if (value) {
							onChange([...values, value]);
						}
					}}
					className="h-9 w-full appearance-none rounded-lg bg-transparent pl-8 pr-8 text-sm text-gray-600 outline-none dark:text-gray-300"
				>
					<option value="">
						{available.length ? placeholder : "No more options"}
					</option>
					{available.map((option) => (
						<option key={option.value} value={option.value}>
							{option.label}
						</option>
					))}
				</select>
				<ChevronDown
					size={15}
					className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"
				/>
			</div>
		</div>
	);
}

function fieldClass(error: boolean): string {
	return `h-10 w-full rounded-xl border bg-white px-3 text-sm outline-none transition dark:bg-[#1f1f1e] ${
		error
			? "border-red-500 focus:ring-2 focus:ring-red-500/15 dark:border-red-500"
			: "border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 dark:border-white/10"
	}`;
}

function ValidationBanner({ message }: { message: string }) {
	return (
		<div className="mt-3 flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
			<AlertCircle size={16} className="shrink-0" />
			{message}
		</div>
	);
}

interface PreviewPanelProps {
	transactions: Transaction[];
	rules: TransactionRule[];
	accountNameById: Map<string, string>;
}

function PreviewPanel({
	transactions,
	rules,
	accountNameById,
}: PreviewPanelProps) {
	return (
		<div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
			{transactions.length === 0 ? (
				<div className="grid min-h-80 place-items-center rounded-2xl border border-dashed border-gray-300 bg-white/60 p-8 text-center dark:border-white/10 dark:bg-white/[0.02]">
					<div>
						<div className="mx-auto grid size-12 place-items-center rounded-full bg-gray-100 text-gray-400 dark:bg-white/5">
							<Check size={22} />
						</div>
						<h3 className="mt-4 font-semibold">No matching transactions yet</h3>
						<p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
							Adjust the criteria to preview which transactions this rule will
							update.
						</p>
					</div>
				</div>
			) : (
				<div className="space-y-3">
					{transactions.map((transaction) => {
						const matchingRule = rules.find((candidateRule) => {
							return matchesTransactionRule(transaction, candidateRule);
						});
						const changes = matchingRule
							? describeRuleChanges(transaction, matchingRule)
							: [];
						const accountName =
							(transaction.account_id
								? accountNameById.get(transaction.account_id)
								: undefined) ?? transaction.account;

						return (
							<article
								key={transaction.id}
								className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-[#252523]"
							>
								<div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
									<div className="min-w-0">
										<p className="truncate font-semibold">
											{transaction.merchant}
										</p>
										<p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
											{transaction.date} · {accountName || "No account"} ·{" "}
											{transaction.category || "Uncategorized"}
										</p>
									</div>
									<p className="shrink-0 font-semibold tabular-nums">
										{transaction.amount < 0 ? "−" : "+"}$
										{Math.abs(transaction.amount).toFixed(2)}
									</p>
								</div>

								<div className="mt-3 flex flex-wrap gap-2">
									{changes.length > 0 ? (
										changes.map((change) => (
											<span
												key={`${change.field}-${change.before}-${change.after}`}
												className="rounded-lg bg-orange-50 px-2 py-1 text-xs text-orange-700 dark:bg-orange-500/10 dark:text-orange-300"
											>
												{change.field}: {change.before} → {change.after}
											</span>
										))
									) : (
										<span className="rounded-lg bg-gray-100 px-2 py-1 text-xs text-gray-500 dark:bg-white/5 dark:text-gray-400">
											Matches, but values are already up to date
										</span>
									)}
								</div>
							</article>
						);
					})}
				</div>
			)}
		</div>
	);
}
