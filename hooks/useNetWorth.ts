import { useMemo } from "react";
import { useBudgetStore } from "@/store/useBudgetStore";

export function useNetWorth() {
	const accounts = useBudgetStore((state) => state.accounts);

	return useMemo(() => {
		let assets = 0;
		let liabilities = 0;

		for (const account of accounts) {
			const balance = account.current_balance || 0;
			// Adjust this logic to match exact account type/kind flags
			const isLiability =
				account.account_type === "Liability" ||
				["Credit Card", "Mortgage", "Loan", "Other Liability"].includes(
					account.account_subtype || "",
				);

			if (isLiability) {
				liabilities += Math.abs(balance);
			} else {
				assets += balance;
			}
		}

		return { assets, liabilities, net: assets - liabilities };
	}, [accounts]);
}
