"use client";

import { formatGoalDate, getGoalProgress } from "@/lib/goals/formatters";
import { fetchGoalAccountLinks } from "@/lib/goals/repository";
import {
	GoalAccountLink,
	GoalAccountView,
	SavingsGoal,
} from "@/lib/goals/types";
import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { GoalImage } from "@/components/Goals/GoalImage";
import { formatCurrencyInt } from "@/utils/formatters";
import { AccountLogo, ProgressBar } from "@/components/Goals/GoalsUI";
import { PlanInput } from "@/components/Plan/PlanInput";

export function GoalContributionPopover({
	open,
	onClose,
	goal,
	savingsAccounts,
	onSave,
	anchorRef,
}: {
	open: boolean;
	onClose: () => void;
	goal: SavingsGoal;
	savingsAccounts: GoalAccountView[];
	onSave: (amounts: Record<string, number>, applyToFuture: boolean) => void;
	anchorRef: HTMLElement | null;
}) {
	const [accountLinks, setAccountLinks] = useState<GoalAccountLink[]>([]);
	const [amounts, setAmounts] = useState<Record<string, string>>({});
	const [applyToFuture, setApplyToFuture] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [position, setPosition] = useState<{
		top: number;
		left: number;
	} | null>(null);
	const positionRef = useRef<{ top: number; left: number } | null>(null);

	// Load account links when popover opens
	useEffect(() => {
		if (!open) return;

		// eslint-disable-next-line react-hooks/set-state-in-effect
		setIsLoading(true);
		fetchGoalAccountLinks(goal.id)
			.then((links) => {
				setAccountLinks(links);
				setAmounts(
					Object.fromEntries(
						links.map((link) => [
							link.accountId,
							String(link.plannedMonthlyAmount || ""),
						]),
					),
				);
			})
			.catch(console.error)
			.finally(() => setIsLoading(false));
	}, [goal.id, open]);

	// Position the popover relative to anchor
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

	// Compute total planned monthly from inputs
	const totalPlanned = Object.values(amounts).reduce(
		(sum, val) => sum + (parseFloat(val) || 0),
		0,
	);
	const progress = getGoalProgress(goal);

	const linkedAccounts = accountLinks.map((link) => {
		const account = savingsAccounts.find((a) => a.id === link.accountId);
		return { ...link, account };
	});

	return (
		<Dialog.Root
			open={open}
			modal={false}
			onOpenChange={(open) => !open && onClose()}
		>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 bg-transparent" />
				<Dialog.Content
					className="fixed z-[200] w-[480px] rounded-xl border border-gray-200 bg-white p-4 shadow-xl dark:border-white/10 dark:bg-[#1B1B1B]"
					style={{ top: position.top, left: position.left }}
					onPointerDownOutside={onClose}
					onEscapeKeyDown={onClose}
					onOpenAutoFocus={(e) => e.preventDefault()}
				>
					{/* Header: Goal info + Progress */}
					<div className="flex items-start justify-between border-b border-gray-200 pb-3 dark:border-white/10">
						<div className="flex items-start gap-3">
							<GoalImage
								src={goal.imageUrl}
								alt={goal.name}
								className="size-12 rounded-lg object-cover"
							/>
							<div>
								<h4 className="text-base font-bold text-gray-900 dark:text-white">
									{goal.name}
								</h4>
								<div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
									<span>{formatCurrencyInt(goal.targetAmount)}</span>
									<span className="text-gray-300">|</span>
									<span>{formatGoalDate(goal)}</span>
									<span className="text-gray-300">|</span>
									<span>{formatCurrencyInt(totalPlanned)} / mo.</span>
								</div>
							</div>
						</div>
						<div className="flex items-center gap-3">
							<span className="text-sm font-medium">
								{Math.round(progress)}%
							</span>
							<ProgressBar value={progress} className="w-24" />
						</div>
					</div>

					{/* List of linked accounts */}
					<div className="mt-3 space-y-4 max-h-[300px] overflow-y-auto pr-1">
						{isLoading ? (
							<p className="text-center text-sm text-gray-500">
								Loading accounts…
							</p>
						) : linkedAccounts.length === 0 ? (
							<p className="text-center text-sm text-gray-500">
								No linked accounts.
							</p>
						) : (
							linkedAccounts.map(({ accountId, account }) => {
								if (!account) return null;
								const value = amounts[accountId] ?? "";
								const numeric = parseFloat(value) || 0;
								return (
									<div
										key={accountId}
										className="rounded-lg border border-gray-100 p-3 dark:border-white/5"
									>
										<div className="flex items-center gap-3">
											<AccountLogo account={account} size={40} />
											<div className="flex-1">
												<p className="text-sm font-medium">{account.name}</p>
												<p className="text-xs text-gray-500">
													Balance: {formatCurrencyInt(account.balance)}
												</p>
											</div>
											<div className="text-right">
												<p className="text-sm font-medium">
													{formatCurrencyInt(numeric)}
												</p>
											</div>
										</div>
										<div className="mt-2 flex items-center gap-2">
											<PlanInput
												value={numeric}
												onChange={(val) =>
													setAmounts((prev) => ({ ...prev, [accountId]: val }))
												}
											/>
											<div className="flex items-center gap-1 text-xs">
												<input
													type="checkbox"
													id={`apply-${accountId}`}
													checked={applyToFuture}
													onChange={(e) => setApplyToFuture(e.target.checked)}
													className="size-4 accent-[#FF5A35]"
												/>
												<label
													htmlFor={`apply-${accountId}`}
													className="text-gray-600 dark:text-gray-400"
												>
													Apply ${formatCurrencyInt(numeric)} to all future
													months
												</label>
											</div>
										</div>
									</div>
								);
							})
						)}
					</div>

					{/* Footer */}
					<div className="mt-4 flex justify-end gap-2 border-t border-gray-200 pt-3 dark:border-white/10">
						<button
							onClick={onClose}
							className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5"
						>
							Cancel
						</button>
						<button
							onClick={() => {
								const numericAmounts = Object.fromEntries(
									Object.entries(amounts).map(([id, val]) => [
										id,
										parseFloat(val) || 0,
									]),
								);
								onSave(numericAmounts, applyToFuture);
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
