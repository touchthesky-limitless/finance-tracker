"use client";

import { CategoryIcon } from "@/components/CategoryIcon";

export const EMOJI_ICON_PREFIX = "emoji:";

interface CategoryGlyphProps {
	name: string;
	size?: number;
	colorClass?: string;
	className?: string;
}

export function encodeEmojiIcon(emoji: string): string {
	return `${EMOJI_ICON_PREFIX}${emoji.trim()}`;
}

export function getEmojiIcon(value?: string | null): string | null {
	const cleanValue = value?.trim() ?? "";

	if (!cleanValue) {
		return null;
	}

	if (cleanValue.startsWith(EMOJI_ICON_PREFIX)) {
		return cleanValue.slice(EMOJI_ICON_PREFIX.length).trim() || null;
	}

	/*
	 * Support previously stored raw emoji values too. Lucide icon names use
	 * letters and numbers, while an emoji contains a non-ASCII symbol.
	 */
	if (/[^\u0000-\u007f]/u.test(cleanValue)) {
		return cleanValue;
	}

	return null;
}

export function CategoryGlyph({
	name,
	size = 18,
	colorClass,
	className,
}: CategoryGlyphProps) {
	const emoji = getEmojiIcon(name);

	if (emoji) {
		return (
		<span
			aria-hidden="true"
			className={`inline-flex shrink-0 items-center justify-center ${className ?? ""}`}
			style={{
				fontSize: `${size}px`,
				lineHeight: 1,
				width: `${size}px`,
				height: `${size}px`,
			}}
		>
			{emoji}
		</span>
		);
	}

	return (
		<CategoryIcon
			name={name}
			size={size}
			colorClass={colorClass}
		/>
	);
}
