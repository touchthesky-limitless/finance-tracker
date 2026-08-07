/**
 * Popover displayed when clicking a merchant on the calendar view.
 */
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import * as Popover from "@radix-ui/react-popover";
import { CalendarDays } from "lucide-react";

import { CategoryIcon } from "@/components/CategoryIcon";
import { MerchantLogo } from "@/components/Merchants/MerchantLogo";
import { RecurringRowMenu } from "./RecurringRowMenu";
import type { RecurringOccurrence, RecurringRecord } from "../types";
import { formatLongDate, getFrequencyLabel, normalize } from "../utils";
import type { Transaction } from "@/store/useBudgetStore";
import { formatSignedCurrency } from "@/utils/formatters";
import type { NavigationSource } from "@/lib/navigation/breadcrumb";
import { getCategoryTheme } from "@/constants";

interface RecurringCalendarMerchantPopoverProps {
	occurrence: RecurringOccurrence;
	transactions: Transaction[];
	onEdit: (record: RecurringRecord) => void;
	onMarkNotRecurring: (record: RecurringRecord) => void;
	navigationSource?: NavigationSource;
}

function absoluteAmount(value: number | null | undefined): number {
	const amount = Number(value);
	return Number.isFinite(amount) ? Math.abs(amount) : 0;
}

function matchesMerchant(
	record: RecurringRecord,
	transaction: Transaction,
): boolean {
	if (record.merchantId && transaction.merchant_id) {
		return record.merchantId === transaction.merchant_id;
	}
	return normalize(record.merchantName) === normalize(transaction.merchant);
}

