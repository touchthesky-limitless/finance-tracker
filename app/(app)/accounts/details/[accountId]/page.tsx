"use client";

import { useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { Transaction, useBudgetStore } from '@/store/useBudgetStore';
import { DataTable } from "@/components/Transactions/DataTable";

export default function AccountDetailsPage() {
	const params = useParams<{
		accountId: string;
	}>();

	const accountId = params.accountId;

	const transactions = useBudgetStore(
		(state) => state.transactions,
	);

	const fetchTransactions = useBudgetStore(
		(state) => state.fetchTransactions,
	);

	useEffect(() => {
		void fetchTransactions();
	}, [fetchTransactions]);

	const accountTransactions = useMemo(() => {
		return transactions.filter((transaction) => {
			return transaction.account_id === accountId;
		});
	}, [accountId, transactions]);

    const handleRowClick = (
	transaction: Transaction,
) => {
	// Open your transaction detail modal here.
	console.log(transaction);
};


	const accountName =
		accountTransactions[0]?.account ??
		"Account";

	return (
		<div>
			<h1 className="text-2xl font-semibold">
				{accountName}
			</h1>

<DataTable
	transactions={accountTransactions}
	selectedIds={[]}
	onSelectRow={() => {}}
	onRowClick={handleRowClick}
	columnVisibility={{
		date: false,
		merchant: true,
		category: true,
		account: true,
		amount: true,
	}}
	isEditMode={false}
	currentView="all"
	sorting={[]}
	isCategoryView={true}
/>
		</div>
	);
}