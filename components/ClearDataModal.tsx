import { AlertTriangle, Trash2 } from "lucide-react";
import { useBudgetStore } from "@/hooks/useBudgetStore";
import { createPortal } from "react-dom";

interface ClearDataModalProps {
	isOpen: boolean;
	onClose: () => void;
}

export default function ClearDataModal({
	isOpen,
	onClose,
}: ClearDataModalProps) {
	const useStore = useBudgetStore();
	const clearData = useStore((state) => state.clearData);

	if (!isOpen) return null;

	const handleConfirm = () => {
		clearData(); // Wipes the database
		onClose(); // Closes modal
	};

	return createPortal (
		<div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
			{/* Click outside to close */}
			<div className="absolute inset-0" onClick={onClose} />

			<div className="relative w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-800">
				{/* Header with Icon */}
				<div className="p-6 flex flex-col items-center text-center">
					<div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mb-4">
						<AlertTriangle size={32} strokeWidth={2.5} />
					</div>

					<h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
						Delete All Data?
					</h3>

					<p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
						This action cannot be undone. This will permanently delete all
						transactions, categories, and settings from your local storage.
					</p>
				</div>

				{/* Buttons */}
				<div className="p-4 bg-gray-50 dark:bg-gray-800/50 flex gap-3">
					<button
						onClick={onClose}
						className="flex-1 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
					>
						Cancel
					</button>

					<button
						onClick={handleConfirm}
						className="flex-1 px-4 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 active:scale-95 transition-all shadow-lg shadow-red-500/20 flex items-center justify-center gap-2"
					>
						<Trash2 size={18} />
						Delete data
					</button>
				</div>
			</div>
		</div>,
        document.body
	);
}
