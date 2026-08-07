/**
 * Hook for managing dialog state in the recurring page.
 */
import { useState } from "react";
import type { MerchantEditorValue } from "@/components/Merchants/MerchantEditorModal";
import type {
	RecurringCandidate,
	RecurringRecord,
	RecurringType,
} from "../types";

type ActiveDialog =
	| null
	| { type: "review" }
	| { type: "manager" }
	| { type: "search"; defaultType: RecurringType }
	| {
			type: "editor";
			candidate: RecurringCandidate;
			existingRecord: RecurringRecord | null;
			returnTo: "search" | "page";
	  };

export function useRecurringDialogs() {
	const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);
	const [mergeState, setMergeState] = useState<{
		source: MerchantEditorValue;
		record: RecurringRecord;
	} | null>(null);

	const replaceActiveDialog = (nextDialog: Exclude<ActiveDialog, null>) => {
		setActiveDialog(nextDialog);
	};

	return {
		activeDialog,
		setActiveDialog,
		replaceActiveDialog,
		mergeState,
		setMergeState,
	};
}
