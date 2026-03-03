"use client";

import { useEffect, useRef } from "react";
import { useBudgetStore } from "@/store/useBudgetStore";
import { supabase } from "@/lib/supabase";

export default function StoreInitializer() {
    // 1. Use selective selectors to prevent the component from 
    // re-rendering when 'transactions' or 'isLoading' change.
    const fetchTransactions = useBudgetStore((state) => state.fetchTransactions);
    const setTransactions = useBudgetStore((state) => state.setTransactions);
    
    // 2. A ref ensures we don't double-fetch during React StrictMode 
    // or rapid navigation.
    const initialized = useRef(false);

    useEffect(() => {
        if (!initialized.current) {
            fetchTransactions();
            initialized.current = true;
        }

        // 3. Listen for Auth events. This only runs once on mount.
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_IN') {
                fetchTransactions();
            }
            if (event === 'SIGNED_OUT') {
                setTransactions([]); 
            }
        });

        return () => subscription.unsubscribe();
        
        // Including these satisfies the linter. Because they are 
        // from a Zustand store, they are stable and won't trigger re-runs.
    }, [fetchTransactions, setTransactions]);

    return null;
}