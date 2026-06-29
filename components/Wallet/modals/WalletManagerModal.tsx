import * as Dialog from "@radix-ui/react-dialog";
import { X, Plus } from "lucide-react";
import Image from "next/image";
import { CreditCard } from "@/store/useBudgetStore";

interface Props {
	isOpen: boolean;
	onClose: (open: boolean) => void;
	userWallet: CreditCard[];
	availableCards: CreditCard[];
	onAddCard: (id: string) => void;
	onRemoveCard: (id: string) => void;
}

export function WalletManagerModal({
	isOpen,
	onClose,
	userWallet,
	availableCards,
	onAddCard,
	onRemoveCard,
}: Props) {
	return (
		<Dialog.Root open={isOpen} onOpenChange={onClose}>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 z-100 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" />
				<Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-100 w-[calc(100%-2rem)] max-w-2xl max-h-[85vh] bg-[#0a0a0a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col outline-none animate-in fade-in zoom-in-95 duration-200">
					<div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0 bg-[#111]">
						<div>
							<Dialog.Title className="text-lg font-black tracking-tight text-white">
								Manage Wallet
							</Dialog.Title>
							<Dialog.Description className="text-xs font-medium text-gray-500 mt-1">
								Add or remove cards from your active loadout.
							</Dialog.Description>
						</div>
						<Dialog.Close asChild>
							<button className="text-gray-500 hover:text-white p-2 transition-colors">
								<X size={20} />
							</button>
						</Dialog.Close>
					</div>

					<div className="p-6 overflow-y-auto space-y-8 grow custom-scrollbar">
						<div className="space-y-3">
							<h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500">
								Active Cards ({userWallet.length})
							</h4>
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
								{userWallet.map((card) => (
									<div
										key={card.id}
										className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 group"
									>
										<div className="flex items-center gap-3">
											{card.image_url ? (
												<Image
													src={card.image_url}
													alt={card.name}
													width={40}
													height={24}
													className="w-10 h-6 rounded shadow-sm object-cover border border-white/20 shrink-0"
												/>
											) : (
												<div
													className={`w-8 h-5 rounded shadow-sm border border-white/20 bg-linear-to-br ${card.color}`}
												/>
											)}
											<p className="text-sm font-bold truncate max-w-50 text-gray-100 dark:text-gray-200">
												{card.name}
											</p>
										</div>
										<button
											onClick={() => onRemoveCard(card.id)}
											className="text-gray-600 hover:text-red-400 transition-colors"
										>
											<X size={16} />
										</button>
									</div>
								))}
							</div>
						</div>

						{availableCards.length > 0 && (
							<div className="space-y-3 pt-4 border-t border-white/5">
								<h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500">
									Add Cards
								</h4>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
									{availableCards.map((card) => (
										<button
											key={card.id}
											onClick={() => onAddCard(card.id)}
											className="flex items-center justify-between p-3 rounded-xl bg-[#111] border border-white/10 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all text-left group"
										>
											<div className="flex items-center gap-3">
												{card.image_url ? (
													<Image
														src={card.image_url}
														alt={card.name}
														width={32}
														height={20}
														className="w-8 h-5 rounded shadow-sm object-cover border border-white/20 opacity-50 group-hover:opacity-100 transition-opacity"
													/>
												) : (
													<div
														className={`w-8 h-5 rounded shadow-sm border border-white/20 bg-linear-to-br ${card.color} opacity-50 group-hover:opacity-100 transition-opacity`}
													/>
												)}
												<p className="text-sm font-bold text-gray-400 truncate max-w-35 group-hover:text-white transition-colors">
													{card.name}
												</p>
											</div>
											<Plus size={16} className="text-emerald-500" />
										</button>
									))}
								</div>
							</div>
						)}
					</div>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
