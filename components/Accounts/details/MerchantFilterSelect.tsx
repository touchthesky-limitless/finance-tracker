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
} from "lucide-react";

import { MerchantOptionContent } from "@/components/Merchants/MerchantOptionContent";
import type { MerchantListItem } from "@/components/Merchants/types";

interface MerchantFilterSelectProps {
	value: string;
	merchants: MerchantListItem[];
	onChange: (value: string) => void;
}

function normalize(value: string): string {
	return value.trim().toLowerCase();
}

export function MerchantFilterSelect({
	value,
	merchants,
	onChange,
}: MerchantFilterSelectProps) {
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

	const selectedMerchant = validMerchants.find((merchant) => {
		return merchant.id === value;
	});

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
			<Popover.Trigger asChild>
				<button
					type="button"
					className="flex min-h-14 w-full items-center justify-between gap-4 rounded-xl border border-gray-300 bg-white px-4 text-left outline-none transition-colors hover:bg-gray-50 data-[state=open]:border-[#00A8D2] data-[state=open]:ring-2 data-[state=open]:ring-[#00A8D2]/15 dark:border-white/15 dark:bg-[#222] dark:hover:bg-[#292929]"
				>
					{selectedMerchant ? (
						<MerchantOptionContent
							merchant={selectedMerchant}
							showCount={false}
							size="sm"
						/>
					) : (
						<span className="text-base text-gray-500 dark:text-gray-400">
							All merchants
						</span>
					)}

					<ChevronDown
						size={18}
						className={`shrink-0 transition-transform ${
							open ? "rotate-180" : ""
						}`}
					/>
				</button>
			</Popover.Trigger>

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
							placeholder="Search merchants..."
							className="min-w-0 flex-1 bg-transparent text-base text-gray-900 outline-none placeholder:text-gray-400 dark:text-white"
						/>
					</label>

					<div className="max-h-96 overflow-y-auto p-3">
						<button
							type="button"
							onClick={() => {
								onChange("");
								setOpen(false);
							}}
							className="flex w-full items-center justify-between rounded-xl px-4 py-3.5 text-left text-base font-medium transition-colors hover:bg-gray-100 dark:hover:bg-white/5"
						>
							All merchants
							{!value && (
								<Check
									size={19}
									strokeWidth={2.5}
									className="text-[#FF5A35]"
								/>
							)}
						</button>

						{visibleMerchants.map((merchant) => {
							const selected = merchant.id === value;

							return (
								<button
									key={merchant.id || merchant.name}
									type="button"
									onClick={() => {
										onChange(merchant.id);
										setOpen(false);
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
