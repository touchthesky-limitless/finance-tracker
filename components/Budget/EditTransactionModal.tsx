"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
	Calculator,
	Info,
	MapPin,
	Image as ImageIcon,
	MoreVertical,
	Zap,
	Calendar,
	Landmark,
	Trash2,
	Search,
	Plus,
	BotMessageSquare,
	Edit3,
	X,
	ChevronRight,
} from "lucide-react";

import { Transaction, Rule } from "@/store/useBudgetStore";
import { CategorySelector } from "@/components/CategorySelector";
import { CreateRuleModal } from "@/components/Transactions/CreateRuleModal";
import { useBudgetStore } from "@/store/useBudgetStore";
import { getInitialDisplayAmount, parseAmountInput } from "@/utils/formatters";
import { FeatureGuard } from "@/components/ui/FeatureGuard";
import { findParentCategory, getCategoryTheme } from "@/constants";
import { CategoryIcon } from "@/components/CategoryIcon";

interface EditTransactionModalProps {
	transaction: Transaction;
	isOpen: boolean;
	onClose: () => void;
	onUpdate: (id: string, updates: Partial<Transaction>) => void;
	onRuleSaved: (count: number, snapshot: Transaction[]) => void;
}

interface NavButtonProps {
	icon: React.ReactNode;
	label: string;
	active: boolean;
	onClick: () => void;
}

