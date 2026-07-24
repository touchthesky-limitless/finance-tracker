"use client";

import {
	useMemo,
	useRef,
	useState,
} from "react";
import * as Popover from "@radix-ui/react-popover";
import {
	Check,
	ChevronDown,
	Search,
	X,
} from "lucide-react";

import { MerchantOptionContent } from "@/components/Merchants/MerchantOptionContent";
import type { MerchantListItem } from "@/components/Merchants/types";

interface MultiMerchantSelectorFieldProps {
	values: string[];
	merchants: MerchantListItem[];
	onChange: (values: string[]) => void;
	placeholder?: string;
	clearAllLabel?: string;
}

function normalize(value: string): string {
	return value.trim().toLowerCase();
}

export function MultiMerchantSelectorField({
	values,
	merchants,
	onChange,
	placeholder = "Search merchants…",
	clearAllLabel = "Clear all",
}: MultiMerchantSelectorFieldProps) {
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const searchInputRef = useRef<HTMLInputElement>(null);

	const validMerchants = useMemo(() => {
		const byId = new Map<string, MerchantListItem>();

		for (const merchant of merchants) {
			const id = merchant.id?.trim();
			const name = merchant.name?.trim();

			if (!id || !name) {
				continue;
			}

			const current = byId.get(id);

			if (
				!current ||
				merchant.transactionCount > current.transactionCount
			) {
				byId.set(id, {
					...merchant,
					id,
					name,
				});
			}
		}

		return [...byId.values()].sort((first, second) => {
			return (
				second.transactionCount - first.transactionCount ||
				first.name.localeCompare(second.name)
			);
		});
	}, [merchants]);

	const merchantById = useMemo(() => {
		return new Map(
			validMerchants.map((merchant) => {
				return [merchant.id, merchant] as const;
			}),
		);
	}, [validMerchants]);

	const selectedMerchants = useMemo(() => {
		return values
			.map((merchantId) => {
				return merchantById.get(merchantId);
			})
			.filter(
				(merchant): merchant is MerchantListItem =>
					Boolean(merchant),
			);
	}, [
		merchantById,
		values,
	]);

	const visibleMerchants = useMemo(() => {
		const normalizedQuery = normalize(query);

		if (!normalizedQuery) {
			return validMerchants;
		}

		return validMerchants.filter((merchant) => {
			return normalize(merchant.name).includes(normalizedQuery);
		});
	}, [
		query,
		validMerchants,
	]);

	const toggleMerchant = (merchantId: string): void => {
		onChange(
			values.includes(merchantId)
				? values.filter((selectedMerchantId) => {
						return selectedMerchantId !== merchantId;
					})
				: [...values, merchantId],
		);
	};

	return (
		<Popover.Root
			open={open}
			onOpenChange={(nextOpen) => {
				setOpen(nextOpen);

				if (!nextOpen) {
					setQuery("");
				}
			}}
			modal={false}
		>
			<div className="relative min-h-14 rounded-xl border border-gray-300 bg-white dark:border-white/15 dark:bg-[#222]">
				<Popover.Trigger asChild>
					<button
						type="button"
						aria-label="Select merchants"
						className="absolute inset-0 z-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[#00A8D2]/30"
					/>
				</Popover.Trigger>

				<div className="pointer-events-none relative z-10 flex min-h-14 items-center gap-2 px-3 py-2 pr-24">
					{selectedMerchants.length === 0 ? (
						<span className="text-base text-gray-500 dark:text-gray-400">
							All merchants
						</span>
					) : (
						<div className="flex min-w-0 flex-1 flex-wrap gap-2">
							{selectedMerchants.map((merchant) => {
								return (
									<span
										key={merchant.id}
										className="pointer-events-auto flex max-w-full items-center rounded-xl bg-gray-100 px-2.5 py-1.5 text-gray-900 dark:bg-white/7 dark:text-white"
									>
										<MerchantOptionContent
											merchant={merchant}
											showCount={false}
											size="sm"
											className="max-w-[210px]"
											trailing={
												<button
													type="button"
													aria-label={`Remove ${merchant.name}`}
													onClick={() => {
														toggleMerchant(
															merchant.id,
														);
													}}
													className="shrink-0 rounded-full p-0.5 text-gray-500 transition-colors hover:bg-black/10 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white"
												>
													<X size={14} />
												</button>
											}
										/>
									</span>
								);
							})}
						</div>
					)}
				</div>

				<div className="pointer-events-none absolute right-3 top-1/2 z-10 flex -translate-y-1/2 items-center gap-2">
					{values.length > 0 && (
						<button
							type="button"
							onClick={() => {
								onChange([]);
							}}
							className="pointer-events-auto rounded-lg px-2 py-1 text-xs font-semibold text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white"
						>
							{clearAllLabel}
						</button>
					)}

					<ChevronDown
						size={18}
						className={`transition-transform ${
							open ? "rotate-180" : ""
						}`}
					/>
				</div>
			</div>

			<Popover.Portal>
				<Popover.Content
					side="bottom"
					align="start"
					sideOffset={8}
					collisionPadding={12}
					onOpenAutoFocus={(event) => {
						event.preventDefault();
						searchInputRef.current?.focus();
					}}
					onCloseAutoFocus={(event) => {
						event.preventDefault();
					}}
					className="z-[9999] w-[var(--radix-popover-trigger-width)] min-w-[360px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl outline-none dark:border-white/10 dark:bg-[#1E1E1E]"
				>
					<label className="flex h-16 items-center gap-3 border-b border-gray-200 px-5 dark:border-white/10">
						<Search
							size={21}
							className="shrink-0 text-gray-400"
						/>
						<input
							ref={searchInputRef}
							value={query}
							onChange={(event) => {
								setQuery(event.target.value);
							}}
							placeholder={placeholder}
							className="min-w-0 flex-1 bg-transparent text-base text-gray-900 outline-none placeholder:text-gray-400 dark:text-white"
						/>
					</label>

					<div className="max-h-96 overflow-y-auto p-3">
						<button
							type="button"
							onClick={() => {
								onChange([]);
							}}
							className="flex w-full items-center justify-between rounded-xl px-4 py-3.5 text-left text-base font-medium transition-colors hover:bg-gray-100 dark:hover:bg-white/5"
						>
							All merchants
							{values.length === 0 && (
								<Check
									size={19}
									strokeWidth={2.5}
									className="text-[#FF5A35]"
								/>
							)}
						</button>

						{visibleMerchants.map((merchant) => {
							const selected = values.includes(merchant.id);

							return (
								<button
									key={merchant.id}
									type="button"
									onClick={() => {
										toggleMerchant(merchant.id);
									}}
									className="flex min-h-14 w-full items-center rounded-xl px-4 py-2.5 text-left transition-colors hover:bg-gray-100 dark:hover:bg-white/5"
								>
									<MerchantOptionContent
										merchant={merchant}
										showCount
										selected={selected}
									/>
								</button>
							);
						})}

						{validMerchants.length === 0 && (
							<div className="px-4 py-10 text-center">
								<p className="text-sm font-medium text-gray-700 dark:text-gray-300">
									No merchants available.
								</p>
								<p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
									Merchant options appear after merchant data is loaded.
								</p>
							</div>
						)}

						{validMerchants.length > 0 &&
							visibleMerchants.length === 0 && (
								<div className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
									No merchants match “{query.trim()}”.
								</div>
							)}
					</div>
				</Popover.Content>
			</Popover.Portal>
		</Popover.Root>
	);
}
