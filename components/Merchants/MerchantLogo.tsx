"use client";

import { useState } from "react";
import { Store } from "lucide-react";

interface MerchantLogoProps {
	name: string;
	logoUrl?: string | null;
	size?: "sm" | "md" | "lg";
	className?: string;
}

const SIZE_CLASSES = {
	sm: {
		container: "h-6 w-6",
		icon: 13,
	},
	md: {
		container: "h-8 w-8",
		icon: 16,
	},
	lg: {
		container: "h-10 w-10",
		icon: 19,
	},
} as const;

export function MerchantLogo({
	name,
	logoUrl,
	size = "md",
	className = "",
}: MerchantLogoProps) {
	const [failedUrl, setFailedUrl] =
		useState<string | null>(null);

	const sizeConfig = SIZE_CLASSES[size];

	const showImage =
		Boolean(logoUrl) && failedUrl !== logoUrl;

	return (
		<span
			aria-label={`${name} logo`}
			className={`
				grid shrink-0 place-items-center
				overflow-hidden rounded-full
				border border-gray-200
				bg-gray-100 text-gray-500

				dark:border-white/15
				dark:bg-white/5
				dark:text-gray-400

				${sizeConfig.container}
				${className}
			`}
		>
			{showImage ? (
				// eslint-disable-next-line @next/next/no-img-element
				<img
					src={logoUrl ?? ""}
					alt=""
					className="h-full w-full object-cover"
					onError={() => {
						setFailedUrl(logoUrl ?? null);
					}}
				/>
			) : (
				<Store
					size={sizeConfig.icon}
					strokeWidth={1.8}
					aria-hidden="true"
				/>
			)}
		</span>
	);
}