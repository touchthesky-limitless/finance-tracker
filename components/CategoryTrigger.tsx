import { forwardRef, type ButtonHTMLAttributes } from "react";
import { ChevronDown, Filter } from "lucide-react";

import { CategoryGlyph } from "@/components/Categories/CategoryGlyph";

// --- Standalone visual component ---
interface CategoryChipProps {
	variant?: "form" | "filter";
	isDefault: boolean;
	icon: string;
	colorClass: string;
	label: string;
	iconOnly?: boolean;
}

export const CategoryChip = ({
	variant = "form",
	isDefault,
	icon,
	colorClass,
	label,
	iconOnly = false,
}: CategoryChipProps) => {
	if (variant === "filter") {
		return (
			<div className="flex min-w-0 flex-1 items-center gap-2 pr-2">
				<Filter size={16} strokeWidth={2.5} className="shrink-0" />
				{!iconOnly && !isDefault && (
					<span className="truncate text-[15px] font-normal text-gray-900 dark:text-white">
						{label}
					</span>
				)}
			</div>
		);
	}

	return (
		<div
			className={`flex min-w-0 flex-1 items-center ${iconOnly ? "justify-center" : "gap-2 pr-2"}`}
		>
			{!isDefault && (
				<div
					className={`shrink-0 rounded-xl transition-colors ${!iconOnly ? "border border-gray-100 p-1.5 shadow-sm dark:border-white/5" : "p-0"}`}
				>
					<CategoryGlyph name={icon} size={16} colorClass={colorClass} />
				</div>
			)}

			{!iconOnly && (
				<span
					title={label}
					className={`truncate text-sm text-[15px] ${
						isDefault
							? " text-gray-400 dark:text-gray-500"
							: " text-gray-900 dark:text-white"
					}`}
				>
					{label}
				</span>
			)}
		</div>
	);
};

// --- Trigger button ---
interface CategoryTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: "form" | "filter";
	isOpen: boolean;
	currentCategory: string;
	displayIcon: string;
	displayColorClass: string;
	placeholder?: string;
	showChevron?: boolean;
	hideChevronUntilHover?: boolean;
	iconOnly?: boolean;
}

export const CategoryTrigger = forwardRef<
	HTMLButtonElement,
	CategoryTriggerProps
>(function CategoryTrigger(
	{
		variant = "form",
		isOpen,
		currentCategory,
		displayIcon,
		displayColorClass,
		placeholder = "Search categories...",
		className = "",
		showChevron = false,
		hideChevronUntilHover = false,
		iconOnly = false,
		...buttonProps
	},
	ref,
) {
	const isDefaultCategory =
		!currentCategory ||
		currentCategory === "Filter" ||
		currentCategory === "All Categories" ||
		currentCategory === "Uncategorized";

	const label =
		variant === "form" && isDefaultCategory ? placeholder : currentCategory;

	return (
		<button
			ref={ref}
			type="button"
			aria-label={label}
			title={label}
			aria-expanded={isOpen}
			{...buttonProps}
			className={`
        flex cursor-pointer items-center rounded-xl border border-transparent transition-colors outline-none ring-0 focus-visible:ring-0
        {/* ✅ Removed horizontal padding (px-3) and used 'justify-center' + 'w-full h-full' on mobile so it fills the cell perfectly without extra spacing */}
        ${iconOnly ? "w-full h-full justify-center p-0" : "w-full justify-between px-3 py-2.5 text-left group-hover:border-gray-300 dark:group-hover:border-white/20"}
        ${className}
      `}
		>
			<CategoryChip
				variant={variant}
				isDefault={isDefaultCategory}
				icon={displayIcon}
				colorClass={displayColorClass}
				label={label}
				iconOnly={iconOnly}
			/>

			{showChevron && (
				<ChevronDown
					className={`h-4 w-4 shrink-0 text-gray-400 transition-all duration-200 ${
						isOpen
							? "rotate-180 opacity-100"
							: hideChevronUntilHover
								? "opacity-0 group-hover:opacity-100"
								: "opacity-100"
					}`}
				/>
			)}
		</button>
	);
});

CategoryTrigger.displayName = "CategoryTrigger";
