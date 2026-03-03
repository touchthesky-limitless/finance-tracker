import { Percent, Home, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { getTrendProps } from "@/lib/utils";

interface MortgageCardProps {
  program: string;
  rate: number;
  change: number;
  payment?: string;
  date?: string;
}

export default function MortgageCard({
  program,
  rate,
  change,
  payment,
  date,
}: MortgageCardProps) {
  // We'll keep the logic but override the visual output for the "Pro" theme
  const { color } = getTrendProps(change, "liability");
  const isPositive = change > 0;

  return (
    <div className="bg-[#0d0d0d] border border-white/5 rounded-3xl p-8 flex flex-col justify-between h-full hover:border-orange-500/30 transition-all group">
      <div>
        {/* HEADER */}
        <div className="flex justify-between items-start mb-8">
          <div className="w-12 h-12 rounded-2xl bg-orange-600/10 flex items-center justify-center text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-all">
            <Home size={22} strokeWidth={2.5} />
          </div>
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 bg-white/5 px-3 py-1 rounded-full">
            Market Live
          </div>
        </div>

        <div className="space-y-1">
          <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest">
            {program}
          </h2>
          <div className="flex items-baseline gap-2">
            <span className="text-6xl font-black tracking-tighter text-white">
              {rate?.toFixed(2) ?? "0.00"}
            </span>
            <span className="text-orange-600 font-bold text-2xl"><Percent/></span>
          </div>
        </div>

        {/* PAYMENT ESTIMATE */}
        {payment && (
          <div className="mt-4 flex items-center gap-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-tight">
              Monthly Est.
            </span>
            <span className="text-lg font-black text-white">
              ${payment}
            </span>
          </div>
        )}
      </div>

      <div>
        {/* CHANGE INDICATOR */}
        <div className={`mt-8 flex items-center gap-2 ${color} font-black text-sm uppercase tracking-wider`}>
          <div className={`p-1 rounded-md ${isPositive ? 'bg-red-500/10' : 'bg-green-500/10'}`}>
            {isPositive ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
          </div>
          <span>{Math.abs(change || 0).toFixed(3)} Points</span>
        </div>

        {/* FOOTER */}
        <div className="mt-6 pt-6 border-t border-white/5 flex justify-between items-center">
          <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">
            Last Updated
          </span>
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
            {date || "Today"}
          </span>
        </div>
      </div>
    </div>
  );
}