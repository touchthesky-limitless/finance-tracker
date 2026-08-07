/**
 * Date formatting and parsing utilities.
 */
export function formatMonthTitle(month: Date): string {
	return new Intl.DateTimeFormat("en-US", {
		month: "long",
		year: "numeric",
		timeZone: "UTC",
	}).format(month);
}

export function formatLongDate(value: Date | string): string {
	const date = value instanceof Date ? value : parseDate(value);
	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
		timeZone: "UTC",
	}).format(date);
}

export function formatShortDate(value: Date | string): string {
	const date = value instanceof Date ? value : parseDate(value);
	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		timeZone: "UTC",
	}).format(date);
}

export function toDateInputValue(date: Date): string {
	return date.toISOString().slice(0, 10);
}

export function parseDate(value: string): Date {
	const timestamp = Date.parse(`${value.slice(0, 10)}T12:00:00.000Z`);
	return Number.isFinite(timestamp) ? new Date(timestamp) : new Date();
}

export function formatRelativeDays(date: Date, now = new Date()): string {
	const target = Date.UTC(
		date.getUTCFullYear(),
		date.getUTCMonth(),
		date.getUTCDate(),
	);
	const current = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
	const days = Math.round((target - current) / 86_400_000);
	if (days === 0) return "today";
	if (days > 0) return `${days} ${days === 1 ? "day" : "days"}`;
	const absolute = Math.abs(days);
	return `${absolute} ${absolute === 1 ? "day" : "days"} ago`;
}
