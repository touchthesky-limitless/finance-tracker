"use client";

import { ElementType } from "react";
import { 
    Sparkles, 
    ArrowRight, 
    AlertCircle, 
    Coffee, 
    ShoppingBag, 
    CheckCircle2,
} from "lucide-react";

export default function PulseOverviewPage() {
    return (
        // Organic, soft gradient background instead of flat gray
        <div className="min-h-screen bg-linear-to-br from-orange-50/50 via-[#F8F9FB] to-blue-50/50 dark:from-[#1a1412] dark:via-[#0a0a0a] dark:to-[#0d121a] text-slate-800 dark:text-slate-200 p-4 md:p-8 font-sans selection:bg-orange-500/30">
            
            <div className="max-w-5xl mx-auto space-y-10">
                
                {/* --- 1. THE BRIEFING (Conversational Insight) --- */}
                <header className="pt-8 pb-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-100 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 text-xs font-bold uppercase tracking-wider mb-6">
                        <Sparkles size={14} />
                        <span>Daily Briefing</span>
                    </div>
                    
                    <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white tracking-tight leading-tight max-w-2xl mb-4">
                        Good afternoon. You are pacing beautifully this month.
                    </h1>
                    
                    <p className="text-lg md:text-xl text-gray-500 dark:text-gray-400 max-w-2xl leading-relaxed">
                        Your auto insurance hits tomorrow, but you still have a comfortable <strong className="text-gray-900 dark:text-white font-bold">$425.50</strong> safe to spend before Friday's paycheck.
                    </p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    
                    {/* --- 2. THE HERO METRIC & RUNWAY (Left Column) --- */}
                    <div className="lg:col-span-7 space-y-8">
                        
                        {/* Safe to Spend Card */}
                        <div className="relative overflow-hidden bg-white dark:bg-[#121212] rounded-4xl p-8 md:p-10 shadow-sm border border-gray-100 dark:border-gray-800/60">
                            {/* Decorative blur in background */}
                            <div className="absolute -right-20 -top-20 w-64 h-64 bg-orange-400/10 dark:bg-orange-500/5 blur-3xl rounded-full pointer-events-none"></div>
                            
                            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">Safe to spend</p>
                            <h2 className="text-6xl md:text-7xl font-black text-gray-900 dark:text-white tracking-tighter mb-6">
                                $425<span className="text-3xl md:text-4xl text-gray-400 dark:text-gray-600">.50</span>
                            </h2>
                            
                            {/* Progress Bar (Time vs Budget) */}
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs font-medium text-gray-500">
                                    <span>24 days into June</span>
                                    <span>$1,420 remaining budget</span>
                                </div>
                                <div className="h-3 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                    {/* Time indicator (gray) */}
                                    <div className="h-full bg-gray-300 dark:bg-gray-600 rounded-full absolute" style={{ width: '80%' }}></div>
                                    {/* Spend indicator (orange) - if orange is ahead of gray, you're overspending */}
                                    <div className="h-full bg-orange-500 rounded-full relative z-10" style={{ width: '65%' }}></div>
                                </div>
                            </div>
                        </div>

                        {/* The Runway (14-Day Timeline) */}
                        <div className="bg-transparent">
                            <div className="flex items-center justify-between mb-4 px-2">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">The Runway</h3>
                                <button className="text-sm font-semibold text-orange-500 hover:text-orange-600 flex items-center gap-1">
                                    Full Calendar <ArrowRight size={16} />
                                </button>
                            </div>
                            
                            {/* Horizontal Scroll Container */}
                            <div className="flex gap-4 overflow-x-auto pb-6 pt-2 px-2 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
                                <RunwayDay day="Today" date="28" state="clear" />
                                <RunwayDay day="Wed" date="29" state="bill" amount="$120" name="Geico" />
                                <RunwayDay day="Thu" date="30" state="clear" />
                                <RunwayDay day="Fri" date="01" state="income" amount="+$2,400" name="Paycheck" />
                                <RunwayDay day="Sat" date="02" state="clear" />
                                <RunwayDay day="Sun" date="03" state="clear" />
                                <RunwayDay day="Mon" date="04" state="bill" amount="$45" name="Internet" />
                            </div>
                        </div>

                    </div>

                    {/* --- 3. THE INBOX & ACTIONS (Right Column) --- */}
                    <div className="lg:col-span-5 space-y-6">
                        
                        {/* Action Required "Inbox" */}
                        <div className="bg-white dark:bg-[#121212] rounded-4xl p-6 border border-gray-100 dark:border-gray-800/60 shadow-sm">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 px-2 flex items-center justify-between">
                                Action Items
                                <span className="bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400 text-xs px-2 py-1 rounded-full">2 Pending</span>
                            </h3>

                            <div className="space-y-3">
                                {/* Warning Card */}
                                <div className="group flex items-start gap-4 p-4 rounded-2xl hover:bg-orange-50 dark:hover:bg-orange-500/5 border border-transparent hover:border-orange-100 dark:hover:border-orange-500/20 transition-colors cursor-pointer">
                                    <div className="p-2 bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400 rounded-xl mt-1">
                                        <AlertCircle size={18} />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Coffee budget exceeded</h4>
                                        <p className="text-xs text-gray-500 leading-relaxed">You hit your $50 limit for the month. Would you like to pull $15 from "Dining Out" to cover the overage?</p>
                                        <div className="flex gap-2 mt-3">
                                            <button className="text-xs font-bold px-3 py-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg">Rebalance</button>
                                            <button className="text-xs font-bold px-3 py-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">Ignore</button>
                                        </div>
                                    </div>
                                </div>

                                {/* Review Card */}
                                <div className="group flex items-start gap-4 p-4 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800/50 border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-colors cursor-pointer">
                                    <div className="p-2 bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 rounded-xl mt-1">
                                        <CheckCircle2 size={18} />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1">3 unreviewed transactions</h4>
                                        <p className="text-xs text-gray-500 leading-relaxed">We categorized your recent purchases. Take a quick look to confirm they are correct.</p>
                                        <button className="text-xs font-bold mt-3 text-orange-500 hover:text-orange-600 flex items-center gap-1">
                                            Review Now <ArrowRight size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Focused Envelopes (Mini progress bars for volatile categories) */}
                        <div className="bg-white dark:bg-[#121212] rounded-4xl p-6 border border-gray-100 dark:border-gray-800/60 shadow-sm">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 px-2">Watchlist</h3>
                            <div className="space-y-5 px-2">
                                <WatchlistCategory icon={ShoppingBag} name="Groceries" spent={420} limit={500} color="bg-teal-500" />
                                <WatchlistCategory icon={Coffee} name="Dining Out" spent={280} limit={300} color="bg-orange-500" />
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}

