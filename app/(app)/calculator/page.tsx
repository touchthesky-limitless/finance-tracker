import React from "react";
import RefinanceCalculator from "@/components/RefinanceCalculator";
import { getMortgageData } from "@/lib/mortgage";
import { Calculator, Zap } from "lucide-react";

export default async function CalculatorPage() {
    // 1. Fetch real rate (server side)
    const mortgageData = await getMortgageData();
    const currentRate = mortgageData ? mortgageData.frm30.rate : 6;

    return (
        <main className="min-h-screen bg-black py-16 px-6 lg:px-12 relative overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-0 w-125 h-125 bg-orange-600/10 blur-[150px] rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none" />
            
            <div className="max-w-6xl mx-auto relative z-10">
                {/* Header Section */}
                <div className="flex flex-col items-center text-center mb-16 space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-600/10 border border-orange-600/20 text-orange-500 text-[10px] font-black uppercase tracking-[0.2em] mb-4">
                        <Zap size={12} className="fill-orange-500" />
                        Professional Grade
                    </div>
                    
                    <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter leading-none">
                        Refinance <span className="text-gray-500">Analysis.</span>
                    </h1>
                    
                    <p className="max-w-2xl text-gray-500 text-lg font-medium leading-relaxed">
                        Optimize your debt structure with real-time market insights. 
                        Today’s benchmark: <span className="text-white font-black">{currentRate.toFixed(2)}%</span>
                    </p>
                </div>

                {/* Calculator Container */}
                <div className="relative group">
                    {/* Decorative Border Effect */}
                    <div className="absolute -inset-0.5 bg-linear-to-b from-orange-600/20 to-transparent rounded-[40px] opacity-0 group-hover:opacity-100 transition duration-500" />
                    
                    <div className="relative bg-[#0d0d0d] border border-white/5 rounded-[38px] p-2 md:p-8 shadow-2xl">
                        <RefinanceCalculator nationalRate={currentRate} />
                    </div>
                </div>

                {/* Footnote / Disclaimer */}
                <div className="mt-12 flex items-start gap-4 p-6 rounded-3xl bg-white/2 border border-white/5">
                    <div className="p-2 rounded-xl bg-white/5 text-gray-400">
                        <Calculator size={20} />
                    </div>
                    <p className="text-[11px] text-gray-600 uppercase tracking-widest font-bold leading-loose">
                        Disclaimer: This calculation is an estimate for informational purposes only. 
                        Actual rates and terms depend on credit score, LTV, and lender-specific requirements. 
                        Consult with a licensed professional before making financial decisions.
                    </p>
                </div>
            </div>
        </main>
    );
}