import { memo } from "react";
import { HelpCircle } from "lucide-react";
import { ALL_ICONS_MAP } from "@/constants/icons";

interface CategoryIconProps {
	name: string;
	size?: number;
	colorClass?: string;
}

export const CategoryIcon = memo(function CategoryIcon({
	name,
	size = 16,
	colorClass = "text-gray-400",
}: CategoryIconProps) {
	// Look up in our combined map (System Names + Raw Icon Names)
	const IconComponent = ALL_ICONS_MAP[name] || HelpCircle;

	const finalClass = typeof colorClass === "string" ? colorClass : "";

	return <IconComponent size={size} className={finalClass} strokeWidth={2.5} />;
});
