import type { ReactNode } from "react";
import { Check } from "lucide-react";

import { MerchantLogo } from "@/components/Merchants/MerchantLogo";
import { MerchantTransactionCount } from "@/components/Merchants/MerchantTransactionCount";
import type { MerchantListItem } from "@/components/Merchants/types";

export interface MerchantOptionContentProps {
	merchant: MerchantListItem;
	showCount?: boolean;
	size?: "sm" | "md";
	selected?: boolean;
	trailing?: ReactNode;
	className?: string;
}

export function MerchantOptionContent({
	merchant,
	showCount = true,
	size = "md",
	selected = false,
	trailing,
	className = "",
}: MerchantOptionContentProps) {
	const isSmall = size === "sm";

	return (
		<span
			className={`
				flex w-full min-w-0 items-center
				${isSmall ? "gap-2" : "gap-3"}
				${className}
			`}
		>
			<MerchantLogo
				name={merchant.name}
				logoUrl={merchant.logoUrl}
				size={size}
			/>

			<span
				title={merchant.name}
				className={`
					min-w-0 flex-1 truncate
					text-gray-900 dark:text-gray-100
					${isSmall ? "text-sm font-medium" : "text-base font-semibold"}
				`}
			>
				{merchant.name}
			</span>

			{showCount && (
				<MerchantTransactionCount count={merchant.transactionCount} />
			)}

			{trailing ??
				(selected ? (
					<Check
						size={isSmall ? 16 : 18}
						strokeWidth={2.5}
						aria-hidden="true"
						className="shrink-0 text-[#FF5A35]"
					/>
				) : null)}
		</span>
	);
}