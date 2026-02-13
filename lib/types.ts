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

// 1. Define the inner object first
export interface MortgageInnerData {
	frm_30: number;
	frm_15: number;
	week: string;
	d?: number; // Change value (e.g., -0.05)
	dp?: number; // Percent change (e.g., -0.82%)
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
	c: number; // Current price
	d: number; // change = Current Price - Previous Close
	dp: number; // percent change = (Change / Previous Close) × 100
	pc: number; // previous close
	logo?: string;
}

export interface DashboardData {
	mortgage: MortgageInnerData;
	stock: StockData;
}
