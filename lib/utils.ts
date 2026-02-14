import { ArrowUp, ArrowDown, Minus } from "lucide-react";

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
export function getTrendProps(change: number, type: TrendType = "asset"): TrendProps {
  // 1. Handle Zero / Neutral case
  if (Math.abs(change) < 0.001) { // Floating point safety
    return { 
      color: "text-gray-500", 
      Icon: Minus 
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