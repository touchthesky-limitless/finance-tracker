"use client";

import {
	useState,
	type FormEvent,
} from "react";
import {
	ArrowLeft,
	LoaderCircle,
	X,
} from "lucide-react";

import { MANUAL_ACCOUNT_OPTIONS } from "@/components/Accounts/constants";
import { ModalShell } from "@/components/ui/ModalShell";
import type {
	AccountKind,
	ManualAccount,
} from "@/components/Accounts/types";

export function ManualAccountForm({
	kind,
	onBack,
	onClose,
	onSave,
}: {
	kind: AccountKind;
	onBack: () => void;
	onClose: () => void;
	onSave: (account: ManualAccount) => void;
}) {
	const option =
		MANUAL_ACCOUNT_OPTIONS.find((item) => item.kind === kind) ??
		MANUAL_ACCOUNT_OPTIONS[0];
	const [name, setName] = useState("");
	const [balance, setBalance] = useState("");
	const [cashType, setCashType] = useState("Checking");
	const [isSaving, setIsSaving] = useState(false);

	const submit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		const parsedBalance = Number(balance.replaceAll(",", "") || 0);

		if (!name.trim() || !Number.isFinite(parsedBalance)) {
			return;
		}

		setIsSaving(true);

		onSave({
			id: crypto.randomUUID(),
			name: name.trim(),
			kind,
			type: kind === "cash" ? cashType : option.label.replace(/s$/, ""),
			balance: parsedBalance,
			createdAt: new Date().toISOString(),
		});
	};

	return (
		<ModalShell onClose={onClose} className="max-w-xl">
			<form onSubmit={submit}>
				<div className="flex items-center justify-between px-6 pt-5">
					<button type="button" onClick={onBack}>
						<ArrowLeft size={24} />
					</button>
					<button type="button" onClick={onClose}>
						<X size={25} />
					</button>
				</div>

				<div className="px-6 py-7">
					<h2 className="text-2xl font-semibold">
						Add {option.label.replace(/s$/, "")} Account
					</h2>

					<label className="mt-7 block">
						<span className="font-semibold">Name</span>
						<input
							value={name}
							onChange={(event) => setName(event.target.value)}
							placeholder={`My ${option.label} Account`}
							className="mt-3 h-13 w-full rounded-xl border border-gray-200 bg-transparent px-4 text-base outline-none focus:border-orange-500 dark:border-white/10"
						/>
					</label>

					{kind === "cash" && (
						<label className="mt-6 block">
							<span className="font-semibold">Type</span>
							<select
								value={cashType}
								onChange={(event) => setCashType(event.target.value)}
								className="mt-3 h-13 w-full rounded-xl border border-gray-200 bg-white px-4 text-base outline-none dark:border-white/10 dark:bg-[#222]"
							>
								<option>Checking</option>
								<option>Savings</option>
								<option>Cash</option>
							</select>
						</label>
					)}

					<label className="mt-6 block">
						<span className="font-semibold">Balance</span>
						<div className="relative mt-3">
							<span className="absolute inset-y-0 left-4 flex items-center text-gray-500 dark:text-zinc-400">
								$
							</span>
							<input
								value={balance}
								onChange={(event) => setBalance(event.target.value)}
								inputMode="decimal"
								placeholder="0.00"
								className="h-13 w-full rounded-xl border border-gray-200 bg-transparent pl-9 pr-4 text-base outline-none focus:border-orange-500 dark:border-white/10"
							/>
						</div>
					</label>
				</div>

				<div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-5 dark:border-white/5">
					<button
						type="button"
						onClick={onClose}
						className="rounded-xl border border-white/15 px-5 py-3 font-semibold"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={!name.trim() || isSaving}
						className="flex min-w-20 items-center justify-center rounded-xl bg-[#a94628] px-5 py-3 font-semibold text-white disabled:opacity-50"
					>
						{isSaving ? <LoaderCircle size={18} className="animate-spin" /> : "Save"}
					</button>
				</div>
			</form>
		</ModalShell>
	);
}
