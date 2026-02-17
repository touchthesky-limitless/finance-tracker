"use client";
import { useState, useMemo } from "react";
import { useBudgetStore } from "@/hooks/useBudgetStore";
import CsvUploader from "@/components/CsvUploader";
import { Search, Filter, X, Trash2 } from "lucide-react";
import InteractiveDashboard from "@/components/InteractiveDashboard";
import ClearDataModal from "@/components/ClearDataModal";


export default function BudgetPage() {
	const useStore = useBudgetStore();
	const { transactions } = useStore();

	// 1. STATE: SelectedBanks is now an Array
	const [selectedBanks, setSelectedBanks] = useState<string[]>([]);
	const [searchQuery, setSearchQuery] = useState("");
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

	const isLoading = transactions === undefined || transactions === null;
	const hasData = transactions.length > 0;

	// 2. GENERATE BANK NAMES (Exclude "All" from the list, handle it manually)
	const bankNames = useMemo(() => {
		if (isLoading) return [];
		return Array.from(new Set(transactions.map((t) => t.account)))
			.filter(Boolean)
			.sort();
	}, [transactions, isLoading]);

	// 3. TOGGLE LOGIC
	const toggleBank = (bank: string) => {
		setSelectedBanks((prev) => {
			// If already selected, remove it
			if (prev.includes(bank)) {
				return prev.filter((b) => b !== bank);
			}
			// Otherwise add it
			return [...prev, bank];
		});
	};

	// 4. FILTER LOGIC
	const filteredTransactions = useMemo(() => {
		if (isLoading) return [];

		let result = transactions;

		// A. Filter by Banks (Multi-Select)
		// If array is empty, it means "All"
		if (selectedBanks.length > 0) {
			result = result.filter((t) => selectedBanks.includes(t.account));
		}

		// B. Filter by Search Query
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase();
			result = result.filter(
				(t) =>
					t.description.toLowerCase().includes(q) ||
					t.category.toLowerCase().includes(q) ||
					t.amount.toString().includes(q),
			);
		}

		return result;
	}, [selectedBanks, searchQuery, transactions, isLoading]);

	// Combine banks to groups
	const bankGroups = Array.from(
		new Set(bankNames.map((name) => name.split(/[. _]/)[0])), // Splits by dot, space, or underscore
	).sort();

	const toggleBankGroup = (group: string) => {
		// Find all accounts that start with this group name (e.g., "Chase")
		const groupAccounts = bankNames.filter((name) => name.startsWith(group));

		// Check if the whole group is currently selected
		const isGroupSelected = groupAccounts.every((name) =>
			selectedBanks.includes(name),
		);

		if (isGroupSelected) {
			// Deselect all accounts in this group
			setSelectedBanks((prev) =>
				prev.filter((name) => !name.startsWith(group)),
			);
		} else {
			// Select all accounts in this group (avoid duplicates)
			setSelectedBanks((prev) =>
				Array.from(new Set([...prev, ...groupAccounts])),
			);
		}
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-950">
				<div className="text-gray-500 animate-pulse font-medium">
					Syncing...
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-white dark:bg-gray-950 p-6 md:p-12 transition-colors">
			<div className="max-w-6xl mx-auto space-y-8">
				{/* HEADER ROW */}
				<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
					<div>
						<h1 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-2">
							Financial Overview
						</h1>
						<p className="text-gray-500 dark:text-gray-400 text-lg">
							Track your spending across all accounts.
						</p>
					</div>
					<div className="flex gap-3">
						<button
							disabled={!hasData}
							onClick={() => setIsDeleteModalOpen(true)}
							className="flex items-center px-4 py-2 text-sm font-medium text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
						>
							<Trash2 size={18} />
							Clear Data
						</button>
						<CsvUploader />
					</div>
					<ClearDataModal
						isOpen={isDeleteModalOpen}
						onClose={() => setIsDeleteModalOpen(false)}
					/>
				</div>

				{/* CONTROLS ROW */}
				<div className="flex flex-col gap-4">
					{/* SEARCH BAR */}
					<div className="relative w-full">
						<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
							<Search className="h-5 w-5 text-gray-400" />
						</div>
						<input
							type="text"
							placeholder="Search transactions..."
							className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-gray-900 dark:text-white shadow-sm"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
						/>
					</div>

					{/*
					 MULTI-SELECT BANK FILTERS
					{transactions.length > 0 && (
						<div className="flex flex-wrap items-center gap-2">
							<span className="text-sm font-semibold text-gray-500 mr-2 flex items-center gap-1">
								<Filter size={14} /> Filter:
							</span>

							 "ALL" BUTTON
							<button
								onClick={() => setSelectedBanks([])} // Clear array = All
								className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
									selectedBanks.length === 0
										? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-transparent shadow-sm"
										: "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-300"
								}`}
							>
								All Accounts
							</button>

							 INDIVIDUAL BANK BUTTONS
							{bankNames.map((name) => {
								const isSelected = selectedBanks.includes(name);
								return (
									<button
										key={name}
										onClick={() => toggleBank(name)}
										className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
											isSelected
												? "bg-blue-600 border-blue-600 text-white shadow-sm"
												: "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-700"
										}`}
									>
										{name}
									</button>
								);
							})}

							 CLEAR FILTERS BUTTON (Only shows if filters are active)
							{(selectedBanks.length > 0 || searchQuery) && (
								<button
									onClick={() => {
										setSelectedBanks([]);
										setSearchQuery("");
									}}
									className="ml-auto text-sm text-red-500 hover:text-red-600 font-medium flex items-center gap-1 transition-colors px-2"
								>
									<X size={14} /> Clear filters
								</button>
							)}
						</div>
					)}
					*/}

					{/* BANK GROUPS */}
					{bankGroups.map((group) => {
						const groupAccounts = bankNames.filter((name) =>
							name.startsWith(group),
						);
						const isSelected = groupAccounts.every((name) =>
							selectedBanks.includes(name),
						);
						const someSelected =
							groupAccounts.some((name) => selectedBanks.includes(name)) &&
							!isSelected;

						return (
							<button
								key={group}
								onClick={() => toggleBankGroup(group)}
								className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all flex items-center gap-2 ${
									isSelected
										? "bg-blue-600 border-blue-600 text-white shadow-sm"
										: someSelected
											? "bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-900/20 dark:border-blue-800"
											: "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-300"
								}`}
							>
								{group}
								<span
									className={`text-[10px] px-1.5 py-0.5 rounded-full ${
										isSelected
											? "bg-blue-500 text-white"
											: "bg-gray-100 dark:bg-gray-800 text-gray-500"
									}`}
								>
									{groupAccounts.length}
								</span>
							</button>
						);
					})}
				</div>

				{/* DASHBOARD */}
				<InteractiveDashboard transactions={filteredTransactions} />

				<div className="text-center text-sm text-gray-400 mt-8">
					Showing {filteredTransactions.length} of {transactions.length}{" "}
					transactions
				</div>
			</div>
		</div>
	);
}
