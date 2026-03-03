"use client";

import Sidebar from "@/components/Sidebar";
import StoreInitializer from "@/components/StoreInitializer";
import GlobalShimmer from "@/components/GlobalShimmer";
import { useBudgetStore } from "@/store/useBudgetStore";
import WelcomeNotification from "@/components/WelcomeNotification";

export default function AppLayout({ children }: { children: React.ReactNode }) {
	const hasHydrated = useBudgetStore((state) => state.hasHydrated);
	const isLoading = useBudgetStore((state) => state.isLoading);
    const transactions = useBudgetStore((state) => state.transactions);

	// Show shimmer ONLY on the very first load
	const showShimmer = !hasHydrated || (isLoading && transactions.length === 0);

	return (
		<div className="flex min-h-screen bg-white dark:bg-[#050505]">
			{/* Keeps your Zustand state synced with the server */}
			<StoreInitializer />

            <WelcomeNotification />
            
			{/* Sidebar is fixed width or responsive drawer */}
			<Sidebar />

			{/* Content area takes remaining width */}
			<div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
				{showShimmer ? (
					<GlobalShimmer />
				) : (
					<main className="pt-16 lg:pt-0">{children}</main>
				)}
			</div>
		</div>
	);
}
