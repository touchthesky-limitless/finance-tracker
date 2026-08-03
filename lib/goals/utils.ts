import type { GoalAllocation } from "@/lib/goals/types";

function monthKey(value: string): string {
	return value.slice(0, 7);
}

function monthLabel(key: string): string {
	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		year: "numeric",
		timeZone: "UTC",
	}).format(new Date(`${key}-01T00:00:00Z`));
}

// Adds months to a date (UTC‑based)
export function addMonths(date: Date, amount: number): Date {
	return new Date(
		Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1),
	);
}

// Parses a currency string (e.g., "$1,234.56") to a number
export function parseAmount(value: string): number {
	const parsed = Number(value.replace(/[^0-9.]/g, ""));
	return Number.isFinite(parsed) ? parsed : 0;
}

// Build contribution data for the contributions chart
export function buildContributionData(allocations: GoalAllocation[]) {
	const values = new Map<string, number>();

	for (const allocation of allocations) {
		if (allocation.kind === "spending") {
			continue;
		}

		const key = monthKey(allocation.allocatedAt);
		values.set(key, (values.get(key) ?? 0) + allocation.amount);
	}

	return [...values.entries()]
		.sort(([first], [second]) => first.localeCompare(second))
		.map(([key, amount]) => ({
			key,
			month: monthLabel(key),
			amount,
		}));
}

// Calculate debt projection (exactly as in DebtPaydownPageClient)
export function calculateDebtProjection({
	principal,
	weightedApr,
	minimumPayment,
	extraMonthly,
	extraOneTime,
}: {
	principal: number;
	weightedApr: number;
	minimumPayment: number;
	extraMonthly: number;
	extraOneTime: number;
}) {
	const points: Array<{
		month: string;
		balance: number;
		principal: number;
		interest: number;
	}> = [];
	let balance = Math.max(0, principal - extraOneTime);
	let totalInterest = 0;
	const monthlyRate = weightedApr / 100 / 12;
	const payment = Math.max(1, minimumPayment + extraMonthly);
	const start = new Date();

	for (let index = 0; index < 240 && balance > 0.01; index += 1) {
		const interest = balance * monthlyRate;
		const principalPayment = Math.min(balance, Math.max(0, payment - interest));
		totalInterest += interest;
		balance = Math.max(0, balance + interest - payment);
		const date = addMonths(start, index);
		points.push({
			month: new Intl.DateTimeFormat("en-US", {
				month: "short",
				year: "numeric",
				timeZone: "UTC",
			}).format(date),
			balance,
			principal: principalPayment,
			interest,
		});
	}

	return { points, totalInterest };
}
