import { MerchantLogo } from "@/components/Merchants/MerchantLogo";
import { MerchantTransactionCount } from "@/components/Merchants/MerchantTransactionCount";
import type { MerchantListItem } from "@/components/Merchants/types";

interface MerchantOptionContentProps {
	merchant: MerchantListItem;
	showCount?: boolean;
	size?: "sm" | "md";
	className?: string;
}

export function MerchantOptionContent({
	merchant,
	showCount = true,
	size = "md",
	className = "",
}: MerchantOptionContentProps) {
	return (
		<span
			className={`
				flex min-w-0 w-full items-center
				${size === "sm" ? "gap-2" : "gap-3"}
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

					${
						size === "sm"
							? "text-sm font-medium"
							: "text-base font-semibold"
					}
				`}
			>
				{merchant.name}
			</span>

			{showCount && (
				<MerchantTransactionCount
					count={merchant.transactionCount}
				/>
			)}
		</span>
	);
}