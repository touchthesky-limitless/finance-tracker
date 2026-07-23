import type { Transaction } from "@/store/useBudgetStore";

export type RuleTextOperator =
	| "contains"
	| "equals"
	| "starts_with"
	| "ends_with";

export type RuleAmountDirection = "debit" | "credit" | "any";

export type RuleAmountOperator =
	| "greater_than"
	| "greater_than_or_equal"
	| "less_than"
	| "less_than_or_equal"
	| "equals";

export type RuleReviewStatus = "needs_review" | "reviewed";

export interface RuleTextCriterion {
	operator: RuleTextOperator;
	value: string;
}

export interface RuleAmountCriterion {
	direction: RuleAmountDirection;
	operator: RuleAmountOperator;
	value: number;
}

export interface TransactionRuleCriteria {
	originalStatement?: RuleTextCriterion;
	merchantName?: RuleTextCriterion;
	amount?: RuleAmountCriterion;
	categories?: string[];
	accountIds?: string[];
}

export interface RuleMerchantAction {
	merchantId: string | null;
	name: string;
}

export interface TransactionRuleActions {
	renameMerchant?: RuleMerchantAction;
	updateCategory?: string;
	addTags?: string[];
	hideTransaction?: boolean;
	reviewStatus?: RuleReviewStatus;
}

export interface TransactionRule {
	id: string;
	name: string;
	criteria: TransactionRuleCriteria;
	actions: TransactionRuleActions;
	createdAt?: string;
	updatedAt?: string;
	sortOrder?: number;
}

export interface RuleTransactionUpdate {
	merchant?: string;
	merchant_id?: string | null;
	category?: string;
	tags?: string[];
	needs_review?: boolean;
	needs_subcat?: boolean;
	is_hidden?: boolean;
}

export interface RulePreviewChange {
	field: string;
	before: string;
	after: string;
}

function normalize(value?: string | null): string {
	return value?.trim().toLowerCase().replace(/\s+/g, " ") ?? "";
}

