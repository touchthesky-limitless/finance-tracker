"use client";

export function SettingsRadioOption({
	selected,
	onSelect,
	title,
	description,
	recommended,
}: {
	selected: boolean;
	onSelect: () => void;
	title: string;
	description: string;
	recommended?: boolean;
}) {
	return (
		<div
			className={`flex items-start gap-4 rounded-xl border p-4 cursor-pointer transition-colors ${
				selected
					? "border-[#FF8A65] ring-1 ring-[#FF8A65]"
					: "border-gray-200 dark:border-white/10"
			}`}
			onClick={onSelect}
		>
			<div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-gray-300 dark:border-white/20">
				{selected && <div className="h-2.5 w-2.5 rounded-full bg-[#FF8A65]" />}
			</div>
			<div className="flex-1">
				<div className="flex items-center gap-2">
					<span className="font-semibold">{title}</span>
					{recommended && (
						<span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-600 dark:bg-orange-500/20 dark:text-orange-400">
							Recommended
						</span>
					)}
				</div>
				<p className="mt-1 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
					{description}
				</p>
			</div>
		</div>
	);
}
