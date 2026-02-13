import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";

const TIMEZONE = "America/New_York";

// Market hours in minutes since midnight
const PRE_MARKET_START = 4 * 60; // 4:00 AM
const MARKET_OPEN = 9 * 60 + 30; // 9:30 AM
const MARKET_CLOSE = 16 * 60; // 4:00 PM
const AFTER_HOURS_END = 20 * 60; // 8:00 PM

/** Returns the current date/time in New York timezone */
function getZonedNow(): Date {
	return toZonedTime(new Date(), TIMEZONE);
}

/**
 * Returns the current date formatted for display.
 * Example: "Feb 13, 2026"
 */
export function getMarketDate(): string {
	const zonedDate = getZonedNow();
	return format(zonedDate, "MMM d, yyyy");
}

/**
 * Returns the current time in EST/EDT with status.
 * Example: "11:23 AM EST (Open)"
 */
export function getMarketTime(): string {
	const zonedDate = getZonedNow();
	return format(zonedDate, "h:mm a");
}

/**
 * Returns the market session based on NYSE hours.
 * Possible return values:
 * - "Pre-Market"  4:00 AM - 9:30 AM
 * - "Open"        9:30 AM - 4:00 PM
 * - "After-Hours" 4:00 PM - 8:00 PM
 * - "Closed"      8:00 PM - 4:00 AM
 */
export function getMarketSession():
	| "Pre-Market"
	| "Open"
	| "After-Hours"
	| "Closed" {
	const zonedDate = getZonedNow();
	const day = zonedDate.getDay(); // 0 = Sunday, 6 = Saturday
	const totalMinutes = zonedDate.getHours() * 60 + zonedDate.getMinutes();

	// 1. Check for Weekends FIRST
	if (day === 0 || day === 6) {
		return "Closed";
	}

	if (totalMinutes >= PRE_MARKET_START && totalMinutes < MARKET_OPEN)
		return "Pre-Market";
	if (totalMinutes >= MARKET_OPEN && totalMinutes < MARKET_CLOSE) return "Open";
	if (totalMinutes >= MARKET_CLOSE && totalMinutes < AFTER_HOURS_END)
		return "After-Hours";
	return "Closed";
}

/**
 * Returns all market info at once: date, time, and session status.
 * Useful for React components or API responses.
 */
export function getFullMarketInfo() {
	const date = getMarketDate();
	const time = getMarketTime();
	const session = getMarketSession();

	return { date, time, session };
}

// Mannual ver
// export function getMarketDate(): string {
// 	return new Intl.DateTimeFormat("en-US", {
// 		month: "short",
// 		day: "numeric",
// 		year: "numeric",
// 		timeZone: "America/New_York", // EST
// 	}).format(new Date());
// }

// export function getMarketTime(): string {
//     const now = new Date();

//     // get the time string
//     const timeString = new Intl.DateTimeFormat("en-US", {
// 		hour: "numeric",
// 		minute: "2-digit",
// 		hour12: true,
// 		timeZone: "America/New_York", // EST
// 	}).format(now);

//     // Determine if the market is currently open (9:30 AM - 4:00 PM ET)
//     // use 24-hour format for easier comparison
//     const parts = new Intl.DateTimeFormat("en-US", {
// 		hour: "numeric",
// 		minute: "numeric",
// 		hour12: false,
// 		timeZone: "America/New_York", // EST
// 	}).formatToParts(now);

//     const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
//     const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
//     const totalMinutes = hour * 60 + minute;

//     // Market Hours: 9:30 AM (570 min) to 4:00 PM (960 min)
//     const isMarketOpen = totalMinutes >= 570 && totalMinutes < 960;
//     return `${timeString} EST${isMarketOpen ? '' : ' (Closed)'}`;
// }
