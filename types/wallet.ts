import React from "react";
import { CreditCard } from "@/store/useBudgetStore";

export interface Category {
  id: string;
  name: string;
  icon: React.ElementType;
  accent: string;
}

export interface CardResult {
  card: CreditCard;
  rate: number;
}

export interface TopCardsResult {
  topCard: CardResult | null;
  backupCard: CardResult | null;
}

export interface OptimizedCategory extends TopCardsResult {
  category: Category;
}