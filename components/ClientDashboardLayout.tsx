"use client";

import Sidebar from "@/components/Sidebar";
import StoreInitializer from "@/components/StoreInitializer";
import GlobalShimmer from "@/components/GlobalShimmer";
import { useBudgetStore } from "@/store/useBudgetStore";
import WelcomeNotification from "@/components/WelcomeNotification";
import { featureFlags } from "@/config/featureFlags";

export default function ClientDashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const hasHydrated = useBudgetStore((state) => state.hasHydrated);
	const isLoading = useBudgetStore((state) => state.isLoading);
	const transactions = useBudgetStore((state) => state.transactions);

	// Show shimmer ONLY on the very first load
	const showShimmer = !hasHydrated || (isLoading && transactions.length === 0);

	const enableBottomNav = featureFlags.BudgetLayoutEnableBottomNav;

	return (
		<div
			className={`flex min-h-screen bg-white dark:bg-[#050505] ${
				enableBottomNav ? "pb-28 lg:pb-0" : ""
			}`}
		>
			{/* Keeps your Zustand state synced with the server */}
			<StoreInitializer />

			<WelcomeNotification />

			{/* Sidebar is fixed width or responsive drawer */}
			<Sidebar />

			{/* Content area takes remaining width */}
			<div className="flex-1 flex flex-col min-w-0 overflow-x-hidden min-h-37.5">
				{showShimmer ? (
					<GlobalShimmer />
				) : (
					<main
						className={
							enableBottomNav
								? "pt-[env(safe-area-inset-top,1rem)] lg:pt-0" // Immersive mode (protects from notch, flush on iPad/Desktop)
								: "pt-16 lg:pt-0" // Legacy mode (makes room for the top header)
						}
					>
						{children}
					</main>
				)}
			</div>
		</div>
	);
}
