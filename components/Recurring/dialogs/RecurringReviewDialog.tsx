/**
 * Dialog for reviewing recurring candidates.
 */
"use client";

import { useState, type ReactNode } from "react";
import { LoaderCircle } from "lucide-react";

import { CategoryIcon } from "@/components/CategoryIcon";
import { MerchantLogo } from "@/components/Merchants/MerchantLogo";
import { RecurringDialog } from "../ui/RecurringDialog";
import type {
	RecurringCandidate,
	RecurringFrequency,
	RecurringRecord,
	RecurringType,
} from "../types";
import {
	createRecordFromCandidate,
	formatLongDate,
	getFrequencyLabel,
	getTypeLabel,
	RECURRING_FREQUENCIES,
} from "../utils";
import { formatMoney } from "@/utils/formatters";

const MINIMUM_SAVE_FEEDBACK_MS = 500;

function wait(milliseconds: number): Promise<void> {
	return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

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
	onSave: (record: RecurringRecord) => Promise<void>;
}) {
	if (!candidate) return null;
	return (
		<ReviewSession
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
	const [isSaving, setIsSaving] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);

	const saveCandidate = async (record: RecurringRecord): Promise<void> => {
		if (isSaving) return;
		const startedAt = Date.now();
		setIsSaving(true);
		setSaveError(null);
		await wait(0);
		try {
			await onSave(record);
		} catch (error) {
			setSaveError(
				error instanceof Error
					? error.message
					: "The recurring item could not be saved.",
			);
		} finally {
			const elapsed = Date.now() - startedAt;
			const remaining = MINIMUM_SAVE_FEEDBACK_MS - elapsed;
			if (remaining > 0) await wait(remaining);
			setIsSaving(false);
		}
	};

	const skipCandidate = (): void => {
		if (isSaving) return;
		setSaveError(null);
		onSkip();
	};

	const markCandidateNotRecurring = (
		nextCandidate: RecurringCandidate,
	): void => {
		if (isSaving) return;
		setSaveError(null);
		onNotRecurring(nextCandidate);
	};

	return (
		<RecurringDialog
			open={open}
			onOpenChange={(next) => {
				if (!next && !isSaving) onClose();
			}}
			title="Is this merchant recurring?"
			maxWidthClass="max-w-[820px]"
		>
			<ReviewCandidateForm
				key={candidate.key}
				candidate={candidate}
				remainingCount={remainingCount}
				isSaving={isSaving}
				saveError={saveError}
				onSkip={skipCandidate}
				onNotRecurring={markCandidateNotRecurring}
				onSave={saveCandidate}
			/>
		</RecurringDialog>
	);
}

function ReviewCandidateForm({
	candidate,
	remainingCount,
	isSaving,
	saveError,
	onSkip,
	onNotRecurring,
	onSave,
}: {
	candidate: RecurringCandidate;
	remainingCount: number;
	isSaving: boolean;
	saveError: string | null;
	onSkip: () => void;
	onNotRecurring: (candidate: RecurringCandidate) => void;
	onSave: (record: RecurringRecord) => Promise<void>;
}) {
	const [amount, setAmount] = useState(candidate.suggestedAmount.toFixed(2));
	const [type, setType] = useState<RecurringType>(candidate.suggestedType);
	const [frequency, setFrequency] = useState<RecurringFrequency>("monthly");

	const saveCurrentCandidate = async (): Promise<void> => {
		if (isSaving) return;
		const record = createRecordFromCandidate(candidate);
		await onSave({
			...record,
			amount: Number(amount.replaceAll(",", "")) || 0,
			type,
			frequency,
			updatedAt: new Date().toISOString(),
		});
	};

	return (
		<>
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
								disabled={isSaving}
								onChange={(event) =>
									setAmount(event.target.value.replace(/[^0-9.,]/g, ""))
								}
								inputMode="decimal"
								className="h-15 w-full rounded-xl border border-gray-300 bg-transparent pl-10 pr-4 text-lg font-semibold outline-none focus:border-cyan-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10"
							/>
						</div>
					</Field>

					<SelectField
						label="Recurring type"
						value={type}
						disabled={isSaving}
						onChange={(value) => setType(value as RecurringType)}
						options={(["income", "expense", "credit-card"] as const).map(
							(value) => ({
								value,
								label: getTypeLabel(value),
							}),
						)}
					/>

					<SelectField
						label="Recurring frequency"
						value={frequency}
						disabled={isSaving}
						onChange={(value) => setFrequency(value as RecurringFrequency)}
						options={RECURRING_FREQUENCIES.map((value) => ({
							value,
							label: getFrequencyLabel(value),
						}))}
					/>
				</div>

				{isSaving && (
					<div
						role="status"
						aria-live="polite"
						className="mt-5 flex items-center gap-3 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm font-bold text-cyan-800 dark:border-cyan-400/25 dark:bg-cyan-400/10 dark:text-cyan-200"
					>
						<LoaderCircle
							size={18}
							aria-hidden="true"
							className="shrink-0 animate-spin"
						/>
						Saving recurring merchant…
					</div>
				)}

				{saveError && (
					<p
						role="alert"
						className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-300"
					>
						{saveError}
					</p>
				)}
			</div>

			<footer className="flex items-center gap-4 border-t border-gray-200 px-8 py-5 dark:border-white/5">
				<button
					type="button"
					onClick={onSkip}
					disabled={isSaving}
					className="rounded-xl border border-gray-300 px-5 py-3 font-bold disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/15"
				>
					Skip
				</button>

				<div className="flex-1" />

				<button
					type="button"
					onClick={() => onNotRecurring(candidate)}
					disabled={isSaving}
					className="rounded-xl border border-gray-300 px-5 py-3 font-bold disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/15"
				>
					Not recurring
				</button>

				<button
					type="button"
					onClick={() => void saveCurrentCandidate()}
					disabled={isSaving}
					aria-busy={isSaving}
					className="inline-flex min-w-[190px] items-center justify-center gap-2 rounded-xl bg-[#FF6633] px-6 py-3 font-bold text-white transition-colors hover:bg-[#f35724] disabled:cursor-wait disabled:opacity-75"
				>
					{isSaving && (
						<LoaderCircle
							size={18}
							aria-hidden="true"
							className="animate-spin"
						/>
					)}
					<span>{isSaving ? "Saving recurring…" : "Save as recurring"}</span>
				</button>
			</footer>
		</>
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
	disabled = false,
	onChange,
	options,
}: {
	label: string;
	value: string;
	disabled?: boolean;
	onChange: (value: string) => void;
	options: Array<{ value: string; label: string }>;
}) {
	return (
		<Field label={label}>
			<select
				value={value}
				disabled={disabled}
				onChange={(event) => onChange(event.target.value)}
				className="h-15 w-full rounded-xl border border-gray-300 bg-white px-4 text-lg font-semibold outline-none focus:border-cyan-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-[#222221]"
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
