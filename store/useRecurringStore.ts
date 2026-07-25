"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { RecurringRecord } from "@/components/Recurring/types";

interface RecurringState {
	records: RecurringRecord[];
	dismissedCandidateKeys: string[];
	suppressedSourceKeys: string[];
	hasHydrated: boolean;
	setHasHydrated: (hydrated: boolean) => void;
	upsertRecord: (record: RecurringRecord) => void;
	removeRecord: (recordId: string) => void;
	dismissCandidate: (candidateKey: string) => void;
	suppressSource: (sourceKey: string) => void;
	restoreSource: (sourceKey: string) => void;
}

export const useRecurringStore = create<RecurringState>()(
	persist(
		(set) => ({
			records: [],
			dismissedCandidateKeys: [],
			suppressedSourceKeys: [],
			hasHydrated: false,
			setHasHydrated: (hasHydrated) => set({ hasHydrated }),
			upsertRecord: (record) => {
				set((state) => {
					const records = state.records.some((item) => item.id === record.id)
						? state.records.map((item) =>
								item.id === record.id ? record : item,
							)
						: [...state.records, record];
					return {
						records,
						suppressedSourceKeys: state.suppressedSourceKeys.filter(
							(key) => key !== record.sourceKey,
						),
					};
				});
			},
			removeRecord: (recordId) => {
				set((state) => ({
					records: state.records.filter((record) => record.id !== recordId),
				}));
			},
			dismissCandidate: (candidateKey) => {
				set((state) => ({
					dismissedCandidateKeys: state.dismissedCandidateKeys.includes(
						candidateKey,
					)
						? state.dismissedCandidateKeys
						: [...state.dismissedCandidateKeys, candidateKey],
				}));
			},
			suppressSource: (sourceKey) => {
				set((state) => ({
					suppressedSourceKeys: state.suppressedSourceKeys.includes(sourceKey)
						? state.suppressedSourceKeys
						: [...state.suppressedSourceKeys, sourceKey],
				}));
			},
			restoreSource: (sourceKey) => {
				set((state) => ({
					suppressedSourceKeys: state.suppressedSourceKeys.filter(
						(key) => key !== sourceKey,
					),
				}));
			},
		}),
		{
			name: "recurring-storage",
			version: 2,
			storage: createJSONStorage(() => localStorage),
			migrate: (persistedState) => {
				const state = persistedState as Partial<RecurringState>;
				return {
					records: state.records ?? [],
					dismissedCandidateKeys: state.dismissedCandidateKeys ?? [],
					suppressedSourceKeys: state.suppressedSourceKeys ?? [],
				};
			},
			partialize: (state) => ({
				records: state.records,
				dismissedCandidateKeys: state.dismissedCandidateKeys,
				suppressedSourceKeys: state.suppressedSourceKeys,
			}),
			onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
		},
	),
);
