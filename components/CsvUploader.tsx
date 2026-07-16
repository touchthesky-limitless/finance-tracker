"use client";
import React, { useState, useRef } from "react";
import { AlertCircle, CheckCircle2, Upload } from "lucide-react";
import { useBudgetStore } from "@/store/useBudgetStore";
import { Transaction } from "@/store/useBudgetStore";
import { parseBankCSV } from "@/lib/csv";
import { DEFAULT_TAGS } from "@/data/categories";
import { resolveToParent } from "@/lib/categoryMapper";
import { CATEGORY_HIERARCHY } from "@/constants/categories";

interface CsvUploaderProps {
	onComplete?: () => void;
}

export default function CsvUploader({ onComplete }: CsvUploaderProps) {
	// 2. Select actions/state
	const addTransactions = useBudgetStore((state) => state.addTransactions);
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

	const processFiles = async function (files: File[]) {
		if (files.length === 0) return;

		setIsProcessing(true);
		setMessage(null);
		setUploadProgress({ current: 0, total: files.length });

		const existingTransactions = useBudgetStore.getState().transactions;

		// Optimized Set creation without chained .map()
		const existingHashes = new Set<string>();
		for (let i = 0; i < existingTransactions.length; i++) {
			const t = existingTransactions[i];
			existingHashes.add(`${t.date}-${t.amount}-${t.merchant}`);
		}

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

				const customTags = useBudgetStore.getState().customTags;
				const addCustomTag = useBudgetStore.getState().addCustomTag;

				// Create a unified Set for O(1) lookups to avoid slow array .includes()
				const knownTags = new Set([...DEFAULT_TAGS, ...customTags]);
				const hierarchyKeys = Object.keys(CATEGORY_HIERARCHY);

				const uniqueParsed: Transaction[] = [];

				// Single-pass loop combining resolution, category adoption, and duplicate checking
				for (let j = 0; j < parsed.length; j++) {
					const t = parsed[j];
					const hash = `${t.date}-${t.amount}-${t.merchant}`;

					if (existingHashes.has(hash)) {
						duplicateCount++;
						continue;
					}

					const parent = resolveToParent(t.category, t.merchant);

					let isGenericParent = false;
					if (parent === "Uncategorized") {
						isGenericParent = true;
					} else {
						for (let k = 0; k < hierarchyKeys.length; k++) {
							if (hierarchyKeys[k] === parent) {
								isGenericParent = true;
								break;
							}
						}
					}

					uniqueParsed.push({
						...t,
						category: parent,
						needs_subcat: isGenericParent,
					});

					if (t.category && !knownTags.has(t.category)) {
						knownTags.add(t.category);
						addCustomTag(t.category);
					}
				}

				for (let j = 0; j < uniqueParsed.length; j++) {
					successfulTransactions.push(uniqueParsed[j]);
				}
			} catch (error) {
				console.error(`Error processing ${file.name}:`, error);

				// Safely determine the error type without using 'any'
				let errorMessage = "An unknown error occurred";
				if (error instanceof Error) {
					errorMessage = error.message;
				} else if (typeof error === "string") {
					errorMessage = error;
				}

				failedFiles.push({ name: file.name, reason: errorMessage });
			}
		}

		if (failedFiles.length > 0) {
			// Replaced 1-line .find() with standard loop
			let criticalError = null;
			for (let i = 0; i < failedFiles.length; i++) {
				if (failedFiles[i].reason.includes("header row")) {
					criticalError = failedFiles[i];
					break;
				}
			}

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

			// Replaced 1-line arrow functions inside setTimeout
			setTimeout(function () {
				if (onComplete) {
					onComplete();
				}
			}, 2000);
		} else if (duplicateCount > 0) {
			setMessage({
				type: "success",
				text: `No new data found. ${duplicateCount} duplicates skipped.`,
			});

			setTimeout(function () {
				if (onComplete) {
					onComplete();
				}
			}, 2000);
		}

		setTimeout(function () {
			setMessage(null);
		}, 5000);
		setIsProcessing(false);
	};

	const handleDragOver = function (e: React.DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		if (!isProcessing && !isDragging) {
			setIsDragging(true);
		}
	};

	const handleDragLeave = function (e: React.DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(false);
	};

	const handleDrop = async function (e: React.DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(false);

		if (isProcessing || !e.dataTransfer.files) return;

		const filesArray = [];
		for (let i = 0; i < e.dataTransfer.files.length; i++) {
			filesArray.push(e.dataTransfer.files[i]);
		}
		await processFiles(filesArray);
	};

	const handleFileUpload = async function (
		e: React.ChangeEvent<HTMLInputElement>,
	) {
		const files = e.target.files;
		if (!files || files.length === 0) return;

		const filesArray = [];
		for (let i = 0; i < files.length; i++) {
			filesArray.push(files[i]);
		}

		await processFiles(filesArray);
		e.target.value = "";
	};

	const handleManualClick = function () {
		if (inputRef.current) {
			inputRef.current.click();
		}
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
							className={`font-medium text-lg ${message?.type === "error" ? "text-red-400" : "text-gray-500 dark:text-white"}`}
						>
							{isProcessing
								? `Processing ${uploadProgress.current} of ${uploadProgress.total}...`
								: message?.type === "error"
									? "Invalid CSV Format"
									: message?.type === "success"
										? "Import Complete!"
										: "Click or Drag CSV Here"}
						</p>

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
