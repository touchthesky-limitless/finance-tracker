import { Shimmer } from "@/components/ui/Shimmer";

export function RecurringPageSkeleton() {
	return (
		<div
			role="status"
			aria-label="Loading recurring page"
			className="min-h-screen bg-gray-50 p-4 dark:bg-[#171716]"
		>
			<span className="sr-only">Loading recurring page…</span>
			<div className="flex items-center gap-6">
				<Shimmer className="h-8 w-28 rounded-lg" />
				<Shimmer className="h-8 w-20 rounded-lg" />
				<Shimmer className="h-8 w-28 rounded-lg" />
				<Shimmer className="ml-auto h-12 w-32 rounded-xl" />
				<Shimmer className="h-12 w-48 rounded-xl" />
			</div>
			<div className="mt-5 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-white/5 dark:bg-[#232322]">
				<div className="flex h-16 items-center px-6">
					<Shimmer className="h-6 w-32 rounded-md" />
					<Shimmer className="ml-auto h-10 w-72 rounded-xl" />
				</div>
				<div className="grid grid-cols-3 border-t border-gray-200 dark:border-white/5">
					{Array.from({ length: 3 }, (_, index) => (
						<div
							key={index}
							className="space-y-3 border-r border-gray-200 p-6 last:border-0 dark:border-white/5"
						>
							<Shimmer className="h-5 w-28 rounded-md" />
							<Shimmer className="h-4 w-44 rounded-md" />
							<Shimmer className="h-2 w-full rounded-full" />
						</div>
					))}
				</div>
			</div>
			<div className="mt-5 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-white/5 dark:bg-[#232322]">
				<div className="grid h-16 grid-cols-5 gap-8 border-b border-gray-200 px-6 dark:border-white/5">
					{Array.from({ length: 5 }, (_, index) => (
						<Shimmer key={index} className="my-auto h-4 rounded-md" />
					))}
				</div>
				{Array.from({ length: 5 }, (_, index) => (
					<div
						key={index}
						className="flex h-20 items-center gap-5 border-b border-gray-100 px-6 dark:border-white/5"
					>
						<Shimmer className="size-11 rounded-full" />
						<Shimmer className="h-5 w-40 rounded-md" />
						<Shimmer className="ml-auto h-5 w-24 rounded-md" />
					</div>
				))}
			</div>
		</div>
	);
}
