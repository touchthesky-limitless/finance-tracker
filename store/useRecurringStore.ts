"use client";

import { create } from "zustand";

import type {
	RecurringRecord,
} from "@/components/Recurring/types";
import {
	fetchRecurringData as fetchRecurringDataFromSupabase,
	saveRecurringData,
	type RecurringDataSnapshot,
} from "@/lib/recurring/recurringRepository";

const LEGACY_STORAGE_KEY =
	"recurring-storage";

interface PersistRecordOptions {
	suppressSourceKey?: string;
}

interface RecurringState
	extends RecurringDataSnapshot {
	hasHydrated: boolean;
	isLoading: boolean;
	error: string | null;
	lastSyncedAt: string | null;
	setHasHydrated: (
		hydrated: boolean,
	) => void;
	clearError: () => void;
	fetchRecurringData: (
		force?: boolean,
	) => Promise<void>;
	upsertRecord: (
		record: RecurringRecord,
		options?: PersistRecordOptions,
	) => Promise<void>;
	removeRecord: (
		recordId: string,
		options?: PersistRecordOptions,
	) => Promise<void>;
	dismissCandidate: (
		candidateKey: string,
	) => Promise<void>;
	suppressSource: (
		sourceKey: string,
	) => Promise<void>;
	restoreSource: (
		sourceKey: string,
	) => Promise<void>;
}

let writeQueue: Promise<void> =
	Promise.resolve();

function uniqueStrings(
	values: string[],
): string[] {
	return [
		...new Set(
			values
				.map((value) => value.trim())
				.filter(Boolean),
		),
	];
}

function getErrorMessage(
	error: unknown,
): string {
	return error instanceof Error
		? error.message
		: "Recurring data could not be saved.";
}

function readLegacySnapshot():
	| RecurringDataSnapshot
	| null {
	if (
		typeof window === "undefined"
	) {
		return null;
	}

	const raw =
		window.localStorage.getItem(
			LEGACY_STORAGE_KEY,
		);

	if (!raw) {
		return null;
	}

	try {
		const envelope = JSON.parse(raw) as {
			state?: Partial<
				RecurringDataSnapshot
			>;
		};
		const state = envelope.state;

		if (!state) {
			return null;
		}

		return {
			records:
				Array.isArray(state.records)
					? state.records
					: [],
			dismissedCandidateKeys:
				Array.isArray(
					state.dismissedCandidateKeys,
				)
					? uniqueStrings(
							state.dismissedCandidateKeys,
						)
					: [],
			suppressedSourceKeys:
				Array.isArray(
					state.suppressedSourceKeys,
				)
					? uniqueStrings(
							state.suppressedSourceKeys,
						)
					: [],
		};
	} catch {
		return null;
	}
}

function hasSnapshotData(
	snapshot: RecurringDataSnapshot,
): boolean {
	return (
		snapshot.records.length > 0 ||
		snapshot.dismissedCandidateKeys
			.length > 0 ||
		snapshot.suppressedSourceKeys
			.length > 0
	);
}

function clearLegacySnapshot(): void {
	if (
		typeof window === "undefined"
	) {
		return;
	}

	window.localStorage.removeItem(
		LEGACY_STORAGE_KEY,
	);
}

function enqueueSnapshotSave(
	snapshot: RecurringDataSnapshot,
): Promise<void> {
	const task = writeQueue.then(
		async () => {
			await saveRecurringData(
				snapshot,
			);
		},
	);

	writeQueue = task.catch(() => {});

	return task;
}

function getSnapshot(
	state: RecurringState,
): RecurringDataSnapshot {
	return {
		records: state.records,
		dismissedCandidateKeys:
			state.dismissedCandidateKeys,
		suppressedSourceKeys:
			state.suppressedSourceKeys,
	};
}

