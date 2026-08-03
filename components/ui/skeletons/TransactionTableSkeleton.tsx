/**
 * @file TableSkeleton.tsx
 * @description A loading skeleton that precisely mimics the transaction table layout.
 * Includes header, checkbox, merchant avatar, category icon, account, and amount.
 */
import { Skeleton } from "@/components/ui/skeleton";

export function TransactionTableSkeleton() {
	return (
		<div className="w-full animate-pulse bg-white dark:bg-[#191919]">
			<div className="flex h-12 items-center justify-between border-b border-gray-200 bg-gray-50 px-6 dark:border-white/5 dark:bg-[#232323]">
				<div className="flex items-center gap-4">
					<Skeleton className="h-4 w-8 rounded-md" />
					<Skeleton className="h-4 w-48 rounded-md" />
				</div>
				<div className="flex items-center gap-6">
					<Skeleton className="h-4 w-20 rounded-md" />
					<Skeleton className="h-4 w-24 rounded-md" />
					<Skeleton className="h-4 w-20 rounded-md" />
				</div>
			</div>

			{Array.from({ length: 8 }).map((_, i) => (
				<div
					key={i}
					className="flex h-14 items-center border-b border-gray-100 px-6 dark:border-white/5"
				>
					<div className="w-8 shrink-0">
						<Skeleton className="h-4 w-4 rounded-sm" />
					</div>

					<div className="flex min-w-[200px] flex-1 items-center gap-3">
						<Skeleton className="h-8 w-8 shrink-0 rounded-full" />
						<div className="min-w-0 flex-1 space-y-1.5">
							<Skeleton className="h-3.5 w-3/4 rounded-md" />
							<Skeleton className="h-3 w-1/2 rounded-md" />
						</div>
					</div>

					<div className="w-48 shrink-0 px-2">
						<div className="flex items-center gap-2">
							<Skeleton className="h-6 w-6 shrink-0 rounded-full" />
							<Skeleton className="h-3.5 w-24 rounded-md" />
						</div>
					</div>

					<div className="w-40 shrink-0 px-2">
						<Skeleton className="h-3.5 w-28 rounded-md" />
					</div>

					<div className="flex min-w-[100px] flex-1 items-center justify-end px-4">
						<Skeleton className="h-4 w-20 rounded-md" />
					</div>
				</div>
			))}
		</div>
	);
}
