import { forwardRef } from "react";
import { ChevronDown } from "lucide-react";
import { CategoryIcon } from "@/components/CategoryIcon";

interface CategoryTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "form" | "filter";
    isOpen: boolean;
    currentCategory: string;
    displayIcon: string;
    displayColorClass: string;
}

export const CategoryTrigger = forwardRef<HTMLButtonElement, CategoryTriggerProps>(
    (
        { variant, isOpen, currentCategory, displayIcon, displayColorClass, onClick, ...props },
        ref
    ) => {
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
                    {...props} // Spreads all Floating UI interaction props
                    className={
                        variant === "filter"
                            ? "flex items-center gap-1.5 text-xs font-black text-gray-400 uppercase tracking-widest hover:text-orange-500 transition-colors px-2 py-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
                            : `w-full p-4 bg-[#F8F9FB] dark:bg-[#0d0d0d] border border-gray-200 dark:border-white/5 rounded-2xl flex items-center justify-between transition-all hover:border-gray-300 dark:hover:border-white/10 shadow-sm`
                    }
                >
                    <div className="flex items-center gap-3">
                        {variant === "filter" ? (
                            <span>{currentCategory || "Category"}</span>
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
                    <ChevronDown
                        size={variant === "filter" ? 14 : 20}
                        className={`transition-transform duration-300 shrink-0 ${
                            isOpen ? "rotate-180 text-orange-500" : "text-gray-400"
                        }`}
                    />
                </button>
            </>
        );
    }
);

CategoryTrigger.displayName = "CategoryTrigger";