function uniqueNormalized(values: string[]): string[] {
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

function matchesText(
	candidate: string | null | undefined,
	criterion: RuleTextCriterion,
): boolean {
	const left = normalize(candidate);
	const right = normalize(criterion.value);

	if (!left || !right) {
		return false;
	}

	switch (criterion.operator) {
		case "equals":
			return left === right;
		case "starts_with":
			return left.startsWith(right);
		case "ends_with":
			return left.endsWith(right);
		case "contains":
		default:
			return left.includes(right);
	}
}

function matchesAmount(
	transactionAmount: number,
	criterion: RuleAmountCriterion,
): boolean {
	const directionMatches =
		criterion.direction === "any" ||
		(criterion.direction === "debit" && transactionAmount < 0) ||
		(criterion.direction === "credit" && transactionAmount >= 0);

	if (!directionMatches) {
		return false;
	}

	const amount = Math.abs(Number(transactionAmount));
	const target = Math.abs(Number(criterion.value));

	if (!Number.isFinite(amount) || !Number.isFinite(target)) {
		return false;
	}

	switch (criterion.operator) {
		case "greater_than":
			return amount > target;
		case "greater_than_or_equal":
			return amount >= target;
		case "less_than":
			return amount < target;
		case "less_than_or_equal":
			return amount <= target;
		case "equals":
		default:
			return Math.abs(amount - target) < 0.005;
	}
}

export function getOriginalStatement(transaction: Transaction): string {
	return transaction.description?.trim() || transaction.merchant?.trim() || "";
}

export function matchesTransactionRule(
	transaction: Transaction,
	rule: TransactionRule,
): boolean {
	const { criteria } = rule;

	if (
		criteria.originalStatement &&
		!matchesText(getOriginalStatement(transaction), criteria.originalStatement)
	) {
		return false;
	}

	if (
		criteria.merchantName &&
		!matchesText(transaction.merchant, criteria.merchantName)
	) {
		return false;
	}

	if (criteria.amount && !matchesAmount(transaction.amount, criteria.amount)) {
		return false;
	}

	if (criteria.categories?.length) {
		const allowed = new Set(criteria.categories.map(normalize));

		if (!allowed.has(normalize(transaction.category))) {
			return false;
		}
	}

	if (criteria.accountIds?.length) {
		const accountId = transaction.account_id?.trim();

		if (!accountId || !criteria.accountIds.includes(accountId)) {
			return false;
		}
	}

	return true;
}

export function getRuleTransactionUpdates(
	transaction: Transaction,
	rule: TransactionRule,
): RuleTransactionUpdate {
	const updates: RuleTransactionUpdate = {};
	const { actions } = rule;

	if (actions.renameMerchant) {
		updates.merchant = actions.renameMerchant.name.trim();
		updates.merchant_id = actions.renameMerchant.merchantId;
	}

	if (actions.updateCategory) {
		const category = actions.updateCategory.trim();
		updates.category = category;
		updates.needs_subcat = normalize(category) === "uncategorized";
	}

	if (actions.addTags?.length) {
		updates.tags = uniqueNormalized([
			...(transaction.tags ?? []),
			...actions.addTags,
		]);
	}

	if (actions.hideTransaction === true) {
		updates.is_hidden = true;
	}

	if (actions.reviewStatus) {
		updates.needs_review = actions.reviewStatus === "needs_review";
	}

	return updates;
}

export function applyTransactionRule(
	transaction: Transaction,
	rule: TransactionRule,
): Transaction & { is_hidden?: boolean } {
	if (!matchesTransactionRule(transaction, rule)) {
		return transaction;
	}

	return {
		...transaction,
		...getRuleTransactionUpdates(transaction, rule),
	};
}

export function describeRuleChanges(
	transaction: Transaction,
	rule: TransactionRule,
): RulePreviewChange[] {
	if (!matchesTransactionRule(transaction, rule)) {
		return [];
	}

	const updates = getRuleTransactionUpdates(transaction, rule);
	const changes: RulePreviewChange[] = [];

	if (updates.merchant !== undefined && updates.merchant !== transaction.merchant) {
		changes.push({
			field: "Merchant",
			before: transaction.merchant || "—",
			after: updates.merchant || "—",
		});
	}

	if (updates.category !== undefined && updates.category !== transaction.category) {
		changes.push({
			field: "Category",
			before: transaction.category || "—",
			after: updates.category || "—",
		});
	}

	if (updates.tags !== undefined) {
		const before = uniqueNormalized(transaction.tags ?? []);
		const after = uniqueNormalized(updates.tags);

		if (before.join("\u001f") !== after.join("\u001f")) {
			changes.push({
				field: "Tags",
				before: before.join(", ") || "None",
				after: after.join(", ") || "None",
			});
		}
	}

	if (updates.needs_review !== undefined) {
		const before = transaction.needs_review ? "Needs review" : "Reviewed";
		const after = updates.needs_review ? "Needs review" : "Reviewed";

		if (before !== after) {
			changes.push({ field: "Review", before, after });
		}
	}

	if (updates.is_hidden === true) {
		changes.push({ field: "Visibility", before: "Visible", after: "Hidden" });
	}

	return changes;
}

export function hasRuleCriteria(rule: TransactionRule): boolean {
	const criteria = rule.criteria;

	return Boolean(
		criteria.originalStatement ||
		criteria.merchantName ||
		criteria.amount ||
		criteria.categories?.length ||
		criteria.accountIds?.length,
	);
}

export function hasRuleActions(rule: TransactionRule): boolean {
	const actions = rule.actions;

	return Boolean(
		actions.renameMerchant ||
		actions.updateCategory ||
		actions.addTags?.length ||
		actions.hideTransaction ||
		actions.reviewStatus,
	);
}
