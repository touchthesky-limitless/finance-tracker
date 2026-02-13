import React from "react";

interface TrendIndicatorProps {
	change: number;
	percent: number;
	inverse?: boolean;
}

export default function TrendIndicator({
	change,
	percent,
	inverse = false,
}: TrendIndicatorProps) {
	if (change === null || percent === null) {
		return <span className="text-gray-400 text-sm">--</span>;
	}
	if (change === 0) return <span className="text-gray-400">- 0.00%</span>;

	const isUp = change > 0;
	const arrow = isUp ? "▲" : "▼";
	// Standard Logic: Up "▲" = Green, Down "▼" = Red
	// Inverse Logic: Up "▲" = Red, Down "▼" = Green (Good for Debt/Mortgages)
	const isGood = inverse ? !isUp : isUp;
	const colorClass = isGood ? "text-green-600" : "text-red-600";
    const fortmattedChange = `${change > 0 ? "+" : ""}${change.toFixed(2)}`;
    const fortmattedPercent = `(${percent > 0 ? "+" : ""}${percent.toFixed(2)}%)`;

	return (
		<span className={`${colorClass} font-medium`}>
			{arrow} {fortmattedChange} {fortmattedPercent}
		</span>
	);
}
