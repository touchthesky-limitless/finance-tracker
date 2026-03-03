import React from 'react';
import Link from 'next/link';
import { Zap, ShieldCheck, BarChart3, ArrowRight } from 'lucide-react';
import Footer from "@/components/Footer";

// FIX: Ensure this is the DEFAULT export for Next.js to recognize the route
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-orange-500/30 relative overflow-hidden">
      
      {/* Background Ambient Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-250 h-150 bg-orange-600/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-125 h-125 bg-orange-900/10 blur-[150px] rounded-full pointer-events-none" />

      {/* Navigation */}
      <nav className="relative z-10 flex justify-between items-center p-8 max-w-7xl mx-auto">
        <div className="flex items-center gap-2 font-black text-2xl tracking-tighter">
          <Zap className="text-orange-600 fill-orange-600" size={28} />
          BUDGET <span className="text-gray-500">PRO</span>
        </div>
        <Link 
          href="/login" 
          className="px-6 py-2.5 rounded-xl border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all text-xs font-black uppercase tracking-widest"
        >
          Sign In
        </Link>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 max-w-5xl mx-auto pt-32 pb-40 px-6 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-600/10 border border-orange-600/20 text-orange-500 text-[10px] font-black uppercase tracking-[0.2em] mb-8">
            <Zap size={12} className="fill-orange-500" />
            Institutional Grade
        </div>

        <h1 className="text-6xl md:text-9xl font-black tracking-tighter mb-8 leading-[0.9] bg-linear-to-b from-white via-white to-gray-600 bg-clip-text text-transparent">
          Wealth tracking <br /> for the 1%.
        </h1>
        
        <p className="text-gray-400 text-lg md:text-xl mb-12 max-w-2xl mx-auto font-medium leading-relaxed">
          A high-performance interface for managing complex transactions, 
          automation rules, and real-time cash flow optimization.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              href="/login" 
              className="inline-flex items-center gap-3 bg-orange-600 hover:bg-orange-500 text-white px-10 py-5 rounded-2xl font-black text-lg transition-all shadow-[0_20px_50px_rgba(234,88,12,0.3)] hover:scale-105 active:scale-95"
            >
              Get Started <ArrowRight size={22} />
            </Link>
            <button className="px-10 py-5 rounded-2xl bg-white/5 border border-white/10 text-white font-black hover:bg-white/10 transition-all">
                View Demo
            </button>
        </div>

        {/* Feature Grid */}
        <div className="grid md:grid-cols-3 gap-8 mt-48 text-left">
          <FeatureCard 
            icon={<ShieldCheck size={24} />} 
            title="Bank-Level Security" 
            desc="Encrypted data sync powered by Supabase Auth and end-to-end security protocols." 
          />
          <FeatureCard 
            icon={<Zap size={24} />} 
            title="Smart Automation" 
            desc="Advanced keyword engines for instant, zero-touch transaction categorization." 
          />
          <FeatureCard 
            icon={<BarChart3 size={24} />} 
            title="Deep Analytics" 
            desc="Professional-grade reporting on net worth, cash flow, and asset allocation." 
          />
        </div>
      </main>

      <Footer />
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="group p-10 rounded-4xl bg-[#080808] border border-white/5 hover:border-orange-600/30 transition-all duration-500 relative overflow-hidden">
      {/* Subtle hover glow */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-orange-600/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <div className="mb-6 p-3 w-fit rounded-xl bg-orange-600/10 border border-orange-600/20 text-orange-500 group-hover:scale-110 transition-transform duration-500">
        {icon}
      </div>
      <h3 className="font-black text-xl mb-3 uppercase tracking-tight">{title}</h3>
      <p className="text-gray-500 text-sm leading-relaxed font-medium">{desc}</p>
    </div>
  );
}