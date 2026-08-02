"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CustomCategory, useBudgetStore } from "@/store/useBudgetStore";
import { usePlanStore } from "@/store/usePlanStore";
import { useGoalsData } from "@/hooks/useGoalsData";
import { getReportSummary } from "@/components/Reports/reportUtils";
import { CATEGORY_HIERARCHY, findParentCategory } from "@/constants";
import { buildGroupRows, getPlanKey } from "@/utils/planPageUtils";
import {
	CategorySectionId,
	getCategoryGroupPreferenceKey,
} from "@/lib/categories/categoryPreferences";
import {
	CategoryGroupRecord,
	CategoryGroupUpdate,
} from "@/lib/categories/categoryGroups";
import {
	CategoryEditorGroupOption,
	CategoryEditorValue,
} from "@/components/Categories/CategoryEditorModal";
import { SavingsGoal } from "@/lib/goals/types";
import {
	fetchGoalAccountLinks,
	setGoalAccountLinks,
} from "@/lib/goals/repository";
import { EditableAccount } from "@/components/Accounts/details/EditAccountForm";

export function usePlanPageState() {
	const router = useRouter();
	const searchParams = useSearchParams();

	const [isLoading, setIsLoading] = useState(false);

	// ---- URL sync ----
	// Parse date from query param: ?date=2026-08-01
	const initialDate = useMemo(() => {
		const dateParam = searchParams.get("date");
		if (dateParam) {
			const parts = dateParam.split("-");
			if (parts.length === 3) {
				const year = parseInt(parts[0], 10);
				const month = parseInt(parts[1], 10) - 1;
				const day = parseInt(parts[2], 10);
				if (
					!isNaN(year) &&
					!isNaN(month) &&
					month >= 0 &&
					month <= 11 &&
					!isNaN(day) &&
					day >= 1 &&
					day <= 31
				) {
					return new Date(year, month, day);
				}
			}
		}
		return new Date();
	}, [searchParams]);

	const [goalContributionGoal] = useState<SavingsGoal | null>(null);
	const [accountPaydownAccount] = useState<EditableAccount | null>(null);
	const [currentDate, setCurrentDate] = useState(initialDate);

	// ---- Store ----
	const { plans, fetchBudgetPlans, saveBudgetPlan } = usePlanStore();
	const { goals, savingsAccounts } = useGoalsData();
	const transactions = useBudgetStore((state) => state.transactions);
	const customCategories = useBudgetStore((state) => state.customCategories);
	const categoryPreferences = useBudgetStore(
		(state) => state.categoryPreferences,
	);
	// ---- Group Preferences (Income) ----
	const accounts = useBudgetStore((state) => state.accounts);
	const setCategoryPreferences = useBudgetStore(
		(state) => state.setCategoryPreferences,
	);
	const setGroupPreferences = useBudgetStore(
		(state) => state.setGroupPreferences,
	);
	const groupPreferences = useBudgetStore((state) => state.groupPreferences);

	useEffect(() => {
		setIsLoading(true);
		fetchBudgetPlans(currentDate).finally(() => setIsLoading(false));
	}, [currentDate, fetchBudgetPlans]);

	const incomeGroupPreferenceKey = useMemo(
		() => getCategoryGroupPreferenceKey("Income", undefined, true),
		[],
	);

	const incomeGroupRecord = useMemo<CategoryGroupRecord>(
		() => ({
			id: "Income",
			name: "Income",
			source_name: "Income",
			section_id: "income",
			budget_mode:
				groupPreferences[incomeGroupPreferenceKey]?.budgetMode ?? "category",
			budget_type:
				groupPreferences[incomeGroupPreferenceKey]?.budgetType ?? "flexible",
			monthly_rollover:
				groupPreferences[incomeGroupPreferenceKey]?.monthlyRollover ?? false,
			hidden: false,
			is_system: true,
			// Add missing fields with null or default values:
			user_id: "",
			sort_order: 0,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		}),
		[groupPreferences, incomeGroupPreferenceKey],
	);

	const handlePlanChange = useCallback(
		(categoryId: string, rawValue: string) => {
			const numericValue = parseFloat(rawValue.replace(/[^0-9.]/g, "")) || 0;
			saveBudgetPlan(currentDate, categoryId, numericValue);
		},
		[currentDate, saveBudgetPlan],
	);

	const handleDeleteGroup = useCallback(async () => {
		// Since "Income" is a system group, "Delete" means "Disable" (hide it)
		await setGroupPreferences((current) => ({
			...current,
			[incomeGroupPreferenceKey]: {
				...(current[incomeGroupPreferenceKey] ?? {}),
				hidden: true,
			},
		}));
	}, [incomeGroupPreferenceKey, setGroupPreferences]);

	const handleSaveGroup = useCallback(
		async (updates: CategoryGroupUpdate) => {
			await setGroupPreferences((current) => ({
				...current,
				[incomeGroupPreferenceKey]: {
					...(current[incomeGroupPreferenceKey] ?? {}),
					name: updates.name,
					budgetMode: updates.budget_mode,
					budgetType: updates.budget_type ?? undefined,
					monthlyRollover:
						updates.budget_mode === "group"
							? updates.monthly_rollover
							: undefined,
					hidden: updates.hidden,
				},
			}));
		},
		[incomeGroupPreferenceKey, setGroupPreferences],
	);

	// ---- Category Editor Data ----
	const allCategoryGroups = useMemo(() => {
		// 1. Start with all static parent groups from CATEGORY_HIERARCHY
		const groups = new Map<string, { sectionId: CategorySectionId }>();
		for (const parent of Object.keys(CATEGORY_HIERARCHY)) {
			let sectionId: CategorySectionId = "expenses";
			if (parent === "Income") sectionId = "income";
			else if (parent === "Transfers") sectionId = "transfers";
			groups.set(parent, { sectionId });
		}

		// 2. Add custom parent categories (where parent_name is null)
		for (const cat of customCategories) {
			if (!cat.parent_name || cat.parent_name.trim() === "") {
				const name = cat.name.trim();
				if (!groups.has(name)) {
					// Determine section: if name contains "income" -> income, "transfer" -> transfers, else expenses
					const lower = name.toLowerCase();
					let sectionId: CategorySectionId = "expenses";
					if (lower === "income") sectionId = "income";
					else if (lower.includes("transfer")) sectionId = "transfers";
					groups.set(name, { sectionId });
				}
			}
		}

		// 3. Convert to array
		return Array.from(groups.entries()).map(([name, { sectionId }]) => ({
			key: name,
			name,
			displayName: name,
			sectionId,
			hidden: false,
		}));
	}, [customCategories]);

	const editorGroups = useMemo<CategoryEditorGroupOption[]>(() => {
		return allCategoryGroups.map((g) => ({
			key: g.key,
			name: g.name,
			displayName: g.displayName,
			sectionId: g.sectionId,
			hidden: g.hidden,
		}));
	}, [allCategoryGroups]);

	const mapToEditorValue = useCallback(
		(cat: CustomCategory): CategoryEditorValue => {
			const prefs = categoryPreferences[cat.id] || {};
			return {
				id: cat.id,
				name: cat.name,
				icon: cat.icon_name || "❓",
				parentName: prefs.parentName || cat.parent_name || "Income",
				isSystem: cat.is_system,
				excludedFromBudget: prefs.excludedFromBudget || false,
				budgetType: prefs.budgetType || "flexible",
				monthlyRollover: prefs.monthlyRollover || false,
				rolloverStartMonth: prefs.rolloverStartMonth,
				rolloverStartingBalance: prefs.rolloverStartingBalance,
				hidden: prefs.hidden || false,
			};
		},
		[categoryPreferences],
	);

	// ---- Save Handlers ----
	const handleGoalContributionSave = useCallback(
		async (amounts: Record<string, number>, applyToFuture: boolean) => {
			if (!goalContributionGoal) return;

			// 1. Fetch current account links
			const currentLinks = await fetchGoalAccountLinks(goalContributionGoal.id);

			// 2. Update each link with new planned monthly amount
			const updatedLinks = currentLinks.map((link) => ({
				accountId: link.accountId,
				plannedMonthlyAmount: amounts[link.accountId] ?? 0,
			}));

			// 3. Save updated links to the goal
			await setGoalAccountLinks(goalContributionGoal.id, updatedLinks);

			// 4. Update the goal's total planned amount in the plan store
			const total = Object.values(amounts).reduce((sum, v) => sum + v, 0);
			saveBudgetPlan(currentDate, goalContributionGoal.id, total);

			// 5. If applyToFuture, propagate to next 12 months
			if (applyToFuture) {
				for (let i = 1; i <= 12; i++) {
					const nextMonth = new Date(currentDate);
					nextMonth.setMonth(nextMonth.getMonth() + i);
					saveBudgetPlan(nextMonth, goalContributionGoal.id, total);
				}
			}
		},
		[currentDate, saveBudgetPlan, goalContributionGoal],
	);

	const handleAccountPaydownSave = useCallback(
		(amount: number, applyToFuture: boolean) => {
			if (!accountPaydownAccount) return;
			handlePlanChange(accountPaydownAccount.id, String(amount));
			if (applyToFuture) {
				for (let i = 1; i <= 12; i++) {
					const nextMonth = new Date(currentDate);
					nextMonth.setMonth(nextMonth.getMonth() + i);
					saveBudgetPlan(nextMonth, accountPaydownAccount.id, amount);
				}
			}
		},
		[accountPaydownAccount, handlePlanChange, currentDate, saveBudgetPlan],
	);

	// Update URL when date changes
	useEffect(() => {
		const year = currentDate.getFullYear();
		const month = String(currentDate.getMonth() + 1).padStart(2, "0");
		const day = String(currentDate.getDate()).padStart(2, "0");
		const newParam = `${year}-${month}-${day}`;
		const currentParam = searchParams.get("date");
		if (currentParam !== newParam) {
			const params = new URLSearchParams(searchParams.toString());
			params.set("date", newParam);
			router.replace(`/plan?${params.toString()}`, { scroll: false });
		}
	}, [currentDate, router, searchParams]);

	// ---- Fetch plans when date changes ----
	useEffect(() => {
		fetchBudgetPlans(currentDate);
	}, [currentDate, fetchBudgetPlans]);

	// ---- Core state ----
	const [viewMode, setViewMode] = useState<"month" | "year" | "decade">(
		"month",
	);
	const [sidebarTab, setSidebarTab] = useState<
		"summary" | "income" | "expenses"
	>("summary");

	const [expandedSections, setExpandedSections] = useState({
		income: true,
		expenses: true,
		contributions: true,
	});
	const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
		{
			"Income": true,
			"Fixed": true,
			"Flexible": true,
			"Non-Monthly": true,
			"Save up": true,
			"Pay down": true,
		},
	);
	const [showUnbudgeted, setShowUnbudgeted] = useState<Record<string, boolean>>(
		{},
	);

	// ---- Derived data ----
	const monthTransactions = useMemo(() => {
		const start = new Date(
			currentDate.getFullYear(),
			currentDate.getMonth(),
			1,
		);
		const end = new Date(
			currentDate.getFullYear(),
			currentDate.getMonth() + 1,
			1,
		);
		return transactions.filter((tx) => {
			const d = new Date(tx.date);
			return d >= start && d < end;
		});
	}, [transactions, currentDate]);

	const staticCategoryNames = useMemo(() => {
		const names: string[] = [];
		for (const [parent, children] of Object.entries(CATEGORY_HIERARCHY)) {
			names.push(parent);
			for (const child of children) {
				names.push(child);
			}
		}
		return names;
	}, []);

	const categoryMap = useMemo(() => {
		const map = new Map(customCategories.map((cat) => [cat.name.trim(), cat]));
		for (const name of staticCategoryNames) {
			if (!map.has(name)) {
				const parent = findParentCategory(name);
				map.set(name, {
					id: name,
					name,
					parent_name: parent === name ? null : parent,
					icon_name: "",
					is_system: true,
				} as CustomCategory);
			}
		}
		return map;
	}, [customCategories, staticCategoryNames]);

	const summary = useMemo(
		() => getReportSummary(monthTransactions),
		[monthTransactions],
	);

	// --- Build rows for all groups (including zero actuals) ---
	const incomeRows = useMemo(() => {
		return buildGroupRows(
			"Income",
			monthTransactions,
			customCategories,
			categoryPreferences,
			categoryMap,
		);
	}, [monthTransactions, customCategories, categoryPreferences, categoryMap]);

	const expenseGroupRows = useMemo(() => {
		const groups = ["Fixed", "Flexible", "Non-Monthly"];
		return groups.reduce(
			(acc, group) => {
				acc[group] = buildGroupRows(
					group,
					monthTransactions,
					customCategories,
					categoryPreferences,
					categoryMap,
				);
				return acc;
			},
			{} as Record<string, ReturnType<typeof buildGroupRows>>,
		);
	}, [monthTransactions, customCategories, categoryPreferences, categoryMap]);

	// ---- Callbacks ----
	const getPlanned = useCallback(
		(categoryId: string) => {
			const key = getPlanKey(currentDate, categoryId);
			return plans[key] ?? 0;
		},
		[currentDate, plans],
	);

	// split into budgeted/unbudgeted
	const { budgetedIncomeRows, unbudgetedIncomeRows } = useMemo(() => {
		const budgeted: typeof incomeRows = [];
		const unbudgeted: typeof incomeRows = [];
		for (const row of incomeRows) {
			const planned = getPlanned(row.label);
			const actual = row.value;
			if (planned === 0 && actual === 0) unbudgeted.push(row);
			else budgeted.push(row);
		}
		return { budgetedIncomeRows: budgeted, unbudgetedIncomeRows: unbudgeted };
	}, [incomeRows, getPlanned]);

	const expenseGroupData = useMemo(() => {
		const result: Record<
			string,
			{
				budgeted: (typeof expenseGroupRows)["Fixed"];
				unbudgeted: (typeof expenseGroupRows)["Fixed"];
			}
		> = {
			"Fixed": { budgeted: [], unbudgeted: [] },
			"Flexible": { budgeted: [], unbudgeted: [] },
			"Non-Monthly": { budgeted: [], unbudgeted: [] },
		};

		for (const groupName of ["Fixed", "Flexible", "Non-Monthly"] as const) {
			const rows = expenseGroupRows[groupName] || [];
			for (const row of rows) {
				const planned = getPlanned(row.label);
				const actual = row.value;
				if (planned === 0 && actual === 0) {
					result[groupName].unbudgeted.push(row);
				} else {
					result[groupName].budgeted.push(row);
				}
			}
		}
		return result;
	}, [expenseGroupRows, getPlanned]);

	const groupTotals = useMemo(() => {
		const totals: Record<string, number> = {};
		for (const [group, data] of Object.entries(expenseGroupData)) {
			const allRows = [...data.budgeted, ...data.unbudgeted];
			totals[group] = allRows.reduce((sum, r) => sum + r.value, 0);
		}
		return totals;
	}, [expenseGroupData]);

	const sidebarData = useMemo(() => {
		const incomePlanned = getPlanned("Income");
		const incomeActual = summary.totalIncome;
		const expensesPlanned =
			getPlanned("Fixed") + getPlanned("Flexible") + getPlanned("Non-Monthly");
		const expensesActual = summary.totalExpenses;
		const saveUpPlanned = getPlanned("Save up");
		const saveUpActual = goals.reduce((sum, g) => sum + (g.saved || 0), 0);
		const payDownPlanned = getPlanned("Pay down");
		const payDownActual = accounts
			.filter((acc) => !acc.exclude_from_paydown)
			.reduce((sum, acc) => sum + Math.abs(acc.current_balance || 0), 0);
		return {
			income: { planned: incomePlanned, actual: incomeActual },
			expenses: { planned: expensesPlanned, actual: expensesActual },
			saveUp: { planned: saveUpPlanned, actual: saveUpActual },
			payDown: { planned: payDownPlanned, actual: payDownActual },
		};
	}, [getPlanned, summary, goals, accounts]);

	const goToPreviousMonth = useCallback(() => {
		const newDate = new Date(currentDate);
		newDate.setMonth(newDate.getMonth() - 1);
		setCurrentDate(newDate);
	}, [currentDate]);

	const goToNextMonth = useCallback(() => {
		const newDate = new Date(currentDate);
		newDate.setMonth(newDate.getMonth() + 1);
		setCurrentDate(newDate);
	}, [currentDate]);

	const goToToday = useCallback(() => {
		setCurrentDate(new Date());
	}, []);

	const toggleSection = useCallback((key: keyof typeof expandedSections) => {
		setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
	}, []);

	const toggleGroup = useCallback((groupName: string) => {
		setExpandedGroups((prev) => ({ ...prev, [groupName]: !prev[groupName] }));
	}, []);

	const toggleUnbudgeted = useCallback((group: string) => {
		setShowUnbudgeted((prev) => ({ ...prev, [group]: !prev[group] }));
	}, []);

	const toggleAllCollapse = useCallback(() => {
		const allCollapsed =
			Object.values(expandedSections).every((v) => v === false) &&
			Object.values(expandedGroups).every((v) => v === false);
		if (allCollapsed) {
			setExpandedSections({
				income: true,
				expenses: true,
				contributions: true,
			});
			setExpandedGroups({
				"Income": true,
				"Fixed": true,
				"Flexible": true,
				"Non-Monthly": true,
				"Save up": true,
				"Pay down": true,
			});
		} else {
			setExpandedSections({
				income: false,
				expenses: false,
				contributions: false,
			});
			setExpandedGroups({
				"Income": false,
				"Fixed": false,
				"Flexible": false,
				"Non-Monthly": false,
				"Save up": false,
				"Pay down": false,
			});
		}
	}, [expandedSections, expandedGroups]);

	// Return everything needed by the component
	return {
		currentDate,
		viewMode,
		setViewMode,
		expandedSections,
		expandedGroups,
		showUnbudgeted,
		budgetedIncomeRows,
		unbudgetedIncomeRows,
		// Data
		monthTransactions,
		categoryMap,
		summary,
		incomeRows,
		expenseGroupRows,
		groupTotals,
		sidebarData,
		goals,
		savingsAccounts,
		accounts,
		sidebarTab,
		setSidebarTab,
        isLoading,
		// Store actions (if needed)
		setCategoryPreferences,
		setGroupPreferences,
		// Callbacks
		getPlanned,
		handlePlanChange,
		goToPreviousMonth,
		goToNextMonth,
		goToToday,
		toggleSection,
		toggleGroup,
		toggleUnbudgeted,
		toggleAllCollapse,
		incomeGroupRecord,
		handleDeleteGroup,
		handleSaveGroup,
		editorGroups,
		mapToEditorValue,
		handleGoalContributionSave,
		handleAccountPaydownSave,
		expenseGroupData,
		// Navigation / URL helpers
		router,
		searchParams,
	};
}
