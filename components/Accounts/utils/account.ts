import {
	Building2,
	Car,
	CreditCard,
	Home,
	Landmark,
	LineChart,
	WalletCards,
} from "lucide-react";

import type { AccountKind, AccountRecord } from "@/components/Accounts/types";

// ✅ Expanded union to include all distinct groups
export type AccountGroup =
	| "Cash"
	| "Investments"
	| "Real Estate"
	| "Vehicles"
	| "Valuables"
	| "Other Assets"
	| "Credit Cards"
	| "Loans"
	| "Other Liabilities";

export function isLiabilityKind(kind: AccountKind): boolean {
	return ["credit-card", "mortgage", "loan", "other-liability"].includes(kind);
}

export function classifyAccount(
	name: string,
	balance: number,
): {
	kind: AccountKind;
	type: string;
	group: AccountRecord["group"];
	isLiability: boolean;
} {
	const normalized = name.toLowerCase();

	if (
		normalized.includes("credit") ||
		normalized.includes("card") ||
		normalized.includes("amex") ||
		normalized.includes("sapphire") ||
		normalized.includes("unlimited") ||
		normalized.includes("flex")
	) {
		return {
			kind: "credit-card",
			type: "Credit Card",
			group: "Credit Cards",
			isLiability: true,
		};
	}

	if (
		normalized.includes("401") ||
		normalized.includes("investment") ||
		normalized.includes("broker") ||
		normalized.includes("vanguard") ||
		normalized.includes("fidelity")
	) {
		return {
			kind: "investment",
			type: "Investment",
			group: "Investments",
			isLiability: false,
		};
	}

	if (normalized.includes("mortgage")) {
		return {
			kind: "mortgage",
			type: "Mortgage",
			group: "Loans",
			isLiability: true,
		};
	}

	if (normalized.includes("loan")) {
		return {
			kind: "loan",
			type: "Loan",
			group: "Loans",
			isLiability: true,
		};
	}

	if (
		normalized.includes("checking") ||
		normalized.includes("saving") ||
		normalized.includes("cash")
	) {
		return {
			kind: "cash",
			type: normalized.includes("saving") ? "Savings" : "Checking",
			group: "Cash",
			isLiability: false,
		};
	}

	return balance < 0
		? {
				kind: "credit-card",
				type: "Credit Card",
				group: "Credit Cards",
				isLiability: true,
			}
		: {
				kind: "cash",
				type: "Cash",
				group: "Cash",
				isLiability: false,
			};
}

export function accountIcon(kind: AccountKind): typeof WalletCards {
	if (kind === "cash") return Landmark;
	if (kind === "investment") return LineChart;
	if (kind === "real-estate" || kind === "mortgage") return Home;
	if (kind === "vehicle") return Car;
	if (kind === "credit-card") return CreditCard;
	if (kind === "loan") return Building2;
	return WalletCards;
}

export function accountAccent(account: AccountRecord): string {
	if (account.group === "Cash") {
		return "bg-sky-600";
	}

	if (account.group === "Investments") {
		return "bg-emerald-600";
	}

	if (account.isLiability) {
		return "bg-blue-600";
	}

	return "bg-zinc-600";
}

export function getColorForGroup(group: string): string {
	const colorMap: Record<string, string> = {
		"Cash": "#10b981",
		"Investments": "#3b82f6",
		"Real Estate": "#8b5cf6",
		"Vehicles": "#f97316",
		"Valuables": "#6b7280",
		"Other Assets": "#6b7280",
		"Credit Cards": "#ef4444",
		"Loans": "#f59e0b",
		"Other Liabilities": "#ec4899",
	};
	return colorMap[group] || "#6b7280";
}

export function getKindFromSubtype(
	subtype: string | null | undefined,
): AccountKind {
	const normalized = subtype?.toLowerCase().trim() || "";

	if (normalized === "credit card") return "credit-card";
	if (normalized === "mortgage") return "mortgage";
	if (normalized === "loan") return "loan";
	if (normalized === "investment") return "investment";
	if (normalized === "real estate") return "real-estate";
	if (normalized === "vehicle") return "vehicle";
	if (normalized === "valuable") return "valuable";
	if (normalized === "other liability" || normalized === "other liabilities")
		return "other-liability";
	if (normalized === "other asset" || normalized === "other assets")
		return "other-asset";

	// Cash subtypes
	if (
		["checking", "savings", "cash", "money market", "prepaid", "cd"].includes(
			normalized,
		)
	) {
		return "cash";
	}

	return "other-asset";
}

// ✅ Fixed mapping: each kind now gets its own distinct group
export function getGroupFromKind(kind: AccountKind): AccountGroup {
	const groupMap: Record<AccountKind, AccountGroup> = {
		"cash": "Cash",
		"investment": "Investments",
		"credit-card": "Credit Cards",
		"mortgage": "Loans",
		"loan": "Loans",
		"other-liability": "Other Liabilities",
		"real-estate": "Real Estate",
		"vehicle": "Vehicles",
		"valuable": "Valuables",
		"other-asset": "Other Assets",
	};
	return groupMap[kind];
}
