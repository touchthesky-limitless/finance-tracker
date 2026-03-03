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
    <div className="flex items-center gap-1 p-1 bg-[#121212] border border-white/5 rounded-xl">
      <button
        onClick={() => setTheme("light")}
        className={`p-2 rounded-lg transition-all ${
          theme === "light" ? "bg-orange-600 text-white" : "text-gray-500 hover:text-white"
        }`}
        title="Light Mode"
      >
        <Sun size={16} />
      </button>
      <button
        onClick={() => setTheme("dark")}
        className={`p-2 rounded-lg transition-all ${
          theme === "dark" ? "bg-orange-600 text-white" : "text-gray-500 hover:text-white"
        }`}
        title="Dark Mode"
      >
        <Moon size={16} />
      </button>
      <button
        onClick={() => setTheme("system")}
        className={`p-2 rounded-lg transition-all ${
          theme === "system" ? "bg-orange-600 text-white" : "text-gray-500 hover:text-white"
        }`}
        title="System Preference"
      >
        <Monitor size={16} />
      </button>
    </div>
  );
}