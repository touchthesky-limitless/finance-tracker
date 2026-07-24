"use client";

import {
	X,
} from "lucide-react";

import { CategoryIcon } from "@/components/CategoryIcon";
import { CategorySelector } from "@/components/CategorySelector";
import {
	findParentCategory,
	getCategoryTheme,
} from "@/constants";

interface MultiCategorySelectorFieldProps {
	values: string[];
	onChange: (values: string[]) => void;
	placeholder?: string;
	clearAllLabel?: string;
	showClearAll?: boolean;
}

function normalizeCategoryName(value: string): string {
	return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function MultiCategorySelectorField({
	values,
	onChange,
	placeholder = "Search categories…",
	clearAllLabel = "Clear all",
	showClearAll = true,
}: MultiCategorySelectorFieldProps) {
	const removeCategory = (categoryName: string): void => {
		const normalizedCategoryName =
			normalizeCategoryName(categoryName);

		onChange(
			values.filter((value) => {
				return (
					normalizeCategoryName(value) !==
					normalizedCategoryName
				);
			}),
		);
	};

	const selectCategory = (categoryName: string): void => {
		const cleanCategoryName = categoryName.trim();

		if (!cleanCategoryName) {
			return;
		}

		const alreadySelected = values.some((value) => {
			return (
				normalizeCategoryName(value) ===
				normalizeCategoryName(cleanCategoryName)
			);
		});

		if (!alreadySelected) {
			onChange([
				...values,
				cleanCategoryName,
			]);
		}
	};

	return (
		<div className="overflow-visible rounded-xl border border-gray-200 bg-white dark:border-white/10 dark:bg-[#1f1f1e]">
			{values.length > 0 && (
				<div className="border-b border-gray-100 p-2 dark:border-white/5">
					<div className="flex items-start justify-between gap-3">
						<div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
							{values.map((value) => {
								const parentCategory =
									findParentCategory(value);

								return (
									<span
										key={value}
										className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-gray-100 px-2 py-1.5 text-xs font-medium text-gray-700 dark:bg-white/10 dark:text-gray-200"
									>
										<CategoryIcon
											name={value}
											size={14}
											colorClass={
												getCategoryTheme(
													parentCategory,
												).text
											}
										/>

										<span className="truncate">
											{value}
										</span>

										<button
											type="button"
											onClick={() => {
												removeCategory(value);
											}}
											className="shrink-0 rounded p-0.5 text-gray-400 transition hover:bg-black/10 hover:text-gray-800 dark:hover:bg-white/10 dark:hover:text-white"
											aria-label={`Remove ${value}`}
										>
											<X size={12} />
										</button>
									</span>
								);
							})}
						</div>

						{showClearAll && (
							<button
								type="button"
								onClick={() => {
									onChange([]);
								}}
								className="shrink-0 rounded-lg px-2 py-1.5 text-xs font-semibold text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white"
							>
								{clearAllLabel}
							</button>
						)}
					</div>
				</div>
			)}

			<CategorySelector
				currentCategory=""
				placeholder={placeholder}
				showChevron
				onSelect={selectCategory}
			/>
		</div>
	);
}
