"use client";

import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useBudgetStore } from '@/store/useBudgetStore';
import { LogOut } from 'lucide-react';

export function LogoutButton() {
  const router = useRouter();
  const setTransactions = useBudgetStore((state) => state.setTransactions);

  const handleLogout = async () => {
    // 1. Clear sensitive transaction data from local state immediately
    setTransactions([]);

    // 2. Sign out of Supabase (This clears the session cookie)
    await supabase.auth.signOut();

    // 3. Force redirect to landing page
    router.push('/');
    router.refresh(); // Clears any cached layout data
  };

  return (
    <button 
      onClick={handleLogout}
      className="flex items-center gap-3 w-full px-4 py-3 text-gray-500 hover:text-red-500 hover:bg-red-500/5 rounded-xl transition-all font-bold text-sm"
    >
      <LogOut size={18} />
      Log Out
    </button>
  );
}

export default function LogoutPage() {
    return (
        <div className="min-h-screen bg-black flex items-center justify-center">
            <LogoutButton />
        </div>
    );
}