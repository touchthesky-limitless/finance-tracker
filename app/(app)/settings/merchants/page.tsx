"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
	autoUpdate,
	flip,
	FloatingPortal,
	offset,
	shift,
	useClick,
	useDismiss,
	useFloating,
	useInteractions,
	useRole,
} from "@floating-ui/react";
import { Check, ChevronDown, Pencil, Search } from "lucide-react";

import {
	MerchantEditorModal,
	MerchantMergeDialog,
	type MerchantEditorValue,
} from "@/components/Merchants/MerchantEditorModal";
import { MerchantLogo } from "@/components/Merchants/MerchantLogo";
import type { MerchantListItem } from "@/components/Merchants/types";
import { SettingsContentCard } from "@/components/Settings/SettingsShell";
import { Shimmer } from "@/components/ui/Shimmer";
import { useMerchantOptions } from "@/hooks/useMerchantOptions";
import { type Transaction, useBudgetStore } from "@/store/useBudgetStore";
import {
	deleteCustomMerchantRecord,
	updateCustomMerchantName,
} from "@/lib/merchants/merchantRepository";
import Link from "next/link";

type MerchantSortMode = "TRANSACTION_COUNT" | "ALPHABETICAL";

const SORT_OPTIONS: ReadonlyArray<{
	value: MerchantSortMode;
	label: string;
}> = [
	{ value: "TRANSACTION_COUNT", label: "Transaction count" },
	{ value: "ALPHABETICAL", label: "Alphabetical" },
];

function normalizeMerchantName(value?: string | null): string {
	return value?.trim().toLocaleLowerCase().replace(/\s+/g, " ") ?? "";
}

function getMerchantSortMode(value: string | null): MerchantSortMode {
	return value === "ALPHABETICAL" ? "ALPHABETICAL" : "TRANSACTION_COUNT";
}

function transactionMatchesMerchant(
	transaction: Transaction,
	merchant: Pick<MerchantListItem, "id" | "name">,
): boolean {
	if (transaction.merchant_id === merchant.id) {
		return true;
	}

	return (
		normalizeMerchantName(transaction.merchant) ===
		normalizeMerchantName(merchant.name)
	);
}

function setMerchantRecurringState(
	oldName: string,
	nextName: string,
	enabled: boolean,
): void {
	useBudgetStore.setState((state) => {
		const oldKey = normalizeMerchantName(oldName);
		const nextKey = normalizeMerchantName(nextName);
		const remaining = state.confirmedRecurringMerchants.filter((name) => {
			const key = normalizeMerchantName(name);
			return key !== oldKey && key !== nextKey;
		});

		return {
			confirmedRecurringMerchants: enabled
				? [...remaining, nextName]
				: remaining,
		};
	});
}

function MerchantSortSelect({
	value,
	onChange,
}: {
	value: MerchantSortMode;
	onChange: (value: MerchantSortMode) => void;
}) {
	const [isOpen, setIsOpen] = useState(false);
	const { refs, floatingStyles, context } = useFloating({
		open: isOpen,
		onOpenChange: setIsOpen,
		placement: "bottom-start",
		strategy: "fixed",
		whileElementsMounted: autoUpdate,
		middleware: [offset(7), flip({ padding: 12 }), shift({ padding: 12 })],
	});

	const setReferenceElement = useCallback(
		(element: HTMLButtonElement | null): void => {
			refs.setReference(element);
		},
		[refs],
	);
	const setFloatingElement = useCallback(
		(element: HTMLDivElement | null): void => {
			refs.setFloating(element);
		},
		[refs],
	);

	const click = useClick(context);
	const dismiss = useDismiss(context);
	const role = useRole(context, { role: "listbox" });
	const { getReferenceProps, getFloatingProps } = useInteractions([
		click,
		dismiss,
		role,
	]);
	const selectedLabel =
		SORT_OPTIONS.find((option) => option.value === value)?.label ??
		"Transaction count";

	return (
		<>
			<button
				ref={setReferenceElement}
				type="button"
				{...getReferenceProps()}
				aria-label="Sort merchants"
				aria-expanded={isOpen}
				className="inline-flex h-12 items-center gap-3 rounded-xl border border-[#d8d6d2] bg-white px-4 font-semibold transition hover:bg-[#f6f5f2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/35 dark:border-white/15 dark:bg-[#20201f] dark:hover:bg-white/6"
			>
				{selectedLabel}
				<ChevronDown
					size={17}
					className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
				/>
			</button>

			{isOpen && (
				<FloatingPortal>
					<div
						ref={setFloatingElement}
						style={floatingStyles}
						{...getFloatingProps()}
						className="z-[500] min-w-[260px] rounded-2xl border border-[#d8d6d2] bg-white p-2 shadow-[0_18px_55px_rgba(0,0,0,0.25)] dark:border-white/15 dark:bg-[#252523]"
					>
						{SORT_OPTIONS.map((option) => {
							const selected = option.value === value;

							return (
								<button
									key={option.value}
									type="button"
									role="option"
									aria-selected={selected}
									onClick={() => {
										onChange(option.value);
										setIsOpen(false);
									}}
									className={`flex min-h-14 w-full items-center justify-between rounded-xl px-4 text-left text-lg font-semibold transition ${
										selected
											? "bg-cyan-600 text-white"
											: "hover:bg-[#f3f2ef] dark:hover:bg-white/7"
									}`}
								>
									{option.label}
									{selected && <Check size={18} />}
								</button>
							);
						})}
					</div>
				</FloatingPortal>
			)}
		</>
	);
}

