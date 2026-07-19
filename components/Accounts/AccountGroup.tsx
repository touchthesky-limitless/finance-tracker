import { formatCurrency } from "@/utils/formatters";
import { ChevronDown } from "lucide-react";

interface Account {
	id: number | string;
	name: string;
	balance: number;
	lastUpdated: string;
}

interface AccountGroupProps {
	title: string;
	total: number;
	change: number;
	accounts: Account[];
}

export default function AccountGroup({ title, total, change = 0, accounts }: AccountGroupProps) {
    return (
        <div className="bg-white dark:bg-[#1c1c1c] border border-gray-200 dark:border-[#2a2a2a] rounded-xl overflow-hidden transition-colors">
            <button className="w-full flex items-center justify-between p-6 border-b border-gray-200 dark:border-[#2a2a2a] hover:bg-gray-50 dark:hover:bg-[#252525] transition-colors">
                <div className="flex items-center gap-2">
                    <ChevronDown size={20} className="text-gray-400" />
                    <h2 className="font-bold text-gray-900 dark:text-[#e0e0e0]">{title}</h2>
                    <span className="text-emerald-500 text-sm">
                        {formatCurrency(change)}
                    </span>
                </div>
                <span className="font-bold text-gray-900 dark:text-white">
                    {formatCurrency(total)}
                </span>
            </button>

            <div className="divide-y divide-gray-200 dark:divide-[#2a2a2a]">
                {accounts.map((acc) => (
                    <div key={acc.id} className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-[#252525] transition-colors">
                        <span className="font-medium text-sm text-gray-700 dark:text-[#e0e0e0]">
                            {acc.name}
                        </span>
                        <div className="text-right">
                            <div className="font-bold text-sm text-gray-900 dark:text-white">
                                {formatCurrency(acc.balance)}
                            </div>
                            <div className="text-xs text-gray-500">
                                Last update: {acc.lastUpdated}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}