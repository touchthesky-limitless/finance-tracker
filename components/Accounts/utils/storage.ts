import type { ManualAccount } from "@/components/Accounts/types";

const MANUAL_ACCOUNTS_STORAGE_KEY = "manual_accounts";

export function loadManualAccounts(): ManualAccount[] {
	if (typeof window === "undefined") {
		return [];
	}

	try {
		const value = window.localStorage.getItem(MANUAL_ACCOUNTS_STORAGE_KEY);

		if (!value) {
			return [];
		}

		const parsed = JSON.parse(value) as ManualAccount[];
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

export function saveManualAccounts(accounts: ManualAccount[]): void {
	window.localStorage.setItem(
		MANUAL_ACCOUNTS_STORAGE_KEY,
		JSON.stringify(accounts),
	);
}
