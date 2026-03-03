import MarketStatus from "@/components/MarketStatus";
import { getFullMarketInfo } from "@/lib/date";
import { getTrendProps } from "@/lib/utils";
import Image from "next/image";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

interface FinancialCardProps {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
  exchange: string;
  logo?: string;
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
  const { color } = getTrendProps(change, "asset");
  const isPositive = change > 0;

  return (
    <div className="bg-[#0d0d0d] border border-white/5 rounded-3xl p-8 flex flex-col justify-between h-full hover:border-orange-500/30 transition-all group">
      <div>
        {/* HEADER */}
        <div className="flex justify-between items-start mb-8">
          <div className="w-12 h-12 rounded-2xl bg-white/5 overflow-hidden flex items-center justify-center border border-white/10 group-hover:border-orange-500/50 transition-all">
            {logo ? (
              <Image
                src={logo}
                alt={`${name} logo`}
                width={40}
                height={40}
                className="object-contain p-1.5"
              />
            ) : (
              <span className="text-xl font-black text-orange-600">{symbol?.[0]}</span>
            )}
          </div>
          <div className="flex flex-col items-end">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-600 mb-1">
              {symbol}
            </div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-600">
              {exchange}
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest truncate max-w-50">
            {name}
          </h2>
          <div className="flex items-baseline gap-2">
            <span className="text-6xl font-black tracking-tighter text-white">
              {price?.toFixed(2) ?? "0.00"}
            </span>
            <span className="text-gray-500 font-bold text-xl uppercase tracking-tighter">
              {currency}
            </span>
          </div>
        </div>
      </div>

      <div>
        {/* CHANGE INDICATOR */}
        <div className={`mt-8 flex items-center gap-2 ${color} font-black text-sm uppercase tracking-wider`}>
          <div className={`p-1 rounded-md ${isPositive ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
            {isPositive ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
          </div>
          <span>
            {isPositive ? "+" : ""}
            {change?.toFixed(2)} ({changePercent?.toFixed(2)}%)
          </span>
        </div>

        {/* FOOTER */}
        {showFooter && (
          <div className="mt-6 pt-6 border-t border-white/5">
            <div className="flex justify-between items-center opacity-60 grayscale group-hover:grayscale-0 transition-all">
               <MarketStatus date={date} time={time} session={session} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}