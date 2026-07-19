"use client";

import Sidebar from "@/components/Sidebar/Sidebar";
import { useBudgetStore } from "@/store/useBudgetStore";
import { VersionProvider } from "@/app/context/VersionContext";
import { UndoToast } from "@/components/ui/UndoToast";

export default function ClientDashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	// Zustand selectors remain stable
	const toast = useBudgetStore((state) => state.toast);
	const setToast = useBudgetStore((state) => state.setToast);
	const undoBulkUpdate = useBudgetStore((state) => state.undoBulkUpdate);

	return (
		<VersionProvider version="pro">
			<div className="flex h-screen overflow-hidden bg-white dark:bg-[#0d0d0d]">
				{/* Unified Sidebar is now global */}
				<Sidebar />

				<div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
					{children}
				</div>
			</div>

			{/* Global Undo Toast */}
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
		</VersionProvider>
	);
}
