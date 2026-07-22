/* This handles:

*Fetching rules from Supabase
*Creating and updating rules
*Deleting rules
*Optionally applying a rule to existing transactions
*Updating matching transactions in controlled batches
 */

import { createClient } from "@/lib/supabase";
import type { Transaction } from "@/store/useBudgetStore";
import {
	applyTransactionRule,
	getRuleTransactionUpdates,
	matchesTransactionRule,
	type RuleTransactionUpdate,
	type TransactionRule,
} from "@/lib/rules/ruleEngine";

const supabase = createClient();

interface RuleRow {
	id: string;
	name: string;
	criteria: TransactionRule["criteria"];
	actions: TransactionRule["actions"];
	created_at: string | null;
	updated_at: string | null;
}

export interface RuleSaveResult {
	rule: TransactionRule;
	matchingTransactions: Transaction[];
	updatedTransactions: Transaction[];
	snapshot: Transaction[];
}

async function getUserId(): Promise<string> {
	const {
		data: { session },
		error,
	} = await supabase.auth.getSession();

	if (error) {
		throw error;
	}

	if (!session?.user.id) {
		throw new Error("You must be signed in to manage rules.");
	}

	return session.user.id;
}

function fromRow(row: RuleRow): TransactionRule {
	return {
		id: row.id,
		name: row.name,
		criteria: row.criteria ?? {},
		actions: row.actions ?? {},
		createdAt: row.created_at ?? undefined,
		updatedAt: row.updated_at ?? undefined,
	};
}

function removeUndefined(
	updates: RuleTransactionUpdate,
): Record<string, unknown> {
	return Object.fromEntries(
		Object.entries(updates).filter(([, value]) => value !== undefined),
	);
}

export async function fetchTransactionRules(): Promise<TransactionRule[]> {
	const userId = await getUserId();
	const { data, error } = await supabase
		.from("rules")
		.select("id, name, criteria, actions, created_at, updated_at")
		.eq("user_id", userId)
		.order("updated_at", { ascending: false });

	if (error) {
		throw error;
	}

	return ((data ?? []) as RuleRow[]).map(fromRow);
}

export async function saveTransactionRule(
	rule: TransactionRule,
	transactions: Transaction[],
	applyToExisting: boolean,
): Promise<RuleSaveResult> {
	const userId = await getUserId();
	const now = new Date().toISOString();

	const { data, error } = await supabase
		.from("rules")
		.upsert(
			{
				id: rule.id,
				user_id: userId,
				name: rule.name.trim() || "Untitled rule",
				criteria: rule.criteria,
				actions: rule.actions,
				updated_at: now,
			},
			{ onConflict: "id" },
		)
		.select("id, name, criteria, actions, created_at, updated_at")
		.single();

	if (error) {
		throw error;
	}

	const savedRule = fromRow(data as RuleRow);
	const matchingTransactions = transactions.filter((transaction) => {
		return matchesTransactionRule(transaction, savedRule);
	});
	const snapshot = transactions.map((transaction) => ({ ...transaction }));

	if (!applyToExisting || matchingTransactions.length === 0) {
		return {
			rule: savedRule,
			matchingTransactions,
			updatedTransactions: transactions,
			snapshot,
		};
	}

	const updatesById = new Map<string, RuleTransactionUpdate>();

	for (const transaction of matchingTransactions) {
		const updates = getRuleTransactionUpdates(transaction, savedRule);
		updatesById.set(transaction.id, updates);
	}

	/*
	 * Tags are merged per transaction, so each matched row can have a different
	 * update payload. Run small parallel groups instead of one unbounded request.
	 */
	const concurrency = 20;
	const entries = [...updatesById.entries()];

	for (let index = 0; index < entries.length; index += concurrency) {
		const batch = entries.slice(index, index + concurrency);

		await Promise.all(
			batch.map(async ([transactionId, updates]) => {
				const payload = removeUndefined(updates);

				if (Object.keys(payload).length === 0) {
					return;
				}

				const { error: updateError } = await supabase
					.from("transactions")
					.update(payload)
					.eq("user_id", userId)
					.eq("id", transactionId);

				if (updateError) {
					throw updateError;
				}
			}),
		);
	}

	const updatedTransactions = transactions.map((transaction) => {
		return matchesTransactionRule(transaction, savedRule)
			? applyTransactionRule(transaction, savedRule)
			: transaction;
	});

	return {
		rule: savedRule,
		matchingTransactions,
		updatedTransactions,
		snapshot,
	};
}

export async function deleteTransactionRule(ruleId: string): Promise<void> {
	const userId = await getUserId();
	const { error } = await supabase
		.from("rules")
		.delete()
		.eq("user_id", userId)
		.eq("id", ruleId);

	if (error) {
		throw error;
	}
}
