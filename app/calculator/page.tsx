import React from "react";
import RefinanceCalculator from "@/components/RefinanceCalculator";
import { getMortgageData } from "@/lib/mortgage";

export default async function CalculatorPage() {
	// 1. Fetch real rate (server side)
	const mortgageData = await getMortgageData();
	const currentRate = mortgageData ? mortgageData.frm_30 : 6;

	return (
		<main className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 transition-colors duration-300">
			<div className="max-w-5xl mx-auto">
				{/* Header */}
				<div className="text-center mb-10">
					<h1 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
						Refinance Calculator
					</h1>
					<p className="text-gray-500 dark:text-gray-400 mt-2">
						Estimate your new rate based on today&apos;s national average of
						<span className="font-bold text-primary-600 dark:text-primary-400">
							{" "}
							{currentRate.toFixed(2)}%
						</span>
					</p>
				</div>

				{/* The Calculator Component */}
				<RefinanceCalculator nationalRate={currentRate} />
			</div>
		</main>
	);
}
