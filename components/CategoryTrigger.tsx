import { forwardRef, type ButtonHTMLAttributes } from "react";
import { ChevronDown, Filter } from "lucide-react";

import { CategoryIcon } from "@/components/CategoryIcon";

interface CategoryTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: "form" | "filter";
	isOpen: boolean;
	currentCategory: string;
	displayIcon: string;
	displayColorClass: string;
	placeholder?: string;
	showChevron?: boolean;
	hideChevronUntilHover?: boolean;
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
		...buttonProps
	},
	ref,
) {
	const isDefaultCategory =
		!currentCategory ||
		currentCategory === "Filter" ||
		currentCategory === "All Categories" ||
		currentCategory === "Uncategorized";

	const displayText =
		variant === "form" && isDefaultCategory ? placeholder : currentCategory;

	return (
		<button
			ref={ref}
			type="button"
			aria-expanded={isOpen}
			{...buttonProps}
			className={`
				flex w-full cursor-pointer items-center justify-between
				rounded-xl 
				border border-transparent
group-hover:border-gray-300
dark:group-hover:border-white/20
				bg-transparent px-3 py-2.5
				text-left transition-colors
				focus:outline-none focus:ring-2 focus:ring-cyan-500/20
				${className}
			`}
		>
			<div className="flex min-w-0 flex-1 items-center gap-2 pr-2">
				{variant === "filter" ? (
					<>
						<Filter size={16} strokeWidth={2.5} className="shrink-0" />

						{!isDefaultCategory && (
							<span className="truncate text-[15px] font-normal text-gray-900 dark:text-white">
								{currentCategory}
							</span>
						)}
					</>
				) : (
					<>
						{!isDefaultCategory && (
							<div className="shrink-0 rounded-xl border border-gray-100 p-1.5 shadow-sm dark:border-white/5">
								<CategoryIcon
									name={displayIcon}
									size={18}
									colorClass={displayColorClass}
								/>
							</div>
						)}

						<span
							className={`truncate text-sm ${
								isDefaultCategory
									? "font-normal text-gray-400 dark:text-gray-500"
									: "font-bold text-gray-900 dark:text-white"
							}`}
						>
							{displayText}
						</span>
					</>
				)}
			</div>

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
