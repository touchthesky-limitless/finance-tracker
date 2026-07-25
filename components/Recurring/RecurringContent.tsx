"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Landmark } from "lucide-react";

import { CategoryIcon } from "@/components/CategoryIcon";
import { MerchantLogo } from "@/components/Merchants/MerchantLogo";
import { RecurringCalendarMerchantPopover } from "@/components/Recurring/RecurringCalendarMerchantPopover";
import { RecurringRowMenu } from "@/components/Recurring/RecurringRowMenu";
import { SortableHeader } from "@/components/Recurring/RecurringControls";
import type {
	AllRecurringGroupMode,
	RecurringOccurrence,
	RecurringRecord,
	RecurringSortState,
} from "@/components/Recurring/types";
import {
	formatLongDate,
	formatRelativeDays,
	getFrequencyLabel,
	getNextOccurrenceDate,
	getRecordGroupLabel,
	sortOccurrences,
	sortRecords,
	toDateInputValue,
} from "@/components/Recurring/recurringUtils";
import type { Transaction } from "@/store/useBudgetStore";
import { formatMoney } from "@/utils/formatters";

interface RecurringContentProps {
	records: RecurringRecord[];
	occurrences: RecurringOccurrence[];
	transactions: Transaction[];
	view: "list" | "calendar";
	month: Date;
	tab: "monthly" | "all";
	sort: RecurringSortState;
	onSortChange: (sort: RecurringSortState) => void;
	groupMode: AllRecurringGroupMode;
	onManage: () => void;
	onEdit: (record: RecurringRecord) => void;
	onMarkNotRecurring: (record: RecurringRecord) => void;
}

export function RecurringContent(props: RecurringContentProps) {
	const { records, occurrences, view, tab, onManage } = props;
	if (
		(tab === "monthly" && occurrences.length === 0) ||
		(tab === "all" && records.length === 0)
	) {
		return (
			<div className="grid min-h-[340px] place-items-center rounded-2xl border border-gray-200 bg-white px-6 text-center shadow-sm dark:border-white/5 dark:bg-[#232322]">
				<div>
					<h3 className="text-2xl font-bold text-gray-900 dark:text-white">
						No recurring items yet.
					</h3>
					<p className="mx-auto mt-2 max-w-sm text-lg leading-relaxed text-gray-600 dark:text-gray-300">
						We couldn&apos;t find recurring items for the selected month.
					</p>
					<button
						type="button"
						onClick={onManage}
						className="mt-7 rounded-xl bg-[#FF6633] px-7 py-4 text-lg font-bold text-white transition hover:bg-[#f35724]"
					>
						Manage recurring
					</button>
				</div>
			</div>
		);
	}

	if (tab === "all") return <AllRecurringList {...props} />;
	return view === "calendar" ? (
		<RecurringCalendarView {...props} />
	) : (
		<RecurringListView {...props} />
	);
}

function RecurringListView({
	occurrences,
	sort,
	onSortChange,
	onEdit,
	onMarkNotRecurring,
}: RecurringContentProps) {
	const upcoming = sortOccurrences(
		occurrences.filter((item) => item.status !== "complete"),
		sort,
	);
	const complete = sortOccurrences(
		occurrences.filter((item) => item.status === "complete"),
		sort,
	);
	return (
		<div className="space-y-5">
			{upcoming.length > 0 && (
				<OccurrenceSection
					title="Upcoming"
					items={upcoming}
					sort={sort}
					onSortChange={onSortChange}
					onEdit={onEdit}
					onMarkNotRecurring={onMarkNotRecurring}
				/>
			)}
			{complete.length > 0 && (
				<OccurrenceSection
					title="Complete"
					items={complete}
					sort={sort}
					onSortChange={onSortChange}
					onEdit={onEdit}
					onMarkNotRecurring={onMarkNotRecurring}
				/>
			)}
		</div>
	);
}

