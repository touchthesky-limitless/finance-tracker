import { Download } from "lucide-react";

export default function SummarySidebar() {
    return (
        <div className="bg-white dark:bg-[#1c1c1c] border border-gray-200 dark:border-[#2a2a2a] rounded-xl p-6 h-fit sticky top-8 transition-colors text-gray-900 dark:text-[#e0e0e0]">
            <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold">Summary</h3>
                <div className="flex bg-gray-100 dark:bg-[#2a2a2a] rounded-lg p-1 text-xs transition-colors">
                    <button className="px-3 py-1 bg-white dark:bg-[#3a3a3a] text-gray-900 dark:text-white shadow-sm dark:shadow-none rounded-md transition-colors">
                        Totals
                    </button>
                    <button className="px-3 py-1 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                        Percent
                    </button>
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex justify-between font-bold">
                    <span>Assets</span>
                    <span>$0.00</span>
                </div>
                <div className="flex justify-between font-bold">
                    <span>Liabilities</span>
                    <span>$1,396.76</span>
                </div>
                {/* Progress bar background updated for light/dark mode */}
                <div className="h-2 w-full bg-gray-200 dark:bg-[#2a2a2a] rounded-full overflow-hidden transition-colors">
                    <div className="h-full bg-red-500 w-[100%]" />
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-red-500">● Credit Cards</span>
                    <span>$1,396.76</span>
                </div>
            </div>

            <button className="w-full mt-8 flex items-center justify-center gap-2 py-3 border border-gray-200 dark:border-[#2a2a2a] hover:bg-gray-50 dark:hover:bg-[#252525] text-gray-700 dark:text-gray-300 rounded-lg text-sm transition-colors">
                <Download size={16} /> Download CSV
            </button>
        </div>
    );
}