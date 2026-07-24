"use client";

import {
	useEffect,
	useState,
	type FormEvent,
} from "react";
import {
	useParams,
	useRouter,
} from "next/navigation";
import {
	X,
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";

import AccountDetailsPageClient from "@/components/Accounts/details/AccountDetailsPageClient";

import {
	type Account,
	useBudgetStore,
} from "@/store/useBudgetStore";

type EditableAccount = Account & {
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

type BudgetStoreState = ReturnType<typeof useBudgetStore.getState>;

interface OptionalAccountActions {
	updateAccount?: (
		accountId: string,
		patch: AccountPatch,
	) => Promise<void> | void;
	deleteAccount?: (
		accountId: string,
	) => Promise<void> | void;
}

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
				checked
					? "bg-[#FF5A35]"
					: "bg-gray-400 dark:bg-gray-600"
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

			<Toggle
				checked={checked}
				onChange={onChange}
			/>
		</div>
	);
}

function EditAccountForm({
	account,
	onBack,
}: {
	account: EditableAccount;
	onBack: () => void;
}) {
	const router = useRouter();

	const [name, setName] = useState(account.name);
	const [type, setType] = useState(
		account.account_type === "Credit Card"
			? "Liability"
			: "Asset",
	);
	const [subtype, setSubtype] = useState(
		account.account_subtype ??
			account.account_type ??
			"Credit Card",
	);
	const [apr, setApr] = useState(
		account.apr == null ? "" : String(account.apr),
	);
	const [minimumPayment, setMinimumPayment] = useState(
		account.minimum_monthly_payment == null
			? ""
			: String(account.minimum_monthly_payment),
	);
	const [plannedPayment, setPlannedPayment] = useState(
		account.planned_monthly_payment == null
			? ""
			: String(account.planned_monthly_payment),
	);
	const [creditLimit, setCreditLimit] = useState(
		account.credit_limit == null
			? ""
			: String(account.credit_limit),
	);
	const [invertBalance, setInvertBalance] = useState(
		Boolean(account.invert_balance),
	);
	const [isHidden, setIsHidden] = useState(
		Boolean(account.is_hidden),
	);
	const [excludeFromNetWorth, setExcludeFromNetWorth] =
		useState(Boolean(account.exclude_from_net_worth));
	const [hideTransactions, setHideTransactions] =
		useState(Boolean(account.hide_transactions));
	const [excludeFromPaydown, setExcludeFromPaydown] =
		useState(Boolean(account.exclude_from_paydown));
	const [excludeFromBudget, setExcludeFromBudget] =
		useState(Boolean(account.exclude_from_budget));
	const [photoUrl, setPhotoUrl] = useState<string | null>(
		null,
	);
	const [isSaving, setIsSaving] = useState(false);

	const persistPatch = async (
		patch: AccountPatch,
	): Promise<void> => {
		const store = useBudgetStore.getState() as BudgetStoreState &
			OptionalAccountActions;

		if (store.updateAccount) {
			await store.updateAccount(account.id, patch);
			return;
		}

		useBudgetStore.setState((state) => {
			return {
				accounts: state.accounts.map((item) => {
					if (item.id !== account.id) {
						return item;
					}

					return {
						...item,
						...patch,
					} as Account;
				}),
			};
		});
	};

	const submit = async (
		event: FormEvent<HTMLFormElement>,
	): Promise<void> => {
		event.preventDefault();
		setIsSaving(true);

		try {
			await persistPatch({
				name: name.trim(),
				account_type: subtype,
				account_subtype: subtype,
				apr: apr ? Number(apr) : null,
				minimum_monthly_payment: minimumPayment
					? Number(minimumPayment)
					: null,
				planned_monthly_payment: plannedPayment
					? Number(plannedPayment)
					: null,
				credit_limit: creditLimit
					? Number(creditLimit)
					: null,
				invert_balance: invertBalance,
				is_hidden: isHidden,
				exclude_from_net_worth: excludeFromNetWorth,
				hide_transactions: hideTransactions,
				exclude_from_paydown: excludeFromPaydown,
				exclude_from_budget: excludeFromBudget,
			});

			router.push(
				`/accounts/details/${encodeURIComponent(account.id)}`,
			);
		} finally {
			setIsSaving(false);
		}
	};

	const closeAccount = async (): Promise<void> => {
		await persistPatch({
			current_balance: 0,
		});
		router.push(
			`/accounts/details/${encodeURIComponent(account.id)}`,
		);
	};

	const deleteAccount = async (): Promise<void> => {
		const store = useBudgetStore.getState() as BudgetStoreState &
			OptionalAccountActions;

		if (store.deleteAccount) {
			await store.deleteAccount(account.id);
		} else {
			useBudgetStore.setState((state) => {
				return {
					accounts: state.accounts.filter((item) => {
						return item.id !== account.id;
					}),
				};
			});
		}

		router.push("/accounts");
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
				<div className="flex items-center gap-4">
					<div className="flex size-14 items-center justify-center overflow-hidden rounded-full bg-[#103B55] text-xs font-bold text-white">
						{photoUrl ? (
							<img
								src={photoUrl}
								alt=""
								className="size-full object-cover"
							/>
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

								if (file) {
									setPhotoUrl(URL.createObjectURL(file));
								}
							}}
						/>
					</label>
				</div>

				<label className="block">
					<span className="mb-2 block text-sm font-semibold">Name</span>
					<input
						value={name}
						onChange={(event) => {
							setName(event.target.value);
						}}
						className={fieldClassName}
					/>
				</label>

				<label className="block">
					<span className="mb-2 block text-sm font-semibold">Type</span>
					<select
						value={type}
						onChange={(event) => {
							setType(event.target.value);
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
						value={subtype}
						onChange={(event) => {
							setSubtype(event.target.value);
						}}
						className={fieldClassName}
					>
						{type === "Liability" ? (
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
						value={apr}
						onChange={(event) => {
							setApr(event.target.value);
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
						value={minimumPayment}
						onChange={(event) => {
							setMinimumPayment(event.target.value);
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
						value={plannedPayment}
						onChange={(event) => {
							setPlannedPayment(event.target.value);
						}}
						inputMode="decimal"
						placeholder="Enter planned monthly payment"
						className={fieldClassName}
					/>
				</label>

				<label className="block">
					<span className="mb-2 block text-sm font-semibold">
						Credit limit
					</span>
					<div className="relative">
						<span className="absolute inset-y-0 left-3 flex items-center text-sm text-gray-500">
							$
						</span>
						<input
							value={creditLimit}
							onChange={(event) => {
								setCreditLimit(event.target.value);
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
						checked={invertBalance}
						onChange={setInvertBalance}
					/>
				</section>

				<section>
					<h2 className="mb-3 text-sm font-semibold">Visibility</h2>
					<div className="space-y-2">
						<SettingCard
							title="Hide account"
							description="This will hide the account from your Accounts page."
							checked={isHidden}
							onChange={setIsHidden}
						/>
						<SettingCard
							title="Exclude account balance"
							description="This will exclude this account’s balance from your net worth and account group totals."
							checked={excludeFromNetWorth}
							onChange={setExcludeFromNetWorth}
						/>
						<SettingCard
							title="Hide transactions"
							description="Hiding will exclude transactions from cash flow and budget calculations."
							checked={hideTransactions}
							onChange={setHideTransactions}
						/>
						<SettingCard
							title="Exclude account from pay down projection"
							description="This will exclude the account from projections and the pay down calculator."
							checked={excludeFromPaydown}
							onChange={setExcludeFromPaydown}
						/>
						<SettingCard
							title="Exclude account from budget contributions"
							description="This will remove the account from the Budget > Contributions section."
							checked={excludeFromBudget}
							onChange={setExcludeFromBudget}
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
									void deleteAccount();
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
					disabled={!name.trim() || isSaving}
					className="rounded-lg bg-[#FF5A35] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#E04825] disabled:cursor-not-allowed disabled:opacity-50"
				>
					{isSaving ? "Saving..." : "Save"}
				</button>
			</div>
		</form>
	);
}

export default function EditAccountPageClient() {
	const params = useParams<{ accountId: string }>();
	const router = useRouter();
	const accountId = params.accountId
		? decodeURIComponent(params.accountId)
		: "";

	const accounts = useBudgetStore((state) => {
		return state.accounts;
	});
	const fetchAccounts = useBudgetStore((state) => {
		return state.fetchAccounts;
	});

	useEffect(() => {
		void fetchAccounts();
	}, [fetchAccounts]);

	const account = accounts.find((item) => {
		return item.id === accountId;
	}) as EditableAccount | undefined;

	const back = (): void => {
		router.push(
			`/accounts/details/${encodeURIComponent(accountId)}`,
		);
	};

	if (!account) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-900 dark:bg-[#171716] dark:text-white">
				Loading account...
			</div>
		);
	}

	return (
		<>
			<AccountDetailsPageClient />
			<Dialog.Root open onOpenChange={(open) => { if (!open) back(); }}>
				<Dialog.Portal>
					<Dialog.Overlay className="fixed inset-0 z-[140] bg-black/45 backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
					<Dialog.Content onOpenAutoFocus={(event) => event.preventDefault()} className="fixed left-1/2 top-1/2 z-[150] max-h-[calc(100vh-32px)] w-[min(570px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-2xl outline-none dark:border-white/10 dark:bg-[#222220]">
						<Dialog.Title className="sr-only">Edit account</Dialog.Title>
						<Dialog.Description className="sr-only">Update account details, visibility, balance, and actions.</Dialog.Description>
						<EditAccountForm key={account.id} account={account} onBack={back} />
					</Dialog.Content>
				</Dialog.Portal>
			</Dialog.Root>
		</>
	);
}
