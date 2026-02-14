import MarketStatus from "@/components/MarketStatus";
import { getFullMarketInfo } from "@/lib/date";
import { getTrendProps } from "@/lib/utils";
import Image from "next/image";

interface FinancialCardProps {
	symbol: string;
	name: string;
	price: number;
	change: number;
	changePercent: number;
	currency: string;
	exchange: string;
	logo?: string;
	timestamp?: string;
	showFooter?: boolean;
}

export default function FinancialCard({
	symbol,
	name,
	price,
	change,
	changePercent,
	currency,
	exchange,
	logo,
	showFooter = false,
}: FinancialCardProps) {
	const { date, time, session } = getFullMarketInfo();
	const { color, Icon } = getTrendProps(change, "asset");
    const backgroundColor = color.split('-')[1];

    return (
		<div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between h-full hover:shadow-md transition-shadow">
			{/* HEADER */}
			<div className="flex items-start gap-4 mb-4">
				<div className={`w-12 h-12 rounded-full bg-${backgroundColor}-100 dark:bg-${backgroundColor}-300 flex items-center justify-center text-indigo-600 dark:text-indigo-300`}>
					{logo ? (
						<Image
							src={logo}
							alt={`${name} logo`}
                            width={48}
                            height={48}
							className={`w-12 h-12 rounded-full border border-gray-100 dark:border-gray-700 object-contain p-1 bg-${backgroundColor} dark:bg-${backgroundColor}`}
						/>
					) : (
						<div className={`w-12 h-12 rounded-full bg-${backgroundColor}-100 dark:bg-${backgroundColor}-900 flex items-center justify-center text-blue-600 dark:text-blue-300 font-bold text-xl`}>
							{symbol?.[0] || "?"}
						</div>
					)}
				</div>
				<div>
					<h2 className="text-xl font-medium text-gray-900 dark:text-white">
						{name}
					</h2>
					<div className="text-sm text-gray-500">
						{exchange}: {symbol}
					</div>
				</div>
			</div>

			{/* PRICE SECTION */}
			<div className="mt-2">
				<div className="flex items-baseline gap-1">
					<span className="text-5xl font-normal tracking-tight text-gray-900 dark:text-white">
						{price?.toFixed(2) ?? "0.00"}
					</span>
					<span className="text-gray-400">{currency}</span>
				</div>
			</div>

			{/* CHANGE INDICATOR */}
			<div
				className={`flex items-center gap-2 mt-4 font-medium text-lg ${color}`}
			>
				<span>
					{change > 0 ? "+" : ""}
					{change?.toFixed(2) ?? 0} ({changePercent?.toFixed(2) ?? 0.0}%)
				</span>
				<Icon size={20} />
				<span className={`text-sm text-gray-500 font-normal ${color}`}>
					today
				</span>
			</div>

			{/* FOOTER */}
			{showFooter && (
				<div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-400">
					<MarketStatus date={date} time={time} session={session} />
				</div>
			)}
		</div>
	);
}
