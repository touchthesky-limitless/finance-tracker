import { MortgageInnerData, MortgageResponse } from "./types";

export async function getMortgageData(): Promise<MortgageInnerData | null> {
	const mortgageKey = process.env.NINJA_API_KEY;
	if (!mortgageKey) return null;

	try {
		// 1. Fetch latest
		const latestRes = await fetch(
			"https://api.api-ninjas.com/v1/mortgagerate",
			{
				headers: { "X-Api-Key": mortgageKey || "" },
				next: { revalidate: 3600 },
			},
		);

		const latestList = (await latestRes.json()) as MortgageResponse[];

		if (!latestList || !latestList.length || !latestList[0].data) {
			console.warn("Mortgage API returned no data.");
			return null;
		}

		const currentData = latestList[0];

		// 2. Calculate Last Week's Date
		const dateObj = new Date(currentData.data.week);
		dateObj.setDate(dateObj.getDate() - 7);
		const lastWeekDate = dateObj.toISOString().split("T")[0];

		// 3. Fetch history
		const historyRes = await fetch(
			`https://api.api-ninjas.com/v1/mortgagerate?date=${lastWeekDate}`,
			{
				headers: { "X-Api-Key": mortgageKey || "" },
				next: { revalidate: 86400 },
			},
		);

		const historyList = (await historyRes.json()) as MortgageResponse[];
		const previousData = historyList.length > 0 ? historyList[0] : null;

		// 4. Helper Function to Calculate Metrics
        // This avoids writing the same math twice for 30y and 15y
		const calculateMetric = (currentVal: string, previousVal: string | undefined) => {
			const currentRate = parseFloat(currentVal);
			const previousRate = previousVal
			? parseFloat(previousVal)
			: currentRate;
			
			const change = currentRate - previousRate;
			const changePercent =
			previousRate !== 0 ? (change / previousRate) * 100 : 0;
			
			return {
				rate: currentRate,
				change: change,
				changePercent: changePercent,
			} 
		};

		// 5. Build and Return the Clean Data Object
		return {
			date: currentData.data.week,
			frm15: calculateMetric(currentData.data.frm_15, previousData?.data.frm_15),
			frm30: calculateMetric(currentData.data.frm_30, previousData?.data.frm_30),
		};
	} catch (error) {
		console.log("Mortgage API Error: ", error);
		return null;
	}
}
