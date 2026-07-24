"use client";

import { useEffect, useMemo, useState } from "react";
import { DragDropProvider, PointerSensor } from "@dnd-kit/react";
import { move } from "@dnd-kit/helpers";
import { useSortable } from "@dnd-kit/react/sortable";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import dynamic from "next/dynamic";
import {
	ArrowRight,
	ChevronDown,
	GripVertical,
	Loader2,
	Plus,
	Search,
	Tag,
	Trash2,
	X,
} from "lucide-react";

import { CategoryIcon } from "@/components/CategoryIcon";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SettingsContentCard } from "@/components/Settings/SettingsShell";
import {
	CATEGORY_HIERARCHY,
	findParentCategory,
	getCategoryTheme,
} from "@/constants";
import type {
	RuleAmountOperator,
	RuleTextOperator,
	TransactionRule,
} from "@/lib/rules/ruleEngine";
import { useBudgetStore } from "@/store/useBudgetStore";

const RULE_POINTER_SENSOR = PointerSensor.configure({
	preventActivation: (event, source) => {
		if (!(event.target instanceof Element)) {
			return false;
		}

		if (event.target.closest("[data-rule-drag-handle]")) {
			return false;
		}

		const interactiveElement = event.target.closest(
			'button, a, input, select, textarea, [contenteditable="true"]',
		);

		return interactiveElement !== null && interactiveElement !== source.element;
	},
});

const RuleModal = dynamic(
	() =>
		import("@/components/Transactions/RuleModal").then(
			(module) => module.RuleModal,
		),
	{ ssr: false },
);

const TEXT_OPERATOR_LABELS: Record<RuleTextOperator, string> = {
	contains: "contains",
	equals: "exactly matches",
	starts_with: "starts with",
	ends_with: "ends with",
};

const AMOUNT_OPERATOR_LABELS: Record<RuleAmountOperator, string> = {
	greater_than: "greater than",
	greater_than_or_equal: "at least",
	less_than: "less than",
	less_than_or_equal: "at most",
	equals: "exactly equals",
};

function arraysEqual(
	first: readonly string[],
	second: readonly string[],
): boolean {
	return (
		first.length === second.length &&
		first.every((value, index) => value === second[index])
	);
}