function OccurrenceSection({
	title,
	items,
	sort,
	onSortChange,
	onEdit,
	onMarkNotRecurring,
}: {
	title: string;
	items: RecurringOccurrence[];
	sort: RecurringSortState;
	onSortChange: (sort: RecurringSortState) => void;
	onEdit: (record: RecurringRecord) => void;
	onMarkNotRecurring: (record: RecurringRecord) => void;
}) {
	const [expanded, setExpanded] = useState(true);
	const totals = getTotals(items.map((item) => item.record));
	return (
		<>
			<section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/5 dark:bg-[#232322]">
				<div className="grid min-h-16 grid-cols-[minmax(230px,1.1fr)_minmax(150px,.65fr)_minmax(220px,1fr)_minmax(220px,1fr)_140px_60px] items-center border-b border-gray-200 px-6 dark:border-white/5">
					<button
						type="button"
						onClick={() => setExpanded((value) => !value)}
						className="flex items-center gap-4 text-left text-lg font-bold"
					>
						<ChevronDown
							size={19}
							className={`transition ${expanded ? "" : "-rotate-90"}`}
						/>
						{title}
					</button>
					<SortableHeader
						label="Date"
						sortKey="date"
						sort={sort}
						onSortChange={onSortChange}
					/>
					<SortableHeader
						label="Payment Account"
						sortKey="account"
						sort={sort}
						onSortChange={onSortChange}
					/>
					<SortableHeader
						label="Category"
						sortKey="category"
						sort={sort}
						onSortChange={onSortChange}
					/>
					<SortableHeader
						label="Amount"
						sortKey="amount"
						sort={sort}
						onSortChange={onSortChange}
					/>
				</div>
				{expanded &&
					items.map((item) => (
						<OccurrenceRow
							key={item.id}
							occurrence={item}
							onEdit={onEdit}
							onMarkNotRecurring={onMarkNotRecurring}
						/>
					))}
			</section>
			<TotalBar title={title} totals={totals} />
		</>
	);
}

function OccurrenceRow({
	occurrence,
	onEdit,
	onMarkNotRecurring,
}: {
	occurrence: RecurringOccurrence;
	onEdit: (record: RecurringRecord) => void;
	onMarkNotRecurring: (record: RecurringRecord) => void;
}) {
	const router = useRouter();
	const { record } = occurrence;
	const viewMerchant = (): void => {
		if (record.merchantId)
			router.push(`/merchants/${encodeURIComponent(record.merchantId)}`);
	};
	return (
		<div className="grid min-h-[82px] grid-cols-[minmax(230px,1.1fr)_minmax(150px,.65fr)_minmax(220px,1fr)_minmax(220px,1fr)_140px_60px] items-center border-b border-gray-100 px-6 last:border-0 dark:border-white/5">
			<button
				type="button"
				onClick={viewMerchant}
				disabled={!record.merchantId}
				title={record.merchantName || "Merchant"}
				className="group flex min-w-0 items-center gap-4 text-left disabled:cursor-default"
			>
				<MerchantLogo
					name={record.merchantName}
					logoUrl={record.logoUrl}
					size="lg"
				/>
				<span className="min-w-0">
					<span className="block truncate text-base font-bold text-gray-900 transition-colors group-hover:text-cyan-600 group-focus-visible:text-cyan-600 dark:text-white dark:group-hover:text-cyan-400 dark:group-focus-visible:text-cyan-400">
						{record.merchantName}
					</span>
					<span className="mt-1 block text-sm text-gray-500 dark:text-gray-400">
						{getFrequencyLabel(record.frequency)}
					</span>
				</span>
			</button>
			<button
				type="button"
				onClick={() => {
					router.push(
						`/transactions?startDate=${toDateInputValue(
							occurrence.date,
						)}&endDate=${toDateInputValue(occurrence.date)}`,
					);
				}}
				title={`${formatLongDate(occurrence.date)} (${formatRelativeDays(
					occurrence.date,
				)})`}
				className={`text-left text-base font-semibold transition-colors hover:text-cyan-600 focus-visible:text-cyan-600 dark:hover:text-cyan-400 dark:focus-visible:text-cyan-400 ${
					occurrence.status === "overdue"
						? "text-orange-500"
						: "text-gray-900 dark:text-white"
				}`}
			>
				{formatLongDate(occurrence.date)}{" "}
				<span className="text-gray-500 dark:text-gray-400">
					({formatRelativeDays(occurrence.date)})
				</span>
			</button>
			<LinkedAccount record={record} />
			<LinkedCategory record={record} />
			<button
				type="button"
				onClick={() => {
					if (occurrence.matchedTransactionId)
						router.push(
							`/transactions/${encodeURIComponent(occurrence.matchedTransactionId)}`,
						);
					else viewMerchant();
				}}
				title={`Amount: ${formatMoney(record.amount)}`}
				className="flex items-center justify-end gap-2 text-right text-base font-bold text-gray-900 transition-colors hover:text-cyan-600 focus-visible:text-cyan-600 dark:text-white dark:hover:text-cyan-400 dark:focus-visible:text-cyan-400"
			>
				{occurrence.status === "complete" && (
					<span className="grid size-5 place-items-center rounded-full bg-emerald-700/30 text-emerald-400">
						<Check size={13} />
					</span>
				)}
				{formatMoney(record.amount)}
			</button>
			<RecurringRowMenu
				record={record}
				onViewMerchant={viewMerchant}
				onEdit={onEdit}
				onMarkNotRecurring={onMarkNotRecurring}
			/>
		</div>
	);
}

function LinkedAccount({ record }: { record: RecurringRecord }) {
	const router = useRouter();
	return (
		<button
			type="button"
			disabled={!record.accountId}
			onClick={() => {
				if (record.accountId) {
					router.push(
						`/accounts/details/${encodeURIComponent(record.accountId)}`,
					);
				}
			}}
			title={record.accountName || "No payment account"}
			className="group flex min-w-0 items-center gap-3 text-left disabled:cursor-default"
		>
			<span className="grid size-5 shrink-0 place-items-center rounded-full bg-blue-600 text-white">
				<Landmark size={11} />
			</span>
			<span className="truncate text-base font-medium text-gray-900 transition-colors group-hover:text-cyan-600 group-focus-visible:text-cyan-600 dark:text-white dark:group-hover:text-cyan-400 dark:group-focus-visible:text-cyan-400">
				{record.accountName || "No payment account"}
			</span>
		</button>
	);
}

function LinkedCategory({ record }: { record: RecurringRecord }) {
	const router = useRouter();
	return (
		<button
			type="button"
			disabled={!record.categoryId}
			onClick={() => {
				if (record.categoryId) {
					router.push(`/categories/${encodeURIComponent(record.categoryId)}`);
				}
			}}
			title={record.categoryName || "Uncategorized"}
			className="group flex min-w-0 items-center gap-3 text-left disabled:cursor-default"
		>
			<CategoryIcon name={record.categoryName || "Uncategorized"} size={19} />
			<span className="truncate text-base font-medium text-gray-900 transition-colors group-hover:text-cyan-600 group-focus-visible:text-cyan-600 dark:text-white dark:group-hover:text-cyan-400 dark:group-focus-visible:text-cyan-400">
				{record.categoryName || "Uncategorized"}
			</span>
		</button>
	);
}

function TotalBar({
	title,
	totals,
}: {
	title: string;
	totals: ReturnType<typeof getTotals>;
}) {
	return (
		<div className="grid min-h-20 grid-cols-[1fr_130px_150px_150px] items-center rounded-2xl border border-gray-200 bg-white px-7 shadow-sm dark:border-white/5 dark:bg-[#292928]">
			<div>
				<p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
				<p className="text-lg font-bold">Total</p>
			</div>
			<TotalCell label="Income" value={totals.income} />
			<TotalCell label="Credit cards" value={totals.creditCard} />
			<TotalCell label="Expenses" value={totals.expense} />
		</div>
	);
}

function TotalCell({ label, value }: { label: string; value: number }) {
	return (
		<div className="text-center">
			<p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
			<p className="text-lg font-bold">{formatMoney(value)}</p>
		</div>
	);
}

function getTotals(records: RecurringRecord[]) {
	return records.reduce(
		(totals, record) => {
			if (record.type === "income") totals.income += record.amount;
			else if (record.type === "credit-card")
				totals.creditCard += record.amount;
			else totals.expense += record.amount;
			return totals;
		},
		{ income: 0, creditCard: 0, expense: 0 },
	);
}

function AllRecurringList({
	records,
	sort,
	onSortChange,
	groupMode,
	onEdit,
	onMarkNotRecurring,
}: RecurringContentProps) {
	const sorted = sortRecords(records, sort);
	const grouped = useMemo(() => {
		const result = new Map<string, RecurringRecord[]>();
		for (const record of sorted) {
			const label = getRecordGroupLabel(record, groupMode);
			result.set(label, [...(result.get(label) ?? []), record]);
		}
		return [...result.entries()];
	}, [groupMode, sorted]);
	return (
		<div className="space-y-5">
			{grouped.map(([label, items]) => (
				<AllRecurringSection
					key={label}
					label={label}
					records={items}
					sort={sort}
					onSortChange={onSortChange}
					onEdit={onEdit}
					onMarkNotRecurring={onMarkNotRecurring}
				/>
			))}
		</div>
	);
}

function AllRecurringSection({
	label,
	records,
	sort,
	onSortChange,
	onEdit,
	onMarkNotRecurring,
}: {
	label: string;
	records: RecurringRecord[];
	sort: RecurringSortState;
	onSortChange: (sort: RecurringSortState) => void;
	onEdit: (record: RecurringRecord) => void;
	onMarkNotRecurring: (record: RecurringRecord) => void;
}) {
	const [expanded, setExpanded] = useState(true);
	return (
		<section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/5 dark:bg-[#232322]">
			<div className="grid min-h-16 grid-cols-[minmax(250px,1fr)_minmax(210px,.8fr)_minmax(220px,1fr)_minmax(220px,1fr)_140px_60px] items-center border-b border-gray-200 px-7 dark:border-white/5">
				<button
					type="button"
					onClick={() => setExpanded((value) => !value)}
					className="flex items-center gap-5 text-lg font-bold"
				>
					<ChevronDown
						size={19}
						className={`transition ${expanded ? "" : "-rotate-90"}`}
					/>
					{label}
				</button>
				<SortableHeader
					label="Next Due Date"
					sortKey="date"
					sort={sort}
					onSortChange={onSortChange}
				/>
				<SortableHeader
					label="Payment Account"
					sortKey="account"
					sort={sort}
					onSortChange={onSortChange}
				/>
				<SortableHeader
					label="Category"
					sortKey="category"
					sort={sort}
					onSortChange={onSortChange}
				/>
				<SortableHeader
					label="Amount"
					sortKey="amount"
					sort={sort}
					onSortChange={onSortChange}
				/>
			</div>
			{expanded &&
				records.map((record) => (
					<AllRecurringRow
						key={record.id}
						record={record}
						onEdit={onEdit}
						onMarkNotRecurring={onMarkNotRecurring}
					/>
				))}
		</section>
	);
}

function AllRecurringRow({
	record,
	onEdit,
	onMarkNotRecurring,
}: {
	record: RecurringRecord;
	onEdit: (record: RecurringRecord) => void;
	onMarkNotRecurring: (record: RecurringRecord) => void;
}) {
	const router = useRouter();
	const nextDate = getNextOccurrenceDate(record);
	const viewMerchant = (): void => {
		if (record.merchantId)
			router.push(`/merchants/${encodeURIComponent(record.merchantId)}`);
	};
	return (
		<div className="grid min-h-[104px] grid-cols-[minmax(250px,1fr)_minmax(210px,.8fr)_minmax(220px,1fr)_minmax(220px,1fr)_140px_60px] items-center border-b border-gray-100 px-7 last:border-0 dark:border-white/5">
			<button
				type="button"
				disabled={!record.merchantId}
				onClick={viewMerchant}
				title={record.merchantName || "Merchant"}
				className="group flex min-w-0 items-center gap-5 text-left disabled:cursor-default"
			>
				<MerchantLogo
					name={record.merchantName}
					logoUrl={record.logoUrl}
					size="lg"
					className="!size-14"
				/>
				<span className="min-w-0">
					<span className="block truncate text-lg font-bold transition-colors group-hover:text-cyan-600 group-focus-visible:text-cyan-600 dark:group-hover:text-cyan-400 dark:group-focus-visible:text-cyan-400">
						{record.merchantName}
					</span>
					<span className="mt-1 block text-base text-gray-500 dark:text-gray-400">
						{getFrequencyLabel(record.frequency)}
					</span>
				</span>
			</button>
			<button
				type="button"
				onClick={() => {
					router.push(
						`/transactions?startDate=${toDateInputValue(
							nextDate,
						)}&endDate=${toDateInputValue(nextDate)}`,
					);
				}}
				title={`${formatLongDate(nextDate)} (${formatRelativeDays(nextDate)})`}
				className="text-left text-lg font-medium transition-colors hover:text-cyan-600 focus-visible:text-cyan-600 dark:hover:text-cyan-400 dark:focus-visible:text-cyan-400"
			>
				{formatLongDate(nextDate)}{" "}
				<span className="text-gray-500 dark:text-gray-400">
					({formatRelativeDays(nextDate)})
				</span>
			</button>
			<LinkedAccount record={record} />
			<LinkedCategory record={record} />
			<button
				type="button"
				onClick={viewMerchant}
				title={`Amount: ${formatMoney(record.amount)}`}
				className="text-right text-lg font-bold transition-colors hover:text-cyan-600 focus-visible:text-cyan-600 dark:hover:text-cyan-400 dark:focus-visible:text-cyan-400"
			>
				{formatMoney(record.amount)}
			</button>
			<RecurringRowMenu
				record={record}
				onViewMerchant={viewMerchant}
				onEdit={onEdit}
				onMarkNotRecurring={onMarkNotRecurring}
			/>
		</div>
	);
}

function RecurringCalendarView({
	occurrences,
	transactions,
	month,
	onEdit,
	onMarkNotRecurring,
}: RecurringContentProps) {
	const today = new Date();
	const year = month.getUTCFullYear();
	const monthIndex = month.getUTCMonth();
	const firstDay = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
	const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
	const occurrencesByDay = new Map<number, RecurringOccurrence[]>();

	for (const occurrence of occurrences) {
		const day = occurrence.date.getUTCDate();

		occurrencesByDay.set(day, [
			...(occurrencesByDay.get(day) ?? []),
			occurrence,
		]);
	}

	const cells = Array.from({ length: 42 }, (_, index) => {
		const day = index - firstDay + 1;

		return day >= 1 && day <= daysInMonth ? day : null;
	});

	return (
		<div className="overflow-visible rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/5 dark:bg-[#232322]">
			<div className="grid grid-cols-7 border-b border-gray-200 text-center text-sm font-semibold text-gray-500 dark:border-white/5 dark:text-gray-400">
				{[
					"Sunday",
					"Monday",
					"Tuesday",
					"Wednesday",
					"Thursday",
					"Friday",
					"Saturday",
				].map((day) => {
					return (
						<div key={day} className="py-5">
							{day}
						</div>
					);
				})}
			</div>

			<div className="grid grid-cols-7">
				{cells.map((day, index) => {
					return (
						<div
							key={index}
							className="min-h-32 border-b border-r border-gray-100 p-3 dark:border-white/5"
						>
							{day && (
								<span
									className={`grid size-7 place-items-center rounded-full text-sm font-semibold ${
										day === today.getDate() &&
										monthIndex === today.getMonth() &&
										year === today.getFullYear()
											? "bg-[#FF6633] text-white"
											: ""
									}`}
								>
									{day}
								</span>
							)}

							<div className="mt-2 space-y-1">
								{day &&
									(occurrencesByDay.get(day) ?? []).map((occurrence) => {
										return (
											<RecurringCalendarMerchantPopover
												key={occurrence.id}
												occurrence={occurrence}
												transactions={transactions}
												onEdit={onEdit}
												onMarkNotRecurring={onMarkNotRecurring}
											/>
										);
									})}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
