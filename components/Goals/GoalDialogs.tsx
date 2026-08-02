"use client";

import {
	useEffect,
	useMemo,
	useState,
	type ChangeEvent,
	type ReactNode,
} from "react";
import {
	CalendarDays,
	ChevronDown,
} from "lucide-react";

import { GoalImage, GoalImagePicker } from "@/components/Goals/GoalImage";
import {
	AccountLogo,
	FieldLabel,
	Modal,
	PrimaryButton,
	ProgressBar,
	SecondaryButton,
	SideSheet,
	Toggle,
	inputClassName,
} from "@/components/Goals/GoalsUI";
import {
	formatAccountName,
} from "@/lib/goals/accountAdapters";
import {
	formatCurrency,
	formatGoalDate,
	getGoalProgress,
} from "@/lib/goals/formatters";
import type {
	GoalAccountLink,
	GoalAccountSetting,
	GoalAccountView,
	GoalAllocation,
	SavingsGoal,
} from "@/lib/goals/types";

function todayInputValue(): string {
	return new Date().toISOString().slice(0, 10);
}

function parseAmount(value: string): number {
	const amount = Number(value.replace(/[^0-9.]/g, ""));
	return Number.isFinite(amount) ? amount : 0;
}

export function AllocateFundsModal({
	open,
	onClose,
	goal,
	accounts,
	onAllocate,
}: {
	open: boolean;
	onClose: () => void;
	goal: SavingsGoal;
	accounts: GoalAccountView[];
	onAllocate: (input: {
		accountId: string;
		amount: number;
		allocatedAt: string;
		includeInBudget: boolean;
	}) => Promise<void>;
}) {
	const defaultAccountId = goal.linkedAccountIds[0] ?? accounts[0]?.id ?? "";
	const [accountId, setAccountId] = useState(defaultAccountId);
	const [amount, setAmount] = useState("");
	const [date, setDate] = useState(todayInputValue());
	const [includeInBudget, setIncludeInBudget] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const parsedAmount = parseAmount(amount);

	useEffect(() => {
		if (open) {
			// eslint-disable-next-line react-hooks/set-state-in-effect
			setAccountId(goal.linkedAccountIds[0] ?? accounts[0]?.id ?? "");
			setAmount("");
			setDate(todayInputValue());
			setError(null);
		}
	}, [accounts, goal.linkedAccountIds, open]);

	return (
		<Modal
			open={open}
			title="Allocate funds"
			onClose={onClose}
			widthClass="max-w-[740px]"
			footer={
				<>
					<SecondaryButton type="button" onClick={onClose}>
						Cancel
					</SecondaryButton>
					<PrimaryButton
						type="button"
						disabled={
							isSaving ||
							!accountId ||
							parsedAmount <= 0
						}
						onClick={() => {
							setIsSaving(true);
							setError(null);
							void onAllocate({
								accountId,
								amount: parsedAmount,
								allocatedAt: `${date}T12:00:00.000Z`,
								includeInBudget,
							})
								.then(() => {
									onClose();
								})
								.catch((saveError: unknown) => {
									setError(
										saveError instanceof Error
											? saveError.message
											: "Failed to allocate funds.",
									);
								})
								.finally(() => {
									setIsSaving(false);
								});
						}}
					>
						{isSaving ? "Saving…" : "Save"}
					</PrimaryButton>
				</>
			}
		>
			<div className="space-y-8">
				<div>
					<FieldLabel>From</FieldLabel>
					<div className="relative">
						<AccountLogo
							account={accounts.find((account) => account.id === accountId)}
							size={46}
							className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2"
						/>
						<select
							value={accountId}
							onChange={(event) => {
								setAccountId(event.target.value);
							}}
							className={`${inputClassName} min-h-24 appearance-none pl-20 pr-12 text-lg`}
						>
							<option value="">Select account</option>
							{accounts.map((account) => (
								<option key={account.id} value={account.id}>
									{formatAccountName(account)} — {formatCurrency(account.balance)}
								</option>
							))}
						</select>
						<ChevronDown
							size={20}
							className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-500"
						/>
					</div>
				</div>

				<div>
					<FieldLabel>To</FieldLabel>
					<div className="flex min-h-24 items-center rounded-xl border border-gray-300 px-5 dark:border-white/15">
						<GoalImage
							src={goal.imageUrl}
							alt={goal.name}
							className="size-14 rounded-xl object-cover"
						/>
						<span className="ml-4">
							<span className="block text-lg font-medium">{goal.name}</span>
							<span className="block text-gray-500">
								{formatCurrency(Math.max(0, goal.targetAmount - goal.saved))} left to save
							</span>
						</span>
					</div>
				</div>

				<div>
					<FieldLabel>Amount</FieldLabel>
					<input
						value={amount}
						onChange={(event: ChangeEvent<HTMLInputElement>) => {
							setAmount(event.target.value);
						}}
						inputMode="decimal"
						placeholder="Enter amount"
						className={inputClassName}
					/>
				</div>

				<hr className="border-gray-200 dark:border-white/10" />

				<div>
					<FieldLabel>Date</FieldLabel>
					<div className="relative">
						<input
							type="date"
							value={date}
							onChange={(event: ChangeEvent<HTMLInputElement>) => {
								setDate(event.target.value);
							}}
							className={`${inputClassName} pr-12`}
						/>
						<CalendarDays
							size={21}
							className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-500"
						/>
					</div>
				</div>

				<div className="flex items-center rounded-xl border border-gray-300 p-5 dark:border-white/15">
					<div className="pr-5">
						<p className="font-semibold">Include in budget</p>
						<p className="mt-1 text-sm leading-6 text-gray-500">
							When turned on, this goal allocation will be used in the actuals for your budget.
						</p>
					</div>
					<Toggle
						checked={includeInBudget}
						onChange={setIncludeInBudget}
						label="Include allocation in budget"
					/>
				</div>

				{error && <p className="text-sm font-semibold text-red-600">{error}</p>}
			</div>
		</Modal>
	);
}

