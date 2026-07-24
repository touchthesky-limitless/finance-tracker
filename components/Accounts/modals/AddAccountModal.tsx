import {
	ArrowRight,
	Search,
	X,
} from "lucide-react";

import { ADD_ACCOUNT_CATEGORIES } from "@/components/Accounts/constants";
import { ModalShell } from "@/components/ui/ModalShell";

export function AddAccountModal({
	onClose,
	onManual,
}: {
	onClose: () => void;
	onManual: () => void;
}) {
	return (
		<ModalShell onClose={onClose} className="max-w-xl">
			<div className="flex items-center justify-between px-6 pt-6">
				<h2 className="text-2xl font-semibold">Add an account</h2>
				<button type="button" onClick={onClose}>
					<X size={25} />
				</button>
			</div>

			<div className="px-6 pb-6">
				<div className="mt-7 flex h-12 items-center gap-3 rounded-xl border border-gray-200 px-4 dark:border-white/10">
					<Search size={20} className="text-gray-500 dark:text-zinc-400" />
					<input
						placeholder="Search 13,000 institutions..."
						className="w-full bg-transparent outline-none placeholder:text-gray-500 dark:text-zinc-500"
					/>
				</div>

				<div className="mt-5 space-y-3">
					{ADD_ACCOUNT_CATEGORIES.map((category) => {
						const Icon = category.icon;

						return (
							<button
								key={category.title}
								type="button"
								className="flex w-full items-center justify-between rounded-2xl bg-gray-100 px-5 py-4 text-left transition hover:bg-gray-200 dark:bg-[#2a2a2a] dark:hover:bg-[#303030]"
							>
								<div>
									<div className="flex items-center gap-2 text-lg font-semibold">
										{category.title}
										{"badge" in category && category.badge && (
											<span className="rounded-lg bg-[#ff5a35] px-2 py-1 text-xs text-white">
												{category.badge}
											</span>
										)}
									</div>
									<div className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
										{category.subtitle}
									</div>
								</div>

								<div className="flex items-center gap-3">
									<span className="flex size-10 items-center justify-center rounded-full bg-white text-zinc-900">
										<Icon size={20} />
									</span>
									<ArrowRight size={20} />
								</div>
							</button>
						);
					})}
				</div>

				<button
					type="button"
					onClick={onManual}
					className="mx-auto mt-10 block w-full max-w-xs rounded-xl border border-white/15 py-3 font-semibold"
				>
					Add manual account
				</button>
			</div>
		</ModalShell>
	);
}
