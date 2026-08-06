/**
 * Modal for customising the dashboard widget layout.
 * Allows drag‑and‑drop reordering and toggling visibility of widgets.
 * Saves changes to the global store.
 */
"use client";

import { useState, useEffect, useRef } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { GripVertical, Settings2 } from "lucide-react";
import { useDashboardStore } from "@/store/useDashboardStore";
import { DragDropProvider } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { move } from "@dnd-kit/helpers";
import { arraysEqual } from "@/utils/dashboard";

function SortableWidgetItem({
	id,
	index,
	label,
	hidden,
	onToggle,
}: {
	id: string;
	index: number;
	label: string;
	hidden: boolean;
	onToggle: () => void;
}) {
	const { ref, handleRef, isDragging, isDropTarget } = useSortable({
		id,
		index,
		type: "widget",
	});

	return (
		<div
			ref={ref}
			className={`flex items-center gap-4 rounded-xl border border-gray-200 bg-gray-50/50 p-4 transition-opacity dark:border-white/5 dark:bg-white/5 ${
				isDragging ? "opacity-50" : ""
			} ${isDropTarget ? "ring-2 ring-cyan-500" : ""}`}
		>
			<div ref={handleRef} className="cursor-grab">
				<GripVertical className="text-gray-400 dark:text-gray-500" size={18} />
			</div>
			<span className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-200">
				{label}
			</span>
			<button
				type="button"
				role="switch"
				aria-checked={!hidden}
				onClick={onToggle}
				className={`relative h-6 w-11 rounded-full transition-colors ${
					!hidden ? "bg-[#FF5A35]" : "bg-gray-300 dark:bg-gray-600"
				}`}
			>
				<span
					className={`absolute top-[3px] block size-[18px] rounded-full bg-white transition-all ${
						!hidden ? "right-[3px]" : "left-[3px]"
					}`}
				/>
			</button>
		</div>
	);
}

export function CustomizeDashboardModal() {
	const [open, setOpen] = useState(false);
	const { widgets, updateOrder, setHiddenList } = useDashboardStore();
	const [localOrder, setLocalOrder] = useState(widgets.order);
	const [localHidden, setLocalHidden] = useState(widgets.hidden);
	const prevOpenRef = useRef(false);

	useEffect(() => {
		if (open && !prevOpenRef.current) {
			setLocalOrder(widgets.order);
			setLocalHidden(widgets.hidden);
		}
		prevOpenRef.current = open;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open]);

	const handleSave = async () => {
		await updateOrder(localOrder);
		await setHiddenList(localHidden);
		setOpen(false);
	};

	const availableWidgets = [
		{ id: "budget", label: "Budget" },
		{ id: "spending", label: "Spending trend" },
		{ id: "networth", label: "Net worth" },
		{ id: "top_categories", label: "Top Categories" },
		{ id: "recurring", label: "Recurring transactions" },
		{ id: "transactions", label: "Transactions" },
		{ id: "stocks", label: "Stocks" },
		{ id: "goals", label: "Goals" },
	];

	return (
		<Dialog.Root open={open} onOpenChange={setOpen}>
			<Dialog.Trigger asChild>
				<button className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
					<Settings2 size={14} />
					Customize
				</button>
			</Dialog.Trigger>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 z-[999] bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
				<Dialog.Content className="fixed left-1/2 top-1/2 z-[1000] w-full max-w-3xl -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl outline-none dark:bg-[#1B1B1B]">
					<div className="flex items-center justify-between">
						<div>
							<h2 className="text-lg font-bold text-gray-900 dark:text-white">
								Customize dashboard
							</h2>
							<p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
								Select the widgets you want to see on your dashboard
							</p>
						</div>
						<Dialog.Close asChild>
							<button className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-white/5">
								<svg
									width="24"
									height="24"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<path d="M18 6L6 18" />
									<path d="M6 6l12 12" />
								</svg>
							</button>
						</Dialog.Close>
					</div>

					<div className="mt-6">
						<DragDropProvider
							onDragEnd={(event) => {
								const newOrder = move(localOrder, event);
								if (!arraysEqual(localOrder, newOrder)) {
									setLocalOrder(newOrder);
								}
							}}
						>
							<div className="grid grid-cols-1 gap-3 md:grid-cols-2">
								{localOrder.map((id, index) => {
									const widget = availableWidgets.find((w) => w.id === id);
									if (!widget) return null;
									const hidden = localHidden.includes(id);
									return (
										<SortableWidgetItem
											key={id}
											id={id}
											index={index}
											label={widget.label}
											hidden={hidden}
											onToggle={() => {
												setLocalHidden((prev) =>
													prev.includes(id)
														? prev.filter((x) => x !== id)
														: [...prev, id],
												);
											}}
										/>
									);
								})}
							</div>
						</DragDropProvider>

						<div className="mt-6 flex justify-end gap-3 border-t border-gray-200 pt-6 dark:border-white/10">
							<button
								onClick={() => setOpen(false)}
								className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium transition hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5"
							>
								Cancel
							</button>
							<button
								onClick={handleSave}
								className="rounded-lg bg-[#FF5A35] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#E04825]"
							>
								Save
							</button>
						</div>
					</div>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
