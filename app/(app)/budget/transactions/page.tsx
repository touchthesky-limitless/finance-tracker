"use client";

import React, { useMemo, useState, useEffect } from "react";
import {
	Plus,
	Import,
	Calendar,
	Filter,
	Search,
	ChevronDown,
	PencilSparkles,
	Columns,
	Sidebar as SidebarIcon,
	Minus,
	Sparkles,
	Trash2,
	X,
} from "lucide-react";
import { useBudgetStore, Transaction } from "@/store/useBudgetStore";
import { DataTable } from "@/components/Transactions/DataTable";
import dynamic from "next/dynamic";
import { UndoToast } from "@/components/ui/UndoToast";
import { VisibilityState, SortingState } from "@tanstack/react-table";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import ClearDataModal from "@/components/ClearDataModal";
import CsvUploader from "@/components/CsvUploader";

const EditTransactionModal = dynamic(
	() => {
		return import("@/components/Budget/EditTransactionModal");
	},
	{ ssr: false },
);

export default function TransactionsPage() {
	const transactions = useBudgetStore((state) => {
		return state.transactions;
	});
	const updateTransaction = useBudgetStore((state) => {
		return state.updateTransaction;
	});
	const bulkDeleteTransactions = useBudgetStore((state) => {
		return state.bulkDeleteTransactions;
	});
	const undoDelete = useBudgetStore((state) => {
		return state.undoDelete;
	});

	const setToast = useBudgetStore((state) => {
		return state.setToast;
	});
	const toast = useBudgetStore((state) => {
		return state.toast;
	});

	// --- Core State ---
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedIds, setSelectedIds] = useState<string[]>([]);
	const [selectedTransaction, setSelectedTransaction] =
		useState<Transaction | null>(null);
	const [currentView, setCurrentView] = useState<"all" | "review">("all");
	const [isEditMode, setIsEditMode] = useState(false);
	const [isSummaryVisible, setIsSummaryVisible] = useState(false);
	const [showClearModal, setShowClearModal] = useState(false);
	const [showUploader, setShowUploader] = useState(false);

	// --- Hydration & Lazy Init State ---
	const [isMounted, setIsMounted] = useState(false);

	useEffect(() => {
		// eslint-disable-next-line
		setIsMounted(true);
	}, []);

	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
		() => {
			if (typeof window !== "undefined") {
				const saved = window.localStorage.getItem("monarch_cols");
				if (saved) {
					return JSON.parse(saved);
				}
			}
			return {};
		},
	);

	const [sorting, setSorting] = useState<SortingState>(() => {
		if (typeof window !== "undefined") {
			const saved = window.localStorage.getItem("monarch_sort");
			if (saved) {
				return JSON.parse(saved);
			}
		}
		return [{ id: "date", desc: true }];
	});

	const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
	const [, setDeleteToast] = useState<{
		count: number;
		snapshot: Transaction[];
	} | null>(null);

	// Save settings whenever they change
	useEffect(() => {
		if (isMounted) {
			window.localStorage.setItem("monarch_sort", JSON.stringify(sorting));
		}
	}, [sorting, isMounted]);

	useEffect(() => {
		if (isMounted) {
			window.localStorage.setItem(
				"monarch_cols",
				JSON.stringify(columnVisibility),
			);
		}
	}, [columnVisibility, isMounted]);

	// Escape key to cancel edit mode
	useEffect(() => {
		const handleEsc = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				setIsEditMode(false);
				setSelectedIds([]);
			}
		};
		window.addEventListener("keydown", handleEsc);
		return () => {
			window.removeEventListener("keydown", handleEsc);
		};
	}, []);

	const filteredTransactions = useMemo(() => {
		// 1. Filter first (fast)
		let filtered = transactions.filter((t) => {
			return (
				!searchQuery ||
				t.merchant?.toLowerCase().includes(searchQuery.toLowerCase())
			);
		});

		if (currentView === "review") {
			filtered = filtered.filter((t) => {
				return t.needs_review || t.category === "Uncategorized";
			});
		}

		// 2. Sort only after filtering (much faster)
		const sortDef = sorting[0];
		if (sortDef) {
			return [...filtered].sort((a, b) => {
				const aVal = a[sortDef.id as keyof Transaction] ?? "";
				const bVal = b[sortDef.id as keyof Transaction] ?? "";

				if (sortDef.id === "amount") {
					return sortDef.desc
						? Number(bVal) - Number(aVal)
						: Number(aVal) - Number(bVal);
				}
				if (sortDef.id === "date") {
					return sortDef.desc
						? new Date(bVal as string).getTime() -
								new Date(aVal as string).getTime()
						: new Date(aVal as string).getTime() -
								new Date(bVal as string).getTime();
				}
				return (
					String(aVal).localeCompare(String(bVal)) * (sortDef.desc ? -1 : 1)
				);
			});
		}

		return filtered;
	}, [transactions, searchQuery, currentView, sorting]);

	const handleSelectRow = React.useCallback(
		(id: string, e: React.MouseEvent) => {
			e.stopPropagation();
			setSelectedIds((prev) => {
				if (prev.includes(id)) {
					return prev.filter((i) => {
						return i !== id;
					});
				}
				return [...prev, id];
			});
		},
		[],
	);

	const handleBulkDelete = async () => {
		const snapshotBackup = transactions.filter((t) => {
			return selectedIds.includes(t.id);
		});
		await bulkDeleteTransactions(selectedIds);
		setDeleteToast({ count: selectedIds.length, snapshot: snapshotBackup });
		setSelectedIds([]);
		setShowBulkDeleteConfirm(false);
	};

	// Summary calculations
	const summaryStats = useMemo(() => {
		let largestTransaction = 0;
		let largestExpense = 0;
		transactions.forEach((t) => {
			if (Math.abs(t.amount) > largestTransaction) {
				largestTransaction = Math.abs(t.amount);
			}
			if (t.amount < 0 && Math.abs(t.amount) > largestExpense) {
				largestExpense = Math.abs(t.amount);
			}
		});
		return {
			total: transactions.length,
			largestTx: largestTransaction,
			largestEx: largestExpense,
		};
	}, [transactions]);

	const sortOptions = [
		{ label: "Date (new to old)", id: "date", desc: true },
		{ label: "Date (old to new)", id: "date", desc: false },
		{ label: "Amount (high to low)", id: "amount", desc: true },
		{ label: "Amount (low to high)", id: "amount", desc: false },
	];

	const activeSortLabel = sortOptions.find((o) => {
		return o.id === sorting[0]?.id && o.desc === sorting[0]?.desc;
	})?.label;

	if (!isMounted) {
		return <div className="h-screen bg-gray-50 dark:bg-[#121212]" />;
	}

	const isSortModified =
		sorting.length > 0 &&
		(sorting[0].id !== "date" || sorting[0].desc !== true);
	const isColumnsModified = Object.values(columnVisibility).some(
		(isVisible) => {
			return isVisible === false;
		},
	);

	return (
		<div className="flex flex-col h-screen font-sans bg-gray-50 dark:bg-[#121212] text-gray-900 dark:text-gray-200 transition-colors duration-200">
			{/* TIER 1: Main Navigation */}
			<div className="flex items-center justify-between px-6 pt-5 pb-0 border-b border-gray-200 dark:border-white/5 bg-white dark:bg-[#191919] z-30 transition-colors duration-200">
				<div className="flex items-center gap-8">
					<h1 className="text-[22px] font-bold text-gray-900 dark:text-white tracking-tight pb-4">
						Transactions
					</h1>
					<div className="flex gap-6 text-[15px] font-medium h-full">
						<button className="text-[#FF5A35] border-b-[3px] border-[#FF5A35] pb-4">
							All
						</button>
						<button className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 pb-4 transition-colors">
							Receipts
						</button>
					</div>
				</div>

				<div className="flex items-center gap-3 pb-4">
					{searchQuery && (
						<button
							onClick={() => {
								return setSearchQuery("");
							}}
							className="text-blue-600 dark:text-[#38bdf8] hover:text-blue-800 dark:hover:text-[#7dd3fc] text-[14px] font-medium mr-2 transition-colors"
						>
							Clear
						</button>
					)}

					<div className="flex items-center bg-transparent border border-gray-300 dark:border-white/20 rounded-lg overflow-hidden h-9 focus-within:border-gray-500 dark:focus-within:border-white/40 transition-colors">
						<div className="pl-3 pr-2 text-gray-500 dark:text-gray-400">
							<Search size={16} strokeWidth={2.5} />
						</div>
						<input
							value={searchQuery}
							onChange={(e) => {
								return setSearchQuery(e.target.value);
							}}
							placeholder="Search"
							className="w-40 bg-transparent text-gray-900 dark:text-white text-[14px] placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none h-full"
						/>
					</div>

					<button className="flex items-center gap-2 px-3 h-9 rounded-lg border border-gray-300 dark:border-white/20 text-[14px] font-medium text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
						<Calendar
							size={16}
							className="text-gray-500 dark:text-gray-400"
							strokeWidth={2}
						/>{" "}
						Date
					</button>

					<button className="flex items-center gap-2 px-3 h-9 rounded-lg border border-gray-300 dark:border-white/20 text-[14px] font-medium text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
						<Filter
							size={16}
							className="text-gray-500 dark:text-gray-400"
							strokeWidth={2}
						/>{" "}
						Filters
					</button>

					<div className="w-px h-6 bg-gray-300 dark:bg-white/20 mx-1" />

					<button
						className="flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-[#121212] border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-bold transition-all shadow-sm active:scale-95"
						onClick={() => setShowUploader(true)}
					>
						<Import size={16} />
						<span>Import</span>
					</button>
					<button
						onClick={() => {
							return setSelectedTransaction({
								id: crypto.randomUUID(),
								merchant: "",
								amount: 0,
								category: "Uncategorized",
								date: new Date().toISOString().split("T")[0],
								account: "",
								needs_review: false,
								needs_subcat: false,
							});
						}}
						className="flex items-center justify-center gap-1.5 px-4 h-9 rounded-lg bg-[#FF5A35] hover:bg-[#E04825] text-white text-[14px] font-bold transition-colors shadow-sm"
					>
						<Plus size={18} strokeWidth={2.5} /> Add
					</button>

					<button
						onClick={() => {
							return setIsSummaryVisible((prev) => {
								return !prev;
							});
						}}
						className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-colors ml-1 ${
							isSummaryVisible
								? "border-blue-600 dark:border-[#38bdf8] text-blue-600 dark:text-[#38bdf8] bg-blue-50 dark:bg-[#0B4D56]"
								: "border-gray-300 dark:border-white/20 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"
						}`}
					>
						<SidebarIcon size={18} strokeWidth={2} />
					</button>
				</div>
			</div>

			{/* MAIN CONTENT AREA */}
			<div className="flex flex-1 min-h-0 overflow-hidden p-6 gap-6">
				{/* LEFT CARD (Table + Toolbar) */}
				<div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#191919] border border-gray-200 dark:border-white/5 rounded-2xl shadow-sm overflow-hidden transition-colors duration-200">
					{/* TIER 2: Table Toolbar */}
					<div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-white/5 relative z-50">
						{/* LEFT TOOLBAR CONTENT */}
						<div className="flex items-center gap-4">
							{isEditMode ? (
								<div className="flex items-center gap-3">
									<div className="w-6 h-6 rounded bg-[#FF5A35] flex items-center justify-center text-white">
										<Minus size={16} strokeWidth={3} />
									</div>
									<span className="text-gray-900 dark:text-white font-bold text-[15px]">
										{selectedIds.length} transaction
										{selectedIds.length !== 1 ? "s" : ""} selected{" "}
										<span className="text-gray-500 font-normal ml-1">
											(ESC)
										</span>
									</span>
								</div>
							) : (
								<div className="relative">
									<DropdownMenu.Root modal={false}>
										<DropdownMenu.Trigger asChild>
											<button className="flex items-center justify-between gap-2 px-3 h-9 min-w-45 rounded-lg border text-[14px] font-medium transition-colors border-gray-300 dark:border-white/20 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/5 data-[state=open]:border-blue-600 data-[state=open]:dark:border-[#38bdf8]">
												{currentView === "all" ? "All transactions" : "Anyone"}{" "}
												<ChevronDown
													size={16}
													className="text-gray-500 dark:text-gray-400"
												/>
											</button>
										</DropdownMenu.Trigger>
										<DropdownMenu.Portal>
											<DropdownMenu.Content
												align="start"
												sideOffset={8}
												className="z-50 w-64 bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden py-2 animate-in fade-in zoom-in-95"
											>
												<DropdownMenu.Item
													onSelect={() => {
														return setCurrentView("all");
													}}
													className={`w-full text-left px-4 py-2.5 text-[15px] transition-colors outline-none cursor-pointer ${currentView === "all" ? "bg-blue-50 dark:bg-[#0B4D56] text-blue-600 dark:text-[#38bdf8]" : "text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/5 focus:bg-gray-100 dark:focus:bg-white/5"}`}
												>
													All transactions
												</DropdownMenu.Item>
												<div className="px-4 py-2 text-xs font-bold text-gray-500 mt-2">
													Needs Review by...
												</div>
												<DropdownMenu.Item
													onSelect={() => {
														return setCurrentView("review");
													}}
													className={`w-full text-left px-4 py-2.5 text-[15px] transition-colors outline-none cursor-pointer ${currentView === "review" ? "bg-blue-50 dark:bg-[#0B4D56] text-blue-600 dark:text-[#38bdf8]" : "text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/5 focus:bg-gray-100 dark:focus:bg-white/5"}`}
												>
													Anyone
												</DropdownMenu.Item>
											</DropdownMenu.Content>
										</DropdownMenu.Portal>
									</DropdownMenu.Root>
								</div>
							)}
						</div>

						{/* RIGHT TOOLBAR CONTENT */}
						<div className="flex items-center gap-3">
							{isEditMode ? (
								<>
									<button
										onClick={() => {
											setIsEditMode(false);
											setSelectedIds([]);
										}}
										className="px-4 h-9 rounded-lg border border-gray-300 dark:border-white/20 text-[14px] font-medium text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
									>
										Cancel
									</button>
									<button className="px-4 h-9 rounded-lg bg-[#FF5A35] hover:bg-[#E04825] text-[14px] font-bold text-white transition-colors">
										Edit {selectedIds.length}
									</button>
								</>
							) : currentView === "review" ? (
								<>
									<button
										onClick={() => {
											return setIsEditMode(true);
										}}
										className="flex items-center gap-2 px-3 h-9 rounded-lg border border-gray-300 dark:border-white/20 text-[14px] font-medium text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
									>
										<PencilSparkles
											size={16}
											className="text-gray-500 dark:text-gray-400"
											strokeWidth={2.5}
										/>{" "}
										Edit multiple
									</button>
									<button className="px-4 h-9 rounded-lg bg-[#FF5A35] hover:bg-[#E04825] text-[14px] font-bold text-white transition-colors">
										Mark all {filteredTransactions.length} as reviewed
									</button>
								</>
							) : (
								<button
									onClick={() => {
										return setIsEditMode(true);
									}}
									className="flex items-center gap-2 px-3 h-9 rounded-lg border border-gray-300 dark:border-white/20 text-[14px] font-medium text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
								>
									<PencilSparkles
										size={16}
										className="text-gray-500 dark:text-gray-400"
										strokeWidth={2.5}
									/>{" "}
									Edit multiple
								</button>
							)}

							<div className="w-px h-6 bg-gray-300 dark:bg-white/20 mx-1" />

							<div className="relative">
								<DropdownMenu.Root modal={false}>
									<DropdownMenu.Trigger asChild>
										<button className="relative flex items-center gap-2 px-3 h-9 rounded-lg border border-gray-300 dark:border-white/20 text-[14px] font-medium text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors data-[state=open]:bg-gray-100 dark:data-[state=open]:bg-white/5">
											Sort{" "}
											<ChevronDown
												size={16}
												className="text-gray-500 dark:text-gray-400"
											/>
											{isSortModified && (
												<div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 dark:bg-[#38bdf8] border-2 border-white dark:border-[#191919] rounded-full" />
											)}
										</button>
									</DropdownMenu.Trigger>
									<DropdownMenu.Portal>
										<DropdownMenu.Content
											align="end"
											sideOffset={8}
											className="z-50 w-56 bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden py-2 animate-in fade-in zoom-in-95"
										>
											{sortOptions.map((opt) => {
												const isActive = activeSortLabel === opt.label;
												return (
													<DropdownMenu.Item
														key={opt.label}
														onSelect={() => {
															return setSorting([
																{ id: opt.id, desc: opt.desc },
															]);
														}}
														className={`w-full text-left px-4 py-2.5 text-[15px] transition-colors outline-none cursor-pointer ${isActive ? "bg-blue-50 dark:bg-[#0B4D56] text-blue-600 dark:text-[#38bdf8]" : "text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/5 focus:bg-gray-100 dark:focus:bg-white/5"}`}
													>
														{opt.label}
													</DropdownMenu.Item>
												);
											})}
										</DropdownMenu.Content>
									</DropdownMenu.Portal>
								</DropdownMenu.Root>
							</div>

							<div className="relative">
								<DropdownMenu.Root modal={false}>
									<DropdownMenu.Trigger asChild>
										<button className="relative flex items-center gap-2 px-3 h-9 rounded-lg border border-gray-300 dark:border-white/20 text-[14px] font-medium text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors data-[state=open]:bg-gray-100 dark:data-[state=open]:bg-white/5">
											<Columns
												size={16}
												className="text-gray-500 dark:text-gray-400"
											/>{" "}
											Columns
											{isColumnsModified && (
												<div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 dark:bg-[#38bdf8] border-2 border-white dark:border-[#191919] rounded-full" />
											)}
										</button>
									</DropdownMenu.Trigger>
									<DropdownMenu.Portal>
										<DropdownMenu.Content
											align="end"
											sideOffset={8}
											className="z-50 w-56 bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl py-3 px-4 flex flex-col gap-4 animate-in fade-in zoom-in-95"
										>
											<div className="text-xs font-bold text-gray-500">
												{Object.values(columnVisibility).filter((v) => {
													return v !== false;
												}).length +
													(2 - Object.keys(columnVisibility).length)}{" "}
												of 2 visible
											</div>
											{["category", "account"].map((col) => {
												const isChecked = columnVisibility[col] !== false;
												return (
													<DropdownMenu.Item
														key={col}
														onSelect={(e) => {
															e.preventDefault();
															return setColumnVisibility((prev) => {
																return { ...prev, [col]: !isChecked };
															});
														}}
														className="flex items-center justify-between outline-none cursor-pointer"
													>
														<span className="text-[15px] text-gray-900 dark:text-white capitalize">
															{col}
														</span>
														<button
															className={`w-10 h-5 rounded-full relative transition-colors pointer-events-none ${isChecked ? "bg-[#FF5A35]" : "bg-gray-300 dark:bg-gray-600"}`}
														>
															<div
																className={`w-3.5 h-3.5 rounded-full bg-white dark:bg-[#191919] absolute top-0.75 transition-all ${isChecked ? "right-1" : "left-1"}`}
															/>
														</button>
													</DropdownMenu.Item>
												);
											})}
										</DropdownMenu.Content>
									</DropdownMenu.Portal>
								</DropdownMenu.Root>
							</div>
						</div>
					</div>

					{/* MAIN TABLE */}
					<div className="flex-1 overflow-hidden relative">
						<DataTable
							transactions={filteredTransactions}
							selectedIds={selectedIds}
							onSelectRow={handleSelectRow}
							onRowClick={setSelectedTransaction}
							columnVisibility={columnVisibility}
							isEditMode={isEditMode}
							currentView={currentView}
							sorting={sorting}
							onCategoryChange={(id, newCategory) => {
								const transaction = transactions.find((t) => {
									return t.id === id;
								});

								if (transaction) {
									updateTransaction(transaction.id, {
										...transaction,
										category: newCategory,
									});
								}
							}}
						/>
					</div>
				</div>

				{/* RIGHT CARD (Summary Sidebar) */}
				{isSummaryVisible && (
					<div className="w-[320px] bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-white/5 rounded-2xl shadow-sm p-6 flex flex-col z-20 transition-colors duration-200">
						<div className="flex items-center justify-between mb-8">
							<h2 className="text-[18px] font-bold text-gray-900 dark:text-white tracking-tight">
								Summary
							</h2>
							<Sparkles
								size={18}
								className="text-gray-500 dark:text-gray-400"
							/>
						</div>

						<div className="flex flex-col gap-6">
							<div className="flex items-center justify-between">
								<span className="text-[14px] text-gray-500 dark:text-gray-400 font-medium">
									Total transactions
								</span>
								<span className="text-[15px] text-gray-900 dark:text-white font-medium">
									{summaryStats.total}
								</span>
							</div>
							<div className="flex items-center justify-between">
								<span className="text-[14px] text-gray-500 dark:text-gray-400 font-medium">
									Largest transaction
								</span>
								<span className="text-[15px] text-gray-900 dark:text-white font-medium">
									${summaryStats.largestTx.toFixed(2)}
								</span>
							</div>
							<div className="flex items-center justify-between">
								<span className="text-[14px] text-gray-500 dark:text-gray-400 font-medium">
									Largest expense
								</span>
								<span className="text-[15px] text-gray-900 dark:text-white font-medium">
									${summaryStats.largestEx.toFixed(2)}
								</span>
							</div>
						</div>
					</div>
				)}
			</div>
			{/* Modals */}
			{showUploader && (
				<div className="fixed inset-0 z-100 flex items-center justify-center p-4">
					<div
						className="absolute inset-0 bg-black/60 backdrop-blur-md transform-gpu"
						onClick={() => {
							setShowUploader(false);
						}}
					/>
					<div className="relative bg-white dark:bg-[#121212] border border-gray-200 dark:border-white/10 w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden">
						<div className="p-6 border-b border-gray-200 dark:border-white/5 flex justify-between items-center">
							<h3 className="text-lg font-black tracking-tight text-gray-900 dark:text-white">
								Import CSV Statement
							</h3>
							<button
								onClick={() => {
									setShowUploader(false);
								}}
								className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors"
							>
								<X size={20} />
							</button>
						</div>
						<div className="p-8">
							<CsvUploader
								onComplete={() => {
									setShowUploader(false);
								}}
							/>
						</div>
					</div>
				</div>
			)}
			{showClearModal && (
				<ClearDataModal
					isOpen={showClearModal}
					onClose={() => {
						setShowClearModal(false);
					}}
				/>
			)}

			{/* Modals & Popups */}
			{selectedTransaction && (
				<EditTransactionModal
					key={selectedTransaction.id}
					transaction={selectedTransaction}
					isOpen={!!selectedTransaction}
					onClose={() => {
						return setSelectedTransaction(null);
					}}
					onUpdate={updateTransaction}
					onRuleSaved={(count, snapshot) => {
						setToast({ count, snapshot });
						setSelectedTransaction(null);
					}}
				/>
			)}

			{toast && (
				<UndoToast
					show={!!toast}
					message={`Updated ${toast.count} transactions`}
					onUndo={() => {
						useBudgetStore.getState().undoBulkUpdate(toast.snapshot);
						setToast(null);
					}}
					onClose={() => {
						return setToast(null);
					}}
				/>
			)}

			{/* Delete Confirmation Modal (Appears when attempting to delete in Edit Mode) */}
			{showBulkDeleteConfirm && (
				<div className="fixed inset-0 z-100 flex items-center justify-center p-4">
					<div
						className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
						onClick={() => {
							return setShowBulkDeleteConfirm(false);
						}}
					/>
					<div className="relative bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-white/10 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
						<div className="p-6 text-center">
							<div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
								<Trash2 className="text-red-500" size={28} strokeWidth={2.5} />
							</div>
							<h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">
								Delete {selectedIds.length} Transactions?
							</h3>
							<p className="text-sm text-gray-500 dark:text-gray-400 mb-8 px-2">
								This action cannot be undone. These transactions will be
								permanently removed from your budget.
							</p>
							<div className="flex gap-3">
								<button
									onClick={() => {
										return setShowBulkDeleteConfirm(false);
									}}
									className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-900 dark:text-white font-bold rounded-xl transition-all"
								>
									Cancel
								</button>
								<button
									onClick={handleBulkDelete}
									className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-600/20"
								>
									Yes, Delete
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
