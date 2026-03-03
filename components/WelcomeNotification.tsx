"use client";

import { useEffect, useState } from "react";
import { useBudgetStore } from "@/store/useBudgetStore";
import { Zap, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function WelcomeNotification() {
	const [show, setShow] = useState(false);
	const isHydrated = useBudgetStore((state) => state.hasHydrated);
	const transactions = useBudgetStore((state) => state.transactions);

	useEffect(() => {
		const lastSeen = localStorage.getItem("lastWelcomeShow");
		const today = new Date().toDateString();
		// Only show if the store is ready and we have data (authenticated)
		if (isHydrated && transactions.length > 0 && lastSeen !== today) {
			const timer = setTimeout(() => {
				setShow(true);
				localStorage.setItem("lastWelcomeShow", today);
			}, 1000);
			const hideTimer = setTimeout(() => setShow(false), 6000); // Auto-hide
			return () => {
				clearTimeout(timer);
				clearTimeout(hideTimer);
			};
		}
	}, [isHydrated, transactions.length]);

	return (
		<AnimatePresence>
			{show && (
				<motion.div
					initial={{ y: -20, opacity: 0 }}
					animate={{ y: 0, opacity: 1 }}
					exit={{ y: -20, opacity: 0 }}
					className="fixed top-20 right-8 z-100 max-w-sm w-full"
				>
					<div className="bg-[#0d0d0d]/80 backdrop-blur-xl transform-gpu border border-white/10 rounded-2xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center gap-4 relative overflow-hidden group">
						{/* Ambient Orange Glow */}
						<div className="absolute -left-4 -top-4 w-12 h-12 bg-orange-600/20 blur-2xl rounded-full group-hover:bg-orange-600/40 transition-all" />

						<div className="bg-orange-600/10 p-2.5 rounded-xl border border-orange-600/20">
							<Zap size={18} className="text-orange-500 fill-orange-500" />
						</div>

						<div className="flex-1">
							<h4 className="text-[10px] font-black text-orange-600 uppercase tracking-[0.2em] mb-0.5">
								System Auth
							</h4>
							<p className="text-sm font-bold text-white tracking-tight">
								Welcome back,{" "}
								<span className="text-gray-400 font-medium italic">
									My broke friend
								</span>
							</p>
						</div>

						<button
							onClick={() => setShow(false)}
							className="p-1 hover:bg-white/5 rounded-md text-gray-600 hover:text-white transition-all"
						>
							<X size={16} />
						</button>
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
