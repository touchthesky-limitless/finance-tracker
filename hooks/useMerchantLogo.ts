/**
 * Hook that determines the best available logo URL for a merchant.
 *
 * Fallback chain:
 * 1. Apistemic (if logoUrl provided and valid)
 * 2. Google favicon (if domain provided)
 * 3. undefined (falls back to placeholder in the UI)
 */
import { useState, useEffect } from "react";

export function useMerchantLogo(
	logoUrl?: string | null,
	domain?: string,
): { src: string | undefined; loading: boolean } {
	const [src, setSrc] = useState<string | undefined>(undefined);
	const [loading, setLoading] = useState(true);

	// Google favicon URL (s2 endpoint, works for most domains)
	const googleUrl = domain
		? `https://www.google.com/s2/favicons?domain=${domain}&sz=128`
		: undefined;

	useEffect(() => {
		let active = true;

		const tryFetch = async () => {
			setLoading(true);

			// No Apistemic URL → try Google directly
			if (!logoUrl) {
				if (googleUrl) {
					setSrc(googleUrl);
				} else {
					setSrc(undefined);
				}
				setLoading(false);
				return;
			}

			// Try Apistemic first
			try {
				const response = await fetch(logoUrl, { method: "HEAD" });
				const contentType = response.headers.get("content-type");
				const isValid = contentType?.startsWith("image/") && response.ok;

				if (isValid && active) {
					setSrc(logoUrl);
				} else if (googleUrl && active) {
					setSrc(googleUrl);
				} else if (active) {
					setSrc(undefined);
				}
			} catch {
				// Apistemic failed → try Google
				if (googleUrl && active) {
					setSrc(googleUrl);
				} else if (active) {
					setSrc(undefined);
				}
			} finally {
				if (active) setLoading(false);
			}
		};

		void tryFetch();

		return () => {
			active = false;
		};
	}, [logoUrl, googleUrl]);

	return { src, loading };
}
