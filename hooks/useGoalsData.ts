"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
	buildGoalAccountViews,
	getDebtAccounts,
	getSavingsEligibleAccounts,
} from "@/lib/goals/accountAdapters";
import {
	fetchDebtAccountSettings,
	fetchDebtPaydownSetting,
	fetchGoalAccountSettings,
	fetchSavingsGoals,
} from "@/lib/goals/repository";
import type {
	DebtAccountSetting,
	DebtPaydownSetting,
	GoalAccountRecord,
	GoalAccountSetting,
	SavingsGoal,
} from "@/lib/goals/types";
import { useBudgetStore } from "@/store/useBudgetStore";

interface GoalsDataState {
	goals: SavingsGoal[];
	goalAccountSettings: GoalAccountSetting[];
	debtAccountSettings: DebtAccountSetting[];
	debtPaydownSetting: DebtPaydownSetting;
}

const INITIAL_STATE: GoalsDataState = {
	goals: [],
	goalAccountSettings: [],
	debtAccountSettings: [],
	debtPaydownSetting: {
		strategy: "planned",
		extraMonthlyPayment: 0,
		extraOneTimePayment: 0,
	},
};

export function useGoalsData() {
	const accounts = useBudgetStore((state) => state.accounts);
	const transactions = useBudgetStore((state) => state.transactions);
	const fetchAccounts = useBudgetStore((state) => state.fetchAccounts);
	const fetchTransactions = useBudgetStore((state) => state.fetchTransactions);
	const [data, setData] = useState<GoalsDataState>(INITIAL_STATE);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [reloadToken, setReloadToken] = useState(0);

	const reload = useCallback((): void => {
		setReloadToken((current) => current + 1);
	}, []);

	useEffect(() => {
		let cancelled = false;

		const load = async (): Promise<void> => {
			setIsLoading(true);
			setError(null);

			try {
				await Promise.all([fetchAccounts(true), fetchTransactions()]);
				const [goals, goalAccountSettings, debtAccountSettings, debtPaydownSetting] =
					await Promise.all([
						fetchSavingsGoals(),
						fetchGoalAccountSettings(),
						fetchDebtAccountSettings(),
						fetchDebtPaydownSetting(),
					]);

				if (!cancelled) {
					setData({
						goals,
						goalAccountSettings,
						debtAccountSettings,
						debtPaydownSetting,
					});
				}
			} catch (loadError) {
				if (!cancelled) {
					setError(
						loadError instanceof Error
							? loadError.message
							: "Failed to load goals.",
					);
				}
			} finally {
				if (!cancelled) {
					setIsLoading(false);
				}
			}
		};

		void load();

		return () => {
			cancelled = true;
		};
	}, [fetchAccounts, fetchTransactions, reloadToken]);

	const accountViews = useMemo(() => {
		return buildGoalAccountViews(
			accounts as GoalAccountRecord[],
			transactions,
		);
	}, [accounts, transactions]);

	const savingsAccounts = useMemo(() => {
		return getSavingsEligibleAccounts(accountViews);
	}, [accountViews]);

	const debtAccounts = useMemo(() => {
		return getDebtAccounts(accountViews);
	}, [accountViews]);

	const enabledSavingsAccounts = useMemo(() => {
		const settingsByAccountId = new Map(
			data.goalAccountSettings.map((setting) => {
				return [setting.accountId, setting] as const;
			}),
		);

		return savingsAccounts.filter((account) => {
			return settingsByAccountId.get(account.id)?.enabled === true;
		});
	}, [data.goalAccountSettings, savingsAccounts]);

	const availableForGoals = useMemo(() => {
		const totalEnabledBalance = enabledSavingsAccounts.reduce(
			(total, account) => total + Math.max(0, account.balance),
			0,
		);
		const allocated = data.goals.reduce((total, goal) => total + goal.saved, 0);

		return Math.max(0, totalEnabledBalance - allocated);
	}, [data.goals, enabledSavingsAccounts]);

	return {
		...data,
		accountViews,
		savingsAccounts,
		debtAccounts,
		enabledSavingsAccounts,
		availableForGoals,
		isLoading,
		error,
		reload,
	};
}
