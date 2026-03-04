"use client";

import { useMemo, useState } from "react";
import { useBudgetData } from "@/hooks/useBudgetData";
import { useUnifiedCategories } from "@/hooks/useUnifiedCategories";
import { CategoryIcon } from "@/components/CategoryIcon";
import { getCategoryTheme } from "@/constants/categories";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function RecurringCalendar() {
    const { predictedBills } = useBudgetData("all");
    const { allUnifiedCategories } = useUnifiedCategories("Expense", "All");
    
    const [viewDate, setViewDate] = useState(new Date());

    // --- Calendar Math ---
    const calendarData = useMemo(() => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
        const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i);

        return { days, blanks, monthName: viewDate.toLocaleString('default', { month: 'long' }), year };
    }, [viewDate]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Calendar Header */}
            <div className="flex items-center justify-between px-2">
                <h2 className="text-xl font-black uppercase italic tracking-tighter text-white">
                    {calendarData.monthName} <span className="text-gray-600">{calendarData.year}</span>
                </h2>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() - 1)))}
                        className="p-2 hover:bg-white/10 rounded-xl border border-white/5 text-gray-400"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <button 
                        onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() + 1)))}
                        className="p-2 hover:bg-white/10 rounded-xl border border-white/5 text-gray-400"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            {/* The Grid */}
            <div className="grid grid-cols-7 gap-px bg-white/5 border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
                {/* Day Labels */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="bg-[#0d0d0d] py-3 text-center text-[10px] font-black uppercase tracking-widest text-gray-500">
                        {day}
                    </div>
                ))}

                {/* Blank Days */}
                {calendarData.blanks.map(i => (
                    <div key={`blank-${i}`} className="bg-[#080808] min-h-25 md:min-h-30" />
                ))}

                {/* Actual Days */}
                {calendarData.days.map(day => {
                    // Find all bills hitting on this specific day
                    const billsOnDay = predictedBills.filter(b => b.dayOfMonth === day);

                    return (
                        <div key={day} className="bg-[#0d0d0d] min-h-25 md:min-h-30 p-2 border-t border-white/5 relative group hover:bg-white/2 transition-colors">
                            <span className="text-[10px] font-bold text-gray-600 group-hover:text-white transition-colors">
                                {day}
                            </span>
                            
                            <div className="mt-1 space-y-1">
                                {billsOnDay.map(bill => {
                                    const categoryData = allUnifiedCategories.find(
                                        (c) => c.name.toLowerCase() === bill.category.toLowerCase()
                                    );
                                    const theme = categoryData?.theme || getCategoryTheme("Uncategorized");
                                    const iconName = categoryData?.icon || "HelpCircle";

                                    return (
                                        <div 
                                            key={bill.id}
                                            className={`flex items-center gap-1.5 p-1 rounded-md border ${theme.bg} bg-opacity-10 ${theme.border} overflow-hidden`}
                                        >
                                            <CategoryIcon name={iconName} size={10} colorClass={theme.text} />
                                            <span className={`text-[8px] font-black uppercase truncate ${theme.text}`}>
                                                {bill.merchant}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}