function MerchantsSkeleton() {
	return (
		<div role="status" aria-label="Loading merchants">
			<span className="sr-only">Loading merchants…</span>
			<div className="space-y-0">
				{Array.from({ length: 6 }, (_, index) => (
					<div
						key={index}
						aria-hidden="true"
						className="flex min-h-24 items-center gap-4 border-t border-black/[0.06] px-4 py-4 sm:px-7 dark:border-white/[0.06]"
					>
						<Shimmer className="size-13 shrink-0 rounded-full" />
						<div className="min-w-0 flex-1 space-y-2">
							<Shimmer
								className={`h-5 rounded-md ${
									index % 2 === 0 ? "w-36" : "w-52"
								}`}
							/>
							<Shimmer className="h-4 w-28 rounded-md" />
						</div>
						<Shimmer className="h-11 w-20 rounded-xl" />
					</div>
				))}
			</div>
		</div>
	);
}

function SettingsMerchantsPageContent() {
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const transactions = useBudgetStore((state) => state.transactions);
	const merchants = useBudgetStore((state) => state.merchants);
	const recurringMerchants = useBudgetStore(
		(state) => state.confirmedRecurringMerchants,
	);
	const fetchTransactions = useBudgetStore((state) => state.fetchTransactions);
	const fetchMerchants = useBudgetStore((state) => state.fetchMerchants);
	const updateTransaction = useBudgetStore((state) => state.updateTransaction);
	const addCustomMerchant = useBudgetStore((state) => state.addCustomMerchant);

	const baseMerchantItems = useMerchantOptions();
	const [query, setQuery] = useState(() => {
		return searchParams.get("search") ?? "";
	});
	const [sortMode, setSortMode] = useState<MerchantSortMode>(() => {
		return getMerchantSortMode(searchParams.get("order"));
	});
	const [isLoading, setIsLoading] = useState(true);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [selectedMerchant, setSelectedMerchant] =
		useState<MerchantEditorValue | null>(null);
	const [mergeSource, setMergeSource] = useState<MerchantEditorValue | null>(
		null,
	);
	const [logoOverrides, setLogoOverrides] = useState<
		Record<string, string | null>
	>({});

	const replaceMerchantUrl = useCallback(
		(nextQuery: string, nextSortMode: MerchantSortMode): void => {
			const params = new URLSearchParams(window.location.search);
			const cleanQuery = nextQuery.trim();

			params.set("order", nextSortMode);

			if (cleanQuery) {
				params.set("search", cleanQuery);
			} else {
				params.delete("search");
			}

			const nextSearch = params.toString();
			const nextUrl = nextSearch ? `${pathname}?${nextSearch}` : pathname;

			window.history.replaceState(window.history.state, "", nextUrl);
		},
		[pathname],
	);

	useEffect(() => {
		const syncFromHistory = (): void => {
			const params = new URLSearchParams(window.location.search);
			setQuery(params.get("search") ?? "");
			setSortMode(getMerchantSortMode(params.get("order")));
		};

		window.addEventListener("popstate", syncFromHistory);

		return () => {
			window.removeEventListener("popstate", syncFromHistory);
		};
	}, []);

	useEffect(() => {
		let active = true;

		const loadMerchants = async (): Promise<void> => {
			try {
				await Promise.all([fetchTransactions(true), fetchMerchants()]);
			} catch (error) {
				if (active) {
					setLoadError(
						error instanceof Error
							? error.message
							: "Merchants could not be loaded.",
					);
				}
			} finally {
				if (active) {
					setIsLoading(false);
				}
			}
		};

		void loadMerchants();

		return () => {
			active = false;
		};
	}, [fetchMerchants, fetchTransactions]);

	const merchantRecordById = useMemo(() => {
		return new Map(
			merchants.map((merchant) => [merchant.id, merchant] as const),
		);
	}, [merchants]);

	const merchantItems = useMemo<MerchantEditorValue[]>(() => {
		return baseMerchantItems
			.filter((merchant) => merchant.transactionCount > 0)
			.map((merchant) => {
				const record = merchantRecordById.get(merchant.id);
				const overriddenLogo = logoOverrides[merchant.id];

				return {
					...merchant,
					logoUrl:
						overriddenLogo === undefined ? merchant.logoUrl : overriddenLogo,
					isSystem: record?.is_system ?? false,
				};
			});
	}, [baseMerchantItems, logoOverrides, merchantRecordById]);

	const visibleMerchants = useMemo(() => {
		const normalizedQuery = normalizeMerchantName(query);
		const filtered = normalizedQuery
			? merchantItems.filter((merchant) => {
					return normalizeMerchantName(merchant.name).includes(normalizedQuery);
				})
			: merchantItems;

		return [...filtered].sort((first, second) => {
			if (sortMode === "ALPHABETICAL") {
				return first.name.localeCompare(second.name);
			}

			return (
				second.transactionCount - first.transactionCount ||
				first.name.localeCompare(second.name)
			);
		});
	}, [merchantItems, query, sortMode]);

	const recurringNames = useMemo(() => {
		return new Set(
			recurringMerchants.map((name) => normalizeMerchantName(name)),
		);
	}, [recurringMerchants]);

	const handleSaveMerchant = async (
		merchant: MerchantEditorValue,
		value: {
			name: string;
			logoUrl: string | null;
			isRecurring: boolean;
		},
	): Promise<void> => {
		const cleanName = value.name.trim();

		if (!cleanName) {
			throw new Error("Merchant name is required.");
		}

		const duplicate = merchantItems.some((candidate) => {
			return (
				candidate.id !== merchant.id &&
				normalizeMerchantName(candidate.name) ===
					normalizeMerchantName(cleanName)
			);
		});

		if (duplicate) {
			throw new Error("A merchant with this name already exists.");
		}

		const sourceTransactions = transactions.filter((transaction) => {
			return transactionMatchesMerchant(transaction, merchant);
		});
		const merchantRecord = merchantRecordById.get(merchant.id);
		const nameChanged =
			normalizeMerchantName(cleanName) !== normalizeMerchantName(merchant.name);
		let targetMerchantId = merchant.id;

		if (nameChanged && merchantRecord?.is_system) {
			const createdMerchant = await addCustomMerchant(cleanName);
			targetMerchantId = createdMerchant.id;
		} else if (nameChanged && merchantRecord && !merchantRecord.is_system) {
			await updateCustomMerchantName(merchant.id, cleanName);
		}

		if (nameChanged) {
			await Promise.all(
				sourceTransactions.map((transaction) => {
					return updateTransaction(transaction.id, {
						merchant: cleanName,
						merchant_id: targetMerchantId,
					});
				}),
			);
		}

		setMerchantRecurringState(merchant.name, cleanName, value.isRecurring);

		setLogoOverrides((current) => {
			const next = { ...current };

			if (targetMerchantId !== merchant.id) {
				delete next[merchant.id];
			}

			next[targetMerchantId] = value.logoUrl;
			return next;
		});

		await Promise.all([fetchTransactions(true), fetchMerchants()]);
		setSelectedMerchant(null);
	};

	const handleMergeMerchant = async (
		source: MerchantEditorValue,
		target: { id: string; name: string },
	): Promise<void> => {
		if (source.id === target.id) {
			throw new Error("Choose a different merchant.");
		}

		const sourceTransactions = transactions.filter((transaction) => {
			return transactionMatchesMerchant(transaction, source);
		});

		await Promise.all(
			sourceTransactions.map((transaction) => {
				return updateTransaction(transaction.id, {
					merchant: target.name,
					merchant_id: target.id,
				});
			}),
		);

		const sourceRecord = merchantRecordById.get(source.id);

		if (sourceRecord && !sourceRecord.is_system) {
			await deleteCustomMerchantRecord(source.id);
		}

		const sourceWasRecurring = recurringNames.has(
			normalizeMerchantName(source.name),
		);
		const targetWasRecurring = recurringNames.has(
			normalizeMerchantName(target.name),
		);

		setMerchantRecurringState(
			source.name,
			target.name,
			sourceWasRecurring || targetWasRecurring,
		);

		setLogoOverrides((current) => {
			const next = { ...current };
			delete next[source.id];
			return next;
		});

		await Promise.all([fetchTransactions(true), fetchMerchants()]);
		setMergeSource(null);
		setSelectedMerchant(null);
	};

	return (
		<SettingsContentCard title="Merchants">
			<div className="min-w-0">
				<div className="border-b border-black/[0.06] px-4 py-5 sm:px-7 sm:py-6 dark:border-white/[0.06]">
					<p className="max-w-[1000px] text-base leading-7 text-[#45443f] dark:text-[#d0cec9]">
						These are all of the different merchants you have interacted with in
						your transaction history. You can edit how a merchant displays
						throughout the app and merge merchants you&apos;re not using.
					</p>

					<div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
						<MerchantSortSelect
							value={sortMode}
							onChange={(nextSortMode) => {
								setSortMode(nextSortMode);
								replaceMerchantUrl(query, nextSortMode);
							}}
						/>

						<label className="relative block w-full lg:max-w-[330px]">
							<Search
								size={18}
								className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8b8984]"
							/>
							<input
								type="search"
								value={query}
								onChange={(event) => {
									const nextQuery = event.target.value;
									setQuery(nextQuery);
									replaceMerchantUrl(nextQuery, sortMode);
								}}
								placeholder={`Search ${merchantItems.length} merchants...`}
								className="h-12 w-full rounded-xl border border-[#d8d6d2] bg-white pl-11 pr-4 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 dark:border-white/15 dark:bg-[#20201f]"
							/>
						</label>
					</div>

					<h2 className="mt-5 text-xl font-semibold">
						{visibleMerchants.length}{" "}
						{visibleMerchants.length === 1 ? "Merchant" : "Merchants"}
					</h2>
				</div>

				{loadError && (
					<p className="m-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300 sm:m-7">
						{loadError}
					</p>
				)}

				{isLoading ? (
					<MerchantsSkeleton />
				) : visibleMerchants.length === 0 ? (
					<div className="px-5 py-20 text-center">
						<p className="text-lg font-semibold">No merchants found</p>
						<p className="mt-2 text-[#777671] dark:text-[#aaa9a4]">
							Try another search.
						</p>
					</div>
				) : (
					<div>
						{visibleMerchants.map((merchant) => {
							return (
								<div
									key={merchant.id}
									className="flex min-h-24 flex-col gap-4 border-t border-black/[0.06] px-4 py-4 sm:flex-row sm:items-center sm:px-7 dark:border-white/[0.06]"
								>
									<div className="flex min-w-0 flex-1 items-center gap-4">
										<MerchantLogo
											name={merchant.name}
											logoUrl={merchant.logoUrl}
											size="lg"
											className="size-13"
										/>
										<div className="min-w-0">
											<p className="truncate text-lg font-semibold sm:text-xl">
												{merchant.name}
											</p>
											<Link
												href={`/merchants/${encodeURIComponent(merchant.id)}`}
												target="_blank"
												rel="noopener noreferrer"
												aria-label={`View ${merchant.transactionCount} ${
													merchant.transactionCount === 1
														? "transaction"
														: "transactions"
												} for ${merchant.name} in a new tab`}
												className="mt-1 block rounded-sm text-left text-sm font-semibold text-cyan-600 transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40 dark:text-cyan-400"
											>
												{merchant.transactionCount}{" "}
												{merchant.transactionCount === 1
													? "transaction"
													: "transactions"}
											</Link>
										</div>
									</div>

									<div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
										<button
											type="button"
											onClick={() => setSelectedMerchant(merchant)}
											className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#d8d6d2] px-4 text-sm font-semibold transition hover:bg-black/4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/35 dark:border-white/15 dark:hover:bg-white/6"
										>
											<Pencil size={15} />
											Edit
										</button>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</div>

			{selectedMerchant && (
				<MerchantEditorModal
					key={selectedMerchant.id}
					merchant={selectedMerchant}
					isRecurring={recurringNames.has(
						normalizeMerchantName(selectedMerchant.name),
					)}
					onClose={() => setSelectedMerchant(null)}
					onSave={(value) => handleSaveMerchant(selectedMerchant, value)}
					onRequestMerge={() => {
						setMergeSource(selectedMerchant);
					}}
				/>
			)}

			{mergeSource && (
				<MerchantMergeDialog
					key={mergeSource.id}
					source={mergeSource}
					merchantItems={merchantItems}
					onClose={() => setMergeSource(null)}
					onConfirm={(target) => handleMergeMerchant(mergeSource, target)}
				/>
			)}
		</SettingsContentCard>
	);
}

export default function SettingsMerchantsPage() {
	return (
		<Suspense
			fallback={
				<SettingsContentCard title="Merchants">
					<MerchantsSkeleton />
				</SettingsContentCard>
			}
		>
			<SettingsMerchantsPageContent />
		</Suspense>
	);
}
