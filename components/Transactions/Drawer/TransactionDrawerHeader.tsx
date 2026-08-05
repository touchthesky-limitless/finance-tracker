import { useRef, useState } from "react";
import {
	ArrowLeft,
	Check,
	Copy,
	Ellipsis,
	Eye,
	EyeOff,
	Repeat2,
	Split,
	Trash2,
	X,
	Zap,
} from "lucide-react";
import { DrawerMenuButton } from "./DrawerHelpers";

interface Props {
	onBack?: () => void;
	needsReview: boolean;
	isActionPending: boolean;
	isHidden: boolean;
	onMarkReviewed: () => void;
	onToggleHidden: () => void;
	onClose: () => void;
	onCreateRule: () => void;
	onEditMerchant: () => void;
	onMarkRecurring: () => void;
	onSplit: () => void;
	onDuplicate: () => void;
	onDelete: () => void;
	saveStatus: "idle" | "saving" | "saved" | "error";
}

export function TransactionDrawerHeader({
	onBack,
	needsReview,
	isActionPending,
	isHidden,
	onMarkReviewed,
	onToggleHidden,
	onClose,
	onCreateRule,
	onEditMerchant,
	onMarkRecurring,
	onSplit,
	onDuplicate,
	onDelete,
	saveStatus,
}: Props) {
	const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
	const moreMenuRef = useRef<HTMLDivElement>(null);

	return (
		<header className="relative flex min-h-17 shrink-0 items-center justify-between border-b border-gray-200 px-4 dark:border-white/10 sm:px-6">
			<div className="flex min-w-0 items-center gap-2.5">
				{onBack && (
					<>
						<button
							type="button"
							onClick={onBack}
							className="flex items-center justify-center rounded-full p-2 hover:bg-gray-100 dark:hover:bg-white/10"
						>
							<ArrowLeft
								size={20}
								className="text-gray-700 dark:text-gray-300"
							/>
						</button>
						<div className="mx-1 h-6 w-px bg-gray-300 dark:bg-white/20" />
					</>
				)}
				<button
					type="button"
					onClick={onMarkReviewed}
					disabled={!needsReview || isActionPending}
					className="inline-flex h-11 items-center gap-2 rounded-full border border-gray-200 px-4 text-sm font-semibold transition-colors hover:bg-gray-50 disabled:cursor-default disabled:opacity-60 dark:border-white/10 dark:hover:bg-white/5"
				>
					<Check size={17} strokeWidth={2.4} />
					{needsReview ? "Mark as reviewed" : "Reviewed"}
				</button>
				<button
					type="button"
					onClick={onToggleHidden}
					disabled={isActionPending}
					className="grid size-11 place-items-center rounded-full border border-gray-200 text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/10 dark:text-gray-200 dark:hover:bg-white/5"
					aria-label={isHidden ? "Show transaction" : "Hide transaction"}
				>
					{isHidden ? <EyeOff size={19} /> : <Eye size={19} />}
				</button>
			</div>

			<div className="flex items-center gap-1 sm:gap-2">
				<div className="hidden min-w-16 items-center justify-end text-xs text-gray-400 sm:flex dark:text-gray-500">
					{saveStatus === "saving" && (
						<span className="inline-flex items-center gap-1.5">Saving</span>
					)}
					{saveStatus === "saved" && "Saved"}
				</div>

				<div ref={moreMenuRef} className="relative">
					<button
						type="button"
						onClick={() => setIsMoreMenuOpen((v) => !v)}
						className={`grid size-11 place-items-center rounded-full text-gray-800 transition-all hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-white/10 ${
							isMoreMenuOpen
								? "bg-gray-100 shadow-[0_8px_24px_rgba(0,0,0,0.15)] dark:bg-white/10"
								: ""
						}`}
					>
						<Ellipsis size={24} />
					</button>

					{isMoreMenuOpen && (
						<div className="absolute right-0 top-[calc(100%+10px)] z-50 w-[min(360px,calc(100vw-24px))] rounded-2xl border border-gray-200 bg-white p-2.5 shadow-[0_18px_50px_rgba(0,0,0,0.18)] dark:border-white/10 dark:bg-[#242424]">
							<DrawerMenuButton
								icon={<Eye size={18} />}
								label="Edit merchant details"
								onClick={onEditMerchant}
								highlighted
							/>
							<DrawerMenuButton
								icon={<Repeat2 size={18} />}
								label="Mark merchant as recurring"
								onClick={onMarkRecurring}
							/>
							<DrawerMenuButton
								icon={<Split size={18} />}
								label="Split transaction"
								onClick={onSplit}
							/>
							<DrawerMenuButton
								icon={<Zap size={18} />}
								label="Create rule from transaction"
								onClick={onCreateRule}
							/>
							<DrawerMenuButton
								icon={<Copy size={18} />}
								label="Duplicate transaction"
								onClick={onDuplicate}
							/>
							<DrawerMenuButton
								icon={<Trash2 size={18} />}
								label="Delete transaction"
								onClick={onDelete}
								danger
							/>
						</div>
					)}
				</div>

				<button
					type="button"
					onClick={onClose}
					className="grid size-11 place-items-center rounded-full text-gray-900 transition-colors hover:bg-gray-100 dark:text-white dark:hover:bg-white/10"
				>
					<X size={24} />
				</button>
			</div>
		</header>
	);
}
