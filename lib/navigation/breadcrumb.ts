"use client";

import { usePathname } from "next/navigation";

export type NavigationSource =
	| "transactions"
	| "dashboard"
	| "accounts"
	| "cash-flow"
	| "recurring"
	| "reports"
	| "budget";

export interface BreadcrumbConfig {
	label: string;
	href: string;
}

const DEFAULT_SOURCE: NavigationSource = "transactions";

const BREADCRUMBS: Record<NavigationSource, BreadcrumbConfig> = {
	"dashboard": {
		label: "Dashboard",
		href: "/dashboard",
	},
	"transactions": {
		label: "Transactions",
		href: "/transactions",
	},
	"accounts": {
		label: "Accounts",
		href: "/accounts",
	},
	"cash-flow": {
		label: "Cash Flow",
		href: "/cash-flow",
	},
	"recurring": {
		label: "Recurring",
		href: "/recurring",
	},
	"reports": {
		label: "Reports",
		href: "/reports",
	},
	"budget": {
		label: "Budget",
		href: "/plan",
	},
};

export function getNavigationSource(
	value: string | null | undefined,
): NavigationSource {
	if (value && value in BREADCRUMBS) {
		return value as NavigationSource;
	}
	return DEFAULT_SOURCE;
}

export function getBreadcrumb(
	value: string | null | undefined,
): BreadcrumbConfig {
	return BREADCRUMBS[getNavigationSource(value)];
}

export function appendNavigationSource(
	path: string,
	source: NavigationSource,
	search?: string | URLSearchParams,
): string {
	const params = new URLSearchParams(
		typeof search === "string" ? search : search?.toString(),
	);
	params.set("from", source);
	const query = params.toString();
	return query ? `${path}?${query}` : path;
}

export function useNavigationSource(): NavigationSource {
	const pathname = usePathname();
	if (!pathname) return "transactions";

	if (pathname === "/dashboard" || pathname.startsWith("/dashboard/"))
		return "dashboard";
	if (pathname === "/transactions" || pathname.startsWith("/transactions/"))
		return "transactions";
	if (pathname === "/accounts" || pathname.startsWith("/accounts/"))
		return "accounts";
	if (pathname === "/cash-flow" || pathname.startsWith("/cash-flow/"))
		return "cash-flow";
	if (pathname === "/recurring" || pathname.startsWith("/recurring/"))
		return "recurring";
	if (pathname === "/reports" || pathname.startsWith("/reports/"))
		return "reports";
	if (pathname === "/plan" || pathname.startsWith("/plan/"))
		return "budget";

	return "transactions";
}
