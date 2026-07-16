import { memo } from "react";
import { Search, X, Check, LayoutGrid } from "lucide-react";
import { getCategoryTheme, UnifiedCategory } from "@/constants";
import { CategoryIcon } from "@/components/CategoryIcon";

interface ParentTabProps {
    parent: string;
    isActive: boolean;
    onClick: (parent: string) => void;
}

interface SubCategoryRowProps {
    category: UnifiedCategory;
    parent: string;
    isSelected: boolean;
    onSelect: (sub: string, parent: string) => void;
}

// Optimized Left Pane Item
const ParentTab = memo(({ parent, isActive, onClick }: ParentTabProps) => {
    return (
        <button
            type="button"
            onClick={() => {
                onClick(parent);
            }}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-[11px] mb-1 transition-all ${
                isActive
                    ? "bg-orange-600/10 text-orange-500 font-bold border border-orange-500/20 shadow-sm"
                    : "text-gray-600 dark:text-gray-200 hover:text-gray-900 dark:hover:text-gray-300 border border-transparent"
            }`}
        >
            <CategoryIcon
                name={parent}
                size={16}
                colorClass={getCategoryTheme(parent).text}
            />
            <span className="truncate">{parent}</span>
        </button>
    );
});
ParentTab.displayName = "ParentTab";

// Optimized Right Pane Item
const SubCategoryRow = memo(
    ({ category, parent, isSelected, onSelect }: SubCategoryRowProps) => {
        return (
            <button
                type="button"
                onClick={() => {
                    onSelect(category.name, parent);
                }}
                className="w-full text-left px-4 py-3.5 mb-1 rounded-xl flex items-center justify-between transition-colors group hover:bg-gray-100 dark:hover:bg-white/5"
            >
                <div className="flex items-center gap-3 min-w-0">
                    <CategoryIcon
                        name={category.icon || category.name}
                        size={16}
                        colorClass={getCategoryTheme(parent).text}
                    />
                    <span
                        className={`text-sm truncate ${
                            isSelected ? "text-orange-500 font-bold" : "text-gray-700 dark:text-gray-300 font-medium"
                        }`}
                    >
                        {category.name}
                    </span>
                    {category.isCustom && (
                        <span className="text-[9px] bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400 px-1.5 py-0.5 rounded uppercase font-black shrink-0">
                            Custom
                        </span>
                    )}
                </div>
                {isSelected && <Check size={16} className="text-orange-500 shrink-0 ml-2" />}
            </button>
        );
    },
);
SubCategoryRow.displayName = "SubCategoryRow";

interface CategoryDropdownMenuProps {
    setFloating: (node: HTMLElement | null) => void;
    floatingStyles: React.CSSProperties;
    getFloatingProps: (userProps?: React.HTMLProps<HTMLElement>) => Record<string, unknown>;
    catQuery: string;
    setCatQuery: (query: string) => void;
    inputRef: React.RefObject<HTMLInputElement | null>;
    bestMatch: string | null;
    deferredQuery: string;
    currentCategory: string;
    onSelect: (category: string, parent: string) => void;
    setIsOpen: (isOpen: boolean) => void;
    activeParent: string;
    setSelectedParent: (parent: string) => void;
    visibleParents: string[];
    dynamicHierarchy: Record<string, UnifiedCategory[]>;
}

export function CategoryDropdownMenu({
    setFloating,
    floatingStyles,
    getFloatingProps,
    catQuery,
    setCatQuery,
    inputRef,
    bestMatch,
    deferredQuery,
    currentCategory,
    onSelect,
    setIsOpen,
    activeParent,
    setSelectedParent,
    visibleParents,
    dynamicHierarchy,
}: CategoryDropdownMenuProps) {
    return (
        <div
            ref={setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
            className="z-200 bg-white dark:bg-[#121212] shadow-[0_10px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.5)] rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden flex flex-col"
        >
            <div className="p-4 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-[#0a0a0a]/50">
                <div className="flex items-center gap-3 bg-white dark:bg-[#1a1a1a] px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/20 transition-all shadow-sm">
                    <Search size={16} className="text-gray-400" />
                    <input
                        ref={inputRef}
                        placeholder="Search categories..."
                        className="bg-transparent text-sm text-gray-900 dark:text-white outline-none w-full placeholder:text-gray-400"
                        value={catQuery}
                        onChange={(e) => {
                            setCatQuery(e.target.value);
                        }}
                    />
                    {catQuery && (
                        <button
                            type="button"
                            onClick={() => {
                                setCatQuery("");
                            }}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-gray-900 dark:hover:text-white"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
                {bestMatch && catQuery && (
                    <div className="mt-3 px-2 text-xs text-gray-500 font-medium flex items-center gap-1.5">
                        <span>Best match:</span>
                        <span className="text-orange-500 font-bold bg-orange-50 dark:bg-orange-500/10 px-2 py-0.5 rounded-md">{bestMatch}</span>
                    </div>
                )}
            </div>

            <div
                className={`h-96 flex transition-opacity duration-200 ${
                    catQuery !== deferredQuery ? "opacity-50" : "opacity-100"
                }`}
            >
                <div className="w-2/5 flex flex-col border-r border-gray-100 dark:border-white/5 bg-white dark:bg-[#121212]">
                    <div className="p-3 border-b border-gray-100 dark:border-white/5 shrink-0">
                        <button
                            type="button"
                            onClick={() => {
                                onSelect("All", "All");
                                setIsOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-[11px] transition-all ${
                                currentCategory === "All"
                                    ? "bg-orange-600 text-white font-bold shadow-md shadow-orange-600/20"
                                    : "text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-200 dark:border-white/5"
                            }`}
                        >
                            <LayoutGrid size={16} className={currentCategory === "All" ? "text-white" : "text-gray-400"} />
                            <span className="uppercase tracking-wider">All Categories</span>
                        </button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-3 scrollbar-hide" style={{ scrollbarWidth: "none" }}>
                        {visibleParents.map((parent) => {
                            return (
                                <ParentTab
                                    key={parent}
                                    parent={parent}
                                    isActive={activeParent === parent}
                                    onClick={setSelectedParent}
                                />
                            );
                        })}
                    </div>
                </div>

                <div
                    className="w-3/5 bg-gray-50 dark:bg-[#0a0a0a] overflow-y-auto p-3 scrollbar-hide"
                    style={{ scrollbarWidth: "none" }}
                >
                    {(dynamicHierarchy[activeParent] || [])
                        .filter((cat) => {
                            if (!catQuery) {
                                return true;
                            }
                            return cat.name.toLowerCase().includes(catQuery.toLowerCase());
                        })
                        .map((cat) => {
                            return (
                                <SubCategoryRow
                                    key={cat.id || cat.name}
                                    category={cat}
                                    parent={activeParent}
                                    isSelected={currentCategory === cat.name}
                                    onSelect={(s, p) => {
                                        onSelect(s, p);
                                        setIsOpen(false);
                                        setCatQuery("");
                                    }}
                                />
                            );
                        })}
                </div>
            </div>
        </div>
    );
}