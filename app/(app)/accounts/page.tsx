"use client";

import { useMemo } from "react";
import { Plus, RefreshCw, SlidersHorizontal } from "lucide-react";
import AccountGroup from "@/components/Accounts/AccountGroup";
import SummarySidebar from "@/components/Accounts/SummarySidebar";
import AccountsChart from "@/components/Accounts/AccountsChart";
import { useBudgetStore } from "@/store/useBudgetStore";

interface Account {
	id: string;
	name: string;
	balance: number;
	lastUpdated: string;
}

interface GroupedAccountData {
	title: string;
	total: number;
	change: number;
	accounts: Account[];
}

export default function AccountsPage() {
	const transactions = useBudgetStore((state) => state.transactions);

	const groupedAccounts = useMemo(() => {
		// Map to store unique accounts: AccountName -> Summary
		const accountMap = new Map();

		transactions.forEach((t) => {
			// Initialize account if it doesn't exist
			if (!accountMap.has(t.account)) {
				accountMap.set(t.account, {
					id: t.account,
					name: t.account,
					balance: 0,
					lastUpdated: t.date, // Uses the most recent transaction date
				});
			}

			// Aggregate the balance
			const acc = accountMap.get(t.account);
			acc.balance += t.amount;

			// Keep the latest date
			if (new Date(t.date) > new Date(acc.lastUpdated)) {
				acc.lastUpdated = t.date;
			}
		});

		// Structure for AccountGroup (assuming one group "All Accounts")
		return [
			{
				title: "All Accounts",
				total: Array.from(accountMap.values()).reduce(
					(sum, acc) => sum + acc.balance,
					0,
				),
				change: 0, // Calculate this if you have historical data
				accounts: Array.from(accountMap.values()),
			},
		];
	}, [transactions]);

	return (
		// Added min-h-screen and explicit background colors (bg-gray-50 and dark:bg-[#121212])
		<div className="min-h-screen p-4 md:p-8 w-full bg-gray-50 dark:bg-[#121212] text-gray-900 dark:text-[#e0e0e0] transition-colors">
			<div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
				<h1 className="text-2xl font-bold">Accounts</h1>
				<div className="flex flex-wrap items-center gap-2">
					<button className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-[#2a2a2a] hover:bg-gray-100 dark:hover:bg-[#333] text-gray-700 dark:text-gray-200 rounded-lg text-sm transition-colors border border-gray-200 dark:border-[#3a3a3a]">
						<SlidersHorizontal size={16} />{" "}
						<span className="hidden sm:inline">Filters</span>
					</button>

					<button className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-[#2a2a2a] hover:bg-gray-100 dark:hover:bg-[#333] text-gray-700 dark:text-gray-200 rounded-lg text-sm transition-colors border border-gray-200 dark:border-[#3a3a3a]">
						<RefreshCw size={16} />{" "}
						<span className="hidden sm:inline">Refresh all</span>
					</button>

					<button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg text-sm transition-colors text-white font-medium">
						<Plus size={16} /> Add account
					</button>
				</div>
			</div>

			<AccountsChart />

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 mt-8">
				<div className="lg:col-span-2 space-y-6">
					{groupedAccounts.length > 0 ? (
						groupedAccounts.map((group: GroupedAccountData) => (
							<AccountGroup key={group.title} {...group} />
						))
					) : (
						<div className="text-gray-500 dark:text-gray-400">
							No accounts found. Please upload a CSV.
						</div>
					)}
				</div>

				{/* Note: Make sure SummarySidebar also has light mode classes! */}
				<div className="lg:block">
					<SummarySidebar />
				</div>
			</div>
		</div>
	);
}
