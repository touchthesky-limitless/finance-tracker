/**
 * Renders a merchant logo with a multi‑step fallback chain.
 *
 * 1. Primary: Apistemic (if a valid logoUrl is provided and passes validation).
 * 2. Secondary: Google favicon (if a domain is provided).
 * 3. Final: Letter‑based placeholder or store icon (controlled by the `fallback` prop).
 *
 * The component uses:
 * - useMerchantLogo hook for the fetching logic.
 * - A local fallback state to handle rare image‑load failures.
 *
 * Props:
 * - name: Merchant name (used for the letter placeholder).
 * - logoUrl: Apistemic logo URL (or null).
 * - domain: Domain for Google favicon fallback.
 * - size: "sm" | "md" | "lg" (defaults to "md").
 * - className: Additional CSS classes.
 * - fallback: "letter" | "store" (defaults to "store").
 */
"use client";

import { useState } from "react";
import { Store } from "lucide-react";
import { useMerchantLogo } from "@/hooks/useMerchantLogo";

interface MerchantLogoProps {
	name: string;
	logoUrl?: string | null;
	domain?: string;
	size?: "sm" | "md" | "lg";
	className?: string;
	fallback?: "letter" | "store";
}

const SIZE_CLASSES = {
	sm: { container: "h-6 w-6", text: "text-xs", icon: 13 },
	md: { container: "h-8 w-8", text: "text-sm", icon: 16 },
	lg: { container: "h-10 w-10", text: "text-base", icon: 19 },
} as const;

export function MerchantLogo({
	name,
	logoUrl,
	domain,
	size = "md",
	className = "",
	fallback = "store",
}: MerchantLogoProps) {
	const { src, loading } = useMerchantLogo(logoUrl, domain);
	const [localFallback, setLocalFallback] = useState(false);

	const sizeConfig = SIZE_CLASSES[size];
	const initial = name.trim().charAt(0).toUpperCase() || "?";

	const showPlaceholder = loading || !src || localFallback;

	return (
		<span
			aria-label={`${name} logo`}
			className={`
        grid shrink-0 place-items-center overflow-hidden rounded-full
        border border-gray-200 bg-gray-100
        ${fallback === "store" ? "text-gray-500" : "text-gray-700 font-semibold"}
        dark:border-white/15 dark:bg-white/5
        ${fallback === "store" ? "dark:text-gray-400" : "dark:text-gray-300"}
        ${sizeConfig.container}
        ${className}
      `}
		>
			{showPlaceholder ? (
				fallback === "letter" ? (
					<span aria-hidden="true" className={sizeConfig.text}>
						{initial}
					</span>
				) : (
					<Store size={sizeConfig.icon} strokeWidth={1.8} aria-hidden="true" />
				)
			) : (
				// eslint-disable-next-line @next/next/no-img-element
				<img
					src={src}
					alt={`${name} logo`}
					loading="lazy"
					className="h-full w-full object-cover"
					onError={() => setLocalFallback(true)}
				/>
			)}
		</span>
	);
}
