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

// ✅ NEW HELPERS TO FIX THE GROUP MAPPING
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

export type AccountGroup =
	| "Cash"
	| "Investments"
	| "Other Assets"
	| "Credit Cards"
	| "Loans";

export function getGroupFromKind(kind: AccountKind): AccountGroup {
	const groupMap: Record<AccountKind, AccountGroup> = {
		"cash": "Cash",
		"investment": "Investments",
		"credit-card": "Credit Cards",
		"mortgage": "Loans",
		"loan": "Loans",
		"other-liability": "Loans",
		"real-estate": "Other Assets",
		"vehicle": "Other Assets",
		"valuable": "Other Assets",
		"other-asset": "Other Assets",
	};
	return groupMap[kind];
}
