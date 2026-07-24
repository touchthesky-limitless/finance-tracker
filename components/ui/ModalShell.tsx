import type { ReactNode } from "react";

export function ModalShell({
	children,
	onClose,
	className = "",
}: {
	children: ReactNode;
	onClose: () => void;
	className?: string;
}) {
	return (
		<div className="fixed inset-0 z-[110] flex items-start justify-center overflow-y-auto bg-black/70 p-3 py-8 backdrop-blur-sm sm:p-6">
			<button
				type="button"
				aria-label="Close modal"
				onClick={onClose}
				className="absolute inset-0"
			/>
			<div
				role="dialog"
				aria-modal="true"
				className={`relative z-10 w-full overflow-hidden rounded-2xl border border-gray-200 bg-white text-gray-900 shadow-2xl dark:border-white/5 dark:bg-[#222] dark:text-white ${className}`}
			>
				{children}
			</div>
		</div>
	);
}
