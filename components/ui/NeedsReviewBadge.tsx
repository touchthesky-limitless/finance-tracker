export function NeedsReviewBadge() {
    return (
        <div className="inline-flex items-center gap-1.5 px-2 ml-2 py-0.5 bg-red-500/10 border border-red-500/20 rounded-full animate-pulse w-fit self-center">
            {/* Tiny indicator dot */}
            <div className="w-1 h-1 rounded-full bg-red-500 shrink-0" />
            
            {/* Minimal text */}
            <span className="text-[9px] font-bold text-red-500 uppercase tracking-widest leading-none whitespace-nowrap">
                Needs Review
            </span>
        </div>
    );
}