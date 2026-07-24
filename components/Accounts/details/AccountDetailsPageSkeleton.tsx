import { ChevronRight } from "lucide-react";

import { Shimmer } from "@/components/ui/Shimmer";

function TransactionRowSkeleton({ compact = false }: { compact?: boolean }) {
	return (
		<div className="flex min-h-14 items-center gap-4 border-b border-gray-100 px-5 py-3 dark:border-white/5">
			<Shimmer className="size-8 shrink-0 rounded-full" />

			<div className="min-w-0 flex-1">
				<Shimmer className={`h-4 rounded-md ${compact ? "w-28" : "w-40"}`} />
			</div>

			<Shimmer className="hidden h-4 w-32 rounded-md sm:block" />
			<Shimmer className="h-4 w-20 rounded-md" />
		</div>
	);
}

function SummaryCardSkeleton({ rows }: { rows: number }) {
	return (
		<section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/5 dark:bg-[#222220]">
			<div className="border-b border-gray-200 px-6 py-4 dark:border-white/5">
				<Shimmer className="h-6 w-28 rounded-md" />
			</div>

			<div className="space-y-6 px-6 py-6">
				{Array.from({ length: rows }, (_, index) => {
					return (
						<div
							key={index}
							className="flex items-center justify-between gap-5"
						>
							<Shimmer className="h-4 w-24 rounded-md" />
							<Shimmer
								className={`h-4 rounded-md ${
									index % 2 === 0 ? "w-28" : "w-20"
								}`}
							/>
						</div>
					);
				})}
			</div>
		</section>
	);
}

export function AccountDetailsPageSkeleton() {
	return (
		<div
			role="status"
			aria-label="Loading account details"
			aria-live="polite"
			className="flex min-h-screen flex-col bg-gray-50 p-3 text-gray-900 md:p-5 dark:bg-[#171716] dark:text-[#F4F4F2]"
		>
			<span className="sr-only">Loading account details…</span>

			<header
				aria-hidden="true"
				className="mb-4 flex flex-wrap items-center justify-between gap-3 px-1"
			>
				<div className="flex min-w-0 items-center gap-3">
					<Shimmer className="h-5 w-20 rounded-md" />

					<ChevronRight
						size={18}
						className="text-gray-300 dark:text-gray-600"
					/>

					<Shimmer className="size-7 shrink-0 rounded-full" />
					<Shimmer className="h-5 w-44 rounded-md" />
				</div>

				<div className="flex items-center gap-2">
					<Shimmer className="h-10 w-20 rounded-lg" />
					<Shimmer className="h-10 w-24 rounded-lg" />
				</div>
			</header>

			<section
				aria-hidden="true"
				className="rounded-2xl border border-gray-200 bg-white px-5 py-6 shadow-sm dark:border-white/5 dark:bg-[#222220]"
			>
				<div className="mb-8 flex flex-wrap items-start justify-between gap-4">
					<div>
						<Shimmer className="mb-3 h-3 w-28 rounded-md" />

						<div className="flex flex-wrap items-center gap-3">
							<Shimmer className="h-9 w-36 rounded-lg" />
							<Shimmer className="h-5 w-44 rounded-md" />
						</div>
					</div>

					<Shimmer className="h-10 w-36 rounded-lg" />
				</div>

				<div className="relative h-72 overflow-hidden rounded-xl">
					<div className="absolute inset-x-0 top-5 space-y-14">
						{Array.from({ length: 4 }, (_, index) => {
							return (
								<div key={index} className="flex items-center gap-4">
									<Shimmer className="h-4 w-14 rounded-md" />
									<div className="h-px flex-1 bg-gray-200 dark:bg-white/7" />
								</div>
							);
						})}
					</div>

					<div className="absolute bottom-8 left-20 right-5 top-8">
						<Shimmer className="h-full w-full rounded-xl" />
					</div>

					<div className="absolute bottom-0 left-20 right-5 flex justify-between">
						<Shimmer className="h-4 w-14 rounded-md" />
						<Shimmer className="h-4 w-14 rounded-md" />
						<Shimmer className="h-4 w-14 rounded-md" />
					</div>
				</div>
			</section>

			<div
				aria-hidden="true"
				className="mt-4 grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2.2fr)_minmax(320px,0.95fr)]"
			>
				<section className="flex min-h-[620px] min-w-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/5 dark:bg-[#222220]">
					<div className="flex min-h-14 flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-5 py-3 dark:border-white/5">
						<Shimmer className="h-6 w-28 rounded-md" />

						<div className="flex flex-wrap items-center gap-2">
							<Shimmer className="h-9 w-30 rounded-lg" />
							<Shimmer className="h-9 w-32 rounded-lg" />
							<Shimmer className="h-9 w-20 rounded-lg" />
							<Shimmer className="h-9 w-24 rounded-lg" />
						</div>
					</div>

					<div className="min-h-0 flex-1">
						<div className="flex min-h-11 items-center justify-between border-b border-gray-200 bg-gray-50 px-5 dark:border-white/5 dark:bg-[#292927]">
							<Shimmer className="h-4 w-28 rounded-md" />
							<Shimmer className="h-4 w-20 rounded-md" />
						</div>

						{Array.from({ length: 8 }, (_, index) => {
							return (
								<TransactionRowSkeleton key={index} compact={index % 3 === 1} />
							);
						})}
					</div>
				</section>

				<aside className="space-y-4 self-start">
					<SummaryCardSkeleton rows={4} />
					<SummaryCardSkeleton rows={5} />
				</aside>
			</div>
		</div>
	);
}
