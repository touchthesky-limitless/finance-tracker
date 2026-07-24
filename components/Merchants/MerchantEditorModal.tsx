"use client";

import {
	type ChangeEvent,
	type ReactNode,
	type RefObject,
	useEffect,
	useId,
	useRef,
	useState,
	useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { Loader2, Merge, Trash2, Upload, X } from "lucide-react";

import {
	MerchantSelect,
	type MerchantSelection,
} from "@/components/Merchants/MerchantSelect";
import type { MerchantListItem } from "@/components/Merchants/types";

export interface MerchantEditorValue extends MerchantListItem {
	isSystem: boolean;
}

interface MerchantEditorSaveValue {
	name: string;
	logoUrl: string | null;
	isRecurring: boolean;
}

interface MerchantEditorModalProps {
	merchant: MerchantEditorValue;
	isRecurring: boolean;
	onClose: () => void;
	onSave: (value: MerchantEditorSaveValue) => Promise<void>;
	onRequestMerge: () => void;
}

interface MerchantMergeDialogProps {
	source: MerchantEditorValue;
	merchantItems: MerchantListItem[];
	onClose: () => void;
	onConfirm: (target: MerchantSelection) => Promise<void>;
}

function subscribeToClient(): () => void {
	return () => {};
}

function getClientSnapshot(): boolean {
	return true;
}

function getServerSnapshot(): boolean {
	return false;
}

function ModalPortal({ children }: { children: ReactNode }) {
	const isClient = useSyncExternalStore(
		subscribeToClient,
		getClientSnapshot,
		getServerSnapshot,
	);

	if (!isClient) {
		return null;
	}

	return createPortal(children, document.body);
}

function useModalEffects(
	isBusy: boolean,
	onClose: () => void,
	initialFocusRef?: RefObject<HTMLElement | null>,
): void {
	useEffect(() => {
		const previousOverflow = document.body.style.overflow;
		const previouslyFocused =
			document.activeElement instanceof HTMLElement
				? document.activeElement
				: null;

		document.body.style.overflow = "hidden";

		const focusFrame = window.requestAnimationFrame(() => {
			initialFocusRef?.current?.focus();
		});

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape" && !isBusy) {
				event.preventDefault();
				onClose();
			}
		};

		window.addEventListener("keydown", handleKeyDown);

		return () => {
			window.cancelAnimationFrame(focusFrame);
			window.removeEventListener("keydown", handleKeyDown);
			document.body.style.overflow = previousOverflow;
			previouslyFocused?.focus();
		};
	}, [initialFocusRef, isBusy, onClose]);
}