export default function SettingsRulesPage() {
	const transactions = useBudgetStore((state) => state.transactions);
	const accounts = useBudgetStore((state) => state.accounts);
	const merchants = useBudgetStore((state) => state.merchants);
	const customCategories = useBudgetStore((state) => state.customCategories);
	const customTags = useBudgetStore((state) => state.customTags);
	const rules = useBudgetStore((state) => state.rules);
	const fetchTransactions = useBudgetStore((state) => state.fetchTransactions);
	const fetchAccounts = useBudgetStore((state) => state.fetchAccounts);
	const fetchMerchants = useBudgetStore((state) => state.fetchMerchants);
	const fetchCustomCategories = useBudgetStore(
		(state) => state.fetchCustomCategories,
	);
	const saveRule = useBudgetStore((state) => state.saveRule);
	const deleteRule = useBudgetStore((state) => state.deleteRule);
	const deleteAllRules = useBudgetStore((state) => state.deleteAllRules);
	const reorderRules = useBudgetStore((state) => state.reorderRules);
	const setToast = useBudgetStore((state) => state.setToast);

	const [query, setQuery] = useState("");
	const [selectedRule, setSelectedRule] = useState<TransactionRule | null>(
		null,
	);
	const [isCreating, setIsCreating] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [pendingRuleIds, setPendingRuleIds] = useState<string[] | null>(null);
	const [isReordering, setIsReordering] = useState(false);
	const [isDeletingAllRules, setIsDeletingAllRules] = useState(false);
	const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
	const [reorderError, setReorderError] = useState<string | null>(null);

	useEffect(() => {
		let active = true;

		const load = async () => {
			setIsLoading(true);
			await Promise.all([
				fetchTransactions(),
				fetchAccounts(),
				fetchMerchants(),
				fetchCustomCategories(),
			]);

			if (active) {
				setIsLoading(false);
			}
		};

		void load();

		return () => {
			active = false;
		};
	}, [fetchAccounts, fetchCustomCategories, fetchMerchants, fetchTransactions]);

	const categoryNames = useMemo(() => {
		const result: string[] = [];
		const seen = new Set<string>();

		for (const children of Object.values(CATEGORY_HIERARCHY)) {
			for (const category of children) {
				const key = category.trim().toLowerCase();
				if (!seen.has(key)) {
					seen.add(key);
					result.push(category);
				}
			}
		}

		for (const category of customCategories) {
			if (!category.parent_name) {
				continue;
			}

			const name = category.name.trim();
			const key = name.toLowerCase();

			if (name && !seen.has(key)) {
				seen.add(key);
				result.push(name);
			}
		}

		return result;
	}, [customCategories]);

	const orderedRules = useMemo(() => {
		if (!pendingRuleIds) {
			return rules;
		}

		const ruleById = new Map(rules.map((rule) => [rule.id, rule]));
		const ordered = pendingRuleIds
			.map((id) => ruleById.get(id))
			.filter((rule): rule is TransactionRule => Boolean(rule));

		for (const rule of rules) {
			if (!pendingRuleIds.includes(rule.id)) {
				ordered.push(rule);
			}
		}

		return ordered;
	}, [pendingRuleIds, rules]);

	const filteredRules = useMemo(() => {
		const normalizedQuery = query.trim().toLowerCase();

		if (!normalizedQuery) {
			return orderedRules;
		}

		return orderedRules.filter((rule) => {
			return JSON.stringify(rule).toLowerCase().includes(normalizedQuery);
		});
	}, [orderedRules, query]);

	const modalOpen = isCreating || selectedRule !== null;
	const dragDisabled =
		Boolean(query.trim()) ||
		isReordering ||
		isDeletingAllRules ||
		orderedRules.length < 2;

	const handleRuleEdit = (rule: TransactionRule): void => {
		setIsCreating(false);
		setSelectedRule(rule);
	};

	const handleDeleteAllRules = async (): Promise<void> => {
		if (rules.length === 0 || isDeletingAllRules) {
			return;
		}

		setReorderError(null);
		setIsDeletingAllRules(true);

		try {
			await deleteAllRules();
			setPendingRuleIds(null);
			setQuery("");
			setIsCreating(false);
			setSelectedRule(null);
			setIsDeleteConfirmOpen(false);
		} catch (error: unknown) {
			setReorderError(
				error instanceof Error
					? error.message
					: "All rules could not be deleted.",
			);
		} finally {
			setIsDeletingAllRules(false);
		}
	};

	return (
		<SettingsContentCard
			title="Rules"
			actions={
				<DropdownMenu.Root modal={false}>
					<DropdownMenu.Trigger asChild>
						<button
							type="button"
							className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-black/10 bg-white px-4 text-sm font-semibold shadow-sm outline-none transition hover:bg-black/[0.03] focus-visible:ring-2 focus-visible:ring-cyan-500/30 sm:w-auto dark:border-white/10 dark:bg-[#222220] dark:hover:bg-white/5"
						>
							Options
							<ChevronDown size={15} />
						</button>
					</DropdownMenu.Trigger>

					<DropdownMenu.Portal>
						<DropdownMenu.Content
							align="end"
							sideOffset={8}
							collisionPadding={8}
							className="z-[1000] min-w-52 rounded-2xl border border-black/10 bg-white p-1.5 shadow-2xl outline-none dark:border-white/10 dark:bg-[#222220]"
						>
							<DropdownMenu.Item
								disabled={rules.length === 0 || isDeletingAllRules}
								onSelect={() => {
									setIsDeleteConfirmOpen(true);
								}}
								className="flex cursor-pointer select-none items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 outline-none transition data-[disabled]:cursor-not-allowed data-[disabled]:opacity-45 data-[highlighted]:bg-red-50 dark:text-red-400 dark:data-[highlighted]:bg-red-500/10"
							>
								{isDeletingAllRules ? (
									<Loader2 size={16} className="animate-spin" />
								) : (
									<Trash2 size={16} />
								)}
								{isDeletingAllRules
									? "Deleting all rules…"
									: "Delete all rules"}
							</DropdownMenu.Item>
						</DropdownMenu.Content>
					</DropdownMenu.Portal>
				</DropdownMenu.Root>
			}
		>
			<div className="min-w-0 p-4 sm:p-5 lg:p-6">
				<p className="max-w-4xl break-words text-sm leading-6 text-[#333330] sm:text-[16px] sm:leading-7 dark:text-[#d2d2ce]">
					Rules let you rename, recategorize, tag, hide, and update the review
					status of matching transactions. When multiple rules match, they are
					applied in the order shown.
				</p>

				<div className="mt-6 flex min-w-0 flex-col items-stretch gap-4 sm:mt-7 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
					<div className="flex items-center gap-3">
						<h3 className="text-lg font-semibold">
							{rules.length} {rules.length === 1 ? "Rule" : "Rules"}
						</h3>
						{isReordering && (
							<span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#777671] dark:text-[#aaa9a4]">
								<Loader2 size={13} className="animate-spin" />
								Saving order…
							</span>
						)}
					</div>

					<div className="grid w-full min-w-0 grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] lg:w-auto lg:min-w-[420px]">
						<label className="relative block min-w-0">
							<Search
								size={17}
								className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8a8a85]"
							/>
							<input
								value={query}
								onChange={(event) => setQuery(event.target.value)}
								placeholder="Search"
								className="h-11 w-full rounded-xl border border-gray-300 bg-transparent pl-10 pr-4 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15 dark:border-white/15"
							/>
						</label>

						<button
							type="button"
							onClick={() => {
								setSelectedRule(null);
								setIsCreating(true);
							}}
							className="inline-flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-[#ff5a35] px-4 text-sm font-semibold text-white hover:bg-[#e94c28] sm:w-auto"
						>
							<Plus size={16} />
							Create rule
						</button>
					</div>
				</div>

				{query.trim() && rules.length > 1 && (
					<p className="mt-3 text-xs text-[#777671] dark:text-[#aaa9a4]">
						Clear the search to change rule order.
					</p>
				)}

				{reorderError && (
					<div className="mt-4 flex items-start justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
						<span>{reorderError}</span>
						<button
							type="button"
							onClick={() => setReorderError(null)}
							className="shrink-0"
							aria-label="Dismiss reorder error"
						>
							<X size={16} />
						</button>
					</div>
				)}

				<div className="mt-4 min-w-0 space-y-4">
					{isLoading ? (
						<div className="flex min-h-40 items-center justify-center gap-2 text-sm text-[#777671]">
							<Loader2 size={17} className="animate-spin" />
							Loading rules…
						</div>
					) : filteredRules.length === 0 ? (
						<div className="rounded-2xl border border-dashed border-gray-300 px-4 py-10 text-center sm:px-6 sm:py-14 dark:border-white/15">
							<p className="font-semibold">
								{rules.length === 0 ? "No rules yet" : "No matching rules"}
							</p>
							<p className="mt-1 text-sm text-[#777671] dark:text-[#aaa9a4]">
								Create a rule to automate transaction cleanup.
							</p>
						</div>
					) : (
						<DragDropProvider
							sensors={(defaults) => [
								...defaults.filter((sensor) => sensor !== PointerSensor),
								RULE_POINTER_SENSOR,
							]}
							onDragStart={() => {
								setReorderError(null);
							}}
							onDragEnd={(event) => {
								if (event.canceled) {
									setPendingRuleIds(null);
									return;
								}

								const currentIds = orderedRules.map((rule) => rule.id);
								const nextIds = move(currentIds, event);

								if (arraysEqual(currentIds, nextIds)) {
									return;
								}

								setPendingRuleIds(nextIds);
								setIsReordering(true);

								void reorderRules(nextIds)
									.catch((error: unknown) => {
										setReorderError(
											error instanceof Error
												? error.message
												: "The rule order could not be saved.",
										);
									})
									.finally(() => {
										setPendingRuleIds(null);
										setIsReordering(false);
									});
							}}
						>
							<div className="space-y-4">
								{filteredRules.map((rule, index) => (
									<SortableRuleCard
										key={rule.id}
										rule={rule}
										index={index}
										dragDisabled={dragDisabled}
										onEdit={() => handleRuleEdit(rule)}
									/>
								))}
							</div>
						</DragDropProvider>
					)}
				</div>
			</div>

			{isDeleteConfirmOpen && (
				<ConfirmDialog
					title={`Delete all ${rules.length} ${rules.length === 1 ? "rule" : "rules"}?`}
					description="This permanently deletes every transaction rule. This action cannot be undone."
					confirmLabel="Delete all rules"
					confirmVariant="danger"
					icon={<Trash2 size={21} />}
					isLoading={isDeletingAllRules}
					onCancel={() => {
						if (!isDeletingAllRules) {
							setIsDeleteConfirmOpen(false);
						}
					}}
					onConfirm={handleDeleteAllRules}
				/>
			)}

			{modalOpen && (
				<RuleModal
					key={selectedRule?.id ?? "new-rule"}
					isOpen
					initialRule={selectedRule}
					transactions={transactions}
					accounts={accounts}
					merchants={merchants}
					categories={categoryNames}
					tags={customTags}
					onClose={() => {
						setIsCreating(false);
						setSelectedRule(null);
					}}
					onSave={async (rule, options) => {
						const result = await saveRule(rule, options.applyToExisting);

						if (result.count > 0) {
							setToast({
								count: result.count,
								snapshot: result.snapshot,
							});
						}
					}}
					onDelete={async (rule) => {
						await deleteRule(rule.id);
					}}
				/>
			)}
		</SettingsContentCard>
	);
}

