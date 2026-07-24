"use client";

import {
	useState,
} from "react";
import {
	X,
} from "lucide-react";

import type {
	Account,
} from "@/store/useBudgetStore";

interface MoveTransactionsDialogProps {
	open: boolean;
	transactionCount: number;
	accounts: Account[];
	currentAccountId: string;
	onClose: () => void;
	onMove: (accountId: string) => Promise<void>;
}

export function MoveTransactionsDialog({
	open,
	transactionCount,
	accounts,
	currentAccountId,
	onClose,
	onMove,
}: MoveTransactionsDialogProps) {
	const [targetAccountId, setTargetAccountId] = useState("");
	const [isMoving, setIsMoving] = useState(false);

	if (!open) {
		return null;
	}

	const availableAccounts = accounts.filter((account) => {
		return account.id !== currentAccountId;
	});

	return (
		<div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
			<button
				type="button"
				aria-label="Close move transactions dialog"
				onClick={onClose}
				className="absolute inset-0 bg-black/55"
			/>

			<div
				role="dialog"
				aria-modal="true"
				aria-labelledby="move-transactions-title"
				className="relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl border border-gray-200 bg-white text-gray-900 shadow-2xl dark:border-white/10 dark:bg-[#222220] dark:text-white"
			>
				<div className="flex items-center justify-between px-8 py-7">
					<h2
						id="move-transactions-title"
						className="text-2xl font-semibold"
					>
						Move transactions to another account
					</h2>

					<button
						type="button"
						aria-label="Close dialog"
						onClick={onClose}
						className="rounded-full p-2 transition-colors hover:bg-gray-100 dark:hover:bg-white/5"
					>
						<X size={24} />
					</button>
				</div>

				<div className="px-8 pb-8">
					<p className="max-w-xl text-lg leading-8 text-gray-700 dark:text-gray-300">
						The {transactionCount} transaction
						{transactionCount === 1 ? "" : "s"} you selected will be moved
						to the account you choose below.
					</p>

					<label className="mt-7 block">
						<span className="mb-3 block text-lg font-semibold">
							Move {transactionCount} transaction
							{transactionCount === 1 ? "" : "s"} to
						</span>

						<select
							value={targetAccountId}
							onChange={(event) => {
								setTargetAccountId(event.target.value);
							}}
							className="h-14 w-full rounded-xl border border-gray-300 bg-white px-4 text-lg text-gray-900 outline-none focus:border-[#00A8D2] dark:border-white/15 dark:bg-[#1E1E1E] dark:text-white"
						>
							<option value="">Select an account</option>
							{availableAccounts.map((account) => {
								return (
									<option key={account.id} value={account.id}>
										{account.name}
									</option>
								);
							})}
						</select>
					</label>
				</div>

				<div className="flex justify-end gap-3 border-t border-gray-200 px-8 py-5 dark:border-white/10">
					<button
						type="button"
						onClick={onClose}
						className="h-12 rounded-xl border border-gray-200 px-5 text-base font-semibold shadow-sm transition-colors hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5"
					>
						Cancel
					</button>

					<button
						type="button"
						disabled={!targetAccountId || isMoving}
						onClick={async () => {
							setIsMoving(true);

							try {
								await onMove(targetAccountId);
								setTargetAccountId("");
								onClose();
							} finally {
								setIsMoving(false);
							}
						}}
						className="h-12 rounded-xl bg-[#FFAA91] px-5 text-base font-bold text-white transition-colors hover:bg-[#FF8A68] disabled:cursor-not-allowed disabled:opacity-55"
					>
						{isMoving ? "Moving..." : "Move transactions"}
					</button>
				</div>
			</div>
		</div>
	);
}
