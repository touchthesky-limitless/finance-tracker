import { CategorySelector } from "@/components/CategorySelector";
import { MerchantSelect } from "@/components/Merchants/MerchantSelect";
import { DrawerField } from "./DrawerHelpers";
import type { Transaction } from "@/store/useBudgetStore";
import type { Merchant } from "@/store/useBudgetStore";
import { parseAmountInput } from "@/utils/formatters";
import { Tag, Plus, X } from "lucide-react";

interface Props {
	editedData: Transaction;
	direction: "debit" | "credit";
	displayAmount: string;
	tagQuery: string;
	tagOpen: boolean;
	selectedAccountName: string;
	// --- Restored Props ---
	selectedMerchantId: string | null;
	merchantTransactionCount: number;
	onViewMerchant: () => void;
	// ----------------------
	availableTags: string[];
	accounts: Array<{ id: string; name: string }>;
	merchants: Array<{ id: string; name: string }>;
	onMerchantChange: (merchant: Pick<Merchant, "id" | "name">) => void;
	onMerchantInputChange: (name: string) => void;
	onAmountChange: (val: string, numeric: number) => void;
	onDirectionToggle: () => void;
	onFieldUpdate: (updates: Partial<Transaction>) => void;
	onTagToggle: (tag: string) => void;
	onCreateTag: () => void;
	onTagQueryChange: (val: string) => void;
	onTagOpenToggle: (val: boolean) => void;
	onCommit: () => void;
}

