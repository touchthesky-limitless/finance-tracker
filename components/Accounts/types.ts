export type ChartType = "performance" | "breakdown";
export type DateRange = "1M" | "3M" | "6M" | "YTD" | "1Y" | "ALL";
export type Timeframe = "month" | "year";
export type SummaryMode = "totals" | "percent";

export type AccountKind =
	| "cash"
	| "investment"
	| "real-estate"
	| "vehicle"
	| "valuable"
	| "other-asset"
	| "credit-card"
	| "mortgage"
	| "loan"
	| "other-liability";

export interface AccountRecord {
	id: string;
	name: string;
	type: string;
	kind: AccountKind;
	group: "Cash" | "Investments" | "Other Assets" | "Credit Cards" | "Loans";
	balance: number;
	lastUpdated: string;
	lastFour?: string;
	institution?: string;
	isLiability: boolean;
}

export interface ManualAccount {
	id: string;
	name: string;
	kind: AccountKind;
	type: string;
	balance: number;
	createdAt: string;
}

export interface ChartPoint {
	label: string;
	date: Date;
	value: number;
}

export interface FilterNode {
	id: string;
	label: string;
	children?: FilterNode[];
	account?: AccountRecord;
}

export interface AccountSummary {
	assets: number;
	liabilities: number;
	netWorth: number;
}

export interface AccountGroupView {
	group: AccountRecord["group"];
	accounts: AccountRecord[];
	total: number;
	isLiability: boolean;
}
