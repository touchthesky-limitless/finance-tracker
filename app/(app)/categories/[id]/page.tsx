"use client";

import React, { useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, Pencil } from "lucide-react";
import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	ResponsiveContainer,
	Cell,
	Tooltip,
} from "recharts";
import { SortingState } from "@tanstack/react-table";
import { useBudgetStore } from "@/store/useBudgetStore";
import { formatCurrency } from "@/utils/formatters";

// 1. Import your components and the unified categories hook
import { CategoryTrigger } from "@/components/CategoryTrigger";
import { DataTable } from "@/components/Transactions/DataTable";
import { useUnifiedCategories } from "@/hooks/useUnifiedCategories";
import dynamic from "next/dynamic";
import { Transaction } from "@/store/useBudgetStore";

interface ChartData {
	period: string;
	amount: number;
	isActive: boolean;
}

const EditTransactionModal = dynamic(
    () => {
        return import("@/components/Budget/EditTransactionModal");
    },
    { ssr: false },
);

export default function CategoryBreakdownPage() {
	const params = useParams();
	const router = useRouter();
	const searchParams = useSearchParams();

	// Extract and decode the category name from the URL
	const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
	// const categoryName = rawId ? decodeURIComponent(rawId) : "Category";
    const categoryId = rawId ? decodeURIComponent(rawId) : "";

	// Extract URL state
	const activeTimeframe = searchParams.get("timeframe") || "year";
	const activeDateString = searchParams.get("date") || `${new Date().getFullYear()}-01-01`;
	const activeYear = parseInt(activeDateString.substring(0, 4), 10);

	// --- Store & State ---
	const transactions = useBudgetStore((state) => {
		return state.transactions;
	});
	const updateTransaction = useBudgetStore((state) => {
		return state.updateTransaction;
	});

	const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
	const [selectedIds, setSelectedIds] = useState<string[]>([]);
	const [sorting, setSorting] = useState<SortingState>([{ id: "date", desc: true }]);

	// 2. Fetch all categories from your master hook
	const { allUnifiedCategories } = useUnifiedCategories("Expense", "All");

	// 3. Dynamically resolve the icon and color for the current page header
	const categoryDetails = useMemo(() => {
        const matchedCategory = allUnifiedCategories.find((c) => {
            return c.id === categoryId;
        });

        return {
            name: matchedCategory?.name || "Unknown Category",
            icon: matchedCategory?.icon || "Folder",
            colorClass: matchedCategory?.theme?.text || "text-gray-500 dark:text-gray-400",
        };
    }, [allUnifiedCategories, categoryId]);

	// Filter transactions down to this specific category
	const categoryTransactions = useMemo(() => {
        return transactions.filter((t) => {
            // Assuming your transactions still store the name. 
            // If transactions store IDs, change this to t.categoryId === categoryId
            return t.category === categoryDetails.name; 
        });
    }, [transactions, categoryDetails.name]);

	// Derive Chart Data
	const chartData = useMemo<ChartData[]>(() => {
		return [
			{ period: String(activeYear - 2), amount: 480.0, isActive: false },
			{ period: String(activeYear - 1), amount: 435.5, isActive: false },
			{ period: String(activeYear), amount: 65.96, isActive: true },
		];
	}, [activeYear]);

	// Calculate Summary Stats
	const summaryStats = useMemo(() => {
		let totalAmount = 0;
		let largest = 0;
		let count = 0;

		categoryTransactions.forEach((t) => {
			if (new Date(t.date).getFullYear() === activeYear) {
				const absAmount = Math.abs(t.amount);
				totalAmount += absAmount;
				if (absAmount > largest) {
					largest = absAmount;
				}
				count++;
			}
		});

		return {
			count,
			totalAmount,
			largest,
			average: count > 0 ? totalAmount / count : 0,
		};
	}, [categoryTransactions, activeYear]);

return (
        <div className="flex flex-col h-screen font-sans bg-gray-50 dark:bg-[#121212] text-gray-900 dark:text-gray-200 transition-colors duration-200">
            {/* --- HEADER --- */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-200 dark:border-white/5 bg-white dark:bg-[#191919] z-30 transition-colors duration-200 shrink-0">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            router.back();
                        }}
                        className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors flex items-center gap-1 text-[15px] font-medium"
                    >
                        Transactions <ChevronRight size={16} />
                    </button>
                    
                    <div className="flex items-center tracking-tight ml-2">
                        <CategoryTrigger
                            isOpen={false}
                            currentCategory={categoryDetails.name}
                            displayIcon={categoryDetails.icon}
                            displayColorClass={categoryDetails.colorClass}
                            className="pointer-events-none !p-0 scale-110 origin-left"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex bg-gray-200/50 dark:bg-[#191919] p-1 rounded-xl border border-gray-200 dark:border-white/5 transition-colors">
                        {["Monthly", "Quarterly", "Yearly"].map((tf) => {
                            const isActive = tf.toLowerCase() === activeTimeframe;
                            return (
                                <button
                                    key={tf}
                                    onClick={() => {
                                        const currentUrl = new URL(window.location.href);
                                        currentUrl.searchParams.set("timeframe", tf.toLowerCase());
                                        router.push(currentUrl.pathname + currentUrl.search);
                                    }}
                                    className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${
                                        isActive
                                            ? "bg-white dark:bg-[#2A2A2A] text-gray-900 dark:text-white shadow-sm border border-gray-200 dark:border-transparent"
                                            : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-white/5"
                                    }`}
                                >
                                    {tf}
                                </button>
                            );
                        })}
                    </div>

                    <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#191919] border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-white rounded-xl text-sm font-medium transition-colors shadow-sm">
                        <Pencil size={14} />
                        Edit category
                    </button>

                    <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#191919] border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-white rounded-xl text-sm font-medium transition-colors shadow-sm">
                        Filters <ChevronRight size={14} className="rotate-90 text-gray-400" />
                    </button>
                </div>
            </div>

            {/* --- MAIN CONTENT AREA --- 
                Removed max-w-7xl mx-auto, changed to w-full p-6 with overflow-y-auto to match TransactionsPage 
            */}
            <div className="flex-1 w-full p-6 flex flex-col gap-6 overflow-y-auto min-h-0">
                {/* --- CHART SECTION --- */}
                <div className="bg-white dark:bg-[#1C1C1C] rounded-2xl border border-gray-200 dark:border-white/5 p-8 h-[360px] flex flex-col w-full shadow-sm dark:shadow-lg transition-colors shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={chartData}
                            margin={{ top: 20, right: 0, left: -20, bottom: 0 }}
                            barSize={120}
                        >
                            <CartesianGrid
                                strokeDasharray="3 3"
                                vertical={false}
                                stroke="#555555"
                                opacity={0.3}
                            />
                            <XAxis
                                dataKey="period"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: "#888888", fontSize: 13, fontWeight: 500 }}
                                dy={16}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: "#888888", fontSize: 13 }}
                                tickFormatter={(val) => {
                                    return `$${val}`;
                                }}
                            />
                            <Tooltip
                                cursor={{ fill: "transparent" }}
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const value = Number(payload[0].value);
                                        return (
                                            <div className="bg-white dark:bg-[#232323] border border-gray-200 dark:border-white/10 rounded-lg p-3 shadow-lg flex flex-col gap-1">
                                                <span className="text-gray-900 dark:text-white font-bold text-sm">
                                                    {formatCurrency(value)}
                                                </span>
                                                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">
                                                    Total
                                                </span>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                                {chartData.map((entry, index) => {
                                    return (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={entry.isActive ? "#EF4444" : "#9CA3AF"}
                                        />
                                    );
                                })}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight transition-colors shrink-0">
                    {activeYear}
                </h2>

                {/* --- BOTTOM GRID --- */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start shrink-0">
                    
                    {/* LEFT: Transactions List */}
                    <div className="lg:col-span-2 bg-white dark:bg-[#1C1C1C] rounded-2xl border border-gray-200 dark:border-white/5 shadow-sm dark:shadow-lg overflow-hidden transition-colors flex flex-col h-[600px]">
                        <div className="px-6 py-5 border-b border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-[#232323] transition-colors shrink-0">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Transactions</h3>
                        </div>

                        <div className="flex-1 min-h-0 relative">
                            {categoryTransactions.length > 0 ? (
                                <DataTable
                                    transactions={categoryTransactions}
                                    selectedIds={selectedIds}
                                    onSelectRow={(id, e) => {
                                        e.stopPropagation();
                                        setSelectedIds((prev) => {
                                            return prev.includes(id) 
                                                ? prev.filter((i) => { return i !== id; }) 
                                                : [...prev, id];
                                        });
                                    }}
                                    onRowClick={setSelectedTransaction}
                                    columnVisibility={{ select: false, amount: true }}
                                    isEditMode={false}
                                    currentView="all"
                                    sorting={sorting}
                                    isCategoryView={false}
                                    onCategoryChange={(id, newCategory) => {
                                        const target = categoryTransactions.find((t) => {
                                            return t.id === id;
                                        });
                                        if (target) {
                                            updateTransaction(id, { ...target, category: newCategory });
                                        }
                                    }}
                                />
                            ) : (
                                <div className="p-8 text-center text-gray-500">
                                    No transactions found for {activeYear}.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT: Summary Stats Card */}
                    <div className="bg-white dark:bg-[#1C1C1C] rounded-2xl border border-gray-200 dark:border-white/5 shadow-sm dark:shadow-lg overflow-hidden flex flex-col transition-colors">
                        <div className="px-6 py-5 border-b border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-[#232323] transition-colors">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Summary</h3>
                        </div>

                        <div className="flex flex-col p-6 gap-6">
                            <div className="flex items-center justify-between">
                                <span className="text-[15px] text-gray-500 dark:text-gray-400 font-medium">
                                    Total Transactions
                                </span>
                                <span className="text-[15px] text-gray-900 dark:text-white font-medium">
                                    {summaryStats.count}
                                </span>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-[15px] text-gray-500 dark:text-gray-400 font-medium">
                                    Average Transaction
                                </span>
                                <span className="text-[15px] text-gray-900 dark:text-white font-medium">
                                    {formatCurrency(summaryStats.average)}
                                </span>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-[15px] text-gray-500 dark:text-gray-400 font-medium">
                                    Largest Transaction
                                </span>
                                <span className="text-[15px] text-gray-900 dark:text-white font-medium">
                                    {formatCurrency(summaryStats.largest)}
                                </span>
                            </div>

                            <div className="w-full h-px bg-gray-200 dark:bg-white/5 my-2 transition-colors" />

                            <div className="flex items-center justify-between">
                                <span className="text-[15px] text-gray-500 dark:text-gray-400 font-medium">
                                    Total Amount
                                </span>
                                <span className="text-[15px] text-gray-900 dark:text-white font-medium">
                                    {formatCurrency(summaryStats.totalAmount)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {selectedTransaction && (
                <EditTransactionModal
                    key={selectedTransaction.id}
                    transaction={selectedTransaction}
                    isOpen={!!selectedTransaction}
                    onClose={() => {
                        setSelectedTransaction(null);
                    }}
                    onUpdate={updateTransaction}
                    onRuleSaved={(count, snapshot) => {
                        // Optional: If you want to add the UndoToast here later, you can wire it up.
                        // For now, just close the modal.
                        setSelectedTransaction(null);
                    }}
                />
            )}
        </div>
    );
}