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
	{ label: "Profile" },
	{ label: "Display" },
	{ label: "Notifications" },
	{ label: "Security" },
	{ label: "Integrations", badge: "Beta" },
];

const HOUSEHOLD_ITEMS: SettingsItem[] = [
	{ label: "General" },
	{ label: "Businesses" },
	{ label: "Members" },
	{ label: "Preferences" },
	{ label: "Institutions" },
	{ label: "Categories", href: "/settings/categories" },
	{ label: "Merchants" },
	{ label: "Rules", href: "/settings/rules" },
	{ label: "Tags" },
	{ label: "Data" },
	{ label: "Billing" },
	{ label: "Gift Monarch" },
	{ label: "Estate Planning" },
	{ label: "Referrals" },
];

export function SettingsShell({ children }: SettingsShellProps) {
	const pathname = usePathname();

	return (
		<div className="min-h-dvh overflow-x-hidden bg-[#f7f7f5] text-[#222220] dark:bg-[#121212] dark:text-[#efefed]">
			<div className="mr-auto w-full min-w-0 max-w-[1800px] px-3 pb-8 pt-4 sm:px-5 lg:px-6">
				<h1 className="mb-5 text-[22px] font-semibold tracking-tight">
					Settings
				</h1>

				<div className="grid w-full min-w-0 items-start gap-4 xl:grid-cols-[minmax(220px,280px)_minmax(0,1fr)]">
					<aside className="w-full min-w-0 space-y-4 xl:sticky xl:top-4">
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

					<main className="w-full min-w-0 max-w-full overflow-x-hidden">{children}</main>
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
		<section className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm dark:border-white/10 dark:bg-[#1b1b1a]">
			<h2 className="border-b border-black/5 px-6 py-5 text-xl font-semibold dark:border-white/10">
				{title}
			</h2>

			<nav className="p-2" aria-label={`${title} settings`}>
				{items.map((item) => {
					const active = Boolean(item.href && pathname.startsWith(item.href));
					const content = (
						<>
							<span>{item.label}</span>
							{item.badge && (
								<span className="rounded-full bg-cyan-100 px-2 py-0.5 text-xs font-semibold text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300">
									{item.badge}
								</span>
							)}
						</>
					);

					const className = `flex min-h-11 w-full items-center justify-between rounded-xl px-4 py-2.5 text-left text-[15px] transition-colors ${
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
		<section className="w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm dark:border-white/10 dark:bg-[#1b1b1a]">
			<header className="flex min-h-16 min-w-0 flex-wrap items-center justify-between gap-3 border-b border-black/5 px-4 py-4 sm:px-6 dark:border-white/10">
				<h2 className="text-xl font-semibold">{title}</h2>
				{actions}
			</header>
			{children}
		</section>
	);
}
