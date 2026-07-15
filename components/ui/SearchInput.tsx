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
			<div className="relative group w-full flex items-center">
				{/* Left Icon Wrapper: Spans full height and perfectly centers the SVG */}
				<div className="absolute left-3 inset-y-0 flex items-center justify-center pointer-events-none">
					<Search
						size={16}
						className={cn(
							"text-gray-500 group-focus-within:text-orange-500 transition-colors",
							searchIconClassName,
						)}
					/>
				</div>

				<input
					ref={ref}
					value={value}
					{...props}
					className={cn(
						"w-full outline-none transition-all pl-10 pr-10",
						inputClassName,
					)}
				/>

				{/* Right Button Wrapper: Spans full height and perfectly centers the Button */}
				{value && (
					<div className="absolute right-2 inset-y-0 flex items-center justify-center">
						<button
							type="button"
							onClick={onClear}
							className="p-1 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-800 rounded-md transition-colors"
						>
							<X
								size={16}
								className="text-gray-500 hover:text-gray-900 dark:hover:text-white"
							/>
						</button>
					</div>
				)}
			</div>
		);
	},
);

SearchInput.displayName = "SearchInput";
