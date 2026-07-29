"use client";

import { useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { type Account, useBudgetStore } from "@/store/useBudgetStore";
import { numberFormatter, parseAmountInput } from "@/utils/formatters";

export type EditableAccount = Account & {
	institution?: string | null;
	account_type?: string | null;
	account_subtype?: string | null;
	apr?: number | null;
	minimum_monthly_payment?: number | null;
	planned_monthly_payment?: number | null;
	credit_limit?: number | null;
	current_balance?: number | null;
	invert_balance?: boolean | null;
	is_hidden?: boolean | null;
	exclude_from_net_worth?: boolean | null;
	hide_transactions?: boolean | null;
	exclude_from_paydown?: boolean | null;
	exclude_from_budget?: boolean | null;
};

type AccountPatch = Partial<EditableAccount>;

function Toggle({
	checked,
	onChange,
}: {
	checked: boolean;
	onChange: (checked: boolean) => void;
}) {
	return (
		<button
			type="button"
			role="switch"
			aria-checked={checked}
			onClick={() => {
				onChange(!checked);
			}}
			className={`relative h-5 w-10 rounded-full transition-colors ${
				checked ? "bg-[#FF5A35]" : "bg-gray-400 dark:bg-gray-600"
			}`}
		>
			<span
				className={`absolute top-[3px] size-3.5 rounded-full bg-white transition-all ${
					checked ? "right-1" : "left-1"
				}`}
			/>
		</button>
	);
}

function SettingCard({
	title,
	description,
	checked,
	onChange,
}: {
	title: string;
	description: string;
	checked: boolean;
	onChange: (checked: boolean) => void;
}) {
	return (
		<div className="flex items-start justify-between gap-5 rounded-xl border border-gray-200 p-4 dark:border-white/10">
			<div>
				<strong className="text-sm">{title}</strong>
				<p className="mt-2 text-sm leading-5 text-gray-500 dark:text-gray-400">
					{description}
				</p>
			</div>

			<Toggle checked={checked} onChange={onChange} />
		</div>
	);
}

interface EditAccountFormProps {
	account: EditableAccount;
	onBack: () => void;
}

export function EditAccountForm({ account, onBack }: EditAccountFormProps) {
	// Combined state object
	const [formData, setFormData] = useState(() => ({
		name: account.name,
		type: account.account_type === "Credit Card" ? "Liability" : "Asset",
		subtype: account.account_subtype ?? account.account_type ?? "Credit Card",
		apr: account.apr == null ? "" : String(account.apr),
		minimumPayment:
			account.minimum_monthly_payment == null
				? ""
				: String(account.minimum_monthly_payment),
		plannedPayment:
			account.planned_monthly_payment == null
				? ""
				: String(account.planned_monthly_payment),
		creditLimit:
			account.credit_limit == null ? "" : String(account.credit_limit),
		currentBalance:
			account.current_balance != null
				? numberFormatter.format(account.current_balance)
				: "",
		invertBalance: Boolean(account.invert_balance),
		isHidden: Boolean(account.is_hidden),
		excludeFromNetWorth: Boolean(account.exclude_from_net_worth),
		hideTransactions: Boolean(account.hide_transactions),
		excludeFromPaydown: Boolean(account.exclude_from_paydown),
		excludeFromBudget: Boolean(account.exclude_from_budget),
	}));

	const [photoUrl, setPhotoUrl] = useState<string | null>(null);
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const fetchAccounts = useBudgetStore((state) => state.fetchAccounts);
	const accounts = useBudgetStore((state) => state.accounts);
	const updateAccount = useBudgetStore((state) => state.updateAccount);
	const deleteAccount = useBudgetStore((state) => state.deleteAccount);

	const persistPatch = async (patch: AccountPatch): Promise<void> => {
		await updateAccount(account.id, patch);
	};

	const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
		event.preventDefault();
		setIsSaving(true);
		setError(null);

		const newName = formData.name.trim();

		const duplicate = accounts.some(
			(acc) =>
				acc.id !== account.id &&
				acc.name.trim().toLowerCase() === newName.toLowerCase(),
		);
		if (duplicate) {
			setError("An account with this name already exists.");
			setIsSaving(false);
			return;
		}

		try {
			await persistPatch({
				name: newName,
				account_type: formData.subtype,
				account_subtype: formData.subtype,
				apr: formData.apr ? Number(formData.apr) : null,
				minimum_monthly_payment: formData.minimumPayment
					? Number(formData.minimumPayment)
					: null,
				planned_monthly_payment: formData.plannedPayment
					? Number(formData.plannedPayment)
					: null,
				credit_limit: formData.creditLimit
					? Number(formData.creditLimit)
					: null,
				current_balance: formData.currentBalance
					? Number(formData.currentBalance)
					: 0,
				invert_balance: formData.invertBalance,
				is_hidden: formData.isHidden,
				exclude_from_net_worth: formData.excludeFromNetWorth,
				hide_transactions: formData.hideTransactions,
				exclude_from_paydown: formData.excludeFromPaydown,
				exclude_from_budget: formData.excludeFromBudget,
			});

			await fetchAccounts();
			onBack();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to save account.");
		} finally {
			setIsSaving(false);
		}
	};

	const closeAccount = async (): Promise<void> => {
		await persistPatch({
			current_balance: 0,
		});
		await fetchAccounts();
		onBack();
	};

	const deleteAccountAction = async (): Promise<void> => {
		await deleteAccount(account.id);
		await fetchAccounts();
		onBack();
	};

	const fieldClassName =
		"h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-[#00A8D2] dark:border-white/15 dark:bg-[#222220] dark:text-white";

	return (
		<form
			onSubmit={(event) => {
				void submit(event);
			}}
			className="w-full bg-white text-gray-900 dark:bg-[#222220] dark:text-white"
		>
			<div className="flex items-center justify-between border-b border-gray-200 px-6 py-5 dark:border-white/10">
				<h1 className="text-lg font-semibold">Edit Account</h1>

				<button
					type="button"
					aria-label="Close edit account"
					onClick={onBack}
					className="rounded-full p-1 hover:bg-gray-100 dark:hover:bg-white/5"
				>
					<X size={21} />
				</button>
			</div>

			<div className="space-y-7 px-6 py-6">
				{/* ... Avatar and photo upload (unchanged) ... */}
				<div className="flex items-center gap-4">
					<div className="flex size-14 items-center justify-center overflow-hidden rounded-full bg-[#103B55] text-xs font-bold text-white">
						{photoUrl ? (
							//! TODO: Fetch logos
							// eslint-disable-next-line @next/next/no-img-element
							<img src={photoUrl} alt="" className="size-full object-cover" />
						) : (
							"CAP1"
						)}
					</div>
					<label className="cursor-pointer rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium shadow-sm hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5">
						Choose photo
						<input
							type="file"
							accept="image/*"
							className="sr-only"
							onChange={(event) => {
								const file = event.target.files?.[0];
								if (file) setPhotoUrl(URL.createObjectURL(file));
							}}
						/>
					</label>
				</div>

				<label className="block">
					<span className="mb-2 block text-sm font-semibold">Name</span>
					<input
						value={formData.name}
						onChange={(event) => {
							setFormData((prev) => ({ ...prev, name: event.target.value }));
							setError(null);
						}}
						className={fieldClassName}
					/>
					{error && (
						<span className="mt-2 block text-sm text-red-600 dark:text-red-400">
							{error}
						</span>
					)}
				</label>

				<label className="block">
					<span className="mb-2 block text-sm font-semibold">Balance</span>
					<div className="relative">
						<span className="absolute inset-y-0 left-3 flex items-center text-gray-500">
							$
						</span>
						<input
							type="text"
							value={formData.currentBalance}
							onChange={(event) => {
								const result = parseAmountInput(event.target.value);
								setFormData((prev) => ({
									...prev,
									currentBalance: result.displayString,
								}));
							}}
							onBlur={() => {
								const raw = formData.currentBalance.replace(/[^0-9.]/g, "");
								const parsed = parseFloat(raw);
								if (!isNaN(parsed) && raw.length > 0) {
									setFormData((prev) => ({
										...prev,
										currentBalance: numberFormatter.format(parsed), // ✅ no $
									}));
								} else {
									setFormData((prev) => ({
										...prev,
										currentBalance: "",
									}));
								}
							}}
							inputMode="decimal"
							// placeholder="0.00"
							className={`${fieldClassName} pl-8 pr-4`}
						/>
					</div>
				</label>

				<label className="block">
					<span className="mb-2 block text-sm font-semibold">Type</span>
					<select
						value={formData.type}
						onChange={(event) => {
							const newType = event.target.value;
							setFormData((prev) => ({
								...prev,
								type: newType,
								subtype: newType === "Liability" ? "Credit Card" : "Checking",
							}));
						}}
						className={fieldClassName}
					>
						<option>Asset</option>
						<option>Liability</option>
					</select>
				</label>

				<label className="block">
					<span className="mb-2 block text-sm font-semibold">Subtype</span>
					<select
						value={formData.subtype}
						onChange={(event) => {
							setFormData((prev) => ({ ...prev, subtype: event.target.value }));
						}}
						className={fieldClassName}
					>
						{formData.type === "Liability" ? (
							<>
								<option>Credit Card</option>
								<option>Mortgage</option>
								<option>Loan</option>
								<option>Other Liability</option>
							</>
						) : (
							<>
								<option>Checking</option>
								<option>Savings</option>
								<option>Investment</option>
								<option>Other Asset</option>
							</>
						)}
					</select>
				</label>

				<label className="block">
					<span className="mb-2 block text-sm font-semibold">APR</span>
					<input
						value={formData.apr}
						onChange={(event) => {
							setFormData((prev) => ({ ...prev, apr: event.target.value }));
						}}
						inputMode="decimal"
						placeholder="Enter APR"
						className={fieldClassName}
					/>
				</label>

				<label className="block">
					<span className="mb-2 block text-sm font-semibold">
						Minimum monthly payment
					</span>
					<input
						value={formData.minimumPayment}
						onChange={(event) => {
							setFormData((prev) => ({
								...prev,
								minimumPayment: event.target.value,
							}));
						}}
						inputMode="decimal"
						placeholder="Enter minimum monthly payment"
						className={fieldClassName}
					/>
				</label>

				<label className="block">
					<span className="mb-2 block text-sm font-semibold">
						Planned monthly payment{" "}
						<span className="font-normal text-gray-500">(optional)</span>
					</span>
					<input
						value={formData.plannedPayment}
						onChange={(event) => {
							setFormData((prev) => ({
								...prev,
								plannedPayment: event.target.value,
							}));
						}}
						inputMode="decimal"
						placeholder="Enter planned monthly payment"
						className={fieldClassName}
					/>
				</label>

				<label className="block">
					<span className="mb-2 block text-sm font-semibold">Credit limit</span>
					<div className="relative">
						<span className="absolute inset-y-0 left-3 flex items-center text-sm text-gray-500">
							$
						</span>
						<input
							value={formData.creditLimit}
							onChange={(event) => {
								setFormData((prev) => ({
									...prev,
									creditLimit: event.target.value,
								}));
							}}
							inputMode="decimal"
							placeholder="Enter credit limit"
							className={`${fieldClassName} pl-7 pr-14`}
						/>
						<span className="absolute inset-y-0 right-3 flex items-center text-sm text-gray-500">
							USD
						</span>
					</div>
				</label>

				<section>
					<h2 className="mb-3 text-sm font-semibold">Balance</h2>
					<SettingCard
						title="Invert account balance"
						description="This will invert your account balance if updates from your bank are not syncing correctly."
						checked={formData.invertBalance}
						onChange={(checked) => {
							setFormData((prev) => ({ ...prev, invertBalance: checked }));
						}}
					/>
				</section>

				<section>
					<h2 className="mb-3 text-sm font-semibold">Visibility</h2>
					<div className="space-y-2">
						<SettingCard
							title="Hide account"
							description="This will hide the account from your Accounts page."
							checked={formData.isHidden}
							onChange={(checked) => {
								setFormData((prev) => ({ ...prev, isHidden: checked }));
							}}
						/>
						<SettingCard
							title="Exclude account balance"
							description="This will exclude this account’s balance from your net worth and account group totals."
							checked={formData.excludeFromNetWorth}
							onChange={(checked) => {
								setFormData((prev) => ({
									...prev,
									excludeFromNetWorth: checked,
								}));
							}}
						/>
						<SettingCard
							title="Hide transactions"
							description="Hiding will exclude transactions from cash flow and budget calculations."
							checked={formData.hideTransactions}
							onChange={(checked) => {
								setFormData((prev) => ({
									...prev,
									hideTransactions: checked,
								}));
							}}
						/>
						<SettingCard
							title="Exclude account from pay down projection"
							description="This will exclude the account from projections and the pay down calculator."
							checked={formData.excludeFromPaydown}
							onChange={(checked) => {
								setFormData((prev) => ({
									...prev,
									excludeFromPaydown: checked,
								}));
							}}
						/>
						<SettingCard
							title="Exclude account from budget contributions"
							description="This will remove the account from the Budget > Contributions section."
							checked={formData.excludeFromBudget}
							onChange={(checked) => {
								setFormData((prev) => ({
									...prev,
									excludeFromBudget: checked,
								}));
							}}
						/>
					</div>
				</section>

				<section>
					<h2 className="mb-3 text-sm font-semibold">Actions</h2>
					<div className="space-y-3">
						<div className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 p-4 dark:border-white/10">
							<div>
								<strong className="text-sm">Close account</strong>
								<p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
									Set balance to $0 but keep historical information.
								</p>
							</div>
							<button
								type="button"
								onClick={() => {
									void closeAccount();
								}}
								className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold shadow-sm hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5"
							>
								Close
							</button>
						</div>
						<div className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 p-4 dark:border-white/10">
							<div>
								<strong className="text-sm">Delete account</strong>
								<p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
									Remove all data about this account.
								</p>
							</div>
							<button
								type="button"
								onClick={() => {
									void deleteAccountAction();
								}}
								className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 shadow-sm hover:bg-red-50 dark:border-red-500/30 dark:hover:bg-red-500/10"
							>
								Delete
							</button>
						</div>
					</div>
				</section>
			</div>

			<div className="sticky bottom-0 flex justify-end gap-3 border-t border-gray-200 bg-white px-6 py-5 dark:border-white/10 dark:bg-[#222220]">
				<button
					type="button"
					onClick={onBack}
					className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold shadow-sm hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5"
				>
					Cancel
				</button>
				<button
					type="submit"
					disabled={!formData.name.trim() || isSaving}
					className="rounded-lg bg-[#FF5A35] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#E04825] disabled:cursor-not-allowed disabled:opacity-50"
				>
					{isSaving ? "Saving..." : "Save"}
				</button>
			</div>
		</form>
	);
}
