"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface SettingsShellProps {
	children: ReactNode;
}

interface SettingsItem {
	label: string;
	href?: string;
	badge?: string;
}

const ACCOUNT_ITEMS: SettingsItem[] = [
	{ label: "Profile", href: "/settings/profile" },
	{ label: "Display", href: "/settings/display" },
	{ label: "Notifications", href: "/settings/notifications" },
	{ label: "Security", href: "/settings/security" },
	{ label: "Integrations",  href: "/settings/integrations", badge: "Beta" },
];

const HOUSEHOLD_ITEMS: SettingsItem[] = [
	{ label: "General", href: "/settings/household" },
	{ label: "Businesses", href: "/settings/businesses" },
	{ label: "Members", href: "/settings/members" },
	{ label: "Preferences", href: "/settings/preferences" },
	{ label: "Institutions", href: "/settings/institutions" },
	{ label: "Categories", href: "/settings/categories" },
	{ label: "Merchants", href: "/settings/merchants" },
	{ label: "Rules", href: "/settings/rules" },
	{ label: "Tags", href: "/settings/tags" },
	{ label: "Data", href: "/settings/data" },
	{ label: "Billing", href: "/settings/billing" },
	{ label: "Gift Touch The Sky", href: "/settings/gifts" },
	{ label: "Estate Planning", href: "/settings/trust-and-will" },
	{ label: "Referrals", href: "/settings/referrals" },
];

export function SettingsShell({ children }: SettingsShellProps) {
	const pathname = usePathname();

	return (
		<div className="min-h-dvh w-full min-w-0 max-w-none overflow-x-clip bg-[#f7f7f5] text-[#222220] dark:bg-[#121212] dark:text-[#efefed]">
			<div className="w-full min-w-0 max-w-none px-3 pb-8 pt-4 sm:px-4 md:px-5 lg:px-6 2xl:px-8">
				<h1 className="mb-4 text-xl font-semibold tracking-tight sm:mb-5 sm:text-[22px]">
					Settings
				</h1>

				<div className="grid w-full min-w-0 max-w-none items-start gap-4 xl:grid-cols-[minmax(230px,280px)_minmax(0,1fr)] 2xl:gap-5">
					<aside className="grid w-full min-w-0 gap-4 md:grid-cols-2 xl:sticky xl:top-4 xl:block xl:space-y-4">
						<SettingsNavCard
							title="Account"
							items={ACCOUNT_ITEMS}
							pathname={pathname}
						/>
						<SettingsNavCard
							title="Household"
							items={HOUSEHOLD_ITEMS}
							pathname={pathname}
						/>
					</aside>

					<main className="w-full min-w-0 max-w-none overflow-x-clip">
						{children}
					</main>
				</div>
			</div>
		</div>
	);
}

function SettingsNavCard({
	title,
	items,
	pathname,
}: {
	title: string;
	items: SettingsItem[];
	pathname: string;
}) {
	return (
		<section className="min-w-0 overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm dark:border-white/10 dark:bg-[#1b1b1a]">
			<h2 className="border-b border-black/5 px-4 py-4 text-lg font-semibold sm:px-5 sm:text-xl xl:px-6 xl:py-5 dark:border-white/10">
				{title}
			</h2>

			<nav
				className="grid grid-cols-1 gap-0.5 p-2"
				aria-label={`${title} settings`}
			>
				{items.map((item) => {
					const active = Boolean(item.href && pathname.startsWith(item.href));
					const content = (
						<>
							<span className="min-w-0 truncate">{item.label}</span>
							{item.badge && (
								<span className="shrink-0 rounded-full bg-cyan-100 px-2 py-0.5 text-xs font-semibold text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300">
									{item.badge}
								</span>
							)}
						</>
					);

					const className = `flex min-h-10 w-full min-w-0 items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors sm:min-h-11 sm:px-4 sm:py-2.5 sm:text-[15px] ${
						active
							? "bg-cyan-100 text-cyan-800 dark:bg-cyan-500/15 dark:text-cyan-300"
							: item.href
								? "hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"
								: "cursor-default text-[#3f3f3c] dark:text-[#c7c7c3]"
					}`;

					return item.href ? (
						<Link key={item.label} href={item.href} className={className}>
							{content}
						</Link>
					) : (
						<div key={item.label} className={className} aria-disabled="true">
							{content}
						</div>
					);
				})}
			</nav>
		</section>
	);
}

export function SettingsContentCard({
	title,
	actions,
	children,
}: {
	title: string;
	actions?: ReactNode;
	children: ReactNode;
}) {
	return (
		<section className="w-full min-w-0 max-w-none overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm dark:border-white/10 dark:bg-[#1b1b1a]">
			<header className="flex min-h-14 min-w-0 flex-col items-stretch gap-3 border-b border-black/5 px-4 py-4 sm:min-h-16 sm:flex-row sm:items-center sm:justify-between sm:px-5 lg:px-6 dark:border-white/10">
				<h2 className="min-w-0 text-lg font-semibold sm:text-xl">{title}</h2>
				{actions ? (
					<div className="w-full min-w-0 sm:w-auto">{actions}</div>
				) : null}
			</header>
			<div className="min-w-0 max-w-full">{children}</div>
		</section>
	);
}
