import { create } from "zustand";

interface TransactionToastState {
	deletedTransactionCount: number;
	reportDeletedTransactions: (
		count: number,
	) => void;
	dismissDeletedTransactionToast: () => void;
}

export const useTransactionToastStore =
	create<TransactionToastState>((set) => ({
		deletedTransactionCount: 0,

		reportDeletedTransactions: (
			count,
		) => {
			if (count <= 0) {
				return;
			}

			set((state) => ({
				deletedTransactionCount:
					state.deletedTransactionCount +
					count,
			}));
		},

		dismissDeletedTransactionToast: () => {
			set({
				deletedTransactionCount: 0,
			});
		},
	}));