interface SortableRuleCardProps {
	rule: TransactionRule;
	index: number;
	dragDisabled: boolean;
	onEdit: () => void;
}

function SortableRuleCard({
	rule,
	index,
	dragDisabled,
	onEdit,
}: SortableRuleCardProps) {
	const [element, setElement] = useState<Element | null>(null);
	const { isDragging, isDropTarget } = useSortable({
		id: rule.id,
		index,
		element,
		type: "rule",
		accept: "rule",
		disabled: dragDisabled,
	});

	const gripButton = (
		<button
			type="button"
			data-rule-drag-handle
			disabled={dragDisabled}
			onClick={(event) => event.stopPropagation()}
			aria-label={`Move rule ${rule.name}`}
			title={
				dragDisabled
					? "Clear search to reorder rules"
					: "Drag anywhere on the card to reorder"
			}
			className="grid size-8 shrink-0 cursor-grab touch-none place-items-center rounded-lg text-[#9a9a95] outline-none transition hover:bg-black/[0.04] focus-visible:ring-2 focus-visible:ring-cyan-500/30 active:cursor-grabbing disabled:cursor-default disabled:opacity-60 dark:hover:bg-white/[0.06]"
		>
			<GripVertical size={17} />
		</button>
	);

	return (
		<div
			ref={setElement}
			role="button"
			tabIndex={0}
			onClick={onEdit}
			onKeyDown={(event) => {
				if (event.target !== event.currentTarget) {
					return;
				}

				if (event.key === "Enter" || event.key === " ") {
					event.preventDefault();
					onEdit();
				}
			}}
			aria-label={`Edit rule ${rule.name}`}
			data-shadow={isDragging || undefined}
			className={`w-full min-w-0 touch-pan-y select-none overflow-hidden rounded-2xl border bg-white text-left outline-none transition-[border-color,box-shadow] focus-visible:ring-2 focus-visible:ring-cyan-500/30 dark:bg-[#222220] ${
				dragDisabled ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"
			} ${
				isDragging
					? "relative z-20 border-cyan-500 shadow-[0_18px_48px_rgba(0,0,0,0.18)] ring-2 ring-cyan-500/15"
					: isDropTarget
						? "border-cyan-500 ring-2 ring-cyan-500/15"
						: "border-gray-200 hover:border-gray-300 hover:shadow-sm dark:border-white/10 dark:hover:border-white/20"
			}`}
		>
			{/* Mobile/tablet layout only. */}
			<div className="grid min-h-[260px] grid-cols-[minmax(0,1fr)_44px_minmax(0,1fr)] sm:min-h-[320px] sm:grid-cols-[minmax(0,1fr)_64px_minmax(0,1fr)] xl:hidden">
				<div className="grid min-w-0 grid-cols-[28px_minmax(0,1fr)] gap-2 px-3 py-5 sm:grid-cols-[36px_minmax(0,1fr)] sm:gap-4 sm:px-6 sm:py-7">
					<div className="flex items-center justify-center">{gripButton}</div>

					<div className="min-w-0">
						<h3 className="text-base font-semibold tracking-[-0.01em] sm:text-[22px]">
							If
						</h3>
						<div className="mt-3 space-y-3 sm:mt-4 sm:space-y-4">
							{renderMobileCriteria(rule)}
						</div>
					</div>
				</div>

				<div className="flex min-h-full items-center justify-center border-x border-gray-200 bg-[#fafaf8] dark:border-white/10 dark:bg-black/15">
					<ArrowRight size={22} className="text-[#8a8a85]" />
				</div>

				<div className="min-w-0 px-3 py-5 sm:px-6 sm:py-7">
					<div className="space-y-5 sm:space-y-6">
						{renderMobileActions(rule)}
					</div>
				</div>
			</div>

			{/* Preserve the original desktop card. */}
			<div className="hidden xl:grid xl:grid-cols-[minmax(0,1fr)_42px_minmax(0,1fr)]">
				<div className="flex min-w-0 gap-3 px-5 py-4">
					<div className="mt-0.5">{gripButton}</div>
					<div className="min-w-0 flex-1 space-y-2">{renderCriteria(rule)}</div>
				</div>

				<div className="flex items-center justify-center border-x border-gray-200 bg-[#fafaf8] dark:border-white/10 dark:bg-white/[0.025]">
					<ArrowRight size={18} className="text-[#777671]" />
				</div>

				<div className="min-w-0 px-5 py-4">
					<div className="space-y-2">{renderActions(rule)}</div>
				</div>
			</div>
		</div>
	);
}

