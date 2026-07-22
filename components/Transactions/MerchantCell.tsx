"use client";

import { useMemo, useRef, useState } from "react";
import {
	autoUpdate,
	flip,
	FloatingFocusManager,
	FloatingPortal,
	offset,
	shift,
	useClick,
	useDismiss,
	useFloating,
	useInteractions,
	useRole,
} from "@floating-ui/react";
import {
	ArrowRight,
	Check,
	ChevronDown,
	Loader2,
	Plus,
	Search,
} from "lucide-react";

import type { Merchant, Transaction } from "@/store/useBudgetStore";
import { useBudgetStore } from "@/store/useBudgetStore";
import type { MerchantListItem } from "@/components/Merchants/types";
import { MerchantOptionContent } from "@/components/Merchants/MerchantOptionContent";
import { MerchantLogo } from "@/components/Merchants/MerchantLogo";
import { MerchantTransactionCount } from "@/components/Merchants/MerchantTransactionCount";

interface MerchantCellProps {
	transaction: Transaction;
	merchantId?: string;
	merchantItems: MerchantListItem[];
	showNavigation?: boolean;

	onNavigate: () => void;
	onOpenEditor: () => void;

	onMerchantChange?: (
		transactionId: string,
		merchant: Pick<Merchant, "id" | "name">,
	) => Promise<void> | void;
}

