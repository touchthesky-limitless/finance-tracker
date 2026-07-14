"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Zap, Mail, Lock, ArrowRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
	const [isLogin, setIsLogin] = useState(true);
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");

	const { handleAuth, loading, error } = useAuth();
	const router = useRouter();

	const onAuthSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();

		const success = await handleAuth(
			isLogin ? "LOGIN" : "SIGNUP",
			email,
			password,
		);

		if (success) {
			router.refresh();

			if (isLogin) {
				router.push("/overview");
			} else {
				router.push("/signup-success");
			}
		}
	};

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center p-4 transition-colors duration-300">
			{/* Background Glow */}
			<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-orange-600/10 dark:bg-orange-600/20 blur-[120px] rounded-full pointer-events-none" />

			<div className="relative w-full max-w-md bg-white dark:bg-[#121212] border border-gray-200 dark:border-gray-800 p-8 rounded-3xl shadow-xl dark:shadow-2xl transition-all">
				<div className="flex flex-col items-center mb-8">
					<div className="bg-orange-600 p-3 rounded-2xl mb-4 shadow-lg shadow-orange-600/20">
						<Zap className="text-white fill-white" size={28} />
					</div>
					<h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
						{isLogin ? "Welcome Back" : "Create Pro Account"}
					</h1>
					<p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
						{isLogin
							? "Log in to manage your wealth"
							: "Start your journey to financial freedom"}
					</p>
				</div>

				<form onSubmit={onAuthSubmit} className="space-y-4">
					<div className="space-y-2">
						<label className="text-[10px] uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 font-black pl-1">
							Email Address
						</label>
						<div className="relative">
							<Mail
								className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"
								size={18}
							/>
							<input
								type="email"
								required
								className="w-full bg-white dark:bg-black border border-gray-300 dark:border-gray-800 rounded-xl py-3 pl-12 pr-4 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 outline-none focus:border-orange-500 dark:focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
								placeholder="name@company.com"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
							/>
						</div>
					</div>

					<div className="space-y-2">
						<label className="text-[10px] uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 font-black pl-1">
							Password
						</label>
						<div className="relative">
							<Lock
								className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"
								size={18}
							/>
							<input
								type="password"
								required
								className="w-full bg-white dark:bg-black border border-gray-300 dark:border-gray-800 rounded-xl py-3 pl-12 pr-4 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 outline-none focus:border-orange-500 dark:focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
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
						className="w-full bg-orange-600 hover:bg-orange-500 dark:hover:bg-orange-500 text-white font-black py-4 rounded-xl mt-4 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-600/20"
					>
						{loading ? (
							<>
								<Loader2 className="animate-spin" size={18} />{" "}
								Processing...{" "}
							</>
						) : (
							<>
								{isLogin ? "Sign In" : "Create Account"}
								<ArrowRight size={18} />
							</>
						)}
					</button>
				</form>

				{/* Footer Links */}
				<div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 text-sm font-medium">
					<button
						type="button"
						onClick={() => setIsLogin(!isLogin)}
						className="text-gray-600 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
					>
						{isLogin
							? "Don't have an account? Sign up"
							: "Already have an account? Log in"}
					</button>

					{isLogin && (
						<>
							<span className="hidden sm:inline text-gray-300 dark:text-gray-700">
								•
							</span>
							<Link
								href="/forgot-password"
								className="text-orange-600 dark:text-orange-500 hover:underline transition-colors"
							>
								Forgot Password?
							</Link>
						</>
					)}
				</div>
			</div>
		</div>
	);
}
