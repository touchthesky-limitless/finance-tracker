"use client";

import {
	useCallback,
	useEffect,
	useState,
} from "react";

import type {
	CreateSavedReportInput,
	SavedReport,
	UpdateSavedReportInput,
} from "@/components/Reports/types";
import {
	fetchSavedReports,
	insertSavedReport,
	removeSavedReport,
	updateSavedReport,
} from "@/lib/reports/savedReportsRepository";

function getErrorMessage(
	error: unknown,
	fallback: string,
): string {
	return error instanceof Error
		? error.message
		: fallback;
}

function normalizeReportName(
	value: string,
): string {
	return value
		.trim()
		.toLocaleLowerCase()
		.replace(/\s+/g, " ");
}

function assertReportNameAvailable({
	reports,
	name,
	excludedReportId,
}: {
	reports: SavedReport[];
	name: string;
	excludedReportId?: string;
}): void {
	const normalizedName =
		normalizeReportName(name);

	if (!normalizedName) {
		throw new Error(
			"Report name is required.",
		);
	}

	const duplicate = reports.some(
		(report) => {
			return (
				report.id !==
					excludedReportId &&
				normalizeReportName(
					report.name,
				) === normalizedName
			);
		},
	);

	if (duplicate) {
		throw new Error(
			"A saved report with this name already exists.",
		);
	}
}

export function useSavedReports() {
	const [savedReports, setSavedReports] =
		useState<SavedReport[]>([]);
	const [isLoading, setIsLoading] =
		useState(true);
	const [isSaving, setIsSaving] =
		useState(false);
	const [
		deletingReportId,
		setDeletingReportId,
	] = useState<string | null>(null);
	const [error, setError] =
		useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;

		void fetchSavedReports()
			.then((reports) => {
				if (cancelled) {
					return;
				}

				setSavedReports(reports);
				setError(null);
			})
			.catch(
				(caughtError: unknown) => {
					if (cancelled) {
						return;
					}

					setError(
						getErrorMessage(
							caughtError,
							"Unable to load saved reports.",
						),
					);
				},
			)
			.finally(() => {
				if (!cancelled) {
					setIsLoading(false);
				}
			});

		return () => {
			cancelled = true;
		};
	}, []);

	const refreshReports = useCallback(
		async (): Promise<void> => {
			setIsLoading(true);
			setError(null);

			try {
				const reports =
					await fetchSavedReports();

				setSavedReports(reports);
			} catch (caughtError) {
				setError(
					getErrorMessage(
						caughtError,
						"Unable to load saved reports.",
					),
				);
			} finally {
				setIsLoading(false);
			}
		},
		[],
	);

	const saveReport = useCallback(
		async (
			input: CreateSavedReportInput,
		): Promise<SavedReport> => {
			setIsSaving(true);
			setError(null);

			try {
				assertReportNameAvailable({
					reports: savedReports,
					name: input.name,
				});

				const report =
					await insertSavedReport(
						input,
					);

				setSavedReports(
					(current) => {
						return [
							report,
							...current.filter(
								(item) => {
									return (
										item.id !==
										report.id
									);
								},
							),
						];
					},
				);

				return report;
			} catch (caughtError) {
				const message =
					getErrorMessage(
						caughtError,
						"Unable to save the report.",
					);

				setError(message);
				throw new Error(message);
			} finally {
				setIsSaving(false);
			}
		},
		[savedReports],
	);

	const editReport = useCallback(
		async (
			input: UpdateSavedReportInput,
		): Promise<SavedReport> => {
			setIsSaving(true);
			setError(null);

			try {
				assertReportNameAvailable({
					reports: savedReports,
					name: input.name,
					excludedReportId:
						input.reportId,
				});

				const report =
					await updateSavedReport(
						input,
					);

				setSavedReports(
					(current) => {
						return current.map(
							(item) => {
								return (
									item.id ===
									report.id
								)
									? report
									: item;
							},
						);
					},
				);

				return report;
			} catch (caughtError) {
				const message =
					getErrorMessage(
						caughtError,
						"Unable to update the report.",
					);

				setError(message);
				throw new Error(message);
			} finally {
				setIsSaving(false);
			}
		},
		[savedReports],
	);

	const deleteReport = useCallback(
		async (
			reportId: string,
		): Promise<void> => {
			setDeletingReportId(reportId);
			setError(null);

			try {
				await removeSavedReport(
					reportId,
				);

				setSavedReports(
					(current) => {
						return current.filter(
							(report) => {
								return (
									report.id !==
									reportId
								);
							},
						);
					},
				);
			} catch (caughtError) {
				const message =
					getErrorMessage(
						caughtError,
						"Unable to delete the report.",
					);

				setError(message);
				throw new Error(message);
			} finally {
				setDeletingReportId(null);
			}
		},
		[],
	);

	const clearError =
		useCallback((): void => {
			setError(null);
		}, []);

	return {
		savedReports,
		isLoading,
		isSaving,
		deletingReportId,
		error,
		saveReport,
		editReport,
		deleteReport,
		refreshReports,
		clearError,
	};
}
