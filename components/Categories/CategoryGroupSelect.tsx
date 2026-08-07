/**
 * CategoryGroupSelect - Dropdown component for selecting a category group.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search, Check } from "lucide-react";
import type { CategoryEditorGroupOption } from "./types";

interface CategoryGroupSelectProps {
	value: string;
	groups: CategoryEditorGroupOption[];
	disabled: boolean;
	onChange: (value: string) => void;
}

export function CategoryGroupSelect({
	value,
	groups,
	disabled,
	onChange,
}: CategoryGroupSelectProps) {
	const triggerRef = useRef<HTMLButtonElement>(null);
	const menuRef = useRef<HTMLDivElement>(null);
	const [isOpen, setIsOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [menuPosition, setMenuPosition] = useState<{
		top: number;
		left: number;
		width: number;
		maxHeight: number;
	} | null>(null);

	const selected = groups.find((g) => g.name === value);
	const normalizedSearch = searchQuery.trim().toLowerCase();
	const selectable = groups.filter((g) => !g.hidden);
	const filtered = normalizedSearch
		? selectable.filter(
				(g) =>
					g.displayName.toLowerCase().includes(normalizedSearch) ||
					g.name.toLowerCase().includes(normalizedSearch),
			)
		: selectable;

	const calculatePosition = useCallback(() => {
		const el = triggerRef.current;
		if (!el) return null;
		const rect = el.getBoundingClientRect();
		const padding = 16;
		const gap = 10;
		const minH = 220;
		const prefH = 500;
		const spaceBelow = window.innerHeight - rect.bottom - gap - padding;
		const spaceAbove = rect.top - gap - padding;
		const openAbove = spaceBelow < minH && spaceAbove > spaceBelow;
		const availH = Math.max(minH, openAbove ? spaceAbove : spaceBelow);
		const maxH = Math.min(prefH, availH);
		const width = Math.min(rect.width, window.innerWidth - 2 * padding);
		const left = Math.min(
			Math.max(padding, rect.left),
			window.innerWidth - padding - width,
		);
		const top = openAbove
			? Math.max(padding, rect.top - gap - maxH)
			: Math.min(rect.bottom + gap, window.innerHeight - padding - maxH);
		return { top, left, width, maxHeight: maxH };
	}, []);

	const close = useCallback(() => {
		setIsOpen(false);
		setSearchQuery("");
	}, []);

	const open = useCallback(() => {
		const pos = calculatePosition();
		if (!pos) return;
		setMenuPosition(pos);
		setSearchQuery("");
		setIsOpen(true);
	}, [calculatePosition]);

	useEffect(() => {
		if (!isOpen) return;
		const updatePos = () => {
			const pos = calculatePosition();
			if (pos) setMenuPosition(pos);
		};
		const handlePointerDown = (e: PointerEvent) => {
			const target = e.target as Node;
			if (!(target instanceof Node)) return;
			if (
				triggerRef.current?.contains(target) ||
				menuRef.current?.contains(target)
			)
				return;
			close();
		};
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				e.preventDefault();
				e.stopPropagation();
				close();
				triggerRef.current?.focus();
			}
		};
		window.addEventListener("resize", updatePos);
		window.addEventListener("scroll", updatePos, true);
		document.addEventListener("pointerdown", handlePointerDown);
		document.addEventListener("keydown", handleKeyDown, true);
		return () => {
			window.removeEventListener("resize", updatePos);
			window.removeEventListener("scroll", updatePos, true);
			document.removeEventListener("pointerdown", handlePointerDown);
			document.removeEventListener("keydown", handleKeyDown, true);
		};
	}, [calculatePosition, close, isOpen]);

	const select = (val: string) => {
		onChange(val);
		close();
		triggerRef.current?.focus();
	};

	return (
		<div className="relative">
			<button
				ref={triggerRef}
				type="button"
				disabled={disabled}
				aria-haspopup="listbox"
				aria-expanded={isOpen}
				onClick={() => (isOpen ? close() : open())}
				onKeyDown={(e) => {
					if ((e.key === "ArrowDown" || e.key === "Enter") && !isOpen) {
						e.preventDefault();
						open();
					}
				}}
				className={`flex h-13 w-full items-center justify-between rounded-[13px] border bg-white px-4 text-left text-lg outline-none transition sm:h-14 sm:rounded-[15px] sm:px-5 sm:text-xl lg:h-[66px] lg:text-[27px] dark:bg-[#20201f] ${
					isOpen
						? "border-[#008eae] ring-2 ring-[#008eae]/15"
						: "border-[#d8d6d2] dark:border-white/15"
				} ${disabled ? "cursor-not-allowed opacity-70" : ""}`}
			>
				<span className="min-w-0 truncate">
					{selected?.displayName ?? value}
				</span>
				<ChevronDown
					size={27}
					strokeWidth={1.8}
					className={`shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
				/>
			</button>

			{isOpen &&
				!disabled &&
				menuPosition &&
				typeof document !== "undefined" &&
				createPortal(
					<div
						ref={menuRef}
						className="fixed z-[1050] flex overflow-hidden rounded-[20px] border border-[#dfddd9] bg-white shadow-[0_24px_70px_rgba(0,0,0,0.24)] dark:border-white/15 dark:bg-[#2a2a28]"
						style={menuPosition}
					>
						<div className="flex min-h-0 w-full flex-col">
							<div className="shrink-0 border-b border-black/[0.06] p-3 dark:border-white/10">
								<label className="flex h-12 items-center gap-3 rounded-[13px] border border-[#d8d6d2] bg-[#f7f6f4] px-4 focus-within:border-[#008eae] focus-within:ring-2 focus-within:ring-[#008eae]/15 dark:border-white/15 dark:bg-[#20201f]">
									<Search
										size={19}
										className="shrink-0 text-[#777570] dark:text-[#aaa9a4]"
									/>
									<input
										autoFocus
										value={searchQuery}
										onChange={(e) => setSearchQuery(e.target.value)}
										placeholder="Search groups"
										className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-[#8d8b87] dark:text-white"
									/>
								</label>
							</div>
							<div
								role="listbox"
								className="min-h-0 flex-1 overflow-y-auto py-3"
							>
								{filtered.length > 0 ? (
									<>
										<Section
											label="Income"
											groups={filtered.filter((g) => g.sectionId === "income")}
											value={value}
											onChange={select}
										/>
										<Section
											label="Expenses"
											groups={filtered.filter(
												(g) => g.sectionId === "expenses",
											)}
											value={value}
											onChange={select}
										/>
										<Section
											label="Transfers"
											groups={filtered.filter(
												(g) => g.sectionId === "transfers",
											)}
											value={value}
											onChange={select}
										/>
									</>
								) : (
									<div className="px-5 py-10 text-center text-sm text-[#777570] dark:text-[#aaa9a4]">
										No groups match “{searchQuery.trim()}”.
									</div>
								)}
							</div>
						</div>
					</div>,
					document.body,
				)}
		</div>
	);
}

function Section({
	label,
	groups,
	value,
	onChange,
}: {
	label: string;
	groups: CategoryEditorGroupOption[];
	value: string;
	onChange: (val: string) => void;
}) {
	if (groups.length === 0) return null;
	return (
		<div className="px-3">
			<div className="px-5 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-[#777570] dark:text-[#aaa9a4] sm:text-base">
				{label}
			</div>
			{groups.map((g) => {
				const selected = g.name === value;
				return (
					<button
						key={g.key}
						type="button"
						role="option"
						aria-selected={selected}
						onClick={() => onChange(g.name)}
						className={`flex min-h-[54px] w-full items-center justify-between rounded-[14px] px-5 text-left text-base transition sm:min-h-[58px] sm:px-6 sm:text-lg lg:text-[22px] ${
							selected
								? "bg-[#f2f1ef] dark:bg-white/10"
								: "hover:bg-[#f7f6f4] dark:hover:bg-white/5"
						}`}
					>
						<span className="min-w-0 truncate">{g.displayName}</span>
						{selected && (
							<Check size={21} className="shrink-0 text-[#008eae]" />
						)}
					</button>
				);
			})}
		</div>
	);
}
