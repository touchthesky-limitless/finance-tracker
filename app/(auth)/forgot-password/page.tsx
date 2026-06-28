"use client";

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<{ type: 'idle' | 'success' | 'error', message: string }>({ type: 'idle', message: '' });
  const [loading, setLoading] = useState(false);
  
  const supabase = createClient();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: 'idle', message: '' });

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
    });

    if (error) {
      setStatus({ type: 'error', message: error.message });
    } else {
      setStatus({ type: 'success', message: 'Check your email for the reset link!' });
      setEmail(''); // Clear the input field on success
    }
    
    setLoading(false);
  };

  return (
    <div className="flex justify-center items-center min-h-[60vh] p-4">
      <form 
        onSubmit={handleReset} 
        className="w-full max-w-sm space-y-4 p-8 border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg dark:shadow-black/50 bg-white dark:bg-[#121212]"
      >
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Reset Password
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Enter your email address and we will send you a secure link to reset your password.
        </p>

        <input 
          type="email" 
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
          }} 
          placeholder="Email address" 
          className="w-full p-3 bg-white dark:bg-black/40 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none transition-all"
          required 
        />

        <button 
          type="submit" 
          disabled={loading || !email}
          className="w-full bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 text-white font-semibold p-3 rounded-lg transition-colors disabled:bg-gray-400 dark:disabled:bg-gray-800 dark:disabled:text-gray-500 cursor-pointer disabled:cursor-not-allowed"
        >
          {loading ? "Sending..." : "Send Reset Link"}
        </button>

        {/* Visual Feedback Message */}
        {status.message && (
          <div className={`p-3 rounded-lg text-sm ${
            status.type === 'error' 
              ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-transparent dark:border-red-900/50' 
              : 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 border border-transparent dark:border-green-900/50'
          }`}>
            {status.message}
          </div>
        )}

        {/* Helpful navigation link */}
        <div className="text-center pt-2">
          <Link href="/login" className="text-sm text-orange-600 dark:text-orange-500 hover:underline">
            Back to Login
          </Link>
        </div>
      </form>
    </div>
  );
}