export function GoalSettingsModal({
	open,
	onClose,
	goal,
	accountLinks,
	accounts,
	onSave,
	onImageUpload,
}: {
	open: boolean;
	onClose: () => void;
	goal: SavingsGoal;
	accountLinks: GoalAccountLink[];
	accounts: GoalAccountView[];
	onSave: (input: {
		name: string;
		targetAmount: number;
		targetDate: string | null;
		spendingReducesProgress: boolean;
		links: Array<{ accountId: string; plannedMonthlyAmount: number }>;
	}) => Promise<void>;
	onImageUpload: (file: File) => Promise<void>;
}) {
	const [name, setName] = useState(goal.name);
	const [targetAmount, setTargetAmount] = useState(String(goal.targetAmount || ""));
	const [targetDate, setTargetDate] = useState(goal.targetDate ?? "");
	const [spendingReducesProgress, setSpendingReducesProgress] = useState(
		goal.spendingReducesProgress,
	);
	const [monthlyAmounts, setMonthlyAmounts] = useState<Record<string, string>>({});
	const [imageFile, setImageFile] = useState<File | null>(null);
	const [previewUrl, setPreviewUrl] = useState<string | null>(goal.imageUrl);
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!open) {
			return;
		}

		// eslint-disable-next-line react-hooks/set-state-in-effect
		setName(goal.name);
		setTargetAmount(String(goal.targetAmount || ""));
		setTargetDate(goal.targetDate ?? "");
		setSpendingReducesProgress(goal.spendingReducesProgress);
		setMonthlyAmounts(
			Object.fromEntries(
				accountLinks.map((link) => [
					link.accountId,
					String(link.plannedMonthlyAmount || ""),
				]),
			),
		);
		setImageFile(null);
		setPreviewUrl(goal.imageUrl);
		setError(null);
	}, [accountLinks, goal, open]);

	useEffect(() => {
		if (!imageFile) {
			return;
		}

		const objectUrl = URL.createObjectURL(imageFile);
		// eslint-disable-next-line react-hooks/set-state-in-effect
		setPreviewUrl(objectUrl);

		return () => {
			URL.revokeObjectURL(objectUrl);
		};
	}, [imageFile]);

	const linkedAccounts = accounts.filter((account) =>
		goal.linkedAccountIds.includes(account.id),
	);
	const progress = getGoalProgress(goal);

	return (
		<Modal
			open={open}
			title="Goal settings"
			onClose={onClose}
			widthClass="max-w-[760px]"
			footer={
				<>
					<SecondaryButton type="button" onClick={onClose}>
						Cancel
					</SecondaryButton>
					<PrimaryButton
						type="button"
						disabled={isSaving || !name.trim()}
						onClick={() => {
							setIsSaving(true);
							setError(null);
							const links = linkedAccounts.map((account) => ({
								accountId: account.id,
								plannedMonthlyAmount: parseAmount(monthlyAmounts[account.id] ?? ""),
							}));

							void onSave({
								name: name.trim(),
								targetAmount: parseAmount(targetAmount),
								targetDate: targetDate || null,
								spendingReducesProgress,
								links,
							})
								.then(async () => {
									if (imageFile) {
										await onImageUpload(imageFile);
									}
									onClose();
								})
								.catch((saveError: unknown) => {
									setError(
										saveError instanceof Error
											? saveError.message
											: "Failed to update the goal.",
									);
								})
								.finally(() => {
									setIsSaving(false);
								});
						}}
					>
						{isSaving ? "Saving…" : "Save"}
					</PrimaryButton>
				</>
			}
		>
			<div className="space-y-8">
				<div className="relative h-80">
					<GoalImagePicker
						previewUrl={previewUrl}
						onFileChange={setImageFile}
						className="h-full"
					/>
					<div className="absolute inset-x-5 bottom-5 rounded-2xl bg-white p-5 text-gray-950 shadow-xl dark:bg-[#1B1B1B] dark:text-gray-200 dark:shadow-2xl dark:shadow-black/30">
						<div className="flex items-start gap-4">
							<div className="min-w-0 flex-1">
								<p className="text-xl font-medium">{name || goal.name}</p>
								<div className="mt-2 flex items-center gap-3 text-gray-500">
									<span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-700">
										{goal.status}
									</span>
									{formatGoalDate({ targetDate: targetDate || null })}
								</div>
							</div>
							<div className="text-right">
								<p className="text-xl font-medium">{formatCurrency(goal.saved)}</p>
								<p className="mt-1 text-gray-500">
									{Math.round(progress)}% of {formatCurrency(parseAmount(targetAmount))}
								</p>
							</div>
						</div>
						<ProgressBar value={progress} className="mt-4" />
					</div>
				</div>

				<div>
					<FieldLabel>Name</FieldLabel>
					<input
						value={name}
						onChange={(event) => setName(event.target.value)}
						className={inputClassName}
					/>
				</div>

				<div>
					<FieldLabel>
						Target amount <span className="font-normal text-gray-500">(optional)</span>
					</FieldLabel>
					<input
						value={targetAmount}
						onChange={(event) => setTargetAmount(event.target.value)}
						inputMode="decimal"
						className={inputClassName}
					/>
				</div>

				<div>
					<div className="flex items-center">
						<FieldLabel>
							Target date <span className="font-normal text-gray-500">(optional)</span>
						</FieldLabel>
						<button
							type="button"
							className="mb-2 ml-auto font-semibold text-cyan-600"
							onClick={() => setTargetDate("")}
						>
							Clear
						</button>
					</div>
					<input
						type="month"
						value={targetDate ? targetDate.slice(0, 7) : ""}
						onChange={(event) => {
							setTargetDate(event.target.value ? `${event.target.value}-01` : "");
						}}
						className={inputClassName}
					/>
				</div>

				<section>
					<div className="flex items-center">
						<h3 className="text-xl font-bold">Monthly planned contributions</h3>
						<span className="ml-auto text-xl text-gray-500">
							{formatCurrency(
								linkedAccounts.reduce(
									(total, account) => total + parseAmount(monthlyAmounts[account.id] ?? ""),
									0,
								),
							)}
						</span>
					</div>
					<div className="mt-5 space-y-5">
						{linkedAccounts.map((account) => (
							<div key={account.id} className="flex items-center gap-4">
								<AccountLogo account={account} size={52} />
								<div className="min-w-0 flex-1">
									<p className="font-medium">{formatAccountName(account)}</p>
									<p className="text-gray-500">Current balance: {formatCurrency(account.balance)}</p>
								</div>
								<input
									value={monthlyAmounts[account.id] ?? ""}
									onChange={(event) => {
										setMonthlyAmounts((current) => ({
											...current,
											[account.id]: event.target.value,
										}));
									}}
									inputMode="decimal"
									className="h-14 w-32 rounded-xl border border-gray-300 px-4 text-right dark:border-white/15 dark:bg-[#1f1f1e]"
								/>
							</div>
						))}
						{linkedAccounts.length === 0 && (
							<p className="rounded-xl bg-gray-50 p-4 text-gray-500 dark:bg-white/5">
								Link an account through Edit goal accounts to add planned contributions.
							</p>
						)}
					</div>
				</section>

				<div className="flex items-center rounded-xl border border-gray-300 p-5 dark:border-white/15">
					<div className="pr-5">
						<p className="font-semibold">Spending reduces goal progress</p>
						<p className="mt-2 leading-6 text-gray-500">
							When on, spending assigned to this goal decreases its progress.
						</p>
					</div>
					<Toggle
						checked={spendingReducesProgress}
						onChange={setSpendingReducesProgress}
						label="Spending reduces goal progress"
					/>
				</div>

				{error && <p className="text-sm font-semibold text-red-600">{error}</p>}
			</div>
		</Modal>
	);
}

