import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import {
	Home,
	ShoppingBag,
	Coffee,
	Activity,
	CreditCard,
	Car,
	HelpCircle,
	Zap,
	Wifi,
	Briefcase,
	Plane,
	LucideIcon,
	Utensils,
	Stethoscope,
	GraduationCap,
	Gamepad2,
	Film,
	Shield,
	Landmark,
	Wrench,
	Bus,
	Cat,
	Gift,
	TrendingUp,
	Banknote,
	Shirt,
	Music,
	Tv,
	Receipt,
} from "lucide-react";
import { CATEGORY_HIERARCHY } from "@/data/categories";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

type TrendType = "asset" | "liability" | "neutral";

interface TrendProps {
	color: string;
	Icon: React.ElementType;
}

/**
 * Returns the color and icon for a financial trend.
 * @param change The numerical change value (e.g., -0.5 or 1.2)
 * @param type "asset" (Stocks - Up is Good) or "liability" (Mortgage - Down is Good)
 */
export function getTrendProps(
	change: number,
	type: TrendType = "asset",
): TrendProps {
	// 1. Handle Zero / Neutral case
	if (Math.abs(change) < 0.001) {
		// Floating point safety
		return {
			color: "text-gray-500",
			Icon: Minus,
		};
	}

	const isPositive = change > 0;

	// 2. Define Colors based on Type
	// Asset: Up=Green, Down=Red
	// Liability: Up=Red, Down=Green
	let color = "";
	if (type === "asset") {
		color = isPositive ? "text-green-600" : "text-red-600";
	} else if (type === "liability") {
		color = isPositive ? "text-red-600" : "text-green-600";
	} else {
		color = "text-gray-900 dark:text-white"; // Neutral type
	}

	// 3. Icon always follows direction (Up arrow for positive number)
	const Icon = isPositive ? ArrowUp : ArrowDown;

	return { color, Icon };
}

/**
 * Returns credit card
 */
export const stringToColor = (str: string) => {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		hash = str.charCodeAt(i) + ((hash << 5) - hash);
	}
	const h = Math.abs(hash) % 360;
	return `hsl(${h}, 70%, 50%)`;
};

export const stringToPastel = (str: string) => {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		hash = str.charCodeAt(i) + ((hash << 5) - hash);
	}
	const h = Math.abs(hash) % 360;
	return `hsl(${h}, 85%, 92%)`;
};

/**
 * Returns icons
 */
export const getIconForCategory = (category: string): LucideIcon => {
	const lower = category.toLowerCase();

	// --- SPECIFIC MATCHES ---
	if (lower.includes("invest")) return TrendingUp;
	if (lower.includes("debt") || lower.includes("loan")) return Banknote;
	if (lower.includes("education") || lower.includes("student"))
		return GraduationCap;
	if (lower.includes("pet") || lower.includes("veterinary")) return Cat;
	if (lower.includes("gift")) return Gift;
	if (lower.includes("cloth")) return Shirt;
	if (lower.includes("repair") || lower.includes("service")) return Wrench;
	if (lower.includes("tax") || lower.includes("government")) return Landmark;
	if (lower.includes("subscript") || lower.includes("streaming")) return Tv;
	if (lower.includes("music")) return Music;
	if (lower.includes("movie") || lower.includes("cinema")) return Film;
	if (lower.includes("game") || lower.includes("gambling")) return Gamepad2;
	if (lower.includes("insur")) return Shield;

	// --- BROAD CATEGORIES ---
	if (
		lower.includes("home") ||
		lower.includes("rent") ||
		lower.includes("mortgage") ||
		lower.includes("housing")
	)
		return Home;
	if (
		lower.includes("util") ||
		lower.includes("electric") ||
		lower.includes("water") ||
		lower.includes("gas")
	)
		return Zap;
	if (
		lower.includes("internet") ||
		lower.includes("phone") ||
		lower.includes("wifi")
	)
		return Wifi;
	if (
		lower.includes("shop") ||
		lower.includes("amazon") ||
		lower.includes("retail")
	)
		return ShoppingBag;
	if (lower.includes("food") || lower.includes("grocer")) return Utensils;
	if (
		lower.includes("drink") ||
		lower.includes("bar") ||
		lower.includes("coffee")
	)
		return Coffee;
	if (lower.includes("auto") || lower.includes("fuel") || lower.includes("car"))
		return Car;
	if (
		lower.includes("transit") ||
		lower.includes("bus") ||
		lower.includes("taxi") ||
		lower.includes("uber")
	)
		return Bus;
	if (
		lower.includes("health") ||
		lower.includes("doctor") ||
		lower.includes("gym")
	)
		return Activity;
	if (lower.includes("pharmacy") || lower.includes("medic")) return Stethoscope;
	if (
		lower.includes("travel") ||
		lower.includes("hotel") ||
		lower.includes("flight")
	)
		return Plane;
	if (
		lower.includes("income") ||
		lower.includes("paycheck") ||
		lower.includes("business")
	)
		return Briefcase;

	// --- FALLBACK ---
	if (lower.includes("fee")) return Receipt;

	return CreditCard; // Default
};

/**
 * Returns category details
 */
export const getCategoryDetails = (currentCategory: string) => {
	const clean = currentCategory.trim().toLowerCase();

	// 1. Check if it IS a group name
	for (const group of Object.keys(CATEGORY_HIERARCHY)) {
		if (group.toLowerCase() === clean) {
			return { group: group, sub: null, icon: getIconForCategory(group) };
		}
	}

	// 2. Check if it belongs to a group
	for (const [group, items] of Object.entries(CATEGORY_HIERARCHY)) {
		if (items.some((i) => i.toLowerCase() === clean)) {
			return {
				group: group,
				sub: currentCategory,
				icon: getIconForCategory(group),
			};
		}
	}

	// 3. Fallback
	return { group: "Uncategorized", sub: currentCategory, icon: HelpCircle };
};

/**
 * Merges Tailwind classes safely. 
 * Prevents "class hell" by resolving conflicts (e.g., 'px-2 px-4' becomes 'px-4').
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}