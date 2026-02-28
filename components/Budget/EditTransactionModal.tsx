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
} from "lucide-react";

import { Transaction } from "@/store/createBudgetStore";
import { CategorySelector } from "@/components/CategorySelector";
import { CreateRuleModal } from "@/components/Transactions/CreateRuleModal";
import { useBudgetStore } from "@/hooks/useBudgetStore";
import { formatThousandWithCommas } from "@/utils/formatters";
import { FeatureGuard } from "@/components/ui/FeatureGuard";

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
	// initialize directly from props. The 'key' in the parent handles resets.
	const [activeTab, setActiveTab] = useState<
		"Basic Information" | "Location on Map" | "Pictures" | "Rules"
	>("Basic Information");
	const [editedData, setEditedData] = useState(transaction);
	const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
	const [searchTerm, setSearchTerm] = useState("");
	const [ruleToEdit, setRuleToEdit] = useState<{
		keyword: string;
		category: string;
	} | null>(null);
	const useStore = useBudgetStore();
	const transactions = useStore((state) => state.transactions);
	const rules = useStore((state) => state.rules);
	const deleteRule = useStore((state) => state.deleteRule);
	const addTransactions = useStore((state) => state.addTransactions);
	const updateTransaction = useStore((state) => state.updateTransaction);
	const [deletingRule, setDeletingRule] = useState<string | null>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	const isNew = !useStore((state) =>
		state.transactions.some((t) => t.id === transaction.id),
	);

	useEffect(() => {
		if (deletingRule) {
			const timer = setTimeout(() => setDeletingRule(null), 5000); // Auto-cancel after 5 seconds
			return () => clearTimeout(timer);
		}
	}, [deletingRule]);

	if (!isOpen || !transaction) return null;

	const handleSave = () => {
		const isExisting = transactions.some((t) => t.id === editedData.id);

		// 1. Capture the snapshot before the update if you need it for Undo
		const snapshot = [...transactions];

		// 2. Perform the update
		if (isExisting) {
			updateTransaction(editedData.id, editedData);
		} else {
			addTransactions([editedData]);
		}

		// 3. CLOSE FIRST to clear 'selectedTransaction' in the parent
		onClose();

		// 4. Trigger the toast AFTER closing
		// If you are calling onRuleSaved here, pass the snapshot and count
		if (onRuleSaved) {
			onRuleSaved(1, snapshot);
		}
	};

	return createPortal(
		<div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-[#F8F9FB] dark:bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
			{/* Backdrop Click to Close */}
			<div className="absolute inset-0" onClick={onClose} />

			<div className="relative w-full max-w-4xl bg-[#F8F9FB] dark:bg-[#121212] border border-gray-800 rounded-2xl shadow-2xl flex overflow-hidden h-fit max-h-[90vh] animate-in zoom-in-95 duration-200">
				{/* --- LEFT SIDEBAR --- */}
				<div className="w-56 bg-[#F8F9FB] dark:bg-[#0d0d0d] border-r border-gray-100 dark:border-gray-800 p-4 flex flex-col justify-between">
					<div className="space-y-1">
						<h2 className="text-lg font-bold text-black dark:text-white px-4 mb-6">
							{isNew ? "Add Transaction" : "Edit Transaction"}
						</h2>

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

					<button className="flex items-center gap-2 px-4 py-2 text-gray-500 hover:text-white transition-colors">
						<MoreVertical size={18} />
						<span className="text-sm">More Options</span>
					</button>
				</div>

				{/* --- MAIN CONTENT --- */}
				<div className="flex-1 flex flex-col bg-[#F8F9FB] dark:bg-[#121212] overflow-hidden">
					{/* TAB CONTENT: RULES MANAGEMENT */}
					{activeTab === "Rules" ? (
						<div className="flex-1 flex flex-col overflow-hidden">
							{/* --- Unified Header Section --- */}
							<div className="px-8 py-6 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-[#0d0d0d]">
								<div className="flex items-center justify-between mb-1">
									<h3 className="text-sm font-bold uppercase tracking-widest text-gray-500">
										Active Automation Rules
									</h3>
									{/* --- ADD NEW RULE BUTTON --- */}
									<button
										onClick={() => {
											setRuleToEdit(null); // Explicitly clear any previous edit
											setIsRuleModalOpen(true);
										}}
										className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-[11px] font-black uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-orange-600/20 active:scale-95"
									>
										<Plus size={14} />
										New Rule
									</button>
									<span className="text-[10px] bg-orange-500/10 text-orange-500 px-2 py-1 rounded-md font-bold">
										{rules.length} Total
									</span>
								</div>
								<p className="text-xs text-gray-400 mb-6">
									Manage how incoming transactions are automatically
									categorized.
								</p>

								{/* Search Input with Clear Button */}
								<div className="relative group">
									<Search
										className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-orange-500 transition-colors"
										size={18}
									/>
									<input
										type="text"
										ref={inputRef}
										placeholder="Search by keyword or category..."
										className="w-full bg-[#F8F9FB] dark:bg-[#121212] border border-gray-100 dark:border-gray-800 rounded-xl py-3 pl-12 pr-12 text-sm outline-none focus:border-orange-500/50 transition-all"
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
											className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-md text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
										>
											<X size={16} />
										</button>
									)}
								</div>
							</div>

							{/* --- Scrollable Rules List --- */}
							<div className="flex-1 overflow-y-auto px-8 py-6 space-y-3 scrollbar-hide">
								{rules.length === 0 ? (
									<div className="text-center py-20 text-gray-500 italic text-sm bg-white dark:bg-[#0d0d0d] rounded-2xl border border-dashed border-gray-100 dark:border-gray-800">
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
										.map((rule, index) => (
											<div
												key={index}
												className="flex items-center justify-between p-5 bg-white dark:bg-[#0d0d0d] border border-gray-100 dark:border-gray-800 rounded-2xl group hover:border-orange-500/30 transition-all"
											>
												<div>
													<p className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-orange-500 transition-colors">
														&quot;{rule.keyword}&quot;
													</p>
													<div className="flex items-center gap-2 mt-1.5">
														<span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
															Maps to
														</span>
														<span className="text-[10px] text-orange-500 font-black uppercase tracking-wider">
															{rule.category}
														</span>
													</div>
												</div>
												<div className="flex items-center gap-1">
													{/* EDIT BUTTON */}
													<button
														onClick={() => {
															setRuleToEdit({
																keyword: rule.keyword,
																category: rule.category,
															});
															setIsRuleModalOpen(true);
														}}
														className="p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-500/10 rounded-xl transition-all"
														title="Edit Rule"
													>
														<Edit3 size={16} />
													</button>

													{/* SMART DELETE BUTTON */}
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
										))
								)}

								{/* Search No Results State */}
								{rules.length > 0 &&
									rules.filter(
										(rule) =>
											rule.keyword
												.toLowerCase()
												.includes(searchTerm.toLowerCase()) ||
											rule.category
												.toLowerCase()
												.includes(searchTerm.toLowerCase()),
									).length === 0 && (
										<div className="text-center py-10 text-gray-500 text-sm">
											No rules found matching &quot;
											<span className="font-bold">{searchTerm}</span>&quot;
										</div>
									)}
							</div>
						</div>
					) : (
						/* TAB CONTENT: BASIC INFORMATION */
						<div
							className="flex-1 overflow-y-auto px-8 py-6 scrollbar-hide"
							style={{
								msOverflowStyle: "none",
								scrollbarWidth: "none",
								WebkitOverflowScrolling: "touch",
							}}
						>
							<div className="space-y-8">
								{/* Transaction Type Tabs */}
								<div className="flex gap-1 bg-[#F8F9FB] dark:bg-[#0d0d0d] p-1 rounded-xl w-fit mb-8 border border-gray-100 dark:border-gray-800">
									{["Expense", "Income", "Transfer"].map((type) => (
										<button
											key={type}
											className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
												type === "Expense"
													? "bg-orange-600 text-white shadow-lg"
													: "text-gray-500 hover:text-gray-300"
											}`}
										>
											{type}
										</button>
									))}
								</div>

								{/* Amount Input Block */}
								<div className="space-y-6 mb-8 ">
									<label className="text-[10px] uppercase tracking-[0.2em] text-orange-500 font-black">
										Expense Amount
									</label>
									<div className="relative group ">
										<div className="absolute left-4 top-1/2 -translate-y-1/2  text-emerald-500 text-2xl font-bold ">
											$
										</div>

										<input
											type="text" // Must be text for commas
											className="w-full bg-[#F8F9FB] dark:bg-[#0d0d0d] border border-gray-500 dark:border-gray-800 rounded-xl py-4 pl-10 pr-12 text-3xl font-bold text-emerald-400 focus:border-orange-500/50 outline-none transition-all"
											// Format the number for display
											value={formatThousandWithCommas(
												Math.abs(editedData.amount),
											)}
											onChange={(e) => {
												// 1. Strip commas and non-numeric chars
												let rawValue = e.target.value.replace(/[^0-9.]/g, "");

												// 2. Fix leading zero
												if (
													rawValue.length > 1 &&
													rawValue.startsWith("0") &&
													rawValue[1] !== "."
												) {
													rawValue = rawValue.substring(1);
												}

												// 3. Convert to number and maintain the negative sign (expense)
												const numericValue = parseFloat(rawValue) || 0;

												setEditedData({
													...editedData,
													amount: -numericValue, // Keeping it negative as per your original logic
												});
											}}
										/>
										<div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-emerald-500 cursor-pointer">
											<Calculator size={24} />
										</div>
									</div>
								</div>

								{/* Category Section */}
								<div className="h-fit">
									<CategorySelector
										currentCategory={editedData.category}
										onSelect={(sub) => {
											setEditedData({ ...editedData, category: sub });
										}}
									/>
								</div>

								{/* --- Create Rule Section --- */}
								{!isNew && (
									<div className="pt-4 border-t border-slate-100 dark:border-white/5">
										<button
											type="button"
											onClick={() => setIsRuleModalOpen(true)}
											className="w-full py-4 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl text-slate-500 hover:border-orange-500/50 hover:text-orange-500 transition-all flex items-center justify-center gap-2 font-bold text-sm"
										>
											<div className="bg-orange-500/10 p-1.5 rounded-lg">
												<Zap
													size={16}
													className="text-orange-500 fill-orange-500"
												/>
											</div>
											Add Automation Rule
										</button>
									</div>
								)}

								{/* Date Input */}
								<div className="grid grid-cols-2 gap-4 mt-6">
									<div className="space-y-2">
										<label className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-black">
											Date
										</label>
										<div className="relative">
											<Calendar
												size={16}
												className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
											/>
											<input
												type="date"
												className="w-full bg-[#F8F9FB] dark:bg-[#0d0d0d] border border-gray-800 rounded-xl py-3 pl-12 pr-4 text-sm text-gray-300 outline-none focus:border-orange-500/50 scheme-dark"
												value={editedData.date}
												onChange={(e) =>
													setEditedData({ ...editedData, date: e.target.value })
												}
											/>
										</div>
									</div>

									{/* Account Selector */}
									<div className="space-y-2">
										<label className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-black">
											Account
										</label>
										<div className="relative">
											<Landmark
												size={16}
												className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
											/>
											<select
												className="w-full bg-[#F8F9FB] dark:bg-[#0d0d0d] border border-gray-800 rounded-xl py-3 pl-12 pr-4 text-sm text-gray-300 outline-none focus:border-orange-500/50 appearance-none transition-all"
												value={editedData.account}
												onChange={(e) =>
													setEditedData({
														...editedData,
														account: e.target.value,
													})
												}
											>
												<option value="" disabled>
													Select Account
												</option>
												<option value="Chase Checking">Chase Checking</option>
												<option value="Amex Gold">Amex Gold</option>
												<option value="Apple Card">Apple Card</option>
											</select>
										</div>
									</div>
								</div>

								{/* Description Field */}
								<div className="space-y-2">
									<label className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-black">
										Description
									</label>
									<textarea
										className="w-full bg-[#F8F9FB] dark:bg-[#0d0d0d] border border-gray-800 rounded-xl p-4 text-gray-300 focus:border-orange-500/50 outline-none min-h-1 resize-none"
										value={editedData.description}
										onChange={(e) =>
											setEditedData({
												...editedData,
												description: e.target.value,
											})
										}
									/>
								</div>
							</div>
						</div>
					)}

					{/* --- FOOTER --- */}
					<div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-[#F8F9FB] dark:bg-[#0d0d0d] flex justify-end gap-3">
						<button
							onClick={onClose}
							className="px-6 py-2.5 text-sm font-bold text-gray-400 hover:text-white transition-colors"
						>
							Cancel
						</button>
						<button
							type="button"
							onClick={handleSave}
							className="px-10 py-2.5 bg-orange-600 hover:bg-orange-500 text-white text-sm font-black rounded-xl transition-all shadow-lg shadow-orange-600/20 active:scale-95"
						>
							{isNew ? "Add" : "Save"}
						</button>
					</div>
				</div>

				{/* --- Create Rule Modal update --- */}
				<CreateRuleModal
					isOpen={isRuleModalOpen}
					onClose={() => {
						setIsRuleModalOpen(false);
						setRuleToEdit(null); // Reset when closing
					}}
					// --- The Logic Chain ---
					initialName={
						ruleToEdit
							? ruleToEdit.keyword
							: activeTab === "Rules"
								? ""
								: editedData.description
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
						setRuleToEdit(null); // Reset on success
					}}
				/>
			</div>
		</div>,
		document.body,
	);
}

// --- SUB-COMPONENT ---
function NavButton({ icon, label, active, onClick }: NavButtonProps) {
	return (
		<button
			onClick={onClick}
			className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
				active
					? "bg-orange-600/10 text-orange-500 border border-orange-500/20 shadow-inner"
					: "text-gray-500 hover:text-gray-300 hover:bg-white/5"
			}`}
		>
			{icon}
			{label}
		</button>
	);
}
