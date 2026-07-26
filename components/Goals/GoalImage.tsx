"use client";

import { ImageIcon, Upload } from "lucide-react";
import {
	useEffect,
	useId,
	useState,
	type ChangeEvent,
} from "react";

export function GoalImage({
	src,
	alt,
	className = "",
}: {
	src: string | null;
	alt: string;
	className?: string;
}) {
	const [failed, setFailed] = useState(false);

	useEffect(() => {
		setFailed(false);
	}, [src]);

	if (!src || failed) {
		return (
			<div
				role="img"
				aria-label={alt}
				className={`grid place-items-center bg-gradient-to-br from-orange-100 via-amber-50 to-slate-200 text-orange-500 dark:from-orange-950/40 dark:via-zinc-900 dark:to-slate-900 ${className}`}
			>
				<ImageIcon size={32} />
			</div>
		);
	}

	return (
		// Signed Supabase URLs are dynamic, so a native image avoids requiring
		// a project-specific Next.js remotePatterns entry.
		// eslint-disable-next-line @next/next/no-img-element
		<img
			src={src}
			alt={alt}
			className={className}
			onError={() => {
				setFailed(true);
			}}
		/>
	);
}

export function GoalImagePicker({
	previewUrl,
	onFileChange,
	className = "",
}: {
	previewUrl: string | null;
	onFileChange: (file: File | null) => void;
	className?: string;
}) {
	const inputId = useId();

	return (
		<div className={`relative overflow-hidden rounded-2xl ${className}`}>
			<GoalImage
				src={previewUrl}
				alt="Goal image preview"
				className="h-full w-full object-cover"
			/>
			<label
				htmlFor={inputId}
				className="absolute right-4 top-4 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 font-semibold text-gray-950 shadow-lg transition hover:bg-gray-50"
			>
				<Upload size={17} />
				Customize image
			</label>
			<input
				id={inputId}
				type="file"
				accept="image/jpeg,image/png,image/webp,image/gif"
				className="sr-only"
				onChange={(event: ChangeEvent<HTMLInputElement>) => {
					onFileChange(event.target.files?.[0] ?? null);
					event.target.value = "";
				}}
			/>
		</div>
	);
}
