"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { SunIcon, MoonIcon } from "@heroicons/react/24/solid";

export default function ThemeToggle() {
	const { theme, setTheme } = useTheme();
	const [mounted, setMounted] = useState(false);

	// Avoid hydration mismatch by waiting for client load
	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted) return null;

	return (
		<button
			onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
			className="cursor-pointer p-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-yellow-400 hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
			aria-label="Toggle Dark Mode"
		>
			{theme === "dark" ? (
				<SunIcon className="h-5 w-5" />
			) : (
				<MoonIcon className="h-5 w-5 text-gray-600" />
			)}
		</button>
	);
}
