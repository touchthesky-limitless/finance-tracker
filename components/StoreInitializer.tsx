"use client";

import { useEffect } from "react";
import { useBudgetStore } from "@/store/useBudgetStore";
import { supabase } from "@/lib/supabase";

export default function StoreInitializer() {
    const fetchTransactions = useBudgetStore((state) => state.fetchTransactions);
    const setTransactions = useBudgetStore((state) => state.setTransactions);

    useEffect(() => {
        // 1. Initial Fetch
        fetchTransactions();

        // 2. Listen for Auth Changes (Login/Logout)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, _session) => {
            if (event === 'SIGNED_IN') {
                fetchTransactions();
            }
            if (event === 'SIGNED_OUT') {
                // Clear the store so the next person doesn't see your data
                setTransactions([]); 
            }
        });

        return () => subscription.unsubscribe();
    }, [fetchTransactions, setTransactions]);

    return null;
}