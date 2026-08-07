/**
 * BudgetTypeOption - Single option in the budget type radio group.
 */

"use client";

import type { ReactNode } from "react";
import type { CategoryBudgetType } from "./types";

interface BudgetTypeOptionProps {
  value: CategoryBudgetType;
  selected: boolean;
  title: string;
  description: string;
  onSelect: (value: CategoryBudgetType) => void;
  children?: ReactNode;
}

export function BudgetTypeOption({
  value,
  selected,
  title,
  description,
  onSelect,
  children,
}: BudgetTypeOptionProps) {
  return (
    <div
      role="radio"
      aria-checked={selected}
      tabIndex={0}
      onClick={() => onSelect(value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(value);
        }
      }}
      className="flex w-full cursor-pointer items-start gap-4 border-b border-[#eceae7] px-5 py-5 text-left outline-none last:border-b-0 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#ff6633]/40 dark:border-white/10"
    >
      <span
        className={`mt-1 grid size-6 shrink-0 place-items-center rounded-full border ${selected ? "border-[#ff6633]" : "border-[#d8d6d2] dark:border-white/20"}`}
      >
        {selected && <span className="size-3 rounded-full bg-[#ff6633]" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-lg font-semibold">{title}</span>
        <span className="mt-1 block text-sm leading-6 text-[#55534f] dark:text-[#c2c0bb]">
          {description}
        </span>
        {children}
      </span>
    </div>
  );
}