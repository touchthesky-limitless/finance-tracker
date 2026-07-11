"use client";

import * as React from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";

export default function ThemeToggle() {
	const { setTheme, theme } = useTheme();
	const [mounted, setMounted] = React.useState(false);

	// Prevent hydration mismatch by only rendering after mount
	React.useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted) return <div className="p-2 w-9 h-9" />;

	return (
		<div className="flex items-center gap-1 p-1 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-white/5 rounded-xl transition-colors">
			<button
				onClick={() => setTheme("light")}
				className={`p-2 rounded-lg transition-all ${
					theme === "light"
						? "bg-orange-600 text-white shadow-sm"
						: "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/5"
				}`}
				title="Light Mode"
			>
				<Sun size={16} />
			</button>
			<button
				onClick={() => setTheme("dark")}
				className={`p-2 rounded-lg transition-all ${
					theme === "dark"
						? "bg-orange-600 text-white shadow-sm"
						: "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/5"
				}`}
				title="Dark Mode"
			>
				<Moon size={16} />
			</button>
			<button
				onClick={() => setTheme("system")}
				className={`p-2 rounded-lg transition-all ${
					theme === "system"
						? "bg-orange-600 text-white shadow-sm"
						: "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/5"
				}`}
				title="System Preference"
			>
				<Monitor size={16} />
			</button>
		</div>
	);
}
