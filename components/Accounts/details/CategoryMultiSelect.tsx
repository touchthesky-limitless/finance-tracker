"use client";

import {
	useMemo,
	useRef,
	useState,
} from "react";
import * as Popover from "@radix-ui/react-popover";
import {
	Check,
	ChevronDown,
	Search,
	Tag,
	X,
} from "lucide-react";

import type {
	AccountCategoryOption,
} from "@/components/Accounts/details/accountDetailsUtils";
import {
	getCategoryTheme,
} from "@/constants";

function CategoryMark({
	option,
}: {
	option: AccountCategoryOption;
}) {
	const iconName = option.iconName?.trim() ?? "";

	if (iconName.startsWith("emoji:")) {
		return (
			<span
				aria-hidden="true"
				className="text-sm leading-none"
			>
				{iconName.slice("emoji:".length)}
			</span>
		);
	}

	const theme = getCategoryTheme(
		option.colorKey?.trim() ||
			option.label,
	);

	return (
		<Tag
			size={15}
			strokeWidth={2.2}
			aria-hidden="true"
			className={theme.text}
		/>
	);
}

interface CategoryMultiSelectProps {
	value: string[];
	options: AccountCategoryOption[];
	onChange: (value: string[]) => void;
}

export function CategoryMultiSelect({
	value,
	options,
	onChange,
}: CategoryMultiSelectProps) {
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const searchInputRef = useRef<HTMLInputElement>(null);

	const optionByValue = useMemo(() => {
		return new Map(
			options.map((option) => {
				return [option.value, option] as const;
			}),
		);
	}, [options]);

	const visibleOptions = useMemo(() => {
		const normalizedQuery = query.trim().toLowerCase();

		if (!normalizedQuery) {
			return options;
		}

		return options.filter((option) => {
			return option.label
				.toLowerCase()
				.includes(normalizedQuery);
		});
	}, [
		options,
		query,
	]);

	const toggleCategory = (categoryName: string): void => {
		onChange(
			value.includes(categoryName)
				? value.filter((selectedName) => {
						return selectedName !== categoryName;
					})
				: [...value, categoryName],
		);
	};

	return (
		<Popover.Root
			open={open}
			onOpenChange={(nextOpen) => {
				setOpen(nextOpen);

				if (!nextOpen) {
					setQuery("");
				}
			}}
			modal={false}
		>
			<div className="relative min-h-14 rounded-xl border border-gray-300 bg-white dark:border-white/15 dark:bg-[#222]">
				<Popover.Trigger asChild>
					<button
						type="button"
						aria-label="Select categories"
						className="absolute inset-0 z-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[#00A8D2]/30"
					/>
				</Popover.Trigger>

				<div className="pointer-events-none relative z-10 flex min-h-14 items-center gap-2 px-3 py-2 pr-20">
					{value.length === 0 ? (
						<span className="text-base text-gray-500 dark:text-gray-400">
							All categories
						</span>
					) : (
						<div className="flex min-w-0 flex-1 flex-wrap gap-2">
							{value.map((categoryName) => {
								const option =
									optionByValue.get(categoryName) ?? {
										value: categoryName,
										label: categoryName,
									};

								return (
									<span
										key={categoryName}
										className="pointer-events-auto flex max-w-full items-center gap-2 rounded-xl bg-gray-100 px-3 py-2 text-sm font-medium text-gray-900 dark:bg-white/7 dark:text-white"
									>
										<CategoryMark option={option} />
										<span className="truncate">
											{option.label}
										</span>
										<button
											type="button"
											aria-label={`Remove ${option.label}`}
											onClick={() => {
												toggleCategory(categoryName);
											}}
											className="shrink-0 rounded-full text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
										>
											<X size={16} />
										</button>
									</span>
								);
							})}
						</div>
					)}
				</div>

				<div className="pointer-events-none absolute right-3 top-1/2 z-10 flex -translate-y-1/2 items-center gap-2">
					{value.length > 0 && (
						<button
							type="button"
							aria-label="Clear categories"
							onClick={() => {
								onChange([]);
							}}
							className="pointer-events-auto rounded-full p-1 text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
						>
							<X size={18} />
						</button>
					)}

					<ChevronDown
						size={18}
						className={`transition-transform ${
							open ? "rotate-180" : ""
						}`}
					/>
				</div>
			</div>

			<Popover.Portal>
				<Popover.Content
					side="bottom"
					align="start"
					sideOffset={8}
					collisionPadding={12}
					onOpenAutoFocus={(event) => {
						event.preventDefault();
						searchInputRef.current?.focus();
					}}
					onCloseAutoFocus={(event) => {
						event.preventDefault();
					}}
					className="z-[9999] w-[var(--radix-popover-trigger-width)] min-w-[360px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl outline-none dark:border-white/10 dark:bg-[#1E1E1E]"
				>
					<label className="flex h-14 items-center gap-3 border-b border-gray-200 px-4 dark:border-white/10">
						<Search
							size={19}
							className="shrink-0 text-gray-400"
						/>
						<input
							ref={searchInputRef}
							value={query}
							onChange={(event) => {
								setQuery(event.target.value);
							}}
							placeholder="Search categories..."
							className="min-w-0 flex-1 bg-transparent text-base text-gray-900 outline-none placeholder:text-gray-400 dark:text-white"
						/>
					</label>

					<div className="max-h-80 overflow-y-auto p-2">
						<button
							type="button"
							onClick={() => {
								onChange([]);
							}}
							className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-base transition-colors hover:bg-gray-100 dark:hover:bg-white/5"
						>
							<span>All categories</span>
							{value.length === 0 && (
								<Check
									size={18}
									strokeWidth={2.5}
									className="text-[#FF5A35]"
								/>
							)}
						</button>

						{visibleOptions.map((option) => {
							const selected = value.includes(option.value);

							return (
								<button
									key={option.value}
									type="button"
									onClick={() => {
										toggleCategory(option.value);
									}}
									className="flex w-full items-center justify-between gap-4 rounded-xl px-3 py-3 text-left transition-colors hover:bg-gray-100 dark:hover:bg-white/5"
								>
									<span className="flex min-w-0 items-center gap-3">
										<CategoryMark option={option} />
										<span className="truncate text-base font-medium text-gray-900 dark:text-white">
											{option.label}
										</span>
									</span>

									{selected && (
										<Check
											size={18}
											strokeWidth={2.5}
											className="shrink-0 text-[#FF5A35]"
										/>
									)}
								</button>
							);
						})}

						{visibleOptions.length === 0 && (
							<div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
								No categories found.
							</div>
						)}
					</div>
				</Popover.Content>
			</Popover.Portal>
		</Popover.Root>
	);
}
