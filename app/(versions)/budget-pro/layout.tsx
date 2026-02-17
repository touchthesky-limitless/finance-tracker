"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { VersionProvider } from "@/app/context/VersionContext";
import ProSidebar from "@/components/Sidebar/ProSidebar";
import { usePathname } from "next/navigation";

// 1. Create a title map
const PAGE_TITLES: Record<string, string> = {
    "/budget-pro": "Overview",
    "/budget-pro/transactions": "Transaction Details",
    "/budget-pro/accounts": "Accounts",
    "/budget-pro/categories": "Categories",
    "/budget-pro/stats": "Statistics & Analysis",
    "/budget-pro/insights": "Insights Explorer",
};

export default function ProLayout({ children }: { children: React.ReactNode }) {
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    const pathname = usePathname();

    // 2. Determine the current title
    const currentTitle = PAGE_TITLES[pathname] || "ezBookkeeping";

    return (
        <VersionProvider version="pro">
            <div className="flex h-screen overflow-hidden bg-[#F8F9FB] dark:bg-[#0d0d0d]">
                
                {/* 1. Desktop Sidebar */}
                <div className="hidden lg:flex shrink-0">
                    <ProSidebar />
                </div>

                {/* 2. Mobile Sidebar Overlay (Drawer) */}
                {isMobileOpen && (
                    <div className="fixed inset-0 z-50 lg:hidden">
                        {/* Background Overlay */}
                        <div 
                            className="fixed inset-0 bg-black/80 backdrop-blur-sm" 
                            onClick={() => setIsMobileOpen(false)} 
                        />
                        {/* Drawer Content */}
                        <div className="fixed inset-y-0 left-0 w-64 bg-[#F8F9FB] dark:bg-[#0d0d0d] shadow-2xl border-r border-gray-800 animate-in slide-in-from-left duration-300">
                            <div className="flex justify-end p-4">
                                <button onClick={() => setIsMobileOpen(false)} className="text-gray-400">
                                    <X size={24} />
                                </button>
                            </div>
                            <ProSidebar onItemClick={() => setIsMobileOpen(false)}/>
                        </div>
                    </div>
                )}

                <div className="flex-1 flex flex-col min-w-0">
                    {/* 3. Mobile Header (Shows the Hamburger) */}
                    <header className="lg:hidden h-16 border-b border-gray-800 flex items-center px-4 justify-between shrink-0">
                        {/* <div className="flex items-center gap-3">
                            <div className="w-6 h-6 bg-orange-200 rounded-sm" />
                            <span className="text-white font-bold text-sm">Pro</span>
                        </div> */}
                        <button 
                            onClick={() => setIsMobileOpen(true)}
                            className="p-2 text-gray-400 hover:text-white"
                        >
                            <Menu size={24} />
                        </button>
                        {/* Title centered or next to hamburger */}
                        <h1 className="text-white font-semibold text-sm tracking-tight">
                            {currentTitle}
                        </h1>
                        <div className="w-10" /> {/* Spacer to keep title centered */}
                    </header>

                    {/* 4. Main Content Area */}
                    <main className="flex-1 overflow-y-auto">
                        {children}
                    </main>
                </div>
            </div>
        </VersionProvider>
    );
}