import { ArrowLeft, X } from "lucide-react";

import { MANUAL_ACCOUNT_OPTIONS } from "@/components/Accounts/constants";
import { ModalShell } from "@/components/ui/ModalShell";
import type { AccountKind } from "@/components/Accounts/types";

export function ManualAccountPicker({
	onBack,
	onClose,
	onSelect,
}: {
	onBack: () => void;
	onClose: () => void;
	onSelect: (kind: AccountKind) => void;
}) {
	return (
		<ModalShell onClose={onClose} className="max-w-xl">
			<div className="flex items-center justify-between px-6 pt-5">
				<button
					type="button"
					onClick={onBack}
					className="flex size-11 items-center justify-center rounded-full border border-gray-200 dark:border-white/10"
				>
					<ArrowLeft size={22} />
				</button>
				<button type="button" onClick={onClose}>
					<X size={25} />
				</button>
			</div>

			<h2 className="px-6 pb-5 pt-4 text-2xl font-semibold">
				Add Manual Account
			</h2>

			{(["Asset", "Liability"] as const).map((section) => (
				<div key={section}>
					<div className="border-y border-gray-200 bg-gray-100 px-6 py-3 text-gray-500 dark:border-white/5 dark:bg-[#292929] dark:text-zinc-400">
						{section}
					</div>

					{MANUAL_ACCOUNT_OPTIONS.filter(
						(option) => option.section === section,
					).map((option) => {
						const Icon = option.icon;

						return (
							<button
								key={option.kind}
								type="button"
								onClick={() => onSelect(option.kind)}
								className="flex w-full items-center gap-5 border-b border-gray-200 px-6 py-5 text-left text-lg transition hover:bg-gray-50 dark:border-white/5 dark:hover:bg-white/[0.03]"
							>
								<Icon size={19} />
								{option.label}
							</button>
						);
					})}
				</div>
			))}
		</ModalShell>
	);
}
