import { CreditCard } from "lucide-react";

interface MerchantTransactionCountProps {
	count: number;
	className?: string;
}

export function MerchantTransactionCount({
	count,
	className = "",
}: MerchantTransactionCountProps) {
	const label = `${count} ${
		count === 1 ? "transaction" : "transactions"
	}`;

	return (
		<span
			title={label}
			aria-label={label}
			className={`
				inline-flex shrink-0 items-center
				gap-1.5 text-sm tabular-nums
				text-gray-500 dark:text-gray-400
				${className}
			`}
		>
			<CreditCard
				size={16}
				strokeWidth={1.7}
				aria-hidden="true"
			/>

			<span>{count}</span>
		</span>
	);
}