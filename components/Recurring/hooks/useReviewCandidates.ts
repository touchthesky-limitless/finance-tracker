/**
 * Hook that builds and manages review candidates.
 */
import { useMemo, useState } from "react";
import type {
	Account,
	CustomCategory,
	Transaction,
} from "@/store/useBudgetStore";
import type { MerchantListItem } from "@/components/Merchants/types";
import type { RecurringCandidate, RecurringRecord } from "../types";
import {
	buildRecurringCandidates,
	buildPredictedBillCandidates,
} from "../utils/candidateUtils";
import type { PredictedRecurringBill } from "../utils/candidateUtils";

export function useReviewCandidates({
	transactions,
	merchantItems,
	accounts,
	customCategories,
	records,
	dismissedCandidateKeys,
	suppressedSourceKeys,
	predictedBills,
}: {
	transactions: Transaction[];
	merchantItems: MerchantListItem[];
	accounts: Account[];
	customCategories: CustomCategory[];
	records: RecurringRecord[];
	dismissedCandidateKeys: ReadonlySet<string>;
	suppressedSourceKeys: ReadonlySet<string>;
	predictedBills: PredictedRecurringBill[];
}) {
	const knownSourceKeys = useMemo(
		() => new Set(records.map((r) => r.sourceKey)),
		[records],
	);
	const hiddenSourceKeys = useMemo(
		() => new Set([...dismissedCandidateKeys, ...suppressedSourceKeys]),
		[dismissedCandidateKeys, suppressedSourceKeys],
	);

	const reviewCandidates = useMemo(() => {
		const candidateByKey = new Map<string, RecurringCandidate>();

		for (const candidate of buildRecurringCandidates(
			transactions,
			merchantItems,
			knownSourceKeys,
			hiddenSourceKeys,
			accounts,
			customCategories,
		)) {
			candidateByKey.set(candidate.key, candidate);
		}

		for (const candidate of buildPredictedBillCandidates(
			predictedBills,
			merchantItems,
			transactions,
			knownSourceKeys,
			hiddenSourceKeys,
			accounts,
			customCategories,
		)) {
			candidateByKey.set(candidate.key, candidate);
		}

		return [...candidateByKey.values()]
			.sort((first, second) => {
				return (
					second.transactions.length - first.transactions.length ||
					first.merchantName.localeCompare(second.merchantName, "en-US", {
						sensitivity: "base",
					})
				);
			})
			.slice(0, 12);
	}, [
		transactions,
		merchantItems,
		accounts,
		customCategories,
		knownSourceKeys,
		hiddenSourceKeys,
		predictedBills,
	]);

	const [reviewIndex, setReviewIndex] = useState(0);
	const activeCandidate =
		reviewCandidates[reviewIndex] ?? reviewCandidates[0] ?? null;

	return { reviewCandidates, activeCandidate, reviewIndex, setReviewIndex };
}
