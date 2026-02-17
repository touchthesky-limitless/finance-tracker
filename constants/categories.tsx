import React from "react";
import {
	Banknote,
	Landmark,
	Percent,
	HeartHandshake,
	Receipt,
	UserMinus,
	ArrowLeftRight,
	Shuffle,
	Wallet,
	HandCoins,
	User2,
	CreditCard,
	CarFront,
	GraduationCap,
	PersonStanding,
	TrendingUp,
	TrendingDown,
	Layers,
	Ghost,
	Globe,
	AlertCircle,
	Clock,
	Send,
	Zap,
	Utensils,
	ShoppingCart,
	Coffee,
	Wine,
	Key,
	Home,
	Hammer,
	Wifi,
	Lightbulb,
	Droplets,
	Shield,
	Building,
	FileText,
	Fuel,
	Wrench,
	Bus,
	CarTaxiFront,
	Construction,
	Plane,
	Hotel,
	Car as RentalCar,
	Shirt,
	Smartphone,
	Dog,
	Gift,
	Paperclip,
	Dumbbell,
	Store,
	ShoppingBasket,
	Scissors,
	Cigarette,
	Tag,
	Stethoscope,
	Pill,
	Smile,
	Glasses,
	HeartPulse,
	Sparkles,
	Heart,
	Dices,
	BookOpen,
	Clapperboard,
	Music,
	Gamepad2,
	Ticket,
	ShieldPlus,
	Car,
	Umbrella,
	Baby,
	Laptop,
	Scale,
	Truck,
	Package,
	Cog,
	Gavel,
	HelpCircle,
	Briefcase,
	ShoppingBag,
	ShieldCheck,
} from "lucide-react";

export const CATEGORY_HIERARCHY: Record<string, string[]> = {
	"Income": [
		"Wages",
		"Dvidiends",
		"Interest",
		"Benefits & pension",
		"Tax refunds",
		"Unemployment",
		"Other income",
	],
	"Transfers": [
		"Account transfers",
		"Investment transfers",
		"Savings transfers",
		"Cash deposits",
		"Cash withdraws",
		"Loans & cash advances",
		"Person to person payments",
		"Other transfers",
	],
	"Debt payments": [
		"Credit card payments",
		"Auto loan payments",
		"Student loan payments",
		"Personal loan payments",
		"Other debt payments",
	],
	"Investments": ["Buy", "Sell", "ETFs", "Crypto"],
	"Bank fees": [
		"ATM fees",
		"Foreign transaction fees",
		"Insufficient funds",
		"Interest charge",
		"Late fees",
		"Wire fees",
		"Overdraft fees",
		"Other bank fees",
	],
	"Food & drink": [
		"Restaurants & bars",
		"Groceries",
		"Coffee shops",
		"Liquor stores",
		"Other food & drink",
	],
	"Shopping": [
		"Clothing & accessories",
		"Electronics",
		"Pets supplies",
		"Gifts",
		"Office supplies",
		"Sports & outdoors",
		"Retail",
		"Convenience stores",
		"Hair & beauty",
		"Tobaco & vape",
		"Other shopping",
	],
	"Housing & utilities": [
		"Rent",
		"Mortgage payments",
		"Home improvement & repairs",
		"Phone & internet",
		"Gas & electricity",
		"Water sewer & garbage",
		"Security",
		"Hoa fee",
		"Property tax",
		"Other housing & utilities",
	],
	"Health & wellness": [
		"Medical",
		"Pharmacy",
		"Dental",
		"Vision",
		"Nursing",
		"Fitness",
		"Personal care",
		"Other health & wellness",
	],
	"Entertainment": [
		"Gambling",
		"Book & news",
		"Movies & TV",
		"Music & audio",
		"Games",
		"Events & Recreation",
		"Other entertainment",
	],
	"Insurance": [
		"Life insurance",
		"Health insurance",
		"Auto insurance",
		"Home insurance",
		"Other insurance",
	],
	"Services": [
		"Household services",
		"Education services",
		"Veterinary services",
		"Childcare services",
		"Digital services",
		"Legal services",
		"Financial services",
		"Shipping",
		"Moving & storage",
		"Other services",
	],
	"Transportation": [
		"Gasoline & EV charing",
		"Car services",
		"Public transit",
		"Taxi & ride shares",
		"Parking & tolls",
		"Other transportation",
	],
	"Travel": ["Flights", "Hotels", "Rental cars", "Other travel"],
	"Government & charity": [
		"Tax payments",
		"Government fees",
		"Charity",
		"Other government & charity",
	],
	"Other": ["Uncategorized", "Other"],
};

interface IconProps {
	name: string;
	size: number;
	colorClass?: string;
}

