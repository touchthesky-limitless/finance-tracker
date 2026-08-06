/**
 * Searchable dropdown to select a category group.
 * Used in the delete confirmation dialog to choose where to move nested categories.
 */

import {
	useCallback,
	useEffect,
	useRef,
	useState,
	type ChangeEvent,
	type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search } from "lucide-react";
import type { CategoryGroupRecord } from "@/lib/categories/categoryGroups";
import { normalize } from "@/components/CategoryGroups/utils/categoryGroupUtils";

interface CategoryGroupSelectProps {
	value: string;
	groups: CategoryGroupRecord[];
	disabled: boolean;
	onChange: (value: string) => void;
}

export function CategoryGroupSelect({
	value,
	groups,
	disabled,
	onChange,
}: CategoryGroupSelectProps) {
	const triggerRef = useRef<HTMLButtonElement | null>(null);
	const menuRef = useRef<HTMLDivElement | null>(null);
	const [isOpen, setIsOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [menuPosition, setMenuPosition] = useState<{
		top: number;
		left: number;
		width: number;
		maxHeight: number;
	} | null>(null);

	const selectedGroup = groups.find((g) => g.id === value);
	const normalizedSearch = normalize(searchQuery);
	const filteredGroups = normalizedSearch
		? groups.filter(
				(g) =>
					normalize(g.name).includes(normalizedSearch) ||
					normalize(g.source_name).includes(normalizedSearch),
			)
		: groups;

	const incomeGroups = filteredGroups.filter((g) => g.section_id === "income");
	const expenseGroups = filteredGroups.filter(
		(g) => g.section_id === "expenses",
	);
	const transferGroups = filteredGroups.filter(
		(g) => g.section_id === "transfers",
	);

	const calculateMenuPosition = useCallback(() => {
		const trigger = triggerRef.current;
		if (!trigger || typeof window === "undefined") return null;
		const bounds = trigger.getBoundingClientRect();
		const viewportPadding = 16;
		const gap = 10;
		const minimumHeight = 220;
		const preferredHeight = 500;
		const spaceBelow =
			window.innerHeight - bounds.bottom - gap - viewportPadding;
		const spaceAbove = bounds.top - gap - viewportPadding;
		const openAbove = spaceBelow < minimumHeight && spaceAbove > spaceBelow;
		const availableHeight = Math.max(
			minimumHeight,
			openAbove ? spaceAbove : spaceBelow,
		);
		const maxHeight = Math.min(preferredHeight, availableHeight);
		const width = Math.min(
			bounds.width,
			window.innerWidth - viewportPadding * 2,
		);
		const left = Math.min(
			Math.max(viewportPadding, bounds.left),
			window.innerWidth - viewportPadding - width,
		);
		const top = openAbove
			? Math.max(viewportPadding, bounds.top - gap - maxHeight)
			: Math.min(
					bounds.bottom + gap,
					window.innerHeight - viewportPadding - maxHeight,
				);
		return { top, left, width, maxHeight };
	}, []);

	const closeMenu = useCallback(() => {
		setIsOpen(false);
		setSearchQuery("");
	}, []);

	const openMenu = useCallback(() => {
		const nextPosition = calculateMenuPosition();
		if (!nextPosition) return;
		setMenuPosition(nextPosition);
		setSearchQuery("");
		setIsOpen(true);
	}, [calculateMenuPosition]);

	useEffect(() => {
		if (!isOpen) return;
		const updatePosition = () => {
			const nextPosition = calculateMenuPosition();
			if (nextPosition) setMenuPosition(nextPosition);
		};
		const handlePointerDown = (event: PointerEvent) => {
			const target = event.target;
			if (!(target instanceof Node)) return;
			if (
				triggerRef.current?.contains(target) ||
				menuRef.current?.contains(target)
			)
				return;
			closeMenu();
		};
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				event.preventDefault();
				event.stopPropagation();
				closeMenu();
				triggerRef.current?.focus();
			}
		};
		window.addEventListener("resize", updatePosition);
		window.addEventListener("scroll", updatePosition, true);
		document.addEventListener("pointerdown", handlePointerDown);
		document.addEventListener("keydown", handleKeyDown, true);
		return () => {
			window.removeEventListener("resize", updatePosition);
			window.removeEventListener("scroll", updatePosition, true);
			document.removeEventListener("pointerdown", handlePointerDown);
			document.removeEventListener("keydown", handleKeyDown, true);
		};
	}, [calculateMenuPosition, closeMenu, isOpen]);

	const selectGroup = (nextValue: string) => {
		onChange(nextValue);
		closeMenu();
		triggerRef.current?.focus();
	};

	return (
		<div className="relative">
			<button
				ref={triggerRef}
				type="button"
				disabled={disabled || groups.length === 0}
				aria-haspopup="listbox"
				aria-expanded={isOpen}
				onClick={() => (isOpen ? closeMenu() : openMenu())}
				onKeyDown={(event: ReactKeyboardEvent<HTMLButtonElement>) => {
					if ((event.key === "ArrowDown" || event.key === "Enter") && !isOpen) {
						event.preventDefault();
						openMenu();
					}
				}}
				className={`flex h-14 w-full items-center justify-between rounded-xl border bg-transparent px-4 text-left text-base font-medium outline-none transition dark:bg-[#232322] ${
					isOpen
						? "border-cyan-500 ring-2 ring-cyan-500/15"
						: "border-gray-300 dark:border-white/15"
				} ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
			>
				<span
					className={`min-w-0 truncate ${selectedGroup ? "" : "text-gray-500 dark:text-gray-400"}`}
				>
					{selectedGroup?.name ?? "Select..."}
				</span>
				<ChevronDown
					size={19}
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
						className="fixed z-[1900] flex overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_24px_70px_rgba(0,0,0,0.34)] dark:border-white/15 dark:bg-[#2a2a28]"
						style={{
							top: menuPosition.top,
							left: menuPosition.left,
							width: menuPosition.width,
							maxHeight: menuPosition.maxHeight,
						}}
					>
						<div className="flex min-h-0 w-full flex-col">
							<div className="shrink-0 border-b border-gray-200 p-3 dark:border-white/10">
								<label className="flex h-11 items-center gap-3 rounded-xl border border-gray-300 bg-gray-50 px-3 focus-within:border-cyan-500 focus-within:ring-2 focus-within:ring-cyan-500/15 dark:border-white/15 dark:bg-[#20201f]">
									<Search
										size={18}
										className="shrink-0 text-gray-500 dark:text-gray-400"
									/>
									<input
										autoFocus
										value={searchQuery}
										onChange={(e: ChangeEvent<HTMLInputElement>) =>
											setSearchQuery(e.target.value)
										}
										placeholder="Search groups"
										className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-gray-500 dark:text-white"
									/>
								</label>
							</div>

							<div
								role="listbox"
								className="min-h-0 flex-1 overflow-y-auto py-2"
							>
								{filteredGroups.length > 0 ? (
									<>
										<CategoryGroupOptionSection
											label="Income"
											groups={incomeGroups}
											value={value}
											onChange={selectGroup}
										/>
										<CategoryGroupOptionSection
											label="Expenses"
											groups={expenseGroups}
											value={value}
											onChange={selectGroup}
										/>
										<CategoryGroupOptionSection
											label="Transfers"
											groups={transferGroups}
											value={value}
											onChange={selectGroup}
										/>
									</>
								) : (
									<div className="px-5 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
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

interface CategoryGroupOptionSectionProps {
	label: string;
	groups: CategoryGroupRecord[];
	value: string;
	onChange: (value: string) => void;
}

export function CategoryGroupOptionSection({
	label,
	groups,
	value,
	onChange,
}: CategoryGroupOptionSectionProps) {
	if (groups.length === 0) return null;
	return (
		<div className="px-2">
			<div className="px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] text-gray-500 dark:text-gray-400">
				{label}
			</div>
			{groups.map((group) => {
				const selected = group.id === value;
				return (
					<button
						key={group.id}
						type="button"
						role="option"
						aria-selected={selected}
						onClick={() => onChange(group.id)}
						className={`flex min-h-12 w-full items-center justify-between rounded-xl px-4 text-left text-sm font-semibold transition ${
							selected
								? "bg-cyan-50 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300"
								: "hover:bg-gray-50 dark:hover:bg-white/5"
						}`}
					>
						<span className="min-w-0 truncate">{group.name}</span>
						{selected && <Check size={18} className="shrink-0" />}
					</button>
				);
			})}
		</div>
	);
}
