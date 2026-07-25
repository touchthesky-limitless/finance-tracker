"use client";

import { useState, type ReactNode } from "react";

import { CategoryIcon } from "@/components/CategoryIcon";
import { MerchantLogo } from "@/components/Merchants/MerchantLogo";
import { RecurringDialog } from "@/components/Recurring/RecurringDialog";
import type {
	RecurringCandidate,
	RecurringFrequency,
	RecurringRecord,
	RecurringType,
} from "@/components/Recurring/types";
import {
	createRecordFromCandidate,
	formatLongDate,
	getFrequencyLabel,
	getTypeLabel,
	RECURRING_FREQUENCIES,
} from "@/components/Recurring/recurringUtils";
import { formatMoney } from "@/utils/formatters";

export function RecurringReviewDialog({
	open,
	candidate,
	remainingCount,
	onClose,
	onSkip,
	onNotRecurring,
	onSave,
}: {
	open: boolean;
	candidate: RecurringCandidate | null;
	remainingCount: number;
	onClose: () => void;
	onSkip: () => void;
	onNotRecurring: (candidate: RecurringCandidate) => void;
	onSave: (record: RecurringRecord) => void;
}) {
	if (!candidate) return null;
	return (
		<ReviewSession
			key={candidate.key}
			open={open}
			candidate={candidate}
			remainingCount={remainingCount}
			onClose={onClose}
			onSkip={onSkip}
			onNotRecurring={onNotRecurring}
			onSave={onSave}
		/>
	);
}

function ReviewSession({
	open,
	candidate,
	remainingCount,
	onClose,
	onSkip,
	onNotRecurring,
	onSave,
}: Parameters<typeof RecurringReviewDialog>[0] & {
	candidate: RecurringCandidate;
}) {
	const [amount, setAmount] = useState(candidate.suggestedAmount.toFixed(2));
	const [type, setType] = useState<RecurringType>(candidate.suggestedType);
	const [frequency, setFrequency] = useState<RecurringFrequency>(
		candidate.suggestedFrequency,
	);
	return (
		<RecurringDialog
			open={open}
			onOpenChange={(next) => !next && onClose()}
			title="Is this merchant recurring?"
			maxWidthClass="max-w-[820px]"
		>
			<div className="max-h-[calc(100vh-180px)] overflow-y-auto p-8">
				<p className="-mt-4 mb-7 text-lg font-semibold text-gray-600 dark:text-gray-300">
					There are {remainingCount} more recurring items to review
				</p>
				<section className="overflow-hidden rounded-2xl border border-gray-200 dark:border-white/10">
					<div className="flex items-center gap-5 p-7">
						<MerchantLogo
							name={candidate.merchantName}
							logoUrl={candidate.logoUrl}
							size="lg"
							className="!size-[72px]"
						/>
						<div className="min-w-0 flex-1">
							<h3 className="truncate text-xl font-bold">
								{candidate.merchantName}
							</h3>
							<p className="mt-1 text-lg text-gray-500 dark:text-gray-400">
								{candidate.transactions.length} transactions
							</p>
						</div>
						<span className="rounded-full bg-gray-100 px-4 py-2 text-sm font-bold uppercase text-gray-500 dark:bg-white/8 dark:text-gray-400">
							Merchant
						</span>
					</div>
					<div className="bg-gray-50 px-6 py-3 text-sm font-bold uppercase tracking-[0.14em] text-gray-500 dark:bg-white/[0.04] dark:text-gray-400">
						Recent transactions
					</div>
					{candidate.transactions.slice(0, 3).map((transaction) => (
						<div
							key={transaction.id}
							className="flex min-h-20 items-center gap-4 border-t border-gray-100 px-7 dark:border-white/5"
						>
							<CategoryIcon
								name={transaction.category || "Uncategorized"}
								size={20}
							/>
							<span className="flex-1 text-lg font-semibold">
								{formatLongDate(transaction.date)}
							</span>
							<span className="text-lg font-bold">
								{formatMoney(Math.abs(transaction.amount))}
							</span>
						</div>
					))}
				</section>
				<div className="mt-7 space-y-6">
					<Field label="Amount">
						<div className="relative">
							<span className="absolute left-5 top-1/2 -translate-y-1/2 text-lg font-semibold text-gray-500">
								$
							</span>
							<input
								value={amount}
								onChange={(event) =>
									setAmount(event.target.value.replace(/[^0-9.,]/g, ""))
								}
								inputMode="decimal"
								className="h-15 w-full rounded-xl border border-gray-300 bg-transparent pl-10 pr-4 text-lg font-semibold outline-none focus:border-cyan-500 dark:border-white/10"
							/>
						</div>
					</Field>
					<SelectField
						label="Recurring type"
						value={type}
						onChange={(value) => setType(value as RecurringType)}
						options={(["income", "expense", "credit-card"] as const).map(
							(value) => ({ value, label: getTypeLabel(value) }),
						)}
					/>
					<SelectField
						label="Recurring frequency"
						value={frequency}
						onChange={(value) => setFrequency(value as RecurringFrequency)}
						options={RECURRING_FREQUENCIES.map((value) => ({
							value,
							label: getFrequencyLabel(value),
						}))}
					/>
				</div>
			</div>
			<footer className="flex items-center gap-4 border-t border-gray-200 px-8 py-5 dark:border-white/5">
				<button
					type="button"
					onClick={onSkip}
					className="rounded-xl border border-gray-300 px-5 py-3 font-bold dark:border-white/15"
				>
					Skip
				</button>
				<div className="flex-1" />
				<button
					type="button"
					onClick={() => onNotRecurring(candidate)}
					className="rounded-xl border border-gray-300 px-5 py-3 font-bold dark:border-white/15"
				>
					Not recurring
				</button>
				<button
					type="button"
					onClick={() => {
						const record = createRecordFromCandidate(candidate);
						onSave({
							...record,
							amount: Number(amount.replaceAll(",", "")) || 0,
							type,
							frequency,
							updatedAt: new Date().toISOString(),
						});
					}}
					className="rounded-xl bg-[#FF6633] px-6 py-3 font-bold text-white"
				>
					Save as recurring
				</button>
			</footer>
		</RecurringDialog>
	);
}

function Field({ label, children }: { label: string; children: ReactNode }) {
	return (
		<label className="block">
			<span className="mb-3 block text-base font-bold">{label}</span>
			{children}
		</label>
	);
}
function SelectField({
	label,
	value,
	onChange,
	options,
}: {
	label: string;
	value: string;
	onChange: (value: string) => void;
	options: Array<{ value: string; label: string }>;
}) {
	return (
		<Field label={label}>
			<select
				value={value}
				onChange={(event) => onChange(event.target.value)}
				className="h-15 w-full rounded-xl border border-gray-300 bg-white px-4 text-lg font-semibold outline-none focus:border-cyan-500 dark:border-white/10 dark:bg-[#222221]"
			>
				{options.map((option) => (
					<option key={option.value} value={option.value}>
						{option.label}
					</option>
				))}
			</select>
		</Field>
	);
}
