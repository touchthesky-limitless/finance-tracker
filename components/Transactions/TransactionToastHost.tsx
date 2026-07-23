"use client";

import { TransactionDeletedToast } from "@/components/Transactions/TransactionDeletedToast";
import { useTransactionToastStore } from "@/store/useTransactionToastStore";

export function TransactionToastHost() {
	const deletedTransactionCount =
		useTransactionToastStore((state) => {
			return state.deletedTransactionCount;
		});

	const dismissDeletedTransactionToast =
		useTransactionToastStore((state) => {
			return (
				state.dismissDeletedTransactionToast
			);
		});

	return (
		<TransactionDeletedToast
			show={
				deletedTransactionCount > 0
			}
			count={deletedTransactionCount}
			onDismiss={
				dismissDeletedTransactionToast
			}
		/>
	);
}