"use client";

import { useState, useMemo } from "react";
import { RefiCalculator } from "@/lib/refi-calculator";
import { LenderOffer } from "@/lib/types";

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

	const [offers, setOffers] = useState<LenderOffer[]>([]);

	useMemo(() => {
		const newOffers = RefiCalculator({
			loanAmount: Number(mortgageBalance) || 0,
			creditScore,
			nationalRate,
		});
		setOffers(newOffers);
	}, [mortgageBalance, creditScore, nationalRate]);

	return (
		<div className="dark:bg-gray-800 dark:border-gray-700 w-full max-w-5xl mx-auto bg-gray-50 p-6 rounded-xl border border-gray-200">
			{/* INPUTS */}
			<div className="bg-primary-900 p-6 rounded-lg shadow-lg mb-8 text-white">
				<div className="grid grid-cols-2 md:grid-cols-5 gap-4">
					<div>
						<label className="text-xs font-semibold opacity-80 uppercase">
							Zip Code
						</label>
						<input
							type="text"
							value={zip}
							onChange={(e) => setZip(e.target.value)}
							className="w-full bg-primary-800 border-none rounded p-2 text-white font-bold mt-1"
						/>
					</div>
					<div>
						<label className="text-xs font-semibold opacity-80 uppercase">
							Property Value
						</label>
						<input
							type="number"
							value={propertyValue}
							onChange={(e) => setPropertyValue(Number(e.target.value))}
							className="w-full bg-primary-800 border-none rounded p-2 text-white font-bold mt-1"
						/>
					</div>
					<div>
						<label className="text-xs font-semibold opacity-80 uppercase">
							Balance
						</label>
						<input
							type="number"
							value={mortgageBalance}
							onChange={(e) => setMortgageBalance(Number(e.target.value))}
							className="w-full bg-primary-800 border-none rounded p-2 text-white font-bold mt-1"
						/>
					</div>
					<div className="md:col-span-2">
						<label className="text-xs font-semibold opacity-80 uppercase">
							Credit Score
						</label>
						<select
							value={creditScore}
							onChange={(e) => setCreditScore(Number(e.target.value))}
							className="w-full bg-primary-800 border-none rounded p-2 text-white font-bold mt-1 cursor-pointer"
						>
							<option value={780}>Excellent (780-850)</option>
							<option value={760}>Very Good (760-779)</option>
							<option value={720}>Good (720-759)</option>
							<option value={680}>Fair (680-719)</option>
							<option value={620}>Poor (620-679)</option>
						</select>
					</div>
				</div>
			</div>

			{/* DYNAMIC RESULTS */}
			<div className="space-y-4">
				{offers.map((offer, index) => (
					<div
						key={index}
						className="bg-white text-gray-900 dark:bg-gray-800 dark:border-gray-700  p-6 rounded-lg flex flex-col md:flex-row items-center justify-between shadow-sm border border-gray-200"
					>
						<div className="w-full md:w-1/4 mb-4 md:mb-0">
							<h3 className="text-2xl font-bold text-primary-700">
								{offer.name}
							</h3>
							<p className="text-xs text-gray-400 font-mono">
								NMLS #{offer.nmls}
							</p>
							{/* <button className="text-primary-600 text-sm font-semibold mt-1 hover:underline">
								Show details ⌄
							</button> */}
						</div>

						<div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full md:w-3/4 items-center">
							<div className="text-left">
								<div className="flex items-center gap-1 group relative">
									<p className="text-xs text-gray-500 uppercase font-semibold border-b border-dotted border-gray-400 cursor-help">
										APR
									</p>
									{/* Tooltip on Hover */}
									<div className="absolute bottom-full mb-2 hidden w-40 p-2 bg-gray-800 text-white text-xs rounded shadow-lg group-hover:block">
										Includes fees & closing costs.
									</div>
								</div>
								<p className="text-3xl font-extrabold text-gray-900 dark:text-white">
									{offer.apr}%
								</p>
							</div>

							<div className="text-left">
								<p className="text-xs text-gray-500 uppercase font-semibold">
									Interest Rate
								</p>
								<p className="text-3xl font-extrabold text-gray-900 dark:text-white">
									{offer.rate}%
								</p>
							</div>

							<div className="text-left">
								<p className="text-xs text-gray-500 uppercase font-semibold">
									Mo. Payment
								</p>
								<p className="text-2xl font-bold text-gray-900 dark:text-white">
									${offer.payment}
									<span className="text-sm font-normal text-gray-400">/mo</span>
								</p>
							</div>

							<div className="flex flex-col items-end">
								<p className="text-xs text-gray-500 uppercase font-semibold mb-1">
									Total Fees: ${offer.fees}
								</p>
								<button className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 px-6 rounded-md shadow-md transition w-full md:w-auto">
									GET MY RATE
								</button>
							</div>
						</div>
					</div>
				))}
			</div>

			<p className="text-xs text-gray-400 mt-6 text-center">
				*Rates estimated using National Avg ({nationalRate}%) adjusted for
				credit & lender fees.
			</p>
		</div>
	);
}
