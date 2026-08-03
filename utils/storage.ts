/**
 * @file storage.ts
 * @description Safe utilities for reading and writing to browser localStorage.
 * Handles SSR safety, JSON parsing errors, and automatic cleanup of corrupted keys.
 * Used across the app to persist user preferences like table sorting and column visibility.
 */
export function readLocalStorage<T>(key: string, fallback: T): T {
	if (typeof window === "undefined") return fallback;
	try {
		const stored = window.localStorage.getItem(key);
		if (!stored) return fallback;
		return JSON.parse(stored) as T;
	} catch {
		window.localStorage.removeItem(key);
		return fallback;
	}
}

export function writeLocalStorage(key: string, value: unknown): void {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(key, JSON.stringify(value));
	} catch (error) {
		console.error(`Failed to write localStorage key "${key}":`, error);
	}
}
