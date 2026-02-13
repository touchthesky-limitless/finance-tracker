import React from 'react';

interface FinancialCardProps {
    title: React.ReactNode;
    value: React.ReactNode;
    subtext: React.ReactNode;
    color?: 'primary' | 'green' | 'red' | 'default';
}

export default function FinancialCard({ title, value, subtext, color='default'}: FinancialCardProps) {
    const colorMap = {
        primary: 'text-primary-600',
        green: 'text-green-600',
        red: 'text-red-600',
        default: 'text-gray-600 dark:text-gray-300',
    }

    const activeColorClass = colorMap[color] || colorMap.default;

    return (
        <div className="bg-white dark:bg-gray-800 dark:border-gray-700 p-6 rounded-2xl shadow-sm border border-gray-100 transition-hover hover:shadow-md">
            <h2 className="dark:text-white text-sm font-semibold text-gray-500 uppercase tracking-wide">
                {title}
            </h2>
            <div className="dark:text-white mt-4 flex items-baseline">
                <div className={`text-4xl font-extrabold ${activeColorClass}`}>
                    {value}
                </div>
            </div>
            <div className="dark:text-white mt-2 text-sm text-gray-400">
                {subtext}
            </div>
        </div>
    );
}