export function CategoryIcon({ name, size, colorClass }: IconProps) {
	const subIcons: Record<string, React.ReactNode> = {
		// Income
		"Wages": <Banknote size={size} className={colorClass} />,
		"Dvidiends": <Landmark size={size} className={colorClass} />,
		"Interest": <Percent size={size} className={colorClass} />,
		"Benefits & pension": <HeartHandshake size={size} className={colorClass} />,
		"Tax refunds": <Receipt size={size} className={colorClass} />,
		"Unemployment": <UserMinus size={size} className={colorClass} />,

		// Transfers
		"Account transfers": <ArrowLeftRight size={size} className={colorClass} />,
		"Investment transfers": <Shuffle size={size} className={colorClass} />,
		"Savings transfers": <Wallet size={size} className={colorClass} />,
		"Cash deposits": <HandCoins size={size} className={colorClass} />,
		"Cash withdraws": <HandCoins size={size} className={colorClass} />,
		"Loans & cash advances": <Landmark size={size} className={colorClass} />,
		"Person to person payments": <User2 size={size} className={colorClass} />,

		// Debt Payments
		"Credit card payments": <CreditCard size={size} className={colorClass} />,
		"Auto loan payments": <CarFront size={size} className={colorClass} />,
		"Student loan payments": (
			<GraduationCap size={size} className={colorClass} />
		),
		"Personal loan payments": (
			<PersonStanding size={size} className={colorClass} />
		),

		// Investments
		"Buy": <TrendingUp size={size} className={colorClass} />,
		"Sell": <TrendingDown size={size} className={colorClass} />,
		"ETFs": <Layers size={size} className={colorClass} />,
		"Crypto": <Ghost size={size} className={colorClass} />,

		// Bank Fees
		"ATM fees": <Landmark size={size} className={colorClass} />,
		"Foreign transaction fees": <Globe size={size} className={colorClass} />,
		"Insufficient funds": <AlertCircle size={size} className={colorClass} />,
		"Interest charge": <Percent size={size} className={colorClass} />,
		"Late fees": <Clock size={size} className={colorClass} />,
		"Wire fees": <Send size={size} className={colorClass} />,
		"Overdraft fees": <Zap size={size} className={colorClass} />,

		// Food & Drink
		"Restaurants & bars": <Utensils size={size} className={colorClass} />,
		"Groceries": <ShoppingCart size={size} className={colorClass} />,
		"Coffee shops": <Coffee size={size} className={colorClass} />,
		"Liquor stores": <Wine size={size} className={colorClass} />,

		// Housing & Utilities
		"Rent": <Key size={size} className={colorClass} />,
		"Mortgage payments": <Home size={size} className={colorClass} />,
		"Home improvement & repairs": <Hammer size={size} className={colorClass} />,
		"Phone & internet": <Wifi size={size} className={colorClass} />,
		"Gas & electricity": <Lightbulb size={size} className={colorClass} />,
		"Water sewer & garbage": <Droplets size={size} className={colorClass} />,
		"Security": <Shield size={size} className={colorClass} />,
		"Hoa fee": <Building size={size} className={colorClass} />,
		"Property tax": <FileText size={size} className={colorClass} />,

		// Transportation
		"Gasoline & EV charing": <Fuel size={size} className={colorClass} />,
		"Car services": <Wrench size={size} className={colorClass} />,
		"Public transit": <Bus size={size} className={colorClass} />,
		"Taxi & ride shares": <CarTaxiFront size={size} className={colorClass} />,
		"Parking & tolls": <Construction size={size} className={colorClass} />,

		// Travel
		"Flights": <Plane size={size} className={colorClass} />,
		"Hotels": <Hotel size={size} className={colorClass} />,
		"Rental cars": <RentalCar size={size} className={colorClass} />,

		// Shopping
		"Clothing & accessories": <Shirt size={size} className={colorClass} />,
		"Electronics": <Smartphone size={size} className={colorClass} />,
		"Pets supplies": <Dog size={size} className={colorClass} />,
		"Gifts": <Gift size={size} className={colorClass} />,
		"Office supplies": <Paperclip size={size} className={colorClass} />,
		"Sports & outdoors": <Dumbbell size={size} className={colorClass} />,
		"Retail": <Store size={size} className={colorClass} />,
		"Convenience stores": <ShoppingBasket size={size} className={colorClass} />,
		"Hair & beauty": <Scissors size={size} className={colorClass} />,
		"Tobaco & vape": <Cigarette size={size} className={colorClass} />,
		"Other shopping": <Tag size={size} className={colorClass} />,

		// Health & Wellness
		"Medical": <Stethoscope size={size} className={colorClass} />,
		"Pharmacy": <Pill size={size} className={colorClass} />,
		"Dental": <Smile size={size} className={colorClass} />, // Or 'Zap' for a tooth-like shape
		"Vision": <Glasses size={size} className={colorClass} />,
		"Nursing": <HeartPulse size={size} className={colorClass} />,
		"Fitness": <Dumbbell size={size} className={colorClass} />,
		"Personal care": <Sparkles size={size} className={colorClass} />,
		"Other health & wellness": <Heart size={size} className={colorClass} />,

		// Entertainment
		"Gambling": <Dices size={size} className={colorClass} />,
		"Book & news": <BookOpen size={size} className={colorClass} />,
		"Movies & TV": <Clapperboard size={size} className={colorClass} />,
		"Music & audio": <Music size={size} className={colorClass} />,
		"Games": <Gamepad2 size={size} className={colorClass} />,
		"Events & Recreation": <Ticket size={size} className={colorClass} />,
		"Other entertainment": <Ghost size={size} className={colorClass} />,

		// Insurance
		"Life insurance": <Heart size={size} className={colorClass} />,
		"Health insurance": <ShieldPlus size={size} className={colorClass} />,
		"Auto insurance": <Car size={size} className={colorClass} />,
		"Home insurance": <Home size={size} className={colorClass} />,
		"Other insurance": <Umbrella size={size} className={colorClass} />,

		// Services
		"Household services": <Wrench size={size} className={colorClass} />,
		"Education services": <GraduationCap size={size} className={colorClass} />,
		"Veterinary services": <Dog size={size} className={colorClass} />,
		"Childcare services": <Baby size={size} className={colorClass} />,
		"Digital services": <Laptop size={size} className={colorClass} />,
		"Legal services": <Scale size={size} className={colorClass} />,
		"Financial services": <Landmark size={size} className={colorClass} />,
		"Shipping": <Truck size={size} className={colorClass} />,
		"Moving & storage": <Package size={size} className={colorClass} />,
		"Other services": <Cog size={size} className={colorClass} />,

		// Government & Charity
		"Tax payments": <FileText size={size} className={colorClass} />,
		"Government fees": <Gavel size={size} className={colorClass} />,
		"Charity": <HeartHandshake size={size} className={colorClass} />,
		"Other government & charity": <Globe size={size} className={colorClass} />,

		// Other
		"Uncategorized": <HelpCircle size={size} className={colorClass} />,
	};
	if (subIcons[name]) return subIcons[name];
	switch (name) {
		case "Income":
			return <TrendingUp size={size} className={colorClass} />;
		case "Transfers":
			return <ArrowLeftRight size={size} className={colorClass} />;
		case "Debt payments":
			return <CreditCard size={size} className={colorClass}/>;
		case "Investments":
			return <Briefcase size={size} className={colorClass} />;
		case "Bank fees":
			return <Landmark size={size} className={colorClass}/>;
		case "Food & drink":
			return <Utensils size={size} className={colorClass} />;
		case "Shopping":
			return <ShoppingBag size={size} className={colorClass} />;
		case "Housing & utilities":
			return <Home size={size} className={colorClass} />;
		case "Health & wellness":
			return <HeartPulse size={size} className={colorClass} />;
		case "Entertainment":
			return <Gamepad2 size={size} className={colorClass} />;
		case "Insurance":
			return <ShieldCheck size={size} className={colorClass} />;
		case "Services":
			return <Wrench size={size} className={colorClass} />;
		case "Transportation":
			return <Car size={size} className={colorClass} />;
		case "Travel":
			return <Plane size={size} className={colorClass}/>;
		case "Government & charity":
			return <Gavel size={size} className={colorClass} />;
		default:
			return <Tag size={size} className={colorClass} />;
	}
}

export function getParentColor(parentName: string): string {
	switch (parentName) {
		case "Income":
			return "text-emerald-500";
		case "Transfers":
			return "text-blue-500";
		case "Debt payments":
			return "text-red-400";
		case "Investments":
			return "text-indigo-400";
		case "Bank fees":
			return "text-amber-400";
		case "Food & drink":
			return "text-orange-500";
		case "Shopping":
			return "text-pink-500";
		case "Housing & utilities":
			return "text-yellow-600";
		case "Health & wellness":
			return "text-rose-500";
		case "Entertainment":
			return "text-purple-500";
		case "Insurance":
			return "text-cyan-500";
		case "Services":
			return "text-orange-500";
		case "Transportation":
			return "text-blue-500";
		case "Travel":
			return "text-sky-400";
		case "Government & charity":
			return "text-amber-900";
		default:
			return "text-gray-400";
	}
}
