import { Loader2 } from "lucide-react";
import { parseAmountInput } from "@/utils/formatters";

interface Props {
	isOpen: boolean;
	amount: string;
	isPending: boolean;
	onAmountChange: (val: string) => void;
	onCancel: () => void;
	onConfirm: () => void;
}

export function TransactionDrawerSplitDialog({
	isOpen,
	amount,
	isPending,
	onAmountChange,
	onCancel,
	onConfirm,
}: Props) {
	if (!isOpen) return null;

	return (
		<div className="absolute inset-0 z-50 grid place-items-center bg-white/75 p-5 backdrop-blur-sm dark:bg-black/65">
			<div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-[#242424]">
				<h3 className="text-lg font-semibold">Split transaction</h3>
				<p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
					Enter the amount to keep on this transaction. The remainder becomes a
					second transaction.
				</p>
				<div className="relative mt-4">
					<span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
						$
					</span>
					<input
						type="text"
						inputMode="decimal"
						value={amount}
						onChange={(e) => {
							const { displayString } = parseAmountInput(e.target.value);
							onAmountChange(displayString);
						}}
						className="h-12 w-full rounded-xl border border-gray-200 bg-white pl-8 pr-4 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 dark:border-white/10 dark:bg-white/5"
					/>
				</div>
				<div className="mt-5 flex justify-end gap-3">
					<button
						onClick={onCancel}
						className="h-10 rounded-xl border border-gray-200 px-4 text-sm font-semibold hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5"
					>
						Cancel
					</button>
					<button
						disabled={isPending}
						onClick={onConfirm}
						className="inline-flex h-10 items-center gap-2 rounded-xl bg-orange-600 px-4 text-sm font-semibold text-white hover:bg-orange-500 disabled:opacity-60"
					>
						{isPending && <Loader2 size={15} className="animate-spin" />}
						Split
					</button>
				</div>
			</div>
		</div>
	);
}