export function RecurringCalendarMerchantPopover({
	occurrence,
	transactions,
	onEdit,
	onMarkNotRecurring,
}: RecurringCalendarMerchantPopoverProps) {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const { record } = occurrence;

	const merchantTransactions = useMemo(() => {
		return transactions
			.filter((transaction) => matchesMerchant(record, transaction))
			.sort((first, second) =>
				String(second.date ?? "").localeCompare(String(first.date ?? "")),
			);
	}, [record, transactions]);

	const recentTransactions = merchantTransactions.slice(0, 3);
	const matchedTransaction = occurrence.matchedTransactionId
		? (transactions.find((t) => t.id === occurrence.matchedTransactionId) ??
			null)
		: null;
	const expectedAmount = absoluteAmount(record.amount);
	const displayAmount = matchedTransaction
		? absoluteAmount(matchedTransaction.amount)
		: expectedAmount;
	const amountDifference = displayAmount - expectedAmount;
	const showVariance =
		Boolean(matchedTransaction) && Math.abs(amountDifference) >= 0.01;

	const viewMerchant = (): void => {
		if (record.merchantId) {
			router.push(`/merchants/${encodeURIComponent(record.merchantId)}`);
			return;
		}
		router.push(
			`/transactions?merchantNames=${encodeURIComponent(record.merchantName)}`,
		);
	};

	const runAfterPopoverCloses = (
		action: (record: RecurringRecord) => void,
	): void => {
		setOpen(false);
		window.requestAnimationFrame(() => {
			action(record);
		});
	};

	const statusClasses =
		occurrence.status === "complete"
			? "bg-emerald-950 text-emerald-400"
			: occurrence.status === "overdue"
				? "bg-rose-600 text-white"
				: "bg-amber-400 text-amber-950";

	return (
		<Popover.Root open={open} onOpenChange={setOpen} modal={false}>
			<Popover.Trigger asChild>
				<button
					type="button"
					title={`${record.merchantName || "Merchant"} · ${formatSignedCurrency(displayAmount)}`}
					className={`flex w-full items-center justify-between gap-2 truncate rounded-lg px-2 py-1.5 text-left text-xs font-bold transition-colors hover:text-cyan-100 focus-visible:text-cyan-100 ${statusClasses}`}
				>
					<span className="truncate">
						{occurrence.status === "complete" ? "✓" : "×"}{" "}
						{record.merchantName || "Merchant"}
					</span>
					<span className="shrink-0">
						{formatSignedCurrency(displayAmount)}
					</span>
				</button>
			</Popover.Trigger>

			<Popover.Portal>
				<Popover.Content
					side="bottom"
					align="start"
					sideOffset={10}
					collisionPadding={16}
					onCloseAutoFocus={(event) => event.preventDefault()}
					className="z-[900] w-[510px] max-w-[calc(100vw-32px)] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl outline-none dark:border-white/15 dark:bg-[#232322]"
				>
					<div className="flex items-center gap-5 px-6 py-6">
						<MerchantLogo
							name={record.merchantName || "Merchant"}
							logoUrl={record.logoUrl}
							size="lg"
							className="!size-[72px]"
						/>
						<div className="min-w-0 flex-1">
							<h3 className="truncate text-xl font-bold text-gray-900 dark:text-white">
								{record.merchantName || "Merchant"}
							</h3>
							<p className="mt-1 text-lg text-gray-500 dark:text-gray-400">
								{getFrequencyLabel(record.frequency)}
							</p>
						</div>
						<p className="shrink-0 text-xl font-bold text-gray-900 dark:text-white">
							{formatSignedCurrency(displayAmount)}
						</p>
						<RecurringRowMenu
							record={record}
							onViewMerchant={() => {
								setOpen(false);
								viewMerchant();
							}}
							onEdit={() => runAfterPopoverCloses(onEdit)}
							onMarkNotRecurring={() =>
								runAfterPopoverCloses(onMarkNotRecurring)
							}
						/>
					</div>

					{showVariance && (
						<div className="mx-6 mb-6 rounded-xl bg-amber-100 px-5 py-4 text-base font-semibold leading-relaxed text-amber-800 dark:bg-amber-950/70 dark:text-amber-300">
							This transaction was{" "}
							{formatSignedCurrency(Math.abs(amountDifference))}{" "}
							{amountDifference > 0 ? "higher" : "lower"} than the expected
							amount of {formatSignedCurrency(expectedAmount)} for this merchant
						</div>
					)}

					<div className="border-y border-gray-200 bg-gray-50 px-6 py-3 text-sm font-bold uppercase tracking-[0.12em] text-gray-500 dark:border-white/5 dark:bg-white/[0.035] dark:text-gray-400">
						Recent transactions
					</div>

					<div className="divide-y divide-gray-100 dark:divide-white/5">
						{recentTransactions.map((transaction) => {
							const transactionAmount = absoluteAmount(transaction.amount);
							const categoryName =
								transaction.category || record.categoryName || "Uncategorized";
							const categoryTheme = getCategoryTheme(categoryName);
							const colorClass = categoryTheme?.text ?? "text-gray-400";
							return (
								<button
									key={transaction.id}
									type="button"
									onClick={() => {
										setOpen(false);
										router.push(
											`/transactions/${encodeURIComponent(transaction.id)}`,
										);
									}}
									className="group grid min-h-[84px] w-full grid-cols-[36px_minmax(0,1fr)_28px_110px] items-center gap-3 px-6 text-left transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-500/30 dark:hover:bg-white/[0.035]"
								>
									<CategoryIcon
										name={
											transaction.category ||
											record.categoryName ||
											"Uncategorized"
										}
										size={20}
										colorClass={colorClass}
									/>
									<span className="truncate text-base font-semibold text-gray-900 transition-colors group-hover:text-cyan-600 group-focus-visible:text-cyan-600 dark:text-white dark:group-hover:text-cyan-400 dark:group-focus-visible:text-cyan-400">
										{formatLongDate(transaction.date)}
									</span>
									<CalendarDays
										size={17}
										className="text-gray-500 dark:text-gray-400"
									/>
									<span className="text-right text-base font-bold text-gray-900 transition-colors group-hover:text-cyan-600 group-focus-visible:text-cyan-600 dark:text-white dark:group-hover:text-cyan-400 dark:group-focus-visible:text-cyan-400">
										{formatSignedCurrency(transactionAmount)}
									</span>
								</button>
							);
						})}
						{recentTransactions.length === 0 && (
							<div className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
								No recent transactions found.
							</div>
						)}
					</div>

					<button
						type="button"
						onClick={() => {
							setOpen(false);
							viewMerchant();
						}}
						className="flex min-h-[72px] w-full items-center justify-center border-t border-gray-200 px-6 text-base font-bold text-cyan-600 transition-colors hover:bg-gray-50 dark:border-white/5 dark:text-cyan-400 dark:hover:bg-white/[0.035]"
					>
						View all {merchantTransactions.length} transactions
					</button>

					<Popover.Arrow className="fill-white dark:fill-[#232322]" />
				</Popover.Content>
			</Popover.Portal>
		</Popover.Root>
	);
}
