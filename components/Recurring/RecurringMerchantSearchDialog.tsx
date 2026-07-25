"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { MerchantLogo } from "@/components/Merchants/MerchantLogo";
import type { MerchantListItem } from "@/components/Merchants/types";
import { RecurringDialog } from "@/components/Recurring/RecurringDialog";

export function RecurringMerchantSearchDialog({
	open,
	merchantItems,
	onClose,
	onSelect,
}: {
	open: boolean;
	merchantItems: MerchantListItem[];
	onClose: () => void;
	onSelect: (merchant: MerchantListItem) => void;
}) {
	return (
		<SearchSession
			key={open ? "open" : "closed"}
			open={open}
			merchantItems={merchantItems}
			onClose={onClose}
			onSelect={onSelect}
		/>
	);
}

function SearchSession({
	open,
	merchantItems,
	onClose,
	onSelect,
}: {
	open: boolean;
	merchantItems: MerchantListItem[];
	onClose: () => void;
	onSelect: (merchant: MerchantListItem) => void;
}) {
	const [query, setQuery] = useState("");
	const normalizedQuery = query.trim().toLowerCase();
	const visible = useMemo(() => {
		if (normalizedQuery.length < 3) return [];
		return merchantItems
			.filter((merchant) =>
				merchant.name.toLowerCase().includes(normalizedQuery),
			)
			.sort(
				(a, b) =>
					b.transactionCount - a.transactionCount ||
					a.name.localeCompare(b.name),
			)
			.slice(0, 15);
	}, [merchantItems, normalizedQuery]);
	return (
		<RecurringDialog
			open={open}
			onOpenChange={(next) => !next && onClose()}
			title="Add recurring"
			maxWidthClass="max-w-[820px]"
		>
			<div className="min-h-[400px] p-8">
				<input
					autoFocus
					value={query}
					onChange={(event) => setQuery(event.target.value)}
					placeholder="Enter 3 characters or more..."
					className="h-15 w-full rounded-xl border border-gray-300 bg-transparent px-5 text-xl outline-none transition placeholder:text-gray-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-white/10 dark:text-white"
				/>
				{normalizedQuery.length < 3 ? (
					<div className="grid min-h-72 place-items-center text-center">
						<div>
							<Search
								size={58}
								strokeWidth={1.8}
								className="mx-auto text-gray-400"
							/>
							<h3 className="mt-5 text-xl font-bold">Search for a merchant</h3>
							<p className="mx-auto mt-2 max-w-sm text-base leading-relaxed text-gray-500 dark:text-gray-400">
								Enter a search term above to find merchants with recurring
								transactions.
							</p>
						</div>
					</div>
				) : visible.length > 0 ? (
					<div className="mt-7 divide-y divide-gray-100 dark:divide-white/5">
						{visible.map((merchant) => (
							<button
								key={merchant.id}
								type="button"
								onClick={() => onSelect(merchant)}
								className="flex min-h-24 w-full items-center gap-5 rounded-xl px-1 text-left transition hover:bg-gray-50 dark:hover:bg-white/[0.03]"
							>
								<MerchantLogo
									name={merchant.name}
									logoUrl={merchant.logoUrl}
									size="lg"
									className="!size-[82px]"
								/>
								<div className="min-w-0">
									<p className="truncate text-lg font-bold">
										<HighlightedName name={merchant.name} query={query} />
									</p>
									<p className="mt-1 text-base font-semibold text-gray-600 dark:text-gray-300">
										{merchant.transactionCount} transactions
									</p>
								</div>
							</button>
						))}
					</div>
				) : (
					<div className="grid min-h-64 place-items-center text-center text-gray-500 dark:text-gray-400">
						No merchants match “{query.trim()}”.
					</div>
				)}
			</div>
		</RecurringDialog>
	);
}

function HighlightedName({ name, query }: { name: string; query: string }) {
	const index = name.toLowerCase().indexOf(query.trim().toLowerCase());
	if (index < 0 || !query.trim()) return name;
	return (
		<>
			{name.slice(0, index)}
			<mark className="bg-amber-200/60 text-inherit dark:bg-amber-500/25">
				{name.slice(index, index + query.trim().length)}
			</mark>
			{name.slice(index + query.trim().length)}
		</>
	);
}
