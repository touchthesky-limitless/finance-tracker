import { Zap } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-black border-t border-white/5 mt-20 pb-12">
      <div className="max-w-7xl mx-auto px-6 py-12">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          {/* Brand & Copyright */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-black text-xl tracking-tighter text-white">
              <Zap className="text-orange-600 fill-orange-600" size={20} />
              BUDGET<span className="text-orange-600">PRO</span>
            </div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-widest">
              &copy; {currentYear} Finance Tracker. All rights reserved.
            </p>
          </div>

          {/* Links - Styled with Orange Hovers */}
          <div className="grid grid-cols-2 md:flex gap-x-12 gap-y-4 text-xs font-bold uppercase tracking-widest text-gray-400">
            <a href="#" className="hover:text-orange-500 transition-colors">Privacy</a>
            <a href="#" className="hover:text-orange-500 transition-colors">Terms</a>
            <a 
              href="https://api-ninjas.com" 
              target="_blank" 
              rel="noreferrer" 
              className="hover:text-orange-500 transition-colors"
            >
              API Ninjas
            </a>
            <a 
              href="https://finnhub.io" 
              target="_blank" 
              rel="noreferrer" 
              className="hover:text-orange-500 transition-colors"
            >
              Finnhub
            </a>
          </div>
        </div>

        {/* Financial Disclaimer - Crucial for "Pro" look */}
        <div className="mt-12 pt-8 border-t border-white/5">
          <p className="text-[10px] text-gray-600 leading-relaxed max-w-5xl uppercase tracking-tighter font-medium">
            <span className="text-gray-400 font-bold mr-1">Disclaimer:</span> 
            Market data provided for informational purposes only and is not intended for trading purposes or financial advice. 
            Prices may be delayed by up to 15 minutes. Finance Tracker is not liable for any errors or delays in content, 
            or for any actions taken in reliance on any content. Use of this data is at your own risk.
          </p>
        </div>
      </div>
    </footer>
  );
}