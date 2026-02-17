"use client";
import React, { useState, useRef } from "react";
import { AlertCircle, CheckCircle2, Upload } from "lucide-react";
import { useBudgetStore } from "@/hooks/useBudgetStore";
import { Transaction } from "@/store/createBudgetStore";
import { parseBankCSV } from "@/lib/csv";
import { DEFAULT_TAGS } from "@/data/categories";
import { resolveToParent } from "@/lib/categoryMapper";
import { CATEGORY_HIERARCHY } from "@/constants/categories";

interface CsvUploaderProps {
	onComplete?: () => void;
}

export default function CsvUploader({ onComplete }: CsvUploaderProps) {
	// 1. Get the hook for the current version (free or premium or pro)
	const useStore = useBudgetStore();
	// 2. Select actions/state
	const addTransactions = useStore((state) => state.addTransactions);
	const [isDragging, setIsDragging] = useState(false);
	const [isProcessing, setIsProcessing] = useState(false);
	const [uploadProgress, setUploadProgress] = useState({
		current: 0,
		total: 0,
	});
	const [message, setMessage] = useState<{
		type: "success" | "error";
		text: string;
	} | null>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	// --- CONSOLIDATED LOGIC ---
	const processFiles = async (files: File[]) => {
		if (files.length === 0) return;

		setIsProcessing(true);
		setMessage(null);
		setUploadProgress({ current: 0, total: files.length });

		// 1. Get existing transactions from the store to compare
		const existingTransactions = useStore.getState().transactions;

		// Create a Set of "fingerprints" for O(1) lookups
		// We combine Date + Amount + Description to identify a unique transaction
		const existingHashes = new Set(
			existingTransactions.map((t) => `${t.date}-${t.amount}-${t.description}`),
		);

		const successfulTransactions: Transaction[] = [];
		const failedFiles: { name: string; reason: string }[] = [];
		let duplicateCount = 0;

		for (let i = 0; i < files.length; i++) {
			const file = files[i];
			setUploadProgress({ current: i + 1, total: files.length });

			try {
				const text = await file.text();
				const accountName = file.name.replace(".csv", "").replace(/_/g, " ");
				const parsed = parseBankCSV(text, accountName);
				// --- NEW TRANSFORMATION START ---
				const resolvedParsed = parsed.map((t): Transaction => {
					const parent = resolveToParent(t.category);

					// A transaction needs review if it's mapped to a generic Parent name
					const isGenericParent =
						Object.keys(CATEGORY_HIERARCHY).includes(parent) ||
						parent === "Uncategorized";

					return {
						...t,
						category: parent,
						needsSubcat: isGenericParent, // This triggers your badge
					};
				});

				// --------------------------------

				// --- AUTO-ADOPT CATEGORIES START ---
				// Access state and actions separately
				const customTags = useStore.getState().customTags;
				const addCustomTag = useStore.getState().addCustomTag;

				// Identify unique categories in the file
				const incomingCategories = Array.from(
					new Set(parsed.map((t) => t.category)),
				);

				incomingCategories.forEach((cat) => {
					// Use the imported DEFAULT_TAGS constant directly
					if (cat && !DEFAULT_TAGS.includes(cat) && !customTags.includes(cat)) {
						addCustomTag(cat);
					}
				});
				// ----------------------------------
				// --- AUTO-ADOPT CATEGORIES END ---

				// 2. Filter out duplicates before adding to the list
				// const uniqueParsed = parsed.filter((t) => {
				const uniqueParsed = resolvedParsed.filter((t) => {
					const hash = `${t.date}-${t.amount}-${t.description}`;
					if (existingHashes.has(hash)) {
						duplicateCount++;
						return false;
					}
					return true;
				});

				successfulTransactions.push(...uniqueParsed);
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
			} catch (error: any) {
				console.error(`Error processing ${file.name}:`, error);
				failedFiles.push({ name: file.name, reason: error.message });
			}
		}

		// 3. Update store and show a cleaner message
		if (failedFiles.length > 0) {
			// If there's a "Critical" header error, show that specifically
			const criticalError = failedFiles.find((f) =>
				f.reason.includes("header row"),
			);
			setMessage({
				type: "error",
				text: criticalError
					? criticalError.reason
					: `Failed to read ${failedFiles.length} file(s).`,
			});
		} else if (successfulTransactions.length > 0) {
			addTransactions(successfulTransactions);
			setMessage({
				type: "success",
				text: `Imported ${successfulTransactions.length} new transactions.${duplicateCount > 0 ? ` (${duplicateCount} duplicates skipped)` : ""}`,
			});

			// ADD THIS: Delay the closing so the user sees the success state
			setTimeout(() => {
				if (onComplete) onComplete();
			}, 2000);
		} else if (duplicateCount > 0) {
			setMessage({
				type: "success",
				text: `No new data found. ${duplicateCount} duplicates skipped.`,
			});

			// Optional: Close even if only duplicates were found
			setTimeout(() => {
				if (onComplete) onComplete();
			}, 2000);
		}

		setTimeout(() => setMessage(null), 5000);
		setIsProcessing(false);
	};

	// --- CLEAN HANDLERS ---
	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		if (!isProcessing && !isDragging) setIsDragging(true);
	};

	const handleDragLeave = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(false);
	};

	const handleDrop = async (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(false);

		if (isProcessing || !e.dataTransfer.files) return;
		await processFiles(Array.from(e.dataTransfer.files));
	};

	const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (!files || files.length === 0) return;
		await processFiles(Array.from(files));
		e.target.value = ""; // Clear input so same file can be uploaded again
	};

	const handleManualClick = () => {
		inputRef.current?.click();
	};

	return (
		<div className="w-full">
			<div
				onClick={!isProcessing ? handleManualClick : undefined}
				onDragOver={handleDragOver}
				onDragLeave={handleDragLeave}
				onDrop={handleDrop}
				className={`
                    border-2 border-dashed rounded-xl p-8 text-center transition-all
                    ${
											isProcessing
												? "border-gray-200 bg-gray-50 dark:bg-gray-800/50 cursor-wait"
												: "border-gray-300 dark:border-gray-700 hover:border-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
										}
                    ${isDragging && !isProcessing ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-[1.02]" : ""}
                `}
			>
				<div className="flex flex-col items-center gap-3 pointer-events-none">
					{isProcessing ? (
						<div className="p-3 bg-orange-500/20 rounded-full">
							<div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
						</div>
					) : message?.type === "error" ? (
						<div className="p-3 bg-red-500/20 rounded-full text-red-500 animate-bounce">
							<AlertCircle size={24} />
						</div>
					) : message?.type === "success" ? (
						<div className="p-3 bg-emerald-500/20 rounded-full text-emerald-500">
							<CheckCircle2 size={24} />
						</div>
					) : (
						<div className="p-3 bg-gray-800 rounded-full text-gray-400">
							<Upload size={24} />
						</div>
					)}
					<div>
						<p
							className={`font-medium text-lg ${message?.type === "error" ? "text-red-400" : "text-white"}`}
						>
							{isProcessing
								? `Processing ${uploadProgress.current} of ${uploadProgress.total}...`
								: message?.type === "error"
									? "Invalid CSV Format"
									: message?.type === "success"
										? "Import Complete!"
										: "Click or Drag CSV Here"}
						</p>

						{/* 1. Only show the detailed error text here */}
						{message?.type === "error" && (
							<p className="text-xs text-red-500/80 mt-2 max-w-62.5 mx-auto leading-relaxed font-medium">
								{message.text}
							</p>
						)}

						{isProcessing && (
							<div className="w-48 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mt-3 overflow-hidden mx-auto">
								<div
									className="h-full bg-blue-500 transition-all duration-300"
									style={{
										width: `${(uploadProgress.current / uploadProgress.total) * 100}%`,
									}}
								/>
							</div>
						)}

						{/* 2. Modified Dynamic Status Message: Only show if NOT an error */}
						{!isProcessing && message?.type !== "error" && (
							<p
								className={`text-sm mt-1 transition-all ${
									message?.type === "success"
										? "text-green-500 font-medium"
										: "text-gray-500"
								}`}
							>
								{message
									? message.text
									: "Supports Chase, Bank Of America, etc."}
							</p>
						)}
					</div>
				</div>

				<input
					ref={inputRef}
					type="file"
					accept=".csv"
					multiple
					className="hidden"
					disabled={isProcessing}
					onChange={handleFileUpload}
				/>
			</div>
		</div>
	);
}
