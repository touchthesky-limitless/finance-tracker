"use client";

import { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Check, ChevronDown } from "lucide-react";

export type AccountAmountMode = "none" | "greater-than" | "less-than" | "equal-to" | "between";
const OPTIONS: ReadonlyArray<{ value: AccountAmountMode; label: string }> = [
	{ value: "none", label: "All amounts" }, { value: "greater-than", label: "Greater than" }, { value: "less-than", label: "Less than" }, { value: "equal-to", label: "Equal to" }, { value: "between", label: "Between" },
];
function clean(value: string): string { const [whole, ...rest] = value.replace(/[^0-9.]/g, "").split("."); return rest.length ? `${whole}.${rest.join("").slice(0,2)}` : whole; }
export function AmountFilterSelect({ mode, value, maxValue, onChange }: { mode: AccountAmountMode; value: string; maxValue: string; onChange: (mode: AccountAmountMode, value: string, maxValue: string) => void; }) {
	const [open, setOpen] = useState(false);
	const [draftMode, setDraftMode] = useState<AccountAmountMode>(mode);
	const [draftValue, setDraftValue] = useState(value);
	const [draftMax, setDraftMax] = useState(maxValue);
	const label = OPTIONS.find((option) => option.value === mode)?.label ?? "All amounts";
	return (
		<Popover.Root open={open} onOpenChange={(next) => { if (next) { setDraftMode(mode); setDraftValue(value); setDraftMax(maxValue); } setOpen(next); }} modal={false}>
			<Popover.Trigger asChild><button type="button" className={`flex h-13 w-full items-center justify-between rounded-xl border bg-white px-4 text-left text-base outline-none dark:bg-[#222] ${open ? "border-[#00A8D2] ring-2 ring-[#00A8D2]/15" : "border-gray-300 dark:border-white/15"}`}><span className="text-gray-500 dark:text-gray-400">{label}</span><ChevronDown size={18} /></button></Popover.Trigger>
			<Popover.Portal><Popover.Content side="bottom" align="start" sideOffset={8} collisionPadding={12} className="z-[9999] w-[var(--radix-popover-trigger-width)] min-w-[300px] overflow-hidden rounded-2xl border border-gray-200 bg-white p-3 shadow-2xl outline-none dark:border-white/10 dark:bg-[#1E1E1E]">
				{OPTIONS.map((option) => <button key={option.value} type="button" onClick={() => { setDraftMode(option.value); if (option.value === "none") { onChange("none", "", ""); setOpen(false); } }} className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left ${draftMode === option.value ? "bg-gray-100 dark:bg-white/5" : "hover:bg-gray-100 dark:hover:bg-white/5"}`}>{option.label}{draftMode === option.value && <Check size={18} className="text-[#FF5A35]" />}</button>)}
				{draftMode !== "none" && <div className="mt-3 border-t border-gray-200 pt-4 dark:border-white/10"><div className={`grid gap-3 ${draftMode === "between" ? "grid-cols-2" : "grid-cols-1"}`}><label className="relative"><span className="absolute inset-y-0 left-3 flex items-center text-gray-500">$</span><input value={draftValue} onChange={(event) => setDraftValue(clean(event.target.value))} inputMode="decimal" placeholder={draftMode === "between" ? "Minimum" : "Amount"} className="h-11 w-full rounded-xl border border-gray-300 bg-white pl-7 pr-3 outline-none focus:border-[#00A8D2] dark:border-white/15 dark:bg-[#222]" /></label>{draftMode === "between" && <label className="relative"><span className="absolute inset-y-0 left-3 flex items-center text-gray-500">$</span><input value={draftMax} onChange={(event) => setDraftMax(clean(event.target.value))} inputMode="decimal" placeholder="Maximum" className="h-11 w-full rounded-xl border border-gray-300 bg-white pl-7 pr-3 outline-none focus:border-[#00A8D2] dark:border-white/15 dark:bg-[#222]" /></label>}</div><div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setOpen(false)} className="h-10 rounded-lg border border-gray-200 px-4 font-semibold dark:border-white/10">Cancel</button><button type="button" disabled={!draftValue || (draftMode === "between" && !draftMax)} onClick={() => { onChange(draftMode, draftValue, draftMode === "between" ? draftMax : ""); setOpen(false); }} className="h-10 rounded-lg bg-[#FF5A35] px-4 font-bold text-white disabled:opacity-50">Apply</button></div></div>}
			</Popover.Content></Popover.Portal>
		</Popover.Root>
	);
}
