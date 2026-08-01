import { create } from "zustand";
import { createClient } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────
export interface BudgetPlan {
  id: string;
  user_id: string;
  month: string; // ISO date (first day of month)
  category_id: string; // category name or custom category ID
  planned_amount: number;
  created_at: string;
  updated_at: string;
}

interface PlanStoreState {
  plans: Record<string, number>; // key: `${month}_${categoryId}` -> planned amount
  isLoading: boolean;
  fetchBudgetPlans: (month: Date) => Promise<void>;
  saveBudgetPlan: (month: Date, categoryId: string, planned: number) => Promise<void>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────
function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

function getPlanKey(month: Date, categoryId: string): string {
  return `${getMonthKey(month)}_${categoryId}`;
}

// ─── Store ────────────────────────────────────────────────────────────────
export const usePlanStore = create<PlanStoreState>((set, get) => ({
  plans: {},
  isLoading: false,

  fetchBudgetPlans: async (month: Date) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    set({ isLoading: true });
    const monthStart = getMonthKey(month);
    const { data, error } = await supabase
      .from("budget_plans")
      .select("category_id, planned_amount")
      .eq("user_id", user.id)
      .eq("month", monthStart);

    if (error) {
      console.error("Failed to fetch budget plans:", error);
      set({ isLoading: false });
      return;
    }

    const plans: Record<string, number> = {};
    for (const row of data) {
      const key = getPlanKey(month, row.category_id);
      plans[key] = row.planned_amount;
    }
    set({ plans, isLoading: false });
  },

  saveBudgetPlan: async (month: Date, categoryId: string, planned: number) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const monthStart = getMonthKey(month);
    const key = getPlanKey(month, categoryId);

    // Optimistic update
    set((state) => ({
      plans: { ...state.plans, [key]: planned },
    }));

    const { error } = await supabase
      .from("budget_plans")
      .upsert(
        {
          user_id: user.id,
          month: monthStart,
          category_id: categoryId,
          planned_amount: planned,
        },
        { onConflict: "user_id, month, category_id" }
      );

    if (error) {
      console.error("Failed to save budget plan:", error);
      // Rollback: revert optimistic update by re-fetching
      await get().fetchBudgetPlans(month);
    }
  },
}));