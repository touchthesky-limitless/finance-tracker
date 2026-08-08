/**
 * Pure utility functions for merchant logo resolution.
 * No React hooks – can be used anywhere.
 *
 * Exports:
 * - getMerchantLogoProps: Preferred function that returns logoUrl and domain
 *   (prioritises storedLogoUrl if provided).
 * - getMerchantLogoUrl: Returns just the logo URL (or null if skipped).
 *
 * Note: The hooks useMerchantLogoConfig and useMerchantLogoConfigMap have been
 * removed. Use MerchantLogoWithLookup instead, which handles both single
 * merchants and lists using this utility.
 */
import {
	APISTEMIC_SKIP_LIST,
	COMMON_TLDS,
	DOMAIN_OVERRIDES,
} from "@/constants/merchantLogos";

/**
 * Determines whether a merchant should skip Apistemic and go straight to Google/letter fallback.
 */
function shouldSkipApistemic(name: string): boolean {
	return APISTEMIC_SKIP_LIST.has(name.toLowerCase().trim());
}

/**
 * Guesses the domain for a merchant name, applying overrides and TLD detection.
 */
function guessDomainFromName(name: string): string {
	const key = name.toLowerCase().trim();
	if (!key) return "unknown.com";
	if (DOMAIN_OVERRIDES[key]) return DOMAIN_OVERRIDES[key];
	for (const tld of COMMON_TLDS) {
		if (key.endsWith(tld)) {
			return key.replace(/\s+/g, "");
		}
	}
	const domain = key.replace(/[^a-z0-9\s\.\-]/g, "").replace(/\s+/g, "");
	return domain ? `${domain}.com` : "unknown.com";
}

/**
 * Returns the best logo URL for a merchant, or null if skipped.
 * No network call – just URL generation.
 */
export function getMerchantLogoUrl(merchantName: string): string | null {
	const skip = shouldSkipApistemic(merchantName);
	if (skip) return null;
	const domain = guessDomainFromName(merchantName);
	return `https://logos-api.apistemic.com/domain:${domain}`;
}

/**
 * Unified function: returns the final logo URL and domain for a merchant.
 * - If storedLogoUrl is provided, it is used as the logo URL (user‑uploaded or manually set).
 * - Otherwise, generates a logo URL from the merchant name (Apistemic/Google fallback).
 * - The domain is always returned for Google fallback.
 *
 * This function is pure and can be called anywhere – components, loops, callbacks.
 *
 * @param merchantName - The merchant's display name.
 * @param storedLogoUrl - Optional stored logo URL from the merchant record.
 * @returns An object with `logoUrl` (string | null) and `domain` (string).
 */
export function getMerchantLogoProps(
	merchantName: string,
	storedLogoUrl?: string | null,
): { logoUrl: string | null; domain: string } {
	const domain = guessDomainFromName(merchantName);
	const skip = shouldSkipApistemic(merchantName);
	const generatedLogoUrl = skip
		? null
		: `https://logos-api.apistemic.com/domain:${domain}`;
	const finalLogoUrl = storedLogoUrl ?? generatedLogoUrl;
	return { logoUrl: finalLogoUrl, domain };
}
