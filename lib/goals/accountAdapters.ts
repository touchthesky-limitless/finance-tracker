import type { Transaction } from "@/store/useBudgetStore";
import type {
	GoalAccountRecord,
	GoalAccountView,
} from "@/lib/goals/types";

function normalize(value: unknown): string {
	return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function readFiniteNumber(...values: unknown[]): number | null {
	for (const value of values) {
		if (value === null || value === undefined || value === "") {
			continue;
		}

		const parsed = Number(value);

		if (Number.isFinite(parsed)) {
			return parsed;
		}
	}

	return null;
}

function inferLastFour(account: GoalAccountRecord): string | null {
	const explicit = account.last_four?.trim() || account.lastFour?.trim();

	if (explicit) {
		return explicit.slice(-4);
	}

	const matches = account.name.match(/\d{4}/g);
	return matches?.at(-1) ?? null;
}

function classifyAccount(account: GoalAccountRecord): {
	group: GoalAccountView["group"];
	isLiability: boolean;
	accountType: string;
} {
	const accountType =
		account.account_type?.trim() ||
		account.type?.trim() ||
		account.kind?.trim() ||
		"Account";
	const searchable = [
		account.name,
		accountType,
		account.group,
	]
		.map(normalize)
		.join(" ");

	if (
		account.is_liability === true ||
		searchable.includes("credit") ||
		searchable.includes("card")
	) {
		return { group: "Credit Cards", isLiability: true, accountType };
	}

	if (
		searchable.includes("loan") ||
		searchable.includes("mortgage") ||
		searchable.includes("debt")
	) {
		return { group: "Loans", isLiability: true, accountType };
	}

	if (
		searchable.includes("broker") ||
		searchable.includes("investment") ||
		searchable.includes("401") ||
		searchable.includes("ira") ||
		searchable.includes("stock")
	) {
		return { group: "Investments", isLiability: false, accountType };
	}

	if (
		searchable.includes("checking") ||
		searchable.includes("saving") ||
		searchable.includes("cash") ||
		searchable.includes("money market")
	) {
		return { group: "Cash", isLiability: false, accountType };
	}

	return { group: "Other Assets", isLiability: false, accountType };
}

function calculateTransactionBalance(
	account: GoalAccountRecord,
	transactions: Transaction[],
): number {
	return transactions.reduce((total, transaction) => {
		const belongsToAccount = transaction.account_id
			? transaction.account_id === account.id
			: normalize(transaction.account) === normalize(account.name);

		return belongsToAccount
			? total + (Number(transaction.amount) || 0)
			: total;
	}, 0);
}

export function buildGoalAccountViews(
	accounts: GoalAccountRecord[],
	transactions: Transaction[],
): GoalAccountView[] {
	return accounts
		.map((account) => {
			const classification = classifyAccount(account);
			const storedBalance = readFiniteNumber(
				account.current_balance,
				account.balance,
			);
			const balance =
				storedBalance ?? calculateTransactionBalance(account, transactions);

			return {
				id: account.id,
				name: account.name,
				institution: account.institution?.trim() || null,
				accountType: classification.accountType,
				group: classification.group,
				balance,
				lastFour: inferLastFour(account),
				isLiability: classification.isLiability,
				updatedAt: account.updated_at?.trim() || account.created_at || null,
			};
		})
		.sort((first, second) => {
			return first.name.localeCompare(second.name);
		});
}

export function getSavingsEligibleAccounts(
	accounts: GoalAccountView[],
): GoalAccountView[] {
	return accounts.filter((account) => !account.isLiability);
}

export function getDebtAccounts(
	accounts: GoalAccountView[],
): GoalAccountView[] {
	return accounts
		.filter((account) => account.isLiability)
		.map((account) => ({
			...account,
			balance: Math.abs(account.balance),
		}));
}

export function formatAccountName(account: GoalAccountView): string {
	return account.lastFour
		? `${account.name} (...${account.lastFour})`
		: account.name;
}
