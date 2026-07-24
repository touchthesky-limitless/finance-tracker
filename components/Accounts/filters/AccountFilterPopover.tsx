"use client";

import {
	useCallback,
	useMemo,
	useState,
	type ReactNode,
} from "react";
import {
	autoUpdate,
	FloatingFocusManager,
	FloatingPortal,
	offset,
	shift,
	useDismiss,
	useFloating,
	useInteractions,
	useRole,
} from "@floating-ui/react";
import {
	Check,
	CircleX,
	Search,
	X,
} from "lucide-react";

import type {
	AccountRecord,
	FilterNode,
} from "@/components/Accounts/types";
import { accountIcon } from "@/components/Accounts/utils/account";
import {
	findAccountAncestorIds,
	getDescendantAccountIds,
	getDescendantParentIds,
} from "@/components/Accounts/utils/filterTree";

export function AccountFilterModal({
	anchorElement,
	tree,
	selectedIds,
	onSelectedIdsChange,
	query,
	onQueryChange,
	onClear,
	onCancel,
	onApply,
}: {
	anchorElement: HTMLElement | null;
	tree: FilterNode[];
	selectedIds: string[];
	onSelectedIdsChange: (ids: string[]) => void;
	query: string;
	onQueryChange: (query: string) => void;
	onClear: () => void;
	onCancel: () => void;
	onApply: () => void;
}) {
	const [explicitParentIds, setExplicitParentIds] = useState<string[]>([]);
	const [selectAllExplicit, setSelectAllExplicit] = useState(false);

	const {
		refs: floatingRefs,
		context,
		floatingStyles,
	} = useFloating({
		open: true,
		placement: "bottom-end",
		strategy: "fixed",
		elements: {
			reference: anchorElement,
		},
		middleware: [
			offset(8),
			shift({
				padding: 12,
				crossAxis: true,
			}),
		],
		whileElementsMounted: autoUpdate,
		onOpenChange(open) {
			if (!open) {
				onCancel();
			}
		},
	});

	const dismiss = useDismiss(context, {
		escapeKey: true,
		outsidePress: true,
		outsidePressEvent: "mousedown",
	});

	const role = useRole(context, {
		role: "dialog",
	});

	const { getFloatingProps } = useInteractions([dismiss, role]);

	const setFloatingElement = useCallback(
		(node: HTMLElement | null): void => {
			floatingRefs.setFloating(node);
		},
		[floatingRefs],
	);

	const allAccounts = useMemo(() => {
		return tree.flatMap((section) => {
			return section.children?.flatMap((group) => {
				return group.children?.flatMap((node) => {
					return node.account ? [node.account] : [];
				}) ?? [];
			}) ?? [];
		});
	}, [tree]);

	const accountById = useMemo(() => {
		return new Map(
			allAccounts.map((account) => {
				return [account.id, account] as const;
			}),
		);
	}, [allAccounts]);

	const visibleTree = useMemo(() => {
		const normalized = query.trim().toLowerCase();

		if (!normalized) {
			return tree;
		}

		const filterNode = (node: FilterNode): FilterNode | null => {
			const ownMatch = node.label.toLowerCase().includes(normalized);

			if (node.account) {
				return ownMatch ? node : null;
			}

			const visibleChildren =
				node.children
					?.map(filterNode)
					.filter((child): child is FilterNode => {
						return child !== null;
					}) ?? [];

			if (ownMatch) {
				return node;
			}

			if (visibleChildren.length === 0) {
				return null;
			}

			return {
				...node,
				children: visibleChildren,
			};
		};

		return tree
			.map(filterNode)
			.filter((node): node is FilterNode => {
				return node !== null;
			});
	}, [query, tree]);

	const selectedAccounts = useMemo(() => {
		return selectedIds
			.map((id) => {
				return accountById.get(id);
			})
			.filter((account): account is AccountRecord => {
				return Boolean(account);
			});
	}, [accountById, selectedIds]);

	const toggleAccount = (
		accountId: string,
		ancestorIds: string[],
	): void => {
		const resolvedAncestorIds =
			ancestorIds.length > 0
				? ancestorIds
				: findAccountAncestorIds(tree, accountId);

		onSelectedIdsChange(
			selectedIds.includes(accountId)
				? selectedIds.filter((id) => {
						return id !== accountId;
					})
				: [...selectedIds, accountId],
		);

		setExplicitParentIds((current) => {
			return current.filter((id) => {
				return !resolvedAncestorIds.includes(id);
			});
		});

		setSelectAllExplicit(false);
	};

	const toggleParent = (node: FilterNode): void => {
		const accountIds = getDescendantAccountIds(node);
		const parentIds = getDescendantParentIds(node);
		const isExplicitlySelected = explicitParentIds.includes(node.id);
		const selected = new Set(selectedIds);

		if (isExplicitlySelected) {
			for (const id of accountIds) {
				selected.delete(id);
			}
		} else {
			for (const id of accountIds) {
				selected.add(id);
			}
		}

		onSelectedIdsChange([...selected]);

		setExplicitParentIds((current) => {
			const next = new Set(current);

			for (const id of parentIds) {
				if (isExplicitlySelected) {
					next.delete(id);
				} else {
					next.add(id);
				}
			}

			return [...next];
		});

		setSelectAllExplicit(false);
	};

	const renderNode = (
		node: FilterNode,
		depth: number,
		ancestorIds: string[],
	): ReactNode => {
		const isAccount = Boolean(node.account);
		const checked = node.account
			? selectedIds.includes(node.account.id)
			: explicitParentIds.includes(node.id);
		const Icon = node.account ? accountIcon(node.account.kind) : null;
		const nextAncestorIds = node.account
			? ancestorIds
			: [...ancestorIds, node.id];

		const paddingClass =
			depth === 0
				? "pl-7"
				: depth === 1
					? "pl-12"
					: depth === 2
						? "pl-16"
						: "pl-20";

		return (
			<div key={node.id}>
				<label
					className={`flex min-h-9 cursor-pointer items-center gap-2 rounded-md py-1.5 pr-2 transition-colors hover:bg-gray-50 dark:hover:bg-white/5 ${paddingClass}`}
				>
					<input
						type="checkbox"
						checked={checked}
						aria-label={
							isAccount
								? `${checked ? "Deselect" : "Select"} ${node.label}`
								: `${checked ? "Deselect" : "Select"} ${node.label} group`
						}
						onChange={() => {
							if (node.account) {
								toggleAccount(node.account.id, ancestorIds);
								return;
							}

							toggleParent(node);
						}}
						className="h-4 w-4 shrink-0 rounded border-gray-300 text-[#FF5A35] focus:ring-[#FF5A35]/30 dark:border-white/20 dark:bg-transparent"
					/>

					{Icon && (
						<span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
							<Icon size={11} />
						</span>
					)}

					<span
						title={node.label}
						className={`min-w-0 flex-1 truncate text-sm ${
							isAccount
								? "font-medium text-gray-900 dark:text-white"
								: "font-semibold text-gray-600 dark:text-gray-400"
						}`}
					>
						{node.label}
					</span>
				</label>

				{node.children?.map((child) => {
					return renderNode(child, depth + 1, nextAncestorIds);
				})}
			</div>
		);
	};

	const clearDraftFilters = (): void => {
		onClear();
		setExplicitParentIds([]);
		setSelectAllExplicit(false);
	};

	const toggleSelectAll = (): void => {
		if (selectAllExplicit) {
			onSelectedIdsChange([]);
			setSelectAllExplicit(false);
			setExplicitParentIds([]);
			return;
		}

		onSelectedIdsChange(
			allAccounts.map((account) => {
				return account.id;
			}),
		);
		setSelectAllExplicit(true);
		setExplicitParentIds(
			tree.flatMap((node) => {
				return getDescendantParentIds(node);
			}),
		);
	};

	const applyDisabled = false;
	const activeCount = selectedIds.length;

	return (
		<FloatingPortal>
			<FloatingFocusManager
				context={context}
				initialFocus={-1}
				modal={false}
			>
				<div
					ref={setFloatingElement}
					style={floatingStyles}
					{...getFloatingProps({
						"aria-label": "Account filters",
					})}
					className="z-[100] w-[min(900px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-gray-200 bg-white text-gray-900 shadow-2xl dark:border-white/10 dark:bg-[#1B1B1B] dark:text-white"
				>
						<div className="flex h-[min(610px,calc(100vh-96px))] min-h-[460px] flex-col">
							<div className="grid min-h-0 flex-1 grid-cols-[180px_350px_minmax(260px,1fr)]">
								<aside className="border-r border-gray-200 dark:border-white/10">
									<h2 className="flex h-14 items-center border-b border-gray-200 px-5 text-lg font-semibold text-gray-900 dark:border-white/10 dark:text-white">
										Filters
									</h2>

									<nav className="space-y-0.5 px-2 py-2">
										<button
											type="button"
											onClick={() => {
												onQueryChange("");
											}}
											className="w-full rounded-lg bg-cyan-100 px-3 py-2 text-left text-sm font-medium text-cyan-700 transition-colors dark:bg-cyan-500/15 dark:text-cyan-300"
										>
											Accounts
										</button>
									</nav>
								</aside>

								<section className="flex min-h-0 flex-col border-r border-gray-200 dark:border-white/10">
									<label className="flex h-14 items-center gap-2.5 border-b border-gray-200 px-4 dark:border-white/10">
										<Search
											size={19}
											className="text-gray-500"
											strokeWidth={2}
										/>

										<input
											value={query}
											onChange={(event) => {
												onQueryChange(event.target.value);
											}}
											placeholder="Search..."
											className="min-w-0 flex-1 bg-transparent text-base text-gray-900 outline-none placeholder:text-gray-400 dark:text-white"
										/>

										{query && (
											<button
												type="button"
												aria-label="Clear filter search"
												onClick={() => {
													onQueryChange("");
												}}
												className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/10 dark:hover:text-white"
											>
												<X size={17} />
											</button>
										)}
									</label>

									<div className="min-h-0 flex-1 overflow-y-auto">
										{visibleTree.length === 0 ? (
											<div className="flex h-full flex-col items-center justify-center px-8 text-center">
												<Search
													size={38}
													strokeWidth={1.6}
													className="text-gray-400"
												/>
												<h3 className="mt-5 text-lg font-semibold text-gray-900 dark:text-white">
													No results found
												</h3>
												<p className="mt-3 text-base font-medium text-gray-500 dark:text-gray-400">
													Try searching for something else.
												</p>
											</div>
										) : (
											<div className="px-3 py-2">
												<label className="flex min-h-9 cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 font-semibold transition-colors hover:bg-gray-50 dark:hover:bg-white/5">
													<input
														type="checkbox"
														checked={selectAllExplicit}
														onChange={toggleSelectAll}
														className="h-4 w-4 shrink-0 rounded border-gray-300 text-[#FF5A35] focus:ring-[#FF5A35]/30 dark:border-white/20 dark:bg-transparent"
													/>
													<span className="text-sm">Select all</span>
												</label>

												<div className="mt-1 space-y-0.5">
													{visibleTree.map((node) => {
														return renderNode(node, 0, []);
													})}
												</div>
											</div>
										)}
									</div>
								</section>

								<section className="flex min-h-0 flex-col">
									<div className="flex h-14 items-center border-b border-gray-200 px-4 dark:border-white/10">
										<h3 className="text-base font-semibold text-gray-500 dark:text-gray-400">
											{activeCount}{" "}
											{activeCount === 1 ? "filter" : "filters"} selected
										</h3>
									</div>

									<div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
										{selectedAccounts.length === 0 ? (
											<div className="flex h-full items-center justify-center text-center text-sm text-gray-400">
												Selected filters will appear here.
											</div>
										) : (
											<div className="space-y-4">
												<section>
													<div className="mb-1.5 flex items-center justify-between gap-3">
														<h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400">
															Accounts
														</h4>

														<button
															type="button"
															onClick={clearDraftFilters}
															className="text-xs font-semibold text-cyan-600 transition-colors hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300"
														>
															Clear
														</button>
													</div>

													<div className="space-y-1">
														{selectedAccounts.map((account) => {
															const Icon = accountIcon(account.kind);

															return (
																<button
																	key={account.id}
																	type="button"
																	aria-label={`Remove ${account.name} filter`}
																	onClick={() => {
																		toggleAccount(account.id, []);
																	}}
																	className="flex min-h-9 w-full cursor-pointer items-center justify-between gap-3 rounded-md px-1 text-left transition-colors hover:bg-gray-50 dark:hover:bg-white/5"
																>
																	<div className="flex min-w-0 items-center gap-2">
																		<span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
																			<Icon size={11} />
																		</span>

																		<p className="min-w-0 truncate text-sm font-medium text-gray-900 dark:text-white">
																			{account.name}
																		</p>
																	</div>

																	<CircleX
																		size={18}
																		strokeWidth={2.2}
																		className="shrink-0 text-gray-400 transition-colors group-hover:text-gray-700 dark:group-hover:text-gray-200"
																	/>
																</button>
															);
														})}
													</div>
												</section>
											</div>
										)}
									</div>
								</section>
							</div>

							<div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-[#1B1B1B]">
								<button
									type="button"
									onClick={clearDraftFilters}
									disabled={activeCount === 0}
									className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-45 dark:border-white/10 dark:bg-white/5 dark:text-gray-200 dark:hover:bg-white/10"
								>
									Clear
								</button>

								<div className="flex items-center gap-2">
									<button
										type="button"
										onClick={onCancel}
										className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm transition-colors hover:bg-gray-50 dark:border-white/10 dark:bg-[#222] dark:text-white dark:hover:bg-white/5"
									>
										Cancel
									</button>

									<button
										type="button"
										onClick={onApply}
										disabled={applyDisabled}
										className="rounded-lg bg-[#FF5A35] px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#E04825] disabled:cursor-not-allowed disabled:opacity-45"
									>
										Apply
									</button>
								</div>
							</div>
						</div>
				</div>
			</FloatingFocusManager>
		</FloatingPortal>
	);
}
