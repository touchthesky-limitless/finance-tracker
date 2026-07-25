function Shimmer({ className }: { className: string }) {
	return (
		<div
			aria-hidden="true"
			className={`overflow-hidden bg-gray-200 motion-safe:animate-pulse dark:bg-white/[0.07] ${className}`}
		/>
	);
}

export function ReportsPageSkeleton() {
	return (
		<div
			role="status"
			aria-busy="true"
			aria-label="Loading reports"
			className="min-h-screen bg-[#f6f5f3] p-3 text-gray-950 sm:p-5 dark:bg-[#121212] dark:text-white"
		>
			<span className="sr-only">Loading reports…</span>

			<header className="sticky top-0 z-50 -mx-3 -mt-3 flex flex-col gap-4 border-b border-gray-200/80 bg-[#f6f5f3]/95 px-3 py-3 backdrop-blur-md sm:-mx-5 sm:-mt-5 sm:px-5 lg:flex-row lg:items-center lg:justify-between dark:border-white/10 dark:bg-[#121212]/95">
				<div className="flex items-center gap-6 overflow-hidden">
					<Shimmer className="h-7 w-24 shrink-0 rounded-lg" />
					<Shimmer className="h-6 w-20 shrink-0 rounded-md" />
					<Shimmer className="h-6 w-20 shrink-0 rounded-md" />
					<Shimmer className="h-6 w-16 shrink-0 rounded-md" />
				</div>

				<div className="flex flex-wrap items-center gap-3">
					<Shimmer className="h-10 w-28 rounded-xl" />
					<Shimmer className="h-10 w-28 rounded-xl" />
					<Shimmer className="h-10 w-24 rounded-xl" />
					<Shimmer className="h-10 w-20 rounded-xl" />
				</div>
			</header>

			<main className="mx-auto mt-5 w-full max-w-[1800px]">
				<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
					{Array.from(
						{
							length: 4,
						},
						(_, index) => {
							return (
								<section
									key={`summary-${index}`}
									className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-[#1b1b1b]"
								>
									<Shimmer className="h-4 w-28 rounded" />
									<Shimmer className="mt-5 h-8 w-36 rounded-lg" />
									<Shimmer className="mt-4 h-3 w-20 rounded" />
								</section>
							);
						},
					)}
				</div>

				<section className="mt-5 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/5 dark:bg-[#1b1b1b]">
					<div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 px-5 py-4 dark:border-white/5">
						<div className="flex items-center gap-3">
							<Shimmer className="h-10 w-28 rounded-xl" />
							<Shimmer className="h-10 w-32 rounded-xl" />
							<Shimmer className="h-10 w-28 rounded-xl" />
						</div>

						<div className="flex items-center gap-2">
							<Shimmer className="size-10 rounded-xl" />
							<Shimmer className="size-10 rounded-xl" />
						</div>
					</div>

					<div className="p-5">
						<Shimmer className="h-[360px] w-full rounded-xl" />
					</div>
				</section>

				<div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
					<section className="min-h-[520px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/5 dark:bg-[#1b1b1b]">
						<div className="flex h-14 items-center border-b border-gray-200 px-5 dark:border-white/5">
							<Shimmer className="h-5 w-28 rounded" />
						</div>

						<div className="flex min-h-14 items-center justify-between gap-4 border-b border-gray-200 px-5 dark:border-white/5">
							<div className="flex gap-3">
								<Shimmer className="h-9 w-24 rounded-lg" />
								<Shimmer className="h-9 w-24 rounded-lg" />
							</div>
							<Shimmer className="h-9 w-28 rounded-lg" />
						</div>

						<div className="divide-y divide-gray-100 px-5 dark:divide-white/5">
							{Array.from(
								{
									length: 7,
								},
								(_, index) => {
									return (
										<div
											key={`transaction-${index}`}
											className="flex h-16 items-center gap-4"
										>
											<Shimmer className="size-9 shrink-0 rounded-full" />

											<div className="min-w-0 flex-1">
												<Shimmer className="h-4 w-40 rounded" />
												<Shimmer className="mt-2 h-3 w-24 rounded" />
											</div>

											<Shimmer className="h-4 w-20 rounded" />
										</div>
									);
								},
							)}
						</div>
					</section>

					<aside className="h-fit overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/5 dark:bg-[#1b1b1b]">
						<div className="border-b border-gray-200 px-5 py-4 dark:border-white/5">
							<Shimmer className="h-5 w-24 rounded" />
						</div>

						<div className="space-y-5 px-5 py-5">
							{Array.from(
								{
									length: 6,
								},
								(_, index) => {
									return (
										<div
											key={`detail-${index}`}
											className="flex items-center justify-between gap-6"
										>
											<Shimmer className="h-4 w-28 rounded" />
											<Shimmer className="h-4 w-20 rounded" />
										</div>
									);
								},
							)}
						</div>
					</aside>
				</div>
			</main>
		</div>
	);
}
