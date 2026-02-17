"use client";

import { createContext, useContext, ReactNode } from "react";

// Define the two tiers for your budget mechanisms
type BudgetVersion = "free" | "premium"| "pro";

const VersionContext = createContext<BudgetVersion | undefined>(undefined);

export function VersionProvider({
	version,
	children,
}: {
	version: BudgetVersion;
	children: ReactNode;
}) {
	return (
		<VersionContext.Provider value={version}>
			{children}
		</VersionContext.Provider>
	);
}

export function useVersion() {
	const context = useContext(VersionContext);

	// Safety check to ensure data isolation between free and premium
	if (!context) {
		throw new Error("useVersion must be used within a VersionProvider");
	}

	return context;
}
