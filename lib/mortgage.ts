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
		if (!latestList.length || !latestList[0].data) return null;

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

		// 4. Math
		const currentRate = parseFloat(currentData.data.frm_30);
		const previousRate = previousData
			? parseFloat(previousData.data.frm_30)
			: currentRate;

		const change = currentRate - previousRate;
		const percentChange =
			previousRate !== 0 ? (change / previousRate) * 100 : 0;

		return {
			frm_30: currentRate,
			frm_15: parseFloat(currentData.data.frm_15),
			week: currentData.data.week,
			d: change,
			dp: percentChange,
		};
	} catch (error) {
		console.log("Mortgage API Error: ", error);
		return null;
	}
}
