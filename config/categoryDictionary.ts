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
		id: "ads",
		name: "Advertising",
		icon: Megaphone,
		accent: "text-yellow-500",
	},
	{
		id: "alaska",
		name: "Alaska Airlines",
		icon: Plane,
		accent: "text-teal-400",
	},
	{
		id: "american",
		name: "American Airlines",
		icon: Plane,
		accent: "text-red-600",
	},
	{
		id: "cable",
		name: "Cable",
		icon: Tv,
		accent: "text-green-400",
	},
	{
		id: "cap1Flights",
		name: "Capital One Flights",
		icon: Plane,
		accent: "text-yellow-500",
	},
	{
		id: "cap1Hotels",
		name: "Capital One Hotels",
		icon: Hotel,
		accent: "text-purple-500",
	},
	{
		id: "cap1Rentals",
		name: "Capital One Rentals",
		icon: Car,
		accent: "text-blue-500",
	},
	{
		id: "chaseTravel",
		name: "Chase Travel",
		icon: Globe,
		accent: "text-indigo-400",
	},
	{
		id: "dining",
		name: "Dining",
		icon: Utensils,
		accent: "text-pink-400",
	},
	{
		id: "drugstores",
		name: "Drugstores",
		icon: Pill,
		accent: "text-emerald-500",
	},
	{
		id: "flights",
		name: "Flights",
		icon: PlaneTakeoff,
		accent: "text-sky-400",
	},
	{
		id: "gas",
		name: "Gas",
		icon: Fuel,
		accent: "text-red-400",
	},
	{
		id: "groceries",
		name: "Groceries",
		icon: ShoppingCart,
		accent: "text-emerald-400",
	},
	{
		id: "hilton",
		name: "Hilton",
		icon: Building2,
		accent: "text-rose-500",
	},
	{
		id: "homeImprovement",
		name: "Home Improvement",
		icon: Hammer,
		accent: "text-amber-400",
	},
	{
		id: "internet",
		name: "Internet",
		icon: Wifi,
		accent: "text-red-300",
	},
	{
		id: "liveEntertainment",
		name: "Entertainment",
		icon: Ticket,
		accent: "text-violet-400",
	},
	{
		id: "lyft",
		name: "Lyft",
		icon: Car,
		accent: "text-pink-500",
	},
	{
		id: "office",
		name: "Office",
		icon: Briefcase,
		accent: "text-cyan-400",
	},
	{
		id: "onlineGroceries",
		name: "Online Groceries",
		icon: ShoppingBasket,
		accent: "text-emerald-500",
	},
	{
		id: "onlineRetails",
		name: "Online Retail",
		icon: ShoppingBag,
		accent: "text-purple-400",
	},
	{
		id: "phoneServices",
		name: "Phone Services",
		icon: Smartphone,
		accent: "text-pink-300",
	},
	{
		id: "rentals",
		name: "Rentals",
		icon: Key,
		accent: "text-cyan-500",
	},
	{
		id: "shipping",
		name: "Shipping",
		icon: Package,
		accent: "text-yellow-400",
	},
	{
		id: "streaming",
		name: "Streaming",
		icon: Play,
		accent: "text-red-400",
	},
	{
		id: "transit",
		name: "Transit",
		icon: Car,
		accent: "text-purple-400",
	},
	{
		id: "transportation",
		name: "Transportation",
		icon: Train,
		accent: "text-yellow-400",
	},
	{
		id: "travel",
		name: "Travel",
		icon: Plane,
		accent: "text-orange-400",
	},
	{
		id: "united",
		name: "United Airlines",
		icon: Plane,
		accent: "text-blue-600",
	},
	{
		id: "vacationHomes",
		name: "Vacation Homes",
		icon: Home,
		accent: "text-pink-400",
	},
	{
		id: "catchAll",
		name: "Others",
		icon: CreditCard,
		accent: "text-red-400",
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
