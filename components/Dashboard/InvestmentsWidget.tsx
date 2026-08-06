/**
 * Displays a selectable list of stock tickers with price and change.
 * Users can choose up to 5 stocks via a settings modal.
 * Preferences are stored in localStorage and Supabase.
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import * as Dialog from "@radix-ui/react-dialog";
import { Settings2, X } from "lucide-react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { MOBILE_BREAKPOINT } from "@/config/breakpoints";
import { StockData } from "@/lib/types";
import FinancialCard from "@/components/Stocks/FinancialCard";
import { createClient } from "@/lib/supabase";
import { WidgetShell } from "./WidgetShell";

const AVAILABLE_SYMBOLS = [
	"VTI",
	"MSFT",
	"NVDA",
	"MU",
	"SNDK",
	"VXUS",
	"MSTR",
	"QQQM",
	"TSLA",
	"META",
	"GOOG",
	"AAPL",
];
const STORAGE_KEY = "dashboard-widget-stock-symbols";
const MAX_STOCKS = 5;
const supabase = createClient();

export function InvestmentsWidget() {
	const isMobile = useMediaQuery(MOBILE_BREAKPOINT);
	const router = useRouter();
	const [stocks, setStocks] = useState<StockData[]>([]);
	const [loading, setLoading] = useState(true);
	const [allStocksMap, setAllStocksMap] = useState<Record<string, StockData>>(
		{},
	);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [selectedSymbols, setSelectedSymbols] = useState<string[]>([]);
	const [tempSelected, setTempSelected] = useState<string[]>([]);
	const [userId, setUserId] = useState<string | null>(null);

	useEffect(() => {
		const loadUserAndPreferences = async () => {
			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (!user) return;
			setUserId(user.id);

			const { data, error } = await supabase
				.from("user_preferences")
				.select("dashboard_stock_symbols")
				.eq("user_id", user.id)
				.maybeSingle();

			if (!error && data) {
				const symbols = data.dashboard_stock_symbols?.filter((sym: string) =>
					AVAILABLE_SYMBOLS.includes(sym),
				);
				if (symbols && symbols.length > 0) {
					setSelectedSymbols(symbols);
					localStorage.setItem(STORAGE_KEY, JSON.stringify(symbols));
					return;
				}
			}

			try {
				const stored = localStorage.getItem(STORAGE_KEY);
				if (stored) {
					const parsed = JSON.parse(stored);
					const filtered = parsed.filter((sym: string) =>
						AVAILABLE_SYMBOLS.includes(sym),
					);
					if (filtered.length > 0) {
						setSelectedSymbols(filtered);
						return;
					}
				}
			} catch (e) {
				console.error("Failed to read stock widget settings", e);
			}

			setSelectedSymbols(AVAILABLE_SYMBOLS.slice(0, 3));
		};
		loadUserAndPreferences();
	}, []);

	useEffect(() => {
		const fetchAllStocks = async () => {
			try {
				const res = await fetch("/api/stocks");
				const data = await res.json();
				const map: Record<string, StockData> = {};
				data.forEach((stock: StockData) => {
					if (stock.symbol) map[stock.symbol] = stock;
				});
				setAllStocksMap(map);
			} catch (err) {
				console.error("Failed to fetch full stock list for settings", err);
			}
		};
		fetchAllStocks();
	}, []);

	useEffect(() => {
		let isMounted = true;
		const loadStocks = async () => {
			if (selectedSymbols.length === 0) {
				if (isMounted) {
					setStocks([]);
					setLoading(false);
				}
				return;
			}
			if (isMounted) setLoading(true);
			try {
				const res = await fetch(
					`/api/stocks?symbols=${selectedSymbols.join(",")}`,
				);
				const data = await res.json();
				if (isMounted) setStocks(data);
			} catch (err) {
				console.error("Failed to load stocks", err);
			} finally {
				if (isMounted) setLoading(false);
			}
		};
		loadStocks();
		return () => {
			isMounted = false;
		};
	}, [selectedSymbols]);

	const handleOpenSettings = useCallback(() => {
		setTempSelected(selectedSymbols);
		setSettingsOpen(true);
	}, [selectedSymbols]);

	const handleSaveSettings = useCallback(async () => {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(tempSelected));
		if (userId) {
			const { error } = await supabase
				.from("user_preferences")
				.upsert(
					{ user_id: userId, dashboard_stock_symbols: tempSelected },
					{ onConflict: "user_id" },
				);
			if (error) {
				console.error("Failed to save stock preferences to Supabase", error);
			}
		}
		setSelectedSymbols(tempSelected);
		setSettingsOpen(false);
	}, [tempSelected, userId]);

	const toggleSymbol = useCallback((symbol: string) => {
		setTempSelected((prev) => {
			if (prev.includes(symbol)) {
				return prev.filter((s) => s !== symbol);
			}
			if (prev.length >= MAX_STOCKS) return prev;
			return [...prev, symbol];
		});
	}, []);

	return (
		<>
			<WidgetShell
				title="Stocks"
				subtitle={
					<>
						<span className="text-emerald-500 dark:text-emerald-400">↗</span>
						<span className="text-gray-500 dark:text-gray-400"> Today</span>
					</>
				}
				dropdown={
					<div className="flex items-center gap-2">
						<button
							onClick={handleOpenSettings}
							className="text-gray-500 transition-colors hover:text-gray-900 dark:hover:text-white"
						>
							<Settings2 size={16} />
						</button>
						<button
							onClick={() => router.push("/stocks")}
							className="pl-3 text-xs font-medium text-[#FF5A35] hover:underline"
						>
							View all →
						</button>
					</div>
				}
			>
				{loading ? (
					<div className="flex items-center justify-center py-6 text-sm text-gray-500">
						Loading stocks…
					</div>
				) : stocks.length === 0 ? (
					<div className="flex items-center justify-center py-6 text-sm text-gray-500">
						No stocks selected. Click the gear to choose.
					</div>
				) : (
					<div className={`space-y-${isMobile ? 2 : 3}`}>
						{stocks.map((stock) => (
							<FinancialCard
								key={stock.symbol}
								symbol={stock.symbol}
								name={stock.name || "Unknown Company"}
								price={stock.price ?? 0}
								change={stock.change ?? 0}
								changePercent={stock.changePercent ?? 0}
								viewMode="list"
								currency="USD"
								marketCap={stock.marketCap}
								logo={stock.logo}
							/>
						))}
					</div>
				)}
			</WidgetShell>

			{/* Settings Modal */}
			<Dialog.Root open={settingsOpen} onOpenChange={setSettingsOpen}>
				<Dialog.Portal>
					<Dialog.Overlay className="fixed inset-0 z-[999] bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
					<Dialog.Content className="fixed left-1/2 top-1/2 z-[1000] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl outline-none dark:bg-[#1B1B1B]">
						<div className="flex items-center justify-between">
							<Dialog.Title className="text-lg font-bold text-gray-900 dark:text-white">
								Stock widget settings
							</Dialog.Title>
							<Dialog.Close asChild>
								<button className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-white/5">
									<X size={20} className="text-gray-500 dark:text-zinc-400" />
								</button>
							</Dialog.Close>
						</div>

						<p className="mt-4 text-sm text-gray-500 dark:text-zinc-400">
							Select up to {MAX_STOCKS} stocks to display on your dashboard.
						</p>

						<div className="mt-5 max-h-[400px] space-y-2 overflow-y-auto">
							{AVAILABLE_SYMBOLS.map((symbol) => {
								const stock = allStocksMap[symbol];
								const isSelected = tempSelected.includes(symbol);
								return (
									<div
										key={symbol}
										className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50/50 p-4 dark:border-white/5 dark:bg-white/5"
									>
										<div className="flex items-center gap-3">
											{stock?.logo ? (
												<Image
													src={stock.logo}
													alt={stock.name || symbol}
													width={24}
													height={24}
													className="shrink-0 rounded-full"
												/>
											) : (
												<div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-black/5 text-orange-600 dark:bg-white/5">
													<span className="text-sm font-black">
														{symbol[0]}
													</span>
												</div>
											)}
											<span className="text-sm font-medium text-gray-900 dark:text-white">
												{symbol}
											</span>
										</div>

										<button
											type="button"
											role="switch"
											aria-checked={isSelected}
											onClick={() => toggleSymbol(symbol)}
											className={`relative h-6 w-11 rounded-full transition-colors ${
												isSelected
													? "bg-[#FF5A35]"
													: "bg-gray-300 dark:bg-gray-600"
											}`}
										>
											<span
												className={`absolute top-[3px] block size-[18px] rounded-full bg-white transition-all ${
													isSelected ? "right-[3px]" : "left-[3px]"
												}`}
											/>
										</button>
									</div>
								);
							})}
						</div>

						<div className="mt-6 flex justify-end gap-3 border-t border-gray-200 pt-6 dark:border-white/10">
							<button
								onClick={() => setSettingsOpen(false)}
								className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium transition hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5"
							>
								Cancel
							</button>
							<button
								onClick={handleSaveSettings}
								className="rounded-lg bg-[#FF5A35] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#E04825]"
							>
								Save
							</button>
						</div>
					</Dialog.Content>
				</Dialog.Portal>
			</Dialog.Root>
		</>
	);
}