// ==========================================
// SUB-COMPONENTS
// ==========================================
interface RunwayDayProps {
    day: string;
    date: string;
    state: string;
    amount?: string;
    name?: string;
}

function RunwayDay({ day, date, state, amount }: RunwayDayProps) {
    const isToday = day === "Today";
    
    // Determine styles based on state
    let bgStyle = "bg-white dark:bg-[#121212] border-gray-100 dark:border-gray-800";
    let textStyle = "text-gray-900 dark:text-white";
    let indicator = null;

    if (state === "bill") {
        indicator = <div className="w-2 h-2 rounded-full bg-red-500 mb-2 mt-auto"></div>;
        bgStyle = "bg-white dark:bg-[#121212] border-red-100 dark:border-red-900/30";
    } else if (state === "income") {
        indicator = <div className="w-2 h-2 rounded-full bg-green-500 mb-2 mt-auto"></div>;
        bgStyle = "bg-green-50 dark:bg-green-500/10 border-green-100 dark:border-green-500/20";
        textStyle = "text-green-700 dark:text-green-400";
    } else {
        indicator = <div className="w-1.5 h-1.5 rounded-full bg-gray-200 dark:bg-gray-800 mb-2 mt-auto"></div>;
    }

    if (isToday) {
        bgStyle = "bg-gray-900 dark:bg-white border-gray-900 dark:border-white shadow-md";
        textStyle = "text-white dark:text-gray-900";
    }

    return (
        <div className={`flex flex-col items-center shrink-0 w-20 h-28 rounded-2xl border ${bgStyle} p-3 transition-transform hover:-translate-y-1 cursor-pointer`}>
            <span className={`text-[10px] font-bold uppercase tracking-wider opacity-70 ${textStyle}`}>{day}</span>
            <span className={`text-2xl font-black mt-1 ${textStyle}`}>{date}</span>
            
            {/* The dot */}
            {indicator}

            {/* Hover tooltip essentially built-in for the bill/income amounts */}
            {amount && (
                <span className={`text-[9px] font-bold truncate w-full text-center ${state === 'bill' ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`}>
                    {amount}
                </span>
            )}
        </div>
    );
}

interface WatchlistCategoryProps {
    icon: ElementType;
    name: string;
    spent: number;
    limit: number;
    color: string;
}

function WatchlistCategory({ icon: Icon, name, spent, limit, color }: WatchlistCategoryProps) {
    const percentage = Math.min((spent / limit) * 100, 100);
    const isWarning = percentage > 85;

    return (
        <div>
            <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                    <Icon size={14} className="text-gray-400" />
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{name}</span>
                </div>
                <div className="text-sm">
                    <span className="font-bold text-gray-900 dark:text-white">${spent}</span>
                    <span className="text-gray-400"> / ${limit}</span>
                </div>
            </div>
            <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div 
                    className={`h-full rounded-full transition-all duration-1000 ${isWarning ? 'bg-red-500' : color}`} 
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>
        </div>
    );
}