import type { Account } from "@/store/useBudgetStore";

export type GoalStatus = "At risk" | "On track" | "Complete";
export type GoalAllocationKind = "contribution" | "adjustment" | "spending";
export type DebtStrategy = "planned" | "avalanche" | "snowball";

export type GoalAccountRecord = Account & {
	institution?: string | null;
	account_type?: string | null;
	type?: string | null;
	kind?: string | null;
	group?: string | null;
	balance?: number | null;
	current_balance?: number | null;
	last_four?: string | null;
	lastFour?: string | null;
	updated_at?: string | null;
	is_liability?: boolean | null;
};

export interface GoalAccountView {
	id: string;
	name: string;
	institution: string | null;
	accountType: string;
	group: "Cash" | "Investments" | "Other Assets" | "Credit Cards" | "Loans";
	balance: number;
	lastFour: string | null;
	isLiability: boolean;
	updatedAt: string | null;
}

export interface SavingsGoal {
	id: string;
	userId: string;
	name: string;
	targetAmount: number;
	targetDate: string | null;
	imagePath: string | null;
	imageUrl: string | null;
	spendingReducesProgress: boolean;
	archivedAt: string | null;
	createdAt: string;
	updatedAt: string;
	saved: number;
	spent: number;
	status: GoalStatus;
	linkedAccountIds: string[];
	monthlyContribution: number;
}

export interface GoalAccountLink {
	goalId: string;
	accountId: string;
	plannedMonthlyAmount: number;
}

export interface GoalAccountSetting {
	accountId: string;
	enabled: boolean;
	useEntireBalance: boolean;
	linkedGoalId: string | null;
}

export interface GoalAllocation {
	id: string;
	goalId: string;
	accountId: string | null;
	kind: GoalAllocationKind;
	amount: number;
	allocatedAt: string;
	includeInBudget: boolean;
	note: string | null;
	createdAt: string;
}

export interface GoalCreateInput {
	name: string;
	targetAmount: number;
	targetDate: string | null;
	spendingReducesProgress: boolean;
	linkedAccounts: Array<{
		accountId: string;
		plannedMonthlyAmount: number;
	}>;
	initialAllocations: Array<{
		accountId: string;
		amount: number;
		includeInBudget: boolean;
	}>;
}

export interface GoalUpdateInput {
	name?: string;
	targetAmount?: number;
	targetDate?: string | null;
	spendingReducesProgress?: boolean;
}

export interface DebtAccountSetting {
	accountId: string;
	apr: number;
	minimumPayment: number;
}

export interface DebtPaydownSetting {
	strategy: DebtStrategy;
	extraMonthlyPayment: number;
	extraOneTimePayment: number;
}
