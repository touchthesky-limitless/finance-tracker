"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useBudgetStore } from "@/store/useBudgetStore";

interface CreateMerchantModalProps {
	isOpen: boolean;
	onClose: () => void;
}

export function CreateMerchantModal({
	isOpen,
	onClose,
}: CreateMerchantModalProps) {
	const router = useRouter();
	const [name, setName] = useState("");
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState("");

	const addCustomMerchant = useBudgetStore((state) => {
		return state.addCustomMerchant;
	});

	const handleSubmit = async (
		event: React.FormEvent<HTMLFormElement>,
	) => {
		event.preventDefault();

		try {
			setIsSaving(true);
			setError("");

			const merchant = await addCustomMerchant(name);

			onClose();
			router.push(`/merchants/${merchant.id}`);
		} catch (submitError) {
			setError(
				submitError instanceof Error
					? submitError.message
					: "Could not create merchant.",
			);
		} finally {
			setIsSaving(false);
		}
	};

	if (!isOpen) {
		return null;
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
			<form
				onSubmit={handleSubmit}
				className="w-full max-w-md rounded-xl bg-white p-6 dark:bg-[#232323]"
			>
				<h2 className="mb-4 text-lg font-semibold">
					Create merchant
				</h2>

				<input
					value={name}
					onChange={(event) => {
						setName(event.target.value);
					}}
					placeholder="Merchant name"
					className="w-full rounded-lg border px-3 py-2"
				/>

				{error && (
					<p className="mt-2 text-sm text-red-500">
						{error}
					</p>
				)}

				<div className="mt-5 flex justify-end gap-2">
					<button type="button" onClick={onClose}>
						Cancel
					</button>

					<button
						type="submit"
						disabled={isSaving || !name.trim()}
					>
						{isSaving ? "Creating..." : "Create"}
					</button>
				</div>
			</form>
		</div>
	);
}