export function EditGoalAccountsModal({
	open,
	onClose,
	accounts,
	goals,
	settings,
	onSave,
}: {
	open: boolean;
	onClose: () => void;
	accounts: GoalAccountView[];
	goals: SavingsGoal[];
	settings: GoalAccountSetting[];
	onSave: (setting: GoalAccountSetting) => Promise<void>;
}) {
	const [draft, setDraft] = useState<Record<string, GoalAccountSetting>>({});
	const [savingId, setSavingId] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!open) {
			return;
		}

		// eslint-disable-next-line react-hooks/set-state-in-effect
		setDraft(
			Object.fromEntries(
				accounts.map((account) => {
					const setting = settings.find((item) => item.accountId === account.id);
					return [
						account.id,
						setting ?? {
							accountId: account.id,
							enabled: false,
							useEntireBalance: false,
							linkedGoalId: null,
						},
					] as const;
				}),
			),
		);
		setError(null);
	}, [accounts, open, settings]);

	const saveSetting = (setting: GoalAccountSetting): void => {
		setSavingId(setting.accountId);
		setError(null);
		void onSave(setting)
			.catch((saveError: unknown) => {
				setError(
					saveError instanceof Error
						? saveError.message
						: "Failed to update the account.",
				);
			})
			.finally(() => setSavingId(null));
	};

	const groups = useMemo(() => {
		return ["Cash", "Investments", "Other Assets"] as const;
	}, []);

	return (
		<Modal
			open={open}
			title="Edit goal accounts"
			onClose={onClose}
			widthClass="max-w-[760px]"
			footer={
				<PrimaryButton type="button" onClick={onClose}>
					Done
				</PrimaryButton>
			}
		>
			<div>
				<h3 className="text-2xl font-bold">Using accounts with goals</h3>
				<p className="mt-3 text-lg leading-8 text-gray-600 dark:text-gray-300">
					Turning on an account makes its available balance visible on the goals page. Allocations always use the real account record and current balance.
				</p>

				{groups.map((group) => {
					const groupAccounts = accounts.filter((account) => account.group === group);

					if (groupAccounts.length === 0) {
						return null;
					}

					return (
						<section key={group} className="mt-8">
							<h4 className="mb-4 text-xl font-bold">{group}</h4>
							<div className="space-y-4">
								{groupAccounts.map((account) => {
									const setting = draft[account.id];

									if (!setting) {
										return null;
									}

									return (
										<div key={account.id} className="rounded-2xl border border-gray-200 p-5 shadow-sm dark:border-white/10">
											<div className="flex items-center gap-4">
												<AccountLogo account={account} size={52} />
												<div className="min-w-0 flex-1">
													<p className="truncate text-lg font-medium">{formatAccountName(account)}</p>
													<p className="text-gray-500">Account balance: {formatCurrency(account.balance)}</p>
												</div>
												<Toggle
													checked={setting.enabled}
													onChange={(enabled) => {
														const next = { ...setting, enabled };
														setDraft((current) => ({ ...current, [account.id]: next }));
														saveSetting(next);
													}}
													label={`Use ${account.name} for goals`}
												/>
											</div>

											{setting.enabled && (
												<div className="mt-5 border-t border-gray-200 pt-5 dark:border-white/10">
													<label className="flex items-start gap-3">
														<input
															type="checkbox"
															checked={setting.useEntireBalance}
															onChange={(event) => {
																const next = {
																	...setting,
																	useEntireBalance: event.target.checked,
																};
																setDraft((current) => ({ ...current, [account.id]: next }));
																saveSetting(next);
															}}
															className="mt-1 size-5 accent-[#ff6633]"
														/>
														<span>Use entire balance and account growth toward this goal</span>
													</label>
													<label className="mt-4 block font-semibold">Linked goal</label>
													<select
														value={setting.linkedGoalId ?? ""}
														onChange={(event) => {
															const next = {
																...setting,
																linkedGoalId: event.target.value || null,
															};
															setDraft((current) => ({ ...current, [account.id]: next }));
															saveSetting(next);
														}}
														className={inputClassName}
													>
														<option value="">No linked goal</option>
														{goals.map((goal) => (
															<option key={goal.id} value={goal.id}>{goal.name}</option>
														))}
													</select>
												</div>
											)}

											{savingId === account.id && (
												<p className="mt-3 text-sm text-gray-500">Saving…</p>
											)}
										</div>
									);
								})}
							</div>
						</section>
					);
				})}

				{error && <p className="mt-5 text-sm font-semibold text-red-600">{error}</p>}
			</div>
		</Modal>
	);
}

