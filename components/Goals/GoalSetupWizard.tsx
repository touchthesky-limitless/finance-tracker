"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Minus, Plus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { GoalImagePicker } from "@/components/Goals/GoalImage";
import {
	AccountLogo,
	PrimaryButton,
	ProgressBar,
	SecondaryButton,
	Toggle,
	inputClassName,
} from "@/components/Goals/GoalsUI";
import { useGoalsData } from "@/hooks/useGoalsData";
import { formatAccountName } from "@/lib/goals/accountAdapters";
import { formatCurrency } from "@/lib/goals/formatters";
import { createSavingsGoal, uploadGoalImage } from "@/lib/goals/repository";
import { parseAmount } from "@/lib/goals/utils";

const PRESETS = [
	{ key: "emergency", name: "Emergency fund", emoji: "🧯" },
	{ key: "down-payment", name: "Down payment", emoji: "🏡" },
	{ key: "car", name: "Car", emoji: "🚙" },
	{ key: "vacation", name: "Vacation", emoji: "🏝️" },
	{ key: "wedding", name: "Wedding", emoji: "💍" },
	{ key: "education", name: "Education", emoji: "🎓" },
	{ key: "retirement", name: "Retirement", emoji: "🌇" },
	{ key: "savings", name: "Savings", emoji: "🌱" },
] as const;

