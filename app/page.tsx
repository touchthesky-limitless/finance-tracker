
import Link from 'next/link';
import { Zap, ShieldCheck, BarChart3, ArrowRight } from 'lucide-react';
import Footer from "@/components/Footer";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-orange-500/30">
      {/* Hero Section */}
      <nav className="flex justify-between items-center p-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2 font-black text-xl tracking-tighter">
          <Zap className="text-orange-600 fill-orange-600" size={24} />
          BUDGET PRO
        </div>
        <Link href="/login" className="px-5 py-2 rounded-full border border-white/10 hover:bg-white/5 transition-all text-sm font-bold">
          Sign In
        </Link>
      </nav>

      <main className="max-w-4xl mx-auto pt-24 px-6 text-center">
        <h1 className="text-6xl md:text-8xl font-black tracking-tight mb-6 bg-linear-to-b from-white to-gray-500 bg-clip-text text-transparent">
          Wealth tracking <br /> for the 1%.
        </h1>
        <p className="text-gray-400 text-lg md:text-xl mb-10 max-w-2xl mx-auto font-medium">
          A high-performance interface for managing complex transactions, automation rules, and real-time cash flow.
        </p>
        
        <Link href="/login" className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-8 py-4 rounded-2xl font-black text-lg transition-all shadow-2xl shadow-orange-600/20 hover:scale-105 active:scale-95">
          Get Started Now <ArrowRight size={20} />
        </Link>

        {/* Feature Grid */}
        <div className="grid md:grid-cols-3 gap-6 mt-32 text-left">
          <FeatureCard icon={<ShieldCheck className="text-orange-500" />} title="Bank-Level Security" desc="Encrypted data sync powered by Supabase Auth." />
          <FeatureCard icon={<Zap className="text-orange-500" />} title="Smart Automation" desc="Custom keyword rules for instant categorization." />
          <FeatureCard icon={<BarChart3 className="text-orange-500" />} title="Deep Analytics" desc="Visual totals and cash flow reporting built-in." />
        </div>
      </main>
      <Footer />
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="p-8 rounded-3xl bg-[#0d0d0d] border border-white/5 hover:border-orange-500/20 transition-all">
      <div className="mb-4">{icon}</div>
      <h3 className="font-bold text-lg mb-2">{title}</h3>
      <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}