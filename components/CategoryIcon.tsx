import { memo } from "react";
import { Tag } from "lucide-react";
import { ICON_MAP } from "@/constants/icons";

interface IconProps {
    name: string;
    size: number;
    colorClass?: string;
}

export const CategoryIcon = memo(function CategoryIcon({ name, size, colorClass }: IconProps) {
    const IconComponent = ICON_MAP[name] || Tag;
    return <IconComponent size={size} className={colorClass} />;
});