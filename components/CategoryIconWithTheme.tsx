/**
 * A reusable wrapper for category with icon color.
 */
import { CategoryIcon } from "@/components/CategoryIcon";
import { getCategoryTheme } from "@/constants";

interface CategoryIconWithThemeProps {
	name: string;
	size?: number;
}

export function CategoryIconWithTheme({
	name,
	size,
}: CategoryIconWithThemeProps) {
	const theme = getCategoryTheme(name || "Uncategorized");
	return <CategoryIcon name={name} size={size} colorClass={theme.text} />;
}
