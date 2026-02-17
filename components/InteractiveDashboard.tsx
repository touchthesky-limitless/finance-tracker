"use client";
import { useState, useMemo, useEffect } from "react";
import { PieChart, Pie, ResponsiveContainer, Tooltip } from "recharts";
import { useBudgetStore } from "@/hooks/useBudgetStore";
import { Transaction } from "@/store/createBudgetStore";
import { DashboardSkeleton } from "./DashboardSkeleton";
import {
	ChevronRight,
	X,
	MoreHorizontal,
	CheckCircle2,
	Plus,
	Search,
	LucideIcon,
	HelpCircle,
} from "lucide-react";

// --- IMPORTS FROM NEW FILES ---
import { DEFAULT_TAGS, CATEGORY_HIERARCHY } from "@/data/categories";
import {
	stringToColor,
	stringToPastel,
	getIconForCategory,
	getCategoryDetails,
} from "@/lib/utils";

// --- SUB-COMPONENT: CATEGORY PICKER ---
function CategoryPicker({
	currentCategory,
	onSelect,
	onClose,
}: {
	currentCategory: string;
	onSelect: (category: string, mode: "single" | "all") => void;
	onClose: () => void;
}) {
	const [search, setSearch] = useState("");
	const [pendingCategory, setPendingCategory] = useState(currentCategory);

	// Determine initial group based on current category
	const initialGroup = useMemo(() => {
		const clean = pendingCategory.trim().toLowerCase();
		for (const [group, items] of Object.entries(CATEGORY_HIERARCHY)) {
			if (group.toLowerCase() === clean) return group;
			if (items.some((item) => item.toLowerCase() === clean)) return group;
		}
		return Object.keys(CATEGORY_HIERARCHY)[0];
	}, [pendingCategory]);

	const [internalSelectedGroup, setInternalSelectedGroup] =
		useState(initialGroup);

	// Advanced Search Logic (Filters Groups AND Subcategories)
	const filteredHierarchy = useMemo(() => {
		if (!search) return CATEGORY_HIERARCHY;
		const result: Record<string, string[]> = {};
		const lowerSearch = search.toLowerCase();

		Object.entries(CATEGORY_HIERARCHY).forEach(([group, items]) => {
			const groupMatches = group.toLowerCase().includes(lowerSearch);
			const matchingItems = items.filter((i) =>
				i.toLowerCase().includes(lowerSearch),
			);

			// If group matches, show all items. If sub-items match, show group + sub-items.
			if (groupMatches) {
				result[group] = items;
			} else if (matchingItems.length > 0) {
				result[group] = matchingItems;
			}
		});
		return result;
	}, [search]);

	// Auto-select the first group if search changes the list
	// useEffect(() => {
	// 	if (search && !filteredHierarchy[selectedGroup]) {
	// 		const firstKey = Object.keys(filteredHierarchy)[0];
	// 		if (firstKey) setSelectedGroup(firstKey);
	// 	}
	// }, [search, filteredHierarchy, selectedGroup]);

	// CREATE 'selectedGroup' as Derived State
	// This logic runs on every render:
	// "Is the group I selected currently visible in the list?
	//  Yes -> Keep it.
	//  No -> Switch to the first available group."
	const selectedGroup = filteredHierarchy[internalSelectedGroup]
		? internalSelectedGroup
		: Object.keys(filteredHierarchy)[0] || "";

	return (
		<div className="absolute inset-0 bg-white dark:bg-gray-900 z-50 flex flex-col animate-in slide-in-from-bottom-4 duration-300 rounded-3xl overflow-hidden">
			{/* --- HEADER: Search --- */}
			<div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3 shrink-0">
				<div className="relative flex-1">
					<Search
						className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
						size={18}
					/>
					<input
						type="text"
						placeholder="Search categories..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="w-full bg-gray-50 dark:bg-gray-800 border-none pl-10 pr-4 py-3 rounded-2xl text-base outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
						autoFocus
					/>
				</div>
				<button
					onClick={onClose}
					className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
				>
					<X size={24} className="text-gray-500" />
				</button>
			</div>

			{/* --- BODY: Two Pane Layout --- */}
			<div className="flex-1 flex overflow-hidden">
				{/* LEFT: Groups */}
				<div className="w-[40%] border-r border-gray-100 dark:border-gray-800 overflow-y-auto bg-gray-50/50 dark:bg-gray-900/50 pb-20">
					{Object.keys(filteredHierarchy).length === 0 && (
						<div className="p-4 text-sm text-gray-400 text-center">
							No groups found
						</div>
					)}
					{Object.keys(filteredHierarchy).map((group) => {
						const Icon = getIconForCategory(group);
						const isActive = selectedGroup === group;
						return (
							<button
								key={group}
								onClick={() => setInternalSelectedGroup(group)}
								className={`w-full text-left px-4 py-3.5 flex items-center gap-3 transition-all ${
									isActive
										? "bg-white dark:bg-gray-800 shadow-sm border-l-4 border-blue-600 font-semibold text-gray-900 dark:text-white"
										: "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 border-l-4 border-transparent"
								}`}
							>
								<Icon
									size={18}
									className={isActive ? "text-blue-600" : "text-gray-400"}
								/>
								<span className="truncate text-sm">{group}</span>
							</button>
						);
					})}
				</div>

				{/* RIGHT: Subcategories */}
				<div className="flex-1 overflow-y-auto bg-white dark:bg-gray-900 pb-20 p-2">
					<div className="px-2 py-3 text-xs font-bold text-gray-400 tracking-wider mb-1">
						{selectedGroup}
					</div>
					{filteredHierarchy[selectedGroup]?.map((cat) => {
						const isSelected = pendingCategory === cat;
						return (
							<button
								key={cat}
								onClick={() => setPendingCategory(cat)}
								className={`w-full text-left px-4 py-3 mb-1 rounded-xl flex items-center justify-between group transition-all ${
									isSelected
										? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
										: "hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
								}`}
							>
								<span className="font-medium text-sm">{cat}</span>

								{/* Radio Button Visual */}
								<div
									className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
										isSelected
											? "border-blue-600 bg-blue-600"
											: "border-gray-300 dark:border-gray-600 group-hover:border-blue-400"
									}`}
								>
									{isSelected && (
										<CheckCircle2 size={14} className="text-white" />
									)}
								</div>
							</button>
						);
					})}
				</div>
			</div>

			{/* --- FOOTER: Actions --- */}
			<div className="absolute bottom-0 inset-x-0 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 p-4 shadow-xl z-20 flex items-center justify-between">
				{/* Reset */}
				<button
					onClick={() => {
						onSelect("Uncategorized", "single");
					}}
					className="text-sm font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white px-2 py-2 rounded-lg transition-colors"
				>
					Reset
				</button>

				<div className="flex items-center gap-3">
					{/* Apply to All */}
					<button
						onClick={() => onSelect(pendingCategory, "all")}
						className="text-sm font-semibold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 px-4 py-2.5 rounded-xl transition-all"
					>
						Apply to all from this merchant
					</button>

					{/* Apply Single */}
					<button
						onClick={() => onSelect(pendingCategory, "single")}
						className="text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 px-6 py-2.5 rounded-xl shadow-md shadow-blue-200 dark:shadow-none transition-all"
					>
						Apply to this activity only
					</button>
				</div>
			</div>
		</div>
	);
}

// --- SUB-COMPONENT: TAG PICKER ---
function TagPicker({
	selectedTags,
	onToggleTag,
	onClose,
}: {
	selectedTags: string[];
	onToggleTag: (tag: string) => void;
	onClose: () => void;
}) {
	const [search, setSearch] = useState("");
	const useStore = useBudgetStore();
	const transactions = useStore((state) => state.transactions);
	const updateTransaction = useStore((state) => state.updateTransaction);

	const allAvailableTags = useMemo(() => {
		const historyTags = new Set<string>();
		transactions.forEach((t) => t.tags?.forEach((tag) => historyTags.add(tag)));
		return Array.from(new Set([...DEFAULT_TAGS, ...Array.from(historyTags)]));
	}, [transactions]);

	const filteredTags = allAvailableTags.filter((t) =>
		t.toLowerCase().includes(search.toLowerCase()),
	);

	const handleDeleteTag = (tagToDelete: string) => {
		if (!window.confirm(`Delete tag "${tagToDelete}" from ALL transactions?`))
			return;
		const affected = transactions.filter((t) => t.tags?.includes(tagToDelete));
		affected.forEach((t) => {
			const newTags = t.tags?.filter((tag) => tag !== tagToDelete);
			updateTransaction(t.id, { tags: newTags });
		});
		if (search === tagToDelete) setSearch("");
	};

	return (
		<div className="absolute inset-0 bg-white dark:bg-gray-900 z-20 flex flex-col animate-in slide-in-from-right duration-200">
			<div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
				<h3 className="text-lg font-bold flex-1">Manage Tags</h3>
				<button onClick={onClose}>
					<X size={20} className="text-gray-500" />
				</button>
			</div>
			<div className="p-4 flex-1 overflow-y-auto">
				<div className="relative mb-6">
					<input
						type="text"
						placeholder="Search or create new tag..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="w-full bg-gray-100 dark:bg-gray-800 pl-4 pr-12 py-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
						autoFocus
					/>
					{search && !filteredTags.includes(search) && (
						<button
							onClick={() => {
								onToggleTag(search);
								setSearch("");
							}}
							className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-600 text-white p-1.5 rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors"
						>
							CREATE
						</button>
					)}
				</div>
				<div className="flex flex-wrap gap-2">
					{filteredTags.map((tag) => {
						const isSelected = selectedTags.includes(tag);
						const isDefault = DEFAULT_TAGS.includes(tag);
						const bg = stringToPastel(tag);
						return (
							<div
								key={tag}
								className={`group relative flex items-center rounded-full transition-all transform active:scale-95 border ${isSelected ? "ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-gray-900 z-10" : "border-transparent hover:brightness-95"}`}
								style={{ backgroundColor: bg }}
							>
								<button
									onClick={() => onToggleTag(tag)}
									className="px-3 py-1.5 rounded-full text-sm font-medium text-gray-800 flex items-center gap-1.5"
								>
									{tag}
									{isSelected && (
										<CheckCircle2 size={14} className="text-blue-600" />
									)}
								</button>
								{!isDefault && (
									<button
										onClick={(e) => {
											e.stopPropagation();
											handleDeleteTag(tag);
										}}
										className="pr-2 pl-0.5 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
									>
										<X size={14} />
									</button>
								)}
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}

// --- SUB-COMPONENT: MODAL ---
function TransactionModal({
	transactionId,
	onClose,
}: {
	transactionId: string | null;
	onClose: () => void;
}) {
	const useStore = useBudgetStore();
	const updateTransaction = useStore((state) => state.updateTransaction);
	const transactions = useStore((state) => state.transactions);
	const transaction = useMemo(
		() => transactions.find((t) => t.id === transactionId),
		[transactions, transactionId],
	);
	const [view, setView] = useState<"details" | "picker" | "tags">("details");

	// Close on Escape key
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [onClose]);

	if (!transactionId || !transaction) return null;

	const {
		group,
		sub,
		icon: GroupIcon,
	} = getCategoryDetails(transaction.category);
	const style = { color: stringToColor(group) };
	const currentTags = transaction.tags || [];

	// Handle the new onSelect signature
	const handleUpdateCategory = (
		newCategory: string,
		mode: "single" | "all",
	) => {
		if (mode === "single") {
			// Update just this one
			updateTransaction(transaction.id, { category: newCategory });
		} else {
			// Update ALL transactions with the same description/merchant
			// (Assuming you have access to the full list, otherwise you might need a store action)
			const transactionsToUpdate = transactions.filter(
				(t) => t.description === transaction.description,
			);

			// Batch update (You might need to add a batchUpdate action to your store for performance)
			transactionsToUpdate.forEach((t) => {
				updateTransaction(t.id, { category: newCategory });
			});
		}
		setView("details");
	};

	const handleToggleTag = (tag: string) => {
		const oldTags = transaction.tags || [];
		const newTags = oldTags.includes(tag)
			? oldTags.filter((t) => t !== tag)
			: [...oldTags, tag];
		updateTransaction(transaction.id, { tags: newTags });
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
			<div className="absolute inset-0" onClick={onClose} />
			<div className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 h-[80vh] flex flex-col">
				{view === "picker" && (
					<CategoryPicker
						currentCategory={transaction.category}
						onClose={() => setView("details")}
						onSelect={handleUpdateCategory}
					/>
				)}
				{view === "tags" && (
					<TagPicker
						selectedTags={currentTags}
						onToggleTag={handleToggleTag}
						onClose={() => setView("details")}
					/>
				)}

				<div className="absolute top-4 right-4 flex items-center gap-2 z-10">
					<button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors">
						<MoreHorizontal size={20} />
					</button>
					<button
						onClick={onClose}
						className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"
					>
						<X size={20} />
					</button>
				</div>

				<div className="flex-1 overflow-y-auto custom-scrollbar">
					<div className="pt-14 pb-8 flex flex-col items-center text-center px-6">
						<div
							className="w-16 h-16 rounded-full flex items-center justify-center text-white mb-4 shadow-xl ring-4 ring-white dark:ring-gray-800"
							style={{ backgroundColor: style.color }}
						>
							<GroupIcon size={32} />
						</div>
						<div className="font-bold text-4xl text-gray-900 dark:text-white mb-2 tracking-tight">
							{transaction.amount > 0 ? "+" : ""}
							{Math.abs(transaction.amount).toLocaleString("en-US", {
								style: "currency",
								currency: "USD",
							})}
						</div>
						<div className="text-gray-500 font-medium px-8 text-sm leading-relaxed max-w-xs mx-auto">
							{transaction.description}
						</div>
					</div>

					<div className="bg-gray-50 dark:bg-gray-800/50 mx-6 p-5 rounded-2xl mb-6 border border-gray-100 dark:border-gray-800">
						<div className="flex justify-between items-center text-sm mb-3">
							<span className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2.5">
								<div className="bg-white dark:bg-gray-700 p-0.5 rounded-full">
									<CheckCircle2 size={14} className="text-green-500" />
								</div>
								Authorized
							</span>
							<span className="text-gray-500 font-mono text-xs">
								{new Date(transaction.date).toLocaleDateString()}
							</span>
						</div>
						<div className="relative pl-2.75 ml-1.75 border-l-2 border-gray-200 dark:border-gray-700 h-2 mb-1"></div>
						<div className="flex justify-between items-center text-sm">
							<span className="font-semibold text-gray-900 dark:text-white flex items-center gap-2.5">
								<div className="bg-black dark:bg-white p-0.5 rounded-full">
									<CheckCircle2
										size={14}
										className="text-white dark:text-black"
									/>
								</div>
								Posted
							</span>
							<span className="text-gray-500 font-mono text-xs">
								{new Date(transaction.date).toLocaleDateString()}
							</span>
						</div>
					</div>

					<div className="px-6 space-y-6 pb-8">
						<div className="flex items-start justify-between group">
							<span className="text-sm font-semibold text-gray-500 mt-1">
								From
							</span>
							<span className="text-sm font-bold text-gray-900 dark:text-white text-right max-w-50 wrap-break-words">
								{transaction.account}
							</span>
						</div>
						<div className="h-px bg-gray-100 dark:bg-gray-800 w-full" />

						<div
							onClick={() => setView("picker")}
							className="flex items-start justify-between cursor-pointer group"
						>
							<span className="text-sm font-semibold text-gray-500 mt-2">
								Category
							</span>
							<div className="flex items-start gap-3 text-right pl-4">
								<div className="flex flex-col items-end">
									<div className="flex items-center gap-2 text-gray-900 dark:text-white font-bold text-sm group-hover:text-blue-600 transition-colors">
										<GroupIcon
											size={16}
											className="text-gray-400 group-hover:text-blue-500"
										/>
										{group}
										<ChevronRight
											size={14}
											className="text-gray-300 group-hover:text-blue-500"
										/>
									</div>
									{sub && (
										<span className="text-xs text-gray-500 font-medium mt-0.5 pr-5">
											{sub}
										</span>
									)}
								</div>
							</div>
						</div>

						<div className="h-px bg-gray-100 dark:bg-gray-800 w-full" />

						<div className="flex flex-col gap-2">
							<span className="text-sm font-semibold text-gray-500">
								On statement as
							</span>
							<span className="text-sm font-medium text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
								{transaction.description}
							</span>
						</div>

						<div
							onClick={() => setView("tags")}
							className="cursor-pointer group"
						>
							<div className="flex items-center justify-between mb-3">
								<span className="text-sm font-semibold text-gray-500">
									Tags
								</span>
								<div className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
									<Plus
										size={16}
										className="text-gray-400 group-hover:text-blue-500"
									/>
								</div>
							</div>
							<div className="flex flex-wrap gap-2 min-h-8">
								{currentTags.length === 0 && (
									<span className="text-xs text-gray-400 italic py-1">
										Add tags...
									</span>
								)}
								{currentTags.map((tag) => (
									<button
										key={tag}
										onClick={(e) => {
											e.stopPropagation();
											handleToggleTag(tag);
										}}
										className="px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 shadow-sm border border-transparent hover:border-black/5"
										style={{
											backgroundColor: stringToPastel(tag),
											color: "#1f2937",
										}}
									>
										{tag}
										<X size={12} className="opacity-50 hover:opacity-100" />
									</button>
								))}
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

// --- MAIN DASHBOARD ---
export default function InteractiveDashboard({
	transactions,
}: {
	transactions: Transaction[];
}) {
	// 1. Get the store hook specific to the current version (free or premium or pro)
    const useStore = useBudgetStore();
	const isLoading = useStore((state) => state.isLoading);
	// Inside InteractiveDashboard component

	const [selectedMonthKey, setSelectedMonthKey] = useState<string>("");
	const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
	const [viewingTransactionId, setViewingTransactionId] = useState<
		string | null
	>(null);

	const categoryStyles = useMemo(() => {
		const styles: Record<string, { color: string; icon: LucideIcon }> = {};
		const uniqueCategories = Array.from(
			new Set(transactions.map((t) => t.category || "Uncategorized")),
		);
		uniqueCategories.forEach((cat) => {
			styles[cat] = {
				color: stringToColor(cat),
				icon: getIconForCategory(cat),
			};
		});
		return styles;
	}, [transactions]);

	const availableMonths = useMemo(() => {
		const months = new Set<string>();
		transactions.forEach((t) => {
			const date = new Date(t.date);
			if (!isNaN(date.getTime())) {
				const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
				months.add(key);
			}
		});
		return Array.from(months).sort().reverse();
	}, [transactions]);

	const currentMonth = useMemo(() => {
		if (selectedMonthKey) return selectedMonthKey;
		if (availableMonths.length > 0) return availableMonths[0];
		return "ALL";
	}, [selectedMonthKey, availableMonths]);

	// 1. First, filter ONLY by Month (This feeds the Chart)
	const monthData = useMemo(() => {
		const safeTransactions = transactions || [];

		// If "ALL" time, return everything
		if (currentMonth === "ALL") return safeTransactions;

		// Otherwise filter by date key
		return safeTransactions.filter((t) => {
			const d = new Date(t.date);
			const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
			return key === currentMonth;
		});
	}, [transactions, currentMonth]);

	// 2. Second, filter by Category (This feeds the Transaction List)
	const listData = useMemo(() => {
		if (!selectedCategory) return monthData;
		return monthData.filter((t) => t.category === selectedCategory);
	}, [monthData, selectedCategory]);

	// const filteredData = useMemo(() => {
	// 	let data = transactions;
	// 	if (currentMonth !== "ALL") {
	// 		data = data.filter((t) => {
	// 			const d = new Date(t.date);
	// 			const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
	// 			return key === currentMonth;
	// 		});
	// 	}
	// 	if (selectedCategory) {
	// 		data = data.filter((t) => t.category === selectedCategory);
	// 	}
	// 	return data;
	// }, [transactions, currentMonth, selectedCategory]);

	// const chartData = useMemo(() => {
	// 	const totals: Record<string, number> = {};
	// 	let totalSpending = 0;
	// 	filteredData.forEach((t) => {
	// 		if (t.amount < 0) {
	// 			const cat = t.category || "Uncategorized";
	// 			const val = Math.abs(t.amount);
	// 			totals[cat] = (totals[cat] || 0) + val;
	// 			totalSpending += val;
	// 		}
	// 	});
	// 	const segments = Object.entries(totals)
	// 		.map(([name, value]) => {
	// 			const style = categoryStyles[name] || { color: "#ccc" };
	// 			const isSelected = selectedCategory === name;
	// 			const isDimmed = selectedCategory !== null && !isSelected;
	// 			return {
	// 				name,
	// 				value,
	// 				fill: style.color,
	// 				stroke: isSelected ? "#fff" : "none",
	// 				strokeWidth: 3,
	// 				opacity: isDimmed ? 0.3 : 1,
	// 			};
	// 		})
	// 		.sort((a, b) => b.value - a.value);
	// 	return { total: totalSpending, segments };
	// }, [filteredData, selectedCategory, categoryStyles]);

	const chartData = useMemo(() => {
		const totals: Record<string, number> = {};
		let totalSpending = 0;

		// Use monthData here!
		monthData.forEach((t) => {
			if (t.amount < 0) {
				const cat = t.category || "Uncategorized";
				const val = Math.abs(t.amount);
				totals[cat] = (totals[cat] || 0) + val;
				totalSpending += val;
			}
		});

		const segments = Object.entries(totals)
			.map(([name, value]) => {
				const style = categoryStyles[name] || { color: "#ccc" };
				const isSelected = selectedCategory === name;
				// Dim others if something is selected
				const isDimmed = selectedCategory !== null && !isSelected;

				return {
					name,
					value,
					fill: style.color,
					stroke: isSelected ? "#fff" : "none",
					strokeWidth: 3,
					opacity: isDimmed ? 0.3 : 1, // Visual highlight logic
				};
			})
			.sort((a, b) => b.value - a.value);

		return { total: totalSpending, segments };
	}, [monthData, selectedCategory, categoryStyles]); // Depend on monthData

	// const groupedTransactions = useMemo(() => {
	// 	const groups: Record<string, Transaction[]> = {};
	// 	const sorted = [...filteredData].sort(
	// 		(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
	// 	);
	// 	sorted.forEach((t) => {
	// 		const dateObj = new Date(t.date);
	// 		if (isNaN(dateObj.getTime())) return;
	// 		const dateStr = dateObj.toLocaleDateString("en-US", {
	// 			month: "short",
	// 			day: "2-digit",
	// 			year: "numeric",
	// 		});
	// 		if (!groups[dateStr]) groups[dateStr] = [];
	// 		groups[dateStr].push(t);
	// 	});
	// 	return groups;
	// }, [filteredData]);

	// 4. Update Grouped Transactions to use 'listData'
	const groupedTransactions = useMemo(() => {
		const groups: Record<string, Transaction[]> = {};

		// Use listData here!
		const sorted = [...listData].sort(
			(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
		);

		sorted.forEach((t) => {
			const dateObj = new Date(t.date);
			if (isNaN(dateObj.getTime())) return;
			const dateStr = dateObj.toLocaleDateString("en-US", {
				month: "short",
				day: "2-digit",
				year: "numeric",
			});
			if (!groups[dateStr]) groups[dateStr] = [];
			groups[dateStr].push(t);
		});
		return groups;
	}, [listData]);

	const formatMonthLabel = (key: string) => {
		if (key === "ALL") return "All Time";
		const [year, month] = key.split("-");
		const date = new Date(parseInt(year), parseInt(month) - 1);
		return `${date.toLocaleString("default", { month: "long" })} ${year}`;
	};

	// Early return with Skeleton
	if (isLoading || !transactions) {
		return <DashboardSkeleton />;
	}

	return (
		<div className="max-w-4xl mx-auto">
			{viewingTransactionId && (
				<TransactionModal
					transactionId={viewingTransactionId}
					onClose={() => setViewingTransactionId(null)}
				/>
			)}

			<div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
				<h2 className="text-2xl font-bold text-gray-900 dark:text-white">
					Spending Analysis
				</h2>
				<div className="relative min-w-50">
					<select
						value={currentMonth}
						onChange={(e) => setSelectedMonthKey(e.target.value)}
						className="w-full appearance-none bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white py-2 pl-4 pr-10 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium transition-all"
					>
						{availableMonths.map((month) => (
							<option key={month} value={month}>
								{formatMonthLabel(month)}
							</option>
						))}
						<option value="ALL">All Time</option>
					</select>
					<div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
						<ChevronRight className="rotate-90" size={16} />
					</div>
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12 items-center">
				<div className="relative h-64 md:h-80 w-full min-w-0">
					<ResponsiveContainer width="100%" height="100%">
						<PieChart>
							<Pie
								data={chartData.segments}
								innerRadius={80}
								outerRadius={110}
								paddingAngle={2}
								dataKey="value"
								stroke="none"
								onClick={(data) =>
									setSelectedCategory((prev) =>
										prev === data.name ? null : data.name,
									)
								}
								className="outline-none cursor-pointer"
							/>
							<Tooltip
								formatter={(value: number | undefined) =>
									`$${(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
								}
								contentStyle={{
									borderRadius: "12px",
									border: "none",
									boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
								}}
							/>
						</PieChart>
					</ResponsiveContainer>
					<div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
						{selectedCategory ? (
							<>
								<div className="text-3xl font-bold text-gray-900 dark:text-white">
									$
									{chartData.segments
										.find((s) => s.name === selectedCategory)
										?.value.toLocaleString(undefined, {
											maximumFractionDigits: 0,
										})}
								</div>
								<div className="text-sm text-gray-500 font-medium mt-1 truncate max-w-37.5">
									{selectedCategory}
								</div>
								<button
									onClick={() => setSelectedCategory(null)}
									className="text-xs text-blue-500 font-semibold mt-2 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-full pointer-events-auto cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
								>
									Reset
								</button>
							</>
						) : (
							<>
								<div className="text-3xl font-bold text-gray-900 dark:text-white">
									$
									{chartData.total.toLocaleString(undefined, {
										maximumFractionDigits: 0,
									})}
								</div>
								<div className="text-sm text-gray-500 font-medium mt-1">
									Total Spending
								</div>
							</>
						)}
					</div>
				</div>

				<div className="space-y-1 max-h-80 overflow-y-auto pr-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
					{chartData.segments.slice(0, 6).map((entry) => {
						const style = categoryStyles[entry.name] || { color: "#ccc" };
						const isSelected = selectedCategory === entry.name;
						return (
							<div
								key={entry.name}
								onClick={() =>
									setSelectedCategory((prev) =>
										prev === entry.name ? null : entry.name,
									)
								}
								className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border ${isSelected ? "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800" : "bg-white border-transparent hover:bg-gray-50 dark:bg-transparent dark:hover:bg-gray-800/50"}`}
							>
								<div className="flex items-center gap-3">
									<div
										className="w-3 h-3 rounded-full shadow-sm"
										style={{ backgroundColor: style.color }}
									/>
									<span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate max-w-35">
										{entry.name}
									</span>
								</div>
								<div className="text-sm font-bold text-gray-900 dark:text-white font-mono tabular-nums">
									$
									{entry.value.toLocaleString(undefined, {
										minimumFractionDigits: 2,
										maximumFractionDigits: 2,
									})}
								</div>
							</div>
						);
					})}
				</div>
			</div>

			<div className="space-y-8">
				{Object.keys(groupedTransactions).length === 0 ? (
					<div className="flex flex-col items-center justify-center py-12 text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl">
						<p>No transactions found for this period.</p>
					</div>
				) : (
					Object.entries(groupedTransactions).map(([dateLabel, txs]) => (
						<div
							key={dateLabel}
							className="animate-in fade-in slide-in-from-bottom-4 duration-500"
						>
							<h3 className="text-xs font-bold text-gray-400 tracking-wider mb-4 ml-1">
								{dateLabel}
							</h3>
							<div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
								{txs.map((t) => {
									const style = categoryStyles[
										t.category || "Uncategorized"
									] || { color: "#ccc", icon: HelpCircle };
									const Icon = style.icon;
									return (
										<div
											key={t.id}
											onClick={() => setViewingTransactionId(t.id)}
											className="group flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
										>
											<div className="flex items-center gap-4 flex-1 min-w-0 mr-4">
												<div
													className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-white shadow-sm"
													style={{ backgroundColor: style.color }}
												>
													<Icon size={18} />
												</div>
												<div className="flex-1 min-w-0">
													<div className="font-semibold text-gray-900 dark:text-white truncate capitalize">
														{t.description.toLowerCase()}
													</div>
													<div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1 truncate">
														<span className="truncate">{t.account}</span>
														<span className="text-gray-300 shrink-0">•</span>
														<span className="truncate">{t.category}</span>
													</div>
												</div>
											</div>
											<div className="flex items-center gap-3 shrink-0">
												<span
													className={`font-mono font-bold whitespace-nowrap ${t.amount > 0 ? "text-green-600 dark:text-green-400" : "text-gray-900 dark:text-white"}`}
												>
													{t.amount > 0 ? "+" : ""}
													{Math.abs(t.amount).toLocaleString("en-US", {
														style: "currency",
														currency: "USD",
													})}
												</span>
												<ChevronRight
													size={16}
													className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
												/>
											</div>
										</div>
									);
								})}
							</div>
						</div>
					))
				)}
			</div>
		</div>
	);
}
