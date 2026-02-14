// TypeScript Definitions

export interface LenderOffer {
	name: string;
	nmls: string;
	rate: string;
	apr: string;
	payment: string;
	fees: string;
	link: string;
}

export interface MortgageRateMetric {
	rate: number;
	change: number; // The 'd' value (e.g. -0.05)
	changePercent: number; // The 'dp' value (e.g. -0.82)
}

// 1. Define the inner object first
export interface MortgageInnerData {
	date: string;
	frm30: MortgageRateMetric;
	frm15: MortgageRateMetric;
}

// 2. Define the outer object (the container)
export interface MortgageResponse {
	week: string;
	data: {
		frm_30: string;
		frm_15: string;
		week: string;
	};
}

export interface StockData {
	symbol: string;
	name: string;
	price: number;
	change: number;
	changePercent: number;
	currency: string;
	exchange: string;
	logo?: string;
}

export interface DashboardData {
	mortgage: MortgageInnerData;
	stock: StockData;
}
