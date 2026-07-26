import type { GoalStatus, SavingsGoal } from "@/lib/goals/types";

const monthFormatter = new Intl.DateTimeFormat("en-US", {
	month: "short",
	year: "numeric",
	timeZone: "UTC",
});

export function formatCurrency(value: number): string {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(Number.isFinite(value) ? value : 0);
}

export function formatCompactCurrency(value: number): string {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		maximumFractionDigits: 0,
	}).format(Number.isFinite(value) ? value : 0);
}

export function formatGoalDate(goal: Pick<SavingsGoal, "targetDate">): string {
	if (!goal.targetDate) {
		return "No target date";
	}

	return monthFormatter.format(new Date(`${goal.targetDate.slice(0, 10)}T00:00:00Z`));
}

export function getGoalProgress(
	goal: Pick<SavingsGoal, "saved" | "targetAmount">,
): number {
	if (goal.targetAmount <= 0) {
		return 0;
	}

	return Math.min(100, Math.max(0, (goal.saved / goal.targetAmount) * 100));
}

export function deriveGoalStatus({
	saved,
	targetAmount,
	targetDate,
}: {
	saved: number;
	targetAmount: number;
	targetDate: string | null;
}): GoalStatus {
	if (targetAmount > 0 && saved >= targetAmount) {
		return "Complete";
	}

	if (!targetDate || targetAmount <= 0) {
		return "On track";
	}

	const today = new Date();
	const target = new Date(`${targetDate.slice(0, 10)}T23:59:59Z`);
	const remainingMonths = Math.max(
		1,
		(target.getUTCFullYear() - today.getUTCFullYear()) * 12 +
			target.getUTCMonth() -
			today.getUTCMonth(),
	);
	const neededPerMonth = Math.max(0, targetAmount - saved) / remainingMonths;
	const elapsedRatio = Math.max(
		0,
		Math.min(1, 1 - remainingMonths / Math.max(remainingMonths + 12, 1)),
	);
	const expectedSaved = targetAmount * elapsedRatio;

	return saved + neededPerMonth >= expectedSaved ? "On track" : "At risk";
}
