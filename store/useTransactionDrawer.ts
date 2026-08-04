import { create } from "zustand";
import { Transaction } from "@/store/useBudgetStore";

interface TransactionDrawerState {
  selectedTransactionId: string | null;
  onBack?: () => void;
  onDeleted?: (count: number) => void;
  onDuplicate?: (transaction: Transaction) => void | Promise<void>;
  onCreateRule?: (transaction: Transaction) => void;
  openDrawer: (
    id: string,
    options?: {
      onBack?: () => void;
      onDeleted?: (count: number) => void;
      onDuplicate?: (transaction: Transaction) => void | Promise<void>;
      onCreateRule?: (transaction: Transaction) => void;
    }
  ) => void;
  closeDrawer: () => void;
}

export const useTransactionDrawer = create<TransactionDrawerState>((set) => ({
  selectedTransactionId: null,
  onBack: undefined,
  onDeleted: undefined,
  onDuplicate: undefined,
  onCreateRule: undefined,
  openDrawer: (id, options = {}) => {
    set({
      selectedTransactionId: id,
      onBack: options.onBack,
      onDeleted: options.onDeleted,
      onDuplicate: options.onDuplicate,
      onCreateRule: options.onCreateRule,
    });
  },
  closeDrawer: () => {
    set({
      selectedTransactionId: null,
      onBack: undefined,
      onDeleted: undefined,
      onDuplicate: undefined,
      onCreateRule: undefined,
    });
  },
}));