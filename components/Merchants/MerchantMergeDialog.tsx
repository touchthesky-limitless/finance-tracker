/**
 * Dialog for merging one merchant into another, with transaction reassignment.
 */
"use client";

import { useId, useRef, useState } from "react";
import { Loader2, X } from "lucide-react";
import { MerchantSelect, type MerchantSelection } from "./MerchantSelect";
import type { MerchantListItem } from "./types";
import type { MerchantEditorValue } from "./MerchantEditorModal";
import { ModalPortal, useModalEffects } from "./MerchantModalPortal";

interface MerchantMergeDialogProps {
	source: MerchantEditorValue;
	merchantItems: MerchantListItem[];
	onClose: () => void;
	onConfirm: (target: MerchantSelection) => Promise<void>;
}

export function MerchantMergeDialog({
	source,
	merchantItems,
	onClose,
	onConfirm,
}: MerchantMergeDialogProps) {
	const titleId = useId();
	const cancelButtonRef = useRef<HTMLButtonElement>(null);
	const [target, setTarget] = useState<MerchantSelection | null>(null);
	const [isMerging, setIsMerging] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	useModalEffects(isMerging, onClose, cancelButtonRef);

	const availableMerchants = merchantItems.filter(
		(merchant) => merchant.id !== source.id,
	);

	const handleConfirm = async () => {
		if (!target || isMerging) return;
		setIsMerging(true);
		setErrorMessage(null);
		try {
			await onConfirm(target);
		} catch (error) {
			setErrorMessage(
				error instanceof Error
					? error.message
					: "The merchants could not be merged.",
			);
		} finally {
			setIsMerging(false);
		}
	};

	return (
		<ModalPortal>
			<div
				className="fixed inset-0 z-[1100] grid place-items-center overflow-y-auto bg-black/65 p-3 backdrop-blur-[2px] sm:p-5"
				onPointerDown={(event) => {
					if (event.target === event.currentTarget && !isMerging) {
						onClose();
					}
				}}
			>
				<section
					role="dialog"
					aria-modal="true"
					aria-labelledby={titleId}
					className="my-auto w-full max-w-[560px] rounded-2xl border border-black/10 bg-white p-5 shadow-[0_28px_100px_rgba(0,0,0,0.4)] dark:border-white/10 dark:bg-[#222220] dark:text-white sm:p-7"
				>
					<div className="flex items-start justify-between gap-4">
						<div>
							<h2 id={titleId} className="text-2xl font-semibold">
								Delete merchant
							</h2>
							<p className="mt-2 leading-7 text-[#686661] dark:text-[#bbb9b4]">
								There {source.transactionCount === 1 ? "is" : "are"}{" "}
								{source.transactionCount}{" "}
								{source.transactionCount === 1 ? "transaction" : "transactions"}{" "}
								still tied to this merchant. Select a new merchant to update
								these relations to before deleting.
							</p>
						</div>
						<button
							type="button"
							onClick={onClose}
							disabled={isMerging}
							aria-label="Close merge dialog"
							className="grid size-9 shrink-0 place-items-center rounded-lg hover:bg-black/5 disabled:opacity-50 dark:hover:bg-white/8"
						>
							<X size={22} />
						</button>
					</div>

					<div className="mt-6">
						<label className="mb-2 block font-semibold">
							Update relations to merchant
						</label>
						<MerchantSelect
							value={target}
							onChange={setTarget}
							merchantItems={availableMerchants}
							allowCreate={false}
							showCount
							placeholder="Select a merchant..."
							ariaLabel="Merchant to update relations to"
						/>
					</div>

					{errorMessage && (
						<p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
							{errorMessage}
						</p>
					)}

					<div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
						<button
							ref={cancelButtonRef}
							type="button"
							onClick={onClose}
							disabled={isMerging}
							className="h-12 rounded-xl border border-[#d8d6d2] px-5 font-semibold hover:bg-black/4 disabled:opacity-50 dark:border-white/15 dark:hover:bg-white/6"
						>
							Cancel
						</button>
						<button
							type="button"
							onClick={() => void handleConfirm()}
							disabled={!target || isMerging}
							className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-45"
						>
							{isMerging && <Loader2 size={18} className="animate-spin" />}
							Delete merchant
						</button>
					</div>
				</section>
			</div>
		</ModalPortal>
	);
}
