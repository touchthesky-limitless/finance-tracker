/**
 * Frequency‑related constants and label helpers.
 */
import type { RecurringFrequency } from "../types/recurringTypes";

export const FREQUENCY_LABELS: Record<RecurringFrequency, string> = {
	"weekly": "Every week",
	"every-2-weeks": "Every 2 weeks",
	"every-4-weeks": "Every 4 weeks",
	"twice-monthly-first-fifteenth": "Twice a month (1st & 15th)",
	"twice-monthly-fifteenth-last": "Twice a month (15th & last day)",
	"monthly": "Every month",
	"every-2-months": "Every 2 months",
	"every-3-months": "Every 3 months",
	"every-4-months": "Every 4 months",
	"every-6-months": "Every 6 months",
	"yearly": "Every year",
};

export const RECURRING_FREQUENCIES: ReadonlyArray<RecurringFrequency> = [
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
];


export function getFrequencyLabel(value: RecurringFrequency): string {
	return FREQUENCY_LABELS[value];
}
