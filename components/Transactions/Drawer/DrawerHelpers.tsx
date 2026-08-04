import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";

export function DrawerField({
	label,
	children,
}: {
	label: string;
	children: ReactNode;
}) {
	return (
		<div>
			<label className="mb-2 block text-sm font-semibold dark:text-gray-200">
				{label}
			</label>
			{children}
		</div>
	);
}

export function DrawerMenuButton({
	icon,
	label,
	onClick,
	highlighted = false,
	danger = false,
}: {
	icon: ReactNode;
	label: string;
	onClick: () => void;
	highlighted?: boolean;
	danger?: boolean;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-[15px] transition-colors ${
				danger
					? "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
					: highlighted
						? "bg-gray-100 text-gray-950 hover:bg-gray-200 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
						: "text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-white/10"
			}`}
		>
			<span className="shrink-0">{icon}</span>
			<span>{label}</span>
		</button>
	);
}

export function ConfirmationOverlay({
	title,
	description,
	confirmLabel,
	danger,
	pending,
	onCancel,
	onConfirm,
}: {
	title: string;
	description: string;
	confirmLabel: string;
	danger?: boolean;
	pending: boolean;
	onCancel: () => void;
	onConfirm: () => void;
}) {
	return (
		<div className="absolute inset-0 z-50 grid place-items-center bg-white/75 p-5 backdrop-blur-sm dark:bg-black/65">
			<div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-[#242424]">
				<h3 className="text-lg font-semibold dark:text-white">{title}</h3>
				<p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
					{description}
				</p>
				<div className="mt-5 flex justify-end gap-3">
					<button
						type="button"
						onClick={onCancel}
						disabled={pending}
						className="h-10 rounded-xl border border-gray-200 px-4 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50 dark:border-white/10 dark:hover:bg-white/5"
					>
						Cancel
					</button>
					<button
						type="button"
						onClick={onConfirm}
						disabled={pending}
						className={`inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-white disabled:opacity-60 ${
							danger
								? "bg-red-600 hover:bg-red-500"
								: "bg-orange-600 hover:bg-orange-500"
						}`}
					>
						{pending && <Loader2 size={15} className="animate-spin" />}
						{confirmLabel}
					</button>
				</div>
			</div>
		</div>
	);
}
