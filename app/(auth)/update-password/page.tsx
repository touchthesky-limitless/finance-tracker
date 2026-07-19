"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function UpdatePassword() {
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [status, setStatus] = useState<{
		type: "idle" | "success" | "error";
		message: string;
	}>({ type: "idle", message: "" });
	const [loading, setLoading] = useState(false);

	const router = useRouter();
	const supabase = createClient();

	const handleUpdate = async (e: React.FormEvent) => {
		e.preventDefault();

		// Client-side validation: Check if passwords match
		if (password !== confirmPassword) {
			setStatus({ type: "error", message: "Passwords do not match." });
			return;
		}

		setLoading(true);
		setStatus({ type: "idle", message: "" });

		const { error } = await supabase.auth.updateUser({ password });

		if (error) {
			setStatus({ type: "error", message: error.message });
		} else {
			setStatus({
				type: "success",
				message: "Password updated! Redirecting...",
			});
			setTimeout(() => router.push("/dashboard"), 1500);
		}

		setLoading(false);
	};

	return (
		<div className="flex justify-center items-center min-h-[60vh] p-4">
			<form
				onSubmit={handleUpdate}
				className="w-full max-w-sm space-y-4 p-8 border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg dark:shadow-black/50 bg-white dark:bg-[#121212]"
			>
				<h2 className="text-2xl font-bold text-gray-900 dark:text-white">
					Set New Password
				</h2>
				<p className="text-sm text-gray-500 dark:text-gray-400">
					Enter and confirm your new secure password below.
				</p>

				<div className="space-y-3">
					<input
						type="password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						placeholder="New password"
						className="w-full p-3 bg-white dark:bg-black/40 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none transition-all"
						minLength={6}
						required
					/>

					<input
						type="password"
						value={confirmPassword}
						onChange={(e) => setConfirmPassword(e.target.value)}
						placeholder="Confirm new password"
						className="w-full p-3 bg-white dark:bg-black/40 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none transition-all"
						minLength={6}
						required
					/>
				</div>

				<button
					type="submit"
					disabled={
						loading || password.length < 6 || confirmPassword.length < 6
					}
					className="w-full bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 text-white font-semibold p-3 rounded-lg transition-colors disabled:bg-gray-400 dark:disabled:bg-gray-800 dark:disabled:text-gray-500 cursor-pointer disabled:cursor-not-allowed"
				>
					{loading ? "Updating..." : "Update Password"}
				</button>

				{/* Visual Feedback Message */}
				{status.message && (
					<div
						className={`p-3 rounded-lg text-sm ${
							status.type === "error"
								? "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-transparent dark:border-red-900/50"
								: "bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 border border-transparent dark:border-green-900/50"
						}`}
					>
						{status.message}
					</div>
				)}
			</form>
		</div>
	);
}
