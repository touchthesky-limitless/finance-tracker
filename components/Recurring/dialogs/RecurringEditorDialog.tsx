/**
 * Dialog for editing a recurring merchant.
 */
"use client";

import { useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { Loader2 } from "lucide-react";

import { type MerchantEditorValue } from "@/components/Merchants/MerchantEditorModal";
import { MerchantLogo } from "@/components/Merchants/MerchantLogo";
import type { MerchantListItem } from "@/components/Merchants/types";
import { RecurringDatePicker } from "../ui/RecurringDatePicker";
import { RecurringDialog } from "../ui/RecurringDialog";
import type {
	RecurringCandidate,
	RecurringFrequency,
	RecurringRecord,
	RecurringStatus,
	RecurringType,
} from "../types";
import {
	createRecordFromCandidate,
	getFrequencyLabel,
	getTypeLabel,
	RECURRING_FREQUENCIES,
} from "../utils";
import type { Account, CustomCategory } from "@/store/useBudgetStore";

const FIELD_CLASS =
	"h-12 w-full rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-900 outline-none transition-colors focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-[#20201f] dark:text-white";

interface RecurringEditorDialogProps {
	open: boolean;
	isCovered?: boolean;
	candidate: RecurringCandidate;
	existingRecord?: RecurringRecord | null;
	accounts: Account[];
	categories: CustomCategory[];
	merchantItems: MerchantListItem[];
	onClose: () => void;
	onSave: (record: RecurringRecord) => void | Promise<void>;
	onRequestMerge: (
		source: MerchantEditorValue,
		record: RecurringRecord,
	) => void;
}

function sanitizeAmountInput(value: string): string {
	const cleaned = value.replaceAll(",", "").replace(/[^0-9.]/g, "");
	const [whole = "", ...decimalParts] = cleaned.split(".");
	const decimal = decimalParts.join("").slice(0, 2);
	if (cleaned.includes(".")) {
		return `${whole}.${decimal}`;
	}
	return whole;
}

function normalizeAmountInput(value: string, fallback: number): string {
	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed < 0) {
		return fallback.toFixed(2);
	}
	return parsed.toFixed(2);
}

