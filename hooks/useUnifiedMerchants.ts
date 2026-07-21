"use client";

import { useCallback, useEffect, useMemo } from "react";

import { useBudgetStore, type Transaction } from "@/store/useBudgetStore";


export interface UnifiedMerchant {
	id: string;
	name: string;
	isCustom: boolean;
	isSystem: boolean;
	userId?: string | null;
}

type CustomMerchantRow = {
	id: string;
	user_id?: string | null;
	name?: string | null;
	merchant?: string | null;
	is_system?: boolean | null;
};

type TransactionWithMerchantId = Transaction & {
	merchant_id?: string | null;
};

export function normalizeMerchantName(value: string): string {
	return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function getTransactionMerchantId(
	transaction: Transaction,
): string | undefined {
	const merchantId = (
		transaction as TransactionWithMerchantId
	).merchant_id?.trim();

	return merchantId || undefined;
}

function getCustomMerchantName(merchant: CustomMerchantRow): string {
	return merchant.name?.trim() || merchant.merchant?.trim() || "";
}

export function useUnifiedMerchants() {
	const transactions = useBudgetStore((state) => {
		return state.transactions;
	});

	const merchants = useBudgetStore((state) => {
		return state.merchants;
	});

	const fetchMerchants = useBudgetStore((state) => {
		return state.fetchMerchants;
	});

	useEffect(() => {
		void fetchMerchants();
	}, [fetchMerchants]);

	const allUnifiedMerchants = useMemo<UnifiedMerchant[]>(() => {
		const merchantById = new Map<string, UnifiedMerchant>();

		const merchantIdByName = new Map<string, string>();

		// Add custom merchants first so their database IDs win when
		// a transaction has the same merchant name but no merchant_id.
		for (const customMerchant of merchants) {
			const id = customMerchant.id?.trim();
			const name = getCustomMerchantName(customMerchant);
			const normalizedName = normalizeMerchantName(name);

			if (!id || !normalizedName) {
				continue;
			}

			const isSystem = customMerchant.is_system === true;

			const merchant: UnifiedMerchant = {
				id,
				name,
				isCustom: !isSystem,
				isSystem,
				userId: customMerchant.user_id,
			};

			merchantById.set(id, merchant);
			merchantIdByName.set(normalizedName, id);
		}

		// Include merchants already linked to transactions.
		for (const transaction of transactions) {
			const id = getTransactionMerchantId(transaction);
			const name = transaction.merchant?.trim();
			const normalizedName = normalizeMerchantName(name || "");

			if (!id || !normalizedName) {
				continue;
			}

			if (!merchantById.has(id)) {
				merchantById.set(id, {
					id,
					name,
					isCustom: false,
					isSystem: false,
				});
			}

			if (!merchantIdByName.has(normalizedName)) {
				merchantIdByName.set(normalizedName, id);
			}
		}

		return Array.from(merchantById.values()).sort((first, second) => {
			return first.name.localeCompare(second.name);
		});
	}, [merchants, transactions]);

	const merchantById = useMemo(() => {
		return new Map(
			allUnifiedMerchants.map((merchant) => {
				return [merchant.id, merchant] as const;
			}),
		);
	}, [allUnifiedMerchants]);

	const merchantIdByName = useMemo(() => {
		const result = new Map<string, string>();

		// Custom merchants should win over transaction-derived records.
		for (const merchant of allUnifiedMerchants) {
			const normalizedName = normalizeMerchantName(merchant.name);

			const existingId = result.get(normalizedName);

			if (!existingId || merchant.isCustom) {
				result.set(normalizedName, merchant.id);
			}
		}

		return result;
	}, [allUnifiedMerchants]);

	const getMerchantId = useCallback(
		(merchantName: string): string | undefined => {
			return merchantIdByName.get(normalizeMerchantName(merchantName));
		},
		[merchantIdByName],
	);

	const getMerchantById = useCallback(
		(merchantId: string): UnifiedMerchant | undefined => {
			return merchantById.get(merchantId);
		},
		[merchantById],
	);

	return {
		allUnifiedMerchants,
		customMerchants: merchants,
		getMerchantById,
		getMerchantId,
	};
}
