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
					className="flex items-center justify-between w-full px-2 py-1 rounded-lg border border-transparent group-hover:border-gray-300 dark:group-hover:border-white/20 transition-colors bg-transparent cursor-pointer"
				>
					<div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
						{" "}
						{variant === "filter" ? (
							<>
								{/* Compact Icon for Mobile */}
								<Filter size={16} strokeWidth={2.5} />

								{/* Show selected category text on screens larger than mobile */}
								{!isDefaultFilter && (
									<span className="text-[15px] font-normal text-gray-900 dark:text-white">
										{" "}
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
								<span className="text-sm text-gray-900 dark:text-white font-bold ">
									{currentCategory}
								</span>
							</>
						)}
					</div>

					{/* Changed condition to allow Chevron in the table view, keeping rotation logic intact */}
					{variant !== "filter" && (
						<ChevronDown
							className={`w-4 h-4 shrink-0 text-gray-400 transition-all ${
								isOpen
									? "opacity-100 rotate-180"
									: "opacity-0 group-hover:opacity-100"
							}`}
						/>
					)}
				</button>
			</>
		);
	},
);

CategoryTrigger.displayName = "CategoryTrigger";
