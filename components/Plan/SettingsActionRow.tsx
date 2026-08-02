"use client";

export function SettingsActionRow({
	title,
	description,
	buttonText,
	destructive,
}: {
	title: string;
	description: string;
	buttonText: string;
	destructive?: boolean;
}) {
	return (
		<div className="flex items-center justify-between rounded-xl border border-gray-200 p-4 dark:border-white/10">
			<div>
				<p className="font-semibold">{title}</p>
				<p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
					{description}
				</p>
			</div>
			<button
				className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
					destructive
						? "border-gray-300 text-gray-700 hover:bg-red-50 hover:text-red-600 dark:border-white/10 dark:text-gray-300 dark:hover:bg-red-500/10 dark:hover:text-red-400"
						: "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:bg-[#1B1B1B] dark:text-gray-300 dark:hover:bg-white/5"
				}`}
			>
				{buttonText}
			</button>
		</div>
	);
}
