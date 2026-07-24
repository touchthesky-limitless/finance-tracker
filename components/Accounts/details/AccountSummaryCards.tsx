import {
	CircleHelp,
	ExternalLink,
	Info,
	MoreHorizontal,
	ThumbsDown,
	ThumbsUp,
} from "lucide-react";

import {
	formatSignedCurrency,
} from "@/utils/formatters";

interface AccountSummaryCardsProps {
	institution: string;
	accountType: string;
	creditLimit: number;
	totalTransactions: number;
	lastUpdated: string;
}

function SummaryRow({
	label,
	value,
	accent = false,
}: {
	label: string;
	value: string;
	accent?: boolean;
}) {
	return (
		<div className="flex items-center justify-between gap-5 text-sm">
			<span className="text-gray-500 dark:text-gray-400">{label}</span>
			<span
				className={
					accent
						? "text-right font-semibold text-[#00A8D2]"
						: "text-right font-semibold text-gray-900 dark:text-white"
				}
			>
				{value}
			</span>
		</div>
	);
}

export function AccountSummaryCards({
	institution,
	accountType,
	creditLimit,
	totalTransactions,
	lastUpdated,
}: AccountSummaryCardsProps) {
	return (
		<aside className="space-y-4 self-start">
			<section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/5 dark:bg-[#222220]">
				<div className="border-b border-gray-200 px-6 py-4 dark:border-white/5">
					<h2 className="text-lg font-semibold text-gray-900 dark:text-white">
						Summary
					</h2>
				</div>

				<div className="space-y-6 px-6 py-6">
					<SummaryRow
						label="Institution"
						value={institution}
						accent
					/>
					<SummaryRow
						label="Account type"
						value={accountType}
					/>
					<SummaryRow
						label="Credit limit"
						value={
							creditLimit > 0
								? formatSignedCurrency(creditLimit)
								: "Set credit limit"
						}
						accent={creditLimit <= 0}
					/>
					<SummaryRow
						label="Total transactions"
						value={String(totalTransactions)}
					/>
				</div>
			</section>

			<section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/5 dark:bg-[#222220]">
				<div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-white/5">
					<h2 className="text-lg font-semibold text-gray-900 dark:text-white">
						Connection status
					</h2>
					<MoreHorizontal size={18} />
				</div>

				<div className="space-y-5 px-6 py-6">
					<div className="flex items-center justify-between gap-4 text-sm">
						<span className="text-gray-500 dark:text-gray-400">
							Last update
						</span>
						<span className="flex items-center gap-1.5 font-medium">
							{lastUpdated}
							<Info size={14} />
						</span>
					</div>

					<div className="flex items-center justify-between gap-4 text-sm">
						<span className="text-gray-500 dark:text-gray-400">
							Status
						</span>
						<span className="flex items-center gap-1.5 font-medium">
							Institution Connected
							<Info size={14} />
						</span>
					</div>

					<div className="flex items-center justify-between gap-4 text-sm">
						<span className="text-gray-500 dark:text-gray-400">
							Data provider
						</span>
						<span className="flex items-center gap-1.5 font-medium">
							Plaid
							<Info size={14} />
						</span>
					</div>

					<div className="rounded-xl bg-gray-100 p-4 text-sm leading-6 dark:bg-[#2A2A27]">
						<strong className="block">Issues reported</strong>
						<span className="block text-xs text-gray-500 dark:text-gray-400">
							updated 2 months ago
						</span>
						<p className="mt-2">
							Plaid is migrating {institution} to a new connection. Some
							customers are experiencing delayed syncs that are typically
							fixed by updating login information.
							<button
								type="button"
								className="ml-1 font-semibold text-[#00A8D2]"
							>
								View more
							</button>
						</p>
					</div>

					<div className="flex items-center justify-between text-sm">
						<span className="text-gray-500 dark:text-gray-400">
							Rate your experience
						</span>

						<div className="flex items-center gap-4">
							<button
								type="button"
								aria-label="Thumbs up"
								className="rounded-full p-1 hover:bg-gray-100 dark:hover:bg-white/5"
							>
								<ThumbsUp size={17} />
							</button>
							<button
								type="button"
								aria-label="Thumbs down"
								className="rounded-full p-1 hover:bg-gray-100 dark:hover:bg-white/5"
							>
								<ThumbsDown size={17} />
							</button>
						</div>
					</div>

					<button
						type="button"
						className="mx-auto flex items-center gap-2 text-sm font-semibold text-[#00A8D2]"
					>
						<CircleHelp size={16} />
						Visit our help center
						<ExternalLink size={14} />
					</button>
				</div>
			</section>
		</aside>
	);
}
