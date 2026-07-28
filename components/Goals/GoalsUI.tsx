"use client";

import {
	useEffect,
	useId,
	useRef,
	useSyncExternalStore,
	type ButtonHTMLAttributes,
	type MouseEvent as ReactMouseEvent,
	type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { GoalAccountView } from "@/lib/goals/types";

import {
	ArrowLeftRight,
	ChevronDown,
	Info,
	Settings,
	X,
} from "lucide-react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { MOBILE_BREAKPOINT } from "@/config/breakpoints";

export const ORANGE = "#ff6633";

export function GoalsTabs() {
	const pathname = usePathname();
	const isSavings = pathname.startsWith("/goals/savings");
	const isDebt = pathname.startsWith("/goals/debt-paydown");
	const isMobile = useMediaQuery(MOBILE_BREAKPOINT);

	return (
		<nav className="flex min-w-0 items-end gap-5 text-[18px] font-semibold sm:text-[20px]">
			 {!isMobile &&<h1 className="pb-2 font-bold text-gray-950 dark:text-white">Goals</h1>}
			<Link
				href="/goals/savings"
				className={`border-b-2 pb-2 transition-colors ${
					isSavings
						? "border-[#ff6633] text-[#ff5b2d]"
						: "border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
				}`}
			>
				Save up
			</Link>
			<Link
				href="/goals/debt-paydown"
				className={`border-b-2 pb-2 transition-colors ${
					isDebt
						? "border-[#ff6633] text-[#ff5b2d]"
						: "border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
				}`}
			>
				Pay down
			</Link>
		</nav>
	);
}

export function PrimaryButton({
	children,
	className = "",
	...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
	return (
		<button
			{...props}
			className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#ff6633] px-5 font-semibold text-white shadow-sm transition hover:bg-[#ed5528] disabled:cursor-not-allowed disabled:bg-[#ffad91] ${className}`}
		>
			{children}
		</button>
	);
}

export function SecondaryButton({
	children,
	className = "",
	...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
	return (
		<button
			{...props}
			className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-5 font-semibold text-gray-950 shadow-sm transition hover:bg-gray-50 dark:border-white/15 dark:bg-[#232322] dark:text-white dark:hover:bg-white/10 ${className}`}
		>
			{children}
		</button>
	);
}

export function ManageButton({
	open,
	onClick,
	label = "Manage",
}: {
	open: boolean;
	onClick: () => void;
	label?: string;
}) {
	return (
		<SecondaryButton
			type="button"
			onClick={onClick}
			aria-expanded={open}
			className={open ? "border-cyan-500" : ""}
		>
			<Settings size={17} />
			{label}
			<ChevronDown
				size={16}
				className={`transition-transform ${open ? "rotate-180" : ""}`}
			/>
		</SecondaryButton>
	);
}

export function AllocateButton({
	onClick,
	className = "",
}: {
	onClick: () => void;
	className?: string;
}) {
	return (
		<PrimaryButton type="button" onClick={onClick} className={className}>
			<ArrowLeftRight size={17} />
			Allocate funds
		</PrimaryButton>
	);
}

export function AccountLogo({
	account,
	size = 36,
	className = "",
}: {
	account?: GoalAccountView;
	size?: number;
	className?: string;
}) {
	const initials = account
		? account.name
				.split(/\s+/)
				.filter(Boolean)
				.slice(0, 2)
				.map((part) => part[0]?.toUpperCase() ?? "")
				.join("") || "A"
		: "A";

	return (
		<span
			aria-hidden="true"
			title={account?.name}
			className={`grid shrink-0 place-items-center rounded-full bg-[#123c5d] font-black text-white shadow-inner ${className}`}
			style={{
				width: size,
				height: size,
				fontSize: Math.max(9, Math.round(size * 0.27)),
			}}
		>
			{initials}
		</span>
	);
}

export function Toggle({
	checked,
	onChange,
	label,
}: {
	checked: boolean;
	onChange: (checked: boolean) => void;
	label: string;
}) {
	return (
		<button
			type="button"
			role="switch"
			aria-checked={checked}
			aria-label={label}
			onClick={() => {
				onChange(!checked);
			}}
			className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
				checked ? "bg-[#ff6633]" : "bg-gray-400"
			}`}
		>
			<span
				className={`absolute top-1 size-4 rounded-full bg-white shadow transition-transform ${
					checked ? "translate-x-6" : "translate-x-1"
				}`}
			/>
		</button>
	);
}

export function InfoIcon({ label }: { label: string }) {
	return (
		<span title={label} className="inline-flex align-middle text-gray-500">
			<Info size={16} />
		</span>
	);
}

function subscribeToClient(): () => void {
	return () => {};
}

function getClientSnapshot(): boolean {
	return true;
}

function getServerSnapshot(): boolean {
	return false;
}

function useMounted(): boolean {
	return useSyncExternalStore(
		subscribeToClient,
		getClientSnapshot,
		getServerSnapshot,
	);
}

export function Modal({
	open,
	title,
	onClose,
	children,
	footer,
	widthClass = "max-w-[760px]",
	zIndex = 1000,
}: {
	open: boolean;
	title: string;
	onClose: () => void;
	children: ReactNode;
	footer?: ReactNode;
	widthClass?: string;
	zIndex?: number;
}) {
	const mounted = useMounted();
	const titleId = useId();
	const panelRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		if (!open) {
			return;
		}

		const handleKeyDown = (event: KeyboardEvent): void => {
			if (event.key === "Escape") {
				event.preventDefault();
				onClose();
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		panelRef.current?.focus();

		return () => {
			document.removeEventListener("keydown", handleKeyDown);
			document.body.style.overflow = previousOverflow;
		};
	}, [onClose, open]);

	if (!mounted || !open) {
		return null;
	}

	return createPortal(
		<div
			className="fixed inset-0 grid place-items-center overflow-y-auto bg-black/45 p-2 sm:p-5"
			style={{ zIndex }}
			onMouseDown={(event: ReactMouseEvent<HTMLDivElement>) => {
				if (event.target === event.currentTarget) {
					onClose();
				}
			}}
		>
			<div
				ref={panelRef}
				tabIndex={-1}
				role="dialog"
				aria-modal="true"
				aria-labelledby={titleId}
				className={`my-auto w-full overflow-hidden rounded-2xl bg-white text-gray-950 shadow-2xl outline-none dark:bg-[#232322] dark:text-white ${widthClass}`}
			>
				<header className="flex min-h-20 items-center border-b border-gray-200 px-6 sm:px-8 dark:border-white/10">
					<h2 id={titleId} className="text-xl font-bold sm:text-2xl">
						{title}
					</h2>
					<button
						type="button"
						onClick={onClose}
						aria-label="Close"
						className="ml-auto grid size-10 place-items-center rounded-full hover:bg-gray-100 dark:hover:bg-white/10"
					>
						<X size={25} />
					</button>
				</header>

				<div className="max-h-[calc(100vh-190px)] overflow-y-auto p-6 sm:p-8">
					{children}
				</div>

				{footer && (
					<footer className="flex min-h-20 items-center justify-end gap-3 border-t border-gray-200 px-6 sm:px-8 dark:border-white/10">
						{footer}
					</footer>
				)}
			</div>
		</div>,
		document.body,
	);
}

export function SideSheet({
	open,
	title,
	onClose,
	children,
}: {
	open: boolean;
	title: string;
	onClose: () => void;
	children: ReactNode;
}) {
	const mounted = useMounted();

	if (!mounted || !open) {
		return null;
	}

	return createPortal(
		<div className="fixed inset-0 z-[1400] bg-black/35" onMouseDown={onClose}>
			<aside
				className="ml-auto h-full w-full max-w-[760px] overflow-y-auto bg-white shadow-2xl dark:bg-[#232322]"
				onMouseDown={(event: ReactMouseEvent<HTMLDivElement>) => {
					event.stopPropagation();
				}}
			>
				<header className="flex min-h-20 items-center border-b border-gray-200 px-8 dark:border-white/10">
					<h2 className="text-2xl font-bold">{title}</h2>
					<button
						type="button"
						onClick={onClose}
						className="ml-auto grid size-10 place-items-center rounded-full hover:bg-gray-100 dark:hover:bg-white/10"
					>
						<X size={26} />
					</button>
				</header>
				<div className="p-8">{children}</div>
			</aside>
		</div>,
		document.body,
	);
}

export function Menu({
	open,
	children,
	className = "right-0 top-[calc(100%+8px)]",
}: {
	open: boolean;
	children: ReactNode;
	className?: string;
}) {
	if (!open) {
		return null;
	}

	return (
		<div
			className={`absolute z-[80] min-w-64 overflow-hidden rounded-2xl border border-gray-200 bg-white p-2 shadow-xl dark:border-white/10 dark:bg-[#232322] ${className}`}
		>
			{children}
		</div>
	);
}

export function MenuItem({
	children,
	onClick,
	danger = false,
}: {
	children: ReactNode;
	onClick: () => void;
	danger?: boolean;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={`flex w-full items-center rounded-xl px-4 py-3 text-left text-base transition hover:bg-gray-100 dark:hover:bg-white/10 ${
				danger ? "text-red-600" : "text-gray-950 dark:text-white"
			}`}
		>
			{children}
		</button>
	);
}

export function FieldLabel({ children }: { children: ReactNode }) {
	return <label className="mb-2 block font-semibold">{children}</label>;
}

export const inputClassName =
	"h-14 w-full rounded-xl border border-gray-300 bg-white px-4 text-base outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-600/10 dark:border-white/15 dark:bg-[#1f1f1e]";

export function ProgressBar({
	value,
	className = "",
}: {
	value: number;
	className?: string;
}) {
	return (
		<div className={`h-3 overflow-hidden rounded-full bg-[#e8e5e3] ${className}`}>
			<div
				className="h-full min-w-2 rounded-full bg-[#ffc63d] transition-[width]"
				style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
			/>
		</div>
	);
}
