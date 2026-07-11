"use client";

import { useBudgetStore } from "@/store/useBudgetStore";
import { formatThousandWithCommas, formatMoney } from "@/utils/formatters";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";

export function BudgetSummaryCards() {
    const transactions = useBudgetStore((state) => state.transactions);

    let totalIncome = 0;
    let totalExpenses = 0;

    // Explicit loop instead of inline array methods
    for (let i = 0; i < transactions.length; i++) {
        const transaction = transactions[i];

        if (transaction.amount > 0) {
            totalIncome = totalIncome + transaction.amount;
        }

        if (transaction.amount < 0) {
            totalExpenses = totalExpenses + Math.abs(transaction.amount);
        }
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <SummaryCard
                title="Monthly Cash Flow"
                value={formatMoney(totalIncome - totalExpenses)}
                icon={<DollarSign />}
            />
            <SummaryCard
                title="Total Income"
                value={formatMoney(totalIncome)}
                icon={<TrendingUp className="text-emerald-500" />}
            />
            <SummaryCard
                title="Total Expenses"
                value={formatMoney(totalExpenses)}
                icon={<TrendingDown className="text-red-500" />}
            />
        </div>
    );
}

function SummaryCard({
    title,
    value,
    icon,
}: {
    title: string;
    value: string;
    icon: React.ReactNode;
}) {
    return (
        <div className="bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-gray-800 p-6 rounded-3xl hover:border-orange-500/30 transition-all">
            <div className="flex justify-between items-start mb-4">
                <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">
                    {title}
                </p>
                {icon}
            </div>
            <p className="flex items-center text-3xl font-black text-gray-900 dark:text-white">
                <DollarSign />
                <span className="font-mono tabular-nums tracking-tight">
                    {formatThousandWithCommas(value)}
                </span>
            </p>
        </div>
    );
}