export function TransactionDrawerForm({
	editedData,
	direction,
	displayAmount,
	tagQuery,
	tagOpen,
	selectedMerchantId,
	merchantTransactionCount,
	onViewMerchant,
	availableTags,
	accounts,
	onMerchantChange,
	onMerchantInputChange,
	onAmountChange,
	onDirectionToggle,
	onFieldUpdate,
	onTagToggle,
	onCreateTag,
	onTagQueryChange,
	onTagOpenToggle,
	onCommit,
}: Props) {
	return (
		<div className="space-y-5">
			<DrawerField label="Merchant">
				<div onBlurCapture={() => window.setTimeout(onCommit, 0)}>
					<MerchantSelect
						value={
							editedData.merchant.trim()
								? { id: selectedMerchantId ?? "", name: editedData.merchant }
								: null
						}
						onInputChange={onMerchantInputChange}
						onChange={onMerchantChange}
						placeholder="Search merchants or enter a new one"
						inputClassName="h-15 text-xl font-semibold dark:bg-white/[0.03] dark:border-white/10"
					/>
				</div>
				{/* ✅ Restored View transactions link */}
				{selectedMerchantId && (
					<button
						type="button"
						onClick={onViewMerchant}
						className="mt-2 text-sm font-semibold text-cyan-600 hover:underline dark:text-cyan-400"
					>
						View {merchantTransactionCount} transaction
						{merchantTransactionCount === 1 ? "" : "s"}
					</button>
				)}
			</DrawerField>

			<DrawerField label="Amount">
				<div className="grid grid-cols-[1fr_auto] gap-2">
					<div className="relative">
						<span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
							$
						</span>
						<input
							type="text"
							inputMode="decimal"
							value={displayAmount}
							onChange={(e) => {
								const { displayString, numericValue } = parseAmountInput(
									e.target.value,
								);
								onAmountChange(displayString, numericValue);
							}}
							onBlur={onCommit}
							className="h-13 w-full rounded-xl border border-gray-200 bg-white pl-8 pr-4 text-[15px] outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 dark:border-white/10 dark:bg-white/[0.03]"
						/>
					</div>
					<button
						type="button"
						onClick={onDirectionToggle}
						className="h-13 rounded-xl border border-gray-200 px-4 text-sm font-semibold hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5"
					>
						{direction === "debit" ? "Expense" : "Income"}
					</button>
				</div>
			</DrawerField>

			<DrawerField label="Original statement">
				<input
					type="text"
					value={editedData.description ?? ""}
					onChange={(e) => onFieldUpdate({ description: e.target.value })}
					onBlur={onCommit}
					className="h-13 w-full rounded-xl border border-gray-200 bg-white px-4 text-[15px] outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 dark:border-white/10 dark:bg-white/[0.03]"
				/>
			</DrawerField>

			<DrawerField label="Date">
				<input
					type="date"
					value={editedData.date}
					onChange={(e) => onFieldUpdate({ date: e.target.value })}
					className="h-13 w-full rounded-xl border border-gray-200 bg-white px-4 text-[15px] outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 dark:border-white/10 dark:bg-white/[0.03]"
				/>
			</DrawerField>

			<DrawerField label="Category">
				<div className="rounded-xl border border-gray-200 bg-white px-1 dark:border-white/10 dark:bg-white/[0.03]">
					<CategorySelector
						currentCategory={editedData.category || "Uncategorized"}
						variant="form"
						showChevron
						onSelect={(cat) => onFieldUpdate({ category: cat })}
					/>
				</div>
			</DrawerField>

			<DrawerField label="Account">
				<select
					value={editedData.account_id ?? ""}
					onChange={(e) => {
						const acc = accounts.find((a) => a.id === e.target.value);
						if (acc) onFieldUpdate({ account_id: acc.id, account: acc.name });
					}}
					className="h-13 w-full rounded-xl border border-gray-200 bg-white px-4 text-[15px] outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 dark:border-white/10 dark:bg-[#1c1c1c]"
				>
					<option value="">Select account</option>
					{accounts.map((a) => (
						<option key={a.id} value={a.id}>
							{a.name}
						</option>
					))}
				</select>
			</DrawerField>

			<DrawerField label="Notes">
				<textarea
					value={editedData.note ?? ""}
					onChange={(e) => onFieldUpdate({ note: e.target.value })}
					onBlur={onCommit}
					placeholder="Add notes to this transaction…"
					className="min-h-24 w-full resize-y rounded-xl border border-gray-200 bg-white px-4 py-3 text-[15px] outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 dark:border-white/10 dark:bg-white/[0.03]"
				/>
			</DrawerField>

			<DrawerField label="Tags">
				<div className="space-y-2 rounded-xl border border-gray-200 bg-white p-3 dark:border-white/10 dark:bg-white/[0.03]">
					{(editedData.tags ?? []).length > 0 && (
						<div className="flex flex-wrap gap-2">
							{(editedData.tags ?? []).map((tag) => (
								<button
									key={tag}
									onClick={() => onTagToggle(tag)}
									className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/15"
								>
									<Tag size={13} /> {tag} <X size={12} />
								</button>
							))}
						</div>
					)}
					<input
						type="text"
						value={tagQuery}
						placeholder="Search tags…"
						onFocus={() => onTagOpenToggle(true)}
						onChange={(e) => onTagQueryChange(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter" && tagQuery.trim()) {
								e.preventDefault();
								onCreateTag();
							}
						}}
						className="h-10 w-full bg-transparent px-1 text-sm outline-none dark:text-white"
					/>
					{tagOpen && (availableTags.length > 0 || tagQuery.trim()) && (
						<div className="max-h-48 overflow-y-auto border-t border-gray-100 pt-2 dark:border-white/10">
							{availableTags.map((tag) => (
								<button
									key={tag}
									onClick={() => {
										onTagToggle(tag);
										onTagQueryChange("");
									}}
									className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-white/5"
								>
									<Tag size={15} /> {tag}
								</button>
							))}
							{tagQuery.trim() && (
								<button
									onClick={onCreateTag}
									className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-500/10"
								>
									<Plus size={15} /> Create “{tagQuery.trim()}”
								</button>
							)}
						</div>
					)}
				</div>
			</DrawerField>
		</div>
	);
}
