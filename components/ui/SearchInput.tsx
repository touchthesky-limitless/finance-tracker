import React, { forwardRef, useEffect } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
	value: string;
	onClear: () => void;
	// Specific class overrides for the sub-elements
	searchIconClassName?: string;
	inputClassName?: string;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
	({ value, onClear, searchIconClassName, inputClassName, ...props }, ref) => {
		useEffect(() => {
			// This is safe because it's inside an effect, not render
			if (props.autoFocus && ref && typeof ref !== "function") {
				ref.current?.focus();
			}
		}, [ref, props.autoFocus]);

		return (
			<div className="relative group">
				{" "}
				{/* Added group for the icon focus effect */}
				<Search
					size={14}
					className={cn(
						"absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-orange-500 transition-colors pointer-events-none",
						searchIconClassName,
					)}
				/>
				<input
					ref={ref}
					value={value}
					{...props}
					className={cn(
						"w-full outline-none transition-all pl-9 pr-8", // Added padding to prevent text overlap
						inputClassName,
					)}
				/>
				{value && (
					<button
						type="button"
						onClick={onClear}
						className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-md transition-colors"
					>
						<X
							size={14}
							className="text-gray-500 hover:text-gray-900 dark:hover:text-white"
						/>
					</button>
				)}
			</div>
		);
	},
);

SearchInput.displayName = "SearchInput";
