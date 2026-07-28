/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState, createContext, useContext, useMemo } from "react"; // ✅ Removed useEffect
import { usePathname } from "next/navigation";
import { ChartNoAxesGantt } from "lucide-react";
import Sidebar from "@/components/Sidebar/Sidebar";
import { useBudgetStore } from "@/store/useBudgetStore";
import { VersionProvider } from "@/app/context/VersionContext";
import { UndoToast } from "@/components/ui/UndoToast";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { PAGE_TITLES } from "@/config/pageTitles";
import { MOBILE_BREAKPOINT } from "@/config/breakpoints";
import TransactionDetailsDrawer from "@/components/Transactions/TransactionDetailsDrawer";
import { useTransactionDrawer } from "@/store/useTransactionDrawer";

const SidebarContext = createContext<{ openSidebar: () => void } | null>(null);
export const useSidebar = () => {
	const ctx = useContext(SidebarContext);
	if (!ctx)
		throw new Error("useSidebar must be used within ClientDashboardLayout");
	return ctx;
};

export default function ClientDashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const toast = useBudgetStore((state) => state.toast);
	const setToast = useBudgetStore((state) => state.setToast);
	const undoBulkUpdate = useBudgetStore((state) => state.undoBulkUpdate);

	const isMobile = useMediaQuery(MOBILE_BREAKPOINT);
	const [isDrawerOpen, setIsDrawerOpen] = useState(false);
	const pathname = usePathname();

	const pageTitle = useMemo(() => {
		// Find the most specific matching path (e.g., '/transactions/details' still matches '/transactions')
		const matchingPath = Object.keys(PAGE_TITLES).find((path) =>
			pathname.startsWith(path),
		);
		return matchingPath ? PAGE_TITLES[matchingPath] : "";
	}, [pathname]);

	const selectedTransactionId = useTransactionDrawer(
		(state) => state.selectedTransactionId,
	);
	const closeDrawer = useTransactionDrawer((state) => state.closeDrawer);
	const transactions = useBudgetStore((state) => state.transactions);

	const selectedTransaction = useMemo(() => {
		return transactions.find((tx) => tx.id === selectedTransactionId) ?? null;
	}, [selectedTransactionId, transactions]);

	return (
		<VersionProvider version="pro">
			<SidebarContext.Provider
				value={{ openSidebar: () => setIsDrawerOpen(true) }}
			>
				<div className="flex h-screen overflow-hidden bg-white dark:bg-[#0d0d0d] relative">
					<div className="hidden md:block shrink-0">
						<Sidebar
							onMobileClose={() => setIsDrawerOpen(false)}
							onItemClick={() => setIsDrawerOpen(false)}
						/>
					</div>

					{/* Mobile Drawer */}
					{isMobile && (
						<div
							className={`fixed inset-0 z-[999] flex ${isDrawerOpen ? "visible" : "invisible"}`}
						>
							<div
								className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${isDrawerOpen ? "opacity-100" : "opacity-0"}`}
								onClick={() => setIsDrawerOpen(false)}
							/>
							<div
								className={`relative h-full w-[280px] max-w-[85vw] bg-[#f9f9f9] dark:bg-[#171717] shadow-2xl transform transition-transform duration-300 ease-out ${isDrawerOpen ? "translate-x-0" : "-translate-x-full"}`}
							>
								<Sidebar
									onMobileClose={() => setIsDrawerOpen(false)}
									onItemClick={() => setIsDrawerOpen(false)}
								/>
							</div>
						</div>
					)}

					{/* Main Content Area */}
					<div className="flex-1 flex flex-col min-w-0 overflow-y-auto relative">
						{/* Global Mobile Header */}
						{isMobile && (
							<div className="sticky top-0 z-30 flex h-14 shrink-0 items-center bg-[#f9f9f9] dark:bg-[#171717] border-b border-gray-200 dark:border-white/5 px-3">
								<button
									onClick={() => setIsDrawerOpen(true)}
									className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors mr-3"
								>
									<ChartNoAxesGantt className="h-5 w-5 text-gray-800 dark:text-gray-200" />
								</button>

								<h1 className="text-[20px] font-bold tracking-tight text-gray-900 dark:text-white">
									{pageTitle}
								</h1>

								{pathname.startsWith("/transactions") && (
									<div className="flex h-full gap-3 ml-4 text-[14px] font-medium">
										<button className="border-b-[3px] border-[#FF5A35] pb-2 text-[#FF5A35]">
											All
										</button>
										<button className="pb-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200">
											Receipts
										</button>
									</div>
								)}
							</div>
						)}

						<div className="w-full">{children}</div>
					</div>
				</div>

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
			</SidebarContext.Provider>
			{selectedTransaction && (
				<TransactionDetailsDrawer
					key={selectedTransaction.id}
					transaction={selectedTransaction}
					isOpen={!!selectedTransactionId}
					onClose={closeDrawer}
					onDeleted={(_count) => {
						//! TODO Handle deletion notification if needed
						closeDrawer();
					}}
					onDuplicate={(_transaction) => {
						///! TODO Handle duplication (open new transaction modal, etc.)
						closeDrawer();
					}}
					onCreateRule={(_transaction) => {
						//! TODO Handle rule creation
						closeDrawer();
					}}
				/>
			)}
		</VersionProvider>
	);
}
