"use client";

import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useBudgetStore } from '@/store/useBudgetStore';
import { LogOut } from 'lucide-react';
import { useState } from 'react';

export function LogoutButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  
  // 1. Get the clearData action to wipe the entire store (transactions, rules, tags)
  const clearData = useBudgetStore((state) => state.clearData);

  const handleLogout = async () => {
    setIsPending(true);
    
    // 2. Wipe local store immediately (Instant UI feedback)
    clearData();

    // 3. Sign out of Supabase
    await supabase.auth.signOut();

    // 4. Force a hard refresh and redirect
    // We refresh first to clear any cached Next.js Layout data
    router.refresh();
    router.push('/');
  };

  return (
    <button 
      onClick={handleLogout}
      disabled={isPending}
      className="flex items-center gap-3 w-full px-4 py-3 text-gray-500 hover:text-orange-500 hover:bg-orange-500/5 rounded-xl transition-all font-bold text-sm disabled:opacity-50 group"
    >
      <LogOut 
        size={18} 
        className={`transition-colors ${isPending ? 'animate-pulse text-orange-600' : 'group-hover:text-orange-500'}`} 
      />
      {isPending ? "Signing Out..." : "Log Out"}
    </button>
  );
}