function renderMobileCriteria(rule: TransactionRule) {
	const rows: React.ReactNode[] = [];

	if (rule.criteria.originalStatement) {
		rows.push(
			<MobileRuleSentence key="original-statement" label="original statement">
				<MobilePill>
					{TEXT_OPERATOR_LABELS[rule.criteria.originalStatement.operator]}
				</MobilePill>
				<MobilePill>{rule.criteria.originalStatement.value}</MobilePill>
			</MobileRuleSentence>,
		);
	}

	if (rule.criteria.merchantName) {
		rows.push(
			<MobileRuleSentence key="merchant" label="merchant name">
				<MobilePill>
					{TEXT_OPERATOR_LABELS[rule.criteria.merchantName.operator]}
				</MobilePill>
				<MobilePill>{rule.criteria.merchantName.value}</MobilePill>
			</MobileRuleSentence>,
		);
	}

	if (rule.criteria.amount) {
		rows.push(
			<MobileRuleSentence key="amount" label={rule.criteria.amount.direction}>
				<MobilePill>
					{AMOUNT_OPERATOR_LABELS[rule.criteria.amount.operator]}
				</MobilePill>
				<MobilePill>${rule.criteria.amount.value.toFixed(2)}</MobilePill>
			</MobileRuleSentence>,
		);
	}

	for (const category of rule.criteria.categories ?? []) {
		rows.push(
			<MobileRuleSentence key={`category-${category}`} label="category">
				<MobilePill>{category}</MobilePill>
			</MobileRuleSentence>,
		);
	}

	for (const accountId of rule.criteria.accountIds ?? []) {
		rows.push(
			<MobileRuleSentence key={`account-${accountId}`} label="account">
				<MobilePill>{accountId}</MobilePill>
			</MobileRuleSentence>,
		);
	}

	return rows.length > 0 ? rows : <span className="text-sm">No criteria</span>;
}

