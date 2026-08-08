/**
 * MerchantLogoWithLookup – A reusable component that displays a merchant logo
 * with automatic lookup and fallback logic.
 *
 * It can be used in two ways:
 * 1. For a list of merchants: pass `item` (with `entityId` and `label`) and `merchantItems`.
 * 2. For a single merchant: pass `merchant` directly.
 *
 * Internally, it uses `getMerchantLogoProps` from `@/utils/merchantLogoUtils` to resolve
 * the best available logo URL and domain, respecting stored logos and the full fallback
 * chain (Apistemic → Google → letter placeholder).
 *
 * This component encapsulates the common lookup pattern, so you don't need to repeat
 * `find` and `getMerchantLogoProps` in every component.
 *
 * Example usage in a list:
 *   {items.map((item) => (
 *     <MerchantLogoWithLookup
 *       key={item.id}
 *       item={item}
 *       merchantItems={merchantItems}
 *       size="sm"
 *     />
 *   ))}
 *
 * Example usage for a single merchant:
 *   <MerchantLogoWithLookup merchant={merchant} size="md" />
 */
import { MerchantLogo } from "@/components/Merchants/MerchantLogo";
import type { MerchantListItem } from "@/components/Merchants/types";
import { getMerchantLogoProps } from "@/utils/merchantLogoUtils";

interface MerchantLogoWithLookupProps {
	/**
	 * For list usage: an item containing a merchant identifier (entityId) and a display label.
	 * If the merchant is not found in merchantItems, the label will be used as the merchant name.
	 */
	item?: { entityId?: string | null; label: string };

	/**
	 * The full list of available merchants, used to look up the merchant by `item.entityId`.
	 * Only required when using the `item` prop.
	 */
	merchantItems?: MerchantListItem[];

	/**
	 * For single merchant usage: a direct MerchantListItem object.
	 * If provided, `item` and `merchantItems` are ignored.
	 */
	merchant?: MerchantListItem;

	/**
	 * Size of the logo – passed through to MerchantLogo.
	 */
	size?: "sm" | "md" | "lg";

	/**
	 * Additional CSS classes – passed through to MerchantLogo.
	 */
	className?: string;

	/**
	 * Final fallback type – "letter" or "store" (defaults to "store").
	 */
	fallback?: "letter" | "store";
}

export function MerchantLogoWithLookup({
	item,
	merchantItems,
	merchant: directMerchant,
	...props
}: MerchantLogoWithLookupProps) {
	// If a direct merchant is provided, use it.
	if (directMerchant) {
		const { logoUrl, domain } = getMerchantLogoProps(
			directMerchant.name,
			directMerchant.logoUrl,
		);
		return (
			<MerchantLogo
				name={directMerchant.name}
				logoUrl={logoUrl}
				domain={domain}
				{...props}
			/>
		);
	}

	// Otherwise, attempt to look up the merchant by entityId.
	if (item) {
		const merchant = merchantItems?.find((m) => m.id === item.entityId);
		const name = merchant?.name ?? item.label;
		const { logoUrl, domain } = getMerchantLogoProps(name, merchant?.logoUrl);
		return (
			<MerchantLogo
				name={item.label}
				logoUrl={logoUrl}
				domain={domain}
				{...props}
			/>
		);
	}

	// If neither merchant nor item is provided, render nothing (or could fallback to a placeholder).
	return null;
}
