export type CashFlowTimeframe = "month" | "quarter" | "year";
export type CashFlowView = "bar" | "sankey";
export type CashFlowBreakdown = "category" | "group" | "merchant";
export type SankeyBreakdown = "category" | "group" | "both";
export type HiddenMode = "visible" | "hidden" | "all";

export interface CashFlowFilters {
	accountIds: string[];
	tags: string[];
	hidden: HiddenMode;
}

export interface CashFlowPeriod {
	key: string;
	label: string;
	shortLabel: string;
	start: Date;
	end: Date;
	income: number;
	expenses: number;
	savings: number;
	savingsRate: number;
	forecast: boolean;
}

export type CashFlowEntityKind =
	| "root"
	| "category"
	| "group"
	| "merchant";

export interface CashFlowBreakdownItem {
	id: string;
	label: string;
	parentLabel: string;
	amount: number;
	share: number;
	iconName: string;
	color: string;
	detailUrl: string | null;
	entityKind: Exclude<CashFlowEntityKind, "root">;
	entityId: string | null;
	parentEntityId: string | null;
}

export interface SankeyNodeDatum {
	id: string;
	label: string;
	amount: number;
	share: number;
	color: string;
	iconName?: string;
	level: number;
	detailUrl?: string | null;
	entityKind?: CashFlowEntityKind;
	entityId?: string | null;
	parentEntityId?: string | null;
}

export interface SankeyLinkDatum {
	source: string;
	target: string;
	value: number;
	color: string;
}
