import { create } from "zustand";

interface TransactionDrawerState {
  selectedTransactionId: string | null;
  openDrawer: (transactionId: string) => void;
  closeDrawer: () => void;
}

export const useTransactionDrawer = create<TransactionDrawerState>((set) => ({
  selectedTransactionId: null,
  openDrawer: (transactionId) => set({ selectedTransactionId: transactionId }),
  closeDrawer: () => set({ selectedTransactionId: null }),
}));