export default function GoalSetupWizard() {
	const router = useRouter();
	const { goals, savingsAccounts, isLoading } = useGoalsData();
	const [step, setStep] = useState<0 | 1 | 2 | 3 | 4>(0);
	const [presetKey, setPresetKey] = useState<string>("car");
	const [name, setName] = useState("Car");
	const [targetAmount, setTargetAmount] = useState("");
	const [targetMonth, setTargetMonth] = useState("");
	const [spendingReducesProgress, setSpendingReducesProgress] = useState(false);
	const [imageFile, setImageFile] = useState<File | null>(null);
	const [initialAllocations, setInitialAllocations] = useState<
		Record<string, string>
	>({});
	const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
	const [monthlyContributions, setMonthlyContributions] = useState<
		Record<string, string>
	>({});
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const previewUrl = useMemo(() => {
		if (!imageFile) {
			return null;
		}

		return URL.createObjectURL(imageFile);
	}, [imageFile]);

	useEffect(() => {
		return () => {
			if (previewUrl) {
				URL.revokeObjectURL(previewUrl);
			}
		};
	}, [previewUrl]);

	const selectedPreset =
		PRESETS.find((preset) => preset.key === presetKey) ?? PRESETS[0];
	const alreadyAddedNames = useMemo(() => {
		return new Set(goals.map((goal) => goal.name.trim().toLowerCase()));
	}, [goals]);

	const createGoal = async (): Promise<void> => {
		setIsSaving(true);
		setError(null);

		try {
			const initiallyFundedAccountIds = Object.entries(initialAllocations)
				.filter(([, amount]) => parseAmount(amount) > 0)
				.map(([accountId]) => accountId);
			const linkedAccountIds = [
				...new Set([...selectedAccountIds, ...initiallyFundedAccountIds]),
			];
			const created = await createSavingsGoal({
				name: name.trim(),
				targetAmount: parseAmount(targetAmount),
				targetDate: targetMonth ? `${targetMonth}-01` : null,
				spendingReducesProgress,
				linkedAccounts: linkedAccountIds.map((accountId) => ({
					accountId,
					plannedMonthlyAmount: parseAmount(
						monthlyContributions[accountId] ?? "",
					),
				})),
				initialAllocations: Object.entries(initialAllocations)
					.map(([accountId, amount]) => ({
						accountId,
						amount: parseAmount(amount),
						includeInBudget: true,
					}))
					.filter((allocation) => allocation.amount > 0),
			});

			if (imageFile) {
				await uploadGoalImage(created.id, imageFile);
			}

			setStep(4);
			window.setTimeout(() => {
				router.replace(`/goals/savings/${encodeURIComponent(created.id)}`);
			}, 900);
		} catch (saveError) {
			setError(
				saveError instanceof Error
					? saveError.message
					: "Failed to create goal.",
			);
		} finally {
			setIsSaving(false);
		}
	};

	if (isLoading) {
		return (
			<div className="min-h-screen animate-pulse bg-[#f7f6f4] dark:bg-[#171716]" />
		);
	}

	if (step === 4) {
		return (
			<main className="relative min-h-screen overflow-hidden bg-white p-8 dark:bg-[#171716] dark:text-white">
				<div className="mx-auto mt-20 max-w-3xl">
					<h1 className="text-3xl font-bold">
						Congrats! You&apos;re on your way.
					</h1>
					<p className="mt-4 text-xl text-gray-500">
						Your goal and Supabase URL were created successfully.
					</p>
					<div className="mt-8 rounded-2xl border border-gray-200 p-6 shadow-sm dark:border-white/10">
						<div className="flex items-center gap-4">
							<div className="grid size-20 place-items-center rounded-xl bg-orange-100 text-4xl">
								{selectedPreset.emoji}
							</div>
							<div className="min-w-0 flex-1">
								<h2 className="text-2xl font-medium">{name}</h2>
								<p className="mt-2 text-gray-500">
									{targetMonth || "No target date"}
								</p>
								<ProgressBar value={0} className="mt-4" />
							</div>
						</div>
					</div>
				</div>
			</main>
		);
	}

	return (
		<main className="min-h-screen bg-white text-gray-950 dark:bg-[#171716] dark:text-white">
			<header className="sticky top-0 z-20 flex min-h-16 items-center border-b border-gray-200 bg-white px-4 shadow-sm dark:border-white/10 dark:bg-[#171716]">
				<button
					type="button"
					aria-label="Back"
					onClick={() =>
						step === 0
							? router.push("/goals/savings")
							: setStep((step - 1) as 0 | 1 | 2 | 3)
					}
					className="grid size-10 place-items-center rounded-full hover:bg-gray-100 dark:hover:bg-white/10"
				>
					<ArrowLeft size={20} />
				</button>
				<div className="mx-auto flex items-center gap-7 font-semibold text-gray-500">
					{["Select", "Targets", "Contribution", "Budget"].map(
						(label, index) => (
							<span
								key={label}
								className={
									step === index
										? "rounded-full bg-gray-100 px-4 py-2 text-gray-950 dark:bg-white/10 dark:text-white"
										: ""
								}
							>
								{label}
							</span>
						),
					)}
				</div>
				<button
					type="button"
					aria-label="Close"
					onClick={() => router.push("/goals/savings")}
					className="grid size-10 place-items-center rounded-full hover:bg-gray-100 dark:hover:bg-white/10"
				>
					<X size={20} />
				</button>
			</header>

			<div className="mx-auto max-w-6xl px-5 py-12">
				{step === 0 && (
					<section>
						<h1 className="text-3xl font-bold">Select goals to add</h1>
						<div className="mt-8 grid gap-5 md:grid-cols-2">
							{PRESETS.map((preset) => {
								const selected = preset.key === presetKey;
								const alreadyAdded = alreadyAddedNames.has(
									preset.name.toLowerCase(),
								);
								return (
									<button
										key={preset.key}
										type="button"
										disabled={alreadyAdded}
										onClick={() => {
											setPresetKey(preset.key);
											setName(preset.name);
										}}
										className={`flex min-h-28 items-center gap-5 rounded-2xl border p-5 text-left shadow-sm transition ${selected ? "border-cyan-500 ring-1 ring-cyan-500" : "border-gray-200 hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5"} disabled:cursor-not-allowed disabled:opacity-55`}
									>
										<span className="grid size-16 place-items-center rounded-xl bg-gray-100 text-3xl dark:bg-white/10">
											{preset.emoji}
										</span>
										<span>
											<span className="block text-xl font-semibold">
												{preset.name}
											</span>
											{alreadyAdded && (
												<span className="mt-1 block text-gray-500">
													1 goal already added
												</span>
											)}
										</span>
										{selected && (
											<Check size={22} className="ml-auto text-cyan-600" />
										)}
									</button>
								);
							})}
						</div>
					</section>
				)}

				{step === 1 && (
					<section className="mx-auto max-w-2xl">
						<h1 className="text-3xl font-bold">Set your goal targets</h1>
						<GoalImagePicker
							previewUrl={previewUrl}
							onFileChange={setImageFile}
							className="mt-8 h-72"
						/>
						<label className="mt-7 block font-semibold">Name</label>
						<input
							value={name}
							onChange={(event) => setName(event.target.value)}
							className={`${inputClassName} mt-2`}
						/>
						<label className="mt-6 block font-semibold">
							Target amount{" "}
							<span className="font-normal text-gray-500">(optional)</span>
						</label>
						<input
							value={targetAmount}
							onChange={(event) => setTargetAmount(event.target.value)}
							inputMode="decimal"
							placeholder="Enter target amount"
							className={`${inputClassName} mt-2`}
						/>
						<label className="mt-6 block font-semibold">
							Target date{" "}
							<span className="font-normal text-gray-500">(optional)</span>
						</label>
						<input
							type="month"
							value={targetMonth}
							onChange={(event) => setTargetMonth(event.target.value)}
							className={`${inputClassName} mt-2`}
						/>
						<div className="mt-8 flex items-center rounded-xl border border-gray-300 p-5 dark:border-white/15">
							<div className="pr-5">
								<p className="font-semibold">Spending reduces goal progress</p>
								<p className="mt-2 text-gray-500">
									Spending assigned to this goal decreases its saved progress.
								</p>
							</div>
							<Toggle
								checked={spendingReducesProgress}
								onChange={setSpendingReducesProgress}
								label="Spending reduces progress"
							/>
						</div>
					</section>
				)}

				{step === 2 && (
					<section className="grid gap-8 lg:grid-cols-2">
						<div>
							<h1 className="text-3xl font-bold">
								Add funds you have already saved
							</h1>
							<p className="mt-3 text-lg text-gray-500">
								Choose real accounts and the amount already committed to this
								goal.
							</p>
							<div className="mt-8 space-y-4">
								{savingsAccounts.map((account) => (
									<div
										key={account.id}
										className="rounded-2xl border border-gray-200 p-5 shadow-sm dark:border-white/10"
									>
										<div className="flex items-center gap-4">
											<AccountLogo account={account} size={50} />
											<div className="min-w-0 flex-1">
												<p className="truncate text-lg font-medium">
													{formatAccountName(account)}
												</p>
												<p className="text-gray-500">
													Current balance: {formatCurrency(account.balance)}
												</p>
											</div>
											<input
												value={initialAllocations[account.id] ?? ""}
												onChange={(event) =>
													setInitialAllocations((current) => ({
														...current,
														[account.id]: event.target.value,
													}))
												}
												inputMode="decimal"
												placeholder="$0"
												className="h-14 w-32 rounded-xl border border-gray-300 px-4 dark:border-white/15 dark:bg-[#1f1f1e]"
											/>
										</div>
									</div>
								))}
							</div>
						</div>
						<GoalPreview
							name={name}
							emoji={selectedPreset.emoji}
							target={parseAmount(targetAmount)}
						/>
					</section>
				)}

				{step === 3 && (
					<section className="grid gap-8 lg:grid-cols-2">
						<div>
							<h1 className="text-3xl font-bold">
								How much do you plan to contribute monthly?
							</h1>
							<div className="mt-8 space-y-4">
								{savingsAccounts.map((account) => {
									const selected = selectedAccountIds.includes(account.id);
									return (
										<div
											key={account.id}
											className={`rounded-2xl border p-5 ${selected ? "border-cyan-500" : "border-gray-200 dark:border-white/10"}`}
										>
											<button
												type="button"
												onClick={() =>
													setSelectedAccountIds((current) =>
														current.includes(account.id)
															? current.filter((id) => id !== account.id)
															: [...current, account.id],
													)
												}
												className="flex w-full items-center gap-4 text-left"
											>
												<AccountLogo account={account} size={50} />
												<span className="min-w-0 flex-1 truncate font-semibold">
													{formatAccountName(account)}
												</span>
												{selected ? <Minus size={20} /> : <Plus size={20} />}
											</button>
											{selected && (
												<input
													value={monthlyContributions[account.id] ?? ""}
													onChange={(event) =>
														setMonthlyContributions((current) => ({
															...current,
															[account.id]: event.target.value,
														}))
													}
													inputMode="decimal"
													placeholder="Monthly amount"
													className={`${inputClassName} mt-4`}
												/>
											)}
										</div>
									);
								})}
							</div>
						</div>
						<GoalPreview
							name={name}
							emoji={selectedPreset.emoji}
							target={parseAmount(targetAmount)}
						/>
					</section>
				)}
			</div>

			<footer className="sticky bottom-0 border-t border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#171716]">
				<div className="mx-auto flex max-w-xl gap-3">
					{step > 1 && (
						<SecondaryButton
							type="button"
							onClick={() => setStep((step - 1) as 0 | 1 | 2 | 3)}
						>
							Skip
						</SecondaryButton>
					)}
					<PrimaryButton
						type="button"
						className="flex-1"
						disabled={isSaving || (step === 1 && !name.trim())}
						onClick={() => {
							if (step < 3) {
								setStep((step + 1) as 1 | 2 | 3);
							} else {
								void createGoal();
							}
						}}
					>
						{isSaving ? "Creating…" : step === 3 ? "Create goal" : "Continue"}
					</PrimaryButton>
				</div>
				{error && (
					<p className="mx-auto mt-3 max-w-xl text-sm font-semibold text-red-600">
						{error}
					</p>
				)}
			</footer>
		</main>
	);
}

function GoalPreview({
	name,
	emoji,
	target,
}: {
	name: string;
	emoji: string;
	target: number;
}) {
	return (
		<aside>
			<h2 className="text-3xl font-bold">Goals</h2>
			<div className="mt-6 rounded-2xl border border-gray-200 p-6 shadow-sm dark:border-white/10">
				<div className="flex items-center gap-4">
					<div className="grid size-20 place-items-center rounded-xl bg-gray-100 text-4xl dark:bg-white/10">
						{emoji}
					</div>
					<div className="min-w-0 flex-1">
						<p className="text-xl font-medium">{name}</p>
						<p className="mt-2 text-gray-500">
							{target > 0
								? `${formatCurrency(target)} target`
								: "No target amount"}
						</p>
						<ProgressBar value={0} className="mt-4" />
					</div>
				</div>
			</div>
		</aside>
	);
}
