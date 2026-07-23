"use client";

import dynamic from "next/dynamic";
import { X } from "lucide-react";
import type { EmojiClickData, PickerProps } from "emoji-picker-react";

//https://github.com/ealush/emoji-picker-react

const EmojiPicker = dynamic<PickerProps>(
	() => {
		return import("emoji-picker-react").then((module) => {
			return module.default;
		});
	},
	{
		ssr: false,
		loading: () => {
			return (
				<div className="grid h-[420px] place-items-center text-sm text-[#777570] dark:text-[#aaa9a4]">
					Loading emojis…
				</div>
			);
		},
	},
);

interface CategoryEmojiPickerProps {
	selectedEmoji: string;
	onSelect: (emoji: string) => void;
	onClose: () => void;
}

export function CategoryEmojiPicker({
	selectedEmoji,
	onSelect,
	onClose,
}: CategoryEmojiPickerProps) {
	const handleEmojiClick = (emojiData: EmojiClickData): void => {
		const emoji = emojiData.emoji.trim();

		if (!emoji || emoji === selectedEmoji) {
			onClose();
			return;
		}

		onSelect(emoji);
	};

	return (
		<div
			className="absolute left-0 top-[calc(100%+14px)] z-40 w-full max-w-[520px] overflow-hidden rounded-[20px] border border-[#ddd9d4] bg-white shadow-[0_22px_65px_rgba(0,0,0,0.24)] dark:border-white/15 dark:bg-[#2a2a28]"
			onKeyDown={(event) => {
				if (event.key !== "Escape") {
					return;
				}

				event.preventDefault();
				event.stopPropagation();
				onClose();
			}}
		>
			<div className="flex h-12 items-center justify-between border-b border-black/[0.06] px-4 dark:border-white/10">
				<span className="text-sm font-semibold text-[#55534f] dark:text-[#d5d3ce]">
					Choose an emoji
				</span>

				<button
					type="button"
					onClick={onClose}
					className="grid size-9 place-items-center rounded-full transition hover:bg-[#f3f2ef] dark:hover:bg-white/10"
					aria-label="Close emoji picker"
				>
					<X size={18} />
				</button>
			</div>

			<div className="category-emoji-picker">
				<EmojiPicker
					onEmojiClick={handleEmojiClick}
					autoFocusSearch
					lazyLoadEmojis
					width="100%"
					height={420}
					theme={"auto" as PickerProps["theme"]}
					emojiStyle={"native" as PickerProps["emojiStyle"]}
					previewConfig={{
						showPreview: false,
					}}
				/>
			</div>
		</div>
	);
}
