import { List, LayoutGrid } from "lucide-react";

interface ViewToggleProps {
    viewMode: "list" | "grid";
    setViewMode: (view: "list" | "grid") => void;
    size?: "sm" | "md" | "lg"; // Controls button padding
    iconSize?: number;       // Controls Lucide icon size
}

export default function ViewToggle({ 
    viewMode, 
    setViewMode, 
    size = "md", 
    iconSize = 20 
}: ViewToggleProps) {
    
    // Mapping size prop to Tailwind padding classes
    const padding = {
        sm: "p-1",
        md: "p-2",
        lg: "p-3"
    };

    return (
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-[#0a0a0a] p-1 rounded-xl w-fit border border-gray-200 dark:border-white/5">
            <button
                onClick={() => setViewMode("list")}
                className={`${padding[size]} rounded-lg transition-all ${
                    viewMode === "list"
                        ? "bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white shadow-xs"
                        : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                }`}
            >
                <List size={iconSize} />
            </button>
            <button
                onClick={() => setViewMode("grid")}
                className={`${padding[size]} rounded-lg transition-all ${
                    viewMode === "grid"
                        ? "bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white shadow-xs"
                        : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                }`}
            >
                <LayoutGrid size={iconSize} />
            </button>
        </div>
    );
}