import * as Dialog from "@radix-ui/react-dialog";

interface Props {
	categoryName?: string;
	isOpen: boolean;
	onClose: () => void;
	onConfirm: () => void;
}

export function DeleteCategoryModal({
	categoryName,
	isOpen,
	onClose,
	onConfirm,
}: Props) {
	return (
		<Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 z-100 bg-gray-900/20 dark:bg-black/20 backdrop-blur-sm animate-in fade-in duration-200" />
				<Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-100 w-full max-w-sm p-6 bg-white/90 dark:bg-[#121212]/90 border border-gray-200 dark:border-white/10 backdrop-blur-xl rounded-2xl shadow-2xl outline-none animate-in fade-in zoom-in-95 duration-200">
					<h3 className="text-lg font-black text-gray-900 dark:text-white">
						Remove Category?
					</h3>
					<p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
						This will remove{" "}
						<strong className="text-gray-900 dark:text-white">
							{categoryName}
						</strong>{" "}
						from dashboard.
					</p>
					<div className="flex gap-3 mt-6">
						<Dialog.Close asChild>
							<button className="flex-1 px-4 py-2 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-sm font-bold transition-colors text-gray-900 dark:text-white">
								Cancel
							</button>
						</Dialog.Close>
						<button
							onClick={onConfirm}
							className="flex-1 px-4 py-2 rounded-xl bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-600 dark:text-red-500 text-sm font-bold transition-colors"
						>
							Confirm
						</button>
					</div>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
