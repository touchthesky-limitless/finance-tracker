"use client";

import { useMemo } from "react";

import {
	getTransactionMerchantId,
	useUnifiedMerchants,
} from "@/hooks/useUnifiedMerchants";
import { useBudgetStore } from "@/store/useBudgetStore";
import type { MerchantListItem } from "@/components/Merchants/types";

export function useMerchantOptions(): MerchantListItem[] {
	const transactions = useBudgetStore((state) => {
		return state.transactions;
	});

	const {
		allUnifiedMerchants,
		getMerchantId,
	} = useUnifiedMerchants();

	return useMemo(() => {
		const countByMerchantId = new Map<string, number>();

		for (const transaction of transactions) {
			const merchantName =
				transaction.merchant?.trim();

			if (!merchantName) {
				continue;
			}

			const merchantId =
				getTransactionMerchantId(transaction) ??
				getMerchantId(merchantName);

			if (!merchantId) {
				continue;
			}

			countByMerchantId.set(
				merchantId,
				(countByMerchantId.get(merchantId) ?? 0) + 1,
			);
		}

		return allUnifiedMerchants
			.map((merchant): MerchantListItem => {
				return {
					id: merchant.id,
					name: merchant.name,

					/*
					 * Your current merchant schema does not have
					 * a logo field. Keep this ready for later.
					 */
					logoUrl: null,

					transactionCount:
						countByMerchantId.get(merchant.id) ?? 0,
				};
			})
			.sort((first, second) => {
				return (
					second.transactionCount -
						first.transactionCount ||
					first.name.localeCompare(second.name)
				);
			});
	}, [
		allUnifiedMerchants,
		getMerchantId,
		transactions,
	]);
}