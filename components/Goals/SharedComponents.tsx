import { Info, Minus, Plus } from "lucide-react";
import { formatCurrency } from "@/lib/goals/formatters";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { DebtPaydownSetting, DebtStrategy } from "@/lib/goals/types";
import { PrimaryButton } from "@/components/Goals/GoalsUI";

// Unified metric card (used in both debt and savings pages)
export function MetricCard({
	value,
	label,
	positive = false,
}: {
	value: string;
	label: string;
	positive?: boolean;
}) {
	return (
		<div className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm dark:border-white/5 dark:bg-[#232322]">
			<p className={`text-2xl font-bold ${positive ? "text-emerald-600" : ""}`}>
				{value}
			</p>
			<p className="mt-3 text-gray-500">
				{label} <Info size={15} className="inline" />
			</p>
		</div>
	);
}

// Donut chart for debt page
export function Donut({ title, value }: { title: string; value: number }) {
	const data = [{ name: title, value: Math.max(value, 0.01) }];
	return (
		<div className="grid grid-cols-[minmax(0,1fr)_180px] items-center gap-4">
			<ResponsiveContainer width="100%" height="100%">
				<PieChart>
					<Pie
						data={data}
						dataKey="value"
						innerRadius="62%"
						outerRadius="88%"
						startAngle={90}
						endAngle={-270}
					>
						<Cell fill="#ff6633" />
					</Pie>
					<Tooltip formatter={(item) => formatCurrency(Number(item))} />
				</PieChart>
			</ResponsiveContainer>
			<div>
				<p className="text-xl font-bold">{title}</p>
				<p className="mt-4 text-2xl">{formatCurrency(value)}</p>
			</div>
		</div>
	);
}

// Stepper input (used in SavingsCalculator)
export function Stepper({
	label,
	value,
	onChange,
}: {
	label: string;
	value: number;
	onChange: (value: number) => void;
}) {
	return (
		<div>
			<label className="font-semibold">{label}</label>
			<div className="mt-2 flex items-center rounded-xl border border-gray-300 px-4 dark:border-white/15">
				<span className="text-gray-500">$</span>
				<input
					value={value || ""}
					onChange={(event) =>
						onChange(Math.max(0, Number(event.target.value) || 0))
					}
					inputMode="decimal"
					className="h-14 min-w-0 flex-1 bg-transparent px-2 outline-none"
				/>
				<button
					type="button"
					onClick={() => onChange(Math.max(0, value - 10))}
					className="grid size-9 place-items-center rounded-full bg-gray-100 dark:bg-white/10"
				>
					<Minus size={17} />
				</button>
				<button
					type="button"
					onClick={() => onChange(value + 10)}
					className="ml-2 grid size-9 place-items-center rounded-full bg-gray-100 dark:bg-white/10"
				>
					<Plus size={17} />
				</button>
			</div>
		</div>
	);
}

// SavingsCalculator (could also be extracted)
export function SavingsCalculator({
	value,
	onChange,
	onSave,
}: {
	value: DebtPaydownSetting;
	onChange: (value: DebtPaydownSetting) => void;
	onSave: (value: DebtPaydownSetting) => Promise<void>;
}) {
	const strategies: Array<{
		id: DebtStrategy;
		title: string;
		description: string;
	}> = [
		{
			id: "planned",
			title: "Planned payments",
			description: "Pay only scheduled minimum or planned amounts.",
		},
		{
			id: "avalanche",
			title: "Avalanche",
			description:
				"Target the highest-interest balance first to minimize interest.",
		},
		{
			id: "snowball",
			title: "Snowball",
			description: "Pay the smallest balances first to build momentum.",
		},
	];

	return (
		<section className="self-start overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/5 dark:bg-[#232322]">
			<header className="border-b border-gray-200 px-6 py-4 text-2xl font-bold dark:border-white/10">
				Savings Calculator
			</header>
			{strategies.map((strategy) => {
				const selected = value.strategy === strategy.id;
				return (
					<div
						key={strategy.id}
						className="border-b border-gray-200 p-6 last:border-b-0 dark:border-white/10"
					>
						<button
							type="button"
							onClick={() => onChange({ ...value, strategy: strategy.id })}
							className="flex w-full items-start gap-4 text-left"
						>
							<span
								className={`mt-1 size-6 rounded-full border-[7px] ${selected ? "border-[#ff6633]" : "border-gray-300"}`}
							/>
							<span>
								<span className="text-xl font-bold">{strategy.title}</span>
								<span className="mt-2 block leading-7 text-gray-600 dark:text-gray-300">
									{strategy.description}
								</span>
							</span>
						</button>
						{selected && strategy.id !== "planned" && (
							<div className="ml-10 mt-5 space-y-4">
								<Stepper
									label="Additional monthly payment"
									value={value.extraMonthlyPayment}
									onChange={(next) =>
										onChange({ ...value, extraMonthlyPayment: next })
									}
								/>
								<Stepper
									label="Additional one-time payment"
									value={value.extraOneTimePayment}
									onChange={(next) =>
										onChange({ ...value, extraOneTimePayment: next })
									}
								/>
							</div>
						)}
					</div>
				);
			})}
			<div className="p-5">
				<PrimaryButton
					type="button"
					className="w-full"
					onClick={() => void onSave(value)}
				>
					Apply strategy
				</PrimaryButton>
			</div>
		</section>
	);
}