function renderMobileActions(rule: TransactionRule) {
	const rows: React.ReactNode[] = [];

	if (rule.actions.updateCategory) {
		const category = rule.actions.updateCategory;
		const parent = findParentCategory(category);

		rows.push(
			<MobileRuleAction key="category" label="Recategorize to">
				<MobilePill>
					<CategoryIcon
						name={category}
						size={15}
						colorClass={getCategoryTheme(parent).text}
					/>
					{category}
				</MobilePill>
			</MobileRuleAction>,
		);
	}

	if (rule.actions.renameMerchant) {
		rows.push(
			<MobileRuleAction key="merchant" label="Rename to">
				<MobilePill>{rule.actions.renameMerchant.name}</MobilePill>
			</MobileRuleAction>,
		);
	}

	for (const tag of rule.actions.addTags ?? []) {
		rows.push(
			<MobileRuleAction key={`tag-${tag}`} label="Add tag">
				<MobilePill>
					<Tag size={14} className="text-amber-500" />
					{tag}
				</MobilePill>
			</MobileRuleAction>,
		);
	}

	if (rule.actions.hideTransaction) {
		rows.push(
			<MobileRuleAction key="hide" label="Hide transaction">
				<MobilePill>Yes</MobilePill>
			</MobileRuleAction>,
		);
	}

	if (rule.actions.reviewStatus) {
		rows.push(
			<MobileRuleAction key="review" label="Review status">
				<MobilePill>
					{rule.actions.reviewStatus === "reviewed"
						? "Reviewed"
						: "Needs review"}
				</MobilePill>
			</MobileRuleAction>,
		);
	}

	return rows.length > 0 ? rows : <span className="text-sm">No actions</span>;
}

