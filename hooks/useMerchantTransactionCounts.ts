"use client";

import {
	useCallback,
	useMemo,
} from "react";

import {
	getTransactionMerchantId,
	normalizeMerchantName,
	useUnifiedMerchants,
} from "@/hooks/useUnifiedMerchants";
import type { Transaction } from "@/store/useBudgetStore";
import type { TransactionFilterOption } from "@/components/Transactions/transactionFilters";

export interface MerchantCountTarget {
	id?: string | null;
	name: string;
}

interface MerchantTransactionCountResult {
	merchantOptions: TransactionFilterOption[];
	countByMerchantId: ReadonlyMap<string, number>;
	countByMerchantName: ReadonlyMap<string, number>;

	getMerchantTransactionCount: (
		merchant: MerchantCountTarget,
	) => number;
}

export function useMerchantTransactionCounts(
	transactions: readonly Transaction[],
): MerchantTransactionCountResult {
	const {
		allUnifiedMerchants,
		getMerchantId,
	} = useUnifiedMerchants();

	const countData = useMemo(() => {
		const countByMerchantId = new Map<string, number>();
		const countByMerchantName = new Map<string, number>();
		const merchantNameByNormalizedName =
			new Map<string, string>();

		/*
		 * Include every merchant record, even merchants that
		 * currently have zero transactions.
		 */
		for (const merchant of allUnifiedMerchants) {
			const merchantName = merchant.name.trim();
			const normalizedName =
				normalizeMerchantName(merchantName);

			if (
				merchantName &&
				!merchantNameByNormalizedName.has(
					normalizedName,
				)
			) {
				merchantNameByNormalizedName.set(
					normalizedName,
					merchantName,
				);
			}
		}

		for (const transaction of transactions) {
			const merchantName =
				transaction.merchant?.trim();

			if (!merchantName) {
				continue;
			}

			const normalizedName =
				normalizeMerchantName(merchantName);

			if (
				!merchantNameByNormalizedName.has(
					normalizedName,
				)
			) {
				merchantNameByNormalizedName.set(
					normalizedName,
					merchantName,
				);
			}

			countByMerchantName.set(
				normalizedName,
				(countByMerchantName.get(normalizedName) ?? 0) +
					1,
			);

			const merchantId =
				getTransactionMerchantId(transaction) ??
				getMerchantId(merchantName);

			if (merchantId) {
				countByMerchantId.set(
					merchantId,
					(countByMerchantId.get(merchantId) ?? 0) +
						1,
				);
			}
		}

		const merchantOptions: TransactionFilterOption[] = [
			...merchantNameByNormalizedName.entries(),
		]
			.map(([normalizedName, merchantName]) => {
				return {
					value: merchantName,
					label: merchantName,
					count:
						countByMerchantName.get(
							normalizedName,
						) ?? 0,
				};
			})
			.sort((first, second) => {
				return (
					(second.count ?? 0) -
						(first.count ?? 0) ||
					first.label.localeCompare(second.label)
				);
			});

		return {
			countByMerchantId,
			countByMerchantName,
			merchantOptions,
		};
	}, [
		allUnifiedMerchants,
		getMerchantId,
		transactions,
	]);

	const getMerchantTransactionCount = useCallback(
		(merchant: MerchantCountTarget): number => {
			const merchantId = merchant.id?.trim();

			if (merchantId) {
				const countById =
					countData.countByMerchantId.get(
						merchantId,
					);

				if (countById !== undefined) {
					return countById;
				}
			}

			return (
				countData.countByMerchantName.get(
					normalizeMerchantName(merchant.name),
				) ?? 0
			);
		},
		[
			countData.countByMerchantId,
			countData.countByMerchantName,
		],
	);

	return {
		merchantOptions: countData.merchantOptions,
		countByMerchantId:
			countData.countByMerchantId,
		countByMerchantName:
			countData.countByMerchantName,
		getMerchantTransactionCount,
	};
}