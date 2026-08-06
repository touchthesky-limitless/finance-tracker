/**
 * Modal for editing a category group.
 * Allows changing name, budget mode (by group / by category), and if group mode,
 * the budget type (fixed/flexible/non‑monthly) and monthly rollover toggle.
 */

import { useState, useEffect, type ChangeEvent } from "react";
import { AlertCircle, Loader2, X } from "lucide-react";
import type {
	CategoryGroupRecord,
	CategoryGroupUpdate,
} from "@/lib/categories/categoryGroups";
import type {
	GroupBudgetMode,
	GroupBudgetType,
} from "@/lib/categories/categoryPreferences";
import { BudgetModeSelect } from "./BudgetModeSelect";
import { BudgetTypeOption } from "./BudgetTypeOption";

interface EditGroupModalProps {
	group: CategoryGroupRecord;
	childDialogOpen: boolean;
	onClose: () => void;
	onSave: (updates: CategoryGroupUpdate) => Promise<void>;
	onDelete: () => void;
}

export function EditGroupModal({
	group,
	childDialogOpen,
	onClose,
	onSave,
	onDelete,
}: EditGroupModalProps) {
	const initialBudgetMode = group.budget_mode;
	const initialBudgetType = group.budget_type ?? "flexible";
	const initialMonthlyRollover = group.monthly_rollover;

	const [name, setName] = useState(group.name);
	const [budgetMode, setBudgetMode] =
		useState<GroupBudgetMode>(initialBudgetMode);
	const [budgetType, setBudgetType] =
		useState<GroupBudgetType>(initialBudgetType);
	const [monthlyRollover, setMonthlyRollover] = useState(
		initialMonthlyRollover,
	);
	const [isSaving, setIsSaving] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape" && !isSaving && !childDialogOpen) {
				onClose();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [childDialogOpen, isSaving, onClose]);

	const hasChanges =
		name.trim() !== group.name.trim() ||
		budgetMode !== initialBudgetMode ||
		(budgetMode === "group" &&
			(budgetType !== initialBudgetType ||
				monthlyRollover !== initialMonthlyRollover));

	const canSave = Boolean(name.trim()) && hasChanges && !isSaving;

	const save = async () => {
		if (!canSave) return;
		setIsSaving(true);
		setErrorMessage(null);
		try {
			await onSave({
				name: name.trim(),
				budget_mode: budgetMode,
				budget_type: budgetMode === "group" ? budgetType : null,
				monthly_rollover: budgetMode === "group" ? monthlyRollover : false,
				hidden: false,
			});
		} catch (error) {
			setErrorMessage(
				error instanceof Error ? error.message : "Failed to save group.",
			);
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<div className="fixed inset-0 z-[1000] grid place-items-center overflow-y-auto bg-black/55 p-3 backdrop-blur-sm sm:p-5">
			<button
				type="button"
				aria-label="Close edit group dialog"
				className="absolute inset-0"
				onClick={() => {
					if (!isSaving) onClose();
				}}
			/>
			<section
				role="dialog"
				aria-modal="true"
				aria-hidden={childDialogOpen || undefined}
				aria-labelledby="edit-group-title"
				className="relative my-auto flex max-h-[calc(100dvh-24px)] w-full max-w-[790px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_30px_100px_rgba(0,0,0,0.42)] dark:border-white/10 dark:bg-[#232322]"
			>
				<header className="flex shrink-0 items-center justify-between border-b border-gray-200 px-6 py-5 dark:border-white/5">
					<h2 id="edit-group-title" className="text-2xl font-bold">
						Edit Group
					</h2>
					<button
						type="button"
						onClick={onClose}
						disabled={isSaving}
						aria-label="Close"
						className="grid size-10 place-items-center rounded-full transition-colors hover:bg-gray-100 disabled:opacity-50 dark:hover:bg-white/7"
					>
						<X size={27} />
					</button>
				</header>

				<div className="min-h-0 flex-1 space-y-7 overflow-y-auto px-6 py-7">
					<label className="block">
						<span className="mb-3 block text-lg font-bold">Name</span>
						<input
							autoFocus
							value={name}
							onChange={(e: ChangeEvent<HTMLInputElement>) =>
								setName(e.target.value)
							}
							className="h-14 w-full rounded-xl border border-gray-300 bg-transparent px-4 text-lg font-semibold outline-none transition-colors focus:border-cyan-500 dark:border-white/15"
						/>
					</label>

					<div>
						<span className="mb-3 block text-lg font-bold">Budget</span>
						<BudgetModeSelect value={budgetMode} onChange={setBudgetMode} />
						<p className="mt-3 text-base text-gray-500 dark:text-gray-400">
							{budgetMode === "group"
								? "Budget with a single number for all categories within this group."
								: "Budget by individual categories within this group."}
						</p>
					</div>

					{budgetMode === "group" && (
						<>
							<div>
								<span className="mb-3 block text-lg font-bold">Type</span>
								<div className="overflow-hidden rounded-2xl border border-gray-300 dark:border-white/15">
									<BudgetTypeOption
										value="fixed"
										selected={budgetType === "fixed"}
										title="Fixed"
										description="Spending is usually the same every month, and cannot be easily reduced. Great for utilities, mortgage, bills, etc."
										onSelect={setBudgetType}
									/>
									<BudgetTypeOption
										value="flexible"
										selected={budgetType === "flexible"}
										title="Flexible"
										description="Spending changes monthly, and can be reduced when you want to save more money. Great for restaurants, entertainment, etc."
										onSelect={setBudgetType}
									/>
									<BudgetTypeOption
										value="non-monthly"
										selected={budgetType === "non-monthly"}
										title="Non-Monthly"
										description="Spending typically happens yearly, or less frequently than monthly. Great for annual bills, quarterly payments, etc."
										onSelect={setBudgetType}
									/>
								</div>
							</div>

							<div className="flex items-center gap-5 rounded-2xl border border-gray-300 p-5 dark:border-white/15">
								<div className="min-w-0 flex-1">
									<h3 className="text-base font-bold">
										Make this category group a monthly rollover
									</h3>
									<p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
										Every month the remaining balance will roll over to the next
										month.{" "}
										<span className="font-semibold text-cyan-500">
											Learn more
										</span>
									</p>
								</div>
								<button
									type="button"
									role="switch"
									aria-checked={monthlyRollover}
									onClick={() => setMonthlyRollover((current) => !current)}
									className={`inline-flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition-colors ${
										monthlyRollover
											? "bg-[#FF6633]"
											: "bg-gray-400 dark:bg-zinc-600"
									}`}
								>
									<span
										className={`size-5 rounded-full bg-white shadow-sm transition-transform ${
											monthlyRollover ? "translate-x-5" : "translate-x-0"
										}`}
									/>
								</button>
							</div>
						</>
					)}

					{errorMessage && (
						<div className="flex items-start gap-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
							<AlertCircle size={18} className="mt-0.5 shrink-0" />
							<span>{errorMessage}</span>
						</div>
					)}
				</div>

				<footer className="flex shrink-0 items-center justify-between gap-4 border-t border-gray-200 px-6 py-5 dark:border-white/5">
					<button
						type="button"
						onClick={onDelete}
						disabled={isSaving}
						className="h-12 rounded-xl border border-gray-300 px-4 font-bold text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50 dark:border-white/15"
					>
						Delete
					</button>
					<div className="flex items-center gap-3">
						<button
							type="button"
							onClick={onClose}
							disabled={isSaving}
							className="h-12 rounded-xl border border-gray-300 px-5 font-bold transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-white/15 dark:hover:bg-white/7"
						>
							Cancel
						</button>
						<button
							type="button"
							onClick={() => void save()}
							disabled={!canSave}
							className="inline-flex h-12 min-w-24 items-center justify-center gap-2 rounded-xl bg-[#FF6633] px-5 font-bold text-white transition-colors hover:bg-[#E95424] disabled:cursor-not-allowed disabled:opacity-45"
						>
							{isSaving && <Loader2 size={18} className="animate-spin" />}
							Save
						</button>
					</div>
				</footer>
			</section>
		</div>
	);
}
