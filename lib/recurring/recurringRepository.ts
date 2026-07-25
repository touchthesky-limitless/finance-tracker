"use client";

import type {
	RecurringFrequency,
	RecurringRecord,
	RecurringStatus,
	RecurringType,
} from "@/components/Recurring/types";
import { createClient } from "@/lib/supabase";

const supabase = createClient();

export interface RecurringDataSnapshot {
	records: RecurringRecord[];
	dismissedCandidateKeys: string[];
	suppressedSourceKeys: string[];
}

interface RecurringDataRow {
	user_id: string;
	records: unknown;
	dismissed_candidate_keys: unknown;
	suppressed_source_keys: unknown;
	created_at: string;
	updated_at: string;
}

const RECURRING_TYPES = new Set<RecurringType>([
	"income",
	"expense",
	"credit-card",
]);

const RECURRING_FREQUENCIES =
	new Set<RecurringFrequency>([
		"weekly",
		"every-2-weeks",
		"every-4-weeks",
		"twice-monthly-first-fifteenth",
		"twice-monthly-fifteenth-last",
		"monthly",
		"every-2-months",
		"every-3-months",
		"every-4-months",
		"every-6-months",
		"yearly",
	]);

const RECURRING_STATUSES =
	new Set<RecurringStatus>([
		"active",
		"canceled",
	]);

const RECURRING_DATA_SELECT =
	"user_id, records, dismissed_candidate_keys, suppressed_source_keys, created_at, updated_at";

function isRecord(
	value: unknown,
): value is Record<string, unknown> {
	return (
		typeof value === "object" &&
		value !== null &&
		!Array.isArray(value)
	);
}

function readString(
	value: unknown,
	fallback = "",
): string {
	return typeof value === "string"
		? value
		: fallback;
}

function readNullableString(
	value: unknown,
): string | null {
	return typeof value === "string"
		? value
		: null;
}

function readStringArray(
	value: unknown,
): string[] {
	if (!Array.isArray(value)) {
		return [];
	}

	return [
		...new Set(
			value.filter(
				(item): item is string => {
					return (
						typeof item === "string" &&
						item.trim().length > 0
					);
				},
			),
		),
	];
}

function readRecurringType(
	value: unknown,
): RecurringType {
	return (
		typeof value === "string" &&
		RECURRING_TYPES.has(
			value as RecurringType,
		)
	)
		? (value as RecurringType)
		: "expense";
}

function readRecurringFrequency(
	value: unknown,
): RecurringFrequency {
	return (
		typeof value === "string" &&
		RECURRING_FREQUENCIES.has(
			value as RecurringFrequency,
		)
	)
		? (value as RecurringFrequency)
		: "monthly";
}

function readRecurringStatus(
	value: unknown,
): RecurringStatus {
	return (
		typeof value === "string" &&
		RECURRING_STATUSES.has(
			value as RecurringStatus,
		)
	)
		? (value as RecurringStatus)
		: "active";
}

function readAmount(value: unknown): number {
	const amount = Number(value);

	return Number.isFinite(amount)
		? amount
		: 0;
}

function readRecurringRecord(
	value: unknown,
): RecurringRecord | null {
	if (!isRecord(value)) {
		return null;
	}

	const id = readString(value.id).trim();
	const sourceKey =
		readString(value.sourceKey).trim();
	const merchantName =
		readString(value.merchantName).trim();

	if (!id || !sourceKey || !merchantName) {
		return null;
	}

	const now = new Date().toISOString();

	return {
		id,
		sourceKey,
		merchantId:
			readNullableString(value.merchantId),
		merchantName,
		logoUrl:
			readNullableString(value.logoUrl),
		amount: readAmount(value.amount),
		type: readRecurringType(value.type),
		frequency:
			readRecurringFrequency(
				value.frequency,
			),
		startingDate:
			readString(value.startingDate),
		status:
			readRecurringStatus(value.status),
		accountId:
			readNullableString(value.accountId),
		accountName:
			readString(value.accountName),
		categoryId:
			readNullableString(value.categoryId),
		categoryName:
			readString(value.categoryName),
		createdAt:
			readString(value.createdAt, now),
		updatedAt:
			readString(value.updatedAt, now),
	};
}

function readRecurringRecords(
	value: unknown,
): RecurringRecord[] {
	if (!Array.isArray(value)) {
		return [];
	}

	const records: RecurringRecord[] = [];
	const seenIds = new Set<string>();

	for (const item of value) {
		const record = readRecurringRecord(item);

		if (
			!record ||
			seenIds.has(record.id)
		) {
			continue;
		}

		seenIds.add(record.id);
		records.push(record);
	}

	return records;
}

function mapRecurringDataRow(
	row: RecurringDataRow,
): RecurringDataSnapshot {
	return {
		records:
			readRecurringRecords(row.records),
		dismissedCandidateKeys:
			readStringArray(
				row.dismissed_candidate_keys,
			),
		suppressedSourceKeys:
			readStringArray(
				row.suppressed_source_keys,
			),
	};
}

async function getAuthenticatedUserId(): Promise<
	string
> {
	const {
		data: { user },
		error,
	} = await supabase.auth.getUser();

	if (error) {
		throw new Error(error.message);
	}

	if (!user) {
		throw new Error(
			"You must be signed in to save recurring data.",
		);
	}

	return user.id;
}

export async function fetchRecurringData(): Promise<
	RecurringDataSnapshot | null
> {
	const userId =
		await getAuthenticatedUserId();

	const { data, error } = await supabase
		.from("recurring_data")
		.select(RECURRING_DATA_SELECT)
		.eq("user_id", userId)
		.maybeSingle();

	if (error) {
		throw new Error(error.message);
	}

	if (!data) {
		return null;
	}

	return mapRecurringDataRow(
		data as RecurringDataRow,
	);
}

export async function saveRecurringData(
	snapshot: RecurringDataSnapshot,
): Promise<RecurringDataSnapshot> {
	const userId =
		await getAuthenticatedUserId();

	const { data, error } = await supabase
		.from("recurring_data")
		.upsert(
			{
				user_id: userId,
				records: snapshot.records,
				dismissed_candidate_keys:
					snapshot.dismissedCandidateKeys,
				suppressed_source_keys:
					snapshot.suppressedSourceKeys,
			},
			{
				onConflict: "user_id",
			},
		)
		.select(RECURRING_DATA_SELECT)
		.single();

	if (error) {
		throw new Error(error.message);
	}

	return mapRecurringDataRow(
		data as RecurringDataRow,
	);
}