function isIsoDate(value: string): boolean {
	return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function RecurringEditorDialog({
	open,
	isCovered = false,
	candidate,
	existingRecord,
	accounts,
	categories,
	merchantItems,
	onClose,
	onSave,
	onRequestMerge,
}: RecurringEditorDialogProps) {
	return (
		<EditorSession
			key={`${candidate.key}:${existingRecord?.updatedAt ?? "new"}`}
			open={open}
			isCovered={isCovered}
			candidate={candidate}
			existingRecord={existingRecord}
			accounts={accounts}
			categories={categories}
			merchantItems={merchantItems}
			onClose={onClose}
			onSave={onSave}
			onRequestMerge={onRequestMerge}
		/>
	);
}

function EditorSession({
	open,
	isCovered = false,
	candidate,
	existingRecord,
	accounts,
	categories,
	merchantItems,
	onClose,
	onSave,
	onRequestMerge,
}: RecurringEditorDialogProps) {
	const base = existingRecord ?? createRecordFromCandidate(candidate);
	const fileInputRef = useRef<HTMLInputElement | null>(null);

	const [merchantName, setMerchantName] = useState(base.merchantName);
	const [logoUrl, setLogoUrl] = useState(base.logoUrl);
	const [isRecurring, setIsRecurring] = useState(base.status === "active");
	const [frequency, setFrequency] = useState<RecurringFrequency>(
		base.frequency,
	);
	const [type, setType] = useState<RecurringType>(base.type);
	const [startingDate, setStartingDate] = useState(base.startingDate);
	const [amount, setAmount] = useState(base.amount.toFixed(2));
	const [status, setStatus] = useState<RecurringStatus>(base.status);
	const [isSaving, setIsSaving] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	const cleanMerchantName = merchantName.trim();
	const parsedAmount = Number(amount);
	const amountIsValid =
		Boolean(amount) && Number.isFinite(parsedAmount) && parsedAmount >= 0;
	const startingDateIsValid = isIsoDate(startingDate);
	const canSave =
		Boolean(cleanMerchantName) &&
		(!isRecurring || (amountIsValid && startingDateIsValid)) &&
		!isSaving;

	const merchantItem = merchantItems.find((merchant) => {
		if (base.merchantId) {
			return merchant.id === base.merchantId;
		}
		return (
			merchant.name.trim().toLowerCase() ===
			base.merchantName.trim().toLowerCase()
		);
	});

	const mergeSource: MerchantEditorValue = {
		id: base.merchantId ?? candidate.merchantId ?? base.id,
		name: base.merchantName,
		logoUrl,
		transactionCount:
			merchantItem?.transactionCount ?? candidate.transactions.length,
		isSystem: false,
	};

	const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>): void => {
		const file = event.target.files?.[0];
		event.target.value = "";
		if (!file) return;
		if (!file.type.startsWith("image/")) {
			setErrorMessage("Choose a valid image file.");
			return;
		}
		if (file.size > 2 * 1024 * 1024) {
			setErrorMessage("Merchant photos must be 2 MB or smaller.");
			return;
		}
		const reader = new FileReader();
		reader.addEventListener("load", () => {
			if (typeof reader.result === "string") {
				setLogoUrl(reader.result);
				setErrorMessage(null);
			}
		});
		reader.addEventListener("error", () => {
			setErrorMessage("The selected image could not be read.");
		});
		reader.readAsDataURL(file);
	};

	const updateRecurringEnabled = (enabled: boolean): void => {
		setIsRecurring(enabled);
		setStatus(enabled ? "active" : "canceled");
	};

	const updateStatus = (nextStatus: RecurringStatus): void => {
		setStatus(nextStatus);
		setIsRecurring(nextStatus === "active");
	};

	const createNextRecord = (): RecurringRecord => {
		const account = accounts.find((item) => item.id === base.accountId);
		const category = categories.find((item) => item.id === base.categoryId);
		const nextAmount = amountIsValid ? parsedAmount : base.amount;
		const nextStartingDate = startingDateIsValid
			? startingDate
			: base.startingDate;
		return {
			...base,
			merchantName: cleanMerchantName || base.merchantName,
			logoUrl,
			amount: nextAmount,
			type,
			frequency,
			startingDate: nextStartingDate,
			status: isRecurring ? status : "canceled",
			accountId: account?.id ?? base.accountId,
			accountName: account?.name ?? base.accountName,
			categoryId: category?.id ?? base.categoryId,
			categoryName: category?.name ?? base.categoryName,
			updatedAt: new Date().toISOString(),
		};
	};

	const handleSave = async (): Promise<void> => {
		if (!canSave) return;
		setIsSaving(true);
		setErrorMessage(null);
		try {
			await onSave(createNextRecord());
		} catch (error) {
			setErrorMessage(
				error instanceof Error
					? error.message
					: "The recurring merchant could not be saved.",
			);
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<RecurringDialog
			open={open}
			modal={!isCovered}
			onOpenChange={(nextOpen) => {
				if (!nextOpen && !isSaving && !isCovered) {
					onClose();
				}
			}}
			title="Edit merchant"
			maxWidthClass="max-w-[500px]"
			position="top"
		>
			<div className="max-h-[calc(100vh-132px)] overflow-y-auto px-5 py-5 sm:px-6">
				<div className="flex flex-col gap-5 sm:flex-row sm:items-center">
					<MerchantLogo
						name={cleanMerchantName || base.merchantName}
						logoUrl={logoUrl}
						size="lg"
						className="!size-14"
					/>
					<input
						ref={fileInputRef}
						type="file"
						accept="image/*"
						onChange={handlePhotoChange}
						className="sr-only"
					/>
					<div className="flex flex-wrap gap-3">
						<button
							type="button"
							onClick={() => fileInputRef.current?.click()}
							disabled={isSaving}
							className="h-10 rounded-lg border border-gray-300 px-5 text-base font-bold transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-white/15 dark:hover:bg-white/6"
						>
							Choose photo
						</button>
						<button
							type="button"
							onClick={() => setLogoUrl(null)}
							disabled={isSaving || !logoUrl}
							className="h-10 rounded-lg border border-gray-300 px-5 text-base font-bold transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-45 dark:border-white/15 dark:hover:bg-white/6"
						>
							Remove
						</button>
					</div>
				</div>

				<div className="mt-8">
					<Field label="Merchant name">
						<input
							value={merchantName}
							onChange={(event) => setMerchantName(event.target.value)}
							disabled={isSaving}
							className={FIELD_CLASS}
						/>
					</Field>
				</div>

				<section className="mt-6 rounded-xl border border-gray-200 px-4 py-4 dark:border-white/10">
					<div className="flex items-start gap-5">
						<div className="min-w-0 flex-1">
							<h3 className="text-base font-bold">
								Mark this merchant as recurring
							</h3>
							<p className="mt-2 max-w-[600px] text-sm leading-6 text-gray-600 dark:text-gray-300">
								This merchant will show on the Recurring section with expected
								upcoming transactions.{" "}
								<a
									href="/recurring"
									className="font-semibold text-cyan-600 hover:underline dark:text-cyan-400"
								>
									Learn more
								</a>
							</p>
						</div>
						<button
							type="button"
							role="switch"
							aria-label="Mark merchant as recurring"
							aria-checked={isRecurring}
							onClick={() => updateRecurringEnabled(!isRecurring)}
							disabled={isSaving}
							className={`relative mt-1 inline-flex h-7 w-[52px] shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 disabled:opacity-50 ${
								isRecurring ? "bg-[#FF6633]" : "bg-gray-400 dark:bg-gray-600"
							}`}
						>
							<span
								className={`absolute left-1 top-1 size-5 rounded-full bg-white shadow-sm transition-transform ${
									isRecurring ? "translate-x-6" : "translate-x-0"
								}`}
							/>
						</button>
					</div>

					<div
						aria-hidden={!isRecurring}
						className={`grid transition-[grid-template-rows,opacity,margin] duration-250 ease-out ${
							isRecurring
								? "mt-5 grid-rows-[1fr] opacity-100"
								: "mt-0 grid-rows-[0fr] opacity-0"
						}`}
					>
						<div className="min-h-0 overflow-hidden">
							<div className="space-y-5">
								<SelectField
									label="Recurring frequency"
									value={frequency}
									onChange={(value) =>
										setFrequency(value as RecurringFrequency)
									}
									options={RECURRING_FREQUENCIES.map((value) => ({
										value,
										label: getFrequencyLabel(value),
									}))}
								/>

								<SelectField
									label="Recurring type"
									value={type}
									onChange={(value) => setType(value as RecurringType)}
									options={(["income", "expense", "credit-card"] as const).map(
										(value) => ({
											value,
											label: getTypeLabel(value),
										}),
									)}
								/>

								<Field label="Starting date">
									<RecurringDatePicker
										value={startingDate}
										onChange={setStartingDate}
										disabled={isSaving}
									/>
									<p className="mt-3 text-sm leading-6 text-gray-500 dark:text-gray-400">
										This date is used to forecast future transactions at this
										merchant
									</p>
								</Field>

								<Field label="Amount">
									<label className="relative block">
										<span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-sm font-semibold text-gray-500 dark:text-gray-400">
											$
										</span>
										<input
											value={amount}
											onChange={(event) =>
												setAmount(sanitizeAmountInput(event.target.value))
											}
											onBlur={() =>
												setAmount(normalizeAmountInput(amount, base.amount))
											}
											onFocus={(event) => event.currentTarget.select()}
											disabled={isSaving}
											inputMode="decimal"
											aria-label="Recurring amount"
											className={`${FIELD_CLASS} pl-9 pr-4`}
										/>
									</label>
								</Field>

								<SelectField
									label="Recurring status"
									value={status}
									onChange={(value) => updateStatus(value as RecurringStatus)}
									options={[
										{ value: "active", label: "Active" },
										{ value: "canceled", label: "Canceled" },
									]}
								/>

								<p className="-mt-3 text-sm leading-6 text-gray-500 dark:text-gray-400">
									If you set the status to Canceled, we'll show past
									transactions on the recurring calendar, but won't forecast any
									future transactions.
								</p>
							</div>
						</div>
					</div>
				</section>

				{errorMessage && (
					<p className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:bg-red-500/10 dark:text-red-300">
						{errorMessage}
					</p>
				)}
			</div>

			<footer className="flex flex-col gap-3 border-t border-gray-200 px-5 py-4 sm:flex-row sm:items-center sm:px-6 dark:border-white/5">
				{existingRecord && (
					<button
						type="button"
						onClick={() => onRequestMerge(mergeSource, createNextRecord())}
						disabled={isSaving}
						className="h-10 rounded-lg border border-red-400/30 px-5 text-base font-bold text-red-500 transition-colors hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-500/10"
					>
						Merge & delete
					</button>
				)}

				<div className="flex-1" />

				<button
					type="button"
					onClick={onClose}
					disabled={isSaving || isCovered}
					className="h-10 rounded-lg border border-gray-300 px-5 text-base font-bold transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-white/15 dark:hover:bg-white/6"
				>
					Cancel
				</button>

				<button
					type="button"
					onClick={() => void handleSave()}
					disabled={!canSave || isCovered}
					className="inline-flex h-10 min-w-20 items-center justify-center gap-2 rounded-xl bg-[#FF6633] px-4 text-sm font-bold text-white transition-colors hover:bg-[#E95325] disabled:cursor-not-allowed disabled:bg-[#FFAA91]"
				>
					{isSaving && <Loader2 size={18} className="animate-spin" />}
					Save
				</button>
			</footer>
		</RecurringDialog>
	);
}

function Field({ label, children }: { label: string; children: ReactNode }) {
	return (
		<label className="block">
			<span className="mb-2 block text-sm font-bold">{label}</span>
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
				className={`${FIELD_CLASS} appearance-none`}
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
