"use client";

import {
	useEffect,
	useMemo,
	useRef,
	useState,
	type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
	AlertTriangle,
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
	() => {
		return import("@/components/Transactions/RuleModal").then(
			(module) => {
				return module.RuleModal;
			},
		);
	},
	{
		ssr: false,
	},
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
		first.every((value, index) => {
			return value === second[index];
		})
	);
}

export default function SettingsRulesPage() {
	const transactions = useBudgetStore((state) => state.transactions);
	const accounts = useBudgetStore((state) => state.accounts);
	const merchants = useBudgetStore((state) => state.merchants);
	const customCategories = useBudgetStore((state) => state.customCategories);
	const customTags = useBudgetStore((state) => state.customTags);
	const rules = useBudgetStore((state) => state.rules);
	const isLoading = useBudgetStore((state) => state.isLoading);
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
	const [selectedRule, setSelectedRule] =
		useState<TransactionRule | null>(null);
	const [isCreating, setIsCreating] = useState(false);
	const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
	const [isDeletingAll, setIsDeletingAll] = useState(false);
	const [deleteAllError, setDeleteAllError] = useState<string | null>(null);
	const [activeDragRuleId, setActiveDragRuleId] =
		useState<string | null>(null);
	const [dragOverlay, setDragOverlay] =
		useState<ActiveRuleDrag | null>(null);
	const [dropIndex, setDropIndex] = useState<number | null>(null);
	const [isReordering, setIsReordering] = useState(false);
	const [reorderError, setReorderError] = useState<string | null>(null);

	const activeDragRef = useRef<ActiveRuleDrag | null>(null);
	const dropIndexRef = useRef<number | null>(null);
	const ruleCardElementsRef = useRef(
		new Map<string, HTMLDivElement>(),
	);

	useEffect(() => {
		void Promise.all([
			fetchTransactions(),
			fetchAccounts(),
			fetchMerchants(),
			fetchCustomCategories(),
		]);
	}, [
		fetchAccounts,
		fetchCustomCategories,
		fetchMerchants,
		fetchTransactions,
	]);

	const categoryNames = useMemo(() => {
		const result: string[] = [];
		const seen = new Set<string>();

		for (const children of Object.values(CATEGORY_HIERARCHY)) {
			for (const category of children) {
				const name = category.trim();
				const key = name.toLowerCase();

				if (!name || seen.has(key)) {
					continue;
				}

				seen.add(key);
				result.push(name);
			}
		}

		for (const category of customCategories) {
			if (!category.parent_name) {
				continue;
			}

			const name = category.name.trim();
			const key = name.toLowerCase();

			if (!name || seen.has(key)) {
				continue;
			}

			seen.add(key);
			result.push(name);
		}

		return result;
	}, [customCategories]);

	const filteredRules = useMemo(() => {
		const normalizedQuery = query.trim().toLowerCase();

		if (!normalizedQuery) {
			return rules;
		}

		return rules.filter((rule) => {
			return JSON.stringify(rule)
				.toLowerCase()
				.includes(normalizedQuery);
		});
	}, [query, rules]);

	const modalOpen = isCreating || selectedRule !== null;
	const dragDisabled =
		Boolean(query.trim()) || isReordering || rules.length < 2;

	const setDropTargetIndex = (nextIndex: number | null): void => {
		dropIndexRef.current = nextIndex;
		setDropIndex(nextIndex);
	};

	const cancelActiveDrag = (): void => {
		activeDragRef.current = null;
		dropIndexRef.current = null;
		setActiveDragRuleId(null);
		setDragOverlay(null);
		setDropIndex(null);
	};

	const registerRuleCardElement = (
		ruleId: string,
		element: HTMLDivElement | null,
	): void => {
		if (element) {
			ruleCardElementsRef.current.set(ruleId, element);
			return;
		}

		ruleCardElementsRef.current.delete(ruleId);
	};

	const handlePointerDragStart = (
		rule: TransactionRule,
		cardElement: HTMLDivElement,
		event: ReactPointerEvent<HTMLButtonElement>,
	): void => {
		if (dragDisabled || event.button !== 0) {
			return;
		}

		const sourceIndex = rules.findIndex((item) => item.id === rule.id);

		if (sourceIndex < 0) {
			return;
		}

		event.preventDefault();
		event.stopPropagation();

		const bounds = cardElement.getBoundingClientRect();
		const nextDrag: ActiveRuleDrag = {
			rule,
			pointerId: event.pointerId,
			sourceIndex,
			offsetX: Math.max(
				0,
				Math.min(bounds.width, event.clientX - bounds.left),
			),
			offsetY: Math.max(
				0,
				Math.min(bounds.height, event.clientY - bounds.top),
			),
			left: bounds.left,
			top: bounds.top,
			width: bounds.width,
			height: bounds.height,
		};

		activeDragRef.current = nextDrag;
		setReorderError(null);
		setDropTargetIndex(sourceIndex);
		setActiveDragRuleId(rule.id);
		setDragOverlay(nextDrag);
	};

	useEffect(() => {
		if (!activeDragRuleId || !activeDragRef.current) {
			return;
		}

		const previousUserSelect = document.body.style.userSelect;
		const previousCursor = document.body.style.cursor;
		// eslint-disable-next-line react-hooks/immutability
		document.body.style.userSelect = "none";
		// eslint-disable-next-line react-hooks/immutability
		document.body.style.cursor = "grabbing";

		const handlePointerMove = (event: PointerEvent): void => {
			const activeDrag = activeDragRef.current;

			if (!activeDrag || event.pointerId !== activeDrag.pointerId) {
				return;
			}

			event.preventDefault();

			const nextDrag = {
				...activeDrag,
				left: event.clientX - activeDrag.offsetX,
				top: event.clientY - activeDrag.offsetY,
			};

			activeDragRef.current = nextDrag;
			setDragOverlay(nextDrag);

			const remainingRules = rules.filter((rule) => {
				return rule.id !== activeDrag.rule.id;
			});
			let nextDropIndex = remainingRules.length;

			for (let index = 0; index < remainingRules.length; index += 1) {
				const element = ruleCardElementsRef.current.get(
					remainingRules[index].id,
				);

				if (!element) {
					continue;
				}

				const bounds = element.getBoundingClientRect();
				const midpoint = bounds.top + bounds.height / 2;

				if (event.clientY < midpoint) {
					nextDropIndex = index;
					break;
				}
			}

			if (dropIndexRef.current !== nextDropIndex) {
				dropIndexRef.current = nextDropIndex;
				setDropIndex(nextDropIndex);
			}
		};

		const finishDrag = (event: PointerEvent): void => {
			const activeDrag = activeDragRef.current;

			if (!activeDrag || event.pointerId !== activeDrag.pointerId) {
				return;
			}

			const currentRuleIds = rules.map((rule) => rule.id);
			const remainingRuleIds = currentRuleIds.filter((ruleId) => {
				return ruleId !== activeDrag.rule.id;
			});
			const requestedIndex =
				dropIndexRef.current ?? activeDrag.sourceIndex;
			const insertionIndex = Math.max(
				0,
				Math.min(requestedIndex, remainingRuleIds.length),
			);
			const nextRuleIds = [...remainingRuleIds];
			nextRuleIds.splice(insertionIndex, 0, activeDrag.rule.id);

			activeDragRef.current = null;
			dropIndexRef.current = null;
			setActiveDragRuleId(null);
			setDragOverlay(null);
			setDropIndex(null);

			if (arraysEqual(nextRuleIds, currentRuleIds)) {
				return;
			}

			setIsReordering(true);
			setReorderError(null);

			void reorderRules(nextRuleIds)
				.catch((error: unknown) => {
					setReorderError(
						error instanceof Error
							? error.message
							: "The rule order could not be saved.",
					);
				})
				.finally(() => {
					setIsReordering(false);
				});
		};

		const cancelDrag = (event: PointerEvent): void => {
			const activeDrag = activeDragRef.current;

			if (!activeDrag || event.pointerId !== activeDrag.pointerId) {
				return;
			}

			activeDragRef.current = null;
			dropIndexRef.current = null;
			setActiveDragRuleId(null);
			setDragOverlay(null);
			setDropIndex(null);
		};

		const handleKeyDown = (event: KeyboardEvent): void => {
			if (event.key !== "Escape") {
				return;
			}

			event.preventDefault();
			activeDragRef.current = null;
			dropIndexRef.current = null;
			setActiveDragRuleId(null);
			setDragOverlay(null);
			setDropIndex(null);
		};

		window.addEventListener("pointermove", handlePointerMove, {
			passive: false,
		});
		window.addEventListener("pointerup", finishDrag);
		window.addEventListener("pointercancel", cancelDrag);
		window.addEventListener("keydown", handleKeyDown);

		return () => {
			window.removeEventListener("pointermove", handlePointerMove);
			window.removeEventListener("pointerup", finishDrag);
			window.removeEventListener("pointercancel", cancelDrag);
			window.removeEventListener("keydown", handleKeyDown);
			document.body.style.userSelect = previousUserSelect;
			document.body.style.cursor = previousCursor;
		};
	}, [activeDragRuleId, reorderRules, rules]);

	const sortableRules = activeDragRuleId
		? filteredRules.filter((rule) => rule.id !== activeDragRuleId)
		: filteredRules;

	const handleDeleteAllRules = async (): Promise<void> => {
		if (isDeletingAll || rules.length === 0) {
			return;
		}

		setIsDeletingAll(true);
		setDeleteAllError(null);

		try {
			await deleteAllRules();
			setShowDeleteAllDialog(false);
			setSelectedRule(null);
			setIsCreating(false);
			setQuery("");
		} catch (error) {
			setDeleteAllError(
				error instanceof Error
					? error.message
					: "All rules could not be deleted.",
			);
		} finally {
			setIsDeletingAll(false);
		}
	};

	return (
		<SettingsContentCard
			title="Rules"
			actions={
				<DropdownMenu.Root>
					<DropdownMenu.Trigger asChild>
						<button
							type="button"
							className="inline-flex h-10 items-center gap-2 rounded-xl border border-black/10 bg-white px-4 text-sm font-semibold shadow-sm transition hover:bg-black/[0.03] data-[state=open]:bg-black/[0.04] dark:border-white/10 dark:bg-[#222220] dark:hover:bg-white/5 dark:data-[state=open]:bg-white/[0.07]"
						>
							Options
							<ChevronDown size={15} />
						</button>
					</DropdownMenu.Trigger>

					<DropdownMenu.Portal>
						<DropdownMenu.Content
							align="end"
							sideOffset={8}
							className="z-[400] min-w-48 rounded-2xl border border-black/10 bg-white p-2 shadow-[0_18px_50px_rgba(0,0,0,0.18)] outline-none dark:border-white/10 dark:bg-[#292927]"
						>
							<DropdownMenu.Item
								disabled={rules.length === 0}
								onSelect={() => {
									setDeleteAllError(null);
									setShowDeleteAllDialog(true);
								}}
								className="flex min-h-11 cursor-pointer select-none items-center gap-2 rounded-xl px-3 text-[15px] font-medium text-red-600 outline-none transition data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40 data-[highlighted]:bg-red-50 dark:text-red-400 dark:data-[highlighted]:bg-red-500/10"
							>
								<Trash2 size={17} />
								Delete all rules
							</DropdownMenu.Item>
						</DropdownMenu.Content>
					</DropdownMenu.Portal>
				</DropdownMenu.Root>
			}
		>
			<div className="p-6">
				<p className="max-w-4xl text-[16px] leading-7 text-[#333330] dark:text-[#d2d2ce]">
					Rules let you rename, recategorize, tag, hide, and update the review
					status of matching transactions. When multiple rules match, they are
					applied in the order shown.
				</p>

				<div className="mt-7 flex flex-wrap items-center justify-between gap-4">
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

					<div className="flex flex-1 items-center justify-end gap-3 sm:flex-none">
						<label className="relative min-w-0 flex-1 sm:w-72 sm:flex-none">
							<Search
								size={17}
								className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8a8a85]"
							/>
							<input
								value={query}
								onChange={(event) => {
									setQuery(event.target.value);
									cancelActiveDrag();
								}}
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
							className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-[#ff5a35] px-4 text-sm font-semibold text-white transition hover:bg-[#e94c28]"
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

				<div className="mt-4">
					{isLoading && rules.length === 0 ? (
						<div className="flex min-h-40 items-center justify-center gap-2 text-sm text-[#777671]">
							<Loader2 size={17} className="animate-spin" />
							Loading rules…
						</div>
					) : filteredRules.length === 0 ? (
						<div className="rounded-2xl border border-dashed border-gray-300 px-6 py-14 text-center dark:border-white/15">
							<p className="font-semibold">
								{rules.length === 0 ? "No rules yet" : "No matching rules"}
							</p>
							<p className="mt-1 text-sm text-[#777671] dark:text-[#aaa9a4]">
								Create a rule to automate transaction cleanup.
							</p>
						</div>
					) : (
						<div className="relative">
							{sortableRules.map((rule, index) => (
								<div key={rule.id}>
									<RuleInsertionSlot
										index={index}
										activeIndex={dropIndex}
										draggedCardHeight={dragOverlay?.height ?? 0}
									/>

									<RuleCard
										rule={rule}
										dragDisabled={dragDisabled}
										onEdit={() => {
											setIsCreating(false);
											setSelectedRule(rule);
										}}
										onElementChange={(element) => {
											registerRuleCardElement(rule.id, element);
										}}
										onDragHandlePointerDown={(event, cardElement) => {
											handlePointerDragStart(rule, cardElement, event);
										}}
									/>
								</div>
							))}

							<RuleInsertionSlot
								index={sortableRules.length}
								activeIndex={dropIndex}
								draggedCardHeight={dragOverlay?.height ?? 0}
							/>
						</div>
					)}
				</div>
			</div>

			{dragOverlay &&
				typeof document !== "undefined" &&
				createPortal(
					<RuleDragOverlay drag={dragOverlay} />,
					document.body,
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

			{showDeleteAllDialog && (
				<DeleteAllRulesDialog
					ruleCount={rules.length}
					isDeleting={isDeletingAll}
					errorMessage={deleteAllError}
					onCancel={() => {
						if (!isDeletingAll) {
							setShowDeleteAllDialog(false);
							setDeleteAllError(null);
						}
					}}
					onConfirm={() => {
						void handleDeleteAllRules();
					}}
				/>
			)}
		</SettingsContentCard>
	);
}


interface ActiveRuleDrag {
	rule: TransactionRule;
	pointerId: number;
	sourceIndex: number;
	offsetX: number;
	offsetY: number;
	left: number;
	top: number;
	width: number;
	height: number;
}

function RuleInsertionSlot({
	index,
	activeIndex,
	draggedCardHeight,
}: {
	index: number;
	activeIndex: number | null;
	draggedCardHeight: number;
}) {
	const restingHeight = index === 0 ? 0 : 16;
	const isActive = activeIndex === index && draggedCardHeight > 0;
	const height = isActive
		? restingHeight + draggedCardHeight
		: restingHeight;

	return (
		<div
			style={{ height }}
			className="w-full overflow-hidden transition-[height] duration-150 ease-out"
			aria-hidden="true"
		/>
	);
}

interface RuleCardProps {
	rule: TransactionRule;
	dragDisabled: boolean;
	onEdit: () => void;
	onElementChange: (element: HTMLDivElement | null) => void;
	onDragHandlePointerDown: (
		event: ReactPointerEvent<HTMLButtonElement>,
		cardElement: HTMLDivElement,
	) => void;
}

function RuleCard({
	rule,
	dragDisabled,
	onEdit,
	onElementChange,
	onDragHandlePointerDown,
}: RuleCardProps) {
	return (
		<div
			ref={onElementChange}
			data-rule-card
			className="grid w-full overflow-hidden rounded-2xl border border-gray-200 bg-white text-left transition hover:border-gray-300 hover:shadow-sm dark:border-white/10 dark:bg-[#222220] dark:hover:border-white/20 lg:grid-cols-[minmax(0,1fr)_42px_minmax(0,1fr)]"
		>
			<div className="flex min-w-0 gap-2 px-3 py-4 sm:px-4">
				<button
					type="button"
					onPointerDown={(event) => {
						const cardElement = event.currentTarget.closest(
							"[data-rule-card]",
						) as HTMLDivElement | null;

						if (!cardElement) {
							return;
						}

						onDragHandlePointerDown(event, cardElement);
					}}
					onClick={(event) => {
						event.stopPropagation();
					}}
					disabled={dragDisabled}
					aria-label={`Drag ${rule.name} to change its order`}
					title={
						dragDisabled
							? "Clear search to reorder rules"
							: "Drag to reorder"
					}
					className="self-center mt-0.5 flex h-8 w-7 touch-none shrink-0 items-center justify-center rounded-lg text-[#9a9a95] transition hover:bg-black/[0.05] hover:text-[#555550] active:cursor-grabbing disabled:cursor-default disabled:opacity-45 dark:hover:bg-white/[0.07] dark:hover:text-[#d2d2ce] enabled:cursor-grab"
				>
					<GripVertical size={17} />
				</button>

				<button
					type="button"
					onClick={onEdit}
					className="min-w-0 flex-1 space-y-2 text-left outline-none"
				>
					{renderCriteria(rule)}
				</button>
			</div>

			<div className="hidden items-center justify-center border-x border-gray-200 bg-[#fafaf8] dark:border-white/10 dark:bg-white/[0.025] lg:flex">
				<ArrowRight size={18} className="text-[#777671]" />
			</div>

			<button
				type="button"
				onClick={onEdit}
				className="min-w-0 border-t border-gray-200 px-4 py-4 text-left outline-none dark:border-white/10 sm:px-5 lg:border-l-0 lg:border-t-0"
			>
				<div className="space-y-2">{renderActions(rule)}</div>
			</button>
		</div>
	);
}

function RuleDragOverlay({ drag }: { drag: ActiveRuleDrag }) {
	return (
		<div
			aria-hidden="true"
			style={{
				left: drag.left,
				top: drag.top,
				width: drag.width,
				height: drag.height,
			}}
			className="pointer-events-none fixed z-[600] grid overflow-hidden rounded-2xl border border-gray-200 bg-white text-left opacity-100 shadow-[0_18px_48px_rgba(0,0,0,0.18)] dark:border-white/10 dark:bg-[#222220] lg:grid-cols-[minmax(0,1fr)_42px_minmax(0,1fr)]"
		>
			<div className="flex min-w-0 gap-2 px-3 py-4 sm:px-4">
				<div className="mt-0.5 flex h-8 w-7 shrink-0 items-center justify-center text-[#9a9a95]">
					<GripVertical size={17} />
				</div>

				<div className="min-w-0 flex-1 space-y-2 text-left">
					{renderCriteria(drag.rule)}
				</div>
			</div>

			<div className="hidden items-center justify-center border-x border-gray-200 bg-[#fafaf8] dark:border-white/10 dark:bg-white/[0.025] lg:flex">
				<ArrowRight size={18} className="text-[#777671]" />
			</div>

			<div className="min-w-0 border-t border-gray-200 px-4 py-4 text-left dark:border-white/10 sm:px-5 lg:border-l-0 lg:border-t-0">
				<div className="space-y-2">{renderActions(drag.rule)}</div>
			</div>
		</div>
	);
}

function DeleteAllRulesDialog({
	ruleCount,
	isDeleting,
	errorMessage,
	onCancel,
	onConfirm,
}: {
	ruleCount: number;
	isDeleting: boolean;
	errorMessage: string | null;
	onCancel: () => void;
	onConfirm: () => void;
}) {
	if (typeof document === "undefined") {
		return null;
	}

	return createPortal(
		<div className="fixed inset-0 z-[500] grid place-items-center bg-black/45 p-4 backdrop-blur-[1px]">
			<button
				type="button"
				aria-label="Close delete all rules confirmation"
				className="absolute inset-0"
				onClick={onCancel}
			/>

			<section
				role="alertdialog"
				aria-modal="true"
				aria-labelledby="delete-all-rules-title"
				aria-describedby="delete-all-rules-description"
				className="relative w-full max-w-md overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_26px_80px_rgba(0,0,0,0.28)] dark:border-white/10 dark:bg-[#262624]"
			>
				<div className="flex items-start justify-between gap-4 px-6 pb-4 pt-6">
					<div className="flex min-w-0 gap-3">
						<span className="grid size-10 shrink-0 place-items-center rounded-full bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">
							<AlertTriangle size={20} />
						</span>
						<div>
							<h2
								id="delete-all-rules-title"
								className="text-xl font-semibold"
							>
								Delete all rules?
							</h2>
							<p
								id="delete-all-rules-description"
								className="mt-2 text-sm leading-6 text-[#6f6f69] dark:text-[#aaa9a4]"
							>
								This permanently deletes all {ruleCount} {ruleCount === 1 ? "rule" : "rules"}.
								Existing transaction changes will not be reversed.
							</p>
						</div>
					</div>

					<button
						type="button"
						onClick={onCancel}
						disabled={isDeleting}
						className="grid size-9 shrink-0 place-items-center rounded-full transition hover:bg-black/[0.05] disabled:opacity-50 dark:hover:bg-white/10"
						aria-label="Close"
					>
						<X size={19} />
					</button>
				</div>

				{errorMessage && (
					<div className="mx-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
						{errorMessage}
					</div>
				)}

				<div className="mt-5 flex justify-end gap-3 border-t border-black/[0.06] px-6 py-4 dark:border-white/10">
					<button
						type="button"
						onClick={onCancel}
						disabled={isDeleting}
						className="h-10 rounded-xl border border-gray-300 px-4 text-sm font-semibold transition hover:bg-gray-50 disabled:opacity-50 dark:border-white/15 dark:hover:bg-white/5"
					>
						Cancel
					</button>
					<button
						type="button"
						onClick={onConfirm}
						disabled={isDeleting}
						className="inline-flex h-10 min-w-32 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
					>
						{isDeleting && <Loader2 size={15} className="animate-spin" />}
						Delete all
					</button>
				</div>
			</section>
		</div>,
		document.body,
	);
}

function renderCriteria(rule: TransactionRule) {
	const rows: React.ReactNode[] = [];

	if (rule.criteria.originalStatement) {
		rows.push(
			<RuleSentence key="original-statement" label="original statement">
				<Pill>{TEXT_OPERATOR_LABELS[rule.criteria.originalStatement.operator]}</Pill>
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
			<div key="category" className="flex flex-wrap items-center gap-2 text-[15px]">
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
			<div key="merchant" className="flex flex-wrap items-center gap-2 text-[15px]">
				<span>Rename to</span>
				<Pill>{rule.actions.renameMerchant.name}</Pill>
			</div>,
		);
	}

	for (const tag of rule.actions.addTags ?? []) {
		rows.push(
			<div key={`tag-${tag}`} className="flex flex-wrap items-center gap-2 text-[15px]">
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
			<div key="review" className="flex flex-wrap items-center gap-2 text-[15px]">
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
		<div className="flex flex-wrap items-center gap-2 text-[15px]">
			<span>If</span>
			<Pill>{label}</Pill>
			{children}
		</div>
	);
}

function Pill({ children }: { children: React.ReactNode }) {
	return (
		<span className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-black/[0.07] bg-[#f7f7f5] px-2.5 py-1 text-[15px] leading-6 dark:border-white/10 dark:bg-white/[0.06]">
			{children}
		</span>
	);
}
