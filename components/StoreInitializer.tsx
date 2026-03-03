"use client";

import { useEffect, useRef } from "react";
import { useBudgetStore } from "@/store/useBudgetStore";
import { supabase } from "@/lib/supabase";

export default function StoreInitializer() {
    const fetchTransactions = useBudgetStore((state) => state.fetchTransactions);
    const setTransactions = useBudgetStore((state) => state.setTransactions);
    
    // 1. Add this selector! 
    // This is the signal that Zustand has finished loading the local cache.
    const isHydrated = useBudgetStore((state) => state.hasHydrated);
    
    const initialized = useRef(false);

    useEffect(() => {
        // 2. Only attempt the initial fetch once the store IS hydrated.
        if (isHydrated && !initialized.current) {
            fetchTransactions();
            initialized.current = true;
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_IN') {
                fetchTransactions();
            }
            if (event === 'SIGNED_OUT') {
                setTransactions([]); 
                initialized.current = false; // Allow re-fetch on next login
            }
        });

        return () => subscription.unsubscribe();
        
    }, [fetchTransactions, setTransactions, isHydrated]); // Add isHydrated to deps

    return null;
}