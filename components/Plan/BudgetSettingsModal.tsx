"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useState } from "react";
import { SettingsRadioOption } from "@/components/Plan/SettingsRadioOption";
import { SettingsActionRow } from "@/components/Plan/SettingsActionRow";

export function BudgetSettingsModal({
	open,
	onClose,
}: {
	open: boolean;
	onClose: () => void;
}) {
	const [system, setSystem] = useState<"flex" | "category">("flex");
	const [applyTo, setApplyTo] = useState<"month" | "future">("future");
	const [isSaving, setIsSaving] = useState(false);

	const handleSave = async () => {
		setIsSaving(true);
		await new Promise((resolve) => setTimeout(resolve, 800));
		setIsSaving(false);
		onClose();
	};

	return (
		<Dialog.Root open={open} onOpenChange={(open) => !open && onClose()}>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 z-[140] bg-black/45 backdrop-blur-sm" />
				<Dialog.Content className="fixed left-1/2 top-1/2 z-[150] w-[min(640px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white shadow-2xl outline-none dark:bg-[#1B1B1B] dark:text-white max-h-[calc(100vh-32px)] p-6">
					<Dialog.Title className="sr-only">Budget Settings</Dialog.Title>
					<div className="flex items-center justify-between border-b border-gray-200 pb-4 dark:border-white/10">
						<h2 className="text-xl font-bold">Budget Settings</h2>
						<button
							onClick={onClose}
							className="rounded-full p-1 hover:bg-gray-100 dark:hover:bg-white/5"
						>
							<X size={24} />
						</button>
					</div>

					<div className="mt-6 space-y-6">
						{/* System */}
						<div>
							<h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
								System
							</h3>
							<div className="mt-2 space-y-2">
								<SettingsRadioOption
									selected={system === "flex"}
									onSelect={() => setSystem("flex")}
									title="Flex Budget"
									description="Simplify your budget by focusing on your flexible expense number."
									recommended
								/>
								<SettingsRadioOption
									selected={system === "category"}
									onSelect={() => setSystem("category")}
									title="Category Budget"
									description="Budget every category individually, the traditional way."
								/>
							</div>
						</div>

						{/* Apply changes */}
						<div>
							<h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
								By default, apply budget changes to
							</h3>
							<div className="mt-2 space-y-2">
								<SettingsRadioOption
									selected={applyTo === "month"}
									onSelect={() => setApplyTo("month")}
									title="This month only"
									description="Your budget changes will only apply to the month you're editing. You can override this each time you change a budget to apply to all future months."
								/>
								<SettingsRadioOption
									selected={applyTo === "future"}
									onSelect={() => setApplyTo("future")}
									title="All future months"
									description="Your budget changes will apply to the month you're editing and all future months by default. You can uncheck this setting each time you modify a budget."
								/>
							</div>
						</div>

						{/* More options */}
						<div>
							<h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
								More options
							</h3>
							<div className="mt-2 space-y-2">
								<SettingsActionRow
									title="Recalculate default budgets"
									description="Use your historical averages to automatically generate a new default budget. This will override all existing budget amounts."
									buttonText="Recalculate"
								/>
								<SettingsActionRow
									title="Clear all budget values"
									description="Clear all budget values going back to the starting month and start over from scratch."
									buttonText="Clear all"
									destructive
								/>
								<SettingsActionRow
									title="Budget walkthrough"
									description="Modify your budget step by step with explanations for how budgeting works in Monarch."
									buttonText="Start setup"
								/>
							</div>
						</div>
					</div>

					<div className="mt-6 flex justify-end gap-3 border-t border-gray-200 pt-4 dark:border-white/10">
						<button
							onClick={onClose}
							className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5"
						>
							Cancel
						</button>
						<button
							onClick={handleSave}
							disabled={isSaving}
							className="rounded-lg bg-[#FF8A65] px-4 py-2 text-sm font-bold text-white hover:bg-[#ff7552] disabled:opacity-50"
						>
							{isSaving ? "Saving…" : "Save"}
						</button>
					</div>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
