"use client";

import {
	useState,
	useMemo,
	useCallback,
	useEffect,
	useRef,
	useLayoutEffect,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
	ChevronLeft,
	ChevronRight,
	Settings,
	ChevronDown,
	Eye,
	EyeOff,
	Info,
	X,
	Settings2,
	Check,
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import {
	Bar,
	BarChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

import {
	useBudgetStore,
	type CustomCategory,
	type Transaction,
} from "@/store/useBudgetStore";
import { getReportSummary } from "@/components/Reports/reportUtils";
import {
	CATEGORY_HIERARCHY,
	findParentCategory,
	getCategoryHex,
	getCategoryTheme,
} from "@/constants";
import { getIconForCategory } from "@/lib/categoryIcons";
import {
	CategoryEditorModal,
	type CategoryEditorValue,
	type CategoryEditorGroupOption,
	CategoryBudgetType,
} from "@/components/Categories/CategoryEditorModal";
import {
	getCategoryGroupPreferenceKey,
	type CategoryPreferences,
	type CategorySectionId,
} from "@/lib/categories/categoryPreferences";
import {
	formatCurrencyInt,
	formatSignedCurrencyInt,
	formatThousandWithCommas,
} from "@/utils/formatters";
import { usePlanStore } from "@/store/usePlanStore";

// --- Goals integration ---
import { useGoalsData } from "@/hooks/useGoalsData";
import { GoalSettingsModal } from "@/components/Goals/GoalDialogs";
import {
	EditAccountForm,
	type EditableAccount,
} from "@/components/Accounts/details/EditAccountForm";
import type {
	GoalAccountLink,
	GoalAccountView,
	SavingsGoal,
} from "@/lib/goals/types";
import {
	fetchGoalAccountLinks,
	setGoalAccountLinks,
	updateSavingsGoal,
} from "@/lib/goals/repository";
import { GoalImage } from "@/components/Goals/GoalImage";
import { AccountLogo } from "@/components/Goals/GoalsUI";
import { formatGoalDate, getGoalProgress } from "@/lib/goals/formatters";
import { ProgressBar } from "@/components/Goals/GoalsUI";
import { EditGroupModal } from "@/components/CategoryGroups/CategoryGroupDetailsPageClient";
import { CategoryGroupUpdate } from "@/lib/categories/categoryGroups";
import type { CategoryGroupRecord } from "@/lib/categories/categoryGroups";

// ============================================================================
// 1. HELPERS
// ============================================================================
function getGroupFromCategory(
	categoryName: string,
	categoryId: string | undefined,
	categoryPreferences: CategoryPreferences,
): string {
	const parent = findParentCategory(categoryName);
	// 1. Exclude Income and Transfers from expense groupings
	if (parent === "Income") return "Income";
	if (parent === "Transfers") return "Transfers";

	// 2. If we have a valid category ID and a valid budgetType, respect it
	if (categoryId) {
		const prefs = categoryPreferences[categoryId];
		if (prefs && prefs.budgetType) {
			const validTypes: CategoryBudgetType[] = [
				"fixed",
				"flexible",
				"non-monthly",
			];
			if (validTypes.includes(prefs.budgetType as CategoryBudgetType)) {
				// 🔁 Map lowercase to capitalized group name
				const typeMap: Record<string, string> = {
					"fixed": "Fixed",
					"flexible": "Flexible",
					"non-monthly": "Non-Monthly",
				};
				return typeMap[prefs.budgetType] || prefs.budgetType;
			}
		}
	}

	// 3. Fall back to static classification
	if (["Mortgage"].includes(categoryName)) {
		return "Fixed";
	}
	if (
		[
			"Vacation",
			"Home Improvement",
			"Medical",
			"Financial Fees",
			"Education",
		].includes(categoryName)
	) {
		return "Non-Monthly";
	}
	return "Flexible";
}

function getPlanKey(date: Date, categoryId: string): string {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01_${categoryId}`;
}

function PlanInput({
	value,
	onChange,
	onClick,
}: {
	value: number;
	onChange: (val: string) => void;
	onClick?: (e: React.MouseEvent<HTMLInputElement>) => void;
}) {
	const [displayValue, setDisplayValue] = useState<string>(
		formatThousandWithCommas(value),
	);
	const inputRef = useRef<HTMLInputElement>(null);

	// Sync external value when not focused
	useEffect(() => {
		if (document.activeElement !== inputRef.current) {
			setDisplayValue(formatThousandWithCommas(value));
		}
	}, [value]);

	const handleFocus = () => {
		// Keep the formatted display, just select all text
		requestAnimationFrame(() => {
			inputRef.current?.select();
		});
	};

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		// Extract raw digits from the input (remove commas and non‑digits)
		const raw = e.target.value.replace(/[^0-9]/g, "");
		// Format with commas
		const formatted = raw.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

		// Preserve cursor position
		const input = e.target;
		const cursorPos = input.selectionStart || 0;
		let rawCharsBefore = 0;
		for (let i = 0; i < cursorPos; i++) {
			if (input.value[i] >= "0" && input.value[i] <= "9") {
				rawCharsBefore++;
			}
		}
		const formattedBefore = raw
			.slice(0, rawCharsBefore)
			.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
		const newCursor = formattedBefore.length;

		setDisplayValue(formatted);

		// Restore cursor after DOM update
		requestAnimationFrame(() => {
			if (inputRef.current) {
				inputRef.current.setSelectionRange(newCursor, newCursor);
			}
		});
	};

	const handleBlur = () => {
		const clean = displayValue.replace(/[^0-9]/g, "");
		const numeric = parseInt(clean, 10) || 0;
		onChange(numeric.toString());
		// Format again to ensure consistency (already formatted)
		setDisplayValue(formatThousandWithCommas(numeric));
	};

	return (
		<input
			ref={inputRef}
			type="text"
			value={displayValue}
			onFocus={handleFocus}
			onChange={handleChange}
			onBlur={handleBlur}
			onClick={(e) => {
				e.currentTarget.select();
				if (onClick) onClick(e);
			}}
			className="w-24 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-center text-sm outline-none focus:border-blue-500 dark:border-white/10 dark:bg-[#232323] cursor-pointer"
		/>
	);
}

// Get all category names (static + custom) that belong to a given group (via getGroupFromCategory)
function getAllCategoryNamesForGroup(
	groupName: string,
	customCategories: CustomCategory[],
	categoryPreferences: CategoryPreferences,
	categoryMap: Map<string, CustomCategory>,
): { name: string; id?: string }[] {
	// All static categories from CATEGORY_HIERARCHY
	const staticCategories = new Set<string>();
	for (const [parent, children] of Object.entries(CATEGORY_HIERARCHY)) {
		staticCategories.add(parent);
		for (const child of children) {
			staticCategories.add(child);
		}
	}
	// All custom categories
	const customNames = customCategories.map((cat) => cat.name.trim());

	// Combine all and filter by group mapping
	const allNames = new Set([...staticCategories, ...customNames]);
	const result: { name: string; id?: string }[] = [];
	for (const name of allNames) {
		const cat = categoryMap.get(name.trim());
		const id = cat?.id;
		if (getGroupFromCategory(name, id, categoryPreferences) === groupName) {
			result.push({ name, id });
		}
	}
	return result;
}

// Build rows for a group, including zero‑actual categories
function buildGroupRows(
	groupName: string,
	monthTransactions: Transaction[],
	customCategories: CustomCategory[],
	categoryPreferences: CategoryPreferences,
	categoryMap: Map<string, CustomCategory>,
): { label: string; value: number; key: string; color: string; id?: string }[] {
	const allCategories = getAllCategoryNamesForGroup(
		groupName,
		customCategories,
		categoryPreferences,
		categoryMap,
	);
	return allCategories.map(({ name, id }) => {
		const total = monthTransactions
			.filter((tx) => tx.category?.trim() === name)
			.reduce((sum, tx) => sum + Math.abs(tx.amount || 0), 0);
		const theme = getCategoryTheme(name);
		return {
			key: `${groupName}:${name}`,
			label: name,
			value: total,
			color: theme.text,
			id,
		};
	});
}

// ============================================================================
// 2. CATEGORY HISTORY POPOVER (Hover‑based)
// ============================================================================
function CategoryHistoryPopover({
	open,
	onClose,
	categoryName,
	transactions,
	anchorRef,
	onMouseEnter,
	onMouseLeave,
}: {
	open: boolean;
	onClose: () => void;
	categoryName: string;
	transactions: Transaction[];
	anchorRef: HTMLElement | null;
	onMouseEnter?: () => void;
	onMouseLeave?: () => void;
}) {
	const [, setHoveredKey] = useState<string | null>(null);

	const chartData = useMemo(() => {
		const now = new Date();
		const months: { label: string; amount: number }[] = [];
		for (let i = 11; i >= 0; i--) {
			const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
			const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
			const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
			const total = transactions
				.filter((tx) => {
					const txDate = new Date(tx.date);
					return (
						tx.category?.trim() === categoryName &&
						txDate >= monthStart &&
						txDate <= monthEnd
					);
				})
				.reduce((sum, tx) => sum + Math.abs(tx.amount || 0), 0);
			months.push({
				label: d.toLocaleDateString("en-US", { month: "short" }),
				amount: total,
			});
		}
		return months;
	}, [categoryName, transactions]);

	const average =
		chartData.length > 0
			? chartData.reduce((sum, d) => sum + d.amount, 0) / chartData.length
			: 0;

	// Position the popover relative to the anchor
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
		<div
			className="fixed z-[200] w-[280px] rounded-xl border border-gray-200 bg-white p-4 shadow-xl dark:border-white/10 dark:bg-[#1B1B1B]"
			style={{ top: position.top, left: position.left }}
			onMouseEnter={() => {
				// Keep open when mouse enters popover
				if (onMouseEnter) onMouseEnter();
			}}
			onMouseLeave={() => {
				// Start the close timer again when mouse leaves popover
				if (onMouseLeave) onMouseLeave();
			}}
		>
			<div className="flex items-center justify-between">
				<h4 className="text-sm font-bold text-gray-900 dark:text-white">
					History
				</h4>
				<button
					onClick={onClose}
					className="rounded-full p-1 hover:bg-gray-100 dark:hover:bg-white/5"
				>
					<X size={16} />
				</button>
			</div>

			<div className="mt-3 grid grid-cols-2 gap-2">
				<div className="rounded-lg bg-gray-50 p-2 dark:bg-white/5">
					<p className="text-lg font-bold">
						{formatCurrencyInt(chartData[chartData.length - 1]?.amount ?? 0)}
					</p>
					<p className="text-[10px] text-gray-500">Spent last month</p>
				</div>
				<div className="rounded-lg bg-gray-50 p-2 dark:bg-white/5">
					<p className="text-lg font-bold">{formatCurrencyInt(average)}</p>
					<p className="text-[10px] text-gray-500">Monthly average</p>
				</div>
			</div>

			<div className="mt-3 h-[100px]">
				<ResponsiveContainer width="100%" height="100%">
					<BarChart data={chartData}>
						<CartesianGrid
							vertical={false}
							strokeDasharray="3 3"
							stroke="rgba(128,128,128,.18)"
						/>
						<XAxis
							dataKey="label"
							tick={{ fontSize: 9, fill: "#777" }}
							axisLine={false}
							tickLine={false}
						/>
						<YAxis
							tickFormatter={(v) => formatCurrencyInt(Number(v))}
							tick={{ fontSize: 9, fill: "#777" }}
							width={40}
							axisLine={false}
							tickLine={false}
						/>
						<Tooltip
							content={({ active, payload, label }) => {
								if (!active || !payload?.length) return null;
								return (
									<div className="rounded-lg border border-white/10 bg-[#222] px-2 py-1 text-white text-xs shadow-xl">
										<p className="font-semibold">{label}</p>
										<p>{formatCurrencyInt(Number(payload[0].value))}</p>
									</div>
								);
							}}
						/>
						<Bar
							dataKey="amount"
							fill={getCategoryHex(categoryName) || "#FF5A35"}
							barSize={20}
							radius={[4, 4, 0, 0]}
							onMouseEnter={(_, index) =>
								setHoveredKey(chartData[index]?.label ?? null)
							}
							onMouseLeave={() => setHoveredKey(null)}
						/>
					</BarChart>
				</ResponsiveContainer>
			</div>

			<div className="mt-2 flex items-center gap-2 text-xs">
				<button className="flex items-center gap-1 rounded-full bg-orange-500 px-2 py-1 text-white hover:bg-orange-600">
					<Check size={12} /> Apply $
					{chartData[chartData.length - 1]?.amount ?? 0}
				</button>
				<Info size={14} className="text-gray-400" />
			</div>
		</div>
	);
}

// ============================================================================
// 2.1. GOAL - SAVE UP - POPOVER (Dialog‑based, dismiss on outside click)
// ============================================================================
function GoalContributionPopover({
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

// ============================================================================
// 2.2 GOAL - PAY DOWN - POPOVER (Dialog‑based, dismiss on outside click)
// ============================================================================
function AccountPaydownPopover({
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

// ============================================================================
// 3. BUDGET SETTINGS MODAL
// ============================================================================
function BudgetSettingsModal({
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

function SettingsRadioOption({
	selected,
	onSelect,
	title,
	description,
	recommended,
}: {
	selected: boolean;
	onSelect: () => void;
	title: string;
	description: string;
	recommended?: boolean;
}) {
	return (
		<div
			className={`flex items-start gap-4 rounded-xl border p-4 cursor-pointer transition-colors ${
				selected
					? "border-[#FF8A65] ring-1 ring-[#FF8A65]"
					: "border-gray-200 dark:border-white/10"
			}`}
			onClick={onSelect}
		>
			<div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-gray-300 dark:border-white/20">
				{selected && <div className="h-2.5 w-2.5 rounded-full bg-[#FF8A65]" />}
			</div>
			<div className="flex-1">
				<div className="flex items-center gap-2">
					<span className="font-semibold">{title}</span>
					{recommended && (
						<span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-600 dark:bg-orange-500/20 dark:text-orange-400">
							Recommended
						</span>
					)}
				</div>
				<p className="mt-1 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
					{description}
				</p>
			</div>
		</div>
	);
}

function SettingsActionRow({
	title,
	description,
	buttonText,
	destructive,
}: {
	title: string;
	description: string;
	buttonText: string;
	destructive?: boolean;
}) {
	return (
		<div className="flex items-center justify-between rounded-xl border border-gray-200 p-4 dark:border-white/10">
			<div>
				<p className="font-semibold">{title}</p>
				<p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
					{description}
				</p>
			</div>
			<button
				className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
					destructive
						? "border-gray-300 text-gray-700 hover:bg-red-50 hover:text-red-600 dark:border-white/10 dark:text-gray-300 dark:hover:bg-red-500/10 dark:hover:text-red-400"
						: "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:bg-[#1B1B1B] dark:text-gray-300 dark:hover:bg-white/5"
				}`}
			>
				{buttonText}
			</button>
		</div>
	);
}