export default function EditTransactionModal({
	transaction,
	isOpen,
	onClose,
	onRuleSaved,
}: EditTransactionModalProps) {
	const [activeTab, setActiveTab] = useState<
		"Basic Information" | "Location on Map" | "Pictures" | "Rules"
	>("Basic Information");

	const [editedData, setEditedData] = useState(transaction);
	const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
	const [searchTerm, setSearchTerm] = useState("");

	const [ruleToEdit, setRuleToEdit] = useState<Rule | null>(null);
const [
	saveError,
	setSaveError,
] = useState<string | null>(
	null,
);
	const transactions = useBudgetStore((state) => state.transactions);
	const rules = useBudgetStore((state) => state.rules);
	const deleteRule = useBudgetStore((state) => state.deleteRule);
	const addTransactions = useBudgetStore((state) => state.addTransactions);
	const updateTransaction = useBudgetStore((state) => state.updateTransaction);
	const accounts = useBudgetStore(
	(state) => state.accounts,
);

const fetchAccounts = useBudgetStore(
	(state) => state.fetchAccounts,
);

useEffect(() => {
	if (!isOpen) {
		return;
	}

	void fetchAccounts();
}, [isOpen, fetchAccounts]);

	// This state holds the raw string (like "22.") so the decimal doesn't disappear
	const [displayAmount, setDisplayAmount] = useState(() =>
		getInitialDisplayAmount(transaction.amount),
	);

	const [deletingRule, setDeletingRule] = useState<string | null>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	const isNew = !useBudgetStore((state) =>
		state.transactions.some((t) => t.id === transaction.id),
	);

	useEffect(() => {
		if (deletingRule) {
			const timer = setTimeout(() => setDeletingRule(null), 5000);
			return () => clearTimeout(timer);
		}
	}, [deletingRule]);

	if (!isOpen || !transaction) return null;

const handleSave = async () => {
	setSaveError(null);

	if (!editedData.account_id) {
		setSaveError(
			"Please select an account.",
		);

		return;
	}

	if (!editedData.merchant.trim()) {
		setSaveError(
			"Please enter a merchant name.",
		);

		return;
	}

	const isExisting =
		transactions.some((item) => {
			return (
				item.id === editedData.id
			);
		});

	const snapshot = [
		...transactions,
	];

	try {
		if (isExisting) {
			await updateTransaction(
				editedData.id,
				editedData,
			);
		} else {
			await addTransactions([
				editedData,
			]);
		}

		onClose();

		onRuleSaved?.(
			1,
			snapshot,
		);
	} catch (error) {
		console.error(
			"Failed to save transaction:",
			error,
		);

		setSaveError(
			error instanceof Error
				? error.message
				: "Failed to save transaction.",
		);
	}
};

	return createPortal(
		<div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-[#F8F9FB] dark:bg-black/90 backdrop-blur-sm transform-gpu animate-in fade-in duration-200">
			<div className="absolute inset-0" onClick={onClose} />

			{/* Changed to flex-col on mobile, flex-row on md+ */}
			<div className="relative w-full max-w-4xl bg-[#F8F9FB] dark:bg-[#121212] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl flex flex-col md:flex-row overflow-hidden h-fit max-h-[90vh] animate-in zoom-in-95 duration-200">
				{/* --- LEFT SIDEBAR (Top Navigation on Mobile) --- */}
				<div className="w-full md:w-56 bg-[#F8F9FB] dark:bg-[#0d0d0d] border-b md:border-b-0 md:border-r border-gray-100 dark:border-gray-800 p-3 md:p-4 flex flex-col md:justify-between shrink-0">
					<div className="space-y-1">
						<h2 className="text-lg font-bold text-black dark:text-white px-2 md:px-4 mb-3 md:mb-6">
							{isNew ? "Add Transaction" : "Edit Transaction"}
						</h2>

						{/* Scrollable horizontally on mobile */}
						<div className="flex flex-row md:flex-col overflow-x-auto scrollbar-hide gap-2 pb-1 md:pb-0">
							<NavButton
								icon={<Info size={18} />}
								label="Basic Information"
								active={activeTab === "Basic Information"}
								onClick={() => setActiveTab("Basic Information")}
							/>
							<NavButton
								icon={<BotMessageSquare size={18} />}
								label="Manage Rules"
								active={activeTab === "Rules"}
								onClick={() => setActiveTab("Rules")}
							/>
							<FeatureGuard feature="MAP_INTEGRATION">
								<NavButton
									icon={<MapPin size={18} />}
									label="Location on Map"
									active={activeTab === "Location on Map"}
									onClick={() => setActiveTab("Location on Map")}
								/>
							</FeatureGuard>
							<FeatureGuard feature="MEDIA_UPLOADS">
								<NavButton
									icon={<ImageIcon size={18} />}
									label="Pictures"
									active={activeTab === "Pictures"}
									onClick={() => setActiveTab("Pictures")}
								/>
							</FeatureGuard>
						</div>
					</div>

					<button className="hidden md:flex items-center gap-2 px-4 py-2 text-gray-500 hover:text-white transition-colors">
						<MoreVertical size={18} />
						<span className="text-sm">More Options</span>
					</button>
				</div>

				{/* --- MAIN CONTENT --- */}
				<div className="flex-1 flex flex-col bg-[#F8F9FB] dark:bg-[#121212] overflow-hidden">
					{/* TAB: RULES MANAGEMENT */}
					{activeTab === "Rules" ? (
						<div className="flex-1 flex flex-col overflow-hidden">
							<div className="px-4 md:px-8 py-4 md:py-6 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-[#0d0d0d]">
								<div className="flex items-center justify-between mb-2 md:mb-1">
									<h3 className="text-xs md:text-sm font-bold uppercase tracking-widest text-gray-500">
										Active Rules
									</h3>
									<button
										onClick={() => {
											setRuleToEdit(null);
											setIsRuleModalOpen(true);
										}}
										className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-orange-600 hover:bg-orange-500 text-white text-[10px] md:text-[11px] font-black uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-orange-600/20 active:scale-95"
									>
										<Plus size={14} />
										New Rule
									</button>
								</div>
								<p className="hidden md:block text-xs text-gray-400 mb-6">
									Manage how incoming transactions are automatically
									categorized.
								</p>

								<div className="relative group mt-3 md:mt-0">
									<Search
										className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-orange-500 transition-colors"
										size={16}
									/>
									<input
										type="text"
										ref={inputRef}
										placeholder="Search by keyword or category..."
										className="w-full bg-[#F8F9FB] dark:bg-[#121212] border border-gray-100 dark:border-gray-800 rounded-xl py-2.5 md:py-3 pl-10 md:pl-12 pr-10 md:pr-12 text-sm outline-none focus:border-orange-500/50 transition-all"
										value={searchTerm}
										onChange={(e) => setSearchTerm(e.target.value)}
									/>
									{searchTerm && (
										<button
											type="button"
											onClick={() => {
												setSearchTerm("");
												inputRef.current?.focus();
											}}
											className="absolute right-2 md:right-2.5 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-md text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
										>
											<X size={14} />
										</button>
									)}
								</div>
							</div>

							{/* SCROLLABLE RULES LIST */}
							<div className="flex-1 overflow-y-auto px-4 md:px-8 py-4 md:py-6 space-y-3 scrollbar-hide">
								{rules.length === 0 ? (
									<div className="text-center py-10 md:py-20 text-gray-500 italic text-sm bg-white dark:bg-[#0d0d0d] rounded-2xl border border-dashed border-gray-100 dark:border-gray-800">
										No rules created yet.
									</div>
								) : (
									rules
										.filter(
											(rule) =>
												rule.keyword
													.toLowerCase()
													.includes(searchTerm.toLowerCase()) ||
												rule.category
													.toLowerCase()
													.includes(searchTerm.toLowerCase()),
										)
										.map((rule, index) => {
											const targetParent = findParentCategory(rule.category);
											const targetTheme = getCategoryTheme(rule.category);
											const sourceParent = rule.matchCategory
												? findParentCategory(rule.matchCategory)
												: null;
											const sourceTheme = rule.matchCategory
												? getCategoryTheme(rule.matchCategory)
												: null;

											return (
												<div
													key={`${rule.keyword}-${index}`}
													className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 md:p-5 bg-white dark:bg-[#0d0d0d] border border-gray-100 dark:border-gray-800 rounded-2xl group hover:border-orange-500/30 transition-all"
												>
													<div className="space-y-2.5">
														<div className="flex flex-wrap items-center gap-2">
															<div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 dark:bg-white/5 rounded-md border border-slate-200 dark:border-white/5">
																<Search size={10} className="text-gray-400" />
																<span className="text-[11px] font-bold text-gray-900 dark:text-white">
																	&quot;{rule.keyword}&quot;
																</span>
															</div>

															{rule.matchCategory && sourceTheme && (
																<>
																	<span className="text-[10px] font-black text-orange-500/50">
																		+
																	</span>
																	<span className="text-[10px] font-black uppercase tracking-tight opacity-70">
																		From:
																	</span>
																	<div
																		className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md border ${sourceTheme.border} ${sourceTheme.bg} bg-opacity-10 dark:bg-opacity-20`}
																	>
																		<CategoryIcon
																			name={sourceParent || "Uncategorized"}
																			size={10}
																			colorClass={sourceTheme.border}
																		/>
																		<span
																			className={`text-[10px] font-bold uppercase tracking-tight ${sourceTheme.border}`}
																		>
																			{rule.matchCategory}
																		</span>
																	</div>
																</>
															)}
														</div>

														<div className="flex items-center gap-2 pl-1">
															<span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
																Maps to
															</span>
															<ChevronRight
																size={10}
																className="text-gray-400"
															/>
															<div
																className={`flex items-center gap-2 px-2.5 py-1 rounded-lg shadow-sm ${targetTheme.bg}`}
															>
																<CategoryIcon
																	name={targetParent}
																	size={11}
																	colorClass="text-white"
																/>
																<span className="text-[11px] font-black uppercase tracking-wider text-white">
																	{rule.category}
																</span>
															</div>
														</div>
													</div>

													<div className="flex items-center justify-end gap-1">
														<button
															onClick={() => {
																setRuleToEdit(rule);
																setIsRuleModalOpen(true);
															}}
															className="p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-500/10 rounded-xl transition-all"
														>
															<Edit3 size={16} />
														</button>

														{deletingRule === rule.keyword ? (
															<div className="flex items-center gap-1 animate-in fade-in zoom-in duration-200">
																<button
																	onClick={() => setDeletingRule(null)}
																	className="px-2 py-1 text-[10px] font-bold text-gray-500 hover:text-gray-700"
																>
																	Cancel
																</button>
																<button
																	onClick={() => {
																		deleteRule(rule.keyword);
																		setDeletingRule(null);
																	}}
																	className="px-3 py-1 bg-red-500 text-white text-[10px] font-black uppercase tracking-tighter rounded-lg shadow-lg shadow-red-500/20"
																>
																	Delete
																</button>
															</div>
														) : (
															<button
																onClick={() => setDeletingRule(rule.keyword)}
																className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
															>
																<Trash2 size={16} />
															</button>
														)}
													</div>
												</div>
											);
										})
								)}
							</div>
						</div>
					) : (
						/* TAB: BASIC INFORMATION */
						<div className="flex-1 overflow-y-auto px-4 md:px-8 py-4 md:py-6 scrollbar-hide">
							<div className="space-y-6 md:space-y-8">
								{/* Responsive Type Toggle */}
								<div className="flex bg-[#F8F9FB] dark:bg-[#0d0d0d] p-1 rounded-xl w-full sm:w-fit border border-gray-100 dark:border-gray-800">
									{["Expense", "Income", "Transfer"].map((type) => (
										<button
											key={type}
											className={`flex-1 sm:flex-none px-3 sm:px-6 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
												type === "Expense"
													? "bg-orange-600 text-white shadow-lg"
													: "text-gray-500 hover:text-gray-300"
											}`}
										>
											{type}
										</button>
									))}
								</div>

								<div className="space-y-4 md:space-y-6">
									<label className="text-[10px] uppercase tracking-[0.2em] text-orange-500 font-black">
										Expense Amount
									</label>
									<div className="relative group">
										<div className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-emerald-500 text-xl md:text-2xl font-bold">
											$
										</div>
										<input
											type="text"
											className="w-full bg-[#F8F9FB] dark:bg-[#0d0d0d] 
               border border-gray-200 dark:border-gray-800 
               rounded-xl py-3 md:py-4 pl-8 md:pl-10 pr-10 md:pr-12 
               text-2xl md:text-3xl font-bold text-emerald-400 
               focus:border-orange-500/50 outline-none transition-all"
											value={displayAmount}
											onChange={(e) => {
												// 2. Let the utility handle the messy string formatting
												const { displayString, numericValue } =
													parseAmountInput(e.target.value);

												// 3. Update the UI string immediately (keeps the decimal visible!)
												setDisplayAmount(displayString);

												// 4. Update the actual data model with the clean number
												setEditedData({ ...editedData, amount: -numericValue });
											}}
										/>
										<div className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-emerald-500 cursor-pointer">
											<Calculator size={20} className="md:w-6 md:h-6" />
										</div>
									</div>
								</div>

								<CategorySelector
									currentCategory={editedData.category}
									onSelect={(sub) =>
										setEditedData({ ...editedData, category: sub })
									}
								/>

								{!isNew && (
									<div className="pt-2 md:pt-4 border-t border-slate-100 dark:border-white/5">
										<button
											type="button"
											onClick={() => setIsRuleModalOpen(true)}
											className="w-full py-3 md:py-4 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl text-slate-500 hover:border-orange-500/50 hover:text-orange-500 transition-all flex items-center justify-center gap-2 font-bold text-xs md:text-sm"
										>
											<div className="bg-orange-500/10 p-1 md:p-1.5 rounded-lg">
												<Zap
													size={14}
													className="text-orange-500 fill-orange-500 md:w-4 md:h-4"
												/>
											</div>
											Add Automation Rule
										</button>
									</div>
								)}

								{/* Collapsed grid to 1 column on mobile */}
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 md:mt-6">
									<div className="space-y-2">
										<label className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-black">
											Date
										</label>
										<div
											className="relative cursor-pointer"
											onClick={() => {
												const input = document.getElementById(
													"date-picker",
												) as HTMLInputElement;
												if (input) input.showPicker();
											}}
										>
											<Calendar
												size={16}
												className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none z-10"
											/>
											<input
												id="date-picker"
												type="date"
												className="relative min-w-0 w-full bg-[#F8F9FB] dark:bg-[#0d0d0d] border border-gray-200 dark:border-gray-800 rounded-xl py-2.5 md:py-3 pl-10 md:pl-12 pr-4 text-sm text-gray-900 dark:text-gray-300 outline-none focus:border-orange-500/50 scheme-light-dark dark:scheme-dark [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
												value={editedData.date}
												onChange={(e) =>
													setEditedData({ ...editedData, date: e.target.value })
												}
											/>
										</div>
									</div>

									<div className="space-y-2">
										<label className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-black">
											Account
										</label>
										<div className="relative">
											<Landmark
												size={16}
												className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-gray-500"
											/>
											<select
	className="w-full bg-[#F8F9FB] dark:bg-[#0d0d0d] border border-gray-200 dark:border-gray-800 rounded-xl py-2.5 md:py-3 pl-10 md:pl-12 pr-4 text-sm text-gray-900 dark:text-gray-300 outline-none focus:border-orange-500/50 appearance-none transition-all"
	value={
		editedData.account_id ??
		""
	}
	onChange={(event) => {
		const selectedAccount =
			accounts.find((account) => {
				return (
					account.id ===
					event.target.value
				);
			});

		if (!selectedAccount) {
			setEditedData({
				...editedData,
				account_id: null,
				account: "",
			});

			return;
		}

		setEditedData({
			...editedData,
			account_id:
				selectedAccount.id,
			account:
				selectedAccount.name,
		});
	}}
>
	<option value="" disabled>
		Select Account
	</option>

	{accounts.map((account) => {
		return (
			<option
				key={account.id}
				value={account.id}
			>
				{account.name}
			</option>
		);
	})}
</select>
										</div>
									</div>
								</div>

								<div className="space-y-2 pb-2">
									<label className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-black">
										Merchant Name
									</label>
									<textarea
										className="w-full bg-[#F8F9FB] dark:bg-[#0d0d0d] border border-gray-200 dark:border-gray-800 rounded-xl p-3 md:p-4 text-sm md:text-base text-gray-900 dark:text-gray-300 focus:border-orange-500/50 outline-none min-h-20 resize-none"
										value={editedData.merchant}
										onChange={(e) => {
											const newName = e.target.value;
											let suggestedCategory = editedData.category;
											if (isNew && newName.length > 2) {
												const matchingRule = rules.find((r) =>
													newName
														.toLowerCase()
														.includes(r.keyword.toLowerCase()),
												);
												if (matchingRule) {
													suggestedCategory = matchingRule.category;
												}
											}
											setEditedData({
												...editedData,
												merchant: newName,
												category: suggestedCategory,
											});
										}}
									/>
								</div>
							</div>
						</div>
					)}

					{saveError && (
	<p
		role="alert"
		className="mr-auto text-sm text-red-500"
	>
		{saveError}
	</p>
)}

					{/* --- FOOTER --- */}
					<div className="p-4 md:p-6 border-t border-gray-100 dark:border-gray-800 bg-[#F8F9FB] dark:bg-[#0d0d0d] flex justify-end gap-2 md:gap-3 shrink-0">
						<button
							onClick={onClose}
							className="px-4 md:px-6 py-2 md:py-2.5 text-xs md:text-sm font-bold text-gray-400 hover:text-white transition-colors"
						>
							Cancel
						</button>
						<button
	type="button"
	onClick={() => {
		void handleSave();
	}}
	disabled={!editedData.account_id}
	className="px-6 md:px-10 py-2 md:py-2.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs md:text-sm font-black rounded-xl transition-all shadow-lg shadow-orange-600/20 active:scale-95"
>
	{isNew ? "Add" : "Save"}
</button>
					</div>
				</div>

				<CreateRuleModal
					key={
						ruleToEdit ? `edit-${ruleToEdit.keyword}` : `new-${editedData.id}`
					}
					isOpen={isRuleModalOpen}
					onClose={() => {
						setIsRuleModalOpen(false);
						setRuleToEdit(null);
					}}
					initialName={
						ruleToEdit
							? ruleToEdit.keyword
							: activeTab === "Rules"
								? ""
								: editedData.merchant
					}
					initialCategory={
						ruleToEdit
							? ruleToEdit.category
							: activeTab === "Rules"
								? ""
								: editedData.category
					}
					onSaveSuccess={(count, snapshot) => {
						onRuleSaved(count, snapshot);
						setIsRuleModalOpen(false);
						setRuleToEdit(null);
					}}
				/>
			</div>
		</div>,
		document.body,
	);
}

function NavButton({ icon, label, active, onClick }: NavButtonProps) {
	return (
		<button
			onClick={onClick}
			className={`shrink-0 w-auto md:w-full flex items-center gap-2 md:gap-3 px-3 py-2 md:px-4 md:py-3 rounded-xl text-xs md:text-sm font-medium transition-all ${
				active
					? "bg-orange-600/10 text-orange-500 border border-orange-500/20 shadow-inner"
					: "text-gray-500 hover:text-gray-300 hover:bg-white/5 border border-transparent"
			}`}
		>
			{icon}
			<span className="whitespace-nowrap">{label}</span>
		</button>
	);
}
