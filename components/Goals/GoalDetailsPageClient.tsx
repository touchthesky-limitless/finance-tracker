"use client";

import { usePathname } from "next/navigation";
import { SavingsListView } from "@/components/Goals/views/SavingsListView";
import { SavingsDetailView } from "@/components/Goals/views/SavingsDetailView";
import { DebtPaydownView } from "@/components/Goals/views/DebtPaydownView";

export default function GoalDetailsPageClient() {
	const pathname = usePathname();

	if (pathname === "/goals/savings") {
		return <SavingsListView />;
	}
	if (pathname === "/goals/debt-paydown") {
		return <DebtPaydownView />;
	}
	if (pathname.startsWith("/goals/savings/")) {
		return <SavingsDetailView />;
	}

	// Fallback (should never happen)
	return (
		<main className="min-h-screen bg-[#f7f6f4] p-6 dark:bg-[#171716]">
			<p className="text-center text-gray-500">Page not found</p>
		</main>
	);
}
