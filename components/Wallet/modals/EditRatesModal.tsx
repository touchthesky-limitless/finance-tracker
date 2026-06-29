import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Save, Star } from "lucide-react";
import Image from "next/image";
import { CreditCard } from "@/store/useBudgetStore";
import { Category } from "@/types/wallet";

interface Props {
	categoryId: string | null;
	category?: Category;
	userWallet: CreditCard[];
	customRates: Record<string, Record<string, number>>;
	preferredCards: Record<string, string>;
	onClose: () => void;
	onSave: (id: string, rates: Record<string, number | undefined>) => void;
	onSetPreferred: (catId: string, cardId: string | null) => void;
}

export function EditRatesModal({
	categoryId,
	category,
	userWallet,
	customRates,
	preferredCards,
	onClose,
	onSave,
	onSetPreferred,
}: Props) {
	const [tempRates, setTempRates] = useState<
		Record<string, number | undefined>
	>(() => {
		return categoryId ? { ...(customRates[categoryId] || {}) } : {};
	});

	if (!category || !categoryId) return null;
	const Icon = category.icon as React.ElementType;

	return (
		<Dialog.Root
			open={!!categoryId}
			onOpenChange={(open) => !open && onClose()}
		>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 z-100 bg-black/70 backdrop-blur-md animate-in fade-in duration-200" />
				<Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-100 w-full max-w-lg bg-[#0a0a0a] border border-white/10 rounded-3xl shadow-2xl flex flex-col max-h-[65vh] outline-none animate-in fade-in zoom-in-95 duration-200">
					<div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0">
						<div className="flex items-center gap-3">
							<div className={`p-2 rounded-xl bg-white/5 ${category.accent}`}>
								<Icon size={20} />
							</div>
							<div>
								<h3 className="text-xl font-black tracking-tight text-gray-300 dark:text-gray-100">
									Edit Multipliers
								</h3>
								<p className="flex items-center gap-2 text-xs font-medium text-gray-500 mt-0.5">
									Set custom rates for{" "}
									<span className="flex items-center gap-1.5 text-white bg-white/5 px-2 py-0.5 rounded-md">
										{category.name}{" "}
										<Icon size={12} className={category.accent} />
									</span>
								</p>
							</div>
						</div>
						<Dialog.Close asChild>
							<button className="text-gray-500 hover:text-white p-2 rounded-full hover:bg-white/5">
								<X size={20} />
							</button>
						</Dialog.Close>
					</div>

					<div className="p-4 sm:p-6 overflow-y-auto space-y-1.5 custom-scrollbar">
						{[...userWallet]
							.sort((a, b) => {
								const rateA =
									tempRates[a.id] ??
									a.multipliers[categoryId] ??
									a.multipliers["CatchAll"] ??
									1;
								const rateB =
									tempRates[b.id] ??
									b.multipliers[categoryId] ??
									b.multipliers["CatchAll"] ??
									1;
								return rateB - rateA;
							})
							.map((card) => {
								const defaultRate =
									card.multipliers[categoryId] ??
									card.multipliers["CatchAll"] ??
									1;
								const isPreferred = preferredCards[categoryId] === card.id;

								return (
									<div
										key={card.id}
										className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/3 border border-transparent hover:border-white/5 group"
									>
										<div className="flex items-center gap-3 overflow-hidden pr-2">
											{card.image_url ? (
												<Image
													src={card.image_url}
													alt={card.name}
													width={40}
													height={24}
													className="w-8 h-5 rounded shadow-sm object-cover border border-white/20"
												/>
											) : (
												<div
													className={`w-1 h-8 rounded-full bg-linear-to-b ${card.color} shrink-0`}
												/>
											)}
											<div className="truncate">
												<p className="text-sm font-bold truncate text-gray-300 dark:text-gray-100">
													{card.name}
												</p>
												<p className="text-[10px] uppercase tracking-widest text-gray-400">
													Default: {defaultRate}x
												</p>
											</div>
										</div>

										<div className="flex items-center gap-2 shrink-0">
											<button
												onClick={() =>
													onSetPreferred(
														categoryId,
														isPreferred ? null : card.id,
													)
												}
												className={`transition-colors p-1.5 rounded-md hover:bg-white/5 ${isPreferred ? "text-yellow-500 opacity-100" : "text-gray-600 hover:text-yellow-500/50 opacity-0 group-hover:opacity-100"}`}
											>
												<Star
													size={16}
													className={isPreferred ? "fill-yellow-500" : ""}
												/>
											</button>

											<div className="flex items-center gap-1.5 bg-[#111] border border-white/10 rounded-lg px-2 py-1.5 focus-within:border-emerald-500/50">
												<input
													type="number"
													step="0.5"
													min="0"
													value={tempRates[card.id] ?? ""}
													onChange={(e) => {
														const val = parseFloat(e.target.value);
														setTempRates({
															...tempRates,
															[card.id]: isNaN(val) ? undefined : val,
														});
													}}
													placeholder={`${defaultRate}`}
													className="w-12 sm:w-16 bg-transparent text-sm text-right outline-none font-medium placeholder:text-gray-400"
												/>
												<span className="text-gray-500 font-bold text-xs select-none">
													x
												</span>
											</div>
										</div>
									</div>
								);
							})}
					</div>

					<div className="p-5 sm:p-6 border-t border-white/5 bg-[#050505] shrink-0 flex justify-between items-center rounded-b-3xl">
						<button
							onClick={() => setTempRates({})}
							className="text-[10px] font-black text-gray-500 hover:text-gray-300 uppercase tracking-widest"
						>
							Reset Form
						</button>
						<button
							onClick={() => onSave(categoryId, tempRates)}
							className="flex items-center gap-2 bg-emerald-500 text-black px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest hover:bg-emerald-400"
						>
							<Save size={16} /> Save
						</button>
					</div>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
