/**
 * @file useLocalStorage.ts
 * @description A reusable React hook that synchronises a state variable with localStorage.
 * Automatically reads the initial value from storage, updates storage on state changes,
 * and gracefully handles SSR environments.
 *
 * @template T - The type of the stored value.
 * @param key - The localStorage key.
 * @param initialValue - The fallback value if the key does not exist.
 * @returns A tuple [storedValue, setStoredValue] identical to useState.
 */
import { useState, useEffect, Dispatch, SetStateAction } from "react";
import { readLocalStorage, writeLocalStorage } from "@/utils/storage";

export function useLocalStorage<T>(
	key: string,
	initialValue: T,
): [T, Dispatch<SetStateAction<T>>] {
	const [stored, setStored] = useState<T>(() =>
		readLocalStorage(key, initialValue),
	);

	useEffect(() => {
		writeLocalStorage(key, stored);
	}, [key, stored]);

	return [stored, setStored];
}