export function AllocationDetailsSheet({
	open,
	onClose,
	goal,
	allocation,
	account,
}: {
	open: boolean;
	onClose: () => void;
	goal: SavingsGoal;
	allocation: GoalAllocation | null;
	account: GoalAccountView | null;
}) {
	return (
		<SideSheet open={open} title="Allocation details" onClose={onClose}>
			{allocation ? (
				<div>
					<div className="flex items-center gap-5">
						<GoalImage
							src={goal.imageUrl}
							alt={goal.name}
							className="size-16 rounded-xl object-cover"
						/>
						<div>
							<p className="text-2xl">{goal.name}</p>
							<p className={`mt-1 text-xl font-semibold ${allocation.kind === "spending" ? "text-red-600" : "text-emerald-600"}`}>
								{allocation.kind === "spending" ? "−" : "+"}{formatCurrency(allocation.amount)}
							</p>
						</div>
					</div>
					<Detail label="Type">{allocation.kind === "adjustment" ? "Adjustment" : allocation.kind}</Detail>
					<Detail label="Account">
						{account ? formatAccountName(account) : "No account"}
					</Detail>
					<Detail label="Date">
						{new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(allocation.allocatedAt))}
					</Detail>
					<Detail label="Budget">
						{allocation.includeInBudget ? "Included" : "Not included"}
					</Detail>
				</div>
			) : (
				<p className="text-gray-500">No allocation selected.</p>
			)}
		</SideSheet>
	);
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
	return (
		<div className="mt-8">
			<p className="font-semibold">{label}</p>
			<div className="mt-3 text-xl capitalize">{children}</div>
		</div>
	);
}
