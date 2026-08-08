/**
 * CashFlowBreakdownBars – Horizontal bar chart showing breakdown of income or expenses.
 */
"use client";

import { CategoryIcon } from "@/components/CategoryIcon";
import { formatMoney } from "@/utils/formatters";
import Link from "next/link";
import { type ReactNode } from "react";
import { MerchantListItem } from "../Merchants";
import type { CashFlowBreakdown, CashFlowBreakdownItem } from "./types";
import { resolveCashFlowDetailUrl } from "./utils/cashFlowNavigationUtils";
import { MerchantLogoWithLookup } from "../MerchantLogoWithLookup";
interface CashFlowBreakdownBarsProps {
	targetId: string;
	title: string;
	items: CashFlowBreakdownItem[];
	breakdown: CashFlowBreakdown;
	tone: "income" | "expense";
	emptyTitle: string;
	emptyDescription: string;
	headerActions: ReactNode;
	hideAmounts: boolean;
	merchantItems?: MerchantListItem[];
}

export function CashFlowBreakdownBars({
	targetId,
	title,
	items,
	breakdown,
	tone,
	emptyTitle,
	emptyDescription,
	headerActions,
	hideAmounts,
	merchantItems,
}: CashFlowBreakdownBarsProps) {
	const maxAmount = Math.max(
		...items.map((item) => {
			return Number.isFinite(item.amount) ? Math.abs(item.amount) : 0;
		}),
		1,
	);

	const fillColor = tone === "income" ? "#76cdaa" : "#f39a9d";

	return (
		<section
			id={targetId}
			className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/5 dark:bg-[#232322]"
		>
			<header className="flex min-h-16 flex-wrap items-center gap-3 border-b border-gray-200 px-5 py-3 dark:border-white/5">
				<h3 className="text-lg font-bold">{title}</h3>

				<div className="ml-auto flex flex-wrap items-center justify-end gap-2 sm:gap-3">
					{headerActions}
				</div>
			</header>

			{items.length === 0 ? (
				<div className="grid min-h-56 place-items-center px-5 text-center">
					<div>
						<h4 className="text-base font-bold">{emptyTitle}</h4>

						<p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
							{emptyDescription}
						</p>
					</div>
				</div>
			) : (
				<div className="space-y-1.5 py-4">
					{items.map((item) => {
						const amount = Number.isFinite(item.amount)
							? Math.abs(item.amount)
							: 0;

						const width = Math.max(0.8, (amount / maxAmount) * 100);
						const detailUrl = resolveCashFlowDetailUrl(item);

						const rowClassName =
							"group relative flex min-h-12 w-full " +
							"items-center overflow-hidden text-left " +
							"outline-none transition-colors " +
							"hover:bg-gray-50 " +
							"focus-visible:ring-2 " +
							"focus-visible:ring-cyan-500 " +
							"focus-visible:ring-inset " +
							"dark:hover:bg-white/5";

						const rowContent = (
							<>
								<span
									aria-hidden="true"
									className="pointer-events-none absolute inset-y-0 left-0 origin-left rounded-r-xl opacity-55 transition-[filter,opacity,transform] duration-150 group-hover:scale-x-[1.008] group-hover:brightness-95 group-hover:opacity-75 dark:opacity-45 dark:group-hover:opacity-65"
									style={{
										width: `${width}%`,
										backgroundColor: fillColor,
									}}
								/>

								<span className="pointer-events-none relative z-10 flex min-w-0 flex-1 items-center gap-3 px-7 py-2.5">
									{breakdown === "merchant" ? (
										<MerchantLogoWithLookup
											key={item.id}
											item={item}
											merchantItems={merchantItems}
											size="sm"
										/>
									) : (
										<CategoryIcon name={item.iconName} size={18} />
									)}

									<span className="truncate text-sm font-semibold transition-transform duration-150 group-hover:translate-x-0.5">
										{item.label}
									</span>
								</span>

								<span className="pointer-events-none relative z-10 shrink-0 px-7 text-sm font-bold">
									{!hideAmounts && (
										<span data-share-amount>{formatMoney(amount)} </span>
									)}

									<span className="font-semibold text-gray-500 dark:text-gray-300">
										{hideAmounts
											? `${item.share.toFixed(1)}%`
											: `(${item.share.toFixed(1)}%)`}
									</span>
								</span>
							</>
						);

						if (detailUrl) {
							return (
								<Link
									key={item.id}
									href={detailUrl}
									aria-label={`View ${item.label}`}
									className={`${rowClassName} cursor-pointer`}
								>
									{rowContent}
								</Link>
							);
						}

						return (
							<div
								key={item.id}
								aria-label={item.label}
								className={`${rowClassName} cursor-default`}
							>
								{rowContent}
							</div>
						);
					})}
				</div>
			)}
		</section>
	);
}
