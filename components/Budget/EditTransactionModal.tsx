"use client";

import React, {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { createPortal } from "react-dom";
import {
	AlertCircle,
	BotMessageSquare,
	Calendar,
	Check,
	ChevronDown,
	CircleMinus,
	CirclePlus,
	Edit3,
	Landmark,
	Loader2,
	Plus,
	Search,
	Tag,
	Trash2,
	X,
	Zap,
} from "lucide-react";

import { CategorySelector } from "@/components/CategorySelector";
import { CategoryIcon } from "@/components/CategoryIcon";
import { CreateRuleModal } from "@/components/Transactions/CreateRuleModal";
import {
	type Rule,
	type Transaction,
	useBudgetStore,
} from "@/store/useBudgetStore";
import { findParentCategory, getCategoryTheme } from "@/constants";
import { getInitialDisplayAmount, parseAmountInput } from "@/utils/formatters";

interface EditTransactionModalProps {
	transaction: Transaction;
	isOpen: boolean;
	onClose: () => void;
	onUpdate: (id: string, updates: Partial<Transaction>) => Promise<void> | void;
	onRuleSaved: (count: number, snapshot: Transaction[]) => void;
}

type TransactionDirection = "debit" | "credit";
type ModalView = "transaction" | "rules";

const normalize = (value: string): string => {
	return value.trim().toLowerCase().replace(/\s+/g, " ");
};

const getComparableTransaction = (transaction: Transaction) => {
	return {
		date: transaction.date,
		merchant: transaction.merchant.trim(),
		description: transaction.description ?? "",
		amount: Number(transaction.amount),
		category: transaction.category,
		account: transaction.account,
		account_id: transaction.account_id ?? null,
		needs_review: transaction.needs_review,
		needs_subcat: transaction.needs_subcat,
		tags: [...(transaction.tags ?? [])].sort(),
	};
};

export default function EditTransactionModal({
	transaction,
	isOpen,
	onClose,
	onUpdate,
	onRuleSaved,
}: EditTransactionModalProps) {
	const transactions = useBudgetStore((state) => state.transactions);
	const accounts = useBudgetStore((state) => state.accounts);
	const merchants = useBudgetStore((state) => state.merchants);
	const customTags = useBudgetStore((state) => state.customTags);
	const rules = useBudgetStore((state) => state.rules);
	const addTransactions = useBudgetStore((state) => state.addTransactions);
	const fetchAccounts = useBudgetStore((state) => state.fetchAccounts);
	const fetchMerchants = useBudgetStore((state) => state.fetchMerchants);
	const addCustomTag = useBudgetStore((state) => state.addCustomTag);
	const deleteRule = useBudgetStore((state) => state.deleteRule);

	const isNew = !transactions.some((item) => {
		return item.id === transaction.id;
	});

	const [view, setView] = useState<ModalView>("transaction");
	const [editedData, setEditedData] = useState<Transaction>(() => ({
		...transaction,
	}));
	const [direction, setDirection] = useState<TransactionDirection>(
		transaction.amount >= 0 ? "credit" : "debit",
	);
	const [displayAmount, setDisplayAmount] = useState(() => {
		return getInitialDisplayAmount(Math.abs(transaction.amount));
	});
	const [isSaving, setIsSaving] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);
	const [attemptedSave, setAttemptedSave] = useState(false);
	const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
	const [merchantQuery, setMerchantQuery] = useState(
		() => transaction.merchant ?? "",
	);
	const [merchantOpen, setMerchantOpen] = useState(false);
	const [activeMerchantIndex, setActiveMerchantIndex] = useState(0);
	const [tagQuery, setTagQuery] = useState("");
	const [tagOpen, setTagOpen] = useState(false);
	const [ruleSuggestion, setRuleSuggestion] = useState<string | null>(null);
	const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
	const [ruleToEdit, setRuleToEdit] = useState<Rule | null>(null);
	const [ruleSearch, setRuleSearch] = useState("");
	const [deletingRule, setDeletingRule] = useState<string | null>(null);

	const amountInputRef = useRef<HTMLInputElement>(null);
	const merchantInputRef = useRef<HTMLInputElement>(null);
	const tagInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (!isOpen) {
			return;
		}

		void Promise.all([fetchAccounts(), fetchMerchants()]);
	}, [isOpen, fetchAccounts, fetchMerchants]);

	useEffect(() => {
		if (!isOpen) {
			return;
		}

		const frame = window.requestAnimationFrame(() => {
			amountInputRef.current?.focus();
			amountInputRef.current?.select();
		});

		return () => {
			window.cancelAnimationFrame(frame);
		};
	}, [isOpen]);

	useEffect(() => {
		if (!isOpen) {
			return;
		}

		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";

		return () => {
			document.body.style.overflow = previousOverflow;
		};
	}, [isOpen]);

	useEffect(() => {
		if (!deletingRule) {
			return;
		}

		const timer = window.setTimeout(() => {
			setDeletingRule(null);
		}, 5000);

		return () => {
			window.clearTimeout(timer);
		};
	}, [deletingRule]);

	const allMerchantNames = useMemo(() => {
		const byNormalizedName = new Map<string, string>();

		for (const merchant of merchants) {
			const name = merchant.name.trim();

			if (name) {
				byNormalizedName.set(normalize(name), name);
			}
		}

		for (const item of transactions) {
			const name = item.merchant.trim();

			if (name && !byNormalizedName.has(normalize(name))) {
				byNormalizedName.set(normalize(name), name);
			}
		}

		return Array.from(byNormalizedName.values()).sort((first, second) => {
			return first.localeCompare(second);
		});
	}, [merchants, transactions]);

	const filteredMerchants = useMemo(() => {
		const query = normalize(merchantQuery);

		if (!query) {
			return allMerchantNames.slice(0, 8);
		}

		return allMerchantNames
			.filter((name) => {
				return normalize(name).includes(query);
			})
			.slice(0, 8);
	}, [allMerchantNames, merchantQuery]);

	const exactMerchantExists = useMemo(() => {
		const query = normalize(merchantQuery);

		return Boolean(
			query &&
			allMerchantNames.some((name) => {
				return normalize(name) === query;
			}),
		);
	}, [allMerchantNames, merchantQuery]);

	const availableTags = useMemo(() => {
		const selected = new Set(
			(editedData.tags ?? []).map((tagName) => normalize(tagName)),
		);
		const query = normalize(tagQuery);

		return customTags
			.filter((tagName) => {
				const normalizedTag = normalize(tagName);

				return (
					!selected.has(normalizedTag) &&
					(!query || normalizedTag.includes(query))
				);
			})
			.slice(0, 8);
	}, [customTags, editedData.tags, tagQuery]);

	const filteredRules = useMemo(() => {
		const query = normalize(ruleSearch);

		if (!query) {
			return rules;
		}

		return rules.filter((rule) => {
			return (
				normalize(rule.keyword).includes(query) ||
				normalize(rule.category).includes(query) ||
				normalize(rule.matchCategory ?? "").includes(query)
			);
		});
	}, [ruleSearch, rules]);

	const selectedAccount = useMemo(() => {
		return accounts.find((account) => {
			return account.id === editedData.account_id;
		});
	}, [accounts, editedData.account_id]);

	const numericAmount = Math.abs(Number(editedData.amount) || 0);

	const validation = useMemo(() => {
		return {
			amount: numericAmount > 0 ? null : "Enter an amount greater than $0.",
			merchant: editedData.merchant.trim()
				? null
				: "Enter or select a merchant.",
			date: editedData.date ? null : "Select a transaction date.",
			account: editedData.account_id ? null : "Select an account.",
		};
	}, [
		editedData.account_id,
		editedData.date,
		editedData.merchant,
		numericAmount,
	]);

	const hasValidationErrors = Object.values(validation).some(Boolean);

	const hasUnsavedChanges = useMemo(() => {
		return (
			JSON.stringify(getComparableTransaction(editedData)) !==
			JSON.stringify(getComparableTransaction(transaction))
		);
	}, [editedData, transaction]);

	const applyDirection = useCallback(
		(nextDirection: TransactionDirection, absoluteAmount = numericAmount) => {
			setDirection(nextDirection);
			setEditedData((current) => {
				return {
					...current,
					amount:
						nextDirection === "debit"
							? -Math.abs(absoluteAmount)
							: Math.abs(absoluteAmount),
				};
			});
		},
		[numericAmount],
	);

	const applyRuleSuggestion = useCallback(
		(merchantName: string) => {
			if (!isNew || merchantName.trim().length < 2) {
				setRuleSuggestion(null);
				return;
			}

			const normalizedMerchant = normalize(merchantName);
			const matchingRule = rules.find((rule) => {
				return normalizedMerchant.includes(normalize(rule.keyword));
			});

			if (!matchingRule) {
				setRuleSuggestion(null);
				return;
			}

			setEditedData((current) => {
				return {
					...current,
					category: matchingRule.category,
				};
			});
			setRuleSuggestion(matchingRule.category);
		},
		[isNew, rules],
	);

	const selectMerchant = useCallback(
		(name: string) => {
			setMerchantQuery(name);
			setEditedData((current) => {
				return {
					...current,
					merchant: name,
				};
			});
			setMerchantOpen(false);
			setActiveMerchantIndex(0);
			applyRuleSuggestion(name);
		},
		[applyRuleSuggestion],
	);

	const toggleTag = useCallback((tagName: string) => {
		const cleanTag = tagName.trim();

		if (!cleanTag) {
			return;
		}

		setEditedData((current) => {
			const currentTags = current.tags ?? [];
			const exists = currentTags.some((existingTag) => {
				return normalize(existingTag) === normalize(cleanTag);
			});

			return {
				...current,
				tags: exists
					? currentTags.filter((existingTag) => {
							return normalize(existingTag) !== normalize(cleanTag);
						})
					: [...currentTags, cleanTag],
			};
		});
	}, []);

	const createTag = useCallback(() => {
		const cleanTag = tagQuery.trim();

		if (!cleanTag) {
			return;
		}

		addCustomTag(cleanTag);
		toggleTag(cleanTag);
		setTagQuery("");
		setTagOpen(false);
	}, [addCustomTag, tagQuery, toggleTag]);

	const requestClose = useCallback(() => {
		if (isSaving) {
			return;
		}

		if (hasUnsavedChanges) {
			setShowDiscardConfirm(true);
			return;
		}

		onClose();
	}, [hasUnsavedChanges, isSaving, onClose]);

	const handleSave = useCallback(async () => {
		setAttemptedSave(true);
		setSaveError(null);

		if (hasValidationErrors || isSaving) {
			return;
		}

		setIsSaving(true);

		const cleanMerchant = editedData.merchant.trim();
		const cleanDescription = editedData.description?.trim() ?? "";
		const cleanTags = (editedData.tags ?? [])
			.map((tagName) => tagName.trim())
			.filter(Boolean);
		const accountName = selectedAccount?.name ?? editedData.account.trim();
		const absoluteAmount = Math.abs(Number(editedData.amount));
		const preparedTransaction: Transaction = {
			...editedData,
			merchant: cleanMerchant,
			description: cleanDescription,
			tags: cleanTags,
			account: accountName,
			amount: direction === "debit" ? -absoluteAmount : absoluteAmount,
			category: editedData.category || "Uncategorized",
		};
		const snapshot = [...transactions];

		try {
			if (isNew) {
				await addTransactions([preparedTransaction]);
			} else {
				await onUpdate(preparedTransaction.id, preparedTransaction);
			}

			onRuleSaved?.(1, snapshot);
			onClose();
		} catch (error) {
			console.error("Failed to save transaction:", error);
			setSaveError(
				error instanceof Error
					? error.message
					: "Failed to save the transaction. Please try again.",
			);
		} finally {
			setIsSaving(false);
		}
	}, [
		addTransactions,
		direction,
		editedData,
		hasValidationErrors,
		isNew,
		isSaving,
		onClose,
		onRuleSaved,
		onUpdate,
		selectedAccount?.name,
		transactions,
	]);

	useEffect(() => {
		if (!isOpen) {
			return;
		}

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				if (showDiscardConfirm) {
					setShowDiscardConfirm(false);
					return;
				}

				if (merchantOpen || tagOpen) {
					setMerchantOpen(false);
					setTagOpen(false);
					return;
				}

				requestClose();
				return;
			}

			if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
				event.preventDefault();
				void handleSave();
			}
		};

		window.addEventListener("keydown", handleKeyDown);

		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [
		handleSave,
		isOpen,
		merchantOpen,
		requestClose,
		showDiscardConfirm,
		tagOpen,
	]);

	if (!isOpen || typeof document === "undefined") {
		return null;
	}

	return createPortal(
		<div
			className="fixed inset-0 z-100 flex items-center justify-center p-3 sm:p-6"
			role="presentation"
		>
			<button
				type="button"
				aria-label="Close transaction dialog"
				className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
				onClick={requestClose}
			/>

			<section
				role="dialog"
				aria-modal="true"
				aria-labelledby="transaction-dialog-title"
				className="relative flex max-h-[92vh] w-full max-w-185 flex-col overflow-hidden rounded-2xl border border-black/10 bg-white text-gray-900 shadow-[0_24px_80px_rgba(0,0,0,0.25)] dark:border-white/10 dark:bg-[#151515] dark:text-white"
			>
				<header className="flex shrink-0 items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-white/10 sm:px-7">
					<div className="min-w-0">
						<h2
							id="transaction-dialog-title"
							className="truncate text-xl font-semibold tracking-tight"
						>
							{view === "rules"
								? "Transaction rules"
								: isNew
									? "Add transaction"
									: "Edit transaction"}
						</h2>
						{view === "transaction" && (
							<p className="mt-0.5 hidden text-xs text-gray-500 sm:block dark:text-gray-400">
								Use Ctrl/⌘ + Enter to save
							</p>
						)}
					</div>

					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={() => {
								setView((current) => {
									return current === "transaction" ? "rules" : "transaction";
								});
							}}
							className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900 sm:flex dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5 dark:hover:text-white"
						>
							<BotMessageSquare size={16} />
							{view === "transaction" ? "Rules" : "Transaction"}
						</button>

						<button
							type="button"
							onClick={requestClose}
							className="grid size-10 place-items-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white"
							aria-label="Close"
						>
							<X size={21} />
						</button>
					</div>
				</header>

				{view === "rules" ? (
					<RulesPanel
						rules={filteredRules}
						searchQuery={ruleSearch}
						onSearchQueryChange={setRuleSearch}
						deletingRule={deletingRule}
						onCancelDelete={() => {
							setDeletingRule(null);
						}}
						onRequestDelete={setDeletingRule}
						onConfirmDelete={(keyword) => {
							void deleteRule(keyword);
							setDeletingRule(null);
						}}
						onCreateRule={() => {
							setRuleToEdit(null);
							setIsRuleModalOpen(true);
						}}
						onEditRule={(rule) => {
							setRuleToEdit(rule);
							setIsRuleModalOpen(true);
						}}
					/>
				) : (
					<form
						className="flex min-h-0 flex-1 flex-col"
						onSubmit={(event) => {
							event.preventDefault();
							void handleSave();
						}}
					>
						<div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
							<div className="space-y-5">
								<div
									className="grid grid-cols-2 rounded-xl bg-gray-100 p-1 dark:bg-white/5"
									aria-label="Transaction type"
								>
									<DirectionButton
										active={direction === "debit"}
										label="Debit"
										icon={<CircleMinus size={18} />}
										onClick={() => {
											applyDirection("debit");
										}}
									/>
									<DirectionButton
										active={direction === "credit"}
										label="Credit"
										icon={<CirclePlus size={18} />}
										onClick={() => {
											applyDirection("credit");
										}}
									/>
								</div>

								<FieldGroup
									label="Amount"
									error={attemptedSave ? validation.amount : null}
								>
									<div className="relative">
										<span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-gray-400">
											$
										</span>
										<input
											ref={amountInputRef}
											type="text"
											inputMode="decimal"
											autoComplete="off"
											placeholder="0.00"
											value={displayAmount}
											onChange={(event) => {
												const { displayString, numericValue } =
													parseAmountInput(event.target.value);

												setDisplayAmount(displayString);
												setEditedData((current) => {
													return {
														...current,
														amount:
															direction === "debit"
																? -Math.abs(numericValue)
																: Math.abs(numericValue),
													};
												});
											}}
											className="h-14 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-4 text-xl font-semibold outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 dark:border-white/10 dark:bg-white/3"
										/>
									</div>
								</FieldGroup>

								<FieldGroup
									label="Merchant"
									error={attemptedSave ? validation.merchant : null}
								>
									<div className="relative">
										<Search
											size={18}
											className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-gray-400"
										/>
										<input
											ref={merchantInputRef}
											type="text"
											autoComplete="off"
											placeholder="Search merchants or enter a new one"
											value={merchantQuery}
											onFocus={() => {
												setMerchantOpen(true);
											}}
											onBlur={() => {
												window.setTimeout(() => {
													setMerchantOpen(false);
												}, 120);
											}}
											onChange={(event) => {
												const name = event.target.value;
												setMerchantQuery(name);
												setMerchantOpen(true);
												setActiveMerchantIndex(0);
												setEditedData((current) => {
													return {
														...current,
														merchant: name,
													};
												});
												applyRuleSuggestion(name);
											}}
											onKeyDown={(event) => {
												const optionCount =
													filteredMerchants.length +
													(merchantQuery.trim() && !exactMerchantExists
														? 1
														: 0);

												if (event.key === "ArrowDown") {
													event.preventDefault();
													setMerchantOpen(true);
													setActiveMerchantIndex((current) => {
														return optionCount
															? (current + 1) % optionCount
															: 0;
													});
												}

												if (event.key === "ArrowUp") {
													event.preventDefault();
													setActiveMerchantIndex((current) => {
														return optionCount
															? (current - 1 + optionCount) % optionCount
															: 0;
													});
												}

												if (event.key === "Enter" && merchantOpen) {
													event.preventDefault();
													const selectedName =
														filteredMerchants[activeMerchantIndex] ??
														merchantQuery.trim();

													if (selectedName) {
														selectMerchant(selectedName);
													}
												}
											}}
											className="h-13 w-full rounded-xl border border-gray-200 bg-white pl-11 pr-11 text-[15px] outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 dark:border-white/10 dark:bg-white/3"
										/>
										<ChevronDown
											size={18}
											className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
										/>

										{merchantOpen && (
											<div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 max-h-64 overflow-y-auto rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl dark:border-white/10 dark:bg-[#202020]">
												{filteredMerchants.map((name, index) => {
													return (
														<button
															type="button"
															key={name}
															onMouseDown={(event) => {
																event.preventDefault();
																selectMerchant(name);
															}}
															className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
																index === activeMerchantIndex
																	? "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300"
																	: "hover:bg-gray-50 dark:hover:bg-white/5"
															}`}
														>
															<span className="truncate">{name}</span>
															{normalize(name) ===
																normalize(editedData.merchant) && (
																<Check
																	size={16}
																	className="shrink-0 text-orange-500"
																/>
															)}
														</button>
													);
												})}

												{merchantQuery.trim() && !exactMerchantExists && (
													<button
														type="button"
														onMouseDown={(event) => {
															event.preventDefault();
															selectMerchant(merchantQuery.trim());
														}}
														className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-orange-600 transition-colors hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-500/10"
													>
														<Plus size={16} />
														Use “{merchantQuery.trim()}”
													</button>
												)}

												{filteredMerchants.length === 0 &&
													!merchantQuery.trim() && (
														<p className="px-3 py-4 text-center text-sm text-gray-500">
															No merchants yet.
														</p>
													)}
											</div>
										)}
									</div>

									{ruleSuggestion && (
										<div className="mt-2 flex items-center gap-2 rounded-lg bg-orange-50 px-3 py-2 text-xs text-orange-700 dark:bg-orange-500/10 dark:text-orange-300">
											<Zap size={14} className="fill-current" />
											Category set to <strong>{ruleSuggestion}</strong> by a
											matching rule.
										</div>
									)}
								</FieldGroup>

								<div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
									<FieldGroup
										label="Date"
										error={attemptedSave ? validation.date : null}
									>
										<div className="relative">
											<Calendar
												size={17}
												className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
											/>
											<input
												type="date"
												value={editedData.date}
												onChange={(event) => {
													setEditedData((current) => {
														return {
															...current,
															date: event.target.value,
														};
													});
												}}
												className="h-13 w-full rounded-xl border border-gray-200 bg-white pl-11 pr-3 text-sm outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 dark:border-white/10 dark:bg-white/3"
											/>
										</div>
									</FieldGroup>

									<FieldGroup
										label="Account"
										error={attemptedSave ? validation.account : null}
									>
										<div className="relative">
											<Landmark
												size={17}
												className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
											/>
											<select
												value={editedData.account_id ?? ""}
												onChange={(event) => {
													const account = accounts.find((item) => {
														return item.id === event.target.value;
													});

													setEditedData((current) => {
														return {
															...current,
															account_id: account?.id ?? null,
															account: account?.name ?? "",
														};
													});
												}}
												className="h-13 w-full appearance-none rounded-xl border border-gray-200 bg-white pl-11 pr-10 text-sm outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 dark:border-white/10 dark:bg-[#1a1a1a]"
											>
												<option value="">Select account…</option>
												{accounts.map((account) => {
													return (
														<option key={account.id} value={account.id}>
															{account.name}
														</option>
													);
												})}
											</select>
											<ChevronDown
												size={17}
												className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
											/>
										</div>
									</FieldGroup>
								</div>

								<FieldGroup label="Category">
									<div className="rounded-xl border border-gray-200 dark:border-gray-800">
										<CategorySelector
											currentCategory={editedData.category}
											placeholder="Search categories..."
											showChevron
											onSelect={(sub) => {
												setEditedData({
													...editedData,
													category: sub,
												});
											}}
										/>
									</div>
								</FieldGroup>

								<FieldGroup label="Notes" optional>
									<textarea
										value={editedData.description ?? ""}
										onChange={(event) => {
											setEditedData((current) => {
												return {
													...current,
													description: event.target.value,
												};
											});
										}}
										placeholder="Add a note…"
										rows={3}
										className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 dark:border-white/10 dark:bg-white/[0.03]"
									/>
								</FieldGroup>

								<FieldGroup label="Tags" optional>
									<div className="relative">
										<div className="flex min-h-[52px] flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 transition focus-within:border-orange-500 focus-within:ring-4 focus-within:ring-orange-500/10 dark:border-white/10 dark:bg-white/[0.03]">
											<Tag size={16} className="shrink-0 text-gray-400" />
											{(editedData.tags ?? []).map((tagName) => {
												return (
													<span
														key={tagName}
														className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium dark:bg-white/10"
													>
														{tagName}
														<button
															type="button"
															onClick={() => {
																toggleTag(tagName);
															}}
															className="rounded-full p-0.5 text-gray-400 hover:bg-black/10 hover:text-gray-700 dark:hover:bg-white/10 dark:hover:text-white"
															aria-label={`Remove ${tagName} tag`}
														>
															<X size={12} />
														</button>
													</span>
												);
											})}
											<input
												ref={tagInputRef}
												type="text"
												value={tagQuery}
												onFocus={() => {
													setTagOpen(true);
												}}
												onBlur={() => {
													window.setTimeout(() => {
														setTagOpen(false);
													}, 120);
												}}
												onChange={(event) => {
													setTagQuery(event.target.value);
													setTagOpen(true);
												}}
												onKeyDown={(event) => {
													if (event.key === "Enter") {
														event.preventDefault();
														if (availableTags[0]) {
															toggleTag(availableTags[0]);
															setTagQuery("");
														} else {
															createTag();
														}
													}
												}}
												placeholder={
													(editedData.tags ?? []).length
														? "Add another…"
														: "Search or create tags…"
												}
												className="min-w-32 flex-1 bg-transparent py-1 text-sm outline-none placeholder:text-gray-400"
											/>
										</div>

										{tagOpen &&
											(availableTags.length > 0 || tagQuery.trim()) && (
												<div className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl dark:border-white/10 dark:bg-[#202020]">
													{availableTags.map((tagName) => {
														return (
															<button
																type="button"
																key={tagName}
																onMouseDown={(event) => {
																	event.preventDefault();
																	toggleTag(tagName);
																	setTagQuery("");
																}}
																className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-white/5"
															>
																<Tag size={14} className="text-gray-400" />
																{tagName}
															</button>
														);
													})}

													{tagQuery.trim() &&
														!customTags.some((tagName) => {
															return normalize(tagName) === normalize(tagQuery);
														}) && (
															<button
																type="button"
																onMouseDown={(event) => {
																	event.preventDefault();
																	createTag();
																}}
																className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-500/10"
															>
																<Plus size={15} />
																Create “{tagQuery.trim()}”
															</button>
														)}
												</div>
											)}
									</div>
								</FieldGroup>

								<label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 p-3.5 transition-colors hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/[0.03]">
									<input
										type="checkbox"
										checked={editedData.needs_review}
										onChange={(event) => {
											setEditedData((current) => {
												return {
													...current,
													needs_review: event.target.checked,
												};
											});
										}}
										className="mt-0.5 size-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
									/>
									<span>
										<span className="block text-sm font-medium">
											Needs review
										</span>
										<span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">
											Keep this transaction in the review queue.
										</span>
									</span>
								</label>

								{!isNew && (
									<button
										type="button"
										onClick={() => {
											setRuleToEdit(null);
											setIsRuleModalOpen(true);
										}}
										className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 px-4 py-3 text-sm font-medium text-gray-600 transition hover:border-orange-400 hover:bg-orange-50 hover:text-orange-600 dark:border-white/15 dark:text-gray-300 dark:hover:bg-orange-500/10 dark:hover:text-orange-300"
									>
										<Zap size={16} />
										Create a rule from this transaction
									</button>
								)}
							</div>
						</div>

						{saveError && (
							<div className="mx-5 mb-3 flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300 sm:mx-7">
								<AlertCircle size={18} className="mt-0.5 shrink-0" />
								<span>{saveError}</span>
							</div>
						)}

						<footer className="flex shrink-0 items-center justify-end gap-3 border-t border-gray-200 bg-white px-5 py-4 dark:border-white/10 dark:bg-[#151515] sm:px-7">
							<button
								type="button"
								onClick={requestClose}
								disabled={isSaving}
								className="h-11 rounded-xl border border-gray-200 px-5 text-sm font-semibold transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:hover:bg-white/5"
							>
								Cancel
							</button>
							<button
								type="submit"
								disabled={isSaving}
								className="inline-flex h-11 min-w-36 items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
							>
								{isSaving && <Loader2 size={17} className="animate-spin" />}
								{isSaving
									? "Saving…"
									: isNew
										? "Add transaction"
										: "Save changes"}
							</button>
						</footer>
					</form>
				)}

				{showDiscardConfirm && (
					<div className="absolute inset-0 z-40 grid place-items-center bg-white/70 p-5 backdrop-blur-sm dark:bg-black/60">
						<div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-[#202020]">
							<h3 className="text-lg font-semibold">Discard changes?</h3>
							<p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
								Your unsaved transaction changes will be lost.
							</p>
							<div className="mt-5 flex justify-end gap-2">
								<button
									type="button"
									onClick={() => {
										setShowDiscardConfirm(false);
									}}
									className="h-10 rounded-xl border border-gray-200 px-4 text-sm font-semibold hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5"
								>
									Keep editing
								</button>
								<button
									type="button"
									onClick={onClose}
									className="h-10 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-500"
								>
									Discard
								</button>
							</div>
						</div>
					</div>
				)}

				<CreateRuleModal
					key={
						ruleToEdit ? `edit-${ruleToEdit.keyword}` : `new-${editedData.id}`
					}
					isOpen={isRuleModalOpen}
					onClose={() => {
						setIsRuleModalOpen(false);
						setRuleToEdit(null);
					}}
					initialName={ruleToEdit?.keyword ?? editedData.merchant}
					initialCategory={ruleToEdit?.category ?? editedData.category}
					onSaveSuccess={(count, snapshot) => {
						onRuleSaved(count, snapshot);
						setIsRuleModalOpen(false);
						setRuleToEdit(null);
					}}
				/>
			</section>
		</div>,
		document.body,
	);
}

interface DirectionButtonProps {
	active: boolean;
	label: string;
	icon: React.ReactNode;
	onClick: () => void;
}

function DirectionButton({
	active,
	label,
	icon,
	onClick,
}: DirectionButtonProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			aria-pressed={active}
			className={`flex h-11 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition ${
				active
					? "bg-white text-gray-900 shadow-sm dark:bg-[#2a2a2a] dark:text-white"
					: "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
			}`}
		>
			{icon}
			{label}
		</button>
	);
}

interface FieldGroupProps {
	label: string;
	children: React.ReactNode;
	error?: string | null;
	optional?: boolean;
}

function FieldGroup({
	label,
	children,
	error,
	optional = false,
}: FieldGroupProps) {
	return (
		<div>
			<div className="mb-2 flex items-center justify-between gap-3">
				<label className="text-sm font-semibold text-gray-800 dark:text-gray-200">
					{label}
				</label>
				{optional && <span className="text-xs text-gray-400">Optional</span>}
			</div>
			{children}
			{error && (
				<p className="mt-1.5 flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
					<AlertCircle size={13} />
					{error}
				</p>
			)}
		</div>
	);
}

interface RulesPanelProps {
	rules: Rule[];
	searchQuery: string;
	onSearchQueryChange: (value: string) => void;
	deletingRule: string | null;
	onCancelDelete: () => void;
	onRequestDelete: (keyword: string) => void;
	onConfirmDelete: (keyword: string) => void;
	onCreateRule: () => void;
	onEditRule: (rule: Rule) => void;
}

function RulesPanel({
	rules,
	searchQuery,
	onSearchQueryChange,
	deletingRule,
	onCancelDelete,
	onRequestDelete,
	onConfirmDelete,
	onCreateRule,
	onEditRule,
}: RulesPanelProps) {
	return (
		<div className="flex min-h-0 flex-1 flex-col">
			<div className="flex shrink-0 flex-col gap-3 border-b border-gray-200 px-5 py-4 dark:border-white/10 sm:flex-row sm:items-center sm:px-7">
				<div className="relative flex-1">
					<Search
						size={17}
						className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
					/>
					<input
						type="search"
						value={searchQuery}
						onChange={(event) => {
							onSearchQueryChange(event.target.value);
						}}
						placeholder="Search rules…"
						className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 dark:border-white/10 dark:bg-white/[0.03]"
					/>
				</div>
				<button
					type="button"
					onClick={onCreateRule}
					className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 text-sm font-semibold text-white hover:bg-orange-500"
				>
					<Plus size={17} />
					New rule
				</button>
			</div>

			<div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-7">
				{rules.length === 0 ? (
					<div className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-gray-200 p-8 text-center dark:border-white/10">
						<div>
							<BotMessageSquare
								size={30}
								className="mx-auto text-gray-300 dark:text-gray-600"
							/>
							<p className="mt-3 font-medium">No matching rules</p>
							<p className="mt-1 text-sm text-gray-500">
								Create a rule to categorize future transactions automatically.
							</p>
						</div>
					</div>
				) : (
					<div className="space-y-2.5">
						{rules.map((rule) => {
							const parent = findParentCategory(rule.category);
							const theme = getCategoryTheme(rule.category);

							return (
								<div
									key={rule.keyword}
									className="flex items-center gap-3 rounded-xl border border-gray-200 p-3.5 dark:border-white/10"
								>
									<div className="grid size-9 shrink-0 place-items-center rounded-lg bg-gray-100 dark:bg-white/5">
										<CategoryIcon
											name={parent}
											size={16}
											colorClass={theme.text}
										/>
									</div>
									<div className="min-w-0 flex-1">
										<p className="truncate text-sm font-semibold">
											Contains “{rule.keyword}”
										</p>
										<p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
											Set category to {rule.category}
											{rule.matchCategory
												? ` when current category is ${rule.matchCategory}`
												: ""}
										</p>
									</div>

									{deletingRule === rule.keyword ? (
										<div className="flex shrink-0 items-center gap-1">
											<button
												type="button"
												onClick={onCancelDelete}
												className="rounded-lg px-2 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5"
											>
												Cancel
											</button>
											<button
												type="button"
												onClick={() => {
													onConfirmDelete(rule.keyword);
												}}
												className="rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-red-500"
											>
												Delete
											</button>
										</div>
									) : (
										<div className="flex shrink-0 items-center gap-1">
											<button
												type="button"
												onClick={() => {
													onEditRule(rule);
												}}
												className="grid size-9 place-items-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/5 dark:hover:text-white"
												aria-label={`Edit ${rule.keyword} rule`}
											>
												<Edit3 size={16} />
											</button>
											<button
												type="button"
												onClick={() => {
													onRequestDelete(rule.keyword);
												}}
												className="grid size-9 place-items-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
												aria-label={`Delete ${rule.keyword} rule`}
											>
												<Trash2 size={16} />
											</button>
										</div>
									)}
								</div>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
}
