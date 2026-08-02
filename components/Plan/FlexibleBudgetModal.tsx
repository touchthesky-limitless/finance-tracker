"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";

export function FlexibleBudgetModal({
	open,
	onClose,
	rolloverEnabled,
	startMonth,
	startingBalance,
	onSave,
}: {
	open: boolean;
	onClose: () => void;
	rolloverEnabled: boolean;
	startMonth: string | null;
	startingBalance: number | null;
	onSave: (data: {
		rolloverEnabled: boolean;
		startMonth: string | null;
		startingBalance: number | null;
	}) => Promise<void>;
}) {
	const [rollover, setRollover] = useState(rolloverEnabled);
	const [month, setMonth] = useState(startMonth || getDefaultStartMonth());
	const [balance, setBalance] = useState(startingBalance?.toString() || "");

	const [isSaving, setIsSaving] = useState(false);

	// Helper to generate month options
	function getDefaultStartMonth() {
		const now = new Date();
		return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
	}

	return (
		<Dialog.Root open={open} onOpenChange={(open) => !open && onClose()}>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 z-[140] bg-black/45 backdrop-blur-sm" />
				<Dialog.Content className="fixed left-1/2 top-1/2 z-[150] w-[min(540px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white shadow-2xl outline-none dark:bg-[#1B1B1B] dark:text-white max-h-[calc(100vh-32px)] p-6">
					{/* Header */}
					<div className="flex items-center justify-between border-b border-gray-200 pb-4 dark:border-white/10">
						<h2 className="text-xl font-bold">Flexible budget</h2>
						<button
							onClick={onClose}
							className="rounded-full p-1 hover:bg-gray-100 dark:hover:bg-white/5"
						>
							<X size={24} />
						</button>
					</div>

					{/* Content Body */}
					<div className="mt-6 space-y-6">
						<div className="rounded-xl border border-gray-200 p-4 dark:border-white/10">
							<div className="flex items-start justify-between gap-4">
								<div className="flex-1">
									<p className="font-semibold">
										Make your Flexible budget a rollover
									</p>
									<p className="mt-1 text-sm leading-6 text-gray-500 dark:text-gray-400">
										Every month, the remaining balance on your Flexible budget
										will roll over to the next month.{" "}
										<span className="font-semibold text-cyan-500">
											Learn more.
										</span>
									</p>
								</div>
								<button
									type="button"
									role="switch"
									aria-checked={rollover}
									onClick={() => setRollover(!rollover)}
									className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#FF5A35] focus:ring-offset-2 ${
										rollover ? "bg-[#FF5A35]" : "bg-gray-300 dark:bg-gray-600"
									}`}
								>
									<span
										className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
											rollover ? "translate-x-5" : "translate-x-0.5"
										}`}
									/>
								</button>
							</div>

							{rollover && (
								<div className="mt-5 space-y-4 border-t border-gray-200 pt-5 dark:border-white/10">
									{/* Starting Month */}
									<div>
										<label className="mb-1.5 block text-sm font-semibold">
											Starting month
										</label>
										<select
											value={month}
											onChange={(e) => setMonth(e.target.value)}
											className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-white/10 dark:bg-[#232323]"
										>
											{Array.from({ length: 12 }, (_, i) => {
												const date = new Date();
												date.setMonth(date.getMonth() + i);
												const monthValue = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
												const monthLabel = date.toLocaleDateString("en-US", {
													month: "long",
													year: "numeric",
												});
												return (
													<option key={monthValue} value={monthValue}>
														{monthLabel}
													</option>
												);
											})}
										</select>
										<p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
											Your rollover balance will start carrying over from this
											month onward. Any excess budget amounts from previous
											months will not roll over.
										</p>
									</div>

									{/* Starting Balance */}
									<div>
										<label className="mb-1.5 block text-sm font-semibold">
											Starting balance
										</label>
										<div className="relative">
											<span className="absolute inset-y-0 left-3 flex items-center text-gray-500">
												$
											</span>
											<input
												type="text"
												value={balance}
												onChange={(e) => setBalance(e.target.value)}
												inputMode="decimal"
												placeholder="0.00"
												className="w-full rounded-lg border border-gray-200 bg-white px-8 py-2 text-sm outline-none focus:border-blue-500 dark:border-white/10 dark:bg-[#232323]"
											/>
										</div>
										<p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
											Your rollover balance will start with the amount you enter
											above and accrue going forward from the starting month.
										</p>
									</div>
								</div>
							)}
						</div>
					</div>

					{/* Footer */}
					<div className="mt-6 flex justify-end gap-3 border-t border-gray-200 pt-4 dark:border-white/10">
						<button
							onClick={onClose}
							className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5"
						>
							Cancel
						</button>
						<button
							disabled={isSaving}
							onClick={async () => {
								setIsSaving(true);
								await onSave({
									rolloverEnabled: rollover,
									startMonth: rollover ? month : null,
									startingBalance: rollover
										? parseFloat(balance.replace(/[^0-9.]/g, "")) || 0
										: null,
								});
								setIsSaving(false);
								onClose();
							}}
							className="rounded-lg bg-[#FF5A35] px-4 py-2 text-sm font-bold text-white hover:bg-[#E04825] disabled:opacity-50"
						>
							{isSaving ? "Saving…" : "Save"}
						</button>
					</div>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
