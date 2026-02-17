"use client";

import { useEffect, useRef } from "react";
import {
	X,
	ChevronDown,
	ShoppingBag,
	FileText,
	Ban,
	Split,
	Zap,
	Plus,
} from "lucide-react";
import { formatMoney, formatDateLong } from "@/utils/formatters";
import { DEFAULT_TAGS } from "@/data/categories";
import { Transaction } from "@/store/createBudgetStore";
import { ActionItemProps } from "@/types/budget";
import { useOutsideClick } from "@/hooks/useOutsideClick";

interface TransactionDetailsModalProps {
	transaction: Transaction;
	isOpen: boolean;
	onClose: () => void;
	onUpdateCategory: (id: string, cat: string) => void;
}

export default function TransactionDetailsModal({
	transaction,
	isOpen,
	onClose,
	onUpdateCategory,
}: TransactionDetailsModalProps) {
	const modalRef = useRef<HTMLDivElement>(null);
	const topRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		if (isOpen) {
			// Only lock if not already locked by another modal
			if (document.body.style.overflow !== "hidden") {
				document.body.style.overflow = "hidden";
			}
		} else {
			// Only unlock if this is the last modal closing
			// You might need a global 'modalCount' if you open many at once
			document.body.style.overflow = "unset";
		}
	}, [isOpen]);

	useEffect(() => {
		if (isOpen) {
			// Delay focus slightly to let the browser finish the layout pass
			const timer = setTimeout(() => {
				topRef.current?.focus({ preventScroll: true });
			}, 50);
			return () => clearTimeout(timer);
		}
	}, [isOpen]);

	// 7. INTERACTION LOGIC (Click Outside & Escape Key)
	// useOutsideClick(modalRef, onClose, isOpen, "data-transaction-details-modal");

	if (!isOpen || !transaction) return null;

	return (
		<div
			data-transaction-details-modal
			ref={modalRef}
			tabIndex={-1}
			// className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]"
			className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]"
			onClick={onClose}
		>
			<div
				className="bg-white dark:bg-[#1a1a1a] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-gray-200 dark:border-gray-800"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Header */}
				<div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-gray-800">
					<button className="flex items-center gap-1 text-sm font-semibold text-gray-700 dark:text-gray-200 px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
						{formatDateLong(transaction.date)} <ChevronDown size={14} />
					</button>

					<div className="flex items-center gap-3">
						<button className="text-xs font-bold border border-gray-200 dark:border-gray-700 rounded-full px-4 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
							View history (1)
						</button>
						<button
							ref={topRef}
							onClick={onClose}
							className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-400"
						>
							<X size={20} />
						</button>
					</div>
				</div>

				<div className="flex flex-col md:flex-row">
					{/* Left: Info & Note */}
					<div className="flex-1 p-8 border-r border-gray-100 dark:border-gray-800">
						<h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
							{transaction.description}
						</h2>
						<div className="text-4xl font-extrabold text-gray-900 dark:text-white mb-6">
							{formatMoney(Math.abs(transaction.amount))}
						</div>

						{/* Category Selector */}
						<div className="mb-6">
							<div className="relative inline-block w-full">
								<div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
									<ShoppingBag size={16} />
								</div>
								<select
									value={transaction.category || "Uncategorized"}
									onChange={(e) =>
										onUpdateCategory(transaction.id, e.target.value)
									}
									className="w-full appearance-none bg-transparent border-b border-dashed border-gray-300 dark:border-gray-700 py-2 pl-10 pr-8 text-sm font-semibold text-gray-700 dark:text-gray-200 cursor-pointer hover:border-gray-400 focus:outline-none"
								>
									{DEFAULT_TAGS.map((opt) => (
										<option key={opt} value={opt}>
											{opt}
										</option>
									))}
								</select>
								<ChevronDown
									size={14}
									className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
								/>
							</div>
						</div>

						{/* Note Input */}
						<textarea
							placeholder="Add a note..."
							className="w-full h-24 bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 text-sm text-gray-600 dark:text-gray-300 resize-none focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder-gray-400"
						/>
					</div>

					{/* Right: Actions */}
					<div className="w-full md:w-64 p-6 bg-gray-50/50 dark:bg-gray-900/20">
						<h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
							Actions
						</h3>

						<div className="space-y-1">
							<ActionItem
								icon={FileText}
								color="text-yellow-600"
								label="Tax Deductible"
								hasToggle
							/>
							<ActionItem
								icon={Ban}
								color="text-gray-400 group-hover:text-red-500"
								label="Ignore?"
								subLabel="Don't ignore"
								hasChevron
							/>
							<ActionItem
								icon={Split}
								color="text-blue-500 rotate-90"
								label="Split"
								hasChevron
							/>
							<ActionItem
								icon={Zap}
								color="text-orange-500"
								label="Add Rule"
								hasPlus
							/>
						</div>
					</div>
				</div>

				{/* Footer Metadata */}
				<div className="bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 p-4 text-center">
					<p className="text-[10px] font-mono font-medium text-gray-400 uppercase tracking-wider">
						Account: {transaction.account?.toUpperCase() || "Account"} |{" "}
						{transaction.description.toUpperCase()}
					</p>
				</div>
			</div>
		</div>
	);
}

// Helper for action list items
function ActionItem({
	icon: Icon,
	color,
	label,
	subLabel,
	hasToggle,
	hasChevron,
	hasPlus,
}: ActionItemProps) {
	return (
		<div className="flex items-center justify-between p-3 hover:bg-white dark:hover:bg-gray-800 rounded-xl cursor-pointer transition-colors group">
			<div className="flex items-center gap-3">
				<Icon size={16} className={color} />
				<div className="flex flex-col">
					<span
						className={`text-sm font-medium text-gray-700 dark:text-gray-300 ${subLabel ? "group-hover:text-red-500 transition-colors" : ""}`}
					>
						{label}
					</span>
					{subLabel && (
						<span className="text-[10px] text-gray-400">{subLabel}</span>
					)}
				</div>
			</div>
			{hasToggle && (
				<div className="w-8 h-4 bg-gray-300 dark:bg-gray-700 rounded-full relative">
					<div className="w-4 h-4 bg-white rounded-full shadow-sm absolute left-0 top-0 border border-gray-200 transform scale-110" />
				</div>
			)}
			{hasChevron && <ChevronDown size={14} className="text-gray-400" />}
			{hasPlus && (
				<div className="w-5 h-5 rounded-full border border-gray-300 flex items-center justify-center">
					<Plus size={10} className="text-gray-500" />
				</div>
			)}
		</div>
	);
}
