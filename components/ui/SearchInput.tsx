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
			if (props.autoFocus && ref && "current" in ref) {
				// Use a requestAnimationFrame or a 0ms timeout to ensure
				// the FloatingPortal has finished its entry animation.
				const timeout = setTimeout(() => ref.current?.focus(), 0);
				return () => clearTimeout(timeout);
			}
		}, [ref, props.autoFocus]);

		return (
			<>
				{/* Structure: Centered Absolute Left */}
				<Search
					size={14}
					className={cn(
						"absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-orange-500 transition-colors pointer-events-none",
						searchIconClassName, // Only pass color/hover/etc. here
					)}
				/>

				<input
					ref={ref}
					value={value}
					{...props}
					className={cn("w-full outline-none transition-all", inputClassName)}
				/>

				{/* Structure: Centered Absolute Right */}
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
			</>
		);
	},
);

SearchInput.displayName = "SearchInput";
