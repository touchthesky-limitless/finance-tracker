"use client";

import { useState, memo, useCallback } from "react";
import { Menu, X } from "lucide-react";
import { VersionProvider } from "@/app/context/VersionContext";
import ProSidebar from "@/components/Sidebar/ProSidebar";
import { usePathname } from "next/navigation";
import { useBudgetStore } from "@/store/useBudgetStore";
import { UndoToast } from "@/components/ui/UndoToast";

// 1. ISOLATE THE URL DEPENDENCY
// This tiny component handles the title so the giant Layout doesn't have to re-render.
const MobileHeaderTitle = memo(function MobileHeaderTitle() {
	const pathname = usePathname();

	const PAGE_TITLES: Record<string, string> = {
		"/budget": "Dashboard",
		"/budget/transactions": "Transaction Details",
		"/budget/accounts": "Accounts",
		"/budget/categories": "Categories",
		"/budget/stats": "Statistics & Analysis",
		"/budget/insights": "Insights Explorer",
	};

	const currentTitle = PAGE_TITLES[pathname] || "Budget Tracker";

	return (
		<h1 className="text-white font-semibold text-sm tracking-tight">
			{currentTitle}
		</h1>
	);
});

function ProLayoutShell({ children }: { children: React.ReactNode }) {
	// Look mom, no usePathname!
	const [isMobileOpen, setIsMobileOpen] = useState(false);

	// Zustand selectors remain stable
	const toast = useBudgetStore((state) => state.toast);
	const setToast = useBudgetStore((state) => state.setToast);
	const undoBulkUpdate = useBudgetStore((state) => state.undoBulkUpdate);

	// Stable callback for the sidebar
	const closeMobileSidebar = useCallback(() => setIsMobileOpen(false), []);

	return (
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
						className="fixed inset-0 bg-black/80 backdrop-blur-sm transform-gpu"
						onClick={closeMobileSidebar}
					/>
					{/* Drawer Content */}
					<div className="fixed inset-y-0 left-0 w-64 bg-[#F8F9FB] dark:bg-[#0d0d0d] shadow-2xl border-r border-gray-800 animate-in slide-in-from-left duration-300">
						<div className="flex justify-end p-4">
							<button
								onClick={closeMobileSidebar}
								className="text-gray-400 hover:text-white transition-colors"
							>
								<X size={24} />
							</button>
						</div>
						<ProSidebar onItemClick={closeMobileSidebar} />
					</div>
				</div>
			)}

			<div className="flex-1 flex flex-col min-w-0">
				{/* 3. Mobile Header */}
				<header className="lg:hidden h-16 border-b border-gray-800 flex items-center px-4 justify-between shrink-0 transform-gpu">
					<button
						onClick={() => setIsMobileOpen(true)}
						className="p-2 text-gray-400 hover:text-white transition-colors"
					>
						<Menu size={24} />
					</button>
					{/* The isolated title component */}
					<MobileHeaderTitle />
					<div className="w-10" /> {/* Spacer to keep title centered */}
				</header>

				{/* 4. Main Content Area */}
				<main className="flex-1 overflow-y-auto transform-gpu">{children}</main>
			</div>

			{/* 5. Render Toast */}
			{toast && (
				<UndoToast
					show={!!toast}
					message={`Updated ${toast.count} transactions`}
					onUndo={() => {
						undoBulkUpdate(toast.snapshot);
						setToast(null);
					}}
					onClose={() => setToast(null)}
				/>
			)}
		</div>
	);
}

export default function ProLayout({ children }: { children: React.ReactNode }) {
	return (
		<VersionProvider version="pro">
			<ProLayoutShell>{children}</ProLayoutShell>
		</VersionProvider>
	);
}
