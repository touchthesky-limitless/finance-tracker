import { Shimmer } from "@/components/ui/Shimmer";

export function AccountsPageSkeleton() {
	return (
		<div
			role="status"
			aria-label="Loading accounts"
			aria-live="polite"
			className="min-h-screen bg-gray-50 p-3 text-gray-900 md:p-5 dark:bg-[#171717] dark:text-white"
		>
			<span className="sr-only">Loading accounts…</span>

			<div aria-hidden="true" className="mb-5 flex items-center justify-between">
				<Shimmer className="h-7 w-28 rounded-md" />
				<div className="flex gap-2">
					<Shimmer className="h-10 w-24 rounded-lg" />
					<Shimmer className="h-10 w-28 rounded-lg" />
					<Shimmer className="h-10 w-32 rounded-lg" />
				</div>
			</div>

			<div
				aria-hidden="true"
				className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/5 dark:bg-[#222]"
			>
				<div className="flex items-start justify-between gap-5">
					<div className="space-y-3">
						<Shimmer className="h-3 w-24 rounded-md" />
						<Shimmer className="h-8 w-64 rounded-lg" />
					</div>
					<div className="flex gap-3">
						<Shimmer className="h-11 w-48 rounded-lg" />
						<Shimmer className="h-11 w-36 rounded-lg" />
					</div>
				</div>
				<Shimmer className="mt-8 h-60 w-full rounded-xl" />
			</div>

			<div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2.2fr)_minmax(300px,0.95fr)]">
				<div aria-hidden="true" className="space-y-4">
					{Array.from({ length: 2 }, (_, groupIndex) => (
						<div
							key={groupIndex}
							className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-white/5 dark:bg-[#222]"
						>
							<div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-white/5">
								<Shimmer className="h-5 w-48 rounded-md" />
								<Shimmer className="h-5 w-24 rounded-md" />
							</div>
							{Array.from({ length: groupIndex === 0 ? 2 : 5 }, (_, row) => (
								<div
									key={row}
									className="flex h-20 items-center gap-4 border-b border-gray-200 px-5 last:border-0 dark:border-white/5"
								>
									<Shimmer className="size-10 rounded-full" />
									<div className="flex-1 space-y-2">
										<Shimmer className="h-4 w-44 rounded-md" />
										<Shimmer className="h-3 w-24 rounded-md" />
									</div>
									<Shimmer className="h-5 w-24 rounded-md" />
								</div>
							))}
						</div>
					))}
				</div>

				<Shimmer className="h-96 rounded-2xl" />
			</div>
		</div>
	);
}
