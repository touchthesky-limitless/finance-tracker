import { X, Check, RotateCcw } from "lucide-react";

interface UndoToastProps {
	message: string;
	onUndo: () => void;
	onClose: () => void;
	duration?: number;
}

export function UndoToast({
	message,
	onUndo,
	onClose,
	duration = 5000,
}: UndoToastProps) {
	return (
		<div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-200 animate-in slide-in-from-bottom-4 duration-300">
			<div className="relative overflow-hidden dark:bg-slate-900 bg-white dark:text-white text-black px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-6 border border-white/10">
				{/* Progress Bar Timer */}
				<div
					className="absolute bottom-0 left-0 h-1 bg-orange-500 animate-shrink-width"
					style={{
						animationDuration: `${duration}ms`,
						animationTimingFunction: "linear",
					}}
				/>

				<div className="flex items-center gap-3">
					<div className="bg-emerald-500 p-1.5 rounded-full">
						<Check size={16} className="text-white" />
					</div>
					<span className="text-sm font-bold whitespace-nowrap">{message}</span>
				</div>

				<div className="h-4 w-px bg-white/20 dark:bg-black/20" />

				<button
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
					onClick={onClose}
					className="p-1 hover:bg-white/10 dark:hover:bg-black/5 dark:text-white text-black rounded-md transition-colors"
				>
					<X size={16} className="opacity-50 hover:opacity-100" />
				</button>
			</div>
		</div>
	);
}