function MerchantAvatar({
	name,
	logoUrl,
}: {
	name: string;
	logoUrl?: string | null;
}) {
	const initial = name.trim().charAt(0).toUpperCase() || "?";

	return (
		<div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-full border border-black/10 bg-[#f3f2ef] text-2xl font-bold text-[#777671] shadow-sm dark:border-white/15 dark:bg-white/8 dark:text-white sm:size-24">
			{logoUrl ? (
				// eslint-disable-next-line @next/next/no-img-element
				<img src={logoUrl} alt="" className="h-full w-full object-cover" />
			) : (
				<span aria-hidden="true">{initial}</span>
			)}
		</div>
	);
}

export function MerchantEditorModal({
	merchant,
	isRecurring: initialRecurring,
	onClose,
	onSave,
	onRequestMerge,
}: MerchantEditorModalProps) {
	const titleId = useId();
	const nameInputRef = useRef<HTMLInputElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const [name, setName] = useState(merchant.name);
	const [logoUrl, setLogoUrl] = useState<string | null>(
		merchant.logoUrl ?? null,
	);
	const [isRecurring, setIsRecurring] = useState(initialRecurring);
	const [isSaving, setIsSaving] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	useModalEffects(isSaving, onClose, nameInputRef);

	const cleanName = name.trim();
	const hasChanges =
		cleanName !== merchant.name.trim() ||
		logoUrl !== (merchant.logoUrl ?? null) ||
		isRecurring !== initialRecurring;
	const canSave = Boolean(cleanName) && hasChanges && !isSaving;

	const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>): void => {
		const file = event.target.files?.[0];

		event.target.value = "";

		if (!file) {
			return;
		}

		if (!file.type.startsWith("image/")) {
			setErrorMessage("Choose a valid image file.");
			return;
		}

		if (file.size > 2 * 1024 * 1024) {
			setErrorMessage("Merchant photos must be 2 MB or smaller.");
			return;
		}

		const reader = new FileReader();

		reader.addEventListener("load", () => {
			if (typeof reader.result === "string") {
				setLogoUrl(reader.result);
				setErrorMessage(null);
			}
		});

		reader.addEventListener("error", () => {
			setErrorMessage("The selected image could not be read.");
		});

		reader.readAsDataURL(file);
	};

	const handleSave = async (): Promise<void> => {
		if (!canSave) {
			return;
		}

		setIsSaving(true);
		setErrorMessage(null);

		try {
			await onSave({
				name: cleanName,
				logoUrl,
				isRecurring,
			});
		} catch (error) {
			setErrorMessage(
				error instanceof Error
					? error.message
					: "The merchant could not be saved.",
			);
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<ModalPortal>
			<div
				className="fixed inset-0 z-[900] grid place-items-center overflow-y-auto bg-black/60 p-3 backdrop-blur-[2px] sm:p-5"
				onPointerDown={(event) => {
					if (event.target === event.currentTarget && !isSaving) {
						onClose();
					}
				}}
			>
				<section
					role="dialog"
					aria-modal="true"
					aria-labelledby={titleId}
					className="my-auto w-full max-w-[810px] overflow-hidden rounded-2xl border border-black/10 bg-white text-[#282826] shadow-[0_28px_100px_rgba(0,0,0,0.38)] dark:border-white/10 dark:bg-[#222220] dark:text-white"
				>
					<header className="flex items-center justify-between border-b border-black/[0.07] px-5 py-5 sm:px-8 sm:py-7 dark:border-white/10">
						<h2 id={titleId} className="text-2xl font-semibold sm:text-[30px]">
							Edit merchant
						</h2>
						<button
							type="button"
							onClick={onClose}
							disabled={isSaving}
							aria-label="Close merchant editor"
							className="grid size-10 place-items-center rounded-xl transition hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/35 disabled:opacity-50 dark:hover:bg-white/8"
						>
							<X size={28} />
						</button>
					</header>

					<div className="space-y-8 px-5 py-7 sm:px-8 sm:py-9">
						<div className="flex flex-col gap-5 sm:flex-row sm:items-center">
							<MerchantAvatar
								name={cleanName || merchant.name}
								logoUrl={logoUrl}
							/>

							<div className="flex flex-wrap gap-3">
								<input
									ref={fileInputRef}
									type="file"
									accept="image/*"
									onChange={handlePhotoChange}
									className="sr-only"
								/>
								<button
									type="button"
									onClick={() => fileInputRef.current?.click()}
									disabled={isSaving}
									className="inline-flex h-12 items-center gap-2 rounded-xl border border-[#d8d6d2] bg-white px-4 font-semibold transition hover:bg-[#f6f5f2] disabled:opacity-50 dark:border-white/15 dark:bg-transparent dark:hover:bg-white/6"
								>
									<Upload size={18} />
									Choose photo
								</button>
								<button
									type="button"
									onClick={() => setLogoUrl(null)}
									disabled={isSaving || !logoUrl}
									className="inline-flex h-12 items-center gap-2 rounded-xl border border-[#d8d6d2] bg-white px-4 font-semibold transition hover:bg-[#f6f5f2] disabled:cursor-not-allowed disabled:opacity-45 dark:border-white/15 dark:bg-transparent dark:hover:bg-white/6"
								>
									<Trash2 size={18} />
									Remove
								</button>
							</div>
						</div>

						<div>
							<label
								htmlFor={`${titleId}-name`}
								className="mb-3 block text-lg font-semibold"
							>
								Merchant name
							</label>
							<input
								ref={nameInputRef}
								id={`${titleId}-name`}
								value={name}
								onChange={(event) => setName(event.target.value)}
								disabled={isSaving}
								className="h-14 w-full rounded-xl border border-[#d8d6d2] bg-white px-4 text-lg outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 disabled:opacity-60 dark:border-white/15 dark:bg-[#20201f]"
							/>
						</div>

						<div className="flex items-start justify-between gap-5 rounded-2xl border border-[#dedcd7] p-5 sm:p-6 dark:border-white/10">
							<div className="min-w-0">
								<h3 className="text-lg font-semibold">
									Mark this merchant as recurring
								</h3>
								<p className="mt-2 max-w-[560px] text-base leading-7 text-[#686661] dark:text-[#c2c0bb]">
									This merchant will show in the Recurring section with expected
									upcoming transactions.{" "}
									<a
										href="/recurring"
										className="font-semibold text-cyan-600 hover:underline dark:text-cyan-400"
									>
										Learn more
									</a>
								</p>
							</div>

							<button
								type="button"
								role="switch"
								aria-checked={isRecurring}
								onClick={() => setIsRecurring((current) => !current)}
								disabled={isSaving}
								className={`relative mt-1 h-7 w-13 shrink-0 rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 ${
									isRecurring
										? "bg-orange-500"
										: "bg-[#a19f9a] dark:bg-[#777671]"
								}`}
							>
								<span
									className={`absolute top-1 size-5 rounded-full bg-white shadow transition-transform ${
										isRecurring ? "translate-x-7" : "translate-x-1"
									}`}
								/>
							</button>
						</div>

						{errorMessage && (
							<p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
								{errorMessage}
							</p>
						)}
					</div>

					<footer className="flex flex-col gap-3 border-t border-black/[0.07] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8 dark:border-white/10">
						<button
							type="button"
							onClick={onRequestMerge}
							disabled={isSaving}
							className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-red-300 px-4 font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-500/35 dark:text-red-400 dark:hover:bg-red-500/10"
						>
							<Merge size={18} />
							Merge &amp; delete
						</button>

						<div className="flex flex-col-reverse gap-3 sm:flex-row">
							<button
								type="button"
								onClick={onClose}
								disabled={isSaving}
								className="h-12 rounded-xl border border-[#d8d6d2] px-5 font-semibold transition hover:bg-black/4 disabled:opacity-50 dark:border-white/15 dark:hover:bg-white/6"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={() => void handleSave()}
								disabled={!canSave}
								className="inline-flex h-12 min-w-25 items-center justify-center gap-2 rounded-xl bg-[#ff5a35] px-5 font-semibold text-white transition hover:bg-[#e94c28] disabled:cursor-not-allowed disabled:bg-[#ffad91]"
							>
								{isSaving && <Loader2 size={18} className="animate-spin" />}
								Save
							</button>
						</div>
					</footer>
				</section>
			</div>
		</ModalPortal>
	);
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

	const availableMerchants = merchantItems.filter((merchant) => {
		return merchant.id !== source.id;
	});

	const handleConfirm = async (): Promise<void> => {
		if (!target || isMerging) {
			return;
		}

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
