import { findParentCategory } from "@/constants";
import type { Transaction } from "@/store/useBudgetStore";
import type {
	ReportCategoryRow,
	ReportGrouping,
	ReportInterval,
	ReportMonthRow,
	ReportSummary,
} from "@/components/Reports/types";

export const REPORT_COLORS = [
	"#09A5C4",
	"#32A86F",
	"#FFC13D",
	"#FF642B",
	"#8A49CA",
	"#69D0ED",
	"#D43797",
	"#4664DA",
	"#B8E958",
	"#A52D79",
] as const;


export function getReportGroupLabel(
	transaction: Transaction,
	grouping: ReportGrouping,
): string {
	const category = transaction.category?.trim() || "Uncategorized";

	if (grouping === "merchant") {
		return transaction.merchant?.trim() || "Unknown merchant";
	}

	if (grouping === "group") {
		return findParentCategory(category);
	}

	if (grouping === "fixed-flexible") {
		const fixedNames = new Set([
			"Mortgage",
			"Rent",
			"Loan Repayment",
			"Insurance",
			"Utilities",
		]);
		return fixedNames.has(category) ? "Fixed" : "Flexible";
	}

	return category;
}

export function getReportSummary(transactions: Transaction[]): ReportSummary {
	let totalIncome = 0;
	let totalExpenses = 0;
	let largestTransaction = 0;

	for (const transaction of transactions) {
		const amount = Number(transaction.amount) || 0;
		const absoluteAmount = Math.abs(amount);

		if (amount >= 0) totalIncome += amount;
		else totalExpenses += absoluteAmount;

		largestTransaction = Math.max(largestTransaction, absoluteAmount);
	}

	const sorted = [...transactions].sort((first, second) => {
		return new Date(first.date).getTime() - new Date(second.date).getTime();
	});
	const netIncome = totalIncome - totalExpenses;

	return {
		totalIncome,
		totalExpenses,
		netIncome,
		savingsRate:
			totalIncome > 0 && netIncome > 0 ? (netIncome / totalIncome) * 100 : 0,
		largestTransaction,
		averageTransaction:
			transactions.length > 0
				? transactions.reduce((sum, transaction) => {
						return sum + Math.abs(Number(transaction.amount) || 0);
					}, 0) / transactions.length
				: 0,
		firstTransaction: sorted[0] ?? null,
		lastTransaction: sorted[sorted.length - 1] ?? null,
	};
}

export function buildCategoryRows(
	transactions: Transaction[],
	grouping: ReportGrouping,
	kind: "income" | "expense",
): ReportCategoryRow[] {
	const groups = new Map<string, { value: number; transactionIds: string[] }>();

	for (const transaction of transactions) {
		const amount = Number(transaction.amount) || 0;
		const include = kind === "income" ? amount > 0 : amount < 0;
		if (!include) continue;

		const label = getReportGroupLabel(transaction, grouping);
		const current = groups.get(label) ?? { value: 0, transactionIds: [] };
		current.value += Math.abs(amount);
		current.transactionIds.push(transaction.id);
		groups.set(label, current);
	}

	const total = [...groups.values()].reduce((sum, group) => {
		return sum + group.value;
	}, 0);

	return [...groups.entries()]
		.sort((first, second) => second[1].value - first[1].value)
		.map(([label, group], index) => ({
			key: `${kind}:${label}`,
			label,
			icon: "",
			// Category icons are resolved by UI renderers through
			// getIconForCategory(), not hardcoded in this data utility.
			value: group.value,
			color: REPORT_COLORS[index % REPORT_COLORS.length],
			percentage: total > 0 ? (group.value / total) * 100 : 0,
			transactionIds: group.transactionIds,
		}));
}

function intervalKey(date: Date, interval: ReportInterval): string {
	if (interval === "yearly") return String(date.getFullYear());
	if (interval === "quarterly") {
		return `${date.getFullYear()}-Q${Math.floor(date.getMonth() / 3) + 1}`;
	}
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function intervalLabel(date: Date, interval: ReportInterval): string {
	if (interval === "yearly") return String(date.getFullYear());
	if (interval === "quarterly") {
		return `Q${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}`;
	}
	return date.toLocaleDateString("en-US", {
		month: "short",
		year: "numeric",
	});
}

export function buildMonthlyRows(
	transactions: Transaction[],
	grouping: ReportGrouping,
	interval: ReportInterval,
): ReportMonthRow[] {
	const rows = new Map<string, ReportMonthRow>();

	for (const transaction of transactions) {
		const date = new Date(transaction.date);
		if (!Number.isFinite(date.getTime())) continue;

		const key = intervalKey(date, interval);
		const row = rows.get(key) ?? {
			key,
			label: intervalLabel(date, interval),
			date,
			total: 0,
			income: 0,
			expenses: 0,
			net: 0,
			values: {},
			transactionIds: [],
			incomeTransactionIds: [],
			expenseTransactionIds: [],
			transactionIdsByLabel: {},
		};
		const amount = Number(transaction.amount) || 0;
		const label = getReportGroupLabel(transaction, grouping);
		const absoluteAmount = Math.abs(amount);

		row.transactionIds.push(transaction.id);
		if (amount >= 0) {
			row.income += amount;
			row.incomeTransactionIds.push(transaction.id);
		} else {
			row.expenses += absoluteAmount;
			row.expenseTransactionIds.push(transaction.id);
		}

		row.net = row.income - row.expenses;
		row.total += absoluteAmount;
		row.values[label] = (row.values[label] ?? 0) + absoluteAmount;
		row.transactionIdsByLabel[label] = [
			...(row.transactionIdsByLabel[label] ?? []),
			transaction.id,
		];
		rows.set(key, row);
	}

	return [...rows.values()].sort((first, second) => {
		return first.date.getTime() - second.date.getTime();
	});
}

export function formatDateRangeLabel(startDate: string, endDate: string): string {
	if (!startDate && !endDate) return "All time";
	const formatter = new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
	const start = startDate
		? formatter.format(new Date(`${startDate}T00:00:00`))
		: "Beginning";
	const end = endDate
		? formatter.format(new Date(`${endDate}T00:00:00`))
		: "Today";
	return `${start} – ${end}`;
}
