"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
    Zap,
    LayoutDashboard,
    ReceiptText,
    BarChart3,
    Calculator,
    Menu,
    X,
} from "lucide-react";
import { LogoutButton } from "@/components/LogoutButton";
import ThemeToggle from "@/components/ThemeToggle";

export default function Sidebar() {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();

    const isActive = (path: string) => pathname === path;

    const links = [
        { name: "Overview", href: "/overview", icon: <LayoutDashboard size={18} /> },
        { name: "Budget Tracking", href: "/budget", icon: <ReceiptText size={18} /> },
        { name: "Market Pulse", href: "/stocks", icon: <BarChart3 size={18} /> },
        { name: "Calculator", href: "/calculator", icon: <Calculator size={18} /> },
    ];

    return (
        <>
            {/* MOBILE HEADER: Sticky at the top, z-index lower than the sidebar drawer */}
            <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-[#050505]/80 backdrop-blur-md border-b border-white/5 px-6 flex justify-between items-center z-40">
                <div className="flex items-center gap-2 font-black text-white tracking-tighter">
                    <Zap className="text-orange-600 fill-orange-600" size={20} />
                    Budget Pro
                </div>
                <button
                    onClick={() => setIsOpen(true)}
                    className="p-2 text-gray-400 hover:text-white transition-colors"
                >
                    <Menu size={24} />
                </button>
            </header>

            {/* OVERLAY: Higher z-index than mobile header, lower than sidebar */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 lg:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* SIDEBAR DRAWER: Highest z-index */}
            <aside
                className={`
                    fixed inset-y-0 left-0 z-60 w-72 bg-[#050505] border-r border-white/5 
                    flex flex-col transform transition-transform duration-200 ease-out
                    lg:translate-x-0 lg:static lg:w-64 lg:z-auto
                    ${isOpen ? "translate-x-0" : "-translate-x-full"}
                `}
            >
                {/* Logo Area: Desktop (lg+) and Mobile Drawer Header */}
                <div className="p-8 flex items-center justify-between lg:block">
                    <div className="flex items-center gap-2 font-black text-xl tracking-tighter text-white">
                        <Zap className="text-orange-600 fill-orange-600" size={24} />
                        Budget Pro
                    </div>
                    {/* Close button inside the drawer for Mobile */}
                    <button 
                        className="lg:hidden text-gray-400 hover:text-white"
                        onClick={() => setIsOpen(false)}
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-4 space-y-2">
                    {links.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            prefetch={true}
                            onClick={() => setIsOpen(false)}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                                isActive(link.href)
                                    ? "bg-orange-600 text-white shadow-lg shadow-orange-600/20"
                                    : "text-gray-500 hover:text-white hover:bg-white/5"
                            }`}
                        >
                            {link.icon}
                            {link.name}
                        </Link>
                    ))}
                </nav>

                {/* Bottom Actions */}
                <div className="p-6 border-t border-white/5 space-y-6">
                    <div className="px-2">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-gray-600 font-black mb-4">
                            Appearance
                        </p>
                        <ThemeToggle />
                    </div>
                    <LogoutButton />
                </div>
            </aside>
        </>
    );
}