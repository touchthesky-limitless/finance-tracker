import { isLiabilityKind } from "@/components/Accounts/utils/account";
import type { AccountKind, ManualAccount } from "@/components/Accounts/types";
import type { Account } from "@/store/useBudgetStore";

export function manualAccountToAccountRecord(
	manualAccount: Omit<ManualAccount, "id" | "createdAt">,
): Omit<Account, "id" | "user_id" | "created_at"> {
	const { name, kind, type, balance } = manualAccount;

	const isLiability = isLiabilityKind(kind);

	// Exhaustive mapping for all AccountKind values
	const subtypeMap: Record<AccountKind, string> = {
		"cash": type || "Cash", // user-selected subtype for cash
		"investment": "Investment",
		"credit-card": "Credit Card",
		"mortgage": "Mortgage",
		"loan": "Loan",
		"other-liability": "Other Liability",
		"other-asset": "Other Asset",
		"real-estate": "Real Estate",
		"vehicle": "Vehicle",
		"valuable": "Valuable",
	};

	return {
		name: name.trim(),
		account_type: isLiability ? "Liability" : "Asset",
		account_subtype: subtypeMap[kind] || "Other",
		current_balance: balance,
		apr: null,
		minimum_monthly_payment: null,
		planned_monthly_payment: null,
		credit_limit: null,
		invert_balance: false,
		is_hidden: false,
		exclude_from_net_worth: false,
		hide_transactions: false,
		exclude_from_paydown: false,
		exclude_from_budget: false,
		institution: null,
		logo_url: null,
	};
}
