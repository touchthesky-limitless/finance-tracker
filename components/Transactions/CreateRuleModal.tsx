import React, { useState, useMemo, useRef } from "react";
import {
	X,
	Search,
	ChevronRight,
	Hash,
	Landmark,
	Calendar,
	Tag,
	Check,
} from "lucide-react";
import { useBudgetStore } from "@/hooks/useBudgetStore";
import { CategorySelector } from "@/components/CategorySelector";
import { Transaction } from "@/store/createBudgetStore";

interface CreateRuleModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSaveSuccess: (count: number, snapshot: Transaction[]) => void;
	initialName?: string;
	initialCategory?: string;
}

export function CreateRuleModal({
	isOpen,
	onClose,
	initialName,
	initialCategory,
	onSaveSuccess,
}: CreateRuleModalProps) {
	const [step, setStep] = useState(1);
	const useStore = useBudgetStore();
	const transactions = useStore((state) => state.transactions);
	const undoBulkUpdate = useStore((state) => state.transactions);
	const updateTransaction = useStore((state) => state.updateTransaction);

	// Criteria State (Step 1)
	const [matchName, setMatchName] = useState(initialName || "");
	const [matchAmount, setMatchAmount] = useState<number | null>(null);

	// Action State (Step 2)
	const [targetCategory, setTargetCategory] = useState("");
	const [newName, setNewName] = useState("");

	const [useAmount, setUseAmount] = useState(false);
	const [amountLogic, setAmountLogic] = useState("Equal to");
	const [amountValue, setAmountValue] = useState<number>(0);

	const [useAccount, setUseAccount] = useState(false);
	const [selectedAccount, setSelectedAccount] = useState("");

	// Criteria States
	const [useName, setUseName] = useState(true);
	const [nameLogic, setNameLogic] = useState("Contains");

	// NEW: Category Filter States
	// const [useCategory, setUseCategory] = useState(true);
	const [useCategory, setUseCategory] = useState(false);
	const [matchCategory, setMatchCategory] = useState(initialCategory || "");
	// const [matchCategory, setMatchCategory] = useState(false);

	// Live filtering for the right pane
	// 	const matchedTransactions = useMemo(() => {
	// 		return transactions
	// 			.filter((t) => {
	// 				const nameMatch =
	// 					!useName ||
	// 					t.description.toLowerCase().includes(matchName.toLowerCase());
	// 				// const categoryMatch = !useCategory || t.category === matchCategory;
	// 				const categoryMatch = !useCategory || t.category === matchCategory;

	// 				return nameMatch && categoryMatch;
	// 			})
	// 			.slice(0, 15);
	// 	}, [transactions, useName, matchName, useCategory, matchCategory]);

	const matchedTransactions = useMemo(() => {
		return transactions
			.filter((t) => {
				// Name Matching
				const nameMatch =
					!useName ||
					(nameLogic === "Contains"
						? t.description.toLowerCase().includes(matchName.toLowerCase())
						: nameLogic === "Exactly matches"
							? t.description.toLowerCase() === matchName.toLowerCase()
							: t.description
									.toLowerCase()
									.startsWith(matchName.toLowerCase()));

				// Category Matching
				const categoryMatch = !useCategory || t.category === matchCategory;

				// Amount Matching (Wiring up the unused state)
				const amountNum = Math.abs(t.amount);
				const amountMatch =
					!useAmount ||
					(amountLogic === "Equal to"
						? amountNum === amountValue
						: amountLogic === "Greater than"
							? amountNum > amountValue
							: amountNum < amountValue);

				// Account Matching (Wiring up the unused state)
				const accountMatch = !useAccount || t.account === selectedAccount;

				return nameMatch && categoryMatch && amountMatch && accountMatch;
			})
			.slice(0, 15);
	}, [
		transactions,
		useName,
		matchName,
		nameLogic,
		useCategory,
		matchCategory,
		useAmount,
		amountLogic,
		amountValue,
		useAccount,
		selectedAccount,
	]);

	const handleSaveRule = () => {
		// 1. Take a snapshot of the current transactions for UNDO
		const snapshot = [...transactions];

		// 2. Perform updates
		matchedTransactions.forEach((t) => {
			const updates: Partial<Transaction> = {};
			if (targetCategory) updates.category = targetCategory;
			if (newName) updates.description = newName;
			updateTransaction(t.id, updates);
		});

		// 3. Trigger success chain
		onSaveSuccess(matchedTransactions.length, snapshot);
		onClose();
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
			<div className="bg-white dark:bg-[#0f0f0f] w-full max-w-4xl h-[80vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl border border-slate-200 dark:border-white/10">
				{/* Header */}
				<div className="p-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-white dark:bg-[#0f0f0f]">
					<h2 className="text-xl font-bold text-slate-900 dark:text-white">
						{step === 1 ? "Create a Rule" : "Apply Updates"}
					</h2>
					<button
						onClick={onClose}
						className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors"
					>
						<X size={20} className="text-slate-500" />
					</button>
				</div>

				{step === 1 ? (
					/* STEP 1: FILTERS & PREVIEW */
					<div className="flex flex-1 overflow-hidden">
						{/* Left Side: Filter Controls */}
						<div className="w-1/3 border-r border-slate-100 dark:border-white/5 p-6 space-y-4 bg-slate-50/50 dark:bg-black/20 overflow-y-auto">
							{/* MATCH ON NAME */}
							<div
								className={`p-4 rounded-2xl border transition-all ${useName ? "bg-white dark:bg-black border-orange-500/50 shadow-sm" : "border-transparent opacity-60"}`}
							>
								<label className="flex items-center justify-between mb-3 cursor-pointer">
									<div className="flex items-center gap-2">
										<Search
											size={16}
											className={useName ? "text-orange-500" : "text-gray-400"}
										/>
										<span className="text-sm font-bold dark:text-white">
											Match on Name
										</span>
									</div>
									<input
										type="checkbox"
										checked={useName}
										onChange={(e) => setUseName(e.target.checked)}
										className="accent-orange-500 w-4 h-4"
									/>
								</label>
								{useName && (
									<div className="space-y-3 animate-in slide-in-from-top-2 duration-200">
										<select
											className="w-full bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-white/10 rounded-lg p-2 text-xs"
											value={nameLogic}
											onChange={(e) => setNameLogic(e.target.value)}
										>
											<option>Contains</option>
											<option>Exactly matches</option>
											<option>Starts with</option>
										</select>
										<input
											className="w-full bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-white/10 rounded-lg p-2 text-xs"
											value={matchName}
											onChange={(e) => setMatchName(e.target.value)}
										/>
									</div>
								)}
							</div>

							{/* MATCH ON Category */}
							<div
								className={`p-4 rounded-2xl border transition-all ${useCategory ? "bg-white dark:bg-black border-orange-500/50 shadow-sm" : "border-transparent opacity-60"}`}
							>
								<label className="flex items-center justify-between mb-3 cursor-pointer">
									<div className="flex items-center gap-2 text-slate-700 dark:text-white">
										<Tag
											size={16}
											className={
												useCategory ? "text-orange-500" : "text-gray-400"
											}
										/>
										<span className="text-sm font-bold">Match Category</span>
									</div>
									<input
										type="checkbox"
										checked={useCategory}
										onChange={(e) => setUseCategory(e.target.checked)}
										className="accent-orange-500 w-4 h-4"
									/>
								</label>
								{useCategory && (
									<div className="p-2 bg-slate-50 dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-600 dark:text-slate-300">
										Current: {matchCategory}
									</div>
								)}
							</div>

							{/* MATCH ON AMOUNT */}
							<div
								className={`p-4 rounded-2xl border transition-all ${useAmount ? "bg-white dark:bg-black border-orange-500/50 shadow-sm" : "border-transparent opacity-60"}`}
							>
								<label className="flex items-center justify-between mb-3 cursor-pointer">
									<div className="flex items-center gap-2">
										<Landmark
											size={16}
											className={
												useAmount ? "text-orange-500" : "text-gray-400"
											}
										/>
										<span className="text-sm font-bold dark:text-white">
											Match on Amount
										</span>
									</div>
									<input
										type="checkbox"
										checked={useAmount}
										onChange={(e) => setUseAmount(e.target.checked)}
										className="accent-orange-500 w-4 h-4"
									/>
								</label>
								{useAmount && (
									<div className="space-y-3 animate-in slide-in-from-top-2">
										<select className="w-full bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-white/10 rounded-lg p-2 text-xs">
											<option>Equal to</option>
											<option>Greater than</option>
											<option>Less than</option>
										</select>
										<div className="relative">
											<span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">
												$
											</span>
											<input
												type="number"
												className="w-full bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-white/10 rounded-lg p-2 pl-5 text-xs"
												placeholder="0.00"
											/>
										</div>
									</div>
								)}
							</div>

							{/* MATCH ON ACCOUNT */}
							<div
								className={`p-4 rounded-2xl border transition-all ${useAccount ? "bg-white dark:bg-black border-orange-500/50 shadow-sm" : "border-transparent opacity-60"}`}
							>
								<label className="flex items-center justify-between mb-3 cursor-pointer">
									<div className="flex items-center gap-2">
										<Landmark
											size={16}
											className={
												useAccount ? "text-orange-500" : "text-gray-400"
											}
										/>
										<span className="text-sm font-bold dark:text-white">
											Filter by Account
										</span>
									</div>
									<input
										type="checkbox"
										checked={useAccount}
										onChange={(e) => setUseAccount(e.target.checked)}
										className="accent-orange-500 w-4 h-4"
									/>
								</label>
								{useAccount && (
									<select className="w-full bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-white/10 rounded-lg p-2 text-xs">
										<option>Select account...</option>
										<option>Chase Checking</option>
										<option>Amex Gold</option>
									</select>
								)}
							</div>
						</div>

						{/* Right Side: Live Results */}
						<div className="flex-1 p-6 overflow-y-auto">
							<div className="flex justify-between items-center mb-4">
								<span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
									Transactions
								</span>
								<span className="text-xs font-bold text-red-500">
									{matchedTransactions.length} MATCHED
								</span>
							</div>
							<div className="space-y-2">
								{matchedTransactions.map((t) => (
									<div
										key={t.id}
										className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5"
									>
										<div className="flex flex-col">
											<span className="text-xs text-slate-400">{t.date}</span>
											<span className="text-sm font-medium dark:text-white">
												{t.description}
											</span>
										</div>
										<div className="flex items-center gap-2 text-slate-500">
											<span className="text-xs">{t.category}</span>
											<ChevronRight size={14} />
										</div>
									</div>
								))}
							</div>
						</div>
					</div>
				) : (
					/* STEP 2: ACTIONS (Screenshot 2 UI) */
					<div className="flex-1 p-8 bg-slate-50 dark:bg-[#090909] overflow-y-auto">
						<div className="max-w-xl mx-auto space-y-4">
							<div className="bg-black text-white text-[10px] font-bold py-1.5 px-4 rounded-full w-fit mx-auto mb-8">
								These will apply to {matchedTransactions.length} transactions
							</div>

							{/* Change Category Action */}
							<div className="bg-white dark:bg-[#141414] p-6 rounded-2xl border-2 border-orange-500/20 shadow-sm space-y-4">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-3">
										<div className="p-2 bg-slate-100 dark:bg-white/5 rounded-lg text-slate-500">
											<Search size={18} />
										</div>
										<span className="font-bold dark:text-white">
											Change Category
										</span>
									</div>
									<input
										type="checkbox"
										checked
										className="accent-orange-500 w-5 h-5"
										readOnly
									/>
								</div>
								<CategorySelector
									currentCategory={targetCategory || "No category selected"}
									onSelect={(sub) => setTargetCategory(sub)}
								/>
							</div>

							{/* Rename Action */}
							<div className="bg-white dark:bg-[#141414] p-6 rounded-2xl border border-slate-200 dark:border-white/5 space-y-4">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-3">
										<div className="p-2 bg-slate-100 dark:bg-white/5 rounded-lg text-slate-500">
											<Hash size={18} />
										</div>
										<span className="font-bold dark:text-white">
											Rename Transactions
										</span>
									</div>
									<input
										type="checkbox"
										checked
										className="accent-orange-500 w-5 h-5"
										readOnly
									/>
								</div>
								<input
									className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/10 rounded-xl p-4 text-sm"
									placeholder="Enter new transaction name"
									value={newName}
									onChange={(e) => setNewName(e.target.value)}
								/>
							</div>
						</div>
					</div>
				)}

				{/* Footer Actions */}
				<div className="p-6 border-t border-slate-100 dark:border-white/5 flex justify-end gap-3 bg-white dark:bg-[#0f0f0f] mt-auto">
					{/* DYNAMIC FOOTER BUTTONS */}
					<button
						type="button"
						onClick={() => {
							if (step === 1) {
								onClose(); // In Step 1, this cancels the flow
							} else {
								setStep(1); // In Step 2, this goes back to filters
							}
						}}
						className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
					>
						{step === 1 ? "Cancel" : "Back"}
					</button>

					{/* DYNAMIC RIGHT BUTTON */}
					<button
						type="button"
						onClick={() => {
							if (step === 1) {
								setStep(2);
							} else {
								handleSaveRule();
							}
						}}
						className="bg-black dark:bg-white text-white dark:text-black px-8 py-2.5 rounded-full text-sm font-bold hover:opacity-90 transition-opacity shadow-lg"
					>
						{step === 1 ? "Continue" : "Save Rule"}
					</button>
				</div>
			</div>
		</div>
	);
}
