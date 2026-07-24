import {
	ArrowRight,
	ChevronDown,
} from "lucide-react";

import type { AccountRecord } from "@/components/Accounts/types";
import {
	accountAccent,
	accountIcon,
} from "@/components/Accounts/utils/account";
import {
	formatSignedCurrency,
	relativeTime,
} from "@/utils/formatters";

export function AccountGroupCard({
	group,
	total,
	accounts,
	isLiability,
	isCollapsed,
	onToggle,
	onOpenAccount,
}: {
	group: string;
	total: number;
	accounts: AccountRecord[];
	isLiability: boolean;
	isCollapsed: boolean;
	onToggle: () => void;
	onOpenAccount: (account: AccountRecord) => void;
}) {
	const change = total * 0.137;

	return (
		<section className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-white/5 dark:bg-[#222]">
			<button
				type="button"
				onClick={onToggle}
				className="flex w-full items-center justify-between gap-4 border-b border-gray-200 px-5 py-4 text-left dark:border-white/5"
			>
				<div className="flex min-w-0 flex-wrap items-center gap-2">
					<ChevronDown
						size={16}
						className={`transition-transform ${
							isCollapsed ? "-rotate-90" : ""
						}`}
					/>
					<strong className="text-base">{group}</strong>
					<span
						className={`text-sm font-semibold ${
							isLiability ? "text-red-400" : "text-emerald-400"
						}`}
					>
						↗ {formatSignedCurrency(change)}
						{isLiability ? " (30.6%)" : ""}
					</span>
					<span className="text-sm text-gray-500 dark:text-zinc-400">1 month change</span>
				</div>

				<strong className="shrink-0">{formatSignedCurrency(total)}</strong>
			</button>

			{!isCollapsed && (
				<div>
					{accounts.map((account) => {
						const Icon = accountIcon(account.kind);

						return (
							<button
								key={account.id}
								type="button"
								onClick={() => onOpenAccount(account)}
								aria-label={`View ${account.name} account`}
								title={`View ${account.name} account`}
								className="group flex w-full items-center gap-4 border-b border-gray-200 px-5 py-4 text-left transition last:border-0 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-500 dark:border-white/5 dark:hover:bg-white/[0.035]"
							>
								<div
									className={`flex size-10 shrink-0 items-center justify-center rounded-full text-white ${accountAccent(
										account,
									)}`}
								>
									<Icon size={18} />
								</div>

								<div className="min-w-0 flex-1">
									<div className="truncate text-sm font-medium sm:text-base">
										{account.name}
									</div>
									<div className="mt-0.5 text-xs text-gray-500 dark:text-zinc-400">
										{account.type}
									</div>
								</div>

								<div className="hidden w-24 items-center gap-2 md:flex">
									<span className="h-1.5 w-16 rounded-full bg-zinc-700">
										<span className="block h-full w-1/6 rounded-full bg-cyan-400" />
									</span>
								</div>

								<div className="hidden h-8 w-20 items-end md:flex">
									<svg viewBox="0 0 80 32" className="h-full w-full">
										<path
											d={
												Math.abs(account.balance) % 3 === 0
													? "M2 27 L20 27 L34 8 L78 8"
													: Math.abs(account.balance) % 2 === 0
														? "M2 8 L24 8 L48 27 L78 27"
														: "M2 26 L26 26 L50 26 L78 26"
											}
											fill="none"
											stroke="#777"
											strokeWidth="1.7"
										/>
									</svg>
								</div>

								<div className="w-28 shrink-0 text-right">
									<div className="font-medium">
										{formatSignedCurrency(Math.abs(account.balance))}
									</div>
									<div className="mt-1 text-xs text-gray-500 dark:text-zinc-400">
										{relativeTime(account.lastUpdated)}
									</div>
								</div>

								<ArrowRight
									size={16}
									className="hidden shrink-0 text-gray-500 dark:text-zinc-500 opacity-0 transition group-hover:opacity-100 sm:block"
								/>
							</button>
						);
					})}
				</div>
			)}
		</section>
	);
}
