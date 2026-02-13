import React from "react";

interface MarketStatusProps {
	date: string;
	time: string;
	session: "Pre-Market" | "Open" | "After-Hours" | "Closed";
}

export default function MarketStatus({
	date,
	time,
	session,
}: MarketStatusProps) {
	const statusColor =
		{
			"Open": "bg-green-100 text-green-700 border-green-200",
			"Pre-Market": "bg-yellow-100 text-yellow-700 border-yellow-200",
			"After-Hours": "bg-blue-100 text-blue-700 border-blue-200",
			"Closed": "bg-gray-100 text-gray-500 border-gray-200",
		}[session] || "bg-gray-100 text-gray-500 border-gray-200";

	return (
		<div className="flex flex-wrap items-center gap-3 mt-2">
			{/* Date & Time */}
			<span className="text-gray-500 text-sm font-medium">
				{date} • as of {time} EST
			</span>

			{/* Dynamic Status Badge */}
			<span
				className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border uppercase tracking-wide ${statusColor}`}
			>
				{session}
			</span>

			{/* Optional Helper Text (only shows if market is open) */}
			{/* {session === "Open" && (
				<span className="text-xs text-gray-400 hidden sm:inline-block">
					(Closes at 4 PM EST)
				</span>
			)} */}
		</div>
	);
}
