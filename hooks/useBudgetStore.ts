import { useVersion } from "@/app/context/VersionContext";
import { createBudgetStore } from "@/store/createBudgetStore";

// 1. Create the store instances immediately at the top level
// This is allowed because it happens during module load, not during a React render.
const stores = {
    free: createBudgetStore("free"),
    premium: createBudgetStore("premium"),
    pro: createBudgetStore("pro"),
};

export function useBudgetStore() {
    // 2. Get the current version from your context
    const version = useVersion(); 
    
    // 3. Return the pre-existing store. No modification happens here!
    // cast it to "free" | "premium" | "pro" to satisfy TypeScript.
    return stores[version as keyof typeof stores];
}