function normalizeMerchantText(value: string): string {
	return value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

function compactMerchantText(value: string): string {
	return normalizeMerchantText(value).replace(/\s+/g, "");
}

function getMerchantInitials(value: string): string {
	return normalizeMerchantText(value)
		.split(" ")
		.filter(Boolean)
		.map((word) => word.charAt(0))
		.join("");
}

function getMerchantMatchScore(
	statement: string,
	merchantName: string,
): number {
	const normalizedStatement = normalizeMerchantText(statement);
	const normalizedMerchant = normalizeMerchantText(merchantName);

	const compactStatement = compactMerchantText(statement);
	const compactMerchant = compactMerchantText(merchantName);

	if (!normalizedStatement || !normalizedMerchant) {
		return 0;
	}

	if (normalizedStatement === normalizedMerchant) {
		return 1000;
	}

	let score = 0;

	if (
		compactStatement.includes(compactMerchant) ||
		compactMerchant.includes(compactStatement)
	) {
		score += 500;
	}

	const initials = getMerchantInitials(merchantName);

	if (initials.length >= 2 && compactStatement.includes(initials)) {
		score += 400;
	}

	for (const word of normalizedMerchant.split(" ")) {
		if (word.length >= 3 && normalizedStatement.includes(word)) {
			score += 25;
		}
	}

	return score;
}

export function MerchantCell({
	transaction,
	merchantId,
	merchantItems,
	showNavigation = true,
	onNavigate,
	onOpenEditor,
	onMerchantChange,
}: MerchantCellProps) {
	const addCustomMerchant = useBudgetStore((state) => state.addCustomMerchant);

	const [isOpen, setIsOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [isSaving, setIsSaving] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	const searchInputRef = useRef<HTMLInputElement>(null);

	const canEditInline = Boolean(onMerchantChange);
	const merchantName = transaction.merchant?.trim() || "Unknown merchant";

	/*
	 * Use the CSV statement/description for recommendations.
	 * Replace this with transaction.original_statement later
	 * if you add a dedicated database column.
	 */
	const originalStatement = transaction.description?.trim() || merchantName;

	const {
		refs: { setFloating, setReference },
		floatingStyles,
		context,
	} = useFloating({
		open: isOpen,
		onOpenChange: (nextOpen) => {
			setIsOpen(nextOpen);

			if (!nextOpen) {
				setSearchQuery("");
				setErrorMessage(null);
			}
		},
		placement: "bottom-start",
		strategy: "fixed",
		whileElementsMounted: autoUpdate,
		middleware: [
			offset(6),
			flip({
				padding: 12,
			}),
			shift({
				padding: 12,
			}),
		],
	});

	const click = useClick(context, {
		enabled: canEditInline,
	});

	const dismiss = useDismiss(context);

	const role = useRole(context, {
		role: "dialog",
	});

	const { getReferenceProps, getFloatingProps } = useInteractions([
		click,
		dismiss,
		role,
	]);

	const originalStatementMerchant = useMemo(() => {
		const normalizedStatement = normalizeMerchantText(originalStatement);

		if (!normalizedStatement) {
			return undefined;
		}

		return merchantItems.find((merchant) => {
			return normalizeMerchantText(merchant.name) === normalizedStatement;
		});
	}, [merchantItems, originalStatement]);

	const originalStatementTransactionCount =
		originalStatementMerchant?.transactionCount ?? 0;

	const recommendedMerchants = useMemo(() => {
		return merchantItems
			.map((merchant) => {
				return {
					merchant,
					score: getMerchantMatchScore(originalStatement, merchant.name),
				};
			})
			.filter(({ score }) => {
				return score > 0;
			})
			.sort((first, second) => {
				return (
					second.score - first.score ||
					first.merchant.name.localeCompare(second.merchant.name)
				);
			})
			.map(({ merchant }) => {
				return merchant;
			});
	}, [merchantItems, originalStatement]);

	const visibleMerchants = useMemo(() => {
		const normalizedQuery = normalizeMerchantText(searchQuery);

		const source = normalizedQuery
			? merchantItems.filter((merchant) => {
					return normalizeMerchantText(merchant.name).includes(normalizedQuery);
				})
			: recommendedMerchants.length > 0
				? recommendedMerchants
				: merchantItems;

		const seenMerchantNames = new Set<string>();

		return source
			.filter((merchant) => {
				const normalizedName = normalizeMerchantText(merchant.name);

				if (!normalizedName) {
					return false;
				}

				/*
				 * Do not repeat the merchant already shown in
				 * the Original statement section.
				 */
				if (
					originalStatementMerchant &&
					normalizedName ===
						normalizeMerchantText(originalStatementMerchant.name)
				) {
					return false;
				}

				/*
				 * Prevent system and custom merchants with the
				 * same normalized name from appearing twice.
				 */
				if (seenMerchantNames.has(normalizedName)) {
					return false;
				}

				seenMerchantNames.add(normalizedName);

				return true;
			})
			.slice(0, 20);
	}, [
		merchantItems,
		originalStatementMerchant,
		recommendedMerchants,
		searchQuery,
	]);

	const exactMerchantExists = useMemo(() => {
		const normalizedQuery = normalizeMerchantText(searchQuery);

		if (!normalizedQuery) {
			return false;
		}

		return merchantItems.some((merchant) => {
			return normalizeMerchantText(merchant.name) === normalizedQuery;
		});
	}, [merchantItems, searchQuery]);

	const closePopover = () => {
		setIsOpen(false);
		setSearchQuery("");
		setErrorMessage(null);
	};

	const handleMerchantSelect = async (
		merchant: Pick<Merchant, "id" | "name">,
	) => {
		if (!onMerchantChange || isSaving) {
			return;
		}

		setIsSaving(true);
		setErrorMessage(null);

		try {
			await onMerchantChange(transaction.id, merchant);

			closePopover();
		} catch (error) {
			console.error("Failed to update merchant:", error);

			setErrorMessage(
				error instanceof Error ? error.message : "Failed to update merchant.",
			);
		} finally {
			setIsSaving(false);
		}
	};

	const handleOriginalStatementSelect = async () => {
		const cleanStatement = originalStatement.trim();

		if (!cleanStatement || !onMerchantChange || isSaving) {
			return;
		}

		if (originalStatementMerchant) {
			await handleMerchantSelect(originalStatementMerchant);

			return;
		}

		setIsSaving(true);
		setErrorMessage(null);

		try {
			const createdMerchant = await addCustomMerchant(cleanStatement);

			await onMerchantChange(transaction.id, createdMerchant);

			closePopover();
		} catch (error) {
			console.error("Failed to use original statement as merchant:", error);

			setErrorMessage(
				error instanceof Error
					? error.message
					: "Failed to create the merchant.",
			);
		} finally {
			setIsSaving(false);
		}
	};

	const handleCreateMerchant = async () => {
		const cleanName = searchQuery.trim();

		if (!cleanName || exactMerchantExists || !onMerchantChange || isSaving) {
			return;
		}

		setIsSaving(true);
		setErrorMessage(null);

		try {
			const createdMerchant = await addCustomMerchant(cleanName);

			await onMerchantChange(transaction.id, createdMerchant);

			closePopover();
		} catch (error) {
			console.error("Failed to create merchant:", error);

			setErrorMessage(
				error instanceof Error ? error.message : "Failed to create merchant.",
			);
		} finally {
			setIsSaving(false);
		}
	};

	const initial = merchantName.charAt(0).toUpperCase() || "?";

	return (
		<div className="group flex h-full w-full items-center gap-1.5 pr-2">
			<div className="min-w-0 flex-1">
				<button
					ref={setReference}
					type="button"
					{...getReferenceProps({
						onClick: (event) => {
							event.stopPropagation();

							if (!canEditInline) {
								onOpenEditor();
							}
						},
					})}
					aria-label={`Change ${merchantName} merchant`}
					aria-expanded={canEditInline ? isOpen : undefined}
					className="
						flex h-10 w-full min-w-0 items-center gap-3
						rounded-xl border border-transparent px-3 text-left
						transition-all

						group-hover:border-gray-300
						group-hover:bg-gray-50

						dark:group-hover:border-white/20
						dark:group-hover:bg-white/5

						focus-visible:border-gray-300
						focus-visible:outline-none
						focus-visible:ring-2
						focus-visible:ring-orange-500/30
					"
				>
					<div
						aria-hidden="true"
						className="
							flex h-7 w-7 shrink-0 items-center
							justify-center rounded-full
							bg-gray-100 text-sm font-black
							text-[#FF5A35] dark:bg-white
						"
					>
						{initial}
					</div>

					<span
						title={merchantName}
						className="
							min-w-0 flex-1 truncate
							text-[15px] font-medium
							text-gray-900 dark:text-white
						"
					>
						{merchantName}
					</span>

					<ChevronDown
						size={16}
						strokeWidth={2}
						aria-hidden="true"
						className={`
							shrink-0 text-gray-500
							transition-all duration-150
							dark:text-gray-400
							${
								isOpen
									? "rotate-180 opacity-100"
									: "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
							}
						`}
					/>
				</button>
			</div>

			{showNavigation && (
				<button
					type="button"
					disabled={!merchantId}
					onClick={(event) => {
						event.stopPropagation();

						if (merchantId) {
							onNavigate();
						}
					}}
					aria-label={`View ${merchantName} merchant`}
					title={
						merchantId
							? "View merchant"
							: `Merchant ID unavailable for ${merchantName}`
					}
					className={`
						flex h-8 w-8 shrink-0 items-center
						justify-center rounded-lg
						border border-transparent
						opacity-0 transition-all

						group-hover:opacity-100
						group-focus-within:opacity-100
						focus-visible:opacity-100

						group-hover:border-gray-300
						dark:group-hover:border-white/20

						hover:bg-gray-100
						dark:hover:bg-white/5

						${merchantId ? "cursor-pointer" : "cursor-not-allowed"}
					`}
				>
					<ArrowRight
						size={16}
						strokeWidth={2}
						aria-hidden="true"
						className={
							merchantId
								? "text-gray-600 dark:text-gray-400"
								: "text-gray-300 dark:text-gray-600"
						}
					/>
				</button>
			)}

			{isOpen && canEditInline && (
				<FloatingPortal>
					<FloatingFocusManager
						context={context}
						modal={false}
						initialFocus={searchInputRef}
					>
						<div
							ref={setFloating}
							style={floatingStyles}
							{...getFloatingProps({
								onClick: (event) => {
									event.stopPropagation();
								},
							})}
							className="
	z-200 flex max-h-[520px]
	w-[min(430px,calc(100vw-24px))]
	flex-col overflow-hidden rounded-2xl

	border border-gray-200 bg-white
	shadow-[0_18px_50px_rgba(0,0,0,0.20)]

	dark:border-white/10
	dark:bg-[#202020]
"
						>
							<div className="relative border-b border-gray-200 dark:border-white/10">
								<Search
									size={20}
									aria-hidden="true"
									className="
										pointer-events-none absolute
										left-5 top-1/2
										-translate-y-1/2 text-gray-400
									"
								/>

								<input
									ref={searchInputRef}
									type="search"
									autoComplete="off"
									value={searchQuery}
									onChange={(event) => {
										setSearchQuery(event.target.value);
									}}
									onKeyDown={(event) => {
										if (event.key === "Enter" && visibleMerchants[0]) {
											event.preventDefault();

											void handleMerchantSelect(visibleMerchants[0]);
										}
									}}
									placeholder="Search merchants..."
									className="
										h-16 w-full bg-transparent
										pl-14 pr-5 text-lg outline-none
										placeholder:text-gray-400
									"
								/>
							</div>

							<div className="min-h-0 flex-1 overflow-y-auto">
								<div className="border-b border-gray-100 px-4 py-4 dark:border-white/5">
									<p className="px-2 text-sm font-semibold text-gray-500 dark:text-gray-400">
										Original statement
									</p>

									<button
										type="button"
										disabled={isSaving}
										onClick={() => {
											void handleOriginalStatementSelect();
										}}
										className="
		mt-2 flex w-full items-center gap-3
		rounded-xl px-3 py-3 text-left
		transition-colors
		hover:bg-gray-100
		disabled:cursor-wait
		disabled:opacity-60
		dark:hover:bg-white/5
	"
									>
										<MerchantLogo name={originalStatement} size="sm" />
										<span className="min-w-0 flex-1 truncate text-base font-medium text-gray-900 dark:text-white">
											{originalStatement}
										</span>

										<MerchantTransactionCount
											count={originalStatementTransactionCount}
										/>

										{originalStatementMerchant?.id === merchantId && (
											<Check size={17} className="shrink-0 text-orange-500" />
										)}
									</button>
								</div>

								<div className="px-4 py-4">
									<p className="mb-2 px-2 text-sm font-semibold text-gray-500 dark:text-gray-400">
										{searchQuery.trim() ? "Merchants" : "Recommended merchants"}
									</p>

									{visibleMerchants.map((merchant) => {
										const isSelected = merchant.id === merchantId;

										return (
											<button
												key={merchant.id}
												type="button"
												disabled={isSaving}
												onClick={() => {
													void handleMerchantSelect(merchant);
												}}
												className={`
				flex w-full items-center rounded-xl
				px-3 py-3 text-left transition-colors

				hover:bg-gray-100
				dark:hover:bg-white/5

				${isSelected ? "bg-cyan-500/15 text-cyan-500" : ""}
			`}
											>
												<MerchantOptionContent merchant={merchant} size="sm" />
											</button>
										);
									})}

									{searchQuery.trim() && !exactMerchantExists && (
										<div
											className="
				shrink-0 border-t border-gray-200
				bg-white px-4 py-3

				dark:border-white/10
				dark:bg-[#202020]
			"
										>
											<button
												type="button"
												disabled={isSaving}
												onClick={() => {
													void handleCreateMerchant();
												}}
												className="
					flex min-h-12 w-full
					items-center gap-2
					rounded-xl px-3 py-2
					text-left text-base font-medium

					text-cyan-600
					transition-colors
					hover:bg-cyan-50

					disabled:cursor-wait
					disabled:opacity-60

					dark:text-cyan-400
					dark:hover:bg-cyan-500/10
				"
											>
												{isSaving ? (
													<Loader2 size={18} className="animate-spin" />
												) : (
													<Plus size={18} />
												)}

												<span className="truncate">
													Create new &quot;
													{searchQuery.trim()}
													&quot; merchant
												</span>
											</button>
										</div>
									)}

									{visibleMerchants.length === 0 && !searchQuery.trim() && (
										<p className="px-3 py-6 text-center text-sm text-gray-500">
											No merchants found.
										</p>
									)}

									{errorMessage && (
										<p className="px-3 pt-3 text-sm text-red-600 dark:text-red-400">
											{errorMessage}
										</p>
									)}
								</div>
							</div>
						</div>
					</FloatingFocusManager>
				</FloatingPortal>
			)}
		</div>
	);
}
