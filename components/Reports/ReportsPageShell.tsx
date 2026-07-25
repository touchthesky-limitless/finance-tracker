"use client";

import dynamic from "next/dynamic";

import { ReportsPageSkeleton } from "@/components/Reports/ReportsPageSkeleton";

const ReportsPageClient = dynamic(
	() => {
		return import(
			"@/components/Reports/ReportsPageClient"
		);
	},
	{
		ssr: false,
		loading: () => {
			return <ReportsPageSkeleton />;
		},
	},
);

export function ReportsPageShell() {
	return <ReportsPageClient />;
}
