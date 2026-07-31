import { create } from "zustand";

interface TransactionDrawerState {
	selectedTransactionId: string | null;
	onBack?: () => void;
	openDrawer: (id: string, options?: { onBack?: () => void }) => void;
	closeDrawer: () => void;
}

export const useTransactionDrawer = create<TransactionDrawerState>((set) => ({
	selectedTransactionId: null,
	onBack: undefined,
	openDrawer: (id, options = {}) => {
		set({ selectedTransactionId: id, onBack: options.onBack });
	},
	closeDrawer: () => {
		set({ selectedTransactionId: null, onBack: undefined });
	},
}));
