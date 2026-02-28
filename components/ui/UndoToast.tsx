import { X, Check, RotateCcw } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";

interface UndoToastProps {
	show: boolean;
	message: string;
	onUndo: () => void;
	onClose: () => void;
	duration?: number;
}

export function UndoToast({
	show,
	message,
	onUndo,
	onClose,
	duration = 5000,
}: UndoToastProps) {
	useEffect(() => {
		// 1. Safety: Don't start the timer if 'show' is false
		// OR if the message is empty/default.
		if (!show || !message || message === "") return;

		const timer = setTimeout(() => {
			onClose();
		}, duration);

		return () => {
			clearTimeout(timer);
		};
	}, [show, message, duration, onClose]);

	if (typeof document === "undefined") return null;

	return createPortal(
		<div
			className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-9999 transition-all duration-500 ${
				show
					? "opacity-100 translate-y-0 pointer-events-auto"
					: "opacity-0 translate-y-10 pointer-events-none"
			}`}
		>
			<div className="relative overflow-hidden bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-6 border border-slate-200 dark:border-white/10">
				{/* Progress Bar: 
                    We use 'show' to ensure the animation only exists when visible. 
                    The 'key' ensures the animation restarts if a new toast arrives.
                */}
				{show && (
					<div
						key={message}
						className="absolute bottom-0 left-0 h-1 bg-orange-500 animate-shrink-width"
						style={{
							animationDuration: `${duration}ms`,
							animationTimingFunction: "linear",
							animationFillMode: "forwards",
						}}
					/>
				)}

				<div className="flex items-center gap-3">
					<div className="bg-emerald-500 p-1.5 rounded-full">
						<Check size={16} className="text-white" />
					</div>
					<span className="text-sm font-bold whitespace-nowrap">{message}</span>
				</div>

				<div className="h-4 w-px bg-slate-200 dark:bg-white/20" />

				<button
					type="button"
					onClick={() => {
						onUndo();
						onClose();
					}}
					className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-orange-500 hover:text-orange-400 transition-colors group"
				>
					<RotateCcw
						size={14}
						className="group-active:rotate-[-120deg] transition-transform"
					/>
					Undo
				</button>

				<button
					type="button"
					onClick={onClose}
					className="p-1 hover:bg-slate-100 dark:hover:bg-white/10 rounded-md transition-colors"
				>
					<X size={16} className="opacity-50 hover:opacity-100" />
				</button>
			</div>
		</div>,
		document.body,
	);
}
