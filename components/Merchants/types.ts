/**
 * Core merchant data structure used throughout the app.
 */
export interface MerchantListItem {
	id: string;
	name: string;
	logoUrl?: string | null;
	transactionCount: number;
}
