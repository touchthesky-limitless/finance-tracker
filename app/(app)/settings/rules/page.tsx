"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
	ArrowRight,
	ChevronDown,
	GripVertical,
	Loader2,
	Plus,
	Search,
	Tag,
} from "lucide-react";

import { CategoryIcon } from "@/components/CategoryIcon";
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
	const setToast = useBudgetStore((state) => state.setToast);

	const [query, setQuery] = useState("");
	const [selectedRule, setSelectedRule] = useState<TransactionRule | null>(
		null,
	);
	const [isCreating, setIsCreating] = useState(false);
	const [isLoading, setIsLoading] = useState(true);

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

	const filteredRules = useMemo(() => {
		const normalizedQuery = query.trim().toLowerCase();

		if (!normalizedQuery) {
			return rules;
		}

		return rules.filter((rule) => {
			return JSON.stringify(rule).toLowerCase().includes(normalizedQuery);
		});
	}, [query, rules]);

	const modalOpen = isCreating || selectedRule !== null;

	return (
		<SettingsContentCard
			title="Rules"
			actions={
				<button
					type="button"
					className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-black/10 bg-white px-4 text-sm font-semibold shadow-sm hover:bg-black/[0.03] sm:w-auto dark:border-white/10 dark:bg-[#222220] dark:hover:bg-white/5"
				>
					Options
					<ChevronDown size={15} />
				</button>
			}
		>
			<div className="min-w-0 p-4 sm:p-5 lg:p-6">
				<p className="max-w-4xl break-words text-sm leading-6 text-[#333330] sm:text-[16px] sm:leading-7 dark:text-[#d2d2ce]">
					Rules let you rename, recategorize, tag, hide, and update the review
					status of matching transactions. When multiple rules match, they are
					applied in the order shown.
				</p>

				<div className="mt-6 flex min-w-0 flex-col items-stretch gap-4 sm:mt-7 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
					<h3 className="text-lg font-semibold">
						{rules.length} {rules.length === 1 ? "Rule" : "Rules"}
					</h3>

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
						filteredRules.map((rule) => (
							<RuleCard
								key={rule.id}
								rule={rule}
								onClick={() => {
									setIsCreating(false);
									setSelectedRule(rule);
								}}
							/>
						))
					)}
				</div>
			</div>

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

function RuleCard({
	rule,
	onClick,
}: {
	rule: TransactionRule;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="grid w-full min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white text-left transition hover:border-gray-300 hover:shadow-sm dark:border-white/10 dark:bg-[#222220] dark:hover:border-white/20 xl:grid-cols-[minmax(0,1fr)_42px_minmax(0,1fr)]"
		>
			<div className="flex min-w-0 gap-2.5 px-3 py-4 sm:gap-3 sm:px-5">
				<GripVertical size={17} className="mt-1 shrink-0 text-[#9a9a95]" />
				<div className="min-w-0 space-y-2">{renderCriteria(rule)}</div>
			</div>

			<div className="hidden items-center justify-center border-x border-gray-200 bg-[#fafaf8] dark:border-white/10 dark:bg-white/[0.025] xl:flex">
				<ArrowRight size={18} className="text-[#777671]" />
			</div>

			<div className="min-w-0 border-t border-gray-200 px-3 py-4 dark:border-white/10 sm:px-5 xl:border-l-0 xl:border-t-0">
				<div className="space-y-2">{renderActions(rule)}</div>
			</div>
		</button>
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
