"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import ThemeToggle from "./ThemeToggle";

export default function Navbar() {
	const [isOpen, setIsOpen] = useState(false);
	const pathname = usePathname();
	const isActive = (path: string) => pathname === path;

	// Ref for menu and button
	const menuRef = useRef<HTMLDivElement>(null);
	const buttonRef = useRef<HTMLButtonElement>(null);

	// 2. Add Event Listener to detect outside clicks
	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			// if menu is closed, do nothing
			if (!isOpen) return;
			// if click was outside the menu AND outside the toggle btn
			if (
				menuRef.current &&
				!menuRef.current.contains(event.target as Node) &&
				buttonRef.current &&
				!buttonRef.current.contains(event.target as Node)
			) {
				setIsOpen(false);
			}
		}
		// Attach listener
		document.addEventListener("mousedown", handleClickOutside);

		// Cleanup listener
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isOpen]);

	// Define links using browser-friendly URL paths
	const navLinks = [
		{ name: "Budget Tracking Free", href: "/budget-free" },
		{ name: "Budget Tracking Pro", href: "/budget-pro" },
		{ name: "Budget Tracking Premium", href: "/budget-premium" },
		{ name: "Stocks", href: "/stocks" },
		// { name: "Mortgage Rates", href: "/mortgage" },
		{ name: "Refi Calculator", href: "/calculator" },
	];

	return (
		<nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50 transition-colors duration-300">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex justify-between h-16">
					{/* Logo Section */}
					<div className="flex items-center">
						{/* Home */}
						<Link
							href="/"
							className="shrink-0 flex items-center gap-2 group"
							onClick={() => setIsOpen(false)}
						>
							<div className="bg-primary-600 text-white p-1.5 rounded-lg">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
									strokeWidth={2.5}
									stroke="currentColor"
									className="w-5 h-5"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6"
									/>
								</svg>
							</div>
							<span className="font-bold text-xl text-gray-900 dark:text-white tracking-tight">
								Finance<span className="text-primary-600">Tracker</span>
							</span>
						</Link>
					</div>

					{/* Desktop Menu */}
					<div className="hidden md:flex items-center space-x-8">
						{navLinks.map((link) => (
							<Link
								key={link.name}
								href={link.href}
								className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
									isActive(link.href)
										? "bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400"
										: "text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-50 dark:hover:bg-gray-800"
								}`}
							>
								{link.name}
							</Link>
						))}

						{/* Theme Toggle Button */}
						<ThemeToggle />
						{/* <button className="cursor-pointer bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md text-sm font-semibold transition-colors shadow-sm">
							Sign In
						</button> */}
					</div>

					{/* Mobile Menu Button */}
					<div className="flex items-center md:hidden">
						{/* Theme Toggle Button */}
						<ThemeToggle />
						<button
							ref={buttonRef}
							onClick={() => setIsOpen(!isOpen)}
							className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white focus:outline-none p-2"
						>
							<svg
								className="h-6 w-6"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								{isOpen ? (
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M6 18L18 6M6 6l12 12"
									/>
								) : (
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M4 6h16M4 12h16M4 18h16"
									/>
								)}
							</svg>
						</button>
					</div>
				</div>
			</div>

			{/* Mobile Menu Dropdown */}
			{isOpen && (
				<div
					ref={menuRef}
					className="md:hidden dark:bg-gray-900 dark:border-gray-800 bg-white border-t border-gray-100"
				>
					<div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
						{navLinks.map((link) => (
							<Link
								key={link.name}
								href={link.href}
								className={`block px-3 py-2 rounded-md text-base font-medium ${
									isActive(link.href)
										? "bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400"
										: "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800"
								}`}
							>
								{link.name}
							</Link>
						))}

						{/* <div className="pt-4 pb-2 border-t border-gray-100 mt-2">
							<button className="w-full text-center bg-primary-600 text-white px-3 py-2 rounded-md font-medium">
								Sign In
							</button>
						</div> */}
					</div>
				</div>
			)}
		</nav>
	);
}
