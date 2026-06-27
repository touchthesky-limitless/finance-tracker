import {
	Utensils,
	Fuel,
	Plane,
	ShoppingCart,
	CreditCard,
	Car,
	Hammer,
	ShoppingBag,
	Building2,
	Package,
	Hotel,
	Pill,
	Globe,
	Ticket,
	Tv,
	Briefcase,
	Wifi,
	Smartphone,
	Megaphone,
	Play,
	Home,
	ShoppingBasket,
	Train,
    PlaneTakeoff,
    Key,
} from "lucide-react";

// export type CategoryId = string;
// 1. Define the strict union type (The Source of Truth)
export type CategoryId =
	| "dining"
	| "groceries"
	| "travel"
	| "gas"
	| "transit"
	| "homeImprovement"
    | "onlineRetails"
    | "hilton"
    | "flights"
    | "rentals"
    | "alaska"
    | "shipping"
    | "cap1Hotels"
    | "cap1Flights"
    | "cap1Rentals"
    | "lyft"
    | "drugstores"
    | "chaseTravel"
    | "liveEntertainment"
    | "cable"
    | "office"
    | "internet"
    | "phoneServices"
    | "ads"
    | "streaming"
    | "vacationHomes"
    | "onlineGroceries"
    | "united"
    | "american"
    | "transportation"
	| "catchAll";

// 2. Define the shape of a single category item
export type CategoryDictItem = {
	id: CategoryId; // <-- Forces the ID to be one of the strict strings above
	name: string;
	icon: React.ElementType;
	accent: string;
};

export const CATEGORY_DICTIONARY: CategoryDictItem[] = [
	{
		id: "dining",
		name: "Dining",
		icon: Utensils,
		accent: "text-orange-400",
	},
	{
		id: "groceries",
		name: "Groceries",
		icon: ShoppingCart,
		accent: "text-emerald-400",
	},
	{
		id: "travel",
		name: "Travel",
		icon: Plane,
		accent: "text-blue-400",
	},
	{
		id: "gas",
		name: "Gas",
		icon: Fuel,
		accent: "text-red-400",
	},
	{
		id: "transit",
		name: "Transit",
		icon: Car,
		accent: "text-pink-400",
	},
	{
		id: "homeImprovement",
		name: "Home Improvement",
		icon: Hammer,
		accent: "text-amber-400",
	},
	{
		id: "onlineRetails",
		name: "Online Retail",
		icon: ShoppingBag,
		accent: "text-purple-400",
	},
	{
		id: "hilton",
		name: "Hilton",
		icon: Building2,
		accent: "text-rose-500",
	},
	{
		id: "flights",
		name: "Flights",
		icon: PlaneTakeoff,
		accent: "text-sky-400",
	},
	{
		id: "rentals",
		name: "Rentals",
		icon: Key,
		accent: "text-yellow-500",
	},
	{
		id: "alaska",
		name: "Alaska Airlines",
		icon: Plane,
		accent: "text-teal-400",
	},
	{
		id: "shipping",
		name: "Shipping",
		icon: Package,
		accent: "text-stone-400",
	},
	{
		id: "cap1Hotels",
		name: "Capital One Hotels",
		icon: Hotel,
		accent: "text-blue-500",
	},
	{
		id: "cap1Flights",
		name: "Capital One Flights",
		icon: Plane,
		accent: "text-blue-500",
	},
	{
		id: "cap1Rentals",
		name: "Capital One Rentals",
		icon: Car,
		accent: "text-blue-500",
	},
	{
		id: "lyft",
		name: "Lyft",
		icon: Car,
		accent: "text-pink-500",
	},
	{
		id: "drugstores",
		name: "Drugstores",
		icon: Pill,
		accent: "text-emerald-500",
	},
	{
		id: "chaseTravel",
		name: "Chase Travel",
		icon: Globe,
		accent: "text-indigo-400",
	},
	{
		id: "liveEntertainment",
		name: "Entertainment",
		icon: Ticket,
		accent: "text-violet-400",
	},
	{
		id: "cable",
		name: "Cable",
		icon: Tv,
		accent: "text-slate-400",
	},
	{
		id: "office",
		name: "Office",
		icon: Briefcase,
		accent: "text-cyan-400",
	},
	{
		id: "internet",
		name: "Internet",
		icon: Wifi,
		accent: "text-blue-300",
	},
	{
		id: "phoneServices",
		name: "Phone Services",
		icon: Smartphone,
		accent: "text-orange-300",
	},
	{
		id: "ads",
		name: "Advertising",
		icon: Megaphone,
		accent: "text-red-500",
	},
	{
		id: "streaming",
		name: "Streaming",
		icon: Play,
		accent: "text-red-400",
	},
	{
		id: "vacationHomes",
		name: "Vacation Homes",
		icon: Home,
		accent: "text-orange-400",
	},
	{
		id: "onlineGroceries",
		name: "Online Groceries",
		icon: ShoppingBasket,
		accent: "text-emerald-500",
	},
	{
		id: "united",
		name: "United Airlines",
		icon: Plane,
		accent: "text-blue-600",
	},
    	{
		id: "transportation",
		name: "Transportation",
		icon: Train,
		accent: "text-gray-400",
	},
	{
		id: "american",
		name: "American Airlines",
		icon: Plane,
		accent: "text-sky-600",
	},

	{
		id: "catchAll",
		name: "Others",
		icon: CreditCard,
		accent: "text-gray-400",
	},
];

export const DEFAULT_CATEGORIES: CategoryId[] = [
	"dining",
	"groceries",
	"travel",
	"gas",
	"transit",
	"catchAll",
];
