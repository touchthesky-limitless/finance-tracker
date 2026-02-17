import { useState, useMemo, useRef, useEffect } from "react";
import {
	Combobox,
	ComboboxButton,
	ComboboxOptions,
	ComboboxOption,
} from "@headlessui/react";
import { Search, Plus, Check, ChevronDown } from "lucide-react";
import { createPortal } from "react-dom";
import { DEFAULT_TAGS } from "@/data/categories";
import { useBudgetStore } from "@/hooks/useBudgetStore";
import { useVersion } from "@/app/context/VersionContext";
import { useOutsideClick } from "@/hooks/useOutsideClick";

interface Props {
	currentCategory: string;
	onSelect: (category: string) => void;
	width?: string;
}

export default function CategoryDropdown({ currentCategory, onSelect, width = "w-32" }: Props) {
	const [query, setQuery] = useState("");
	const [isOpen, setIsOpen] = useState(false);
	const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

	// 1. VERSION DETECTION  "free" vs "premium vs pro"
	const version = useVersion();

	// 2. STORE INITIALIZATION (The "Smart Hook" fix)
	const useStore = useBudgetStore();
	const customTags = useStore((state) => state.customTags);
	const addCustomTag = useStore((state) => state.addCustomTag);

	const triggerRef = useRef<HTMLButtonElement>(null);

	// 3. DATA LOGIC
	const allOptions = useMemo(
		() => Array.from(new Set([...DEFAULT_TAGS, ...customTags])),
		[customTags],
	);

	// 4. FILTERING LOGIC
	const filtered =
		query === ""
			? allOptions
			: allOptions.filter((opt) =>
					opt.toLowerCase().includes(query.toLowerCase()),
				);

	/// 5. POSITIONING LOGIC
	const updateCoords = () => {
		if (triggerRef.current) {
			const rect = triggerRef.current.getBoundingClientRect();
			setCoords({
				top: rect.bottom, // Remove window.scrollY
				left: rect.left, // Remove window.scrollX
				width: Math.max(rect.width, 180),
			});
		}
	};

	// 6. CREATION LOGIC
	const handleCreate = () => {
		if (query && (version === "premium" || version === "pro")) {
			addCustomTag(query);
			onSelect(query);
			setQuery("");
			setIsOpen(false);
		}
	};

	// Scroll listener
	useEffect(() => {
		if (!isOpen) return;

		// Recalculate position on scroll or window resize
		const handleScroll = () => updateCoords();

		window.addEventListener("scroll", handleScroll, true);
		window.addEventListener("resize", handleScroll);

		return () => {
			window.removeEventListener("scroll", handleScroll, true);
			window.removeEventListener("resize", handleScroll);
		};
	}, [isOpen]);

	// 7. INTERACTION LOGIC (Click Outside & Escape Key)
	useOutsideClick(
		triggerRef,
		() => setIsOpen(false),
		isOpen,
		"[data-category-dropdown-portal]",
	);

	return (
		<Combobox
			value={currentCategory}
			onChange={(val) => {
				if (val) onSelect(val);
				setIsOpen(false);
			}}
		>
			<div className="relative">
				<ComboboxButton
					ref={triggerRef}
					onClick={() => {
						updateCoords();
						setIsOpen(!isOpen);
					}}
					className={`flex items-center justify-between ${width} bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 hover:border-blue-500 transition-colors`}
				>
					<span className="text-xs font-bold truncate dark:text-gray-100">
						{currentCategory}
					</span>
					<ChevronDown size={14} className="text-gray-400 ml-1" />
				</ComboboxButton>

				{isOpen &&
					createPortal(
						<div
							data-category-dropdown-portal
							style={{
								position: "fixed",
								top: coords.top + 8,
								left: coords.left,
								width: coords.width,
							}}
							onClick={(e) => e.stopPropagation()} // Prevents closing when searching
							className="z-9999 origin-top-left rounded-2xl bg-white dark:bg-gray-900 py-1 shadow-2xl border border-gray-100 dark:border-gray-800 animate-in fade-in zoom-in-95 duration-100"
						>
							<ComboboxOptions
								static
								className="focus:outline-none"
								hold={true}
							>
								<div className="p-3 border-b border-gray-50 dark:border-gray-800">
									<div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 px-2 py-1.5 rounded-lg border border-gray-100 dark:border-gray-700">
										<Search size={14} className="text-gray-400" />
										<input
											autoFocus
											className="w-full text-xs outline-none bg-transparent dark:text-white"
											placeholder="Search or create..."
											value={query}
											onChange={(e) => setQuery(e.target.value)}
											onKeyDown={(e) => e.stopPropagation()}
										/>
									</div>
								</div>

								<div className="max-h-40 overflow-y-auto scrollbar-thin">
									{filtered.map((opt) => (
										<ComboboxOption
											key={opt}
											value={opt}
											className="group relative cursor-pointer select-none py-2.5 pl-10 pr-4 text-xs data-[focus]:bg-blue-50 dark:data-[focus]:bg-blue-900/20 text-gray-900 dark:text-gray-300"
										>
											<span className="block truncate group-data-[selected]:font-bold group-data-[selected]:text-blue-600">
												{opt}
											</span>
											<span className="absolute inset-y-0 left-0 hidden group-data-[selected]:flex items-center pl-3 text-blue-600">
												<Check className="h-4 w-4" />
											</span>
										</ComboboxOption>
									))}
								</div>

								{query.length > 0 && !allOptions.includes(query) && (
									<button
										type="button"
										onClick={handleCreate}
										className="w-full p-3 border-t border-gray-50 dark:border-gray-800 text-left text-xs text-blue-600 font-bold hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center gap-2"
									>
										<Plus size={14} /> Create &ldquo;{query}&rdquo;
									</button>
								)}
							</ComboboxOptions>
						</div>,
						document.body,
					)}
			</div>
		</Combobox>
	);
}