export const useRecurringStore =
	create<RecurringState>()(
		(set, get) => ({
			records: [],
			dismissedCandidateKeys: [],
			suppressedSourceKeys: [],
			hasHydrated: false,
			isLoading: false,
			error: null,
			lastSyncedAt: null,

			setHasHydrated: (
				hasHydrated,
			) => {
				set({ hasHydrated });
			},

			clearError: () => {
				set({ error: null });
			},

			fetchRecurringData: async (
				force = false,
			) => {
				if (
					get().isLoading ||
					(
						!force &&
						get().hasHydrated
					)
				) {
					return;
				}

				set({
					isLoading: true,
					error: null,
				});

				try {
					let snapshot =
						await fetchRecurringDataFromSupabase();

					const legacySnapshot =
						readLegacySnapshot();

					if (
						snapshot === null &&
						legacySnapshot &&
						hasSnapshotData(
							legacySnapshot,
						)
					) {
						snapshot =
							await saveRecurringData(
								legacySnapshot,
							);
					}

					const finalSnapshot =
						snapshot ?? {
							records: [],
							dismissedCandidateKeys:
								[],
							suppressedSourceKeys:
								[],
						};

					clearLegacySnapshot();

					set({
						...finalSnapshot,
						hasHydrated: true,
						isLoading: false,
						error: null,
						lastSyncedAt:
							new Date().toISOString(),
					});
				} catch (error) {
					set({
						hasHydrated: true,
						isLoading: false,
						error:
							getErrorMessage(
								error,
							),
					});

					throw error;
				}
			},

			upsertRecord: async (
				record,
				options,
			) => {
				const previous =
					getSnapshot(get());
				const suppressSourceKey =
					options?.suppressSourceKey
						?.trim();

				const nextRecords =
					previous.records.some(
						(item) => {
							return (
								item.id === record.id
							);
						},
					)
						? previous.records.map(
								(item) => {
									return item.id ===
										record.id
										? record
										: item;
								},
							)
						: [
								...previous.records,
								record,
							];

				const nextSuppressed =
					uniqueStrings([
						...previous
							.suppressedSourceKeys,
						...(suppressSourceKey
							? [
									suppressSourceKey,
								]
							: []),
					]).filter((key) => {
						return (
							key !==
							record.sourceKey
						);
					});

				const next: RecurringDataSnapshot =
					{
						...previous,
						records: nextRecords,
						suppressedSourceKeys:
							nextSuppressed,
					};

				set({
					...next,
					error: null,
				});

				try {
					await enqueueSnapshotSave(
						next,
					);

					set({
						lastSyncedAt:
							new Date().toISOString(),
					});
				} catch (error) {
					set({
						error:
							getErrorMessage(
								error,
							),
					});

					await get()
						.fetchRecurringData(true)
						.catch(() => {});

					throw error;
				}
			},

			removeRecord: async (
				recordId,
				options,
			) => {
				const previous =
					getSnapshot(get());
				const suppressSourceKey =
					options?.suppressSourceKey
						?.trim();

				const next: RecurringDataSnapshot =
					{
						...previous,
						records:
							previous.records.filter(
								(record) => {
									return (
										record.id !==
										recordId
									);
								},
							),
						suppressedSourceKeys:
							suppressSourceKey
								? uniqueStrings([
										...previous
											.suppressedSourceKeys,
										suppressSourceKey,
									])
								: previous
										.suppressedSourceKeys,
					};

				set({
					...next,
					error: null,
				});

				try {
					await enqueueSnapshotSave(
						next,
					);

					set({
						lastSyncedAt:
							new Date().toISOString(),
					});
				} catch (error) {
					set({
						error:
							getErrorMessage(
								error,
							),
					});

					await get()
						.fetchRecurringData(true)
						.catch(() => {});

					throw error;
				}
			},

			dismissCandidate: async (
				candidateKey,
			) => {
				const cleanKey =
					candidateKey.trim();

				if (
					!cleanKey ||
					get()
						.dismissedCandidateKeys
						.includes(cleanKey)
				) {
					return;
				}

				const previous =
					getSnapshot(get());
				const next: RecurringDataSnapshot =
					{
						...previous,
						dismissedCandidateKeys:
							uniqueStrings([
								...previous
									.dismissedCandidateKeys,
								cleanKey,
							]),
					};

				set({
					...next,
					error: null,
				});

				try {
					await enqueueSnapshotSave(
						next,
					);
				} catch (error) {
					set({
						error:
							getErrorMessage(
								error,
							),
					});

					await get()
						.fetchRecurringData(true)
						.catch(() => {});

					throw error;
				}
			},

			suppressSource: async (
				sourceKey,
			) => {
				const cleanKey =
					sourceKey.trim();

				if (
					!cleanKey ||
					get()
						.suppressedSourceKeys
						.includes(cleanKey)
				) {
					return;
				}

				const previous =
					getSnapshot(get());
				const next: RecurringDataSnapshot =
					{
						...previous,
						suppressedSourceKeys:
							uniqueStrings([
								...previous
									.suppressedSourceKeys,
								cleanKey,
							]),
					};

				set({
					...next,
					error: null,
				});

				try {
					await enqueueSnapshotSave(
						next,
					);
				} catch (error) {
					set({
						error:
							getErrorMessage(
								error,
							),
					});

					await get()
						.fetchRecurringData(true)
						.catch(() => {});

					throw error;
				}
			},

			restoreSource: async (
				sourceKey,
			) => {
				const cleanKey =
					sourceKey.trim();
				const previous =
					getSnapshot(get());

				if (
					!previous
						.suppressedSourceKeys
						.includes(cleanKey)
				) {
					return;
				}

				const next: RecurringDataSnapshot =
					{
						...previous,
						suppressedSourceKeys:
							previous
								.suppressedSourceKeys
								.filter((key) => {
									return (
										key !== cleanKey
									);
								}),
					};

				set({
					...next,
					error: null,
				});

				try {
					await enqueueSnapshotSave(
						next,
					);
				} catch (error) {
					set({
						error:
							getErrorMessage(
								error,
							),
					});

					await get()
						.fetchRecurringData(true)
						.catch(() => {});

					throw error;
				}
			},
		}),
	);
