import { LucideIcon } from "lucide-react";
import { Transaction } from "@/store/createBudgetStore";

export interface Merchant {
	name: string;
	count: number;
	total: number;
}

export interface CategoryData {
	name: string;
	value: number;
	percent: number;
	color: string;
	fill: string;
	textColor: string;
	icon: LucideIcon;
}

export interface SummaryRowProps {
	label: string;
	value: string | number;
	icon: LucideIcon;
	iconColor: string;
	valueColor?: string;
	transactions?: Transaction[];
}

export interface SidebarListProps {
	title: string;
	items: (Transaction | Merchant)[];
	showAll: boolean;
	onToggle: () => void;
	isPurchaseList?: boolean;
}

// Recharts Custom Shape Prop Type
export interface PieActiveShapeProps {
	cx: number;
	cy: number;
	innerRadius: number;
	outerRadius: number;
	startAngle: number;
	endAngle: number;
	fill: string;
	payload: CategoryData;
	value: number;
}

export interface CategoryDetailsModalProps {
	isOpen: boolean;
	onClose: () => void;
	category: string;
	transactions: Transaction[];
	color: string;
	onUpdateCategory: (txId: string, newCategory: string) => void;
	onTransactionClick: (tx: Transaction) => void;
}

export interface ActionItemProps {
	icon: LucideIcon;
	color: string;
	label: string;
	subLabel?: string;
	hasToggle?: boolean;
	hasChevron?: boolean;
	hasPlus?: boolean;
	onClick?: () => void;
}
