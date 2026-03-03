"use client";

import { useState } from "react";
import { RefiCalculator } from "@/lib/refi-calculator";
import { ChevronRight, ShieldCheck } from "lucide-react";

interface RefinanceCalculatorProps {
    nationalRate: number;
}

export default function RefinanceCalculator({
    nationalRate,
}: RefinanceCalculatorProps) {
    const [zip, setZip] = useState("75202");
    const [propertyValue, setPropertyValue] = useState(474000);
    const [mortgageBalance, setMortgageBalance] = useState(350000);
    const [creditScore, setCreditScore] = useState(780);

    // 2. Calculate offers directly. React is fast enough to do this every render.
    const offers = RefiCalculator({
        loanAmount: Number(mortgageBalance) || 0,
        creditScore,
        nationalRate,
    });

    return (
        <div className="w-full space-y-12">
            {/* INPUT PANEL - THE "COCKPIT" */}
            <div className="bg-[#121212] border border-white/10 p-8 rounded-4xl shadow-2xl">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <InputGroup label="Zip Code">
                        <input
                            type="text"
                            value={zip}
                            onChange={(e) => setZip(e.target.value)}
                            className="w-full bg-black border border-white/10 rounded-xl p-3 text-white font-black focus:border-orange-600 outline-none transition-all"
                        />
                    </InputGroup>

                    <InputGroup label="Property Value">
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                            <input
                                type="number"
                                value={propertyValue}
                                onChange={(e) => setPropertyValue(Number(e.target.value))}
                                className="w-full bg-black border border-white/10 rounded-xl p-3 pl-8 text-white font-black focus:border-orange-600 outline-none transition-all"
                            />
                        </div>
                    </InputGroup>

                    <InputGroup label="Loan Balance">
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                            <input
                                type="number"
                                value={mortgageBalance}
                                onChange={(e) => setMortgageBalance(Number(e.target.value))}
                                className="w-full bg-black border border-white/10 rounded-xl p-3 pl-8 text-white font-black focus:border-orange-600 outline-none transition-all"
                            />
                        </div>
                    </InputGroup>

                    <InputGroup label="Credit Tier">
                        <select
                            value={creditScore}
                            onChange={(e) => setCreditScore(Number(e.target.value))}
                            className="w-full bg-black border border-white/10 rounded-xl p-3 text-white font-black focus:border-orange-600 outline-none transition-all cursor-pointer appearance-none"
                        >
                            <option value={780}>EXCELLENT (780+)</option>
                            <option value={720}>GOOD (720-779)</option>
                            <option value={620}>FAIR (620-719)</option>
                        </select>
                    </InputGroup>
                </div>
            </div>

            {/* OFFERS LIST */}
            <div className="space-y-6">
                <div className="flex items-center justify-between px-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">
                        Available Re-structure Options
                    </h3>
                    <div className="flex items-center gap-2 text-[10px] font-black text-orange-600 uppercase tracking-widest">
                        <ShieldCheck size={14} /> Verified Lenders
                    </div>
                </div>

                {offers.map((offer, index) => (
                    <div
                        key={index}
                        className="bg-[#0d0d0d] border border-white/5 p-8 rounded-4xl flex flex-col lg:flex-row items-center justify-between group hover:border-orange-600/30 transition-all"
                    >
                        {/* Lender Info */}
                        <div className="w-full lg:w-1/4 mb-6 lg:mb-0">
                            <div className="flex items-center gap-3 mb-1">
                                <div className="w-2 h-2 rounded-full bg-orange-600 shadow-[0_0_8px_rgba(234,88,12,0.6)]" />
                                <h3 className="text-xl font-black text-white uppercase tracking-tighter">
                                    {offer.name}
                                </h3>
                            </div>
                            <p className="text-[10px] text-gray-600 font-black tracking-widest uppercase">
                                NMLS ID: {offer.nmls}
                            </p>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-12 w-full lg:w-2/3 items-center">
                            <Stat label="APR" value={`${offer.apr}%`} highlight />
                            <Stat label="Rate" value={`${offer.rate}%`} />
                            <div className="hidden md:block">
                                <Stat label="Monthly Est." value={`$${offer.payment}`} sub="/mo" />
                            </div>
                        </div>

                        {/* CTA */}
                        <div className="w-full lg:w-auto mt-8 lg:mt-0">
                            <button className="w-full lg:w-auto bg-white text-black hover:bg-orange-600 hover:text-white font-black py-4 px-8 rounded-2xl transition-all flex items-center justify-center gap-2 group/btn">
                                LOCK RATE
                                <ChevronRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* UI Sub-components for cleaner code */
function InputGroup({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
                {label}
            </label>
            {children}
        </div>
    );
}

function Stat({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
    return (
        <div className="text-left">
            <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-1">{label}</p>
            <p className={`text-4xl font-black tracking-tighter ${highlight ? 'text-orange-600' : 'text-white'}`}>
                {value}
                {sub && <span className="text-xs font-bold text-gray-600 ml-1">{sub}</span>}
            </p>
        </div>
    );
}