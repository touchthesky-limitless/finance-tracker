"use client";

import type { ReactNode } from "react";
import { PlusCircle, RefreshCw, Search } from "lucide-react";

import { RecurringDialog } from "@/components/Recurring/RecurringDialog";
import type { RecurringType } from "@/components/Recurring/types";

interface RecurringManagerDialogProps {
	open: boolean;
	onClose: () => void;
	onOpenSearch: (defaultType: RecurringType) => void;
}

export function RecurringManagerDialog({
	open,
	onClose,
	onOpenSearch,
}: RecurringManagerDialogProps) {
	return (
		<RecurringDialog
			open={open}
			onOpenChange={(nextOpen) => {
				if (!nextOpen) {
					onClose();
				}
			}}
			title="Add recurring"
			maxWidthClass="max-w-[1120px]"
		>
			<div className="grid gap-8 p-8 md:grid-cols-3">
				<ManagerCard
					icon={<RefreshCw size={31} />}
					title="Sync your liability accounts"
					onClick={() => {
						onOpenSearch("credit-card");
					}}
				/>

				<ManagerCard
					icon={<PlusCircle size={31} />}
					title="Add a recurring merchant manually"
					onClick={() => {
						onOpenSearch("expense");
					}}
				/>

				<ManagerCard
					icon={<Search size={32} />}
					title="Find recurring merchants in your accounts"
					onClick={() => {
						onOpenSearch("expense");
					}}
					muted
				/>
			</div>
		</RecurringDialog>
	);
}

function ManagerCard({
	icon,
	title,
	onClick,
	muted = false,
}: {
	icon: ReactNode;
	title: string;
	onClick: () => void;
	muted?: boolean;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={`flex min-h-[184px] flex-col items-start justify-center gap-7 rounded-2xl border border-transparent px-8 py-7 text-left transition-colors hover:border-[#FF6633]/50 hover:bg-[#FF6633]/5 ${
				muted
					? "bg-gray-50 text-gray-500 dark:bg-white/[0.035] dark:text-gray-400"
					: "bg-gray-100 text-gray-900 dark:bg-white/[0.045] dark:text-white"
			}`}
		>
			<span className={muted ? "text-gray-500" : "text-[#FF6633]"}>{icon}</span>

			<span className="max-w-64 text-xl font-bold leading-relaxed">
				{title}
			</span>
		</button>
	);
}
