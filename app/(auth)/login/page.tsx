"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Zap, Mail, Lock, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Destructure from your hook
  const { handleAuth, loading, error } = useAuth();
  const router = useRouter();

  // Explicitly typing the event as React.FormEvent<HTMLFormElement>
  const onAuthSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // handleAuth is now being called correctly inside the event handler
    const success = await handleAuth(
      isLogin ? "LOGIN" : "SIGNUP", 
      email, 
      password
    );

    // If handleAuth returns a truthy value (user or true), redirect
    if (success) {
      router.refresh(); // Syncs the session cookie with the Proxy/Middleware
      router.push("/overview");
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-orange-600/20 blur-[120px] rounded-full" />

      <div className="relative w-full max-w-md bg-[#121212] border border-gray-800 p-8 rounded-3xl shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-orange-600 p-3 rounded-2xl mb-4 shadow-lg shadow-orange-600/20">
            <Zap className="text-white fill-white" size={28} />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            {isLogin ? "Welcome Back" : "Create Pro Account"}
          </h1>
          <p className="text-gray-500 text-sm mt-2">
            {isLogin
              ? "Log in to manage your wealth"
              : "Start your journey to financial freedom"}
          </p>
        </div>

        <form onSubmit={onAuthSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-black pl-1">
              Email Address
            </label>
            <div className="relative">
              <Mail
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600"
                size={18}
              />
              <input
                type="email"
                required
                className="w-full bg-black border border-gray-800 rounded-xl py-3 pl-12 pr-4 text-white outline-none focus:border-orange-500/50 transition-all"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-black pl-1">
              Password
            </label>
            <div className="relative">
              <Lock
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600"
                size={18}
              />
              <input
                type="password"
                required
                className="w-full bg-black border border-gray-800 rounded-xl py-3 pl-12 pr-4 text-white outline-none focus:border-orange-500/50 transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <p className="text-red-500 text-xs font-bold pl-1">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-600 hover:bg-orange-500 text-white font-black py-4 rounded-xl mt-4 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? "Processing..." : isLogin ? "Sign In" : "Create Account"}
            <ArrowRight size={18} />
          </button>
        </form>

        <div className="mt-8 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-gray-500 hover:text-white text-sm font-medium transition-colors"
          >
            {isLogin
              ? "Don't have an account? Sign up"
              : "Already have an account? Log in"}
          </button>
        </div>
      </div>
    </div>
  );
}