// ============================================================================
// 2.3. FLEXIBLE BUDGET MODAL
// ============================================================================
// ============================================================================
// FLEXIBLE BUDGET MODAL (Matches Image 1)
// ============================================================================
function FlexibleBudgetModal({
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

// ============================================================================
// 0. SIMPLE TOOLTIP COMPONENT
// ============================================================================
function SimpleTooltip({
	children,
	label, // ← add this
	planned,
	actual,
	remaining,
}: {
	children: React.ReactNode;
	label: string; // ← add this
	planned: number;
	actual: number;
	remaining: number;
}) {
	const [show, setShow] = useState(false);
	const [coords, setCoords] = useState({ top: 0, left: 0 });
	const ref = useRef<HTMLSpanElement>(null);

	const handleMouseEnter = () => {
		const rect = ref.current?.getBoundingClientRect();
		if (rect) {
			setCoords({
				top: rect.top - 10,
				left: rect.left + rect.width / 2,
			});
			setShow(true);
		}
	};

	const handleMouseLeave = () => setShow(false);

	return (
		<span
			ref={ref}
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
			className="relative inline-block cursor-default"
		>
			{children}
			{show && (
				<div
					className="fixed z-[300] min-w-[180px] rounded-xl bg-[#1a1a1a] p-4 text-white shadow-xl"
					style={{
						top: coords.top - 8,
						left: coords.left - 90,
						transform: "translateY(-100%)",
					}}
				>
					<div className="text-sm font-semibold mb-2">{label}</div>{" "}
					{/* ← dynamic label */}
					<div className="flex justify-between text-xs">
						<span className="text-gray-400">Planned</span>
						<span>{formatCurrencyInt(planned)}</span>
					</div>
					<div className="flex justify-between text-xs mt-1">
						<span className="text-gray-400">Actual</span>
						<span>{formatCurrencyInt(actual)}</span>
					</div>
					<div className="flex justify-between text-xs mt-2 pt-2 border-t border-white/10">
						<span className="text-gray-400">Remaining</span>
						<span className="text-emerald-400">
							{formatCurrencyInt(remaining)}
						</span>
					</div>
				</div>
			)}
		</span>
	);
}

// ============================================================================
// 4. MAIN COMPONENT
// ============================================================================
export default function PlanPageClient() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const setCategoryPreferences = useBudgetStore(
		(state) => state.setCategoryPreferences,
	);
	const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	// --- Modals states ---
	const [isEditGroupOpen, setIsEditGroupOpen] = useState(false);
	const [isFlexibleBudgetOpen, setIsFlexibleBudgetOpen] = useState(false);

	const setGroupPreferences = useBudgetStore(
		(state) => state.setGroupPreferences,
	);
	const groupPreferences = useBudgetStore((state) => state.groupPreferences);

	// Define the preference key once, outside the handler and useMemo
	const incomeGroupPreferenceKey = useMemo(() => {
		return getCategoryGroupPreferenceKey("Income", undefined, true);
	}, []);

	const handleDeleteGroup = async (): Promise<void> => {
		// Since "Income" is a system group, "Delete" means "Disable" (hide it)
		await setGroupPreferences((current) => ({
			...current,
			[incomeGroupPreferenceKey]: {
				...(current[incomeGroupPreferenceKey] ?? {}),
				hidden: true,
			},
		}));
		setIsEditGroupOpen(false);
	};

	const handleSaveGroup = async (
		updates: CategoryGroupUpdate,
	): Promise<void> => {
		await setGroupPreferences((current) => ({
			...current,
			[incomeGroupPreferenceKey]: {
				...(current[incomeGroupPreferenceKey] ?? {}),
				name: updates.name,
				budgetMode: updates.budget_mode,
				budgetType: updates.budget_type ?? undefined,
				monthlyRollover:
					updates.budget_mode === "group"
						? updates.monthly_rollover
						: undefined,
				hidden: updates.hidden,
			},
		}));
		setIsEditGroupOpen(false);
	};

	const incomeGroupRecord = useMemo<CategoryGroupRecord>(
		() => ({
			id: "Income",
			name: "Income",
			source_name: "Income",
			section_id: "income",
			budget_mode:
				groupPreferences[incomeGroupPreferenceKey]?.budgetMode ?? "category",
			budget_type:
				groupPreferences[incomeGroupPreferenceKey]?.budgetType ?? "flexible",
			monthly_rollover:
				groupPreferences[incomeGroupPreferenceKey]?.monthlyRollover ?? false,
			hidden: false,
			is_system: true,
			// Add missing fields with null or default values:
			user_id: "",
			sort_order: 0,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		}),
		[groupPreferences, incomeGroupPreferenceKey],
	);

	// Parse date from query param: ?date=2026-08-01
	const initialDate = useMemo(() => {
		const dateParam = searchParams.get("date");
		if (dateParam) {
			const parts = dateParam.split("-");
			if (parts.length === 3) {
				const year = parseInt(parts[0], 10);
				const month = parseInt(parts[1], 10) - 1;
				const day = parseInt(parts[2], 10);
				if (
					!isNaN(year) &&
					!isNaN(month) &&
					month >= 0 &&
					month <= 11 &&
					!isNaN(day) &&
					day >= 1 &&
					day <= 31
				) {
					return new Date(year, month, day);
				}
			}
		}
		return new Date();
	}, [searchParams]);

	const [currentDate, setCurrentDate] = useState(initialDate);

	// Update URL when date changes
	useEffect(() => {
		const year = currentDate.getFullYear();
		const month = String(currentDate.getMonth() + 1).padStart(2, "0");
		const day = String(currentDate.getDate()).padStart(2, "0");
		const newParam = `${year}-${month}-${day}`;
		const currentParam = searchParams.get("date");
		if (currentParam !== newParam) {
			const params = new URLSearchParams(searchParams.toString());
			params.set("date", newParam);
			router.replace(`/plan?${params.toString()}`, { scroll: false });
		}
	}, [currentDate, router, searchParams]);

	const { plans, fetchBudgetPlans, saveBudgetPlan } = usePlanStore();

	useEffect(() => {
		fetchBudgetPlans(currentDate);
	}, [currentDate, fetchBudgetPlans]);

	const getPlanned = useCallback(
		(categoryId: string) => {
			const key = getPlanKey(currentDate, categoryId);
			return plans[key] ?? 0;
		},
		[currentDate, plans],
	);

	const handlePlanChange = (categoryId: string, rawValue: string) => {
		const numericValue = parseFloat(rawValue.replace(/[^0-9.]/g, "")) || 0;
		saveBudgetPlan(currentDate, categoryId, numericValue);
	};

	// State for category history popover
	const [historyCategory, setHistoryCategory] = useState<string | null>(null);
	const [historyAnchor, setHistoryAnchor] = useState<HTMLElement | null>(null);
	const [historyOpen, setHistoryOpen] = useState(false);

	// State for goal contribution popover
	const [goalContributionOpen, setGoalContributionOpen] = useState(false);
	const [goalContributionGoal, setGoalContributionGoal] =
		useState<SavingsGoal | null>(null);
	const [goalContributionAnchor, setGoalContributionAnchor] =
		useState<HTMLElement | null>(null);
	const [, setGoalContributionValue] = useState(0);

	// State for account paydown popover
	const [accountPaydownOpen, setAccountPaydownOpen] = useState(false);
	const [accountPaydownAccount, setAccountPaydownAccount] =
		useState<EditableAccount | null>(null);
	const [accountPaydownAnchor, setAccountPaydownAnchor] =
		useState<HTMLElement | null>(null);
	const [accountPaydownValue, setAccountPaydownValue] = useState(0);

	const [viewMode, setViewMode] = useState<"month" | "year" | "decade">(
		"month",
	);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [sidebarTab, setSidebarTab] = useState<
		"summary" | "income" | "expenses"
	>("summary");

	const [expandedSections, setExpandedSections] = useState({
		income: true,
		expenses: true,
		contributions: true,
	});
	const toggleSection = (section: keyof typeof expandedSections) => {
		setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
	};

	const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
		{
			"Income": true,
			"Fixed": true,
			"Flexible": true,
			"Non-Monthly": true,
			"Save up": true,
			"Pay down": true,
		},
	);
	const toggleGroup = (groupName: string) => {
		setExpandedGroups((prev) => ({ ...prev, [groupName]: !prev[groupName] }));
	};

	const [showUnbudgeted, setShowUnbudgeted] = useState<Record<string, boolean>>(
		{},
	);
	const toggleUnbudgeted = (group: string) => {
		setShowUnbudgeted((prev) => ({ ...prev, [group]: !prev[group] }));
	};

	const goToPreviousMonth = () => {
		const newDate = new Date(currentDate);
		newDate.setMonth(newDate.getMonth() - 1);
		setCurrentDate(newDate);
	};

	const goToNextMonth = () => {
		const newDate = new Date(currentDate);
		newDate.setMonth(newDate.getMonth() + 1);
		setCurrentDate(newDate);
	};

	const goToToday = () => {
		setCurrentDate(new Date());
	};

	const allCollapsed =
		Object.values(expandedSections).every((v) => v === false) &&
		Object.values(expandedGroups).every((v) => v === false);
	const toggleAllCollapse = () => {
		if (allCollapsed) {
			setExpandedSections({
				income: true,
				expenses: true,
				contributions: true,
			});
			setExpandedGroups({
				"Income": true,
				"Fixed": true,
				"Flexible": true,
				"Non-Monthly": true,
				"Save up": true,
				"Pay down": true,
			});
		} else {
			setExpandedSections({
				income: false,
				expenses: false,
				contributions: false,
			});
			setExpandedGroups({
				"Income": false,
				"Fixed": false,
				"Flexible": false,
				"Non-Monthly": false,
				"Save up": false,
				"Pay down": false,
			});
		}
	};

	const transactions = useBudgetStore((state) => state.transactions);
	const customCategories = useBudgetStore((state) => state.customCategories);
	const categoryPreferences = useBudgetStore(
		(state) => state.categoryPreferences,
	);

	// fix setting button not showing
	const staticCategoryNames = useMemo(() => {
		const names: string[] = [];
		for (const [parent, children] of Object.entries(CATEGORY_HIERARCHY)) {
			names.push(parent);
			for (const child of children) {
				names.push(child);
			}
		}
		return names;
	}, []);

	const accounts = useBudgetStore((state) => state.accounts);

	const { goals, savingsAccounts } = useGoalsData();

	const monthTransactions = useMemo(() => {
		const start = new Date(
			currentDate.getFullYear(),
			currentDate.getMonth(),
			1,
		);
		const end = new Date(
			currentDate.getFullYear(),
			currentDate.getMonth() + 1,
			1,
		);
		return transactions.filter((tx) => {
			const d = new Date(tx.date);
			return d >= start && d < end;
		});
	}, [transactions, currentDate]);

	// const categoryMap = useMemo(() => {
	// 	return new Map(customCategories.map((cat) => [cat.name.trim(), cat]));
	// }, [customCategories]);

	// fix setting buton
	const categoryMap = useMemo(() => {
		const map = new Map(customCategories.map((cat) => [cat.name.trim(), cat]));
		// Add static categories (if not already defined as custom)
		for (const name of staticCategoryNames) {
			if (!map.has(name)) {
				const parent = findParentCategory(name);
				map.set(name, {
					id: name,
					name: name,
					parent_name: parent === name ? null : parent,
					icon_name: "", // leave empty or set a default
					is_system: true,
				} as CustomCategory);
			}
		}
		return map;
	}, [customCategories, staticCategoryNames]);

	const summary = useMemo(
		() => getReportSummary(monthTransactions),
		[monthTransactions],
	);

	// --- Build rows for all groups (including zero actuals) ---
	const incomeRows = useMemo(() => {
		return buildGroupRows(
			"Income",
			monthTransactions,
			customCategories,
			categoryPreferences,
			categoryMap,
		);
	}, [monthTransactions, customCategories, categoryPreferences, categoryMap]);

	const expenseGroupRows = useMemo(() => {
		const groups = ["Fixed", "Flexible", "Non-Monthly"];
		return groups.reduce(
			(acc, group) => {
				acc[group] = buildGroupRows(
					group,
					monthTransactions,
					customCategories,
					categoryPreferences,
					categoryMap,
				);
				return acc;
			},
			{} as Record<string, typeof incomeRows>,
		);
	}, [monthTransactions, customCategories, categoryPreferences, categoryMap]);

	// Split into budgeted/unbudgeted
	const { budgetedIncomeRows, unbudgetedIncomeRows } = useMemo(() => {
		const budgeted: typeof incomeRows = [];
		const unbudgeted: typeof incomeRows = [];
		for (const row of incomeRows) {
			const planned = getPlanned(row.label);
			const actual = row.value;
			if (planned === 0 && actual === 0) unbudgeted.push(row);
			else budgeted.push(row);
		}
		return { budgetedIncomeRows: budgeted, unbudgetedIncomeRows: unbudgeted };
	}, [incomeRows, getPlanned]);

	const expenseGroupData = useMemo(() => {
		const result: Record<
			string,
			{
				budgeted: (typeof expenseGroupRows)["Fixed"];
				unbudgeted: (typeof expenseGroupRows)["Fixed"];
			}
		> = {
			"Fixed": { budgeted: [], unbudgeted: [] },
			"Flexible": { budgeted: [], unbudgeted: [] },
			"Non-Monthly": { budgeted: [], unbudgeted: [] },
		};

		for (const groupName of ["Fixed", "Flexible", "Non-Monthly"] as const) {
			const rows = expenseGroupRows[groupName] || [];
			for (const row of rows) {
				const planned = getPlanned(row.label);
				const actual = row.value;
				if (planned === 0 && actual === 0) {
					result[groupName].unbudgeted.push(row);
				} else {
					result[groupName].budgeted.push(row);
				}
			}
		}
		return result;
	}, [expenseGroupRows, getPlanned]);

	const groupTotals = useMemo(() => {
		const totals: Record<string, number> = {};
		for (const [group, data] of Object.entries(expenseGroupData)) {
			const allRows = [...data.budgeted, ...data.unbudgeted];
			totals[group] = allRows.reduce((sum, r) => sum + r.value, 0);
		}
		return totals;
	}, [expenseGroupData]);

	// --- Sidebar data ---
	const sidebarData = useMemo(() => {
		const incomePlanned = getPlanned("Income");
		const incomeActual = summary.totalIncome;
		const expensesPlanned =
			getPlanned("Fixed") + getPlanned("Flexible") + getPlanned("Non-Monthly");
		const expensesActual = summary.totalExpenses;
		const saveUpPlanned = getPlanned("Save up");
		const saveUpActual = goals.reduce((sum, g) => sum + (g.saved || 0), 0);
		const payDownPlanned = getPlanned("Pay down");
		const payDownActual = accounts
			.filter((acc) => !acc.exclude_from_paydown)
			.reduce((sum, acc) => sum + Math.abs(acc.current_balance || 0), 0);
		return {
			income: { planned: incomePlanned, actual: incomeActual },
			expenses: { planned: expensesPlanned, actual: expensesActual },
			saveUp: { planned: saveUpPlanned, actual: saveUpActual },
			payDown: { planned: payDownPlanned, actual: payDownActual },
		};
	}, [getPlanned, summary, goals, accounts]);

	// --- Editor states ---
	const [editingCategory, setEditingCategory] = useState<CustomCategory | null>(
		null,
	);
	const handleCloseCategoryEditor = () => setEditingCategory(null);
	const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
	const handleCloseGoalSettings = () => setEditingGoal(null);
	const [editingAccount, setEditingAccount] = useState<EditableAccount | null>(
		null,
	);
	const handleCloseEditAccount = () => setEditingAccount(null);

	// Define the standard category groups for the editor dropdown
	const allCategoryGroups = useMemo(() => {
		// 1. Start with all static parent groups from CATEGORY_HIERARCHY
		const groups = new Map<string, { sectionId: CategorySectionId }>();
		for (const parent of Object.keys(CATEGORY_HIERARCHY)) {
			let sectionId: CategorySectionId = "expenses";
			if (parent === "Income") sectionId = "income";
			else if (parent === "Transfers") sectionId = "transfers";
			groups.set(parent, { sectionId });
		}

		// 2. Add custom parent categories (where parent_name is null)
		for (const cat of customCategories) {
			if (!cat.parent_name || cat.parent_name.trim() === "") {
				const name = cat.name.trim();
				if (!groups.has(name)) {
					// Determine section: if name contains "income" -> income, "transfer" -> transfers, else expenses
					const lower = name.toLowerCase();
					let sectionId: CategorySectionId = "expenses";
					if (lower === "income") sectionId = "income";
					else if (lower.includes("transfer")) sectionId = "transfers";
					groups.set(name, { sectionId });
				}
			}
		}

		// 3. Convert to array
		return Array.from(groups.entries()).map(([name, { sectionId }]) => ({
			key: name,
			name,
			displayName: name,
			sectionId,
			hidden: false,
		}));
	}, [customCategories]);

	const editorGroups = useMemo<CategoryEditorGroupOption[]>(() => {
		return allCategoryGroups.map((g) => ({
			key: g.key,
			name: g.name,
			displayName: g.displayName,
			sectionId: g.sectionId,
			hidden: g.hidden,
		}));
	}, [allCategoryGroups]);

	const mapToEditorValue = useCallback(
		(cat: CustomCategory): CategoryEditorValue => {
			const prefs = categoryPreferences[cat.id] || {};
			return {
				id: cat.id,
				name: cat.name,
				icon: cat.icon_name || "❓",
				parentName: prefs.parentName || cat.parent_name || "Income",
				isSystem: cat.is_system,
				excludedFromBudget: prefs.excludedFromBudget || false,
				budgetType: prefs.budgetType || "flexible",
				monthlyRollover: prefs.monthlyRollover || false,
				rolloverStartMonth: prefs.rolloverStartMonth,
				rolloverStartingBalance: prefs.rolloverStartingBalance,
				hidden: prefs.hidden || false,
			};
		},
		[categoryPreferences],
	);
	const currentMonthLabel = useMemo(() => {
		return currentDate.toLocaleDateString("en-US", {
			month: "long",
			year: "numeric",
		});
	}, [currentDate]);

	const handleGoalContributionSave = async (
		amounts: Record<string, number>,
		applyToFuture: boolean,
	) => {
		if (!goalContributionGoal) return;

		// 1. Fetch current account links
		const currentLinks = await fetchGoalAccountLinks(goalContributionGoal.id);

		// 2. Update each link with new planned monthly amount
		const updatedLinks = currentLinks.map((link) => ({
			accountId: link.accountId,
			plannedMonthlyAmount: amounts[link.accountId] ?? 0,
		}));

		// 3. Save updated links to the goal
		await setGoalAccountLinks(goalContributionGoal.id, updatedLinks);

		// 4. Update the goal's total planned amount in the plan store
		const total = Object.values(amounts).reduce((sum, v) => sum + v, 0);
		saveBudgetPlan(currentDate, goalContributionGoal.id, total);

		// 5. If applyToFuture, propagate to next 12 months
		if (applyToFuture) {
			for (let i = 1; i <= 12; i++) {
				const nextMonth = new Date(currentDate);
				nextMonth.setMonth(nextMonth.getMonth() + i);
				saveBudgetPlan(nextMonth, goalContributionGoal.id, total);
			}
		}
	};

	const handleAccountPaydownSave = (amount: number, applyToFuture: boolean) => {
		if (!accountPaydownAccount) return;
		handlePlanChange(accountPaydownAccount.id, String(amount));
		if (applyToFuture) {
			for (let i = 1; i <= 12; i++) {
				const nextMonth = new Date(currentDate);
				nextMonth.setMonth(nextMonth.getMonth() + i);
				saveBudgetPlan(nextMonth, accountPaydownAccount.id, amount);
			}
		}
	};

	return (
		<div className="min-h-screen bg-[#F9FAFB] font-sans text-gray-900 dark:bg-[#121212] dark:text-gray-200">
			{/* --- TOP HEADER (Responsive) --- */}
			<header className="flex flex-wrap items-center justify-between border-b border-gray-200 bg-white/95 px-4 py-3 sm:px-6 backdrop-blur-sm dark:border-white/5 dark:bg-[#191919]/95">
				<h1 className="text-lg sm:text-xl font-semibold tracking-tight whitespace-nowrap">
					{currentMonthLabel}
				</h1>

				{/* Right side controls - tightly packed */}
				<div className="flex flex-wrap items-center justify-end gap-1.5">
					{/* Navigation arrows + Today */}
					<div className="flex items-center gap-1 text-gray-500">
						<button
							className="rounded-md p-1 hover:bg-gray-100 dark:hover:bg-white/5"
							onClick={goToPreviousMonth}
						>
							<ChevronLeft size={16} />
						</button>
						<button
							className="rounded-md p-1 hover:bg-gray-100 dark:hover:bg-white/5"
							onClick={goToNextMonth}
						>
							<ChevronRight size={16} />
						</button>
						<button
							className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-medium shadow-sm hover:bg-gray-50 dark:border-white/10 dark:bg-[#191919] dark:hover:bg-white/5"
							onClick={goToToday}
						>
							Today
						</button>
					</div>
					{/* Vertical Divider */}
					<div className="hidden h-5 w-px bg-gray-300 dark:bg-white/10 sm:block" />
					{/* View toggle (Month, Year, Decade) */}
					<div className="flex overflow-hidden rounded-lg border border-gray-200 bg-gray-50 text-xs font-medium dark:border-white/10 dark:bg-[#232323]">
						{["Month", "Year", "Decade"].map((view) => (
							<button
								key={view}
								onClick={() =>
									setViewMode(view.toLowerCase() as typeof viewMode)
								}
								className={`px-2 py-1 transition-colors ${
									viewMode === view.toLowerCase()
										? "bg-white text-blue-600 shadow-sm dark:bg-[#191919] dark:text-blue-400"
										: "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
								}`}
							>
								{view}
							</button>
						))}
					</div>

					{/* Collapse All Button */}
					<button
						onClick={toggleAllCollapse}
						className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-medium shadow-sm hover:bg-gray-50 dark:border-white/10 dark:bg-[#191919] dark:hover:bg-white/5"
					>
						{allCollapsed ? (
							<ChevronRight size={14} />
						) : (
							<ChevronDown size={14} />
						)}
						<span className="hidden sm:inline">
							{allCollapsed ? "Expand all" : "Collapse all"}
						</span>
						<span className="sm:hidden">
							{allCollapsed ? "Expand" : "Collapse"}
						</span>
					</button>

					{/* Vertical Divider */}
					<div className="hidden h-5 w-px bg-gray-300 dark:bg-white/10 sm:block" />

					{/* Settings Button */}
					<button
						onClick={() => setSettingsOpen(true)}
						className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-medium shadow-sm hover:bg-gray-50 dark:border-white/10 dark:bg-[#191919] dark:hover:bg-white/5"
					>
						<Settings size={14} />
						<span className="hidden sm:inline">Settings</span>
					</button>
				</div>
			</header>

			{/* --- MAIN LAYOUT --- */}
			<div className="flex w-full flex-col gap-6 p-4 sm:p-6 lg:flex-row">
				{/* === LEFT COLUMN: MAIN TABLE === */}
				<div className="flex-1 overflow-hidden">
					<div className="relative overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm dark:border-white/5 dark:bg-[#191919]">
						<div className="min-w-[800px]">
							<div className="flex items-center bg-[#EBECEE] px-6 py-3 text-xs font-semibold uppercase tracking-wider text-[#5D6064] dark:bg-[#232323] dark:text-gray-400">
								<div className="sticky left-0 z-20 bg-[#EBECEE] dark:bg-[#232323] w-[30%] pl-2 shrink-0"></div>
								<div className="w-[22%] text-center">Planned</div>
								<div className="w-[22%] text-center">Actual</div>
								<div className="w-[26%] text-center">Remaining</div>
							</div>

							{/* ==================== INCOME SECTION ==================== */}
							<div className="border-b border-gray-200 dark:border-white/5">
								<div className="flex w-full items-center bg-[#F3F4F6] px-6 py-3 font-medium text-[#5D6064] dark:bg-[#2A2A2A] dark:text-gray-300 hover:bg-[#EAEBED] dark:hover:bg-[#353535]">
									<div className="sticky left-0 z-20 bg-[#F3F4F6] dark:bg-[#2A2A2A] w-[30%] flex items-center gap-2 pl-2 shrink-0">
										<button
											onClick={() => toggleSection("income")}
											className="p-0 bg-transparent border-none focus:outline-none"
										>
											<ChevronDown
												size={18}
												className={`text-gray-500 transition-transform ${expandedSections.income ? "rotate-0" : "-rotate-90"}`}
											/>
										</button>
										<span>Income</span>
									</div>
									<div className="w-[22%] text-center">Planned</div>
									<div className="w-[22%] text-center">Actual</div>
									<div className="w-[26%] text-center">Remaining</div>
								</div>

								{expandedSections.income && (
									<div className="bg-white dark:bg-[#191919]">
										<div className="border-b border-gray-100 dark:border-white/5">
											<div className="flex w-full items-center px-6 py-3 hover:bg-[#F9FAFB] dark:hover:bg-[#151515]">
												<div className="sticky left-0 z-10 bg-white dark:bg-[#191919] w-[30%] flex items-center gap-2 pl-2 font-medium shrink-0">
													<button
														onClick={() => toggleGroup("Income")}
														className="p-0 bg-transparent border-none focus:outline-none"
													>
														<ChevronDown
															size={18}
															className={`text-gray-400 transition-transform ${expandedGroups.Income ? "rotate-0" : "-rotate-90"}`}
														/>
													</button>
													<span>Income</span>
													<button
														onClick={() => setIsEditGroupOpen(true)}
														className="rounded p-1 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
													>
														<Settings2 size={16} className="text-gray-400" />
													</button>
												</div>
												<div className="w-[22%] text-center font-medium text-lg">
													<span className="font-medium text-lg">
														{formatCurrencyInt(getPlanned("Income"))}
													</span>
												</div>
												<div className="w-[22%] text-center font-medium text-lg">
													{formatCurrencyInt(summary.totalIncome)}
												</div>
												<div className="w-[26%] text-center"></div>
											</div>

											{expandedGroups.Income && (
												<div className="divide-y divide-gray-50 dark:divide-white/5">
													{budgetedIncomeRows.map((row) => {
														const foundCat = categoryMap.get(row.label.trim());
														const theme = getCategoryTheme(row.label);
														return (
															<div
																key={row.key}
																className="flex items-center bg-[#F9FAFB] px-6 py-3 dark:bg-[#151515] hover:bg-gray-100 dark:hover:bg-white/5 group"
															>
																<div
																	onClick={() => {
																		if (foundCat)
																			router.push(`/categories/${foundCat.id}`);
																	}}
																	className="sticky left-0 z-10 bg-[#F9FAFB] dark:bg-[#151515] w-[30%] flex items-center gap-3 pl-2 text-sm font-medium text-[#484B50] dark:text-gray-300 cursor-pointer shrink-0"
																>
																	<div
																		className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-white/10 text-xs ${theme.text}`}
																	>
																		{(() => {
																			const Icon = getIconForCategory(
																				row.label,
																			);
																			return <Icon size={14} />;
																		})()}
																	</div>
																	<span className="flex-1 truncate">
																		{row.label}
																	</span>
																	{foundCat && (
																		<button
																			onClick={(e) => {
																				e.stopPropagation();
																				setEditingCategory(foundCat);
																			}}
																			className="opacity-0 group-hover:opacity-100 p-1.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 dark:border-white/10 dark:bg-[#191919] dark:hover:bg-white/5 shadow-sm transition-all ml-auto"
																		>
																			<Settings2
																				size={16}
																				className="text-gray-500 dark:text-gray-400"
																			/>
																		</button>
																	)}
																</div>

																<div className="w-[22%] text-center">
																	<PlanInput
																		value={getPlanned(row.label)}
																		onChange={(val) =>
																			handlePlanChange(row.label, val)
																		}
																		onClick={(e) => {
																			setHistoryCategory(row.label);
																			setHistoryAnchor(e.currentTarget);
																			setHistoryOpen(true);
																		}}
																	/>
																</div>
																<div
																	onClick={() => {
																		if (foundCat) {
																			const dateParam =
																				currentDate.toISOString().slice(0, 7) +
																				"-01";
																			router.push(
																				`/categories/${foundCat.id}?date=${dateParam}`,
																			);
																		}
																	}}
																	onMouseEnter={(e) => {
																		// Clear any pending close
																		if (closeTimeoutRef.current) {
																			clearTimeout(closeTimeoutRef.current);
																			closeTimeoutRef.current = null;
																		}
																		setHistoryCategory(row.label);
																		setHistoryAnchor(e.currentTarget);
																		setHistoryOpen(true);
																	}}
																	onMouseLeave={() => {
																		// Delay closing to allow moving into the popover
																		closeTimeoutRef.current = setTimeout(() => {
																			setHistoryOpen(false);
																		}, 300);
																	}}
																	className="w-[22%] text-center text-sm cursor-pointer hover:underline"
																>
																	{formatCurrencyInt(row.value)}
																</div>
																<div className="w-[26%] text-center flex items-center justify-end pr-2">
																	<SimpleTooltip
																		label={row.label} // ← pass the actual category name
																		planned={getPlanned(row.label)}
																		actual={row.value}
																		remaining={
																			getPlanned(row.label) - row.value
																		}
																	>
																		<span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
																			{formatCurrencyInt(
																				getPlanned(row.label) - row.value,
																			)}
																		</span>
																	</SimpleTooltip>
																</div>
															</div>
														);
													})}

													{unbudgetedIncomeRows.length > 0 && (
														<button
															onClick={() => toggleUnbudgeted("Income")}
															className="flex w-full items-center bg-[#F9FAFB] px-6 py-3 text-sm text-gray-400 hover:bg-[#F0F1F2] dark:bg-[#151515] dark:hover:bg-[#202020]"
														>
															<div className="sticky left-0 z-10 bg-[#F9FAFB] dark:bg-[#151515] w-[30%] flex items-center gap-3 pl-2 shrink-0">
																{showUnbudgeted["Income"] ? (
																	<EyeOff size={16} />
																) : (
																	<Eye size={16} />
																)}
																{showUnbudgeted["Income"] ? "Collapse" : "Show"}{" "}
																{unbudgetedIncomeRows.length} unbudgeted
															</div>
															<div className="w-[22%] text-center"></div>
															<div className="w-[22%] text-center font-medium text-gray-700 dark:text-gray-300">
																{formatCurrencyInt(
																	unbudgetedIncomeRows.reduce(
																		(sum, r) => sum + r.value,
																		0,
																	),
																)}
															</div>
															<div className="w-[26%] text-center"></div>
														</button>
													)}

													{showUnbudgeted["Income"] &&
														unbudgetedIncomeRows.length > 0 && (
															<div className="divide-y divide-gray-50 dark:divide-white/5">
																{unbudgetedIncomeRows.map((row) => {
																	const foundCat = categoryMap.get(
																		row.label.trim(),
																	);
																	const theme = getCategoryTheme(row.label);
																	return (
																		<div
																			key={row.key}
																			className="flex items-center bg-[#F9FAFB] px-6 py-3 dark:bg-[#151515] hover:bg-gray-100 dark:hover:bg-white/5 group"
																		>
																			<div
																				onClick={() => {
																					if (foundCat)
																						router.push(
																							`/categories/${foundCat.id}`,
																						);
																				}}
																				onMouseEnter={(e) => {
																					// Clear any pending close
																					if (closeTimeoutRef.current) {
																						clearTimeout(
																							closeTimeoutRef.current,
																						);
																						closeTimeoutRef.current = null;
																					}
																					setHistoryCategory(row.label);
																					setHistoryAnchor(e.currentTarget);
																					setHistoryOpen(true);
																				}}
																				onMouseLeave={() => {
																					// Delay closing to allow moving into the popover
																					closeTimeoutRef.current = setTimeout(
																						() => {
																							setHistoryOpen(false);
																						},
																						300,
																					);
																				}}
																				className="sticky left-0 z-10 bg-[#F9FAFB] dark:bg-[#151515] w-[30%] flex items-center gap-3 pl-2 text-sm font-medium text-[#484B50] dark:text-gray-300 cursor-pointer shrink-0"
																			>
																				<div
																					className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-white/10 text-xs ${theme.text}`}
																				>
																					{(() => {
																						const Icon = getIconForCategory(
																							row.label,
																						);
																						return <Icon size={14} />;
																					})()}
																				</div>
																				<span className="flex-1 truncate">
																					{row.label}
																				</span>
																				{foundCat && (
																					<button
																						onClick={(e) => {
																							e.stopPropagation();
																							setEditingCategory(foundCat);
																						}}
																						className="opacity-0 group-hover:opacity-100 p-1.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 dark:border-white/10 dark:bg-[#191919] dark:hover:bg-white/5 shadow-sm transition-all ml-auto"
																					>
																						<Settings2
																							size={16}
																							className="text-gray-500 dark:text-gray-400"
																						/>
																					</button>
																				)}
																			</div>
																			<div className="w-[22%] text-center">
																				<PlanInput
																					value={getPlanned(row.label)}
																					onChange={(val) =>
																						handlePlanChange(row.label, val)
																					}
																					onClick={(e) => {
																						setHistoryCategory(row.label);
																						setHistoryAnchor(e.currentTarget);
																						setHistoryOpen(true);
																					}}
																				/>
																			</div>
																			<div
																				onClick={() => {
																					if (foundCat) {
																						const dateParam =
																							currentDate
																								.toISOString()
																								.slice(0, 7) + "-01";
																						router.push(
																							`/categories/${foundCat.id}?date=${dateParam}`,
																						);
																					}
																				}}
																				onMouseEnter={(e) => {
																					// Clear any pending close
																					if (closeTimeoutRef.current) {
																						clearTimeout(
																							closeTimeoutRef.current,
																						);
																						closeTimeoutRef.current = null;
																					}
																					setHistoryCategory(row.label);
																					setHistoryAnchor(e.currentTarget);
																					setHistoryOpen(true);
																				}}
																				onMouseLeave={() => {
																					// Delay closing to allow moving into the popover
																					closeTimeoutRef.current = setTimeout(
																						() => {
																							setHistoryOpen(false);
																						},
																						300,
																					);
																				}}
																				className="w-[22%] text-center text-sm cursor-pointer hover:underline"
																			>
																				{formatCurrencyInt(row.value)}
																			</div>
																			<div className="w-[26%] text-center flex items-center justify-end pr-2">
																				<SimpleTooltip
																					label={row.label} // ← pass the actual category name
																					planned={getPlanned(row.label)}
																					actual={row.value}
																					remaining={
																						getPlanned(row.label) - row.value
																					}
																				>
																					<span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
																						{formatCurrencyInt(
																							getPlanned(row.label) - row.value,
																						)}
																					</span>
																				</SimpleTooltip>
																			</div>
																		</div>
																	);
																})}
															</div>
														)}
												</div>
											)}
										</div>
										<div className="flex items-center bg-[#F9FAFB] px-6 py-4 font-semibold dark:bg-[#151515]">
											<div className="sticky left-0 z-10 bg-[#F9FAFB] dark:bg-[#151515] w-[30%] pl-2 text-base shrink-0">
												Total Income
											</div>
											<div className="w-[22%] text-center text-base">
												{formatCurrencyInt(getPlanned("Income"))}
											</div>
											<div className="w-[22%] text-center text-base">
												{formatCurrencyInt(summary.totalIncome)}
											</div>
											<div className="w-[26%] text-center"></div>
										</div>
									</div>
								)}
							</div>

							{/* ==================== EXPENSES SECTION ==================== */}
							<div className="border-b border-gray-200 dark:border-white/5">
								<div className="flex w-full items-center bg-[#EBECEE] px-6 py-3 font-medium text-[#5D6064] dark:bg-[#2A2A2A] dark:text-gray-300 hover:bg-[#EAEBED] dark:hover:bg-[#353535]">
									<div className="sticky left-0 z-20 bg-[#EBECEE] dark:bg-[#2A2A2A] w-[30%] flex items-center gap-2 pl-2 shrink-0">
										<button
											onClick={() => toggleSection("expenses")}
											className="p-0 bg-transparent border-none focus:outline-none"
										>
											<ChevronDown
												size={18}
												className={`text-gray-500 transition-transform ${expandedSections.expenses ? "rotate-0" : "-rotate-90"}`}
											/>
										</button>
										<span>Expenses</span>
									</div>
									<div className="w-[22%] text-center">Planned</div>
									<div className="w-[22%] text-center">Actual</div>
									<div className="w-[26%] text-center">Remaining</div>
								</div>

								{expandedSections.expenses && (
									<div className="bg-white dark:bg-[#191919]">
										{/* FIXED GROUP */}
										<div className="border-b border-gray-100 dark:border-white/5">
											<div className="flex w-full items-center px-6 py-3 hover:bg-[#F9FAFB] dark:hover:bg-[#151515]">
												<div className="sticky left-0 z-10 bg-white dark:bg-[#191919] w-[30%] flex items-center gap-2 pl-2 font-medium shrink-0">
													<button
														onClick={() => toggleGroup("Fixed")}
														className="p-0 bg-transparent border-none focus:outline-none"
													>
														<ChevronDown
															size={18}
															className={`text-gray-400 transition-transform ${expandedGroups.Fixed ? "rotate-0" : "-rotate-90"}`}
														/>
													</button>
													<span>Fixed</span>
												</div>
												<div className="w-[22%] text-center">
													<span className="font-medium text-lg">
														{formatCurrencyInt(getPlanned("Fixed"))}
													</span>
												</div>
												<div className="w-[22%] text-center text-lg font-medium">
													{formatCurrencyInt(groupTotals.Fixed || 0)}
												</div>
												<div className="w-[26%] text-center text-red-500 font-medium text-base">
													{formatSignedCurrencyInt(
														(groupTotals.Fixed || 0) - getPlanned("Fixed"),
													)}
												</div>
											</div>

											{expandedGroups.Fixed && (
												<div className="divide-y divide-gray-50 dark:divide-white/5">
													{expenseGroupData.Fixed.budgeted.map((row) => {
														const foundCat = categoryMap.get(row.label.trim());
														const theme = getCategoryTheme(row.label);
														return (
															<div
																key={row.key}
																className="flex items-center bg-[#F9FAFB] px-6 py-3 dark:bg-[#151515] hover:bg-gray-100 dark:hover:bg-white/5 group"
															>
																<div
																	onClick={() => {
																		if (foundCat)
																			router.push(`/categories/${foundCat.id}`);
																	}}
																	onMouseEnter={(e) => {
																		// Clear any pending close
																		if (closeTimeoutRef.current) {
																			clearTimeout(closeTimeoutRef.current);
																			closeTimeoutRef.current = null;
																		}
																		setHistoryCategory(row.label);
																		setHistoryAnchor(e.currentTarget);
																		setHistoryOpen(true);
																	}}
																	onMouseLeave={() => {
																		// Delay closing to allow moving into the popover
																		closeTimeoutRef.current = setTimeout(() => {
																			setHistoryOpen(false);
																		}, 300);
																	}}
																	className="sticky left-0 z-10 bg-[#F9FAFB] dark:bg-[#151515] w-[30%] flex items-center gap-3 pl-2 text-sm font-medium text-[#484B50] dark:text-gray-300 cursor-pointer shrink-0"
																>
																	<div
																		className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-white/10 text-xs ${theme.text}`}
																	>
																		{(() => {
																			const Icon = getIconForCategory(
																				row.label,
																			);
																			return <Icon size={14} />;
																		})()}
																	</div>
																	<span className="flex-1 truncate">
																		{row.label}
																	</span>
																	{foundCat && (
																		<button
																			onClick={(e) => {
																				e.stopPropagation();
																				setEditingCategory(foundCat);
																			}}
																			className="opacity-0 group-hover:opacity-100 p-1.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 dark:border-white/10 dark:bg-[#191919] dark:hover:bg-white/5 shadow-sm transition-all ml-auto"
																		>
																			<Settings2
																				size={16}
																				className="text-gray-500 dark:text-gray-400"
																			/>
																		</button>
																	)}
																</div>

																<div className="w-[22%] text-center">
																	<PlanInput
																		value={getPlanned(row.label)}
																		onChange={(val) =>
																			handlePlanChange(row.label, val)
																		}
																		onClick={(e) => {
																			setHistoryCategory(row.label);
																			setHistoryAnchor(e.currentTarget);
																			setHistoryOpen(true);
																		}}
																	/>
																</div>
																<div
																	onClick={() => {
																		if (foundCat) {
																			const dateParam =
																				currentDate.toISOString().slice(0, 7) +
																				"-01";
																			router.push(
																				`/categories/${foundCat.id}?date=${dateParam}`,
																			);
																		}
																	}}
																	onMouseEnter={(e) => {
																		// Clear any pending close
																		if (closeTimeoutRef.current) {
																			clearTimeout(closeTimeoutRef.current);
																			closeTimeoutRef.current = null;
																		}
																		setHistoryCategory(row.label);
																		setHistoryAnchor(e.currentTarget);
																		setHistoryOpen(true);
																	}}
																	onMouseLeave={() => {
																		// Delay closing to allow moving into the popover
																		closeTimeoutRef.current = setTimeout(() => {
																			setHistoryOpen(false);
																		}, 300);
																	}}
																	className="w-[22%] text-center text-sm cursor-pointer hover:underline"
																>
																	{formatCurrencyInt(row.value)}
																</div>
																{/* <div className="w-[26%] text-center flex items-center justify-end pr-2">
																	<span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
																		{formatCurrencyInt(row.value)}
																	</span>
																</div> */}
																<div className="w-[26%] text-center flex items-center justify-end pr-2">
																	<SimpleTooltip
																		label={row.label} // ← pass the actual category name
																		planned={getPlanned(row.label)}
																		actual={row.value}
																		remaining={
																			getPlanned(row.label) - row.value
																		}
																	>
																		<span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
																			{formatCurrencyInt(
																				getPlanned(row.label) - row.value,
																			)}
																		</span>
																	</SimpleTooltip>
																</div>
															</div>
														);
													})}

													{expenseGroupData.Fixed.unbudgeted.length > 0 && (
														<button
															onClick={() => toggleUnbudgeted("Fixed")}
															className="flex w-full items-center bg-[#F9FAFB] px-6 py-3 text-sm text-gray-400 hover:bg-[#F0F1F2] dark:bg-[#151515] dark:hover:bg-[#202020]"
														>
															<div className="sticky left-0 z-10 bg-[#F9FAFB] dark:bg-[#151515] w-[30%] flex items-center gap-3 pl-2 shrink-0">
																{showUnbudgeted["Fixed"] ? (
																	<EyeOff size={16} />
																) : (
																	<Eye size={16} />
																)}
																{showUnbudgeted["Fixed"] ? "Collapse" : "Show"}{" "}
																{expenseGroupData.Fixed.unbudgeted.length}{" "}
																unbudgeted
															</div>
															<div className="w-[22%] text-center"></div>
															<div className="w-[22%] text-center font-medium text-gray-700 dark:text-gray-300">
																{formatCurrencyInt(
																	expenseGroupData.Fixed.unbudgeted.reduce(
																		(sum, r) => sum + r.value,
																		0,
																	),
																)}
															</div>
															<div className="w-[26%] text-center"></div>
														</button>
													)}

													{showUnbudgeted["Fixed"] &&
														expenseGroupData.Fixed.unbudgeted.length > 0 && (
															<div className="divide-y divide-gray-50 dark:divide-white/5">
																{expenseGroupData.Fixed.unbudgeted.map(
																	(row) => {
																		const foundCat = categoryMap.get(
																			row.label.trim(),
																		);
																		const theme = getCategoryTheme(row.label);
																		return (
																			<div
																				key={row.key}
																				className="flex items-center bg-[#F9FAFB] px-6 py-3 dark:bg-[#151515] hover:bg-gray-100 dark:hover:bg-white/5 group"
																			>
																				<div
																					onClick={() => {
																						if (foundCat)
																							router.push(
																								`/categories/${foundCat.id}`,
																							);
																					}}
																					onMouseEnter={(e) => {
																						// Clear any pending close
																						if (closeTimeoutRef.current) {
																							clearTimeout(
																								closeTimeoutRef.current,
																							);
																							closeTimeoutRef.current = null;
																						}
																						setHistoryCategory(row.label);
																						setHistoryAnchor(e.currentTarget);
																						setHistoryOpen(true);
																					}}
																					onMouseLeave={() => {
																						// Delay closing to allow moving into the popover
																						closeTimeoutRef.current =
																							setTimeout(() => {
																								setHistoryOpen(false);
																							}, 300);
																					}}
																					className="sticky left-0 z-10 bg-[#F9FAFB] dark:bg-[#151515] w-[30%] flex items-center gap-3 pl-2 text-sm font-medium text-[#484B50] dark:text-gray-300 cursor-pointer shrink-0"
																				>
																					<div
																						className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-white/10 text-xs ${theme.text}`}
																					>
																						{(() => {
																							const Icon = getIconForCategory(
																								row.label,
																							);
																							return <Icon size={14} />;
																						})()}
																					</div>
																					<span className="flex-1 truncate">
																						{row.label}
																					</span>
																					{foundCat && (
																						<button
																							onClick={(e) => {
																								e.stopPropagation();
																								setEditingCategory(foundCat);
																							}}
																							className="opacity-0 group-hover:opacity-100 p-1.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 dark:border-white/10 dark:bg-[#191919] dark:hover:bg-white/5 shadow-sm transition-all ml-auto"
																						>
																							<Settings2
																								size={16}
																								className="text-gray-500 dark:text-gray-400"
																							/>
																						</button>
																					)}
																				</div>
																				<div className="w-[22%] text-center">
																					<PlanInput
																						value={getPlanned(row.label)}
																						onChange={(val) =>
																							handlePlanChange(row.label, val)
																						}
																						onClick={(e) => {
																							setHistoryCategory(row.label);
																							setHistoryAnchor(e.currentTarget);
																							setHistoryOpen(true);
																						}}
																					/>
																				</div>
																				<div
																					onClick={() => {
																						if (foundCat) {
																							const dateParam =
																								currentDate
																									.toISOString()
																									.slice(0, 7) + "-01";
																							router.push(
																								`/categories/${foundCat.id}?date=${dateParam}`,
																							);
																						}
																					}}
																					onMouseEnter={(e) => {
																						// Clear any pending close
																						if (closeTimeoutRef.current) {
																							clearTimeout(
																								closeTimeoutRef.current,
																							);
																							closeTimeoutRef.current = null;
																						}
																						setHistoryCategory(row.label);
																						setHistoryAnchor(e.currentTarget);
																						setHistoryOpen(true);
																					}}
																					onMouseLeave={() => {
																						// Delay closing to allow moving into the popover
																						closeTimeoutRef.current =
																							setTimeout(() => {
																								setHistoryOpen(false);
																							}, 300);
																					}}
																					className="w-[22%] text-center text-sm cursor-pointer hover:underline"
																				>
																					{formatCurrencyInt(row.value)}
																				</div>
																				<div className="w-[26%] text-center flex items-center justify-end pr-2">
																					<SimpleTooltip
																						label={row.label} // ← pass the actual category name
																						planned={getPlanned(row.label)}
																						actual={row.value}
																						remaining={
																							getPlanned(row.label) - row.value
																						}
																					>
																						<span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
																							{formatCurrencyInt(
																								getPlanned(row.label) -
																									row.value,
																							)}
																						</span>
																					</SimpleTooltip>
																				</div>
																			</div>
																		);
																	},
																)}
															</div>
														)}
												</div>
											)}
										</div>

										{/* FLEXIBLE GROUP */}
										<div className="border-b border-gray-100 dark:border-white/5">
											<div className="flex w-full items-center px-6 py-3 hover:bg-[#F9FAFB] dark:hover:bg-[#151515]">
												<div className="sticky left-0 z-10 bg-white dark:bg-[#191919] w-[30%] flex items-center gap-2 pl-2 font-medium shrink-0">
													<button
														onClick={() => toggleGroup("Flexible")}
														className="p-0 bg-transparent border-none focus:outline-none"
													>
														<ChevronDown
															size={18}
															className={`text-gray-400 transition-transform ${expandedGroups.Flexible ? "rotate-0" : "-rotate-90"}`}
														/>
													</button>
													<span>Flexible</span>
													<button
														onClick={() => setIsFlexibleBudgetOpen(true)}
														className="rounded p-1 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
													>
														<Settings2 size={16} className="text-gray-400" />
													</button>
												</div>
												<div className="w-[22%] text-center">
													<PlanInput
														value={getPlanned("Flexible")}
														onChange={(val) =>
															handlePlanChange("Flexible", val)
														}
													/>
												</div>
												<div className="w-[22%] text-center text-lg font-medium">
													{formatCurrencyInt(groupTotals.Flexible || 0)}
												</div>
												<div className="w-[26%] text-center font-medium text-base">
													<span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
														{formatCurrencyInt(
															getPlanned("Flexible") -
																(groupTotals.Flexible || 0),
														)}
													</span>
												</div>
											</div>

											<div className="relative flex w-full bg-white px-6 pb-1 dark:bg-[#191919]">
												<div className="ml-[30%] h-1 w-[22%] overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
													<div
														className="h-full bg-emerald-500 dark:bg-emerald-400"
														style={{
															width: `${Math.min(((groupTotals.Flexible || 0) / Math.max(getPlanned("Flexible"), 1)) * 100, 100)}%`,
														}}
													/>
												</div>
											</div>

											{expandedGroups.Flexible && (
												<div className="divide-y divide-gray-50 dark:divide-white/5">
													{expenseGroupData.Flexible.budgeted.map((row) => {
														const foundCat = categoryMap.get(row.label.trim());
														const theme = getCategoryTheme(row.label);
														return (
															<div
																key={row.key}
																className="flex items-center bg-[#F9FAFB] px-6 py-3 dark:bg-[#151515] hover:bg-gray-100 dark:hover:bg-white/5 group"
															>
																<div
																	onClick={() => {
																		if (foundCat)
																			router.push(`/categories/${foundCat.id}`);
																	}}
																	onMouseEnter={(e) => {
																		// Clear any pending close
																		if (closeTimeoutRef.current) {
																			clearTimeout(closeTimeoutRef.current);
																			closeTimeoutRef.current = null;
																		}
																		setHistoryCategory(row.label);
																		setHistoryAnchor(e.currentTarget);
																		setHistoryOpen(true);
																	}}
																	onMouseLeave={() => {
																		// Delay closing to allow moving into the popover
																		closeTimeoutRef.current = setTimeout(() => {
																			setHistoryOpen(false);
																		}, 300);
																	}}
																	className="sticky left-0 z-10 bg-[#F9FAFB] dark:bg-[#151515] w-[30%] flex items-center gap-3 pl-2 text-sm font-medium text-[#484B50] dark:text-gray-300 cursor-pointer shrink-0"
																>
																	<div
																		className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${theme.text} ${row.label === "Uncategorized" ? "bg-white border border-gray-300 dark:bg-[#232323] dark:border-white/10" : "bg-gray-100 dark:bg-white/10"}`}
																	>
																		{(() => {
																			const Icon = getIconForCategory(
																				row.label,
																			);
																			return <Icon size={14} />;
																		})()}
																	</div>
																	<span className="flex-1 truncate">
																		{row.label}
																	</span>
																	{foundCat && (
																		<button
																			onClick={(e) => {
																				e.stopPropagation();
																				setEditingCategory(foundCat);
																			}}
																			className="opacity-0 group-hover:opacity-100 p-1.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 dark:border-white/10 dark:bg-[#191919] dark:hover:bg-white/5 shadow-sm transition-all ml-auto"
																		>
																			<Settings2
																				size={16}
																				className="text-gray-500 dark:text-gray-400"
																			/>
																		</button>
																	)}
																</div>

																<div className="w-[22%] text-center">
																	<PlanInput
																		value={getPlanned(row.label)}
																		onChange={(val) =>
																			handlePlanChange(row.label, val)
																		}
																		onClick={(e) => {
																			setHistoryCategory(row.label);
																			setHistoryAnchor(e.currentTarget);
																			setHistoryOpen(true);
																		}}
																	/>
																</div>
																<div
																	onClick={() => {
																		if (foundCat) {
																			const dateParam =
																				currentDate.toISOString().slice(0, 7) +
																				"-01";
																			router.push(
																				`/categories/${foundCat.id}?date=${dateParam}`,
																			);
																		}
																	}}
																	onMouseEnter={(e) => {
																		// Clear any pending close
																		if (closeTimeoutRef.current) {
																			clearTimeout(closeTimeoutRef.current);
																			closeTimeoutRef.current = null;
																		}
																		setHistoryCategory(row.label);
																		setHistoryAnchor(e.currentTarget);
																		setHistoryOpen(true);
																	}}
																	onMouseLeave={() => {
																		// Delay closing to allow moving into the popover
																		closeTimeoutRef.current = setTimeout(() => {
																			setHistoryOpen(false);
																		}, 300);
																	}}
																	className="w-[22%] text-center text-sm cursor-pointer hover:underline"
																>
																	{formatCurrencyInt(row.value)}
																</div>
																<div className="w-[26%] text-center flex items-center justify-end pr-2">
																	<SimpleTooltip
																		label={row.label} // ← pass the actual category name
																		planned={getPlanned(row.label)}
																		actual={row.value}
																		remaining={
																			getPlanned(row.label) - row.value
																		}
																	>
																		<span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
																			{formatCurrencyInt(
																				getPlanned(row.label) - row.value,
																			)}
																		</span>
																	</SimpleTooltip>
																</div>
															</div>
														);
													})}

													{expenseGroupData.Flexible.unbudgeted.length > 0 && (
														<button
															onClick={() => toggleUnbudgeted("Flexible")}
															className="flex w-full items-center bg-[#F9FAFB] px-6 py-3 text-sm text-gray-400 hover:bg-[#F0F1F2] dark:bg-[#151515] dark:hover:bg-[#202020]"
														>
															<div className="sticky left-0 z-10 bg-[#F9FAFB] dark:bg-[#151515] w-[30%] flex items-center gap-3 pl-2 shrink-0">
																{showUnbudgeted["Flexible"] ? (
																	<EyeOff size={16} />
																) : (
																	<Eye size={16} />
																)}
																{showUnbudgeted["Flexible"]
																	? "Collapse"
																	: "Show"}{" "}
																{expenseGroupData.Flexible.unbudgeted.length}{" "}
																unbudgeted
															</div>
															<div className="w-[22%] text-center"></div>
															<div className="w-[22%] text-center font-medium text-gray-700 dark:text-gray-300">
																{formatCurrencyInt(
																	expenseGroupData.Flexible.unbudgeted.reduce(
																		(sum, r) => sum + r.value,
																		0,
																	),
																)}
															</div>
															<div className="w-[26%] text-center"></div>
														</button>
													)}

													{showUnbudgeted["Flexible"] &&
														expenseGroupData.Flexible.unbudgeted.length > 0 && (
															<div className="divide-y divide-gray-50 dark:divide-white/5">
																{expenseGroupData.Flexible.unbudgeted.map(
																	(row) => {
																		const foundCat = categoryMap.get(
																			row.label.trim(),
																		);
																		const theme = getCategoryTheme(row.label);
																		return (
																			<div
																				key={row.key}
																				className="flex items-center bg-[#F9FAFB] px-6 py-3 dark:bg-[#151515] hover:bg-gray-100 dark:hover:bg-white/5 group"
																			>
																				<div
																					onClick={() => {
																						if (foundCat)
																							router.push(
																								`/categories/${foundCat.id}`,
																							);
																					}}
																					onMouseEnter={(e) => {
																						// Clear any pending close
																						if (closeTimeoutRef.current) {
																							clearTimeout(
																								closeTimeoutRef.current,
																							);
																							closeTimeoutRef.current = null;
																						}
																						setHistoryCategory(row.label);
																						setHistoryAnchor(e.currentTarget);
																						setHistoryOpen(true);
																					}}
																					onMouseLeave={() => {
																						// Delay closing to allow moving into the popover
																						closeTimeoutRef.current =
																							setTimeout(() => {
																								setHistoryOpen(false);
																							}, 300);
																					}}
																					className="sticky left-0 z-10 bg-[#F9FAFB] dark:bg-[#151515] w-[30%] flex items-center gap-3 pl-2 text-sm font-medium text-[#484B50] dark:text-gray-300 cursor-pointer shrink-0"
																				>
																					<div
																						className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${theme.text} ${row.label === "Uncategorized" ? "bg-white border border-gray-300 dark:bg-[#232323] dark:border-white/10" : "bg-gray-100 dark:bg-white/10"}`}
																					>
																						{(() => {
																							const Icon = getIconForCategory(
																								row.label,
																							);
																							return <Icon size={14} />;
																						})()}
																					</div>
																					<span className="flex-1 truncate">
																						{row.label}
																					</span>
																					{foundCat && (
																						<button
																							onClick={(e) => {
																								e.stopPropagation();
																								setEditingCategory(foundCat);
																							}}
																							className="opacity-0 group-hover:opacity-100 p-1.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 dark:border-white/10 dark:bg-[#191919] dark:hover:bg-white/5 shadow-sm transition-all ml-auto"
																						>
																							<Settings2
																								size={16}
																								className="text-gray-500 dark:text-gray-400"
																							/>
																						</button>
																					)}
																				</div>
																				<div className="w-[22%] text-center">
																					<PlanInput
																						value={getPlanned(row.label)}
																						onChange={(val) =>
																							handlePlanChange(row.label, val)
																						}
																						onClick={(e) => {
																							setHistoryCategory(row.label);
																							setHistoryAnchor(e.currentTarget);
																							setHistoryOpen(true);
																						}}
																					/>
																				</div>
																				<div
																					onClick={() => {
																						if (foundCat) {
																							const dateParam =
																								currentDate
																									.toISOString()
																									.slice(0, 7) + "-01";
																							router.push(
																								`/categories/${foundCat.id}?date=${dateParam}`,
																							);
																						}
																					}}
																					onMouseEnter={(e) => {
																						// Clear any pending close
																						if (closeTimeoutRef.current) {
																							clearTimeout(
																								closeTimeoutRef.current,
																							);
																							closeTimeoutRef.current = null;
																						}
																						setHistoryCategory(row.label);
																						setHistoryAnchor(e.currentTarget);
																						setHistoryOpen(true);
																					}}
																					onMouseLeave={() => {
																						// Delay closing to allow moving into the popover
																						closeTimeoutRef.current =
																							setTimeout(() => {
																								setHistoryOpen(false);
																							}, 300);
																					}}
																					className="w-[22%] text-center text-sm cursor-pointer hover:underline"
																				>
																					{formatCurrencyInt(row.value)}
																				</div>
																				<div className="w-[26%] text-center flex items-center justify-end pr-2">
																					<SimpleTooltip
																						label={row.label} // ← pass the actual category name
																						planned={getPlanned(row.label)}
																						actual={row.value}
																						remaining={
																							getPlanned(row.label) - row.value
																						}
																					>
																						<span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
																							{formatCurrencyInt(
																								getPlanned(row.label) -
																									row.value,
																							)}
																						</span>
																					</SimpleTooltip>
																				</div>
																			</div>
																		);
																	},
																)}
															</div>
														)}
												</div>
											)}
										</div>

										{/* NON-MONTHLY GROUP */}
										<div className="border-b border-gray-100 dark:border-white/5">
											<div className="flex w-full items-center px-6 py-3 hover:bg-[#F9FAFB] dark:hover:bg-[#151515]">
												<div className="sticky left-0 z-10 bg-white dark:bg-[#191919] w-[30%] flex items-center gap-2 pl-2 font-medium shrink-0">
													<button
														onClick={() => toggleGroup("Non-Monthly")}
														className="p-0 bg-transparent border-none focus:outline-none"
													>
														<ChevronDown
															size={18}
															className={`text-gray-400 transition-transform ${expandedGroups["Non-Monthly"] ? "rotate-0" : "-rotate-90"}`}
														/>
													</button>
													<span>Non-Monthly</span>
												</div>
												<div className="w-[22%] text-center">
													<span className="font-medium text-lg">
														{formatCurrencyInt(getPlanned("Non-Monthly"))}
													</span>
												</div>
												<div className="w-[22%] text-center text-lg font-medium">
													{formatCurrencyInt(groupTotals["Non-Monthly"] || 0)}
												</div>
												<div className="w-[26%] text-center font-medium text-base">
													<span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
														{formatCurrencyInt(
															getPlanned("Non-Monthly") -
																(groupTotals["Non-Monthly"] || 0),
														)}
													</span>
												</div>
											</div>

											{expandedGroups["Non-Monthly"] && (
												<div className="divide-y divide-gray-50 dark:divide-white/5">
													{expenseGroupData["Non-Monthly"].budgeted.map(
														(row) => {
															const foundCat = categoryMap.get(
																row.label.trim(),
															);
															const theme = getCategoryTheme(row.label);
															return (
																<div
																	key={row.key}
																	className="flex items-center bg-[#F9FAFB] px-6 py-3 dark:bg-[#151515] hover:bg-gray-100 dark:hover:bg-white/5 group"
																>
																	<div
																		onClick={() => {
																			if (foundCat)
																				router.push(
																					`/categories/${foundCat.id}`,
																				);
																		}}
																		onMouseEnter={(e) => {
																			// Clear any pending close
																			if (closeTimeoutRef.current) {
																				clearTimeout(closeTimeoutRef.current);
																				closeTimeoutRef.current = null;
																			}
																			setHistoryCategory(row.label);
																			setHistoryAnchor(e.currentTarget);
																			setHistoryOpen(true);
																		}}
																		onMouseLeave={() => {
																			// Delay closing to allow moving into the popover
																			closeTimeoutRef.current = setTimeout(
																				() => {
																					setHistoryOpen(false);
																				},
																				300,
																			);
																		}}
																		className="sticky left-0 z-10 bg-[#F9FAFB] dark:bg-[#151515] w-[30%] flex items-center gap-3 pl-2 text-sm font-medium text-[#484B50] dark:text-gray-300 cursor-pointer shrink-0"
																	>
																		<div
																			className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-white/10 text-xs ${theme.text}`}
																		>
																			{(() => {
																				const Icon = getIconForCategory(
																					row.label,
																				);
																				return <Icon size={14} />;
																			})()}
																		</div>
																		<span className="flex-1 truncate">
																			{row.label}
																		</span>
																		{foundCat && (
																			<button
																				onClick={(e) => {
																					e.stopPropagation();
																					setEditingCategory(foundCat);
																				}}
																				className="opacity-0 group-hover:opacity-100 p-1.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 dark:border-white/10 dark:bg-[#191919] dark:hover:bg-white/5 shadow-sm transition-all ml-auto"
																			>
																				<Settings2
																					size={16}
																					className="text-gray-500 dark:text-gray-400"
																				/>
																			</button>
																		)}
																	</div>

																	<div className="w-[22%] text-center">
																		<PlanInput
																			value={getPlanned(row.label)}
																			onChange={(val) =>
																				handlePlanChange(row.label, val)
																			}
																			onClick={(e) => {
																				setHistoryCategory(row.label);
																				setHistoryAnchor(e.currentTarget);
																				setHistoryOpen(true);
																			}}
																		/>
																	</div>
																	<div
																		onClick={() => {
																			if (foundCat) {
																				const dateParam =
																					currentDate
																						.toISOString()
																						.slice(0, 7) + "-01";
																				router.push(
																					`/categories/${foundCat.id}?date=${dateParam}`,
																				);
																			}
																		}}
																		onMouseEnter={(e) => {
																			// Clear any pending close
																			if (closeTimeoutRef.current) {
																				clearTimeout(closeTimeoutRef.current);
																				closeTimeoutRef.current = null;
																			}
																			setHistoryCategory(row.label);
																			setHistoryAnchor(e.currentTarget);
																			setHistoryOpen(true);
																		}}
																		onMouseLeave={() => {
																			// Delay closing to allow moving into the popover
																			closeTimeoutRef.current = setTimeout(
																				() => {
																					setHistoryOpen(false);
																				},
																				300,
																			);
																		}}
																		className="w-[22%] text-center text-sm cursor-pointer hover:underline"
																	>
																		{formatCurrencyInt(row.value)}
																	</div>
																	<div className="w-[26%] text-center flex items-center justify-end pr-2">
																		<SimpleTooltip
																			label={row.label} // ← pass the actual category name
																			planned={getPlanned(row.label)}
																			actual={row.value}
																			remaining={
																				getPlanned(row.label) - row.value
																			}
																		>
																			<span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
																				{formatCurrencyInt(
																					getPlanned(row.label) - row.value,
																				)}
																			</span>
																		</SimpleTooltip>
																	</div>
																</div>
															);
														},
													)}

													{expenseGroupData["Non-Monthly"].unbudgeted.length >
														0 && (
														<button
															onClick={() => toggleUnbudgeted("Non-Monthly")}
															className="flex w-full items-center bg-[#F9FAFB] px-6 py-3 text-sm text-gray-400 hover:bg-[#F0F1F2] dark:bg-[#151515] dark:hover:bg-[#202020]"
														>
															<div className="sticky left-0 z-10 bg-[#F9FAFB] dark:bg-[#151515] w-[30%] flex items-center gap-3 pl-2 shrink-0">
																{showUnbudgeted["Non-Monthly"] ? (
																	<EyeOff size={16} />
																) : (
																	<Eye size={16} />
																)}
																{showUnbudgeted["Non-Monthly"]
																	? "Collapse"
																	: "Show"}{" "}
																{
																	expenseGroupData["Non-Monthly"].unbudgeted
																		.length
																}{" "}
																unbudgeted
															</div>
															<div className="w-[22%] text-center"></div>
															<div className="w-[22%] text-center font-medium text-gray-700 dark:text-gray-300">
																{formatCurrencyInt(
																	expenseGroupData[
																		"Non-Monthly"
																	].unbudgeted.reduce(
																		(sum, r) => sum + r.value,
																		0,
																	),
																)}
															</div>
															<div className="w-[26%] text-center"></div>
														</button>
													)}

													{showUnbudgeted["Non-Monthly"] &&
														expenseGroupData["Non-Monthly"].unbudgeted.length >
															0 && (
															<div className="divide-y divide-gray-50 dark:divide-white/5">
																{expenseGroupData["Non-Monthly"].unbudgeted.map(
																	(row) => {
																		const foundCat = categoryMap.get(
																			row.label.trim(),
																		);
																		const theme = getCategoryTheme(row.label);
																		return (
																			<div
																				key={row.key}
																				className="flex items-center bg-[#F9FAFB] px-6 py-3 dark:bg-[#151515] hover:bg-gray-100 dark:hover:bg-white/5 group"
																			>
																				<div
																					onClick={() => {
																						if (foundCat)
																							router.push(
																								`/categories/${foundCat.id}`,
																							);
																					}}
																					onMouseEnter={(e) => {
																						// Clear any pending close
																						if (closeTimeoutRef.current) {
																							clearTimeout(
																								closeTimeoutRef.current,
																							);
																							closeTimeoutRef.current = null;
																						}
																						setHistoryCategory(row.label);
																						setHistoryAnchor(e.currentTarget);
																						setHistoryOpen(true);
																					}}
																					onMouseLeave={() => {
																						// Delay closing to allow moving into the popover
																						closeTimeoutRef.current =
																							setTimeout(() => {
																								setHistoryOpen(false);
																							}, 300);
																					}}
																					className="sticky left-0 z-10 bg-[#F9FAFB] dark:bg-[#151515] w-[30%] flex items-center gap-3 pl-2 text-sm font-medium text-[#484B50] dark:text-gray-300 cursor-pointer shrink-0"
																				>
																					<div
																						className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-white/10 text-xs ${theme.text}`}
																					>
																						{(() => {
																							const Icon = getIconForCategory(
																								row.label,
																							);
																							return <Icon size={14} />;
																						})()}
																					</div>
																					<span className="flex-1 truncate">
																						{row.label}
																					</span>
																					{foundCat && (
																						<button
																							onClick={(e) => {
																								e.stopPropagation();
																								setEditingCategory(foundCat);
																							}}
																							className="opacity-0 group-hover:opacity-100 p-1.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 dark:border-white/10 dark:bg-[#191919] dark:hover:bg-white/5 shadow-sm transition-all ml-auto"
																						>
																							<Settings2
																								size={16}
																								className="text-gray-500 dark:text-gray-400"
																							/>
																						</button>
																					)}
																				</div>
																				<div className="w-[22%] text-center">
																					<PlanInput
																						value={getPlanned(row.label)}
																						onChange={(val) =>
																							handlePlanChange(row.label, val)
																						}
																						onClick={(e) => {
																							setHistoryCategory(row.label);
																							setHistoryAnchor(e.currentTarget);
																							setHistoryOpen(true);
																						}}
																					/>
																				</div>
																				<div
																					onClick={() => {
																						if (foundCat) {
																							const dateParam =
																								currentDate
																									.toISOString()
																									.slice(0, 7) + "-01";
																							router.push(
																								`/categories/${foundCat.id}?date=${dateParam}`,
																							);
																						}
																					}}
																					onMouseEnter={(e) => {
																						// Clear any pending close
																						if (closeTimeoutRef.current) {
																							clearTimeout(
																								closeTimeoutRef.current,
																							);
																							closeTimeoutRef.current = null;
																						}
																						setHistoryCategory(row.label);
																						setHistoryAnchor(e.currentTarget);
																						setHistoryOpen(true);
																					}}
																					onMouseLeave={() => {
																						// Delay closing to allow moving into the popover
																						closeTimeoutRef.current =
																							setTimeout(() => {
																								setHistoryOpen(false);
																							}, 300);
																					}}
																					className="w-[22%] text-center text-sm cursor-pointer hover:underline"
																				>
																					{formatCurrencyInt(row.value)}
																				</div>
																				<div className="w-[26%] text-center flex items-center justify-end pr-2">
																					<SimpleTooltip
																						label={row.label} // ← pass the actual category name
																						planned={getPlanned(row.label)}
																						actual={row.value}
																						remaining={
																							getPlanned(row.label) - row.value
																						}
																					>
																						<span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
																							{formatCurrencyInt(
																								getPlanned(row.label) -
																									row.value,
																							)}
																						</span>
																					</SimpleTooltip>
																				</div>
																			</div>
																		);
																	},
																)}
															</div>
														)}
												</div>
											)}
										</div>

										{/* Total Expenses Row */}
										<div className="flex items-center bg-[#F9FAFB] px-6 py-4 font-semibold dark:bg-[#151515]">
											<div className="sticky left-0 z-10 bg-[#F9FAFB] dark:bg-[#151515] w-[30%] pl-2 text-base shrink-0">
												Total Expenses
											</div>
											<div className="w-[22%] text-center text-base">
												{formatCurrencyInt(
													getPlanned("Fixed") +
														getPlanned("Flexible") +
														getPlanned("Non-Monthly"),
												)}
											</div>
											<div className="w-[22%] text-center text-base">
												{formatCurrencyInt(summary.totalExpenses)}
											</div>
											<div className="w-[26%] text-center text-red-500 text-base">
												{formatSignedCurrencyInt(
													summary.totalExpenses -
														(getPlanned("Fixed") +
															getPlanned("Flexible") +
															getPlanned("Non-Monthly")),
												)}
											</div>
										</div>
									</div>
								)}
							</div>

							{/* ==================== CONTRIBUTIONS ==================== */}
							<div className="border-b border-gray-200 dark:border-white/5">
								<div className="flex w-full items-center bg-[#F3F4F6] px-6 py-3 font-medium text-[#5D6064] dark:bg-[#2A2A2A] dark:text-gray-300 hover:bg-[#EAEBED] dark:hover:bg-[#353535]">
									<div className="sticky left-0 z-20 bg-[#F3F4F6] dark:bg-[#2A2A2A] w-[30%] flex items-center gap-2 pl-2 shrink-0">
										<button
											onClick={() => toggleSection("contributions")}
											className="p-0 bg-transparent border-none focus:outline-none"
										>
											<ChevronDown
												size={18}
												className={`text-gray-500 transition-transform ${expandedSections.contributions ? "rotate-0" : "-rotate-90"}`}
											/>
										</button>
										<span>Contributions</span>
									</div>
									<div className="w-[22%] text-center">Planned</div>
									<div className="w-[22%] text-center">Actual</div>
									<div className="w-[26%] text-center">Remaining</div>
								</div>

								{expandedSections.contributions && (
									<div className="bg-white dark:bg-[#191919]">
										{/* ====== SAVE UP GROUP ====== */}
										<div className="border-b border-gray-100 dark:border-white/5">
											<div className="flex w-full items-center px-6 py-3 hover:bg-[#F9FAFB] dark:hover:bg-[#151515]">
												<div className="sticky left-0 z-10 bg-white dark:bg-[#191919] w-[30%] flex items-center gap-2 pl-2 font-medium shrink-0">
													<button
														onClick={() => toggleGroup("Save up")}
														className="p-0 bg-transparent border-none focus:outline-none"
													>
														<ChevronDown
															size={18}
															className={`text-gray-400 transition-transform ${expandedGroups["Save up"] ? "rotate-0" : "-rotate-90"}`}
														/>
													</button>
													<span>Save up</span>
												</div>
												<div className="w-[22%] text-center text-lg font-medium">
													<span className="font-medium text-lg">
														{formatCurrencyInt(getPlanned("Save up"))}
													</span>
												</div>
												<div className="w-[22%] text-center text-lg font-medium">
													$0
												</div>
												<div className="w-[26%] text-center"></div>
											</div>

											{expandedGroups["Save up"] && (
												<div className="divide-y divide-gray-50 dark:divide-white/5">
													{goals.map((goal) => {
														const planned = getPlanned(goal.id);
														const actual = goal.saved;
														const isBudgeted = !(planned === 0 && actual === 0);
														if (!isBudgeted) return null;
														return (
															<div
																key={goal.id}
																className="flex items-center bg-[#F9FAFB] px-6 py-3 dark:bg-[#151515] cursor-pointer hover:bg-gray-100 dark:hover:bg-white/5 group"
																onClick={() =>
																	router.push(`/goals/savings/${goal.id}`)
																}
															>
																<div className="sticky left-0 z-10 bg-[#F9FAFB] dark:bg-[#151515] w-[30%] flex items-center gap-3 pl-2 text-sm font-medium text-[#484B50] dark:text-gray-300 shrink-0">
																	<div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300 text-xs border border-gray-200 dark:border-white/10">
																		<span>🎯</span>
																	</div>
																	{goal.name}
																	{goal.status && (
																		<span className="ml-2 rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-bold text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
																			{goal.status}
																		</span>
																	)}
																	<button
																		onClick={(e) => {
																			e.stopPropagation();
																			setEditingGoal(goal);
																		}}
																		className="opacity-0 group-hover:opacity-100 ml-auto p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
																	>
																		<Settings2 size={16} />
																	</button>
																</div>
																<div className="w-[22%] text-center">
																	<PlanInput
																		value={getPlanned(goal.id)}
																		onChange={(val) =>
																			handlePlanChange(goal.id, val)
																		}
																		onClick={(e) => {
																			e.stopPropagation();
																			setGoalContributionGoal(goal);
																			setGoalContributionAnchor(
																				e.currentTarget,
																			);
																			setGoalContributionValue(
																				getPlanned(goal.id),
																			);
																			setGoalContributionOpen(true);
																		}}
																	/>
																</div>
																<div className="w-[22%] text-center text-sm">
																	{formatCurrencyInt(actual)}
																</div>
																<div className="w-[26%] text-center flex items-center justify-end pr-2"></div>
															</div>
														);
													})}

													{/* Unbudgeted goals */}
													{goals.filter(
														(g) => getPlanned(g.id) === 0 && g.saved === 0,
													).length > 0 && (
														<button
															onClick={() => toggleUnbudgeted("Save up")}
															className="flex w-full items-center bg-[#F9FAFB] px-6 py-3 text-sm text-gray-400 hover:bg-[#F0F1F2] dark:bg-[#151515] dark:hover:bg-[#202020]"
														>
															<div className="sticky left-0 z-10 bg-[#F9FAFB] dark:bg-[#151515] w-[30%] flex items-center gap-3 pl-2 shrink-0">
																{showUnbudgeted["Save up"] ? (
																	<EyeOff size={16} />
																) : (
																	<Eye size={16} />
																)}
																{showUnbudgeted["Save up"]
																	? "Collapse"
																	: "Show"}{" "}
																{
																	goals.filter(
																		(g) =>
																			getPlanned(g.id) === 0 && g.saved === 0,
																	).length
																}{" "}
																unbudgeted
															</div>
															<div className="w-[22%] text-center"></div>
															<div className="w-[22%] text-center font-medium text-gray-700 dark:text-gray-300">
																$0
															</div>
															<div className="w-[26%] text-center"></div>
														</button>
													)}

													{showUnbudgeted["Save up"] && (
														<div className="divide-y divide-gray-50 dark:divide-white/5">
															{goals
																.filter(
																	(g) =>
																		getPlanned(g.id) === 0 && g.saved === 0,
																)
																.map((goal) => (
																	<div
																		key={goal.id}
																		className="flex items-center bg-[#F9FAFB] px-6 py-3 dark:bg-[#151515] cursor-pointer hover:bg-gray-100 dark:hover:bg-white/5 group"
																		onClick={() =>
																			router.push(`/goals/savings/${goal.id}`)
																		}
																	>
																		<div className="sticky left-0 z-10 bg-[#F9FAFB] dark:bg-[#151515] w-[30%] flex items-center gap-3 pl-2 text-sm font-medium text-[#484B50] dark:text-gray-300 shrink-0">
																			<div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300 text-xs border border-gray-200 dark:border-white/10">
																				<span>🎯</span>
																			</div>
																			{goal.name}
																			{goal.status && (
																				<span className="ml-2 rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-bold text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
																					{goal.status}
																				</span>
																			)}
																			<button
																				onClick={(e) => {
																					e.stopPropagation();
																					setEditingGoal(goal);
																				}}
																				className="opacity-0 group-hover:opacity-100 ml-auto p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
																			>
																				<Settings2 size={16} />
																			</button>
																		</div>
																		<div className="w-[22%] text-center">
																			<PlanInput
																				value={getPlanned(goal.id)}
																				onChange={(val) =>
																					handlePlanChange(goal.id, val)
																				}
																				onClick={(e) => {
																					e.stopPropagation();
																					setHistoryCategory(goal.name);
																					setHistoryAnchor(e.currentTarget);
																					setHistoryOpen(true);
																				}}
																			/>
																		</div>
																		<div className="w-[22%] text-center text-sm">
																			{formatCurrencyInt(goal.saved)}
																		</div>
																		<div className="w-[26%] text-center flex items-center justify-end pr-2"></div>
																	</div>
																))}
														</div>
													)}
												</div>
											)}
										</div>

										{/* ====== PAY DOWN GROUP ====== */}
										<div className="border-b border-gray-100 dark:border-white/5">
											<div className="flex w-full items-center px-6 py-3 hover:bg-[#F9FAFB] dark:hover:bg-[#151515]">
												<div className="sticky left-0 z-10 bg-white dark:bg-[#191919] w-[30%] flex items-center gap-2 pl-2 font-medium shrink-0">
													<button
														onClick={() => toggleGroup("Pay down")}
														className="p-0 bg-transparent border-none focus:outline-none"
													>
														<ChevronDown
															size={18}
															className={`text-gray-400 transition-transform ${expandedGroups["Pay down"] ? "rotate-0" : "-rotate-90"}`}
														/>
													</button>
													<span>Pay down</span>
												</div>
												<div className="w-[22%] text-center text-lg font-medium">
													<span className="font-medium text-lg">
														{formatCurrencyInt(getPlanned("Pay down"))}
													</span>
												</div>
												<div className="w-[22%] text-center text-lg font-medium">
													$0
												</div>
												<div className="w-[26%] text-center text-base">
													<span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
														{formatCurrencyInt(getPlanned("Pay down"))}
													</span>
												</div>
											</div>

											{expandedGroups["Pay down"] && (
												<div className="divide-y divide-gray-50 dark:divide-white/5">
													{accounts
														.filter(
															(acc) =>
																(acc.current_balance || 0) > 0 &&
																!acc.exclude_from_paydown,
														)
														.map((acc) => (
															<div
																key={acc.id}
																className="flex items-center bg-[#F9FAFB] px-6 py-3 dark:bg-[#151515] cursor-pointer hover:bg-gray-100 dark:hover:bg-white/5 group"
																onClick={() =>
																	router.push(`/accounts/details/${acc.id}`)
																}
															>
																<div className="sticky left-0 z-10 bg-[#F9FAFB] dark:bg-[#151515] w-[30%] flex items-center gap-3 pl-2 text-sm font-medium text-[#484B50] dark:text-gray-300 shrink-0">
																	<div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300 text-xs border border-gray-200 dark:border-white/10">
																		💳
																	</div>
																	{acc.name}
																	<button
																		onClick={(e) => {
																			e.stopPropagation();
																			setEditingAccount(acc as EditableAccount);
																		}}
																		className="opacity-0 group-hover:opacity-100 ml-auto p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
																	>
																		<Settings2 size={16} />
																	</button>
																</div>
																<div className="w-[22%] text-center">
																	<PlanInput
																		value={getPlanned(acc.id)}
																		onChange={(val) =>
																			handlePlanChange(acc.id, val)
																		}
																		onClick={(e) => {
																			e.stopPropagation();
																			setAccountPaydownAccount(
																				acc as EditableAccount,
																			);
																			setAccountPaydownAnchor(e.currentTarget);
																			setAccountPaydownValue(
																				getPlanned(acc.id),
																			);
																			setAccountPaydownOpen(true);
																		}}
																	/>
																</div>
																<div className="w-[22%] text-center text-sm">
																	{formatCurrencyInt(acc.current_balance || 0)}
																</div>
																<div className="w-[26%] text-center flex items-center justify-end pr-2"></div>
															</div>
														))}
												</div>
											)}
										</div>

										{/* Total Contributions */}
										<div className="flex items-center bg-[#F9FAFB] px-6 py-4 font-semibold dark:bg-[#151515]">
											<div className="sticky left-0 z-10 bg-[#F9FAFB] dark:bg-[#151515] w-[30%] pl-2 text-base shrink-0">
												Total Contributions
											</div>
											<div className="w-[22%] text-center text-base">
												{formatCurrencyInt(
													getPlanned("Save up") + getPlanned("Pay down"),
												)}
											</div>
											<div className="w-[22%] text-center text-base">$0</div>
											<div className="w-[26%] text-center text-base">
												<span className="text-emerald-600 dark:text-emerald-400">
													{formatCurrencyInt(
														getPlanned("Save up") + getPlanned("Pay down"),
													)}
												</span>
											</div>
										</div>
									</div>
								)}
							</div>
						</div>
					</div>
				</div>

				{/* === RIGHT COLUMN: SIDEBAR (sticky) === */}
				<div className="flex w-full flex-col gap-4 lg:w-[340px] lg:sticky lg:top-6 lg:self-start">
					{/* Left to Budget Card */}
					<div className="rounded-2xl bg-red-50 p-5 text-center dark:bg-red-500/10">
						<h2 className="text-3xl font-bold text-red-600 dark:text-red-400">
							{formatSignedCurrencyInt(
								summary.totalExpenses - summary.totalIncome,
							)}
						</h2>
						<div className="mt-1 flex items-center justify-center gap-1 text-sm font-medium text-red-600 dark:text-red-400">
							Left to budget <Info size={14} />
						</div>
					</div>

					{/* Tabs */}
					<div className="flex rounded-xl bg-white p-1 shadow-sm dark:bg-[#191919]">
						{["Summary", "Income", "Expenses"].map((tab) => (
							<button
								key={tab}
								onClick={() =>
									setSidebarTab(tab.toLowerCase() as typeof sidebarTab)
								}
								className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
									sidebarTab === tab.toLowerCase()
										? "bg-gray-100 text-gray-900 dark:bg-white/10 dark:text-white"
										: "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
								}`}
							>
								{tab}
							</button>
						))}
					</div>

					{/* Content based on tab */}
					<div className="flex flex-col gap-4 rounded-2xl bg-white p-4 shadow-sm dark:bg-[#191919]">
						{sidebarTab === "summary" && (
							<>
								<SidebarProgressRow
									label="Income"
									planned={sidebarData.income.planned}
									actual={sidebarData.income.actual}
									color="green"
									actualLabel="earned"
								/>
								<SidebarProgressRow
									label="Expenses"
									planned={sidebarData.expenses.planned}
									actual={sidebarData.expenses.actual}
									color="red"
									actualLabel="spent"
								/>
								<SidebarProgressRow
									label="Save up"
									planned={sidebarData.saveUp.planned}
									actual={sidebarData.saveUp.actual}
									color="blue"
									actualLabel="contributed"
								/>
								<SidebarProgressRow
									label="Pay down"
									planned={sidebarData.payDown.planned}
									actual={sidebarData.payDown.actual}
									color="blue"
									actualLabel="paid down"
								/>
							</>
						)}
						{sidebarTab === "income" && (
							<SidebarProgressRow
								label="Income"
								planned={sidebarData.income.planned}
								actual={sidebarData.income.actual}
								color="green"
								actualLabel="earned"
							/>
						)}
						{sidebarTab === "expenses" && (
							<>
								<SidebarProgressRow
									label="Fixed"
									planned={getPlanned("Fixed")}
									actual={groupTotals.Fixed || 0}
									color="red"
									actualLabel="spent"
								/>
								<SidebarProgressRow
									label="Flexible"
									planned={getPlanned("Flexible")}
									actual={groupTotals.Flexible || 0}
									color="green"
									actualLabel="spent"
								/>
								<SidebarProgressRow
									label="Non-Monthly"
									planned={getPlanned("Non-Monthly")}
									actual={groupTotals["Non-Monthly"] || 0}
									color="gray"
									actualLabel="spent"
								/>
							</>
						)}
					</div>
				</div>
			</div>

			{/* ====== CATEGORY HISTORY POPOVER ====== */}
			{historyCategory && historyOpen && historyAnchor && (
				<CategoryHistoryPopover
					open={historyOpen}
					onClose={() => setHistoryOpen(false)}
					categoryName={historyCategory}
					transactions={transactions}
					anchorRef={historyAnchor}
					onMouseEnter={() => {
						if (closeTimeoutRef.current) {
							clearTimeout(closeTimeoutRef.current);
							closeTimeoutRef.current = null;
						}
					}}
					onMouseLeave={() => {
						closeTimeoutRef.current = setTimeout(() => {
							setHistoryOpen(false);
						}, 300);
					}}
				/>
			)}

			{/* ====== CATEGORY EDITOR MODAL ====== */}
			{editingCategory && (
				<CategoryEditorModal
					category={mapToEditorValue(editingCategory)}
					groups={editorGroups}
					childDialogOpen={false}
					onClose={handleCloseCategoryEditor}
					onSave={async (value) => {
						// Update the category preferences with the new type and rollover settings
						await setCategoryPreferences((prev) => {
							const next = { ...prev };
							if (!next[editingCategory.id]) {
								next[editingCategory.id] = {};
							}
							next[editingCategory.id] = {
								...next[editingCategory.id],
								excludedFromBudget: value.excludedFromBudget,
								budgetType: value.budgetType,
								monthlyRollover: value.monthlyRollover,
								rolloverStartMonth: value.rolloverStartMonth,
								rolloverStartingBalance: value.rolloverStartingBalance,
							};
							return next;
						});
						handleCloseCategoryEditor();
					}}
					onDelete={() => {
						handleCloseCategoryEditor();
					}}
					onActivate={() => {
						handleCloseCategoryEditor();
					}}
					isIncomeCategory={
						mapToEditorValue(editingCategory).parentName === "Income"
					}
				/>
			)}

			{/* ====== GOAL SETTINGS MODAL ====== */}
			{editingGoal && (
				<GoalSettingsModal
					open={!!editingGoal}
					onClose={handleCloseGoalSettings}
					goal={editingGoal}
					accountLinks={[]}
					accounts={savingsAccounts}
					onSave={async (input) => {
						// Actually update the goal!
						if (editingGoal) {
							// 1. Save the goal details (name, amount, date, etc.)
							await updateSavingsGoal(editingGoal.id, {
								name: input.name,
								targetAmount: input.targetAmount,
								targetDate: input.targetDate,
								spendingReducesProgress: input.spendingReducesProgress,
							});

							// 2. Save account links (monthly contributions per linked account)
							await setGoalAccountLinks(editingGoal.id, input.links);

							// 3. (Optional) Reload data or refresh the store
							// await reloadGoalsData();

							console.log("Goal saved successfully");
						}
						handleCloseGoalSettings();
					}}
					// eslint-disable-next-line @typescript-eslint/no-unused-vars
					onImageUpload={async (file) => {
						if (editingGoal) {
							// Upload the image here
							// await uploadGoalImage(editingGoal.id, file, editingGoal.imagePath);
						}
					}}
				/>
			)}

			{/* ====== PAY DOWN EDIT ACCOUNT MODAL ====== */}
			{editingAccount && (
				<Dialog.Root
					open={!!editingAccount}
					onOpenChange={(open) => !open && handleCloseEditAccount()}
				>
					<Dialog.Portal>
						<Dialog.Overlay className="fixed inset-0 z-[140] bg-black/45 backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
						<Dialog.Content
							onOpenAutoFocus={(event) => event.preventDefault()}
							className="fixed left-1/2 top-1/2 z-[150] max-h-[calc(100vh-32px)] w-[min(570px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-2xl outline-none dark:border-white/10 dark:bg-[#222220]"
						>
							<Dialog.Title className="sr-only">Edit account</Dialog.Title>
							<Dialog.Description className="sr-only">
								Update account details, visibility, balance, and actions.
							</Dialog.Description>
							<EditAccountForm
								account={editingAccount}
								onBack={handleCloseEditAccount}
							/>
						</Dialog.Content>
					</Dialog.Portal>
				</Dialog.Root>
			)}

			{/* ====== BUDGET SETTINGS MODAL ====== */}
			<BudgetSettingsModal
				open={settingsOpen}
				onClose={() => setSettingsOpen(false)}
			/>

			{/* ====== EDIT GROUP MODAL (Income) ====== */}
			{isEditGroupOpen && (
				<EditGroupModal
					group={incomeGroupRecord}
					childDialogOpen={false}
					onClose={() => setIsEditGroupOpen(false)}
					onSave={handleSaveGroup}
					onDelete={handleDeleteGroup}
				/>
			)}

			{/* ====== FLEXIBLE BUDGET MODAL ====== */}
			<FlexibleBudgetModal
				open={isFlexibleBudgetOpen}
				onClose={() => setIsFlexibleBudgetOpen(false)}
				rolloverEnabled={false} // Populate this from your actual group preferences
				startMonth={null} // Populate this from your actual group preferences
				startingBalance={null} // Populate this from your actual group preferences
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				onSave={async (data) => {
					setIsFlexibleBudgetOpen(false);
					// Add your update group preferences logic here
				}}
			/>

			{/* ====== GOAL CONTRIBUTION POPOVER ====== */}
			{goalContributionGoal &&
				goalContributionOpen &&
				goalContributionAnchor && (
					<GoalContributionPopover
						open={goalContributionOpen}
						onClose={() => setGoalContributionOpen(false)}
						goal={goalContributionGoal}
						savingsAccounts={savingsAccounts} // ✅ pass the prop
						onSave={handleGoalContributionSave}
						anchorRef={goalContributionAnchor}
					/>
				)}

			{/* ====== ACCOUNT PAYDOWN POPOVER ====== */}
			{accountPaydownAccount && accountPaydownOpen && accountPaydownAnchor && (
				<AccountPaydownPopover
					open={accountPaydownOpen}
					onClose={() => setAccountPaydownOpen(false)}
					account={accountPaydownAccount}
					currentPlanned={accountPaydownValue}
					onSave={handleAccountPaydownSave}
					anchorRef={accountPaydownAnchor}
				/>
			)}
		</div>
	);
}

// ============================================================================
// 5. SIDEBAR PROGRESS ROW COMPONENT
// ============================================================================
function SidebarProgressRow({
	label,
	planned,
	actual,
	color,
	actualLabel = "spent",
}: {
	label: string;
	planned: number;
	actual: number;
	color: "green" | "red" | "blue" | "gray";
	actualLabel?: string;
}) {
	const progress = planned > 0 ? Math.min((actual / planned) * 100, 100) : 0;
	const remaining = planned - actual;
	const colorClass =
		color === "green"
			? "bg-emerald-500 text-emerald-600 dark:bg-emerald-400 dark:text-emerald-400"
			: color === "red"
				? "bg-red-500 text-red-600 dark:bg-red-400 dark:text-red-400"
				: color === "blue"
					? "bg-blue-500 text-blue-600 dark:bg-blue-400 dark:text-blue-400"
					: "bg-gray-400 text-gray-500 dark:bg-gray-600 dark:text-gray-400";

	return (
		<div>
			<div className="mb-1 flex justify-between text-sm">
				<span className="font-medium text-gray-800 dark:text-gray-200">
					{label}
				</span>
				<span className="text-gray-500 dark:text-gray-400">
					{formatCurrencyInt(planned)} planned
				</span>
			</div>
			<div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
				<div
					className={`h-full ${colorClass.split(" ")[0]} rounded-full`}
					style={{ width: `${progress}%` }}
				/>
			</div>
			<div className="mt-1 flex justify-between text-sm">
				<span className="font-bold text-gray-900 dark:text-white">
					{formatCurrencyInt(actual)} {actualLabel}
				</span>
				<span
					className={`font-bold ${remaining >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}
				>
					{formatSignedCurrencyInt(remaining)} remaining
				</span>
			</div>
		</div>
	);
}
