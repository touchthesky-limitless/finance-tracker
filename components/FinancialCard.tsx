import MarketStatus from "@/components/MarketStatus";
import Image from "next/image";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { getFullMarketInfo } from "@/lib/date";
import { getTrendProps } from "@/lib/utils";
import { formatMarketCap } from "@/utils/formatters";

interface FinancialCardProps {
	symbol: string;
	name: string;
	price: number;
	change: number;
	changePercent: number;
	currency?: string;
	showFooter?: boolean;
	logo?: string;
	marketCap?: number;
	view?: "grid" | "stack";
}

export default function FinancialCard({
	symbol,
	name,
	price,
	change,
	changePercent,
	currency,
	showFooter = false,
	logo,
	marketCap,
	view = "grid",
}: FinancialCardProps) {
	const { date, time, session } = getFullMarketInfo();
	const isPositive = change > 0;
	const { color } = getTrendProps(change, "asset");

	const marketCapNumber = formatMarketCap(marketCap);

	if (view === "stack") {
		return (
			<div className="bg-gray-50 dark:bg-[#0d0d0d] border border-black/5 dark:border-white/5 rounded-3xl p-4 flex flex-row items-center gap-4">
				<div className="w-10 h-10 rounded-2xl bg-black/5 dark:bg-white/5 flex items-center justify-center shrink-0">
					{logo ? (
						<Image src={logo} alt={name} width={24} height={24} />
					) : (
						<span className="text-sm font-black text-orange-600">
							{symbol?.[0]}
						</span>
					)}
				</div>
				<div className="flex flex-1 items-center justify-between min-w-0">
					<div className="min-w-0">
						<h2 className="text-sm font-black text-gray-900 dark:text-white uppercase truncate">
							{name}
						</h2>
						<div className="text-[10px] font-bold text-orange-600 uppercase">
							{symbol}{" "}
							<span className="text-gray-400 font-normal">
								- MC: {marketCapNumber} {currency}
							</span>
						</div>
					</div>
					<div className="text-right">
						<div className="text-sm font-black text-gray-900 dark:text-white">
							$ {price.toFixed(2)}
						</div>
						<div className={`text-[10px] font-bold ${color}`}>
							{isPositive ? "+" : ""}
							{change.toFixed(2)} ({changePercent.toFixed(2)}%)
						</div>
					</div>
				</div>
			</div>
		);
	}

	// GRID VIEW: Updated to match exact image with amount change added
	return (
		<div className="bg-gray-50 dark:bg-[#0d0d0d] border border-black/5 dark:border-white/5 rounded-3xl p-5 flex flex-col h-full">
			<div className="flex justify-between items-start w-full mb-4">
				<div className="w-10 h-10 rounded-2xl bg-black/5 dark:bg-white/5 flex items-center justify-center shrink-0">
					{logo ? (
						<Image src={logo} alt={name} width={24} height={24} />
					) : (
						<span className="text-sm font-black text-orange-600">
							{symbol?.[0]}
						</span>
					)}
				</div>
				<div className="text-right">
					<div className="text-[10px] font-black text-orange-600 uppercase">
						{symbol}
					</div>
					<div className="text-[9px] font-bold text-gray-400 uppercase">
						MC: {marketCapNumber} {currency}
					</div>
				</div>
			</div>

			<div className="mt-auto">
				<h2 className="text-sm font-black text-gray-900 dark:text-white uppercase truncate mb-1">
					{name}
				</h2>
				<div className="text-lg font-black text-gray-900 dark:text-white mb-0.5">
					$ {price.toFixed(2)}
				</div>
				<div
					className={`text-[11px] font-bold flex items-center gap-0.5 ${color}`}
				>
					{isPositive ? (
						<ArrowUpRight size={10} />
					) : (
						<ArrowDownRight size={10} />
					)}
					{isPositive ? "+" : ""}
					{change?.toFixed(2)} ({changePercent?.toFixed(2)}%)
				</div>

				{/* FOOTER */}
				{showFooter && (
					<div className="mt-6 pt-6 border-t border-black/5 dark:border-white/5">
						<div className="flex justify-between items-center opacity-60 grayscale group-hover:grayscale-0 transition-all">
							<MarketStatus date={date} time={time} session={session} />
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
