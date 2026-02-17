"use client";

import React, { useState } from "react";
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
} from "lucide-react";

import { Transaction } from "@/store/createBudgetStore";
import { CategorySelector } from "@/components/CategorySelector";
import { CreateRuleModal } from "@/components/Transactions/CreateRuleModal";
import { useBudgetStore } from "@/hooks/useBudgetStore";

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
type TabType = "Basic Information" | "Location on Map" | "Pictures";

export default function EditTransactionModal({
	transaction,
	isOpen,
	onClose,
	onUpdate,
	onRuleSaved,
}: EditTransactionModalProps) {
	// 1. STATE INITIALIZATION
	// initialize directly from props. The 'key' in the parent handles resets.
	const [activeTab, setActiveTab] = useState<TabType>("Basic Information");
	const [editedData, setEditedData] = useState(transaction);
	const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
	const useStore = useBudgetStore();
    const transactions = useStore((state) => state.transactions);
	const addTransactions = useStore((state) => state.addTransactions);
	const updateTransaction = useStore((state) => state.updateTransaction);

	const isNew = !useStore((state) =>
		state.transactions.some((t) => t.id === transaction.id),
	);

	if (!isOpen || !transaction) return null;

	// const handleSave = () => {
	// 	onUpdate(transaction.id, editedData);
	// 	onClose();
	// };

	const handleSave = () => {
		const isExisting = transactions.some((t) => t.id === editedData.id);

		if (isExisting) {
			updateTransaction(editedData.id, editedData); // Updates existing
		} else {
			addTransactions([editedData]); // Adds as a new array entry
		}
		onClose();
	};

	return createPortal(
		<div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-[#F8F9FB] dark:bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
			{/* Backdrop Click to Close */}
			<div className="absolute inset-0" onClick={onClose} />

			{/* <div className="relative w-full max-w-4xl bg-[#F8F9FB] dark:bg-[#121212] border border-gray-800 rounded-2xl shadow-2xl flex overflow-hidden h-[600px] animate-in zoom-in-95 duration-200"> */}
			<div className="relative w-full max-w-4xl bg-[#F8F9FB] dark:bg-[#121212] border border-gray-800 rounded-2xl shadow-2xl flex overflow-hidden h-fit max-h-[90vh] animate-in zoom-in-95 duration-200">
				{/* --- LEFT SIDEBAR --- */}
				{/* <div className="w-56 bg-[#F8F9FB] dark:bg-[#0d0d0d] border-r border-gray-100 dark:border-gray-800 p-4 flex flex-col justify-between"> */}
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
							icon={<MapPin size={18} />}
							label="Location on Map"
							active={activeTab === "Location on Map"}
							onClick={() => setActiveTab("Location on Map")}
						/>
						<NavButton
							icon={<ImageIcon size={18} />}
							label="Pictures"
							active={activeTab === "Pictures"}
							onClick={() => setActiveTab("Pictures")}
						/>
					</div>

					<button className="flex items-center gap-2 px-4 py-2 text-gray-500 hover:text-white transition-colors">
						<MoreVertical size={18} />
						<span className="text-sm">More Options</span>
					</button>
				</div>

				{/* --- MAIN CONTENT --- */}
				{/* <div className="flex-1 flex flex-col bg-[#F8F9FB] dark:bg-[#121212] "> */}
				<div className="flex-1 flex flex-col bg-[#F8F9FB] dark:bg-[#121212] overflow-hidden">
					{/* 1. THIS IS THE ONLY SCROLLABLE PART */}
					<div
						// className="flex-1 flex flex-col  px-8 py-4 scrollbar-hide overscroll-none"
						// className="flex-1 overflow-y-auto px-8 py-4 scrollbar-hide"
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
							{/* <div className="space-y-2 mb-8 "> */}
							<div className="space-y-6 mb-8 ">
								<label className="text-[10px] uppercase tracking-[0.2em] text-orange-500 font-black">
									Expense Amount
								</label>
								<div className="relative group ">
									<div className="absolute left-4 top-1/2 -translate-y-1/2  text-emerald-500 text-2xl font-bold ">
										$
									</div>
									<input
										type="number"
										className="w-full bg-[#F8F9FB] dark:bg-[#0d0d0d] border border-gray-500 dark:border-gray-800 rounded-xl py-4 pl-10 pr-12 text-3xl font-bold text-emerald-400 focus:border-orange-500/50 outline-none transition-all"
										value={Math.abs(editedData.amount)}
										onChange={(e) =>
											setEditedData({
												...editedData,
												amount: -Number(e.target.value),
											})
										}
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
											className="w-full bg-[#F8F9FB] dark:bg-[#0d0d0d] border border-gray-800 rounded-xl py-3 pl-12 pr-4 text-sm text-gray-300 outline-none focus:border-orange-500/50 [color-scheme:dark]"
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

					{/* --- FOOTER --- */}
					{/* <div className="p-6 border-t border-gray-800 bg-[#F8F9FB] dark:bg-[#0d0d0d] flex justify-end gap-3"> */}
					<div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-[#F8F9FB] dark:bg-[#0d0d0d] flex justify-end gap-3">
						<button
							onClick={onClose}
							className="px-6 py-2.5 text-sm font-bold text-gray-400 hover:text-white transition-colors"
						>
							Cancel
						</button>
						<button
							onClick={handleSave}
							className="px-10 py-2.5 bg-orange-600 hover:bg-orange-500 text-white text-sm font-black rounded-xl transition-all shadow-lg shadow-orange-600/20 active:scale-95"
						>
							{isNew ? "Add" : "Save"}
						</button>
					</div>
				</div>

				{/* --- Create Rule Modal --- */}
				<CreateRuleModal
					isOpen={isRuleModalOpen}
					onClose={() => setIsRuleModalOpen(false)}
					initialName={editedData.description}
					initialCategory={editedData.category}
					onSaveSuccess={(count, snapshot) => {
						// 1. Send data up to TransactionsPage to trigger Toast
						onRuleSaved(count, snapshot);

						// 2. Close this Rule Modal
						setIsRuleModalOpen(false);

						// 3. Close the Edit Transaction Modal
						onClose();
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
