"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
	AlertCircle,
	Check,
	ChevronDown,
	Loader2,
	Plus,
	Trash2,
	X,
} from "lucide-react";

import type { Account, Merchant, Transaction } from "@/store/useBudgetStore";
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

interface TextCriterionDraft {
	enabled: boolean;
	operator: RuleTextOperator;
	value: string;
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
				operator:
					initialRule.criteria.originalStatement?.operator ?? "contains",
				value: initialRule.criteria.originalStatement?.value ?? "",
			},
			merchantName: {
				enabled: Boolean(initialRule.criteria.merchantName),
				operator: initialRule.criteria.merchantName?.operator ?? "contains",
				value: initialRule.criteria.merchantName?.value ?? "",
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
	const originalStatement = source ? getOriginalStatement(source) : "";
	const sourceMerchant = source?.merchant?.trim() ?? "";
	const sourceCategory = source?.category?.trim() ?? "";

	return {
		id: createId(),
		name: renamedMerchant
			? `Rename ${originalStatement || sourceMerchant}`
			: sourceMerchant
				? `${sourceMerchant} rule`
				: "New transaction rule",
		originalStatement: {
			enabled: Boolean(renamedMerchant && originalStatement),
			operator: "contains",
			value: renamedMerchant ? originalStatement : "",
		},
		merchantName: {
			enabled: !renamedMerchant,
			operator: "contains",
			value: renamedMerchant ? "" : sourceMerchant,
		},
		amount: {
			enabled: false,
			direction: source?.amount && source.amount >= 0 ? "credit" : "debit",
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
			enabled: Boolean(renamedMerchant),
			merchantId: renamedMerchant?.id ?? "",
			name: renamedMerchant?.name ?? "",
		},
		updateCategory: {
			enabled: !renamedMerchant && Boolean(sourceCategory),
			value: renamedMerchant ? "" : sourceCategory,
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

function buildRule(draft: RuleDraft): TransactionRule {
	const amountValue = Number(draft.amount.value);

	return {
		id: draft.id,
		name: draft.name.trim() || "Untitled rule",
		criteria: {
			originalStatement: draft.originalStatement.enabled
				? {
						operator: draft.originalStatement.operator,
						value: draft.originalStatement.value.trim(),
					}
				: undefined,
			merchantName: draft.merchantName.enabled
				? {
						operator: draft.merchantName.operator,
						value: draft.merchantName.value.trim(),
					}
				: undefined,
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
	};
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

	if (draft.originalStatement.enabled && !draft.originalStatement.value.trim()) {
		errors.originalStatement = "Original statement value is required.";
	}

	if (draft.merchantName.enabled && !draft.merchantName.value.trim()) {
		errors.merchantName = "Merchant name value is required.";
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
	merchants,
	categories,
	tags,
	onClose,
	onSave,
	onDelete,
}: RuleModalProps) {
	const [tab, setTab] = useState<RuleModalTab>("settings");
	const [draft, setDraft] = useState<RuleDraft>(() => {
		return createDraft(initialRule, seed);
	});
	const [applyToExisting, setApplyToExisting] = useState(false);
	const [attemptedSave, setAttemptedSave] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [deleteArmed, setDeleteArmed] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);

	useEffect(() => {
		if (!isOpen) {
			return;
		}

		setDraft(createDraft(initialRule, seed));
		setTab("settings");
		setApplyToExisting(false);
		setAttemptedSave(false);
		setIsSaving(false);
		setIsDeleting(false);
		setDeleteArmed(false);
		setSaveError(null);
	}, [isOpen, initialRule, seed]);

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

	const rule = useMemo(() => {
		return buildRule(draft);
	}, [draft]);

	const matchingTransactions = useMemo(() => {
		if (hasErrors(validation)) {
			return [];
		}

		return transactions.filter((transaction) => {
			return matchesTransactionRule(transaction, rule);
		});
	}, [rule, transactions, validation]);

	const merchantOptions = useMemo<Option[]>(() => {
		const byId = new Map<string, Option>();

		for (const merchant of merchants) {
			const name = merchant.name.trim();

			if (!merchant.id || !name) {
				continue;
			}

			byId.set(merchant.id, {
				value: merchant.id,
				label: name,
			});
		}

		if (
			draft.renameMerchant.merchantId &&
			draft.renameMerchant.name &&
			!byId.has(draft.renameMerchant.merchantId)
		) {
			byId.set(draft.renameMerchant.merchantId, {
				value: draft.renameMerchant.merchantId,
				label: draft.renameMerchant.name,
			});
		}

		return [...byId.values()].sort((first, second) => {
			return first.label.localeCompare(second.label);
		});
	}, [draft.renameMerchant.merchantId, draft.renameMerchant.name, merchants]);

	const categoryOptions = useMemo<Option[]>(() => {
		return uniqueStrings(categories)
			.sort((first, second) => first.localeCompare(second))
			.map((category) => ({ value: category, label: category }));
	}, [categories]);

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
			await onSave(rule, {
				applyToExisting,
				matchingTransactions,
			});
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
		<div className="fixed inset-0 z-300 flex items-center justify-center p-2 sm:p-4">
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

								<div className="space-y-3">
									<RuleCard
										title="Original statement"
										enabled={draft.originalStatement.enabled}
										onEnabledChange={(enabled) => {
											setDraft((current) => ({
												...current,
												originalStatement: {
													...current.originalStatement,
													enabled,
												},
											}));
										}}
										error={attemptedSave ? validation.originalStatement : undefined}
									>
										<div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(150px,0.9fr)_minmax(0,1.6fr)]">
											<TextOperatorSelect
												value={draft.originalStatement.operator}
												onChange={(operator) => {
													setDraft((current) => ({
														...current,
														originalStatement: {
															...current.originalStatement,
															operator,
														},
													}));
												}}
											/>
											<input
												type="text"
												value={draft.originalStatement.value}
												onChange={(event) => {
													setDraft((current) => ({
														...current,
														originalStatement: {
															...current.originalStatement,
															value: event.target.value,
														},
													}));
												}}
												placeholder="Original statement…"
												className={fieldClass(Boolean(attemptedSave && validation.originalStatement))}
											/>
										</div>
									</RuleCard>

									<RuleCard
										title="Merchant name"
										enabled={draft.merchantName.enabled}
										onEnabledChange={(enabled) => {
											setDraft((current) => ({
												...current,
												merchantName: {
													...current.merchantName,
													enabled,
												},
											}));
										}}
										error={attemptedSave ? validation.merchantName : undefined}
									>
										<div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(150px,0.9fr)_minmax(0,1.6fr)]">
											<TextOperatorSelect
												value={draft.merchantName.operator}
												onChange={(operator) => {
													setDraft((current) => ({
														...current,
														merchantName: {
															...current.merchantName,
															operator,
														},
													}));
												}}
											/>
											<input
												type="text"
												value={draft.merchantName.value}
												onChange={(event) => {
													setDraft((current) => ({
														...current,
														merchantName: {
															...current.merchantName,
															value: event.target.value,
														},
													}));
												}}
												placeholder="Merchant name…"
												className={fieldClass(Boolean(attemptedSave && validation.merchantName))}
											/>
										</div>
									</RuleCard>

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
													const value = event.target.value.replace(/[^0-9.]/g, "");
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
										<MultiSelectField
											values={draft.categories.values}
											options={categoryOptions}
											placeholder="Category equals…"
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

								{attemptedSave && validation.criteria && (
									<ValidationBanner message={validation.criteria} />
								)}
							</div>

							<div className="p-4 sm:p-5">
								<h3 className="mb-3 text-sm font-semibold">
									Then apply these updates…
								</h3>

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
										error={attemptedSave ? validation.renameMerchant : undefined}
									>
										<SelectField
											value={draft.renameMerchant.merchantId}
											onChange={(merchantId) => {
												const merchant = merchants.find((item) => {
													return item.id === merchantId;
												});
												setDraft((current) => ({
													...current,
													renameMerchant: {
														...current.renameMerchant,
														merchantId,
														name: merchant?.name ?? "",
													},
												}));
											}}
											options={merchantOptions}
											placeholder="Rename to…"
											error={Boolean(attemptedSave && validation.renameMerchant)}
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
										error={attemptedSave ? validation.updateCategory : undefined}
									>
										<SelectField
											value={draft.updateCategory.value}
											onChange={(value) => {
												setDraft((current) => ({
													...current,
													updateCategory: {
														...current.updateCategory,
														value,
													},
												}));
											}}
											options={categoryOptions}
											placeholder="Change category to…"
											error={Boolean(attemptedSave && validation.updateCategory)}
										/>
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

								{attemptedSave && validation.actions && (
									<ValidationBanner message={validation.actions} />
								)}
							</div>
						</div>
					</div>
				) : (
					<PreviewPanel
						transactions={matchingTransactions}
						rule={rule}
						accountNameById={new Map(accounts.map((account) => [account.id, account.name]))}
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
	enabled: boolean;
	onEnabledChange: (enabled: boolean) => void;
	children: React.ReactNode;
	error?: string;
}

function RuleCard({
	title,
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
			<header className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 dark:border-white/10">
				<h4 className="text-sm font-semibold">{title}</h4>
				<Toggle checked={enabled} onChange={onEnabledChange} />
			</header>
			<div
				className={`p-3.5 transition ${
					enabled ? "opacity-100" : "pointer-events-none opacity-40"
				}`}
			>
				{children}
				{error && (
					<p className="mt-2 flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
						<AlertCircle size={13} />
						{error}
					</p>
				)}
			</div>
		</section>
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
		<section className="flex items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-[#252523]">
			<div>
				<h4 className="text-sm font-semibold">{title}</h4>
				<p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
					{description}
				</p>
			</div>
			<Toggle checked={enabled} onChange={onEnabledChange} />
		</section>
	);
}

interface ToggleProps {
	checked: boolean;
	onChange: (checked: boolean) => void;
}

function Toggle({ checked, onChange }: ToggleProps) {
	return (
		<button
			type="button"
			role="switch"
			aria-checked={checked}
			onClick={() => onChange(!checked)}
			className={`relative h-6 w-11 shrink-0 rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 ${
				checked ? "bg-orange-500" : "bg-gray-300 dark:bg-gray-600"
			}`}
		>
			<span
				className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform ${
					checked ? "translate-x-5" : "translate-x-0.5"
				}`}
			/>
		</button>
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
	const labelByValue = new Map(options.map((option) => [option.value, option.label]));

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
					<option value="">{available.length ? placeholder : "No more options"}</option>
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
	rule: TransactionRule;
	accountNameById: Map<string, string>;
}

function PreviewPanel({
	transactions,
	rule,
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
							Adjust the criteria to preview which transactions this rule will update.
						</p>
					</div>
				</div>
			) : (
				<div className="space-y-3">
					{transactions.map((transaction) => {
						const changes = describeRuleChanges(transaction, rule);
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
										<p className="truncate font-semibold">{transaction.merchant}</p>
										<p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
											{transaction.date} · {accountName || "No account"} · {transaction.category || "Uncategorized"}
										</p>
									</div>
									<p className="shrink-0 font-semibold tabular-nums">
										{transaction.amount < 0 ? "−" : "+"}${Math.abs(transaction.amount).toFixed(2)}
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
