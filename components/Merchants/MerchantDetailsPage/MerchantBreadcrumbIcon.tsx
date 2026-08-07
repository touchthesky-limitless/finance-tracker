/**
 * Rounds a merchant's initial or logo for use in breadcrumbs.
 */
export function MerchantBreadcrumbIcon({
	name,
	logoUrl,
}: {
	name: string;
	logoUrl?: string | null;
}) {
	const initial = name.trim().charAt(0).toUpperCase() || "?";

	return (
		<span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-full border border-black/10 bg-white text-sm font-bold text-[#ff5a35] shadow-sm dark:border-white/15 dark:bg-white/10 dark:text-white">
			{logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
				<img src={logoUrl} alt="" className="h-full w-full object-cover" />
			) : (
				<span aria-hidden="true">{initial}</span>
			)}
		</span>
	);
}
