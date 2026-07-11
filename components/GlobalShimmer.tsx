export default function GlobalShimmer() {
	// Explicitly generate the shimmer cards using a standard loop
	const cardElements = [];
	for (let i = 1; i <= 3; i++) {
		cardElements.push(
			<div
				key={i}
				className="h-64 bg-gray-50 dark:bg-[#0d0d0d] border border-gray-200 dark:border-white/5 rounded-3xl"
			/>,
		);
	}

	return (
		<div className="flex-1 p-8 space-y-8 animate-pulse">
			{/* Header Shimmer */}
			<div className="flex justify-between items-end mb-12">
				<div className="space-y-3">
					<div className="h-8 w-64 bg-gray-200 dark:bg-white/5 rounded-lg" />
					<div className="h-4 w-96 bg-gray-200 dark:bg-white/5 rounded-lg" />
				</div>
				<div className="h-12 w-32 bg-orange-100 dark:bg-orange-600/20 rounded-xl" />
			</div>

			{/* Cards Shimmer */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				{cardElements}
			</div>

			{/* Large Chart Shimmer */}
			<div className="h-80 w-full bg-gray-50 dark:bg-[#0d0d0d] border border-gray-200 dark:border-white/5 rounded-3xl" />
		</div>
	);
}
