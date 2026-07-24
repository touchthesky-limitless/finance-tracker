"use client";

import { useMemo, useSyncExternalStore } from "react";
import { Plus, RefreshCw, SlidersHorizontal } from "lucide-react";

import AccountGroup from "@/components/Accounts/AccountGroup";
import AccountsChart from "@/components/Accounts/AccountsChart";
import SummarySidebar from "@/components/Accounts/SummarySidebar";
import { Shimmer } from "@/components/ui/Shimmer";
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

function subscribeToClient(): () => void {
	return () => {};
}

function getClientSnapshot(): boolean {
	return true;
}

function getServerSnapshot(): boolean {
	return false;
}

function AccountGroupsSkeleton() {
	return (
		<div
			role="status"
			aria-label="Loading accounts"
			aria-live="polite"
			className="space-y-6"
		>
			<span className="sr-only">Loading accounts…</span>

			{Array.from({ length: 2 }, (_, groupIndex) => (
				<div
					key={groupIndex}
					aria-hidden="true"
					className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#1c1c1c]"
				>
					<div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-white/10">
						<div className="space-y-2">
							<Shimmer className="h-5 w-32 rounded-md" />
							<Shimmer className="h-3 w-20 rounded-md" />
						</div>

						<Shimmer className="h-6 w-24 rounded-md" />
					</div>

					<div className="divide-y divide-gray-100 dark:divide-white/5">
						{Array.from({ length: groupIndex === 0 ? 3 : 2 }, (_, rowIndex) => (
							<div
								key={rowIndex}
								className="flex min-h-16 items-center gap-3 px-5 py-3"
							>
								<Shimmer className="size-9 shrink-0 rounded-xl" />

								<div className="min-w-0 flex-1 space-y-2">
									<Shimmer
										className={`h-4 rounded-md ${
											rowIndex % 2 === 0 ? "w-36" : "w-28"
										}`}
									/>
									<Shimmer className="h-3 w-24 rounded-md" />
								</div>

								<Shimmer className="h-5 w-24 rounded-md" />
							</div>
						))}
					</div>
				</div>
			))}
		</div>
	);
}

function SummarySidebarSkeleton() {
	return (
		<div
			role="status"
			aria-label="Loading account summary"
			aria-live="polite"
			className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#1c1c1c]"
		>
			<span className="sr-only">Loading account summary…</span>

			<div aria-hidden="true" className="space-y-5">
				<Shimmer className="h-6 w-32 rounded-md" />

				{Array.from({ length: 3 }, (_, index) => (
					<div
						key={index}
						className="rounded-xl border border-gray-100 p-4 dark:border-white/5"
					>
						<Shimmer className="h-3 w-24 rounded-md" />
						<Shimmer className="mt-3 h-7 w-32 rounded-lg" />
					</div>
				))}
			</div>
		</div>
	);
}

export default function AccountsPage() {
	const isClient = useSyncExternalStore(
		subscribeToClient,
		getClientSnapshot,
		getServerSnapshot,
	);

	const transactions = useBudgetStore((state) => state.transactions);

	const groupedAccounts = useMemo(() => {
		const accountMap = new Map<string, Account>();

		transactions.forEach((transaction) => {
			if (!accountMap.has(transaction.account)) {
				accountMap.set(transaction.account, {
					id: transaction.account,
					name: transaction.account,
					balance: 0,
					lastUpdated: transaction.date,
				});
			}

			const account = accountMap.get(transaction.account);

			if (!account) {
				return;
			}

			account.balance += transaction.amount;

			if (new Date(transaction.date) > new Date(account.lastUpdated)) {
				account.lastUpdated = transaction.date;
			}
		});

		const accounts = Array.from(accountMap.values());

		return [
			{
				title: "All Accounts",
				total: accounts.reduce((sum, account) => sum + account.balance, 0),
				change: 0,
				accounts,
			},
		];
	}, [transactions]);

	return (
		<div className="min-h-screen w-full bg-gray-50 p-4 text-gray-900 transition-colors md:p-8 dark:bg-[#121212] dark:text-[#e0e0e0]">
			<div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
				<h1 className="text-2xl font-bold">Accounts</h1>

				<div className="flex flex-wrap items-center gap-2">
					<button
						type="button"
						className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:border-[#3a3a3a] dark:bg-[#2a2a2a] dark:text-gray-200 dark:hover:bg-[#333]"
					>
						<SlidersHorizontal size={16} />
						<span className="hidden sm:inline">Filters</span>
					</button>

					<button
						type="button"
						className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:border-[#3a3a3a] dark:bg-[#2a2a2a] dark:text-gray-200 dark:hover:bg-[#333]"
					>
						<RefreshCw size={16} />
						<span className="hidden sm:inline">Refresh all</span>
					</button>

					<button
						type="button"
						className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-700 sm:flex-none"
					>
						<Plus size={16} />
						Add account
					</button>
				</div>
			</div>

			<AccountsChart isLoading={!isClient} />

			<div className="mt-8 grid grid-cols-1 gap-6 md:gap-8 lg:grid-cols-3">
				<div className="space-y-6 lg:col-span-2">
					{!isClient ? (
						<AccountGroupsSkeleton />
					) : groupedAccounts[0]?.accounts.length ? (
						groupedAccounts.map((group: GroupedAccountData) => (
							<AccountGroup key={group.title} {...group} />
						))
					) : (
						<div className="text-gray-500 dark:text-gray-400">
							No accounts found. Please upload a CSV.
						</div>
					)}
				</div>

				<div className="lg:block">
					{isClient ? <SummarySidebar /> : <SummarySidebarSkeleton />}
				</div>
			</div>
		</div>
	);
}
