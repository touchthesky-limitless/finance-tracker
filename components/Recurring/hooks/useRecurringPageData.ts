/**
 * Hook that loads all necessary data for the recurring page.
 */
import { useEffect } from "react";

export function useRecurringPageData({
	fetchTransactions,
	fetchAccounts,
	fetchMerchants,
	fetchCustomCategories,
	fetchRecurringData,
}: {
	fetchTransactions: () => Promise<void>;
	fetchAccounts: () => Promise<void>;
	fetchMerchants: () => Promise<void>;
	fetchCustomCategories: () => Promise<void>;
	fetchRecurringData: () => Promise<void>;
}) {
	useEffect(() => {
		void Promise.all([
			fetchTransactions(),
			fetchAccounts(),
			fetchMerchants(),
			fetchCustomCategories(),
			fetchRecurringData(),
		]).catch(console.error);
	}, [
		fetchTransactions,
		fetchAccounts,
		fetchMerchants,
		fetchCustomCategories,
		fetchRecurringData,
	]);
}
