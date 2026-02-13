export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 mt-12">
      <div className="max-w-7xl mx-auto px-6 py-8">
        
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          {/* Brand & Copyright */}
          <div className="text-center md:text-left">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">
              Finance Tracker
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              &copy; {currentYear} Finance Tracker. All rights reserved.
            </p>
          </div>

          {/* Links */}
          <div className="flex gap-6 text-sm font-medium text-gray-600 dark:text-gray-400">
            <a href="#" className="hover:text-blue-600 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-blue-600 transition-colors">Terms of Service</a>
            <a href="https://api-ninjas.com" target="_blank" rel="noreferrer" className="hover:text-blue-600 transition-colors">
              Mortgage Data by API Ninjas
            </a>
            <a href="https://finnhub.io" target="_blank" rel="noreferrer" className="hover:text-blue-600 transition-colors">
              Financial Data by Finnhub
            </a>
          </div>
        </div>

        {/* Financial Disclaimer (Crucial for "Pro" look) */}
        <div className="mt-8 pt-8 border-t border-gray-100 dark:border-gray-800 text-center md:text-left">
          <p className="text-xs text-gray-400 leading-relaxed max-w-4xl">
            Disclaimer: Market data provided for informational purposes only and is not intended for trading purposes or financial advice. 
            Prices may be delayed by up to 15 minutes. Finance Tracker is not liable for any errors or delays in content, or for any actions taken in reliance on any content.
          </p>
        </div>

      </div>
    </footer>
  );
}