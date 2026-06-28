import { supabase } from "@/lib/supabase";
import { useState } from "react";
import { getURL } from "@/utils/getURL";

export function useAuth() {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleAuth = async (
		type: "LOGIN" | "SIGNUP",
		email: string,
		password: string,
	) => {
		setLoading(true);
		setError(null);

		try {
			const { data, error } =
				type === "LOGIN"
					? await supabase.auth.signInWithPassword({ email, password })
					: await supabase.auth.signUp({
							email,
							password,
							options: {
								// THIS IS THE CRITICAL ADDITION:
								emailRedirectTo: `${getURL()}/auth/callback`,
							},
						});

			if (error) throw error;

			// CRITICAL: You must return a value here
			return data.user;
		} catch (err: unknown) {
			const errorMessage =
				err instanceof Error ? err.message : "An unknown error occurred";
			setError(errorMessage);
			return null; // Return null on failure
		} finally {
			setLoading(false);
		}
	};

	return { handleAuth, loading, error };
}
