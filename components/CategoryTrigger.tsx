import { forwardRef } from "react";
import { ChevronDown, Filter } from "lucide-react";
import { CategoryIcon } from "@/components/CategoryIcon";

interface CategoryTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: "form" | "filter";
	isOpen: boolean;
	currentCategory: string;
	displayIcon: string;
	displayColorClass: string;
}

export const CategoryTrigger = forwardRef<
	HTMLButtonElement,
	CategoryTriggerProps
>(
	(
		{
			variant,
			isOpen,
			currentCategory,
			displayIcon,
			displayColorClass,
			onClick,
			...props
		},
		ref,
	) => {
		// Determine if the filter is in its default, unselected state
		const isDefaultFilter =
			currentCategory === "Filter" ||
			currentCategory === "All Categories" ||
			!currentCategory;

		return (
			<>
				{variant === "form" && (
					<label className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-black mb-1.5 block pl-1">
						Category
					</label>
				)}

				<button
					ref={ref}
					type="button"
					onClick={onClick}
					{...props}
					className={
						variant === "filter"
							? `flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-colors px-3 py-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 ${
									!isDefaultFilter
										? "text-orange-500"
										: "text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
								}`
							: `w-full p-4 bg-[#F8F9FB] dark:bg-[#0d0d0d] border border-gray-200 dark:border-white/5 rounded-2xl flex items-center justify-between transition-all hover:border-gray-300 dark:hover:border-white/10 shadow-sm`
					}
				>
					<div className="flex items-center gap-2">
						{variant === "filter" ? (
							<>
								{/* Compact Icon for Mobile */}
								<Filter size={16} strokeWidth={2.5} />

								{/* Show selected category text on screens larger than mobile */}
								{!isDefaultFilter && (
									<span className="hidden sm:inline-block max-w-25 truncate">
										{currentCategory}
									</span>
								)}
							</>
						) : (
							<>
								<div className="p-1.5 bg-white dark:bg-[#1a1a1a] rounded-xl shadow-sm border border-gray-100 dark:border-white/5">
									<CategoryIcon
										name={displayIcon}
										size={18}
										colorClass={displayColorClass}
									/>
								</div>
								<span className="text-sm text-gray-900 dark:text-white font-bold">
									{currentCategory}
								</span>
							</>
						)}
					</div>

					{/* Only show the dropdown Chevron on the larger form variant */}
					{variant === "form" && (
						<ChevronDown
							size={20}
							className={`transition-transform duration-300 shrink-0 ${
								isOpen ? "rotate-180 text-orange-500" : "text-gray-400"
							}`}
						/>
					)}
				</button>
			</>
		);
	},
);

CategoryTrigger.displayName = "CategoryTrigger";