function MobileRuleSentence({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className="flex min-w-0 flex-col items-start gap-2.5 sm:gap-3">
			<MobilePill>{label}</MobilePill>
			{children}
		</div>
	);
}

function MobileRuleAction({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className="min-w-0">
			<h3 className="text-base font-semibold tracking-[-0.01em] sm:text-[22px]">
				{label}
			</h3>
			<div className="mt-3 flex min-w-0 flex-wrap items-start gap-2 sm:mt-4">
				{children}
			</div>
		</div>
	);
}

function MobilePill({ children }: { children: React.ReactNode }) {
	return (
		<span className="inline-flex min-w-0 max-w-full flex-wrap items-center gap-1.5 break-words rounded-xl border border-black/[0.08] bg-[#f7f7f5] px-2.5 py-2 text-sm font-medium leading-5 sm:px-3.5 sm:text-lg sm:leading-6 dark:border-white/10 dark:bg-black/20">
			{children}
		</span>
	);
}

function renderCriteria(rule: TransactionRule) {
	const rows: React.ReactNode[] = [];

	if (rule.criteria.originalStatement) {
		rows.push(
			<RuleSentence key="original-statement" label="original statement">
				<Pill>
					{TEXT_OPERATOR_LABELS[rule.criteria.originalStatement.operator]}
				</Pill>
				<Pill>{rule.criteria.originalStatement.value}</Pill>
			</RuleSentence>,
		);
	}

	if (rule.criteria.merchantName) {
		rows.push(
			<RuleSentence key="merchant" label="merchant name">
				<Pill>{TEXT_OPERATOR_LABELS[rule.criteria.merchantName.operator]}</Pill>
				<Pill>{rule.criteria.merchantName.value}</Pill>
			</RuleSentence>,
		);
	}

	if (rule.criteria.amount) {
		rows.push(
			<RuleSentence key="amount" label={rule.criteria.amount.direction}>
				<Pill>{AMOUNT_OPERATOR_LABELS[rule.criteria.amount.operator]}</Pill>
				<Pill>${rule.criteria.amount.value.toFixed(2)}</Pill>
			</RuleSentence>,
		);
	}

	for (const category of rule.criteria.categories ?? []) {
		rows.push(
			<RuleSentence key={`category-${category}`} label="category">
				<Pill>{category}</Pill>
			</RuleSentence>,
		);
	}

	for (const accountId of rule.criteria.accountIds ?? []) {
		rows.push(
			<RuleSentence key={`account-${accountId}`} label="account">
				<Pill>{accountId}</Pill>
			</RuleSentence>,
		);
	}

	return rows.length > 0 ? rows : <span className="text-sm">No criteria</span>;
}

