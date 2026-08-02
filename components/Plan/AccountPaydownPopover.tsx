"use client";

import { type EditableAccount } from "@/components/Accounts/details/EditAccountForm";
import { useState, useRef, useLayoutEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { formatCurrencyInt } from "@/utils/formatters";
import { PlanInput } from "@/components/Plan/PlanInput";
import { X } from "lucide-react";

export function AccountPaydownPopover({
	open,
	onClose,
	account,
	currentPlanned,
	onSave,
	anchorRef,
}: {
	open: boolean;
	onClose: () => void;
	account: EditableAccount;
	currentPlanned: number;
	onSave: (amount: number, applyToFuture: boolean) => void;
	anchorRef: HTMLElement | null;
}) {
	const [amount, setAmount] = useState(String(currentPlanned || ""));
	const [applyToFuture, setApplyToFuture] = useState(false);
	const [position, setPosition] = useState<{
		top: number;
		left: number;
	} | null>(null);
	const positionRef = useRef<{ top: number; left: number } | null>(null);

	useLayoutEffect(() => {
		if (!open || !anchorRef) {
			if (positionRef.current !== null) {
				positionRef.current = null;
				setPosition(null);
			}
			return;
		}
		const rect = anchorRef.getBoundingClientRect();
		const newPosition = {
			top: rect.bottom + 8,
			left: rect.left + rect.width / 2 - 140,
		};
		if (
			!positionRef.current ||
			positionRef.current.top !== newPosition.top ||
			positionRef.current.left !== newPosition.left
		) {
			positionRef.current = newPosition;
			setPosition(newPosition);
		}
	}, [open, anchorRef]);

	if (!open || !position) return null;

	return (
		<Dialog.Root
			open={open}
			modal={false}
			onOpenChange={(open) => !open && onClose()}
		>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 bg-transparent" />
				<Dialog.Content
					className="fixed z-[200] w-[320px] rounded-xl border border-gray-200 bg-white p-4 shadow-xl dark:border-white/10 dark:bg-[#1B1B1B]"
					style={{ top: position.top, left: position.left }}
					onPointerDownOutside={onClose}
					onEscapeKeyDown={onClose}
					onOpenAutoFocus={(e) => e.preventDefault()}
				>
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<div className="flex size-10 items-center justify-center rounded-full bg-gray-200 text-gray-600 dark:bg-white/10 dark:text-gray-300">
								💳
							</div>
							<div>
								<h4 className="text-sm font-bold text-gray-900 dark:text-white">
									{account.name}
								</h4>
								<p className="text-xs text-gray-500">
									Balance: {formatCurrencyInt(account.current_balance || 0)}
								</p>
							</div>
						</div>
						<button
							onClick={onClose}
							className="rounded-full p-1 hover:bg-gray-100 dark:hover:bg-white/5"
						>
							<X size={16} />
						</button>
					</div>

					<div className="mt-3 space-y-2">
						<div className="flex justify-between text-xs">
							<span className="text-gray-500">APR</span>
							<span className="font-medium">
								{account.apr ? `${account.apr}%` : "—"}
							</span>
						</div>
						<div className="flex justify-between text-xs">
							<span className="text-gray-500">Min. payment</span>
							<span className="font-medium">
								{formatCurrencyInt(account.minimum_monthly_payment || 0)}
							</span>
						</div>
					</div>

					<div className="mt-4">
						<label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
							Planned monthly payment
						</label>
						<PlanInput
							value={parseFloat(amount.replace(/[^0-9.]/g, "")) || 0}
							onChange={setAmount}
						/>
					</div>

					<div className="mt-3 flex items-center gap-2">
						<input
							type="checkbox"
							id="applyToFuture"
							checked={applyToFuture}
							onChange={(e) => setApplyToFuture(e.target.checked)}
							className="size-4 accent-[#FF5A35]"
						/>
						<label
							htmlFor="applyToFuture"
							className="text-sm text-gray-700 dark:text-gray-300"
						>
							Apply to all future months
						</label>
					</div>

					<div className="mt-4 flex justify-end gap-2">
						<button
							onClick={onClose}
							className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5"
						>
							Cancel
						</button>
						<button
							onClick={() => {
								const numeric = parseFloat(amount.replace(/[^0-9.]/g, "")) || 0;
								onSave(numeric, applyToFuture);
								onClose();
							}}
							className="rounded-lg bg-[#FF5A35] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#E04825]"
						>
							Save
						</button>
					</div>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