function renderActions(rule: TransactionRule) {
	const rows: React.ReactNode[] = [];

	if (rule.actions.updateCategory) {
		const category = rule.actions.updateCategory;
		const parent = findParentCategory(category);

		rows.push(
			<div
				key="category"
				className="flex min-w-0 flex-wrap items-center gap-2 text-sm sm:text-[15px]"
			>
				<span>Recategorize to</span>
				<Pill>
					<CategoryIcon
						name={category}
						size={14}
						colorClass={getCategoryTheme(parent).text}
					/>
					{category}
				</Pill>
			</div>,
		);
	}

	if (rule.actions.renameMerchant) {
		rows.push(
			<div
				key="merchant"
				className="flex min-w-0 flex-wrap items-center gap-2 text-sm sm:text-[15px]"
			>
				<span>Rename to</span>
				<Pill>{rule.actions.renameMerchant.name}</Pill>
			</div>,
		);
	}

	for (const tag of rule.actions.addTags ?? []) {
		rows.push(
			<div
				key={`tag-${tag}`}
				className="flex min-w-0 flex-wrap items-center gap-2 text-sm sm:text-[15px]"
			>
				<span>Add tag</span>
				<Pill>
					<Tag size={13} className="text-amber-500" />
					{tag}
				</Pill>
			</div>,
		);
	}

	if (rule.actions.hideTransaction) {
		rows.push(
			<div key="hide" className="text-[15px]">
				Hide transaction
			</div>,
		);
	}

	if (rule.actions.reviewStatus) {
		rows.push(
			<div
				key="review"
				className="flex min-w-0 flex-wrap items-center gap-2 text-sm sm:text-[15px]"
			>
				<span>Review status</span>
				<Pill>
					{rule.actions.reviewStatus === "reviewed"
						? "Reviewed"
						: "Needs review"}
				</Pill>
			</div>,
		);
	}

	return rows.length > 0 ? rows : <span className="text-sm">No actions</span>;
}

function RuleSentence({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className="flex min-w-0 flex-wrap items-center gap-2 text-sm sm:text-[15px]">
			<span>If</span>
			<Pill>{label}</Pill>
			{children}
		</div>
	);
}

function Pill({ children }: { children: React.ReactNode }) {
	return (
		<span className="inline-flex min-w-0 max-w-full flex-wrap items-center gap-1.5 break-words rounded-lg border border-black/[0.07] bg-[#f7f7f5] px-2.5 py-1 text-sm leading-5 sm:text-[15px] sm:leading-6 dark:border-white/10 dark:bg-white/[0.06]">
			{children}
		</span>
	);
}
